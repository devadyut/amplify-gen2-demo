/**
 * Cognito Post-Confirmation Trigger
 * Automatically sets custom:role attribute to "user" for new signups
 */

import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createLogger } from '../shared/logger.js';

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  const requestId = event.request?.userContextData?.requestId || `req-${Date.now()}`;
  const logger = createLogger({ requestId, function: 'post-confirmation' });
  
  logger.info('Post-confirmation trigger invoked', { 
    userPoolId: event.userPoolId,
    username: event.userName,
    triggerSource: event.triggerSource 
  });

  try {
    const userPoolId = event.userPoolId;
    const username = event.userName;

    logger.logServiceCall('Cognito', 'AdminUpdateUserAttributes', { 
      userPoolId, 
      username 
    });

    // Set custom:role attribute to "user" for new signups
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [
        {
          Name: 'custom:role',
          Value: 'user',
        },
      ],
    });

    await cognitoClient.send(command);
    
    logger.info('Successfully set custom:role attribute', { 
      username, 
      role: 'user' 
    });

    return event;
  } catch (error) {
    logger.error('Error setting custom:role attribute', error, { 
      username: event.userName 
    });
    
    // Don't throw error to avoid blocking user signup
    // The role can be set manually later if this fails
    logger.warn('Continuing signup despite role assignment failure');
    return event;
  }
};
