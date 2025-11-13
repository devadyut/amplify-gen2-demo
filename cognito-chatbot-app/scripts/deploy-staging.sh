#!/bin/bash

# Staging Deployment Script
# This script deploys the application to the staging environment

set -e

echo "🚀 Deploying to staging environment..."

# Set environment
export AMPLIFY_ENV=staging

# Check if AWS CLI is configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install AWS CLI first."
    exit 1
fi

echo "✅ AWS CLI version: $(aws --version)"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS credentials configured"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint || {
    echo "⚠️  Linting failed. Please fix linting errors before deploying."
    exit 1
}

# Build Next.js application
echo "🏗️  Building Next.js application..."
npm run build

# Deploy backend with Amplify
echo "☁️  Deploying backend to AWS..."
npx ampx pipeline-deploy --branch staging --app-id ${AWS_APP_ID:-staging}

# Get the deployed API endpoint
echo "📋 Retrieving deployment information..."
npx ampx generate outputs --branch staging --app-id ${AWS_APP_ID:-staging}

echo ""
echo "✅ Staging deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the staging environment thoroughly"
echo "2. Verify all features are working as expected"
echo "3. If everything looks good, proceed with production deployment"
echo ""
