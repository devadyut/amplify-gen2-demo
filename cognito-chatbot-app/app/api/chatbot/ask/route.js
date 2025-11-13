/**
 * Chatbot API Route
 * Proxies requests to Lambda chatbot function via API Gateway
 * Validates session and forwards authenticated requests
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '../../../../lib/auth-server';
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
 * POST /api/chatbot/ask
 * Handles chatbot question submission
 */
export async function POST(request) {
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
    
    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
          },
        },
        { status: 400 }
      );
    }
    
    const { question, conversationId } = body;
    
    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_QUESTION',
            message: 'Question is required and must be a non-empty string',
          },
        },
        { status: 400 }
      );
    }
    
    // 3. Get API Gateway endpoint
    const apiEndpoint = getApiEndpoint();
    const lambdaUrl = `${apiEndpoint}/chatbot/ask`;
    
    // 4. Forward request to Lambda chatbot function
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.idToken}`,
      },
      body: JSON.stringify({
        question: question.trim(),
        conversationId,
      }),
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
    console.error('Chatbot API route error:', error);
    
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
            message: 'Unable to connect to chatbot service',
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
 * OPTIONS /api/chatbot/ask
 * Handle CORS preflight requests
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
