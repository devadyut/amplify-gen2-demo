/**
 * Logout API Route
 * Handles user logout by clearing authentication cookies
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    
    // Get all cookies
    const allCookies = cookieStore.getAll();
    
    // Clear all Cognito-related cookies
    allCookies.forEach(cookie => {
      if (cookie.name.includes('CognitoIdentityServiceProvider')) {
        cookieStore.delete(cookie.name);
      }
    });
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
