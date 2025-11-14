import { defineFunction } from '@aws-amplify/backend';

/**
 * Define Post-Confirmation Lambda function
 * Automatically sets custom:role to "user" for new signups
 * 
 * IMPORTANT: resourceGroupName must be 'auth' to avoid circular dependencies
 * since this function is used as a Cognito trigger
 */
export const postConfirmationFunction = defineFunction({
  name: 'post-confirmation',
  entry: './handler.js',
  runtime: 20, // Node.js 20
  timeoutSeconds: 10,
  memoryMB: 256,
  resourceGroupName: 'auth',
});
