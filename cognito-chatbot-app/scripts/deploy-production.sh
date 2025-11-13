#!/bin/bash

# Production Deployment Script
# This script deploys the application to the production environment

set -e

echo "🚀 Deploying to production environment..."
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to deploy to production? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled."
    exit 0
fi

# Set environment and region
export AMPLIFY_ENV=production
export AWS_REGION=eu-west-1
export NEXT_PUBLIC_AWS_REGION=eu-west-1

echo "🌍 AWS Region: $AWS_REGION"

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

# Verify we're on the main/master branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
    echo "⚠️  WARNING: You are not on the main/master branch (current: $current_branch)"
    read -p "Continue anyway? (yes/no): " continue_anyway
    if [ "$continue_anyway" != "yes" ]; then
        echo "❌ Deployment cancelled."
        exit 0
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  WARNING: You have uncommitted changes"
    read -p "Continue anyway? (yes/no): " continue_anyway
    if [ "$continue_anyway" != "yes" ]; then
        echo "❌ Deployment cancelled."
        exit 0
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint || {
    echo "❌ Linting failed. Please fix linting errors before deploying to production."
    exit 1
}

# Build Next.js application
echo "🏗️  Building Next.js application..."
npm run build

# Deploy backend with Amplify to eu-west-1
echo "☁️  Deploying backend to AWS (eu-west-1)..."
npx ampx pipeline-deploy --branch production --app-id ${AWS_APP_ID:-production} --region eu-west-1

# Get the deployed API endpoint
echo "📋 Retrieving deployment information..."
npx ampx generate outputs --branch production --app-id ${AWS_APP_ID:-production}

# Tag the release
git_tag="production-$(date +%Y%m%d-%H%M%S)"
echo "🏷️  Creating git tag: $git_tag"
git tag -a "$git_tag" -m "Production deployment on $(date)"
git push origin "$git_tag"

echo ""
echo "✅ Production deployment complete!"
echo "🏷️  Git tag created: $git_tag"
echo ""
echo "Next steps:"
echo "1. Monitor CloudWatch logs for any errors"
echo "2. Test the production environment"
echo "3. Verify all critical features are working"
echo "4. Monitor application metrics and performance"
echo ""
