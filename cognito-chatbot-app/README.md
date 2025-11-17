# Cognito Chatbot App

AI-powered chatbot application with AWS Cognito authentication and Attribute-Based Access Control (ABAC).

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Post-Deployment Setup](#post-deployment-setup)
- [Features](#features)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

## Overview

This application demonstrates a modern serverless architecture using AWS Amplify Gen 2, featuring:
- **Authentication**: AWS Cognito with custom attributes for role-based access control
- **Authorization**: Attribute-Based Access Control (ABAC) using `custom:role` attribute
- **AI Chatbot**: Amazon Bedrock integration for intelligent responses
- **Knowledge Base**: S3-stored documents for context-aware answers
- **API**: REST API with API Gateway and Lambda functions
- **Frontend**: Next.js with Server-Side Rendering

## Technology Stack

- **Frontend**: Next.js 16 with JavaScript and Server-Side Rendering
- **Backend**: AWS Amplify Gen 2 with TypeScript CDK
- **Authentication**: AWS Cognito with custom attributes for ABAC
- **Functions**: AWS Lambda (JavaScript)
- **API**: Amazon API Gateway (REST)
- **Storage**: Amazon S3
- **AI/ML**: Amazon Bedrock (Claude 3 Sonnet)
- **Region**: eu-west-1 (Ireland)

## Project Structure

```
cognito-chatbot-app/
├── app/                          # Next.js app directory
│   ├── layout.js                 # Root layout with Amplify configuration
│   ├── page.js                   # Home page
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── user/                     # User page (authenticated)
│   ├── admin/                    # Admin page (admin role only)
│   └── unauthorized/             # Unauthorized access page
├── components/                   # React components
│   ├── Chatbot.js                # Chatbot component
│   └── ErrorBoundary.js          # Error boundary component
├── lib/                          # Utility libraries
│   ├── amplify-config.js         # Amplify configuration
│   ├── auth-client.js            # Client-side auth utilities
│   └── auth-server.js            # Server-side auth utilities
├── amplify/                      # Amplify Gen 2 backend
│   ├── auth/                     # Authentication configuration
│   │   └── resource.ts           # Cognito User Pool with custom attributes
│   ├── data/                     # Data/API configuration
│   │   └── resource.ts           # GraphQL API schema
│   ├── storage/                  # Storage configuration
│   │   └── resource.ts           # S3 bucket for knowledge base
│   ├── api/                      # API Gateway configuration
│   │   └── resource.ts           # REST API with Cognito authorizer
│   ├── functions/                # Lambda functions
│   │   ├── chatbot/              # Chatbot Lambda function
│   │   ├── admin/                # Admin Lambda function
│   │   └── post-confirmation/    # Post-confirmation trigger
│   ├── backend.ts                # Main backend configuration
│   └── env-config.ts             # Environment-specific configuration
├── knowledge-base/               # Knowledge base documents (JSON)
├── scripts/                      # Utility scripts
│   └── grant-post-confirmation-permissions.sh
├── amplify_outputs.json          # Generated Amplify configuration
├── middleware.js                 # Next.js middleware for auth
└── package.json                  # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS Account
- AWS CLI configured with credentials

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Install Amplify backend dependencies:**
```bash
cd amplify
npm install
cd ..
```

3. **Configure environment (optional):**
```bash
cp .env.example .env.local
```

## Development

### Local Development with Amplify Sandbox

The Amplify sandbox provides a personal cloud development environment:

1. **Start the Amplify sandbox:**
```bash
npm run amplify:sandbox
```

This will:
- Deploy backend resources to your AWS account
- Create isolated resources per developer
- Watch for changes and auto-deploy
- Generate `amplify_outputs.json`

2. **In a separate terminal, start Next.js dev server:**
```bash
npm run dev
```

3. **Open your browser:**
```
http://localhost:3000
```

### Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js application
- `npm run start` - Start Next.js production server
- `npm run lint` - Run ESLint
- `npm run amplify:sandbox` - Start Amplify sandbox
- `npm run amplify:generate` - Generate Amplify outputs

## Deployment

### Deploy to AWS

The application uses AWS Amplify for deployment to eu-west-1 region.

#### Option 1: Amplify Console (Recommended)

1. **Connect your Git repository:**
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Connect your Git repository
   - Amplify will use `amplify.yml` for build configuration

2. **Configure build settings:**
   - Build settings are defined in `amplify.yml`
   - Environment variables can be set in Amplify Console

3. **Deploy:**
   - Push to your repository
   - Amplify automatically builds and deploys

#### Option 2: Manual Deployment

1. **Deploy backend:**
```bash
npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID
```

2. **Build frontend:**
```bash
npm run build
```

3. **Deploy frontend:**
   - Upload build artifacts to your hosting service
   - Or use Amplify Hosting

### Environment Configuration

The application supports multiple environments:
- **dev** - Development (sandbox)
- **staging** - Pre-production testing
- **production** - Live production

Environment-specific settings are in `amplify/env-config.ts`.

## Post-Deployment Setup

### Grant Post-Confirmation Lambda Permissions

After first deployment, run this script to grant IAM permissions:

```bash
./scripts/grant-post-confirmation-permissions.sh
```

**Why is this needed?**

The post-confirmation Lambda automatically sets `custom:role` to "user" for new signups. However, granting the IAM permission during deployment creates a circular dependency in CloudFormation.

**What the script does:**
1. Finds the post-confirmation Lambda IAM role
2. Finds the Cognito User Pool ID
3. Creates an inline IAM policy granting `AdminUpdateUserAttributes` permission
4. Attaches the policy to the Lambda role

**Verification:**
1. Sign up a new user
2. Check user attributes in Cognito Console
3. Verify `custom:role` is set to "user"

### Manual Alternative

If you prefer manual setup:

1. Go to AWS Console → IAM → Roles
2. Search for role containing "postconfirmationlambda"
3. Add inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "cognito-idp:AdminUpdateUserAttributes",
      "Resource": "arn:aws:cognito-idp:REGION:ACCOUNT_ID:userpool/USER_POOL_ID"
    }
  ]
}
```

## Features

### Implemented Features

- ✅ Cognito authentication with email/password
- ✅ Custom attributes for ABAC (`custom:role`, `custom:department`)
- ✅ User and Admin roles with role-based access control
- ✅ Server-side rendered pages with authentication
- ✅ AI-powered chatbot using Amazon Bedrock
- ✅ Knowledge base stored in S3
- ✅ REST API with Lambda and API Gateway
- ✅ Cognito authorizer for API Gateway
- ✅ Post-confirmation trigger for automatic role assignment
- ✅ CloudWatch logging for Lambda functions
- ✅ Error handling and unauthorized access pages

### User Roles

**User Role** (`custom:role="user"`):
- Access to user page
- Can use chatbot
- Cannot access admin page

**Admin Role** (`custom:role="admin"`):
- Access to user page
- Access to admin page
- Can use chatbot
- Can view admin statistics

## Architecture

### Authentication Flow

```
User Login
    ↓
Cognito Authentication
    ↓
Get JWT Token (with custom:role attribute)
    ↓
Next.js Middleware validates token
    ↓
Extract custom:role from token
    ↓
Route to appropriate page based on role
```

### Chatbot Flow

```
User submits question
    ↓
Frontend gets ID token from Amplify
    ↓
Call API Gateway with Authorization header
    ↓
API Gateway validates token with Cognito authorizer
    ↓
Lambda retrieves documents from S3
    ↓
Lambda constructs prompt with context
    ↓
Lambda calls Bedrock API
    ↓
Bedrock generates response
    ↓
Response returned to frontend
```

### API Architecture

```
Frontend (Chatbot Component)
    ↓ (HTTPS with ID Token)
API Gateway (Cognito Authorizer)
    ↓
Lambda Functions
    ↓
AWS Services (S3, Bedrock, Cognito)
```

## Troubleshooting

### Common Issues

#### 1. Deployment fails with circular dependency

**Issue:** CloudFormation circular dependency error

**Solution:** This was resolved by proper resource organization. If you encounter this, ensure functions are not manually assigned to conflicting resource groups.

#### 2. API Gateway returns 401 Unauthorized

**Issue:** Cognito authorizer rejects valid tokens

**Solution:**
- Ensure you're sending the **ID token** (not access token)
- Verify the token's `aud` matches the User Pool Client ID
- Check that the User Pool ID in the authorizer matches your User Pool
- Redeploy API Gateway if configuration changed

#### 3. Post-confirmation Lambda fails

**Issue:** New users don't get `custom:role` attribute

**Solution:**
- Run the post-deployment setup script
- Verify Lambda has `cognito-idp:AdminUpdateUserAttributes` permission
- Check CloudWatch logs for the Lambda function

#### 4. Chatbot returns errors

**Issue:** Chatbot fails to generate responses

**Solution:**
- Verify Bedrock model access in your AWS account
- Check Lambda has permissions to invoke Bedrock
- Verify S3 bucket permissions for knowledge base
- Check CloudWatch logs for detailed errors

#### 5. Build fails

**Issue:** `npm run build` fails

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Debug Mode

Enable verbose logging:

```bash
export DEBUG=*
npm run dev
```

### CloudWatch Logs

View Lambda function logs:

```bash
# Chatbot Lambda
aws logs tail /aws/lambda/chatbot --follow

# Admin Lambda
aws logs tail /aws/lambda/admin --follow

# Post-confirmation Lambda
aws logs tail /aws/lambda/post-confirmation --follow
```

### Verify Configuration

Check that `amplify_outputs.json` contains:
- `auth.user_pool_id`
- `auth.user_pool_client_id`
- `custom.API.endpoint`
- `storage.bucket_name`

## Additional Resources

### Documentation

- [AWS Amplify Gen 2 Docs](https://docs.amplify.aws/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [AWS Cognito](https://aws.amazon.com/cognito/)

### Spec Files

Detailed requirements and design:
- `.kiro/specs/cognito-chatbot-app/requirements.md` - Detailed requirements
- `.kiro/specs/cognito-chatbot-app/design.md` - Architecture and design
- `.kiro/specs/cognito-chatbot-app/tasks.md` - Implementation plan

## Support

For issues or questions:
- Check CloudWatch logs for backend errors
- Review Amplify Console build logs
- Verify AWS credentials and permissions
- Check that all required AWS services are available in eu-west-1

## License

This project is for demonstration purposes.
