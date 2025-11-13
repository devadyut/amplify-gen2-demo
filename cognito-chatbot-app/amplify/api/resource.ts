import { Stack } from 'aws-cdk-lib';
import { 
  RestApi, 
  LambdaIntegration, 
  CognitoUserPoolsAuthorizer,
  Cors,
  AuthorizationType,
  ThrottleSettings,
  MethodLoggingLevel,
  EndpointType,
} from 'aws-cdk-lib/aws-apigateway';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Define API Gateway REST API with Cognito authorization
 * Provides endpoints for chatbot and admin operations
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
  const api = new RestApi(stack, 'ChatbotRestApi', {
    restApiName: 'Chatbot REST API',
    description: 'REST API for chatbot and admin operations with Cognito authorization',
    endpointTypes: [EndpointType.REGIONAL],
    deployOptions: {
      stageName: 'prod',
      throttlingRateLimit: isProduction ? 1000 : 100, // requests per second
      throttlingBurstLimit: isProduction ? 2000 : 200, // burst capacity
      metricsEnabled: true,
      loggingLevel: MethodLoggingLevel.INFO,
      dataTraceEnabled: !isProduction, // Disable in production for performance
      tracingEnabled: isProduction, // Enable X-Ray tracing in production
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
      maxAge: 3600, // Cache preflight response for 1 hour
    },
    // Security settings
    cloudWatchRole: true, // Enable CloudWatch logging
    deployOptions: {
      ...api.deployOptions,
      // Add custom headers for security
      methodOptions: {
        '/*/*': {
          throttlingRateLimit: isProduction ? 1000 : 100,
          throttlingBurstLimit: isProduction ? 2000 : 200,
        },
      },
    },
  });

  // Create Cognito authorizer
  const authorizer = new CognitoUserPoolsAuthorizer(stack, 'CognitoAuthorizer', {
    cognitoUserPools: [userPool],
    authorizerName: 'CognitoUserPoolAuthorizer',
    identitySource: 'method.request.header.Authorization',
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

  // Define chatbot routes
  const chatbotResource = api.root.addResource('chatbot');
  const chatbotAskResource = chatbotResource.addResource('ask');
  
  chatbotAskResource.addMethod('POST', chatbotIntegration, {
    authorizationType: AuthorizationType.COGNITO,
    authorizer: authorizer,
    requestParameters: {
      'method.request.header.Authorization': true,
    },
    requestValidatorOptions: {
      validateRequestBody: true,
      validateRequestParameters: true,
    },
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

  // Define admin routes
  const adminResource = api.root.addResource('admin');
  const adminStatsResource = adminResource.addResource('stats');
  
  adminStatsResource.addMethod('GET', adminIntegration, {
    authorizationType: AuthorizationType.COGNITO,
    authorizer: authorizer,
    requestParameters: {
      'method.request.header.Authorization': true,
    },
    requestValidatorOptions: {
      validateRequestParameters: true,
    },
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

  // Additional admin route for user management (example)
  const adminUsersResource = adminResource.addResource('users');
  
  adminUsersResource.addMethod('GET', adminIntegration, {
    authorizationType: AuthorizationType.COGNITO,
    authorizer: authorizer,
    requestParameters: {
      'method.request.header.Authorization': true,
    },
    requestValidatorOptions: {
      validateRequestParameters: true,
    },
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
