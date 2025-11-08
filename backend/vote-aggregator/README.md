# ZMART Vote Aggregator Service

Off-chain vote collection and aggregation service for ZMART prediction markets.

## Overview

The Vote Aggregator Service:
- Collects proposal/dispute votes via API endpoints
- Stores votes in Redis (off-chain, gas-free)
- Aggregates votes every 5 minutes via cron job
- Submits aggregated results on-chain when thresholds met

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start Redis (if not running)
redis-server

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

## Project Structure

```
vote-aggregator/
├── src/
│   ├── index.ts              # Entry point
│   ├── routes/               # API routes
│   ├── services/             # Business logic
│   │   ├── voteService.ts    # Vote collection
│   │   ├── aggregatorService.ts  # Vote aggregation
│   │   └── solanaService.ts  # On-chain interactions
│   ├── utils/                # Helper functions
│   └── config/               # Configuration
├── tests/                    # Unit & integration tests
├── package.json
├── tsconfig.json
└── .env.example
```

## API Endpoints

### Health Check
```
GET /health
```

### Submit Proposal Vote
```
POST /api/votes/proposal/:marketId

Body:
{
  "vote": "like" | "dislike",
  "signature": "wallet_signature",
  "publicKey": "voter_public_key",
  "message": "signed_message"
}
```

### Submit Dispute Vote
```
POST /api/votes/dispute/:marketId

Body:
{
  "vote": "agree" | "disagree",
  "signature": "wallet_signature",
  "publicKey": "voter_public_key",
  "message": "signed_message"
}
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `PORT`: Server port (default: 3001)
- `REDIS_HOST`: Redis server host
- `SOLANA_RPC_URL`: Solana RPC endpoint
- `PROGRAM_ID`: ZMART program ID
- `BACKEND_AUTHORITY_KEYPAIR_PATH`: Path to wallet keypair

## Development

### Prerequisites
- Node.js 18+
- Redis 7+
- Solana CLI (for wallet management)

### Running Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Linting
```bash
# Check code
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Architecture

### Vote Flow
1. User submits vote via POST /api/votes/...
2. Service validates wallet signature
3. Vote stored in Redis (off-chain)
4. Cron job runs every 5 minutes
5. If threshold met, submit on-chain transaction
6. Market state transitions on-chain

### Redis Schema
```
votes:proposal:{marketId}  → HMAP { walletAddress: "like" | "dislike" }
votes:dispute:{marketId}   → HMAP { walletAddress: "agree" | "disagree" }
```

### Thresholds
- **Proposal Approval**: 70% likes required
- **Dispute Resolution**: 60% agree required

## Deployment

### Devnet
```bash
# Build
npm run build

# Set environment to production
export NODE_ENV=production

# Start service
npm start
```

### Production
- Use process manager (PM2, systemd)
- Configure Redis persistence
- Set up monitoring/alerting
- Use separate mainnet wallet

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Logs
Structured JSON logs with Winston:
```json
{
  "level": "info",
  "message": "Vote submitted",
  "marketId": "...",
  "voter": "...",
  "vote": "like",
  "timestamp": "2025-11-08T01:30:00Z"
}
```

## Troubleshooting

### Redis Connection Failed
- Check Redis is running: `redis-cli ping`
- Verify REDIS_HOST and REDIS_PORT in .env

### Solana Transaction Failed
- Check wallet balance: `solana balance --url devnet --keypair <path>`
- Verify PROGRAM_ID matches deployed program
- Check RPC endpoint is responsive

### Votes Not Aggregating
- Check cron job is enabled: ENABLE_CRON=true
- Review logs for cron execution
- Verify Redis contains votes: `redis-cli hgetall votes:proposal:{marketId}`

## References

- [STORY-BACKEND-1.md](../../docs/stories/STORY-BACKEND-1.md) - Full specification
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](../../docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Architecture
- [IMPLEMENTATION_PHASES.md](../../docs/IMPLEMENTATION_PHASES.md) - Week 4 plan

## Status

**Current**: ✅ Project structure initialized
**Next**: Implement vote collection API (Week 4, Day 2)

---

**Version**: 1.0.0
**Last Updated**: November 8, 2025
**Author**: ZMART Team
