/**
 * Amplify configuration utilities for client and server components
 * Handles proper configuration for Next.js App Router with SSR
 */

import { Amplify } from 'aws-amplify';
import { parseAmplifyConfig } from 'aws-amplify/utils';
import outputs from '../amplify_outputs.json';

/**
 * Configure Amplify for client-side components
 * This should be called in client components or the root layout
 * Following official Amplify Gen 2 configuration pattern
 */
export function configureAmplifyClient() {
  const { ['API']: amplifyApiConfig, ...restOfAmplifyConfig } = parseAmplifyConfig(outputs);

  Amplify.configure(
    {
      ...restOfAmplifyConfig,
      API: {
        ...amplifyApiConfig,
        REST: outputs.custom.API, // Required for custom REST APIs
      },
    },
    {
      ssr: true, // Enable SSR mode for Next.js
    }
  );
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
