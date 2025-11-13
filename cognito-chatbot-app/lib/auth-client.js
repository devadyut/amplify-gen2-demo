/**
 * Client-side authentication utilities
 * Used in client components for authentication operations
 */

'use client';

import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

/**
 * Sign in a user with email and password
 * Returns the sign-in result
 */
export async function signInUser(email, password) {
  try {
    const result = await signIn({
      username: email,
      password,
    });
    
    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in',
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
  try {
    await signOut();
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out',
    };
  }
}

/**
 * Get the current authenticated user
 * Returns user information including custom attributes
 */
export async function getAuthenticatedUser() {
  try {
    const user = await getCurrentUser();
    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('Get user error:', error);
    return {
      success: false,
      error: error.message || 'Not authenticated',
    };
  }
}

/**
 * Get the current user session with tokens
 * Returns tokens and user attributes including custom:role
 */
export async function getUserSession() {
  try {
    const session = await fetchAuthSession();
    
    if (!session.tokens) {
      return {
        success: false,
        error: 'No active session',
      };
    }
    
    // Extract custom attributes from ID token
    const idToken = session.tokens.idToken;
    const payload = idToken.payload;
    
    return {
      success: true,
      session: {
        accessToken: session.tokens.accessToken.toString(),
        idToken: idToken.toString(),
        userAttributes: {
          sub: payload.sub,
          email: payload.email,
          emailVerified: payload.email_verified,
          role: payload['custom:role'],
          department: payload['custom:department'],
          username: payload['cognito:username'],
        },
      },
    };
  } catch (error) {
    console.error('Get session error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get session',
    };
  }
}

/**
 * Check if user has required role
 * Used for client-side authorization checks
 */
export async function hasRole(requiredRole) {
  try {
    const sessionResult = await getUserSession();
    
    if (!sessionResult.success) {
      return false;
    }
    
    const userRole = sessionResult.session.userAttributes.role;
    
    // Admin can access everything
    if (userRole === 'admin') {
      return true;
    }
    
    // Check if user has the required role
    return userRole === requiredRole;
  } catch (error) {
    console.error('Role check error:', error);
    return false;
  }
}
