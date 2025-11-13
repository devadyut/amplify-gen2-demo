# Cognito Chatbot App

AI-powered chatbot application with AWS Cognito authentication and Attribute-Based Access Control (ABAC).

## Project Structure

```
cognito-chatbot-app/
├── app/                          # Next.js app directory
│   ├── layout.js                 # Root layout with Amplify configuration
│   ├── page.js                   # Home page
│   └── globals.css               # Global styles
├── amplify/                      # Amplify Gen 2 backend
│   ├── auth/                     # Authentication configuration
│   │   └── resource.ts           # Cognito User Pool definition
│   ├── data/                     # Data/API configuration
│   │   └── resource.ts           # GraphQL API schema
│   ├── storage/                  # Storage configuration
│   │   └── resource.ts           # S3 bucket for knowledge base
│   ├── functions/                # Lambda functions
│   │   ├── chatbot/              # Chatbot Lambda function
│   │   │   ├── handler.js        # Function handler
│   │   │   └── package.json      # Function dependencies
│   │   └── admin/                # Admin Lambda function
│   │       ├── handler.js        # Function handler
│   │       └── package.json      # Function dependencies
│   ├── backend.ts                # Main backend configuration
│   ├── tsconfig.json             # TypeScript config for CDK
│   └── package.json              # Backend dependencies
├── amplify_outputs.json          # Generated Amplify configuration
├── package.json                  # Frontend dependencies
└── README.md                     # This file
```

## Technology Stack

- **Frontend**: Next.js 15 with JavaScript and Server-Side Rendering
- **Backend**: AWS Amplify Gen 2 with TypeScript CDK
- **Authentication**: AWS Cognito with custom attributes for ABAC
- **Functions**: AWS Lambda (JavaScript)
- **Storage**: Amazon S3
- **AI/ML**: Amazon Bedrock (to be configured)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS Account
- AWS CLI configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Amplify backend dependencies:
```bash
cd amplify
npm install
cd ..
```

### Development

1. Start the Amplify sandbox:
```bash
npx ampx sandbox
```

2. In a separate terminal, start the Next.js development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick deployment commands:

**Local Setup:**
```bash
npm run setup
```

**Deploy to Staging:**
```bash
npm run deploy:staging
```

**Deploy to Production:**
```bash
npm run deploy:production
```

**Amplify Sandbox:**
```bash
npm run amplify:sandbox
```

## Features (To Be Implemented)

- ✅ Project structure initialized
- ⏳ Cognito authentication with custom attributes
- ⏳ User and Admin roles with ABAC
- ⏳ AI-powered chatbot using Amazon Bedrock
- ⏳ Knowledge base stored in S3
- ⏳ REST API with Lambda and API Gateway
- ⏳ Server-side rendered pages with role-based access

## Requirements

See `.kiro/specs/cognito-chatbot-app/requirements.md` for detailed requirements.

## Design

See `.kiro/specs/cognito-chatbot-app/design.md` for architecture and design details.

## Implementation Tasks

See `.kiro/specs/cognito-chatbot-app/tasks.md` for the implementation plan.
