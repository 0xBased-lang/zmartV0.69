# Vercel Deployment Guide - ZMART V0.69

**Purpose:** Deploy production-ready frontend to Vercel with proper configuration.

**Last Updated:** November 11, 2025

---

## 📋 Overview

This guide covers deploying the ZMART frontend to Vercel for production use:
- Vercel project setup
- Environment variables configuration
- Build optimization
- Domain configuration
- Performance monitoring

---

## 🎯 Pre-Deployment Checklist

### Frontend Readiness
- ✅ All components functional (100% complete)
- ✅ Error handling implemented
- ✅ Loading states optimized
- ✅ Mobile responsive
- ✅ E2E tests passing (15/15 core UI tests)

### Backend Readiness
- ✅ VPS services operational (4 PM2 services)
- ✅ API Gateway accessible (http://185.202.236.71:4000)
- ✅ WebSocket server running (ws://185.202.236.71:4001)
- ✅ Database online (Supabase)
- ✅ Solana program deployed (devnet: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS)

### Configuration Files
- ✅ `next.config.js` optimized
- ✅ `package.json` scripts configured
- ✅ `.gitignore` includes `.env.local`
- ✅ Production environment variables documented

---

## 🚀 Step-by-Step Deployment

### Step 1: Install Vercel CLI

```bash
# Install globally
npm install -g vercel

# Or use via npx (no installation)
npx vercel

# Login to Vercel
vercel login
```

###Step 2: Prepare Frontend for Production

**Build Test:**
```bash
cd frontend
pnpm build

# Should complete without errors
# Check build output:
ls -lh .next/
```

**Type Check:**
```bash
pnpm type-check
# Should show 0 errors
```

**Lint Check:**
```bash
pnpm lint
# Fix any warnings/errors before deploying
```

### Step 3: Configure Vercel Project

**Initialize Vercel:**
```bash
cd frontend
vercel

# Answer prompts:
# Set up and deploy "frontend"? Yes
# Which scope? [Your account]
# Link to existing project? No
# What's your project's name? zmart-v069
# In which directory is your code located? ./
# Want to modify settings? Yes
#   Build Command: pnpm build
#   Output Directory: .next
#   Development Command: pnpm dev
```

**Project Settings:**
- Framework Preset: Next.js
- Root Directory: `frontend/`
- Node Version: 18.x or 20.x
- Build Command: `pnpm build`
- Install Command: `pnpm install`
- Output Directory: `.next`

### Step 4: Configure Environment Variables

**In Vercel Dashboard:**
1. Go to project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

**Production Environment Variables:**

```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# Backend API (VPS)
NEXT_PUBLIC_API_URL=http://185.202.236.71:4000
NEXT_PUBLIC_WS_URL=ws://185.202.236.71:4001

# Helius RPC (Primary - faster)
NEXT_PUBLIC_HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=00a6d3a9-d9ac-464b-a5c2-af3257c9a43c

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false

# App Configuration
NEXT_PUBLIC_APP_NAME=ZMART
NEXT_PUBLIC_APP_VERSION=0.69
```

**Note:** Set these for "Production" environment in Vercel dashboard

### Step 5: Deploy to Production

**Preview Deployment (Test First):**
```bash
vercel

# This creates a preview deployment
# Test thoroughly before promoting to production
```

**Production Deployment:**
```bash
vercel --prod

# Or promote preview to production:
vercel promote <deployment-url>
```

**Deployment URL:**
- Preview: `https://zmart-v069-[hash].vercel.app`
- Production: `https://zmart-v069.vercel.app`

### Step 6: Configure Custom Domain (Optional)

**Add Custom Domain:**
1. Go to Vercel Dashboard → Project Settings → Domains
2. Add domain: `app.zmart.io` (or your domain)
3. Configure DNS records as instructed by Vercel

**DNS Configuration:**
```
Type: A
Name: app (or @)
Value: 76.76.21.21 (Vercel's IP)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 7: Verify Deployment

**Check Deployment Status:**
```bash
# In Vercel CLI
vercel ls

# Or visit Vercel Dashboard
https://vercel.com/[your-account]/zmart-v069
```

**Test Production Site:**
1. Open production URL
2. Verify all pages load correctly:
   - `/` - Landing page
   - `/markets` - Market listing
   - `/markets/[id]` - Market details
   - `/markets/create` - Market creation
   - `/portfolio` - User portfolio

3. Test core functionality:
   - ✅ Wallet connection (Phantom/Solflare/Backpack)
   - ✅ Market browsing & filtering
   - ✅ Trade execution (buy/sell)
   - ✅ Real-time price updates
   - ✅ Portfolio tracking
   - ✅ Market creation

4. Check DevTools Console:
   - No JavaScript errors
   - API calls succeeding
   - WebSocket connected

---

## ⚙️ Production Optimizations

### Next.js Configuration

**`next.config.js`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization
  images: {
    domains: ['ipfs.io', 'cloudflare-ipfs.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // Compression
  compress: true,

  // Performance
  poweredByHeader: false,
  generateEtags: true,

  // Redirects (if needed)
  async redirects() {
    return [
      {
        source: '/',
        destination: '/markets',
        permanent: false,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Build Optimizations

**`package.json` Scripts:**
```json
{
  "scripts": {
    "dev": "next dev -p 3004",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "analyze": "ANALYZE=true next build"
  }
}
```

### Bundle Analysis

```bash
# Install bundle analyzer
pnpm add -D @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true pnpm build
```

---

## 📊 Performance Monitoring

### Vercel Analytics

**Enable Analytics:**
1. Go to Vercel Dashboard → Project → Analytics
2. Enable Vercel Analytics (free tier)
3. View real-time performance metrics

**Metrics Tracked:**
- Page load time (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)

### Custom Monitoring

**Add Web Vitals Tracking:**

```typescript
// frontend/lib/vitals.ts
export function sendToAnalytics(metric: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric);
    return;
  }

  // Send to analytics service in production
  // TODO: Integrate with Google Analytics / Vercel Analytics
  const body = JSON.stringify(metric);
  const url = '/api/vitals';

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}

// In _app.tsx
export { sendToAnalytics as reportWebVitals } from '@/lib/vitals';
```

---

## 🔒 Security Configuration

### Environment Variables Security

**Do NOT commit:**
- `.env.local`
- `.env.production.local`
- Any file with actual credentials

**Use Vercel Environment Variables:**
- All secrets stored in Vercel dashboard
- Automatic injection at build time
- Can be different per environment (preview/production)

### CORS Configuration

**Backend API (VPS):**
```javascript
// backend/src/api/index.ts
app.use(cors({
  origin: [
    'http://localhost:3004', // Local development
    'https://zmart-v069.vercel.app', // Production
    'https://zmart-v069-*.vercel.app', // Preview deployments
    'https://app.zmart.io', // Custom domain
  ],
  credentials: true,
}));
```

### Content Security Policy

**Add CSP Headers:**
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-scripts.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.devnet.solana.com https://devnet.helius-rpc.com wss://*.helius-rpc.com http://185.202.236.71:4000 ws://185.202.236.71:4001",
          ].join('; '),
        },
      ],
    },
  ];
},
```

---

## 🐛 Troubleshooting

### Build Failures

**Error: "Module not found"**
```bash
# Clear build cache
rm -rf .next
pnpm install --frozen-lockfile
pnpm build
```

**Error: "Out of memory"**
```bash
# Increase Node memory limit
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

**Error: "TypeScript errors"**
```bash
# Check types locally
pnpm type-check

# Fix errors, then rebuild
pnpm build
```

### Runtime Errors

**API Connection Failures:**
- Check VPS backend is running: `ssh kek && pm2 list`
- Verify environment variables in Vercel dashboard
- Check CORS configuration allows Vercel domain

**Wallet Connection Issues:**
- Verify network is set to devnet
- Check `NEXT_PUBLIC_SOLANA_RPC_URL` is correct
- Test with different wallets (Phantom, Solflare)

**WebSocket Disconnections:**
- Check WebSocket server status on VPS
- Verify `NEXT_PUBLIC_WS_URL` environment variable
- Test WebSocket connection in DevTools

---

## 📈 Post-Deployment Checklist

### Immediate (Day 1)
- ✅ All pages loading correctly
- ✅ No JavaScript console errors
- ✅ Wallet connection working
- ✅ Trading functionality working
- ✅ Real-time updates working
- ✅ Mobile responsive verified

### Short-term (Week 1)
- ✅ Monitor Vercel Analytics for errors
- ✅ Check performance metrics (LCP < 2.5s)
- ✅ Verify backend API handling traffic
- ✅ Test with 10+ real users
- ✅ Set up error monitoring (Sentry)
- ✅ Configure uptime monitoring

### Medium-term (Month 1)
- ✅ Optimize bundle size (<500KB initial)
- ✅ Add service worker for offline support
- ✅ Implement caching strategy
- ✅ Set up A/B testing (if needed)
- ✅ Monitor and optimize database queries
- ✅ Scale backend if needed

---

## 🚀 Continuous Deployment

### Automatic Deployments

**Vercel Git Integration:**
1. Connect GitHub repository to Vercel
2. Automatic deployments on:
   - Push to `main` → Production deployment
   - Pull requests → Preview deployments

**Configuration:**
```yaml
# .github/workflows/vercel-preview.yml (optional)
name: Vercel Preview Deployment
on:
  pull_request:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: vercel pull --yes --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
```

### Rollback Procedure

**Instant Rollback:**
1. Go to Vercel Dashboard → Deployments
2. Find previous stable deployment
3. Click "..." → "Promote to Production"
4. Rollback completes in <1 minute

**Or via CLI:**
```bash
vercel rollback
```

---

## 📊 Monitoring & Alerts

### Uptime Monitoring

**Recommended Tools:**
- **UptimeRobot** (free): https://uptimerobot.com
  - Monitor https://zmart-v069.vercel.app
  - Alert if down > 5 minutes
  - Email/SMS notifications

- **Vercel Analytics** (included):
  - Real-time traffic
  - Geographic distribution
  - Error rates

### Error Tracking

**Sentry Integration:**
```bash
pnpm add @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

**Configuration:**
```javascript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

---

## ✅ Success Criteria

**Deployment Complete When:**
- ✅ Site live on Vercel
- ✅ All environment variables configured
- ✅ Core functionality tested and working
- ✅ No console errors in production
- ✅ Performance metrics green (LCP < 2.5s)
- ✅ Mobile responsive verified
- ✅ Monitoring/alerts configured

**Ready for Public Launch When:**
- ✅ 100+ real user test sessions
- ✅ No critical bugs
- ✅ Performance under load verified
- ✅ Security audit complete
- ✅ Documentation finalized
- ✅ Marketing materials ready

---

## 📝 Production Checklist

```markdown
# ZMART V0.69 - Production Deployment Checklist

## Pre-Deployment
- [ ] Frontend build completes without errors
- [ ] TypeScript type-check passes (0 errors)
- [ ] Lint check passes
- [ ] E2E tests passing (15/15)
- [ ] Backend services operational on VPS
- [ ] Database accessible and migrated
- [ ] Solana program deployed to devnet

## Vercel Configuration
- [ ] Project created in Vercel
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

## Testing
- [ ] All pages load correctly
- [ ] Wallet connection works
- [ ] Trading functionality works
- [ ] Real-time updates work
- [ ] Mobile responsive verified
- [ ] No console errors

## Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry)
- [ ] Uptime monitoring configured
- [ ] Performance metrics green

## Security
- [ ] Environment variables secured
- [ ] CORS configured
- [ ] CSP headers configured
- [ ] SSL/HTTPS enabled
- [ ] Security audit passed

## Documentation
- [ ] README.md updated with production URL
- [ ] Deployment guide finalized
- [ ] API documentation current
- [ ] User guides available

## Launch
- [ ] Soft launch with limited users
- [ ] Monitor for 24-48 hours
- [ ] Fix any critical issues
- [ ] Public announcement
- [ ] Marketing campaign

## Post-Launch
- [ ] Daily monitoring for first week
- [ ] Gather user feedback
- [ ] Performance optimization
- [ ] Bug fixes as needed
- [ ] Feature iteration
```

---

**Questions?**
- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Support: support@vercel.com

**Good luck with deployment! 🚀**
