# Production Deployment Guide

This guide covers deploying the Polymarket Copy Trading platform to production on Vercel.

## Pre-Deployment Checklist

### 1. Environment Variables Setup

Create a `.env.production` file with all required variables:

```bash
# Database (Vercel Postgres)
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_PRISMA_URL=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# Redis (Upstash or similar)
REDIS_URL=redis://...

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here

# Polymarket API
POLYMARKET_API_URL=https://clob.polymarket.com
POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com

# Blockchain (Polygon)
POLYGON_RPC_URL=https://polygon-rpc.com
# Or use Alchemy/Infura for production
# POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Logging
LOG_LEVEL=INFO
NODE_ENV=production

# Security
ENCRYPTION_KEY=your-32-byte-encryption-key
SESSION_SECRET=your-session-secret

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Optional: Error Monitoring
# SENTRY_DSN=your-sentry-dsn
```

### 2. Database Migration

Before deploying, ensure your database schema is up to date:

```bash
# Run migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 3. Build Verification

Test the production build locally:

```bash
# Build the application
bun run build

# Test the production build
bun run start

# Run tests
bun test
bun run test:e2e
```

## Vercel Deployment

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

### Vercel Configuration

Create or update `vercel.json`:

```json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "POSTGRES_URL": "@postgres_url",
      "REDIS_URL": "@redis_url",
      "NEXTAUTH_SECRET": "@nextauth_secret"
    }
  }
}
```

## Post-Deployment Tasks

### 1. Verify Deployment

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Expected response: {"status":"ok"}
```

### 2. Database Seeding (Optional)

If deploying to a fresh database:

```bash
# SSH into Vercel or run locally with production DB
bun run db:seed
```

### 3. Monitor Initial Traffic

- Check Vercel Analytics dashboard
- Monitor error logs
- Verify API response times

### 4. Enable Features

- Test wallet connection
- Verify Polymarket API integration
- Test copy trading flow
- Check WebSocket connections

## Production Optimizations

### 1. Caching Strategy

- Enable Next.js ISR for static pages
- Cache Polymarket API responses (5 minutes)
- Use Redis for session storage

### 2. Performance Monitoring

Add monitoring service:

```bash
# Install Sentry (optional)
bun add @sentry/nextjs

# Configure in next.config.js
```

### 3. Database Optimization

```sql
-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON "Trade"(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON "Trade"(status);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON "Follow"(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON "Follow"(following_id);
```

### 4. Rate Limiting

Enable Redis-based rate limiting:

```typescript
// Update lib/rateLimit.ts to use Redis in production
const redis = new Redis(process.env.REDIS_URL);
const rateLimiter = new RedisRateLimiter(redis);
```

## Security Hardening

### 1. Environment Variables

- Never commit `.env` files
- Use Vercel secret storage
- Rotate secrets regularly

### 2. CORS Configuration

Update `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ];
}
```

### 3. Content Security Policy

Add CSP headers:

```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
}
```

## Monitoring & Alerting

### 1. Set Up Alerts

Configure alerts for:
- API error rates > 1%
- Response times > 2s
- Database connection failures
- Redis connection failures

### 2. Log Aggregation

```bash
# Stream Vercel logs
vercel logs --follow

# Or use external service (e.g., Datadog, LogDNA)
```

### 3. Uptime Monitoring

Use services like:
- Vercel Analytics
- UptimeRobot
- Pingdom

## Scaling Considerations

### Horizontal Scaling

Vercel automatically scales based on traffic, but ensure:

1. **Database can handle connections**
   - Use connection pooling (Vercel Postgres has this built-in)
   - Monitor active connections

2. **Redis can handle load**
   - Use Upstash or Redis Cloud with auto-scaling
   - Monitor memory usage

3. **BullMQ workers scale**
   - Consider separate worker deployment
   - Or use Vercel Edge Functions for queue processing

### Vertical Scaling

If needed, upgrade:
- Vercel plan (Pro or Enterprise)
- Database instance size
- Redis memory allocation

## Rollback Procedure

If deployment fails:

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy previous commit
git checkout previous-commit
vercel --prod
```

## Cost Optimization

1. **Vercel**
   - Use Pro plan for production features
   - Monitor bandwidth usage
   - Enable edge caching

2. **Database**
   - Regular vacuuming and optimization
   - Archive old trades

3. **Redis**
   - Set appropriate TTLs
   - Monitor memory usage

## Maintenance Schedule

- **Daily**: Monitor error logs and performance
- **Weekly**: Review database performance
- **Monthly**: Update dependencies
- **Quarterly**: Security audit and penetration testing

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check connection pooling
   # Increase connection limit in Vercel Postgres settings
   ```

2. **WebSocket Connection Failures**
   ```bash
   # Verify Polymarket WebSocket URL
   # Check CORS settings
   ```

3. **Rate Limiting False Positives**
   ```bash
   # Adjust rate limits in lib/rateLimit.ts
   # Use Redis for distributed rate limiting
   ```

## Support & Resources

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Polymarket API Docs: https://docs.polymarket.com

## Emergency Contacts

Maintain a list of:
- DevOps team contacts
- Database administrator
- Security team
- On-call rotation

---

**Last Updated**: December 31, 2025
