import { defineFunction } from '@aws-amplify/backend';

/**
 * Define Chatbot Lambda function
 * Handles chatbot question/answer requests with Bedrock integration
 */
export const chatbotFunction = defineFunction({
  name: 'chatbot',
  entry: './handler.js',
  runtime: 20, // Node.js 20
  timeoutSeconds: 30,
  memoryMB: 512,
});
