# Testing Guide

Comprehensive testing documentation for the Polymarket Copy Trading platform.

## Test Structure

```
src/
├── __tests__/                    # Integration tests
│   ├── api-integration.test.ts   # API route tests
│   └── ...
├── lib/
│   └── __tests__/                # Unit tests
│       ├── copyEngine.test.ts    # Copy engine logic
│       ├── tradeMonitor.test.ts  # Trade monitoring
│       └── ...
e2e/
├── main.spec.ts                  # Basic E2E tests
├── critical-flows.spec.ts        # Critical user journeys
└── ...
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
bun test

# Run specific test file
bun test src/lib/__tests__/copyEngine.test.ts

# Watch mode for development
bun test --watch

# With coverage report
bun test --coverage
```

### Integration Tests

```bash
# Run API integration tests
bun test src/__tests__/api-integration.test.ts

# Run with test database
DATABASE_URL="postgresql://..." bun test
```

### E2E Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run specific test file
npx playwright test e2e/critical-flows.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
```

## Test Categories

### 1. Unit Tests

Test individual functions and components in isolation.

**Coverage:**
- ✅ Copy Engine logic
- ✅ Trade Monitor functionality
- ✅ Risk management calculations
- ✅ Price calculations
- ✅ Trade validation
- ✅ Market filtering
- ✅ Share/amount conversions

**Example:**
```typescript
import { describe, expect, test } from 'bun:test';

describe('CopyEngine', () => {
  test('should calculate proportional copy amount', () => {
    const originalAmount = 100;
    const copyPercentage = 50;
    const expectedAmount = originalAmount * (copyPercentage / 100);

    expect(expectedAmount).toBe(50);
  });
});
```

### 2. Integration Tests

Test API routes and database interactions.

**Coverage:**
- ✅ Health check endpoint
- ✅ Authentication flow
- ✅ Markets API
- ✅ Traders API
- ✅ Rate limiting
- ✅ Error handling
- ✅ Data validation

**Example:**
```typescript
test('GET /api/markets should return markets list', async () => {
  const response = await fetch('http://localhost:3000/api/markets?limit=10');
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(Array.isArray(data.data)).toBe(true);
});
```

### 3. E2E Tests

Test complete user workflows end-to-end.

**Coverage:**
- ✅ Public browsing (no auth)
- ✅ Authentication flow
- ✅ Trader discovery
- ✅ Market exploration
- ✅ Search and filters
- ✅ Responsive design
- ✅ Error handling

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('should browse traders without authentication', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/traders');
  
  await expect(page.locator('h1:has-text("Discover Traders")')).toBeVisible();
});
```

## Test Fixtures & Mocks

### Mock Data

```typescript
// Mock trader data
const mockTrader = {
  id: 'trader-1',
  address: '0x1234567890123456789012345678901234567890',
  stats: {
    totalTrades: 100,
    winRate: 65,
    totalVolume: 50000,
    roi: 15.5,
  },
};

// Mock market data
const mockMarket = {
  id: 'market-1',
  title: 'Will Bitcoin reach $100k by 2025?',
  outcomesPrices: [0.65, 0.35],
  volume: 1000000,
  liquidity: 500000,
};
```

### Test Database

Use a separate test database:

```bash
# Set test database URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/copytrade_test"

# Run migrations
npx prisma migrate deploy

# Seed test data
bun run db:seed
```

### Mock External APIs

```typescript
// Mock Polymarket API
global.fetch = jest.fn((url) => {
  if (url.includes('/markets')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ data: [mockMarket] }),
    });
  }
});
```

## Testing Best Practices

### 1. Test Naming

Use descriptive test names:

```typescript
// ✅ Good
test('should calculate proportional copy amount correctly', () => {});
test('should reject trades exceeding daily loss limit', () => {});

// ❌ Bad
test('test 1', () => {});
test('copy trade', () => {});
```

### 2. Arrange-Act-Assert Pattern

```typescript
test('should validate trade amount', () => {
  // Arrange
  const trade = { amount: 100, price: 0.65 };
  
  // Act
  const isValid = validateTrade(trade);
  
  // Assert
  expect(isValid).toBe(true);
});
```

### 3. Test Independence

Each test should be independent:

```typescript
// ✅ Good - creates own data
test('should create trade', async () => {
  const user = await createTestUser();
  const trade = await createTrade(user.id);
  expect(trade).toBeDefined();
});

// ❌ Bad - depends on previous test
let globalUser;
test('setup user', async () => {
  globalUser = await createTestUser();
});
test('create trade', async () => {
  const trade = await createTrade(globalUser.id);
});
```

### 4. Cleanup After Tests

```typescript
import { afterEach } from 'bun:test';

afterEach(async () => {
  // Clean up test data
  await prisma.trade.deleteMany({ where: { userId: 'test-user' } });
});
```

## Coverage Goals

Target minimum test coverage:

- **Unit Tests**: 80%
- **Integration Tests**: 70%
- **E2E Tests**: Critical paths only

Check coverage:

```bash
bun test --coverage
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run unit tests
        run: bun test
      
      - name: Run E2E tests
        run: bun run test:e2e
```

## Debugging Tests

### Debug Unit Tests

```bash
# Run with verbose output
bun test --verbose

# Run single test
bun test --test-name-pattern="should calculate"
```

### Debug E2E Tests

```bash
# Debug mode with Playwright Inspector
npx playwright test --debug

# Screenshot on failure (automatically enabled)
npx playwright test --screenshot=on

# Video recording
npx playwright test --video=on
```

### Debug Integration Tests

```bash
# Add console logs
console.log('Response:', await response.json());

# Use debugger
debugger;
```

## Performance Testing

### Load Testing

Use k6 or Artillery:

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('http://localhost:3000/api/markets');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

Run:

```bash
k6 run load-test.js
```

## Test Data Management

### Seed Test Data

```typescript
// scripts/seed-test-data.ts
import { prisma } from '../src/lib/prisma';

async function seedTestData() {
  await prisma.user.createMany({
    data: [
      { address: '0x1111...', nonce: 'test1' },
      { address: '0x2222...', nonce: 'test2' },
    ],
  });
}
```

### Reset Test Database

```bash
# Drop and recreate
npx prisma migrate reset --force

# Reseed
bun run db:seed
```

## Common Issues & Solutions

### 1. Tests Timing Out

```typescript
// Increase timeout
test('slow operation', async () => {
  // ...
}, { timeout: 30000 }); // 30 seconds
```

### 2. Flaky Tests

```typescript
// Add retries for E2E tests
test.describe.configure({ retries: 2 });

// Use proper waits
await page.waitForSelector('.data-loaded');
```

### 3. Mock Data Issues

```typescript
// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
```

## Test Environments

### Local Development

```bash
# Use local database
DATABASE_URL="postgresql://localhost:5432/copytrade_dev"
bun test
```

### CI/CD

```bash
# Use test database
DATABASE_URL="postgresql://test:test@localhost:5432/copytrade_test"
bun test
```

### Staging

```bash
# Run against staging environment
NEXT_PUBLIC_APP_URL="https://staging.example.com"
bun run test:e2e
```

## Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Need help?** Open an issue or ask in the team chat.
