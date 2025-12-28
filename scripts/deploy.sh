#!/bin/bash

# Deployment script for Vercel
# Usage: ./scripts/deploy.sh [production|preview]

set -e

ENVIRONMENT=${1:-preview}

echo "🚀 Starting deployment to $ENVIRONMENT..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type check
echo "🔍 Running type check..."
npm run type-check

# Run linter
echo "🧹 Running linter..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Build application
echo "🔨 Building application..."
npm run build

# Deploy to Vercel
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🌐 Deploying to production..."
    vercel --prod
else
    echo "🌐 Deploying preview..."
    vercel
fi

echo "✅ Deployment complete!"
