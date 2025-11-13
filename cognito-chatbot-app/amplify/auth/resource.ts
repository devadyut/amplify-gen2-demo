import { defineAuth } from '@aws-amplify/backend';
import { postConfirmationFunction } from '../functions/post-confirmation/resource';

/**
 * Define and configure your auth resource with custom attributes for ABAC
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    // Custom attribute for role-based access control (ABAC)
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
    // Optional: Additional custom attribute for department-based access
    'custom:department': {
      dataType: 'String',
      mutable: true,
    },
  },
  accountRecovery: 'EMAIL_ONLY',
  multifactor: {
    mode: 'OFF',
  },
  triggers: {
    postConfirmation: postConfirmationFunction,
  },
});
