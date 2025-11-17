/**
 * Amplify configuration utilities for client and server components
 * Handles proper configuration for Next.js App Router with SSR
 */

import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

/**
 * Configure Amplify for client-side components
 * This should be called in client components or the root layout
 */
export function configureAmplifyClient() {
  const config = {
    ...outputs,
    API: {
      REST: {
        chatbotApi: {
          endpoint: outputs.custom?.API?.endpoint,
          region: outputs.custom?.API?.region || outputs.auth.aws_region,
        },
      },
    },
  };
  
  Amplify.configure(config, {
    ssr: true, // Enable SSR mode for Next.js
  });
}

/**
 * Get Amplify configuration for server-side components
 * Returns the configuration object for server-side use
 */
export function getAmplifyConfig() {
  return {
    Auth: {
      Cognito: {
        userPoolId: outputs.auth.user_pool_id,
        userPoolClientId: outputs.auth.user_pool_client_id,
        region: outputs.auth.aws_region,
        // Custom attributes that can be read
        userAttributes: {
          'custom:role': {
            dataType: 'String',
            mutable: true,
          },
          'custom:department': {
            dataType: 'String',
            mutable: true,
          },
        },
      },
    },
  };
}

/**
 * Export auth configuration for use in components
 */
export const authConfig = {
  region: outputs.auth.aws_region,
  userPoolId: outputs.auth.user_pool_id,
  userPoolClientId: outputs.auth.user_pool_client_id,
};
