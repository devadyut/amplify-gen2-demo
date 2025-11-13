#!/bin/bash

# Local Development Setup Script
# This script sets up the local development environment

set -e

echo "🚀 Setting up local development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Amplify CLI is installed
if ! command -v npx ampx &> /dev/null; then
    echo "⚠️  Amplify Gen 2 CLI not found. Installing..."
    npm install -g @aws-amplify/backend-cli
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your configuration"
else
    echo "✅ .env.local already exists"
fi

# Create knowledge base directory if it doesn't exist
if [ ! -d "knowledge-base" ]; then
    echo "📁 Creating knowledge-base directory..."
    mkdir -p knowledge-base
fi

echo ""
echo "✅ Local development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your AWS configuration"
echo "2. Run 'npx ampx sandbox' to start the Amplify sandbox"
echo "3. In another terminal, run 'npm run dev' to start the Next.js dev server"
echo "4. Open http://localhost:3000 in your browser"
echo ""
