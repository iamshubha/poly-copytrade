# Polymarket Copy Trading Platform

A production-ready copy trading platform for Polymarket built with Next.js, TypeScript, and Vercel Postgres.

## 🚀 Features

- **Wallet-Based Authentication**: Sign in with Ethereum wallet using SIWE (Sign-In with Ethereum)
- **Real-Time Copy Trading**: Automatically copy trades from elite Polymarket traders
- **Risk Management**: Comprehensive risk controls including position limits, daily loss limits, and trade size caps
- **Market Integration**: Full integration with Polymarket API for live market data and order execution
- **Multi-Trader Following**: Follow and copy multiple traders with individual settings for each
- **Real-Time Notifications**: Get instant updates on trade execution, followers, and system alerts
- **Responsive Dashboard**: Beautiful, mobile-friendly interface for managing trades and settings
- **Secure & Scalable**: Built with security best practices and designed to scale

## 📋 Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- PostgreSQL database (Vercel Postgres recommended)
- Redis (for queue management)
- MetaMask or compatible Web3 wallet

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd copytrade
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your values:
   - Database URLs (from Vercel Postgres)
   - NextAuth secret (generate with `openssl rand -base64 32`)
   - API keys and configuration

4. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
copytrade/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Landing page
│   ├── components/         # React components
│   ├── lib/                # Core libraries
│   │   ├── backend-api-integration.ts  # 🆕 Unified API module
│   │   ├── auth.ts         # Authentication logic
│   │   ├── copyEngine.ts   # Copy trading engine
│   │   ├── polymarket.ts   # Polymarket API client
│   │   ├── prisma.ts       # Database client
│   │   ├── crypto.ts       # Encryption utilities
│   │   └── polymarket/     # Polymarket integration
│   │       ├── index.ts            # Main exports
│   │       ├── types.ts            # Type definitions
│   │       ├── rest-client.ts      # REST API client
│   │       ├── ws-client.ts        # WebSocket client
│   │       └── leader-detector.ts  # Leader wallet detection
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
├── prisma/
│   └── schema.prisma       # Database schema
├── scripts/
│   ├── migrate.ts          # Database migration script
│   ├── seed.ts             # Database seeding script
│   └── deploy.sh           # Deployment script
├── e2e/                    # End-to-end tests
├── __tests__/              # Unit tests
└── public/                 # Static assets
```

## 🗄️ Database Schema

The application uses Prisma ORM with PostgreSQL. Key models:

- **User**: Wallet addresses and user data
- **UserSettings**: Risk management and copy settings
- **Trade**: Original trades from followed traders
- **CopiedTrade**: Trades copied by followers
- **Follow**: Follower relationships
- **Market**: Polymarket market data
- **Notification**: User notifications

## 🔐 Authentication

The platform uses wallet-based authentication with SIWE (Sign-In with Ethereum):

1. User connects their MetaMask wallet
2. Backend generates a nonce
3. User signs a message with their private key
4. Backend verifies the signature
5. JWT session is created

No passwords or personal information required!

## 🆕 Backend API Integration Module

The platform includes a comprehensive, production-ready backend API integration module that provides:

- **🔹 Trade Subscriptions** - Real-time WebSocket or REST polling
- **🔹 Market Stats** - Comprehensive market statistics with caching
- **🔹 Leader Detection** - Automatic detection of high-performing wallets

### Quick Start

```typescript
import { getBackendAPI } from '@/lib/backend-api-integration';

// Initialize with WebSocket
const api = getBackendAPI({
  useWebSocket: true,
  leaderDetection: {
    enabled: true,
    minVolume: 100000,
    minWinRate: 0.60,
  },
});

await api.initialize();

// Subscribe to market trades
await api.subscribeToMarketTrades('market-id');

// Listen for trades
api.on('trade', (trade) => {
  console.log('New trade:', trade.side, trade.price);
});

// Detect leader wallets
const leaders = await api.detectLeaderWallets();

// Monitor leader trades
api.on('leader:trade', (leader, trade) => {
  console.log('Leader trade detected!');
  // Implement copy logic
});
```

### Documentation

- **[Complete API Documentation](./docs/BACKEND_API_INTEGRATION.md)** - Full API reference
- **[Quick Reference Guide](./docs/API_QUICK_REFERENCE.md)** - Cheat sheet
- **[Usage Examples](./examples/backend-api-usage.ts)** - 10+ working examples
- **[Module README](./docs/BACKEND_API_MODULE_README.md)** - Overview & architecture

### Features

- ✅ WebSocket & REST modes
- ✅ Event-driven architecture
- ✅ Automatic caching
- ✅ Error handling & reconnection
- ✅ Full TypeScript support
- ✅ Production-ready

## 🤖 Copy Trading Engine

The copy trading engine uses BullMQ for reliable trade processing:

1. **Trade Detection**: Monitor followed traders for new trades
2. **Validation**: Check risk limits and trade parameters
3. **Queue**: Add copy trades to processing queue
4. **Execution**: Execute trade on Polymarket
5. **Notification**: Notify user of execution status

Key features:
- Configurable copy delay
- Percentage-based position sizing
- Market filters (include/exclude specific markets)
- Risk limits (max trade size, daily loss, open positions)

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Link project**
   ```bash
   vercel link
   ```

3. **Set environment variables**
   ```bash
   vercel env add POSTGRES_URL
   vercel env add POSTGRES_PRISMA_URL
   vercel env add NEXTAUTH_SECRET
   # ... add all required env vars
   ```

4. **Deploy**
   ```bash
   # Preview deployment
   vercel

   # Production deployment
   vercel --prod
   ```

### Using the deployment script

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

## 📊 API Routes

### Authentication
- `POST /api/auth/nonce` - Get nonce for wallet signing
- `POST /api/auth/[...nextauth]` - NextAuth authentication

### User
- `GET /api/user` - Get current user
- `PATCH /api/user` - Update user
- `GET /api/user/settings` - Get user settings
- `PATCH /api/user/settings` - Update settings

### Trades
- `GET /api/trades` - Get user's trades
- `POST /api/trades` - Create new trade
- `GET /api/trades/:id` - Get trade details
- `GET /api/trades/copied` - Get copied trades

### Markets
- `GET /api/markets` - Get active markets
- `GET /api/markets/:id` - Get market details

### Following
- `GET /api/follow` - Get following/followers
- `POST /api/follow` - Follow a trader
- `DELETE /api/follow/:id` - Unfollow
- `PATCH /api/follow/:id` - Update copy settings

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications` - Mark as read

## 🔧 Configuration

### Risk Management Defaults
- Max copy percentage: 10%
- Min trade amount: $1 USDC
- Max open positions: 50
- Slippage tolerance: 0.5%

### Queue Configuration
- Concurrency: 10 workers
- Redis connection required
- Automatic retry on failure

## 🛡️ Security Features

- Wallet-based authentication (no passwords)
- JWT session management
- API rate limiting
- Input validation with Zod
- SQL injection prevention (Prisma)
- XSS protection
- CORS configuration
- Encrypted sensitive data

## 📈 Performance

- Server-side rendering with Next.js
- Static page generation where possible
- Optimistic UI updates
- Real-time data with WebSockets
- Efficient database queries with Prisma
- Redis caching for hot data

## 🐛 Debugging

Enable debug logging:

```bash
# Set in .env
NODE_ENV=development
DEBUG=true
```

View Prisma queries:
```typescript
// In prisma.ts
log: ['query', 'error', 'warn']
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: [View docs]
- Email: support@example.com

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Machine learning trade prediction
- [ ] Multi-chain support
- [ ] Social features (leaderboards, chat)
- [ ] Advanced order types (stop-loss, take-profit)
- [ ] Portfolio management tools
- [ ] API for third-party integrations

## ⚠️ Disclaimer

This software is for educational purposes. Trading involves risk. Always do your own research and never invest more than you can afford to lose.

---

Built with ❤️ using Next.js, TypeScript, and Vercel
