/**
 * Cognito Post-Confirmation Trigger
 * Automatically sets custom:role attribute to "user" for new signups
 */

import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  console.log('Post-confirmation trigger invoked:', JSON.stringify(event, null, 2));

  try {
    const userPoolId = event.userPoolId;
    const username = event.userName;

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
    console.log(`Successfully set custom:role to "user" for user: ${username}`);

    return event;
  } catch (error) {
    console.error('Error setting custom:role attribute:', error);
    // Don't throw error to avoid blocking user signup
    // The role can be set manually later if this fails
    return event;
  }
};
