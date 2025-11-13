# 🚀 Vercel Deployment - Quick Start Guide

**Status**: ✅ 90% Ready - Just need Vercel token!

---

## ⚡ Quick Start (5 minutes)

### ONE-LINER (Everything Automated)

```bash
./scripts/full-deployment.sh
```

This interactive script will guide you through all steps in order.

---

## 📋 Manual Steps (If Preferred)

### Step 1: Get Vercel Token (Manual - 2 min)
```bash
# 1. Open: https://vercel.com/account/tokens
# 2. Click "Create"
# 3. Name: "GitHub Actions Deployment"
# 4. Select: "Full Access"
# 5. Copy the token (shows only once!)
```

### Step 2: Set GitHub Secrets (CLI - 2 min)
```bash
./scripts/setup-vercel-secrets.sh
# Paste your Vercel token when prompted
```

### Step 3: Deploy to Vercel (CLI - 5 min)
```bash
./scripts/deploy-to-vercel.sh
# Choose option 1 or 2
# Wait for deployment to complete
```

### Step 4: Configure DNS (CLI - 5 min)
```bash
./scripts/setup-cloudflare-dns.sh
# Get Vercel IP from: https://vercel.com/kektech1/frontend/settings/domains
# Provide Cloudflare API token (if needed)
```

### Step 5: Verify Everything (CLI - 5 min)
```bash
./scripts/verify-dns.sh
# Checks DNS, SSL, API connectivity
```

---

## 🛠️ What's Already Done

✅ Helius API key updated (bad6b679-fc49-4b3d-952b-8f99b498d686)
✅ Frontend build validated
✅ GitHub Actions workflow created
✅ All CLI scripts created and ready
✅ Environment files configured
✅ Git commits pushed to main

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│  Browser at tinfoil-terminal.xyz        │
│  (HTTPS - Vercel managed)               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Vercel CDN / Edge   │
        │  (76.76.19.xxx)      │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Next.js Frontend    │
        │  /api/proxy/* routes │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Cloudflare Tunnel   │
        │  (edward-lovely...)  │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  VPS Backend         │
        │  (185.202.236.71)    │
        │  Port 4000           │
        └──────────────────────┘
```

---

## 🔗 Key URLs

| Component | URL |
|-----------|-----|
| **Production** | https://tinfoil-terminal.xyz |
| **Vercel Dashboard** | https://vercel.com/kektech1/frontend |
| **Vercel Domains** | https://vercel.com/kektech1/frontend/settings/domains |
| **Cloudflare DNS** | https://dash.cloudflare.com/tinfoil-terminal.xyz/dns/records |
| **Vercel Tokens** | https://vercel.com/account/tokens |
| **GitHub Workflows** | https://github.com/0xBased-lang/zmartV0.69/actions |

---

## 🔐 Credentials Needed

### Vercel
- **Type**: API Token
- **Get**: https://vercel.com/account/tokens
- **Permission**: Full Access
- **Stored in**: GitHub Secret `VERCEL_TOKEN`

### Cloudflare (Optional - for DNS setup)
- **Type**: API Token
- **Get**: https://dash.cloudflare.com/→My Profile→API Tokens
- **Template**: "Edit zone DNS"
- **Env Var**: `CLOUDFLARE_API_TOKEN`

---

## 🐛 Troubleshooting

### "VERCEL_TOKEN not found"
```bash
# Run setup again:
./scripts/setup-vercel-secrets.sh
```

### "DNS not resolving"
```bash
# Wait 5-15 minutes, then:
./scripts/verify-dns.sh

# Manual check:
dig tinfoil-terminal.xyz @1.1.1.1 +short
```

### "SSL certificate error"
```bash
# Check Vercel dashboard:
# https://vercel.com/kektech1/frontend/settings/domains
# Wait 5-10 minutes for auto-provisioning
```

### "API proxy returning 404"
```bash
# Check backend is running on VPS:
ssh kek "pm2 list"
ssh kek "pm2 logs api-gateway --lines 20"
```

---

## 📞 Support Commands

### Check GitHub Secrets
```bash
gh secret list --repo 0xBased-lang/zmartV0.69
```

### Monitor Deployment
```bash
gh run list --repo 0xBased-lang/zmartV0.69 -w deploy-vercel.yml
gh run view <number> --repo 0xBased-lang/zmartV0.69 --log
```

### Test Site
```bash
# Homepage
curl -I https://tinfoil-terminal.xyz

# API proxy
curl https://tinfoil-terminal.xyz/api/proxy/api/health

# Solana RPC
curl https://tinfoil-terminal.xyz/api/proxy/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getStatus"}'
```

### Check DNS Globally
```bash
# Multiple DNS servers
for DNS in 8.8.8.8 1.1.1.1 208.67.222.222; do
  echo "Testing $DNS:"
  dig tinfoil-terminal.xyz @$DNS +short
done
```

---

## 📝 Git Commits (What Was Done)

```
1f25aa6 - feat: Add CLI-based Vercel deployment scripts
0c150e6 - docs: Add comprehensive Vercel deployment status
e0b7d81 - feat: Add GitHub Actions workflow for Vercel deployment
e8fbfb5 - fix: Update Helius API key in production environments
```

---

## ✨ Next Steps

1. **Get Vercel Token** (manual browser step)
2. **Run** `./scripts/full-deployment.sh`
3. **Wait** for deployment to complete
4. **Visit** https://tinfoil-terminal.xyz in browser
5. **Test** all features

---

## 💡 Tips

- The entire workflow is **fully automated via CLI**
- All scripts are **interactive with clear prompts**
- You can **pause between steps** if needed
- **DNS propagation takes 5-15 minutes** (be patient!)
- **SSL certificate auto-provisions** after DNS is live

---

**Estimated Total Time**: 30-45 minutes (mostly waiting for DNS/SSL)
**Active Work Time**: ~10 minutes

Good luck! 🚀
