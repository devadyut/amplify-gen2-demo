/**
 * Chatbot Lambda Function Handler
 * Processes user questions and generates AI responses using Amazon Bedrock
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { createLogger } from '../shared/logger.js';

// Initialize AWS clients
const s3Client = new S3Client({});
// Use BEDROCK_REGION for Bedrock client, AWS_REGION is automatically set by Lambda runtime
const bedrockClient = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'eu-west-1' });

// Environment variables
const BUCKET_NAME = process.env.KNOWLEDGE_BASE_BUCKET;
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
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
 * Validate user role from custom attributes
 */
function validateRole(claims, logger) {
  const userRole = claims['custom:role'];
  
  if (!userRole) {
    logger.warn('User role not found in token', { userId: claims.sub });
    throw new Error('User role not found in token');
  }
  
  // Allow both 'user' and 'admin' roles to access chatbot
  if (userRole !== 'user' && userRole !== 'admin') {
    logger.logAuthDecision('DENIED', { 
      userId: claims.sub, 
      role: userRole, 
      reason: 'Invalid role for chatbot access' 
    });
    throw new Error('Invalid user role');
  }
  
  logger.logAuthDecision('GRANTED', { 
    userId: claims.sub, 
    role: userRole 
  });
  
  return userRole;
}

/**
 * Retrieve knowledge base documents from S3
 */
async function retrieveKnowledgeBase(logger) {
  try {
    logger.logServiceCall('S3', 'ListObjectsV2', { bucket: BUCKET_NAME, prefix: 'knowledge-base/' });
    
    const documents = [];
    
    // List all objects in the knowledge-base folder
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'knowledge-base/',
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      logger.warn('No documents found in knowledge base');
      return [];
    }
    
    logger.info('Found documents in knowledge base', { count: listResponse.Contents.length });
    
    // Retrieve each document
    for (const object of listResponse.Contents) {
      // Skip the folder itself
      if (object.Key.endsWith('/')) {
        continue;
      }
      
      try {
        logger.logServiceCall('S3', 'GetObject', { key: object.Key });
        
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key,
        });
        
        const response = await s3Client.send(getCommand);
        const documentContent = await streamToString(response.Body);
        
        // Parse JSON document
        const document = JSON.parse(documentContent);
        documents.push(document);
        
        logger.debug('Retrieved document', { documentId: document.documentId, title: document.title });
      } catch (error) {
        logger.error(`Error retrieving document ${object.Key}`, error);
        // Continue with other documents
      }
    }
    
    logger.info('Successfully retrieved knowledge base documents', { count: documents.length });
    return documents;
  } catch (error) {
    logger.error('Error retrieving knowledge base', error);
    // Return empty array to allow chatbot to continue without context
    return [];
  }
}

/**
 * Convert stream to string
 */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Construct prompt with context from knowledge base
 */
function constructPrompt(question, documents) {
  let context = '';
  
  if (documents.length > 0) {
    context = 'Here is relevant information from the knowledge base:\n\n';
    
    documents.forEach((doc, index) => {
      context += `Document ${index + 1}: ${doc.title}\n`;
      context += `${doc.content}\n\n`;
    });
  }
  
  const prompt = `${context}Based on the information provided above, please answer the following question. If the answer is not in the provided context, you can use your general knowledge but indicate that the information is not from the knowledge base.

Question: ${question}

Answer:`;
  
  return prompt;
}

/**
 * Call Amazon Bedrock to generate response
 */
async function generateResponse(prompt, logger) {
  try {
    logger.logServiceCall('Bedrock', 'InvokeModel', { modelId: BEDROCK_MODEL_ID });
    
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
    
    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });
    
    const startTime = Date.now();
    const response = await bedrockClient.send(command);
    const duration = Date.now() - startTime;
    
    logger.info('Bedrock response received', { duration, modelId: BEDROCK_MODEL_ID });
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract the generated text from Claude's response
    if (responseBody.content && responseBody.content.length > 0) {
      return responseBody.content[0].text;
    }
    
    throw new Error('No content in Bedrock response');
  } catch (error) {
    logger.error('Bedrock API error', error, { modelId: BEDROCK_MODEL_ID });
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Main Lambda handler
 */
export const handler = async (event) => {
  const requestId = event.requestContext?.requestId || `req-${Date.now()}`;
  const logger = createLogger({ requestId, function: 'chatbot' });
  
  logger.info('Chatbot Lambda invoked', { 
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
    
    // 2. Validate user role
    const userRole = validateRole(claims, logger);
    logger.info('User authenticated successfully', { role: userRole });
    
    // 3. Parse request body
    let requestBody;
    try {
      requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
      logger.warn('Invalid request body', { error: error.message });
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
          },
        }),
      };
    }
    
    const { question, conversationId } = requestBody;
    
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      logger.warn('Invalid question provided');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_QUESTION',
            message: 'Question is required and must be a non-empty string',
          },
        }),
      };
    }
    
    logger.info('Processing question', { 
      questionLength: question.length, 
      conversationId 
    });
    
    // 4. Retrieve knowledge base documents from S3
    const documents = await retrieveKnowledgeBase(logger);
    
    // 5. Construct prompt with context
    const prompt = constructPrompt(question, documents);
    logger.debug('Prompt constructed', { promptLength: prompt.length });
    
    // 6. Call Bedrock to generate response
    const answer = await generateResponse(prompt, logger);
    
    const duration = Date.now() - startTime;
    logger.info('Request completed successfully', { 
      duration, 
      answerLength: answer.length,
      documentsUsed: documents.length 
    });
    
    // 7. Return formatted response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        answer,
        conversationId: conversationId || `conv-${Date.now()}`,
        sources: documents.map(doc => ({
          documentName: doc.title,
          documentId: doc.documentId,
        })),
        timestamp: new Date().toISOString(),
      }),
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error processing chatbot request', error, { duration });
    
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
    
    if (error.message.includes('role')) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        }),
      };
    }
    
    if (error.message.includes('Bedrock') || error.message.includes('generate response')) {
      return {
        statusCode: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI service temporarily unavailable',
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
