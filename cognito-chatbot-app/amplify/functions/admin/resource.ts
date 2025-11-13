import { defineFunction } from '@aws-amplify/backend';

/**
 * Define Admin Lambda function
 * Handles admin-specific operations with role-based access control
 */
export const adminFunction = defineFunction({
  name: 'admin',
  entry: './handler.js',
  runtime: 20, // Node.js 20
  timeoutSeconds: 10,
  memoryMB: 256,
});
