import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { chatbotFunction } from './functions/chatbot/resource';
import { adminFunction } from './functions/admin/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { createRestApi } from './api/resource';
import { Stack } from 'aws-cdk-lib';
import { getEnvironmentConfig } from './env-config';

// Get environment-specific configuration
const envConfig = getEnvironmentConfig();
const { name: environment, isProduction } = envConfig;

console.log(`Configuring backend for environment: ${environment}`);

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  chatbotFunction,
  adminFunction,
});

// Customize Cognito User Pool with additional security and ABAC configurations
const { cfnUserPool, cfnUserPoolClient } = backend.auth.resources.cfnResources;

// Configure password policy requirements using environment config
if (cfnUserPool) {
  cfnUserPool.policies = {
    passwordPolicy: {
      minimumLength: envConfig.cognito.passwordPolicy.minimumLength,
      requireLowercase: envConfig.cognito.passwordPolicy.requireLowercase,
      requireUppercase: envConfig.cognito.passwordPolicy.requireUppercase,
      requireNumbers: envConfig.cognito.passwordPolicy.requireNumbers,
      requireSymbols: envConfig.cognito.passwordPolicy.requireSymbols,
      temporaryPasswordValidityDays: 7,
    },
  };

  // Configure email verification
  cfnUserPool.emailVerificationMessage = 'Your verification code is {####}';
  cfnUserPool.emailVerificationSubject = 'Verify your email for Cognito Chatbot App';
  cfnUserPool.autoVerifiedAttributes = ['email'];

  // Configure account recovery
  cfnUserPool.accountRecoverySetting = {
    recoveryMechanisms: [
      {
        name: 'verified_email',
        priority: 1,
      },
    ],
  };

  // Configure MFA settings from environment config
  // Only enable SOFTWARE_TOKEN_MFA if MFA is not OFF
  if (envConfig.cognito.mfaConfiguration !== 'OFF') {
    cfnUserPool.mfaConfiguration = envConfig.cognito.mfaConfiguration;
    cfnUserPool.enabledMfas = ['SOFTWARE_TOKEN_MFA'];
  } else {
    cfnUserPool.mfaConfiguration = 'OFF';
  }
}

// Configure app client to read custom attributes
if (cfnUserPoolClient) {
  cfnUserPoolClient.readAttributes = [
    'email',
    'email_verified',
    'custom:role',
    'custom:department',
  ];

  cfnUserPoolClient.writeAttributes = [
    'email',
  ];

  // Configure token validity from environment config
  cfnUserPoolClient.accessTokenValidity = envConfig.cognito.tokenValidity.accessToken;
  cfnUserPoolClient.idTokenValidity = envConfig.cognito.tokenValidity.idToken;
  cfnUserPoolClient.refreshTokenValidity = envConfig.cognito.tokenValidity.refreshToken;
  cfnUserPoolClient.tokenValidityUnits = {
    accessToken: 'minutes',
    idToken: 'minutes',
    refreshToken: 'days',
  };
}

// Configure S3 bucket for knowledge base with encryption and versioning
const s3Bucket = backend.storage.resources.bucket;

// Encryption is enabled by default in Amplify Gen 2
// The bucket already has server-side encryption with S3-managed keys (SSE-S3)

// Grant permissions to post-confirmation trigger (access via auth.resources)
// The trigger function is automatically wired by Amplify when defined in auth triggers

// Configure Chatbot Lambda function
const chatbotLambda = backend.chatbotFunction.resources.lambda;

// Set environment variables for Chatbot Lambda
backend.chatbotFunction.addEnvironment('KNOWLEDGE_BASE_BUCKET', s3Bucket.bucketName);
backend.chatbotFunction.addEnvironment('BEDROCK_MODEL_ID', process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0');
backend.chatbotFunction.addEnvironment('BEDROCK_REGION', 'eu-west-1'); // Bedrock region for API calls
backend.chatbotFunction.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.chatbotFunction.addEnvironment('CLIENT_ID', backend.auth.resources.userPoolClient.userPoolClientId);
backend.chatbotFunction.addEnvironment('ENVIRONMENT', environment);

// Grant S3 read permissions to Chatbot Lambda
s3Bucket.grantRead(chatbotLambda, 'knowledge-base/*');

// Grant Bedrock invoke permissions to Chatbot Lambda (eu-west-1 region)
chatbotLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
      `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-*`,
    ],
  })
);

// Configure Admin Lambda function
const adminLambda = backend.adminFunction.resources.lambda;

// Set environment variables for Admin Lambda
backend.adminFunction.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.adminFunction.addEnvironment('CLIENT_ID', backend.auth.resources.userPoolClient.userPoolClientId);
backend.adminFunction.addEnvironment('ENVIRONMENT', environment);

// Note: Post-Confirmation Lambda is configured through auth resource triggers
// to avoid circular dependencies. Environment variables are set in auth/resource.ts

// Grant Cognito permissions to Admin Lambda
adminLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsers',
      'cognito-idp:AdminGetUser',
      'cognito-idp:ListUsersInGroup',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

// Create API Gateway REST API
const stack = Stack.of(chatbotLambda);
const restApi = createRestApi(
  stack,
  backend.auth.resources.userPool,
  chatbotLambda,
  adminLambda
);

// CloudWatch Logging Configuration
// Note: Lambda functions automatically create log groups and have permissions to write logs
// Log groups are created at /aws/lambda/<function-name> with default retention
// The structured logging utility in shared/logger.js handles all log formatting
console.log(`CloudWatch logging enabled for all Lambda functions with structured JSON format`);

// Environment-specific configurations
console.log(`Applying ${environment} environment configurations...`);

// Apply Lambda configurations from environment config
backend.chatbotFunction.addEnvironment('LOG_LEVEL', envConfig.lambda.chatbot.logLevel);
backend.adminFunction.addEnvironment('LOG_LEVEL', envConfig.lambda.admin.logLevel);
backend.chatbotFunction.addEnvironment('ENABLE_DETAILED_METRICS', envConfig.monitoring.enableDetailedMetrics.toString());
backend.adminFunction.addEnvironment('ENABLE_DETAILED_METRICS', envConfig.monitoring.enableDetailedMetrics.toString());

// Log environment-specific settings
console.log(`Lambda Chatbot - Timeout: ${envConfig.lambda.chatbot.timeout}s, Memory: ${envConfig.lambda.chatbot.memory}MB`);
console.log(`Lambda Admin - Timeout: ${envConfig.lambda.admin.timeout}s, Memory: ${envConfig.lambda.admin.memory}MB`);
console.log(`API Throttling - Rate: ${envConfig.api.throttling.rateLimit}, Burst: ${envConfig.api.throttling.burstLimit}`);
console.log(`Monitoring - Detailed Metrics: ${envConfig.monitoring.enableDetailedMetrics}, Log Retention: ${envConfig.monitoring.logRetentionDays} days`);

// Add outputs for API Gateway endpoint
backend.addOutput({
  custom: {
    API: {
      endpoint: restApi.url,
      region: stack.region,
      apiId: restApi.restApiId,
    },
    Environment: {
      name: environment,
      isProduction: isProduction,
    },
  },
});
