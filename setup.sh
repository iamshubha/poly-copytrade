#!/bin/bash

# Setup script for local development
# Usage: ./setup.sh

set -e

echo "🚀 Setting up Polymarket Copy Trading Platform..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before proceeding"
    echo "   Required: Database URLs, NEXTAUTH_SECRET, etc."
    read -p "Press enter when .env is configured..."
fi

# Generate secrets if needed
echo "🔐 Checking secrets..."
if grep -q "your-secret-key-here" .env; then
    echo "⚠️  Generating secure secrets..."
    NEW_SECRET=$(openssl rand -base64 32)
    NEW_KEY=$(openssl rand -hex 32)
    echo ""
    echo "Add these to your .env file:"
    echo "NEXTAUTH_SECRET=\"$NEW_SECRET\""
    echo "ENCRYPTION_KEY=\"$NEW_KEY\""
    echo ""
fi

# Check database connection
echo "🗄️  Checking database connection..."
if [ -z "$POSTGRES_URL" ]; then
    echo "⚠️  POSTGRES_URL not set in environment"
    echo "   You can create a free Postgres database at vercel.com/storage"
else
    echo "✅ Database URL configured"
fi

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# Seed database
read -p "Would you like to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npm run db:seed
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "📖 For more information, see README.md"
