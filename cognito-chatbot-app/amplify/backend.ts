import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { postConfirmationFunction } from './functions/post-confirmation/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { createRestApi } from './api/resource';
import { Stack, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Bucket, BucketEncryption, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Table, AttributeType, BillingMode, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
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
});

// Get the stack to create CDK resources
const stack = Stack.of(backend.auth.resources.userPool);

// Create S3 bucket for knowledge base using CDK constructs
const knowledgeBaseBucket = new Bucket(stack, 'KnowledgeBaseBucket', {
  bucketName: `knowledge-base-${stack.account}-${stack.region}`,
  encryption: BucketEncryption.S3_MANAGED,
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  versioned: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

console.log(`Created S3 bucket: knowledge-base-${stack.account}-${stack.region}`);

// Create DynamoDB table for application data using CDK constructs
const appDataTable = new Table(stack, 'AppDataTable', {
  tableName: `app-data-${stack.account}-${stack.region}`,
  partitionKey: {
    name: 'pk',
    type: AttributeType.STRING,
  },
  sortKey: {
    name: 'sk',
    type: AttributeType.STRING,
  },
  billingMode: BillingMode.PAY_PER_REQUEST,
  encryption: TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

console.log(`Created DynamoDB table: app-data-${stack.account}-${stack.region}`);

// Create Lambda functions using CDK constructs
console.log('Creating Lambda functions using CDK constructs...');

// Create chatbot Lambda function
const chatbotLambda = new Function(stack, 'ChatbotFunction', {
  functionName: `chatbot-${environment}`,
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler',
  code: Code.fromAsset('amplify/functions/chatbot'),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    KNOWLEDGE_BASE_BUCKET: knowledgeBaseBucket.bucketName,
    APP_DATA_TABLE: appDataTable.tableName,
    USER_POOL_ID: backend.auth.resources.userPool.userPoolId,
    CLIENT_ID: backend.auth.resources.userPoolClient.userPoolClientId,
    BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
    BEDROCK_REGION: 'eu-west-1',
    ENVIRONMENT: environment,
    LOG_LEVEL: envConfig.lambda.chatbot.logLevel,
    ENABLE_DETAILED_METRICS: envConfig.monitoring.enableDetailedMetrics.toString(),
  },
});

console.log(`Created chatbot Lambda function: chatbot-${environment}`);

// Create admin Lambda function
const adminLambda = new Function(stack, 'AdminFunction', {
  functionName: `admin-${environment}`,
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler',
  code: Code.fromAsset('amplify/functions/admin'),
  timeout: Duration.seconds(10),
  memorySize: 256,
  environment: {
    APP_DATA_TABLE: appDataTable.tableName,
    USER_POOL_ID: backend.auth.resources.userPool.userPoolId,
    CLIENT_ID: backend.auth.resources.userPoolClient.userPoolClientId,
    ENVIRONMENT: environment,
    LOG_LEVEL: envConfig.lambda.admin.logLevel,
    ENABLE_DETAILED_METRICS: envConfig.monitoring.enableDetailedMetrics.toString(),
  },
});

console.log(`Created admin Lambda function: admin-${environment}`);

// Grant IAM permissions to Lambda functions
console.log('Granting IAM permissions to Lambda functions...');

// Grant S3 read permissions to chatbot Lambda
knowledgeBaseBucket.grantRead(chatbotLambda, 'knowledge-base/*');
console.log('Granted S3 read permissions to chatbot Lambda');

// Grant DynamoDB read/write permissions to both Lambda functions
appDataTable.grantReadWriteData(chatbotLambda);
appDataTable.grantReadWriteData(adminLambda);
console.log('Granted DynamoDB read/write permissions to chatbot and admin Lambda functions');

// Grant Bedrock invoke permissions to chatbot Lambda
chatbotLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-*`,
    ],
  })
);
console.log('Granted Bedrock invoke permissions to chatbot Lambda');

// Grant Cognito permissions to admin Lambda
adminLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsers',
      'cognito-idp:AdminGetUser',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);
console.log('Granted Cognito permissions to admin Lambda');

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

// IMPORTANT: Post-Confirmation Lambda Permissions
// The post-confirmation Lambda needs cognito-idp:AdminUpdateUserAttributes permission
// but granting it here creates a circular dependency (Lambda → Policy → UserPool → Lambda).
// 
// Solution: Run the permission grant script after deployment:
//   ./scripts/grant-post-confirmation-permissions.sh
//
// This script will find the Lambda role and User Pool, then add the necessary IAM policy.
console.log('Note: Run ./scripts/grant-post-confirmation-permissions.sh after first deployment');

// Create API Gateway REST API
const restApi = createRestApi(
  stack,
  backend.auth.resources.userPool,
  chatbotLambda,
  adminLambda
);

// Grant Cognito authenticated role permission to invoke API Gateway
console.log('Granting API invoke permission to Cognito authenticated role...');
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['execute-api:Invoke'],
    resources: [
      `arn:aws:execute-api:${stack.region}:${stack.account}:${restApi.restApiId}/*/*/*`,
    ],
  })
);
console.log('Granted execute-api:Invoke permission to authenticated users');

// CloudWatch Logging Configuration
// Note: Lambda functions automatically create log groups and have permissions to write logs
// Log groups are created at /aws/lambda/<function-name> with default retention
// The structured logging utility in shared/logger.js handles all log formatting
console.log(`CloudWatch logging enabled for all Lambda functions with structured JSON format`);

// Environment-specific configurations
console.log(`Applying ${environment} environment configurations...`);
console.log(`Lambda Chatbot - Timeout: 30s, Memory: 512MB`);
console.log(`Lambda Admin - Timeout: 10s, Memory: 256MB`);
console.log(`API Throttling - Rate: ${envConfig.api.throttling.rateLimit}, Burst: ${envConfig.api.throttling.burstLimit}`);
console.log(`Monitoring - Detailed Metrics: ${envConfig.monitoring.enableDetailedMetrics}, Log Retention: ${envConfig.monitoring.logRetentionDays} days`);

// Add outputs for API Gateway endpoint following official Amplify guidance
backend.addOutput({
  custom: {
    API: {
      [restApi.restApiName]: {
        endpoint: restApi.url,
        region: stack.region,
        apiName: restApi.restApiName,
      },
    },
    Environment: {
      name: environment,
      isProduction: isProduction,
    },
  },
});
