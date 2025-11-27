/**
 * Admin Lambda Function Handler
 * Handles admin-specific operations with role-based access control
 */

import { CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createLogger } from './logger.js';

// Initialize AWS clients
const cognitoClient = new CognitoIdentityProviderClient({});

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;

/**
 * Get user from Cognito and validate admin role
 */
async function validateAdminUser(username, logger) {
  try {
    logger.logServiceCall('Cognito', 'AdminGetUser', { username });

    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });

    const response = await cognitoClient.send(command);

    // Extract custom:role from user attributes
    const roleAttribute = response.UserAttributes?.find(attr => attr.Name === 'custom:role');
    const role = roleAttribute?.Value;

    if (!role) {
      logger.warn('User role not found in Cognito attributes', { username });
      throw new Error('User role not found');
    }

    // Only allow 'admin' role
    if (role !== 'admin') {
      logger.logAuthDecision('DENIED', {
        username,
        role,
        reason: 'Admin role required'
      });
      throw new Error('Admin role required');
    }

    logger.logAuthDecision('GRANTED', {
      username,
      role
    });

    return { role, username };
  } catch (error) {
    logger.error('Failed to validate admin user', error, { username });
    throw error;
  }
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
 * Validate Cognito identity from request context
 */
function validateCognitoIdentity(event, logger) {
  // Validate Cognito identity from request context (for IAM-authorized API Gateway)
  const cognitoIdentity = event.requestContext?.identity?.cognitoIdentityId;
  const cognitoAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider;
  
  // Extract sub from cognitoAuthenticationProvider
  // Format: cognito-idp.{region}.amazonaws.com/{userPoolId},{sub}
  let sub = null;
  if (cognitoAuthProvider) {
    const parts = cognitoAuthProvider.split(':');
    if (parts.length > 0) {
      sub = parts[parts.length - 1];
    }
  }
  
  if (!cognitoIdentity || !sub) {
    logger.warn('Missing Cognito identity or sub in request context', {
      hasCognitoIdentity: !!cognitoIdentity,
      hasSub: !!sub,
    });
    throw new Error('Valid Cognito identity required');
  }
  
  logger.info('Cognito identity validated', { 
    cognitoIdentityId: cognitoIdentity,
    sub: sub 
  });
  
  return { cognitoIdentityId: cognitoIdentity, sub };
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
    // 1. Validate Cognito identity from request context
    const identity = validateCognitoIdentity(event, logger);
    logger.addContext({ userId: identity.sub, cognitoIdentityId: identity.cognitoIdentityId });
    
    // 2. Validate user has admin role
    const user = await validateAdminUser(identity.sub, logger);
    logger.info('Admin authenticated successfully', { role: user.role });
    
    // 4. Parse request to determine operation
    const path = event.path || event.rawPath || '';
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
    
    logger.info('Processing admin operation', { path, httpMethod });
    
    // 5. Handle different admin operations
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
    
    // 6. Return formatted response
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
    if (error.message.includes('token') || error.message.includes('authorization') || error.message.includes('Cognito identity')) {
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
