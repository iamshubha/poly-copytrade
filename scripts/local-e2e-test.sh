#!/bin/bash

# Complete End-to-End Local Testing Script
# Usage: ./scripts/local-e2e-test.sh

set -e

echo "🚀 Starting End-to-End Local Testing"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Bun is installed
echo "1️⃣ Checking prerequisites..."
if ! command -v bun &> /dev/null; then
    print_error "Bun is not installed. Install it with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
print_success "Bun is installed ($(bun --version))"

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi
print_success "Docker is running"
echo ""

# Clean up any existing containers
echo "2️⃣ Cleaning up existing containers..."
bun run docker:down &> /dev/null || true
print_success "Cleaned up existing containers"
echo ""

# Start Docker services
echo "3️⃣ Starting Docker services..."
bun run docker:up
sleep 5
print_success "Docker services started"
echo ""

# Check if containers are healthy
echo "4️⃣ Checking container health..."
if docker ps | grep -q "copytrade-postgres"; then
    print_success "PostgreSQL container is running"
else
    print_error "PostgreSQL container failed to start"
    exit 1
fi

if docker ps | grep -q "copytrade-redis"; then
    print_success "Redis container is running"
else
    print_error "Redis container failed to start"
    exit 1
fi
echo ""

# Test database connection
echo "5️⃣ Testing database connection..."
if bun run scripts/test-db-connection.ts; then
    print_success "Database connection successful"
else
    print_error "Database connection failed"
    exit 1
fi
echo ""

# Install dependencies
echo "6️⃣ Installing dependencies..."
if bun install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi
echo ""

# Run database migrations
echo "7️⃣ Running database migrations..."
if bun run db:migrate; then
    print_success "Database migrations completed"
else
    print_error "Database migrations failed"
    exit 1
fi
echo ""

# Seed database
echo "8️⃣ Seeding database..."
if bun run db:seed; then
    print_success "Database seeded"
else
    print_error "Database seeding failed"
    exit 1
fi
echo ""

# Type checking
echo "9️⃣ Running type check..."
if bun run type-check; then
    print_success "Type check passed"
else
    print_error "Type check failed"
    exit 1
fi
echo ""

# Linting
echo "🔟 Running linter..."
if bun run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi
echo ""

# Run unit tests
echo "1️⃣1️⃣ Running unit tests..."
if bun test; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi
echo ""

# Build application
echo "1️⃣2️⃣ Building application..."
if bun run build; then
    print_success "Build successful"
else
    print_error "Build failed"
    exit 1
fi
echo ""

# Start dev server in background for E2E tests
echo "1️⃣3️⃣ Starting development server for E2E tests..."
bun run dev > /tmp/copytrade-dev.log 2>&1 &
DEV_PID=$!
print_info "Dev server started (PID: $DEV_PID)"

# Wait for server to be ready
print_info "Waiting for server to be ready..."
sleep 10

# Check if server is responding
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Server is responding"
else
    print_error "Server is not responding"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi
echo ""

# Run E2E tests
echo "1️⃣4️⃣ Running E2E tests..."
if bun run test:e2e; then
    print_success "E2E tests passed"
else
    print_error "E2E tests failed"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi
echo ""

# Stop dev server
print_info "Stopping development server..."
kill $DEV_PID 2>/dev/null || true
print_success "Dev server stopped"
echo ""

# Summary
echo "=================================="
echo "✅ END-TO-END TESTING COMPLETE"
echo "=================================="
echo ""
print_success "All tests passed successfully!"
echo ""
echo "📊 Test Summary:"
echo "   ✅ Docker services"
echo "   ✅ Database connection"
echo "   ✅ Dependencies"
echo "   ✅ Database migrations"
echo "   ✅ Database seeding"
echo "   ✅ Type checking"
echo "   ✅ Linting"
echo "   ✅ Unit tests"
echo "   ✅ Application build"
echo "   ✅ E2E tests"
echo ""
echo "🚀 Ready for development!"
echo ""
echo "Next steps:"
echo "  • Run 'bun run dev' to start development server"
echo "  • Open http://localhost:3000 in your browser"
echo "  • Run 'bun run db:studio' to view database"
echo ""
