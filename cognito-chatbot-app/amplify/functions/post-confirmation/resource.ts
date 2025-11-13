import { defineFunction } from '@aws-amplify/backend';

/**
 * Define Post-Confirmation Lambda function
 * Automatically sets custom:role to "user" for new signups
 */
export const postConfirmationFunction = defineFunction({
  name: 'post-confirmation',
  entry: './handler.js',
  runtime: 20, // Node.js 20
  timeoutSeconds: 10,
  memoryMB: 256,
});
