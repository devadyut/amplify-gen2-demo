/**
 * Server-side authentication utilities
 * Used in server components, API routes, and middleware
 */

import { cookies } from 'next/headers';
import { authConfig } from './amplify-config';

/**
 * Get the current session from cookies
 * Returns the authentication tokens if available
 */
export async function getServerSession() {
  const cookieStore = await cookies();
  
  // Amplify stores tokens in cookies with specific names
  const idToken = cookieStore.get('CognitoIdentityServiceProvider.' + authConfig.userPoolClientId + '.LastAuthUser.idToken');
  const accessToken = cookieStore.get('CognitoIdentityServiceProvider.' + authConfig.userPoolClientId + '.LastAuthUser.accessToken');
  const refreshToken = cookieStore.get('CognitoIdentityServiceProvider.' + authConfig.userPoolClientId + '.LastAuthUser.refreshToken');
  
  if (!idToken || !accessToken) {
    return null;
  }
  
  return {
    idToken: idToken.value,
    accessToken: accessToken.value,
    refreshToken: refreshToken?.value,
  };
}

/**
 * Decode JWT token to extract claims
 * Note: This does NOT verify the signature - use for reading claims only
 * Signature verification should be done by Cognito or API Gateway
 */
export function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract user role from JWT token
 * Returns the custom:role attribute value
 */
export function getUserRole(token) {
  const claims = decodeJWT(token);
  if (!claims) {
    return null;
  }
  
  return claims['custom:role'] || null;
}

/**
 * Check if user has required role for authorization
 * Implements ABAC logic based on custom:role attribute
 */
export function checkAuthorization(token, requiredRole) {
  const userRole = getUserRole(token);
  
  if (!userRole) {
    return false;
  }
  
  // Admin can access everything
  if (userRole === 'admin') {
    return true;
  }
  
  // User can only access user-level resources
  if (userRole === 'user' && requiredRole === 'user') {
    return true;
  }
  
  return false;
}

/**
 * Get user attributes from JWT token
 * Returns an object with user information including custom attributes
 */
export function getUserAttributes(token) {
  const claims = decodeJWT(token);
  if (!claims) {
    return null;
  }
  
  return {
    sub: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified,
    role: claims['custom:role'],
    department: claims['custom:department'],
    username: claims['cognito:username'],
  };
}
