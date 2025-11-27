import { Stack, Duration } from 'aws-cdk-lib';
import { 
  RestApi, 
  LambdaIntegration, 
  AuthorizationType,
  MethodLoggingLevel,
  EndpointType,
} from 'aws-cdk-lib/aws-apigateway';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Define API Gateway REST API with IAM authorization
 * Provides endpoints for chatbot and admin operations
 * 
 * Uses IAM authorization to avoid circular dependencies between CloudFormation stacks.
 * Authenticated users will use AWS SigV4 signing to invoke API endpoints.
 */
export function createRestApi(
  stack: Stack,
  userPool: IUserPool,
  chatbotFunction: IFunction,
  adminFunction: IFunction
) {
  // Get environment-specific configuration
  const environment = process.env.AMPLIFY_ENV || 'dev';
  const isProduction = environment === 'production';
  
  // Configure CORS origins based on environment
  const allowedOrigins = isProduction
    ? [
        // Production origins - update these with your actual domains
        'https://yourdomain.com',
        'https://www.yourdomain.com',
      ]
    : [
        // Development and staging origins
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
      ];
  
  // Create REST API with CORS configuration
  const api: RestApi = new RestApi(stack, 'ChatbotRestApi', {
    restApiName: 'ChatbotRestAPI',
    description: 'REST API for chatbot and admin operations with IAM authorization',
    endpointTypes: [EndpointType.REGIONAL],
    deployOptions: {
      stageName: environment,
      throttlingRateLimit: isProduction ? 1000 : 100, // requests per second
      throttlingBurstLimit: isProduction ? 2000 : 200, // burst capacity
      metricsEnabled: true,
      loggingLevel: MethodLoggingLevel.INFO,
      dataTraceEnabled: !isProduction, // Disable in production for performance
      tracingEnabled: isProduction, // Enable X-Ray tracing in production
      methodOptions: {
        '/*/*': {
          throttlingRateLimit: isProduction ? 1000 : 100,
          throttlingBurstLimit: isProduction ? 2000 : 200,
        },
      },
    },
    defaultCorsPreflightOptions: {
      allowOrigins: allowedOrigins,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'X-Amz-Date',
        'Authorization',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'X-Requested-With',
      ],
      allowCredentials: true,
      maxAge: Duration.hours(1), // Cache preflight response for 1 hour
    },
    cloudWatchRole: true, // Enable CloudWatch logging
  });

  // Create Lambda integrations
  const chatbotIntegration = new LambdaIntegration(chatbotFunction, {
    proxy: true,
    allowTestInvoke: true,
  });

  const adminIntegration = new LambdaIntegration(adminFunction, {
    proxy: true,
    allowTestInvoke: true,
  });

  // Define chatbot resource and POST method with IAM authorization
  const chatbotResource = api.root.addResource('chatbot');
  
  chatbotResource.addMethod('POST', chatbotIntegration, {
    authorizationType: AuthorizationType.IAM,
    methodResponses: [
      {
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
        },
      },
      {
        statusCode: '400',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      },
      {
        statusCode: '401',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      },
      {
        statusCode: '500',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      },
    ],
  });

  // Define admin resource and GET method with IAM authorization
  const adminResource = api.root.addResource('admin');
  
  adminResource.addMethod('GET', adminIntegration, {
    authorizationType: AuthorizationType.IAM,
    methodResponses: [
      {
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
        },
      },
      {
        statusCode: '401',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      },
      {
        statusCode: '403',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      },
      {
        statusCode: '500',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      },
    ],
  });

  return api;
}
