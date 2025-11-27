/**
 * Cognito Post-Confirmation Trigger
 * Automatically sets custom:role attribute to "user" for new signups
 * 
 * Updated: 2025-11-17 - Added structured logging and improved error handling
 */

import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createLogger } from './logger.js';

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  const requestId = event.request?.userContextData?.requestId || `req-${Date.now()}`;
  const logger = createLogger({ requestId, function: 'post-confirmation' });

  // Log the full event for debugging
  logger.info('Post-confirmation trigger invoked', {
    userPoolId: event.userPoolId,
    username: event.userName,
    triggerSource: event.triggerSource,
    region: event.region || process.env.AWS_REGION
  });

  try {
    const userPoolId = event.userPoolId;
    const username = event.userName;

    // Validate required fields
    if (!userPoolId || !username) {
      logger.error('Missing required fields', null, { userPoolId, username });
      return event;
    }

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

    const result = await cognitoClient.send(command);

    logger.info('Successfully set custom:role attribute', {
      username,
      role: 'user',
      result: result ? 'success' : 'unknown'
    });

    return event;
  } catch (error) {
    logger.error('Error setting custom:role attribute', error, {
      username: event.userName,
      errorCode: error.code,
      errorName: error.name
    });

    // Don't throw error to avoid blocking user signup
    // The role can be set manually later if this fails
    logger.warn('Continuing signup despite role assignment failure');
    return event;
  }
};
