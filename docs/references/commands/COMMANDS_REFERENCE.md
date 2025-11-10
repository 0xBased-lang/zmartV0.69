# COMMANDS_REFERENCE.md - Complete Command Reference

**Category:** Commands & Scripts
**Tags:** [commands, cli, scripts, npm, anchor, solana, developer]
**Last Updated:** 2025-11-09 00:20 PST

---

## Quick Links

- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 📊 [Project State](../state/STATE_MASTER.md)
- 🏗️ [Programs Reference](../components/PROGRAMS_REFERENCE.md)
- 🔧 [Backend Reference](../components/BACKEND_REFERENCE.md)
- 🧪 [Testing Hub](../testing/TESTING_MASTER.md)

---

## 🎯 Purpose

**Complete index of all commands, scripts, and CLI tools used in the ZMART V0.69 project.**

This document catalogs:
- NPM/pnpm scripts (all package.json scripts)
- Anchor commands (build, test, deploy)
- Solana CLI commands (wallet, program, account operations)
- PM2 process management
- Git operations
- Testing commands
- Deployment scripts
- Operational tools

**This is a reference document - organized by task and component for quick lookup.**

---

## 📋 Quick Navigation

**By Task:**
- [I want to build](#building) - Compilation and build commands
- [I want to test](#testing) - All testing commands
- [I want to deploy](#deploying) - Deployment to devnet/mainnet
- [I want to check status](#status-monitoring) - Service and blockchain status
- [I want to debug](#debugging) - Logs, errors, and troubleshooting

**By Component:**
- [Programs (On-Chain)](#on-chain-programs-anchor) - Anchor/Rust commands
- [Backend Services](#backend-services-nodejs) - Node.js/TypeScript commands
- [Frontend](#frontend-nextjs) - Next.js commands
- [Infrastructure](#infrastructure-operations) - Database, Redis, wallets

---

## 🔨 Building

### On-Chain Programs

```bash
# Build all programs
anchor build

# Build specific program
anchor build -p zmart-core
anchor build -p zmart-proposal

# Clean and rebuild
anchor clean && anchor build

# Verify compilation
cargo check --all

# Cargo build (without Anchor)
cargo build-bpf --manifest-path=programs/zmart-core/Cargo.toml
```

### Backend

```bash
# Build backend (TypeScript → JavaScript)
cd backend
pnpm run build

# Build event indexer
cd backend/event-indexer
pnpm run build

# Build vote aggregator
cd backend/vote-aggregator
pnpm run build

# Build all
pnpm build  # (root package.json)
```

### Frontend

```bash
# Build Next.js frontend
cd frontend
pnpm run build

# Type check (no build)
pnpm run type-check

# Generate Supabase types
npx supabase gen types typescript --project-id tkkqqxepelibqjjhxxct > lib/supabase/types.ts
```

---

## 🧪 Testing

### On-Chain Tests

```bash
# Run all anchor tests
anchor test

# Run tests without rebuild
anchor test --skip-build

# Run specific test file
anchor test --skip-build tests/create-market.ts

# Run with logs
anchor test -- --nocapture
```

### Backend Unit Tests

```bash
# All tests
cd backend
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### E2E Tests (Real Blockchain)

```bash
# All E2E tests (real blockchain)
pnpm test:e2e:real

# Interactive UI mode
pnpm test:e2e:real:ui

# Specific test suites
pnpm test:e2e:real:trading       # Trading flow tests
pnpm test:e2e:real:validation    # Validation tests
pnpm test:e2e:real:realtime      # Real-time update tests

# View test report
pnpm test:e2e:report
```

### Database Tests

```bash
# Test database connection
cd backend
pnpm run test:db

# Setup test wallets
pnpm run test:setup-wallets

# Cleanup test data
pnpm run test:cleanup
```

### All Tests

```bash
# Run everything (anchor + E2E)
pnpm test:all
```

---

## 🚀 Deploying

### Programs (Devnet)

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy with specific program
anchor deploy --program-name zmart-core --provider.cluster devnet

# Upgrade existing program
anchor upgrade <program-id> target/deploy/zmart_core.so --provider.cluster devnet

# Alternative using pnpm
pnpm deploy:devnet
```

### Programs (Mainnet)

```bash
# Deploy to mainnet-beta
anchor deploy --provider.cluster mainnet-beta

# Or via pnpm
pnpm deploy:mainnet
```

### Backend Services

```bash
# Deploy all services with PM2
cd backend
pm2 start ecosystem.config.js

# Deploy specific service
pm2 start ecosystem.config.js --only api-gateway
pm2 start ecosystem.config.js --only event-indexer

# Save PM2 state (persist across reboots)
pm2 save
pm2 startup
```

### Database Schema

```bash
# Deploy Supabase schema
cd backend
pnpm run deploy:supabase

# Or manually via psql
psql "postgresql://postgres:password@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres" \
  -f supabase/migrations/20251107000000_market_finalization_errors.sql
```

### Helius Webhooks

```bash
# Register webhook
cd backend
pnpm run helius:register

# List webhooks
pnpm run helius:list

# Delete webhook
pnpm run helius:delete
```

---

## 📊 Status & Monitoring

### Service Status

```bash
# PM2 service status
pm2 status

# Detailed service info
pm2 show api-gateway
pm2 show event-indexer

# Monitor all services (real-time)
pm2 monit

# Logs
pm2 logs                    # All services
pm2 logs api-gateway        # Specific service
pm2 logs --lines 100        # Last 100 lines
pm2 logs --err              # Errors only
```

### Health Checks

```bash
# API Gateway
curl http://localhost:4000/health

# Event Indexer
curl http://localhost:4002/health

# Supabase
curl https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/

# Redis
redis-cli ping
```

### Blockchain Status

```bash
# Check Solana cluster status
solana cluster-version

# Check epoch info
solana epoch-info

# Check transaction count
solana transaction-count

# Check validators
solana validators
```

### Wallet Balances

```bash
# Check balance (default wallet)
solana balance

# Check specific wallet
solana balance ~/.config/solana/backend-authority.json

# Check balance by address
solana balance 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye
```

### Program Status

```bash
# Show program info
solana program show 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# List program deployed programs
anchor keys list

# Or via pnpm
pnpm keys
```

---

## 🐛 Debugging

### Program Logs

```bash
# Stream program logs (real-time)
solana logs 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# With cluster
solana logs 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet

# View specific transaction
solana confirm -v <transaction-signature>
```

### Service Logs

```bash
# Backend logs (various locations)
tail -f backend/logs/api-gateway-combined.log
tail -f backend/logs/event-indexer-combined.log
tail -f backend/logs/market-monitor-combined.log

# PM2 logs
pm2 logs api-gateway --lines 50
pm2 logs event-indexer --err  # Errors only
```

### Account Inspection

```bash
# View account data
solana account <account-address>

# View with Anchor
anchor account MarketAccount <address>
anchor account GlobalConfig <address>
anchor account UserPosition <address>

# Decode base64 account data
solana account <address> --output json | jq -r .data[0] | base64 -d
```

### Transaction Debugging

```bash
# View transaction details
solana confirm -v <tx-signature>

# Search for transactions by address
solana transaction-history <address> --limit 10
```

---

## 🔐 Wallet Operations

### Creating Wallets

```bash
# Generate new wallet
solana-keygen new

# Generate with specific output file
solana-keygen new --outfile ~/.config/solana/my-wallet.json

# Generate with no passphrase
solana-keygen new --no-bip39-passphrase
```

### Wallet Info

```bash
# Show public key
solana address

# Show from specific keypair
solana-keygen pubkey ~/.config/solana/backend-authority.json

# Verify keypair
solana-keygen verify <pubkey> ~/.config/solana/backend-authority.json
```

### Funding Wallets

```bash
# Airdrop devnet SOL
solana airdrop 2

# Airdrop to specific wallet
solana airdrop 5 ~/.config/solana/backend-authority.json

# Airdrop to address
solana airdrop 10 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye
```

### Transferring SOL

```bash
# Transfer SOL
solana transfer <recipient-address> <amount>

# Example
solana transfer 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye 1.5
```

---

## 🔧 Configuration

### Solana Config

```bash
# Show current config
solana config get

# Set RPC URL
solana config set --url https://api.devnet.solana.com
solana config set --url https://api.mainnet-beta.solana.com

# Set default keypair
solana config set --keypair ~/.config/solana/id.json

# Set commitment level
solana config set --commitment confirmed
```

### Anchor Config

```bash
# View Anchor.toml
cat Anchor.toml

# Program IDs are in Anchor.toml:
# [programs.devnet]
# zmart_core = "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS"
```

---

## 📦 Package Management

### Install Dependencies

```bash
# Root dependencies
pnpm install

# Backend
cd backend && pnpm install

# Frontend
cd frontend && pnpm install

# Event Indexer
cd backend/event-indexer && pnpm install
```

### Update Dependencies

```bash
# Update all
pnpm update

# Update specific package
pnpm update @solana/web3.js

# Update Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

---

## 🗂️ Complete Command Index

### Root Package.json Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all Anchor programs |
| `pnpm test` | Run all Anchor tests |
| `pnpm deploy:devnet` | Deploy programs to devnet |
| `pnpm deploy:mainnet` | Deploy programs to mainnet |
| `pnpm keys` | List program keys |
| `pnpm clean` | Clean build artifacts |
| `pnpm verify` | Verify code compilation |
| `pnpm test:e2e:real` | Run E2E tests on real blockchain |
| `pnpm test:e2e:real:ui` | Run E2E tests with UI |
| `pnpm test:e2e:real:trading` | Run trading E2E tests |
| `pnpm test:e2e:real:validation` | Run validation E2E tests |
| `pnpm test:e2e:real:realtime` | Run real-time E2E tests |
| `pnpm test:e2e:report` | Show Playwright test report |
| `pnpm test:wallet:setup` | Setup test wallet with SOL |
| `pnpm test:all` | Run all tests (anchor + E2E) |

---

### Backend Package.json Scripts

| Command | Description |
|---------|-------------|
| `pnpm run build` | Compile TypeScript to JavaScript |
| `pnpm run dev` | Run development server (auto-reload) |
| `pnpm run start` | Start production server |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Run unit tests only |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm test:db` | Test database connection |
| `pnpm test:setup-wallets` | Create test wallets |
| `pnpm test:cleanup` | Clean up test data |
| `pnpm run lint` | Lint TypeScript code |
| `pnpm run lint:fix` | Fix linting errors |
| `pnpm run format` | Format code with Prettier |
| `pnpm run validate:week2` | Validate Week 2 completion |
| `pnpm run deploy:market-monitor` | Deploy market monitor service |
| `pnpm run monitor:run` | Run market monitor once |
| `pnpm run helius:register` | Register Helius webhook |
| `pnpm run helius:list` | List Helius webhooks |
| `pnpm run helius:delete` | Delete Helius webhook |
| `pnpm run deploy:supabase` | Deploy Supabase schema |

---

### Event Indexer Package.json Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Run development server (ts-node) |
| `pnpm run build` | Compile TypeScript |
| `pnpm run start` | Start production server |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm run migrate` | Run database migrations |
| `pnpm run reconcile` | Reconcile on-chain with database |
| `pnpm run lint` | Lint code |
| `pnpm run lint:fix` | Fix linting errors |

---

### Vote Aggregator Package.json Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Run development server |
| `pnpm run build` | Compile TypeScript |
| `pnpm run start` | Start production server |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm run lint` | Lint code |
| `pnpm run lint:fix` | Fix linting errors |

---

### Frontend Package.json Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Run Next.js development server |
| `pnpm run build` | Build production Next.js app |
| `pnpm run start` | Start production server |
| `pnpm run lint` | Lint Next.js code |
| `pnpm run type-check` | TypeScript type checking |
| `pnpm run types:generate` | Generate Supabase types |

---

## 🔨 Anchor CLI Commands

### Build & Test

```bash
anchor build                  # Build all programs
anchor build -p <program>     # Build specific program
anchor test                   # Run all tests
anchor test --skip-build      # Skip rebuild
anchor test -- --nocapture    # Show println! output
anchor clean                  # Clean build artifacts
```

### Deploy

```bash
anchor deploy                                    # Deploy to configured cluster
anchor deploy --provider.cluster devnet          # Deploy to devnet
anchor deploy --provider.cluster mainnet-beta    # Deploy to mainnet
anchor upgrade <program-id> <program.so>         # Upgrade existing program
```

### Program Management

```bash
anchor keys list              # List program public keys
anchor keys sync              # Sync Anchor.toml with program keys
anchor init <name>            # Initialize new Anchor project
anchor new <program-name>     # Add new program to workspace
```

### Account Operations

```bash
anchor account <account-type> <address>   # View account data
anchor idl init <program-id> -f <idl>     # Initialize IDL
anchor idl upgrade <program-id> -f <idl>  # Upgrade IDL
```

---

## 💎 Solana CLI Commands

### Cluster Operations

```bash
solana cluster-version        # Get cluster version
solana epoch-info             # Get current epoch info
solana block-height           # Get current block height
solana transaction-count      # Get total transaction count
solana validators             # List validators
solana gossip                 # Show gossip network nodes
```

### Wallet Operations

```bash
solana address                                # Show default wallet address
solana balance                                # Check balance
solana balance <address>                      # Check address balance
solana airdrop <amount>                       # Request SOL airdrop (devnet)
solana transfer <to> <amount>                 # Transfer SOL
solana-keygen new                             # Create new wallet
solana-keygen pubkey <keypair>                # Show public key
solana-keygen verify <pubkey> <keypair>       # Verify keypair
```

### Program Operations

```bash
solana program show <program-id>                      # Show program info
solana program deploy <program.so>                    # Deploy program
solana program upgrade <program-id> <program.so>      # Upgrade program
solana program set-upgrade-authority <program-id>     # Set upgrade authority
solana program dump <program-id> <file>               # Dump program binary
solana program close <program-id>                     # Close program
```

### Account Operations

```bash
solana account <address>                  # View account data
solana account <address> --output json    # JSON output
solana rent <bytes>                       # Calculate rent for account size
solana create-account <keypair> <bytes>   # Create new account
solana transfer <to> <amount>             # Transfer SOL
```

### Transaction Operations

```bash
solana confirm <signature>                # Confirm transaction
solana confirm -v <signature>             # Verbose transaction details
solana transaction-history <address>      # View transaction history
solana logs                               # Stream all logs
solana logs <address>                     # Stream address logs
```

### Configuration

```bash
solana config get                         # Show config
solana config set --url <rpc-url>         # Set RPC URL
solana config set --keypair <path>        # Set default keypair
solana config set --commitment <level>    # Set commitment level
```

---

## 🔄 PM2 Process Management

### Service Control

```bash
pm2 start ecosystem.config.js             # Start all services
pm2 start ecosystem.config.js --only <name>  # Start specific service
pm2 restart <name>                        # Restart service
pm2 stop <name>                           # Stop service
pm2 delete <name>                         # Delete service
pm2 restart all                           # Restart all
pm2 stop all                              # Stop all
pm2 delete all                            # Delete all
```

### Monitoring

```bash
pm2 status                                # Service status
pm2 list                                  # List all services
pm2 show <name>                           # Detailed service info
pm2 monit                                 # Real-time monitoring
pm2 logs                                  # Tail all logs
pm2 logs <name>                           # Tail specific service
pm2 logs --lines 100                      # Last 100 lines
pm2 logs --err                            # Errors only
pm2 flush                                 # Clear all logs
```

### Persistence

```bash
pm2 save                                  # Save process list
pm2 resurrect                             # Restore saved processes
pm2 startup                               # Generate startup script
pm2 unstartup                             # Remove startup script
```

### Updates

```bash
pm2 update                                # Update PM2
pm2 reset <name>                          # Reset restart count
pm2 reload <name>                         # Zero-downtime reload
```

---

## 🗄️ Database Operations

### Supabase CLI

```bash
# Generate types
npx supabase gen types typescript \
  --project-id tkkqqxepelibqjjhxxct \
  > backend/src/types/supabase.ts

# Link project
npx supabase link --project-ref tkkqqxepelibqjjhxxct

# Pull remote schema
npx supabase db pull

# Push local migrations
npx supabase db push

# Reset database
npx supabase db reset
```

### PostgreSQL (psql)

```bash
# Connect to database
psql "postgresql://postgres:Lr7JeGk1uhzBDqwI@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres"

# Run migration
psql "postgresql://..." -f supabase/migrations/20251107000000_market_finalization_errors.sql

# Backup database
pg_dump "postgresql://..." > backup.sql

# Restore database
psql "postgresql://..." < backup.sql

# List tables
psql "postgresql://..." -c "\dt"

# Describe table
psql "postgresql://..." -c "\d markets"
```

---

## 🔴 Redis Commands

### Redis CLI

```bash
redis-cli ping                            # Check connection
redis-cli                                 # Enter interactive mode
redis-cli info                            # Server info
redis-cli info memory                     # Memory usage
redis-cli keys '*'                        # List all keys (dev only!)
redis-cli monitor                         # Monitor commands
redis-cli --stat                          # Real-time stats
```

### Service Management

```bash
# macOS (Homebrew)
brew services start redis                 # Start Redis
brew services stop redis                  # Stop Redis
brew services restart redis               # Restart Redis
brew services list                        # List services

# Linux (systemd)
sudo systemctl start redis                # Start Redis
sudo systemctl stop redis                 # Stop Redis
sudo systemctl restart redis              # Restart Redis
sudo systemctl status redis               # Check status
```

---

## 🧹 Cleanup & Maintenance

### Clean Build Artifacts

```bash
# Anchor
anchor clean

# Cargo
cargo clean

# Node modules
rm -rf node_modules
pnpm install

# Backend
cd backend
rm -rf dist node_modules
pnpm install && pnpm run build

# Frontend
cd frontend
rm -rf .next node_modules
pnpm install
```

### Reset Development Environment

```bash
# Clean everything
anchor clean
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf backend/dist backend/event-indexer/dist

# Reinstall
pnpm install

# Rebuild
anchor build
cd backend && pnpm run build
```

---

## 🔍 Troubleshooting Commands

### "Service won't start"

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs <service-name>

# Check port availability
lsof -i :4000  # API Gateway
lsof -i :4002  # Event Indexer
lsof -i :6379  # Redis

# Kill process on port
kill -9 $(lsof -t -i:4000)
```

### "Program deployment failed"

```bash
# Check Solana config
solana config get

# Check wallet balance
solana balance

# Airdrop SOL
solana airdrop 2

# Verbose deploy
anchor deploy --provider.cluster devnet -- --verbose

# Check program status
solana program show <program-id>
```

### "Database connection failed"

```bash
# Test connection
cd backend
pnpm run test:db

# Check Supabase status
curl https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/

# Ping database
psql "postgresql://postgres:Lr7JeGk1uhzBDqwI@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres" -c "SELECT 1"
```

### "Redis not working"

```bash
# Check Redis status
redis-cli ping

# If not running
brew services start redis  # macOS
sudo systemctl start redis  # Linux

# Check logs
tail -f /opt/homebrew/var/log/redis.log  # macOS
sudo journalctl -u redis -f  # Linux
```

---

## 📚 Quick Reference Cheatsheet

### Daily Development

```bash
# Start development
anchor build && cd backend && pnpm run dev

# Run tests
anchor test --skip-build
pnpm test

# Check status
pm2 status
solana balance

# View logs
pm2 logs api-gateway
```

### Deploy Changes

```bash
# Build and deploy program
anchor build
anchor deploy --provider.cluster devnet

# Deploy backend service
cd backend
pnpm run build
pm2 restart api-gateway
```

### Debug Issues

```bash
# Program logs
solana logs 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# Service logs
pm2 logs api-gateway --lines 100

# Transaction details
solana confirm -v <tx-signature>
```

---

## 🎯 Command Categories

**By Frequency:**
- **Daily:** `anchor build`, `anchor test`, `pm2 status`, `pm2 logs`
- **Weekly:** `anchor deploy`, `pm2 restart`, `pnpm test:e2e:real`
- **Monthly:** `pnpm update`, `pm2 update`, Database backups
- **As-Needed:** `solana program upgrade`, `pnpm run helius:register`

**By Component:**
- **Programs:** `anchor build/test/deploy`, `solana program show`
- **Backend:** `pnpm run build/dev/test`, `pm2 start/restart/logs`
- **Database:** `pnpm run deploy:supabase`, `psql`, `npx supabase`
- **Monitoring:** `pm2 status`, `curl /health`, `solana balance`

---

## 📖 Related Documentation

### Component References

- [PROGRAMS_REFERENCE.md](../components/PROGRAMS_REFERENCE.md) ✅ - On-chain programs
- [BACKEND_REFERENCE.md](../components/BACKEND_REFERENCE.md) ✅ - Backend services
- [INFRASTRUCTURE_REFERENCE.md](../components/INFRASTRUCTURE_REFERENCE.md) ✅ - Infrastructure

### Guides

- [TESTING_MASTER.md](../testing/TESTING_MASTER.md) ✅ - Complete testing guide
- [TROUBLESHOOTING_REFERENCE.md](../troubleshooting/TROUBLESHOOTING_REFERENCE.md) ⏳ - Issue resolution
- [ENVIRONMENT_GUIDE.md](../../ENVIRONMENT_GUIDE.md) ✅ - Environment variables

---

**Last Updated:** 2025-11-09 00:20 PST
**Next Review:** 2025-11-16
**Maintained By:** Development Team

---
