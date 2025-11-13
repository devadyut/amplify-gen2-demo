# Authentication Setup Guide

## Overview

This document describes the Cognito authentication infrastructure with Attribute-Based Access Control (ABAC) implemented for the Cognito Chatbot App.

## Implementation Details

### 1. Cognito User Pool Configuration

The Cognito User Pool is configured with the following features:

#### Custom Attributes for ABAC
- `custom:role` - String attribute for role-based access control (values: "user" or "admin")
- `custom:department` - String attribute for department-based access (optional)

#### Security Settings
- **Password Policy**:
  - Minimum length: 8 characters
  - Requires: uppercase, lowercase, numbers, and symbols
  - Temporary password validity: 7 days

- **Email Verification**: Required for all users
- **Account Recovery**: Email-based recovery only
- **MFA**: Optional (software token MFA enabled)

#### Token Configuration
- Access Token Validity: 60 minutes
- ID Token Validity: 60 minutes
- Refresh Token Validity: 30 days

### 2. App Client Configuration

The app client is configured to:
- Read custom attributes (`custom:role`, `custom:department`)
- Read standard attributes (`email`, `email_verified`)
- Write standard attributes (`email`)

### 3. Amplify Configuration

#### Files Created
1. **`lib/amplify-config.js`** - Amplify configuration utilities
   - `configureAmplifyClient()` - Configure Amplify for client-side with SSR support
   - `getAmplifyConfig()` - Get configuration for server-side use
   - `authConfig` - Exported auth configuration object

2. **`lib/auth-server.js`** - Server-side authentication utilities
   - `getServerSession()` - Get session from cookies
   - `decodeJWT()` - Decode JWT tokens
   - `getUserRole()` - Extract custom:role attribute
   - `checkAuthorization()` - ABAC authorization logic
   - `getUserAttributes()` - Extract all user attributes

3. **`lib/auth-client.js`** - Client-side authentication utilities
   - `signInUser()` - Sign in with email/password
   - `signOutUser()` - Sign out current user
   - `getAuthenticatedUser()` - Get current user info
   - `getUserSession()` - Get session with custom attributes
   - `hasRole()` - Check user role for authorization

### 4. ABAC Authorization Logic

The authorization logic implements the following rules:

| User Role | Access Level |
|-----------|-------------|
| `admin` | Full access to all pages and APIs |
| `user` | Access to user-level pages and APIs only |

**Authorization Check Flow**:
1. Extract JWT token from request
2. Decode token to get `custom:role` attribute
3. Compare user role with required role
4. Grant or deny access based on ABAC rules

## Deployment

### Prerequisites
- AWS Account with Amplify Gen 2 CLI installed
- Node.js 18+ and npm

### Deploy Backend

```bash
cd cognito-chatbot-app
npx ampx sandbox
```

This will:
1. Create the Cognito User Pool with custom attributes
2. Configure password policies and email verification
3. Create the app client with proper permissions
4. Generate `amplify_outputs.json` with configuration

### Create Test Users

After deployment, create test users with custom attributes:

```bash
# Create a regular user
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username testuser@example.com \
  --user-attributes Name=email,Value=testuser@example.com Name=email_verified,Value=true Name=custom:role,Value=user \
  --temporary-password TempPass123!

# Create an admin user
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true Name=custom:role,Value=admin \
  --temporary-password AdminPass123!
```

## Usage Examples

### Client-Side Authentication

```javascript
import { signInUser, getUserSession } from '@/lib/auth-client';

// Sign in
const result = await signInUser('user@example.com', 'password');
if (result.success) {
  console.log('Signed in successfully');
}

// Get session with custom attributes
const session = await getUserSession();
if (session.success) {
  console.log('User role:', session.session.userAttributes.role);
}
```

### Server-Side Authorization

```javascript
import { getServerSession, checkAuthorization } from '@/lib/auth-server';

// In a server component or API route
const session = await getServerSession();
if (!session) {
  redirect('/login');
}

// Check authorization
const isAuthorized = checkAuthorization(session.idToken, 'admin');
if (!isAuthorized) {
  return new Response('Forbidden', { status: 403 });
}
```

## Next Steps

1. Implement middleware for route protection (Task 7.2)
2. Create login page with authentication (Task 8)
3. Implement user and admin pages with role-based access (Tasks 9-10)

## Requirements Satisfied

- ✅ Requirement 1.2: Cognito authentication with custom attributes
- ✅ Requirement 2.1: Custom:role attribute for ABAC
- ✅ Requirement 6.2: CDK infrastructure for Cognito
- ✅ Requirement 6.3: Password policy and email verification
- ✅ Requirement 6.4: Amplify auth configuration export
