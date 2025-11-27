import { defineStorage } from '@aws-amplify/backend';

/**
 * Define S3 storage resource for knowledge base documents
 * 
 * Note: Access rules removed to prevent circular dependency with auth resources.
 * Permissions will be granted explicitly in backend.ts using CDK grant methods.
 * 
 * Features:
 * - Encryption at rest (configured in backend.ts)
 * - Versioning enabled (configured in backend.ts)
 * - Lambda access will be configured when Lambda functions are created
 * @see https://docs.amplify.aws/gen2/build-a-backend/storage
 */
export const storage = defineStorage({
  name: 'knowledgeBase',
  // NO access rules - prevents auth dependency
});
