/**
 * Admin Lambda Function Handler
 * Handles admin-specific operations with role-based access control
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createLogger } from '../shared/logger.js';

// Initialize AWS clients
const cognitoClient = new CognitoIdentityProviderClient({});

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;

// Initialize JWT verifier
let jwtVerifier;
if (USER_POOL_ID && CLIENT_ID) {
  jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: 'access',
    clientId: CLIENT_ID,
  });
}

/**
 * Extract JWT token from event
 */
function extractToken(event) {
  // Check Authorization header
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check for token in query parameters (fallback)
  if (event.queryStringParameters?.token) {
    return event.queryStringParameters.token;
  }
  
  throw new Error('No authorization token found');
}

/**
 * Validate JWT token and extract claims
 */
async function validateToken(token, logger) {
  try {
    if (!jwtVerifier) {
      throw new Error('JWT verifier not initialized');
    }
    
    logger.debug('Validating JWT token');
    const payload = await jwtVerifier.verify(token);
    logger.info('Token validated successfully', { userId: payload.sub });
    return payload;
  } catch (error) {
    logger.error('Token validation failed', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Validate admin role from custom attributes
 */
function validateAdminRole(claims, logger) {
  const userRole = claims['custom:role'];
  
  if (!userRole) {
    logger.warn('User role not found in token', { userId: claims.sub });
    throw new Error('User role not found in token');
  }
  
  // Only allow 'admin' role
  if (userRole !== 'admin') {
    logger.logAuthDecision('DENIED', { 
      userId: claims.sub, 
      role: userRole, 
      reason: 'Admin role required' 
    });
    throw new Error('Admin role required');
  }
  
  logger.logAuthDecision('GRANTED', { 
    userId: claims.sub, 
    role: userRole 
  });
  
  return userRole;
}

/**
 * Get system statistics
 */
async function getSystemStats(logger) {
  try {
    logger.logServiceCall('Cognito', 'ListUsers', { userPoolId: USER_POOL_ID });
    
    // Get user count from Cognito
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60, // Maximum allowed
    });
    
    const usersResponse = await cognitoClient.send(listUsersCommand);
    const users = usersResponse.Users || [];
    
    logger.info('Retrieved users from Cognito', { count: users.length });
    
    // Count users by role
    let userCount = 0;
    let adminCount = 0;
    
    users.forEach(user => {
      const roleAttribute = user.Attributes?.find(attr => attr.Name === 'custom:role');
      if (roleAttribute) {
        if (roleAttribute.Value === 'admin') {
          adminCount++;
        } else if (roleAttribute.Value === 'user') {
          userCount++;
        }
      }
    });
    
    const stats = {
      totalUsers: users.length,
      usersByRole: {
        user: userCount,
        admin: adminCount,
      },
      timestamp: new Date().toISOString(),
    };
    
    logger.info('System statistics calculated', stats);
    
    return stats;
  } catch (error) {
    logger.error('Error getting system stats', error);
    throw new Error(`Failed to retrieve system statistics: ${error.message}`);
  }
}

/**
 * Main Lambda handler
 */
export const handler = async (event) => {
  const requestId = event.requestContext?.requestId || `req-${Date.now()}`;
  const logger = createLogger({ requestId, function: 'admin' });
  
  logger.info('Admin Lambda invoked', { 
    path: event.path || event.rawPath,
    httpMethod: event.httpMethod || event.requestContext?.http?.method 
  });
  
  const startTime = Date.now();
  
  try {
    // 1. Extract and validate JWT token
    const token = extractToken(event);
    const claims = await validateToken(token, logger);
    
    // Add user context to logger
    logger.addContext({ userId: claims.sub, username: claims.username });
    
    // 2. Validate admin role
    const userRole = validateAdminRole(claims, logger);
    logger.info('Admin authenticated successfully', { role: userRole });
    
    // 3. Parse request to determine operation
    const path = event.path || event.rawPath || '';
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
    
    logger.info('Processing admin operation', { path, httpMethod });
    
    // 4. Handle different admin operations
    let responseData;
    
    if (path.includes('/stats') || httpMethod === 'GET') {
      // Get system statistics
      responseData = await getSystemStats(logger);
    } else {
      logger.warn('Admin operation not found', { path, httpMethod });
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Admin operation not found',
          },
        }),
      };
    }
    
    const duration = Date.now() - startTime;
    logger.info('Request completed successfully', { duration });
    
    // 5. Return formatted response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(responseData),
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error processing admin request', error, { duration });
    
    // Handle specific error types
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication failed',
          },
        }),
      };
    }
    
    if (error.message.includes('role') || error.message.includes('Admin')) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required',
          },
        }),
      };
    }
    
    // Generic error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      }),
    };
  }
};
