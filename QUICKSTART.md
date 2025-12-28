# Quick Start Guide

## Setup in 5 Minutes

### 1. Prerequisites
- Node.js 18+ installed
- MetaMask wallet
- Vercel account (for database)

### 2. Get Vercel Postgres Database

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Create new Postgres database
vercel postgres create
```

Copy the connection strings to your `.env` file.

### 3. Clone and Setup

```bash
# Clone repository
git clone <repo-url>
cd copytrade

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URLs and secrets

# Initialize database
npm run db:migrate
npm run db:seed
```

### 4. Start Development

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy to Production

```bash
# Link to Vercel
vercel link

# Deploy
vercel --prod
```

## Basic Usage

### Connect Wallet
1. Click "Connect Wallet" 
2. Approve MetaMask connection
3. Sign the message

### Follow a Trader
1. Go to "Following" page
2. Enter trader wallet address
3. Configure copy settings
4. Enable auto-copy

### Configure Risk Settings
1. Go to Settings
2. Set max trade size
3. Set position limits
4. Configure notifications

### Monitor Trades
1. View dashboard for overview
2. Check "Trades" for history
3. Get real-time notifications

## Common Issues

### Database Connection Failed
- Check `.env` file has correct URLs
- Ensure database exists
- Run `npm run db:migrate`

### MetaMask Not Detected
- Install MetaMask extension
- Refresh the page
- Check browser console for errors

### Trades Not Copying
- Verify auto-copy is enabled
- Check risk limits aren't exceeded
- Ensure sufficient balance
- Check notification for errors

## Next Steps

- Read full [README.md](README.md)
- Review [API Documentation](docs/API.md)
- Check [Security Policy](SECURITY.md)
- Join community Discord

## Getting Help

- GitHub Issues: Report bugs
- Discord: Community support
- Email: support@example.com
- Documentation: /docs

---

Happy trading! 🚀
