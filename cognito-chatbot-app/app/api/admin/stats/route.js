/**
 * Admin Stats API Route
 * Proxies requests to Lambda admin function via API Gateway
 * Validates session and admin role on server-side
 */

import { NextResponse } from 'next/server';
import { getServerSession, getUserRole } from '../../../../lib/auth-server';
import outputs from '../../../../amplify_outputs.json';

/**
 * Get API Gateway endpoint from Amplify outputs
 */
function getApiEndpoint() {
  // The API endpoint is added as a custom output in backend.ts
  // It should be in the format: https://{api-id}.execute-api.{region}.amazonaws.com/prod
  if (outputs.custom?.API?.endpoint) {
    return outputs.custom.API.endpoint;
  }
  
  // Fallback: construct from environment variable if available
  if (process.env.API_GATEWAY_ENDPOINT) {
    return process.env.API_GATEWAY_ENDPOINT;
  }
  
  throw new Error('API Gateway endpoint not configured');
}

/**
 * GET /api/admin/stats
 * Retrieves system statistics (admin only)
 */
export async function GET(request) {
  try {
    // 1. Validate session on server-side
    const session = await getServerSession();
    
    if (!session || !session.idToken) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }
    
    // 2. Validate admin role
    const userRole = getUserRole(session.idToken);
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required',
          },
        },
        { status: 403 }
      );
    }
    
    // 3. Get API Gateway endpoint
    const apiEndpoint = getApiEndpoint();
    const lambdaUrl = `${apiEndpoint}/admin/stats`;
    
    // 4. Forward request to Lambda admin function
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.idToken}`,
      },
    });
    
    // 5. Handle Lambda response
    const responseData = await lambdaResponse.json();
    
    if (!lambdaResponse.ok) {
      // Forward error from Lambda
      return NextResponse.json(
        responseData,
        { status: lambdaResponse.status }
      );
    }
    
    // 6. Return successful response
    return NextResponse.json(responseData, { status: 200 });
    
  } catch (error) {
    console.error('Admin stats API route error:', error);
    
    // Handle specific error types
    if (error.message.includes('endpoint not configured')) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'API endpoint not configured. Please deploy the backend first.',
          },
        },
        { status: 503 }
      );
    }
    
    if (error.message.includes('fetch') || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Unable to connect to admin service',
          },
        },
        { status: 503 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/admin/stats
 * Handle CORS preflight requests
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
