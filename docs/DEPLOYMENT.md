# Production Deployment Guide

Complete guide for deploying the Polymarket Copy Trading Platform to production.

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set:

```bash
# Database (Vercel Postgres)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# Redis (Upstash or similar)
REDIS_URL=

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=  # Generate: openssl rand -base64 32

# Polymarket
POLYMARKET_API_URL=https://clob.polymarket.com
POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com
POLYMARKET_API_KEY=  # Optional

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
ALCHEMY_API_KEY=  # Optional

# Security
ENCRYPTION_KEY=  # Generate: openssl rand -hex 32
JWT_SECRET=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# App Config
NODE_ENV=production
```

### 2. Database Setup

```bash
# Run migrations
npm run db:migrate

# Optionally seed with sample data
npm run db:seed
```

### 3. Build Test

```bash
# Test local build
npm run build
npm run start

# Run all tests
npm run test
npm run test:e2e
```

## Vercel Deployment (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### Step 2: Link Project

```bash
vercel link
```

### Step 3: Set Environment Variables

```bash
# Set all environment variables
vercel env add POSTGRES_URL
vercel env add POSTGRES_PRISMA_URL
vercel env add NEXTAUTH_SECRET
# ... add all required vars

# Or use .env file
vercel env pull .env.production
```

### Step 4: Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Step 5: Configure Domain

1. Go to Vercel dashboard
2. Navigate to Settings > Domains
3. Add your custom domain
4. Update DNS records as instructed

### Step 6: Set Up Vercel Postgres

```bash
# Create database
vercel postgres create

# Link to project
vercel postgres link

# Get connection strings
vercel env pull
```

### Step 7: Configure Redis

1. Go to Upstash.com
2. Create Redis database
3. Copy connection URL
4. Add to Vercel environment variables

```bash
vercel env add REDIS_URL
```

## Alternative Deployments

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t copytrade .
docker run -p 3000:3000 --env-file .env copytrade
```

### AWS Deployment

1. **Set up RDS PostgreSQL**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier copytrade-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username admin \
     --master-user-password yourpassword \
     --allocated-storage 20
   ```

2. **Set up ElastiCache Redis**
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id copytrade-cache \
     --cache-node-type cache.t3.micro \
     --engine redis \
     --num-cache-nodes 1
   ```

3. **Deploy to Elastic Beanstalk**
   ```bash
   eb init -p node.js copytrade
   eb create copytrade-prod
   eb deploy
   ```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Test authentication
curl https://your-domain.com/api/auth/nonce -X POST \
  -H "Content-Type: application/json" \
  -d '{"address":"0x..."}'
```

### 2. Set Up Monitoring

#### Vercel Analytics
```bash
# Enable in vercel.json
{
  "analytics": {
    "enabled": true
  }
}
```

#### Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Uptime Monitoring
- Set up uptime checks with Uptime Robot or similar
- Monitor: `/`, `/api/health`, `/dashboard`

### 3. Configure Backups

```bash
# Vercel Postgres automatic backups
# Configure in Vercel dashboard

# Manual backup script
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql
```

### 4. Set Up Alerts

Configure alerts for:
- High error rates
- Slow response times
- Database connection issues
- Queue processing delays
- Failed trades

### 5. Performance Optimization

```typescript
// Enable caching in next.config.js
module.exports = {
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=60, stale-while-revalidate=300',
        },
      ],
    },
  ],
};
```

## Security Hardening

### 1. Enable Rate Limiting

```typescript
// middleware.ts
import { ratelimit } from '@/lib/ratelimit';

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

### 2. Configure Security Headers

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

### 3. Enable HTTPS Only

```typescript
// middleware.ts
if (request.headers.get('x-forwarded-proto') !== 'https') {
  return NextResponse.redirect(
    `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
    301
  );
}
```

## Scaling Considerations

### Database Optimization
- Enable connection pooling
- Add read replicas for reporting
- Implement database caching
- Regular VACUUM and ANALYZE

### Queue Processing
- Increase worker concurrency
- Add more Redis instances
- Implement job prioritization
- Monitor queue depth

### API Performance
- Implement response caching
- Use CDN for static assets
- Optimize database queries
- Add database indexes

### Load Balancing
```bash
# Multiple instances on Vercel (automatic)
# Or use AWS ALB
aws elbv2 create-load-balancer \
  --name copytrade-lb \
  --subnets subnet-xxx subnet-yyy
```

## Rollback Procedure

If deployment fails:

```bash
# Vercel
vercel rollback

# Or redeploy previous version
vercel --prod --force
```

## Maintenance Mode

```typescript
// Enable in middleware.ts
if (process.env.MAINTENANCE_MODE === 'true') {
  return new Response('Under Maintenance', { status: 503 });
}
```

## Troubleshooting

### Database Connection Issues
```bash
# Check connection
psql $POSTGRES_URL

# Verify SSL
openssl s_client -connect your-db-host:5432 -starttls postgres
```

### Build Failures
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variable Issues
```bash
# Verify all vars are set
vercel env ls

# Pull latest
vercel env pull
```

## Support

For deployment issues:
- GitHub Issues: [Create issue]
- Email: ops@example.com
- Discord: #deployment channel

---

Last updated: December 2024
