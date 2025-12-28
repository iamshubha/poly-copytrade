# 🧪 Local Testing Guide with Bun + Docker

Complete guide for testing the Polymarket Copy Trading Platform locally using Bun runtime with Docker for databases.

## 🚀 Quick Start (5 Minutes)

### Prerequisites

1. **Install Bun** (Runtime)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   # Or on macOS
   brew install oven-sh/bun/bun
   
   # Verify installation
   bun --version
   ```

2. **Install Docker Desktop** (Databases)
   - Download from: https://www.docker.com/products/docker-desktop
   - Or use CLI:
   ```bash
   # macOS
   brew install --cask docker
   ```

### One-Command Setup

```bash
# Complete local setup (starts Docker, migrates DB, seeds data)
bun run local:setup
```

That's it! Your local environment is ready.

---

## 📦 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd /Users/shubhabanerjee/ai/trade/dex/copytrade

# Install with Bun (much faster than npm)
bun install
```

### Step 2: Start Docker Services

```bash
# Start PostgreSQL and Redis in Docker
bun run docker:up

# Check if containers are running
docker ps
```

You should see:
- `copytrade-postgres` on port 5432
- `copytrade-redis` on port 6379

### Step 3: Configure Environment

```bash
# Copy local environment file
cp .env.local .env

# The .env.local file is pre-configured for Docker services
```

### Step 4: Initialize Database

```bash
# Run migrations (creates tables)
bun run db:migrate

# Seed with sample data
bun run db:seed
```

### Step 5: Start Development Server

```bash
# Start Next.js with Bun
bun run dev

# Or use the combined command
bun run local:dev
```

Open **http://localhost:3000** 🎉

---

## 🧪 Running Tests

### Unit Tests

```bash
# Run all unit tests
bun test

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

### End-to-End Tests

```bash
# Run E2E tests (Playwright)
bun run test:e2e

# Run in UI mode
bun run test:e2e --ui

# Run specific test file
bun run test:e2e e2e/main.spec.ts
```

### Complete Test Suite

```bash
# Run all tests (unit + E2E)
bun run local:test
```

---

## 🐳 Docker Commands

### Basic Operations

```bash
# Start containers
bun run docker:up
# or
docker-compose up -d

# Stop containers
bun run docker:down
# or
docker-compose down

# View logs
bun run docker:logs
# or
docker-compose logs -f

# Clean everything (removes volumes)
bun run docker:clean
```

### Database Operations

```bash
# Connect to PostgreSQL
docker exec -it copytrade-postgres psql -U postgres -d copytrade

# Connect to Redis
docker exec -it copytrade-redis redis-cli

# Backup database
docker exec copytrade-postgres pg_dump -U postgres copytrade > backup.sql

# Restore database
docker exec -i copytrade-postgres psql -U postgres copytrade < backup.sql
```

### Troubleshooting Docker

```bash
# Check container health
docker ps

# View container logs
docker logs copytrade-postgres
docker logs copytrade-redis

# Restart containers
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# Remove all and start fresh
bun run docker:clean
bun run docker:up
```

---

## 🔍 End-to-End Testing Workflow

### 1. Complete Setup Test

```bash
# Clean slate
bun run docker:clean

# Full setup
bun run local:setup

# Verify services
docker ps
```

### 2. Test Authentication Flow

```bash
# Start dev server
bun run local:dev

# In browser:
# 1. Go to http://localhost:3000
# 2. Click "Launch App"
# 3. Click "Connect Wallet"
# 4. Connect MetaMask
# 5. Sign message
# 6. Should redirect to dashboard
```

### 3. Test Database Operations

```bash
# Open Prisma Studio
bun run db:studio

# View data in browser at http://localhost:5555
# - Check Users table
# - Check Trades table
# - Check Markets table
```

### 4. Test Copy Trading Engine

```bash
# In dev server terminal, watch logs
bun run dev

# In another terminal, test trade creation
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "market-1",
    "outcomeIndex": 0,
    "side": "BUY",
    "amount": 10
  }'
```

### 5. Test Queue System (Redis)

```bash
# Connect to Redis
docker exec -it copytrade-redis redis-cli

# Check queue
KEYS *
LLEN bull:copy-trades:*

# Monitor real-time
MONITOR
```

### 6. Run Automated Tests

```bash
# Unit tests
bun test

# E2E tests
bun run test:e2e

# All tests
bun run local:test
```

---

## 📊 Verification Checklist

### ✅ Infrastructure

- [ ] Docker Desktop running
- [ ] PostgreSQL container healthy
- [ ] Redis container healthy
- [ ] Containers accessible on correct ports

### ✅ Database

- [ ] Prisma migrations applied
- [ ] Sample data seeded
- [ ] Can connect via Prisma Studio
- [ ] Can query via psql

### ✅ Application

- [ ] Bun runtime working
- [ ] Next.js dev server starts
- [ ] Pages load at http://localhost:3000
- [ ] No console errors
- [ ] Hot reload working

### ✅ Authentication

- [ ] Sign-in page loads
- [ ] MetaMask connects
- [ ] Message signing works
- [ ] Session persists
- [ ] Can access dashboard

### ✅ API

- [ ] All API routes respond
- [ ] Database queries work
- [ ] Error handling works
- [ ] Validation working

### ✅ Copy Trading

- [ ] Can create trades
- [ ] Queue processes jobs
- [ ] Redis connection stable
- [ ] Trades saved to database
- [ ] Notifications created

### ✅ Tests

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] No test failures
- [ ] Coverage acceptable

---

## 🐛 Common Issues & Solutions

### Issue: Docker containers won't start

```bash
# Check if ports are in use
lsof -i :5432
lsof -i :6379

# Kill processes using the ports
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Issue: Database connection error

```bash
# Check if PostgreSQL is ready
docker exec copytrade-postgres pg_isready -U postgres

# Check connection from app
bun run scripts/test-db-connection.ts
```

### Issue: Bun command not found

```bash
# Reinstall Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH
export PATH="$HOME/.bun/bin:$PATH"

# Restart terminal
```

### Issue: Prisma client not generated

```bash
# Generate Prisma client
bunx prisma generate

# Or reinstall
bun install
```

### Issue: Port 3000 already in use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 bun run dev
```

---

## 🎯 Testing Scenarios

### Scenario 1: New User Registration

1. Clear database: `bun run docker:clean && bun run local:setup`
2. Open app in incognito mode
3. Connect wallet
4. Sign message
5. Verify user created in database
6. Check default settings applied

### Scenario 2: Follow Trader & Copy Trade

1. Seed database with 2 users
2. User 1 follows User 2
3. User 2 creates a trade
4. Verify copy trade queued
5. Check Redis queue
6. Verify copied trade executed
7. Check notifications sent

### Scenario 3: Risk Limits

1. Set max trade amount to $10
2. Attempt $20 trade
3. Verify trade rejected
4. Check error message
5. Update limits
6. Retry trade

### Scenario 4: Market Data Sync

1. Fetch markets from API
2. Verify saved to database
3. Check price updates
4. Test market filtering

---

## 📈 Performance Testing

### Load Test with Bun

```bash
# Install benchmark tool
bun add -d autocannon

# Test API endpoint
bunx autocannon -c 100 -d 10 http://localhost:3000/api/markets
```

### Database Performance

```bash
# Check slow queries
docker exec copytrade-postgres psql -U postgres -d copytrade \
  -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Queue Processing Speed

```bash
# Monitor queue in real-time
docker exec -it copytrade-redis redis-cli MONITOR
```

---

## 🔧 Development Tips

### Hot Reload with Bun

Bun's hot reload is faster than Node.js:
```bash
bun run dev  # Faster startup and HMR
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* bun run dev

# Or specific modules
DEBUG=prisma:* bun run dev
```

### Database Inspection

```bash
# Open Prisma Studio
bun run db:studio

# Or use psql
docker exec -it copytrade-postgres psql -U postgres -d copytrade
```

### Reset Everything

```bash
# Nuclear option - clean slate
bun run docker:clean
rm -rf node_modules .next
bun install
bun run local:setup
bun run dev
```

---

## 📝 Test Results Log

Document your test results:

```markdown
## Test Run: [Date]

### Environment
- Bun version: 
- Docker version: 
- OS: 

### Results
- [ ] Setup completed
- [ ] All containers running
- [ ] Database migrated
- [ ] Seed data loaded
- [ ] Dev server started
- [ ] Unit tests: X/X passed
- [ ] E2E tests: X/X passed
- [ ] Manual testing: Pass/Fail

### Issues Found
1. 
2. 

### Notes
- 
```

---

## 🎓 Next Steps

After local testing succeeds:

1. **Code Quality**
   ```bash
   bun run lint
   bun run type-check
   ```

2. **Build Test**
   ```bash
   bun run build
   bun run start
   ```

3. **Production Prep**
   - Review LAUNCH_CHECKLIST.md
   - Update environment variables
   - Configure production database

4. **Deploy**
   - Follow DEPLOYMENT.md
   - Deploy to Vercel
   - Monitor logs

---

## 📞 Support

Having issues?

1. Check this guide's troubleshooting section
2. Review Docker logs: `bun run docker:logs`
3. Check application logs in terminal
4. Review [GETTING_STARTED.md](GETTING_STARTED.md)

---

## ⚡ Quick Reference

```bash
# Complete workflow
bun run docker:up         # Start databases
bun run db:migrate        # Setup schema
bun run db:seed          # Add test data
bun run dev              # Start app

# Testing
bun test                 # Unit tests
bun run test:e2e         # E2E tests
bun run local:test       # All tests

# Database
bun run db:studio        # Visual editor
docker exec -it copytrade-postgres psql -U postgres -d copytrade

# Cleanup
bun run docker:down      # Stop containers
bun run docker:clean     # Remove everything
```

---

**Happy Testing! 🚀**

*Last Updated: December 28, 2025*
