# ZMART Environment Variables Reference

**Last Updated**: November 12, 2025
**Status**: Production-Ready Configuration

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Files](#environment-files)
3. [Core Variables](#core-variables)
4. [Service-Specific Variables](#service-specific-variables)
5. [Solana/Web3 Variables](#solanaweb3-variables)
6. [Database & Storage Variables](#database--storage-variables)
7. [External Service Variables](#external-service-variables)
8. [Security & Secrets](#security--secrets)
9. [Development vs Production](#development-vs-production)
10. [Validation & Testing](#validation--testing)

---

## Overview

ZMART uses environment variables for all configuration to keep secrets out of code and enable different configurations for development, staging, and production environments.

**Configuration Philosophy**:
- **Single Source of Truth**: All services load from `/var/www/zmart/backend/.env`
- **No Hardcoded Secrets**: All sensitive data comes from environment variables
- **Type Safety**: Environment variables are validated through `src/config/env.ts`
- **Fallback Values**: Sensible defaults for non-secret values

---

## Environment Files

### Production (VPS)
```bash
# Main configuration file (loaded by all services)
/var/www/zmart/backend/.env

# IMPORTANT: This is the ONLY .env file that matters on VPS
# All services use node_args: '-r dotenv/config' to load this file
```

### Development (Local)
```bash
# Backend services
backend/.env

# Frontend Next.js
frontend/.env.local

# Example/template file (committed to git)
.env.example
```

### File Priority
1. **Production VPS**: `/var/www/zmart/backend/.env` (single source)
2. **Local Dev**: `backend/.env` + `frontend/.env.local`
3. **Fallback**: Defaults in `src/config/env.ts`

---

## Core Variables

### Node Environment

```bash
# Application environment
NODE_ENV=production  # production | development | test
```

**Used by**: All services
**Required**: Yes
**Validation**: Must be one of: `production`, `development`, `test`
**Default**: `development`

**Impact**:
- Enables/disables debug logging
- Sets error verbosity
- Determines performance optimizations

---

## Service-Specific Variables

### API Gateway (Port 4000)

```bash
# API Gateway port
API_PORT=4000
API_HOST=0.0.0.0
```

**Used by**: `api-gateway`, other services calculate their ports relative to this
**Required**: Yes
**Default**: `4000`
**Validation**: Must be a valid port number (1-65535)

**Port Allocation**:
- `4000`: API Gateway
- `4001`: WebSocket Server (`API_PORT + 1`)
- `4002`: Event Indexer (`API_PORT + 2`)
- `4005`: Vote Aggregator (explicit override)

### WebSocket Server (Port 4001)

```bash
# WebSocket server port
WS_PORT=4001
```

**Used by**: `websocket-server`
**Required**: No (calculated from `API_PORT + 1`)
**Default**: `4001`

### Vote Aggregator (Port 4005)

```bash
# Vote aggregator port
PORT=4005

# Aggregation intervals (milliseconds)
VOTE_AGGREGATION_INTERVAL=300000  # 5 minutes
PROPOSAL_AGGREGATION_INTERVAL=300000  # 5 minutes
```

**Used by**: `vote-aggregator`
**Required**: Yes (PORT)
**Defaults**:
- `PORT`: `4005`
- Intervals: `300000` (5 minutes)

### Event Indexer (Port 4002)

```bash
# Event indexer configuration
PORT=4002  # Optional, defaults to API_PORT + 2

# Helius webhook authentication
HELIUS_WEBHOOK_SECRET=your_webhook_secret_here
```

**Used by**: `event-indexer`
**Required**: `HELIUS_WEBHOOK_SECRET` (for webhook validation)
**Default PORT**: `4002`

### Market Monitor (No HTTP port)

```bash
# Market monitor intervals (milliseconds)
MARKET_CHECK_INTERVAL=300000  # 5 minutes
AUTO_RESOLUTION_ENABLED=true
```

**Used by**: `market-monitor`
**Required**: No (uses defaults)
**Defaults**:
- `MARKET_CHECK_INTERVAL`: `300000` (5 minutes)
- `AUTO_RESOLUTION_ENABLED`: `true`

---

## Solana/Web3 Variables

### Solana Network Configuration

```bash
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com
# Or use Helius/QuickNode for production:
# SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Network (for validation and display)
SOLANA_NETWORK=devnet  # mainnet-beta | devnet | testnet
```

**Used by**: All Solana-interacting services
**Required**: Yes
**Validation**: Must be a valid HTTPS URL
**Security**: Use paid RPC endpoints (Helius/QuickNode) for production

**RPC Providers**:
- **Development**: `https://api.devnet.solana.com` (free, rate-limited)
- **Production**: Helius, QuickNode, or Triton (paid, reliable)

### Program IDs

```bash
# zmart-core program (main program)
SOLANA_PROGRAM_ID_CORE=6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw

# Future programs (if needed)
# SOLANA_PROGRAM_ID_GOVERNANCE=...
# SOLANA_PROGRAM_ID_STAKING=...
```

**Used by**: All services interacting with on-chain programs
**Required**: Yes (`SOLANA_PROGRAM_ID_CORE`)
**Validation**: Must be a valid base58-encoded Solana program ID
**Format**: 43-44 character base58 string

**Security**:
- Program IDs are public (not secret)
- Verify program ID matches deployed program before mainnet use

### Keypairs & Wallets

```bash
# Admin/authority keypair (base58 format)
SOLANA_ADMIN_KEYPAIR=base58_encoded_private_key_here

# Fee payer wallet (for transaction fees)
SOLANA_FEE_PAYER_KEYPAIR=base58_encoded_private_key_here
```

**Used by**: Backend services that sign transactions
**Required**: Yes (at least one keypair)
**Format**: Base58-encoded private key (Uint8Array[64] → base58)
**Security**: 🚨 **CRITICAL SECRETS** - Never commit to git, rotate quarterly

**Security Best Practices**:
1. **Never commit**: Use `.gitignore` for `.env` files
2. **Separate keypairs**: Different keypairs for dev/staging/prod
3. **Least privilege**: Use separate keypairs for different operations
4. **Rotation**: Rotate keypairs every 3 months
5. **Backup**: Securely backup keypairs offline
6. **Monitor**: Alert on unexpected transaction signing

**Production Secret Manager Integration**:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- See: [WEB3_SECURITY.md](./WEB3_SECURITY.md) for details

---

## Database & Storage Variables

### Supabase (PostgreSQL + Real-time)

```bash
# Supabase project URL
SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co

# Supabase service role key (full access)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Supabase anon key (public, client-side use)
NEXT_PUBLIC_SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Used by**: All services + frontend
**Required**: Yes
**Security**:
- `SUPABASE_SERVICE_ROLE_KEY`: 🚨 **SECRET** - Never expose client-side
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public (safe to expose)

**Validation**:
- URL must start with `https://`
- Keys must be valid JWT format

**Database Connection String** (optional, for direct psql access):
```bash
DATABASE_URL=postgresql://postgres.tkkqqxepelibqjjhxxct:Dodo-good-2025@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Redis (Caching & Pub/Sub)

```bash
# Redis connection
REDIS_URL=redis://localhost:6379
# Or for production:
# REDIS_URL=redis://user:password@host:port

# Redis configuration
REDIS_DB=0
REDIS_TTL=3600  # Cache TTL in seconds
```

**Used by**: All services (for session management, caching, pub/sub)
**Required**: Yes
**Default**: `redis://localhost:6379`
**Validation**: Must be a valid Redis URL

**Production**:
- Use Redis Cluster for high availability
- Enable authentication (`redis://:password@host:port`)
- Use TLS for encrypted connections (`rediss://`)

---

## External Service Variables

### Helius (Solana RPC + Webhooks)

```bash
# Helius API key
HELIUS_API_KEY=00a6d3a9-d9ac-464b-a5c2-af3257c9a43c

# Helius RPC URL (with API key)
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}

# Helius webhook secret (for validating incoming webhooks)
HELIUS_WEBHOOK_SECRET=your_webhook_secret_here
```

**Used by**: `event-indexer`, `market-monitor`
**Required**: Yes (for production event indexing)
**Security**: 🚨 **SECRET** - API keys are sensitive

**Free Tier**: 100k requests/day
**Production**: Upgrade to paid tier for higher limits

### IPFS (Optional - Disabled for MVP)

```bash
# IPFS configuration (currently disabled)
# IPFS_GATEWAY=https://gateway.pinata.cloud
# IPFS_API_KEY=your_pinata_api_key
```

**Used by**: `ipfs-snapshot` service (currently disabled)
**Required**: No (MVP doesn't use IPFS)
**Future**: May be enabled for decentralized discussion storage

---

## Security & Secrets

### Secret Categories

**Level 1 - Critical Secrets** (🚨 Highest Risk):
- `SOLANA_ADMIN_KEYPAIR`
- `SOLANA_FEE_PAYER_KEYPAIR`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HELIUS_API_KEY`

**Level 2 - Sensitive Secrets** (⚠️ Moderate Risk):
- `DATABASE_URL`
- `REDIS_URL` (if authenticated)
- `HELIUS_WEBHOOK_SECRET`

**Level 3 - Public Values** (✅ Safe to Expose):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SOLANA_PROGRAM_ID_CORE`
- `SOLANA_RPC_URL` (public endpoints)

### Rotation Policy

| Secret Type | Rotation Frequency | Automation |
|-------------|-------------------|------------|
| Keypairs | Quarterly (90 days) | Manual (requires on-chain update) |
| API Keys | Monthly (30 days) | Automated via secret manager |
| Database Passwords | Quarterly (90 days) | Automated via Supabase |
| Webhook Secrets | As needed | Manual |

### Compromise Response

**If a secret is compromised**:

1. **Immediate Actions**:
   - Rotate the compromised secret
   - Check access logs for unauthorized use
   - Alert team and stakeholders

2. **Keypair Compromise**:
   - Generate new keypair
   - Update program authority on-chain
   - Transfer funds to new wallet
   - Revoke old keypair permissions

3. **API Key Compromise**:
   - Revoke old key in provider dashboard
   - Generate new key
   - Update .env and restart services
   - Monitor for unusual activity

4. **Database Compromise**:
   - Rotate database password immediately
   - Check for unauthorized queries
   - Review database audit logs
   - Consider migrating to new instance

---

## Development vs Production

### Development Environment

```bash
# Development .env example
NODE_ENV=development
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID_CORE=6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw

# Dev keypairs (low-value, disposable)
SOLANA_ADMIN_KEYPAIR=dev_keypair_here

# Local services
REDIS_URL=redis://localhost:6379
API_PORT=4000
```

**Characteristics**:
- Uses devnet (no real value)
- Public RPC endpoints (free tier)
- Verbose logging
- Auto-restart enabled
- Test keypairs (disposable)

### Production Environment

```bash
# Production .env example
NODE_ENV=production
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
SOLANA_PROGRAM_ID_CORE=production_program_id_here

# Production keypairs (from secret manager)
SOLANA_ADMIN_KEYPAIR=${AWS_SECRET:admin_keypair}

# Production services
REDIS_URL=rediss://prod-redis:6380
API_PORT=4000
```

**Characteristics**:
- Uses mainnet (real value!)
- Paid RPC endpoints (Helius/QuickNode)
- Minimal logging
- High availability setup
- Secret manager integration
- Monitoring and alerting

---

## Validation & Testing

### Configuration Validation Script

Create `scripts/validate-env.sh`:

```bash
#!/bin/bash
# Validate all required environment variables are set

set -e

REQUIRED_VARS=(
  "NODE_ENV"
  "SOLANA_RPC_URL"
  "SOLANA_PROGRAM_ID_CORE"
  "SOLANA_ADMIN_KEYPAIR"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "REDIS_URL"
  "API_PORT"
  "HELIUS_API_KEY"
)

echo "Validating environment variables..."

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ ERROR: $var is not set"
    exit 1
  else
    echo "✅ $var is set"
  fi
done

echo "✅ All required environment variables are set!"

# Test connections
echo "Testing connections..."

# Test Redis
redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1 && echo "✅ Redis connection OK" || echo "❌ Redis connection FAILED"

# Test Solana RPC
curl -s -X POST "$SOLANA_RPC_URL" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' > /dev/null && echo "✅ Solana RPC connection OK" || echo "❌ Solana RPC connection FAILED"

echo "✅ Validation complete!"
```

### TypeScript Validation

In `src/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_PROGRAM_ID_CORE: z.string().length(44), // Base58 Solana address
  SOLANA_ADMIN_KEYPAIR: z.string().min(100), // Base58-encoded keypair
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(100), // JWT token
  REDIS_URL: z.string().url(),
  API_PORT: z.coerce.number().int().min(1).max(65535),
  HELIUS_API_KEY: z.string().uuid(),
});

// Validate on startup
try {
  envSchema.parse(process.env);
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}
```

### Health Check Endpoints

All services implement `/health` endpoint that checks configuration:

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'zmart-api-gateway',
    version: '0.69.0',
    config: {
      solana_rpc: await testSolanaConnection(),
      supabase: await testSupabaseConnection(),
      redis: await testRedisConnection(),
    },
    timestamp: new Date().toISOString(),
  };

  const allHealthy = Object.values(health.config).every(v => v === 'connected');
  res.status(allHealthy ? 200 : 503).json(health);
});
```

---

## Quick Reference

### Minimum Required Variables

```bash
# Core
NODE_ENV=production
API_PORT=4000

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANA_PROGRAM_ID_CORE=6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw
SOLANA_ADMIN_KEYPAIR=your_keypair_here

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here

# Caching
REDIS_URL=redis://localhost:6379

# External Services
HELIUS_API_KEY=your_key_here
```

### Frontend-Specific Variables

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

---

## Troubleshooting

### Common Issues

**Issue**: Service can't load .env file
```bash
# Solution: Check node_args in ecosystem.config.js
node_args: '-r dotenv/config'
```

**Issue**: Environment variable not found
```bash
# Solution: Verify variable is set
echo $SOLANA_RPC_URL

# Or check in .env file
grep SOLANA_RPC_URL /var/www/zmart/backend/.env
```

**Issue**: Keypair invalid format
```bash
# Solution: Ensure base58 encoding
# Generate new keypair:
solana-keygen new --outfile keypair.json
# Convert to base58 (see WEB3_SECURITY.md)
```

**Issue**: Connection failures
```bash
# Solution: Test connections manually
redis-cli -u "$REDIS_URL" ping
curl -X POST "$SOLANA_RPC_URL" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

---

## Related Documentation

- [ARCHITECTURE_MAP.md](./ARCHITECTURE_MAP.md) - Complete directory structure and service architecture
- [WEB3_SECURITY.md](./WEB3_SECURITY.md) - Solana keypair management and security best practices
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common configuration issues and solutions
- [PROJECT_STRUCTURE.md](../orientation/PROJECT_STRUCTURE.md) - Complete file tree with descriptions

---

**Last Updated**: November 12, 2025
**Maintainer**: ZMART Development Team
**Status**: Production-Ready ✅
