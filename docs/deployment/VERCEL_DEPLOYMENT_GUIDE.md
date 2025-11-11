# Vercel Deployment Guide - ZMART V0.69

**Purpose:** Deploy production-ready frontend to Vercel for public access.

**Last Updated:** November 11, 2025

---

## 📋 Overview

This guide walks through deploying the ZMART frontend to Vercel, configuring environment variables, and setting up production domains.

**Prerequisites:**
- ✅ Frontend 100% complete (all features working)
- ✅ Backend services operational on VPS (185.202.236.71)
- ✅ Integration tests passing
- ✅ Security audit complete (12/12 findings resolved)
- ✅ GitHub repository clean and up-to-date

---

## 🚀 Quick Deployment

**3-Minute Deploy:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to frontend
cd frontend

# 3. Deploy!
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: zmart-v0-69
# - Directory: ./
# - Framework: Next.js
# - Deploy? Yes
```

**Done!** Your app is live at `https://zmart-v0-69.vercel.app`

---

## 📝 Detailed Deployment Steps

### Step 1: Prepare Repository

```bash
# Ensure clean state
git status
git add .
git commit -m "chore: Prepare for production deployment"
git push origin main

# Verify build works
cd frontend
pnpm build
pnpm type-check
```

### Step 2: Configure Environment Variables

**Create `.env.production` in frontend directory:**

```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# Backend API
NEXT_PUBLIC_API_URL=http://185.202.236.71:4000
NEXT_PUBLIC_WS_URL=ws://185.202.236.71:4001

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Add to Vercel Dashboard:**
1. Go to project settings → Environment Variables
2. Add each variable for "Production" scope
3. Save changes

### Step 3: Deploy via Git (Recommended)

**Auto-deploy on push to main:**

1. Connect GitHub repo to Vercel:
   - Go to vercel.com → Add New Project
   - Import `zmartV0.69` repository
   - Root directory: `frontend`
   - Framework: Next.js (auto-detected)

2. Configure build settings:
   - Build command: `pnpm build`
   - Output directory: `.next`
   - Install command: `pnpm install`

3. Push to main → Auto-deploys! 🎉

### Step 4: Verify Deployment

```bash
# Check deployment
vercel ls

# Test production URL
curl https://your-vercel-url.vercel.app

# Open in browser
open https://your-vercel-url.vercel.app
```

**Manual Testing:**
- ✅ Market listing loads
- ✅ Wallet connects (Phantom/Backpack)
- ✅ Trading works (buy/sell)
- ✅ Portfolio shows positions
- ✅ Real-time updates work
- ✅ Mobile responsive

---

## 🔧 Configuration

### Custom Domain (Optional)

**Setup:**
1. Vercel Dashboard → Domains → Add Domain
2. Enter: `app.zmart.io` (or your domain)
3. Configure DNS:
   - Type: `A`
   - Name: `app`
   - Value: `76.76.21.21`
4. Wait for propagation (up to 48h)
5. SSL auto-provisioned by Vercel ✅

### Performance Optimization

**Enable in `next.config.js`:**

```javascript
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['tkkqqxepelibqjjhxxct.supabase.co'],
  },
};
```

### Analytics & Monitoring

**Vercel Analytics:**
```typescript
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

---

## 🚨 Troubleshooting

### Build Failures

**"Module not found":**
```bash
cd frontend
pnpm install
pnpm build  # Should work locally first
```

**TypeScript errors:**
```bash
pnpm type-check  # Fix all errors
```

**Environment variables missing:**
- Check Vercel Dashboard → Environment Variables
- Ensure "Production" scope selected
- Redeploy after adding variables

### Runtime Errors

**API CORS errors:**

Backend needs to allow Vercel domain:

```typescript
// backend/src/api/index.ts
app.use(cors({
  origin: [
    'https://your-vercel-url.vercel.app',
    'https://app.zmart.io'
  ],
  credentials: true
}));
```

**WebSocket not connecting:**

Use `wss://` for production (not `ws://`).

**Wallet connection fails:**

Check `NEXT_PUBLIC_SOLANA_NETWORK` matches wallet network (devnet/mainnet).

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Build passes locally (`pnpm build`)
- [ ] Tests passing (`pnpm test`)
- [ ] TypeScript clean (`pnpm type-check`)
- [ ] Environment variables documented

### Vercel Configuration
- [ ] Project created and linked to GitHub
- [ ] Environment variables added
- [ ] Build settings configured
- [ ] Auto-deploy enabled

### Post-Deployment
- [ ] Production URL accessible
- [ ] All features working
- [ ] Wallet connection works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Analytics tracking

---

## 🎯 Success Criteria

**Must Pass:**
- ✅ URL loads and displays markets
- ✅ Wallet connects successfully
- ✅ Trading flow works end-to-end
- ✅ Real-time updates functional
- ✅ Mobile responsive design
- ✅ Performance score >90 (Lighthouse)
- ✅ No critical errors in console

**Production Ready:**
- ✅ Custom domain (optional)
- ✅ SSL certificate active
- ✅ Analytics tracking
- ✅ Error monitoring (Sentry, optional)
- ✅ Backup/rollback tested

---

## 📝 Next Steps

1. **Deploy:** Run `vercel --prod`
2. **Test:** Verify all features work
3. **Monitor:** Watch analytics and errors
4. **Launch:** Announce on social media
5. **Iterate:** Collect feedback and improve

**Support:**
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs

**Ready to launch! 🚀🎉**
