/**
 * Next.js Middleware for authentication and authorization
 * Validates JWT tokens and enforces role-based access control using custom:role attribute
 * Runs on every request to protected routes
 */

import { NextResponse } from 'next/server';

/**
 * Decode JWT token to extract claims
 * Note: This does NOT verify the signature - signature verification is done by Cognito
 * This is for reading claims only
 */
function decodeJWT(token) {
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
 * Extract ID token from cookies
 * Amplify stores tokens with a specific naming pattern
 */
function getIdTokenFromCookies(request) {
  const cookies = request.cookies;
  
  // Try to find the ID token cookie
  // Amplify uses pattern: CognitoIdentityServiceProvider.{clientId}.{username}.idToken
  for (const [name, value] of cookies) {
    if (name.includes('CognitoIdentityServiceProvider') && name.endsWith('.idToken')) {
      return value;
    }
  }
  
  return null;
}

/**
 * Extract user role from JWT token
 */
function getUserRole(token) {
  const claims = decodeJWT(token);
  if (!claims) {
    return null;
  }
  
  return claims['custom:role'] || null;
}

/**
 * Check if token is expired
 */
function isTokenExpired(token) {
  const claims = decodeJWT(token);
  if (!claims || !claims.exp) {
    return true;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return claims.exp < currentTime;
}

/**
 * Check authorization based on custom:role attribute
 * Implements ABAC logic
 */
function checkAuthorization(userRole, pathname) {
  // Admin can access everything
  if (userRole === 'admin') {
    return true;
  }
  
  // User can access user pages but not admin pages
  if (userRole === 'user') {
    if (pathname.startsWith('/admin')) {
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Middleware function
 * Runs on every request to protected routes
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/', '/unauthorized'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/_next') || pathname.startsWith('/api/auth'));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Extract ID token from cookies
  const idToken = getIdTokenFromCookies(request);
  
  // If no token, redirect to login
  if (!idToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check if token is expired
  if (isTokenExpired(idToken)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }
  
  // Extract user role from token
  const userRole = getUserRole(idToken);
  
  // If no role attribute, deny access
  if (!userRole) {
    const unauthorizedUrl = new URL('/unauthorized', request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }
  
  // Check authorization based on role and pathname
  const isAuthorized = checkAuthorization(userRole, pathname);
  
  if (!isAuthorized) {
    const unauthorizedUrl = new URL('/unauthorized', request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }
  
  // Add user role to request headers for use in server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', userRole);
  
  // Continue to the requested page
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
