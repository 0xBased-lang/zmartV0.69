# ZMART Event Indexer Service

Event indexing service for Zmart prediction markets. Receives Solana program events via Helius webhooks and indexes them to Supabase PostgreSQL for fast queries.

## Overview

The Event Indexer Service is responsible for:

- **Real-time Event Processing**: Receives events from Helius webhooks (<5s latency)
- **Database Indexing**: Stores all events in queryable PostgreSQL tables
- **Data Integrity**: Ensures idempotent processing (no duplicates)
- **Performance**: <200ms query response time for common queries

## Architecture

```
Solana Program Events
       ↓
Helius Webhook (HTTP POST)
       ↓
Event Parser (decode instructions)
       ↓
Event Processor (validate + write)
       ↓
Supabase PostgreSQL (10 tables)
       ↓
Frontend Queries (REST + Real-time subscriptions)
```

## Database Schema

### Tables (10 total)

1. **markets** - Market state and metadata
2. **trades** - All buy/sell transactions
3. **positions** - User positions per market
4. **votes** - Proposal and dispute votes
5. **resolutions** - Market resolution data
6. **disputes** - Dispute events
7. **users** - Wallet addresses and profiles
8. **proposals** - Market proposals
9. **events** - Raw event log (audit trail)
10. **analytics** - Aggregated metrics

### Indexes

- **markets**: (pubkey), (state), (creator), (created_at)
- **trades**: (market_pubkey), (trader_pubkey), (timestamp)
- **positions**: (user_pubkey, market_pubkey)
- 15+ total indexes for fast queries

### Row Level Security (RLS)

- **Public read**: markets, trades, proposals
- **User-scoped read**: positions, votes
- **Admin-only write**: All tables (service role)

## Setup

### Prerequisites

1. **Supabase Account**
   - Create project at https://supabase.com
   - Get URL and service role key

2. **Helius Account**
   - Sign up at https://helius.dev
   - Get API key
   - Configure webhook

3. **Node.js**
   - Version 18+ required

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Environment Configuration

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Helius
HELIUS_API_KEY=your-api-key
HELIUS_WEBHOOK_SECRET=your-webhook-secret

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

### Database Setup

1. **Run Migrations**

```bash
# Apply initial schema
npm run migrate
```

This creates all 10 tables, indexes, and RLS policies.

2. **Verify Schema**

```bash
# Check tables exist
npm run dev

# Health check
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "zmart-event-indexer",
  "database": "connected"
}
```

### Helius Webhook Setup

1. **Create Webhook** at https://dev.helius.xyz/webhooks

2. **Configure**:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/helius`
   - **Webhook Type**: Enhanced Transactions
   - **Account Addresses**: `[Your Program ID]`
   - **Transaction Types**: All
   - **Webhook Secret**: Copy to `.env`

3. **Test Webhook**:

```bash
curl -X POST http://localhost:3002/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -H "x-helius-signature: test" \
  -d '{
    "signature": "test123",
    "slot": 123456,
    "timestamp": 1234567890,
    "instructions": []
  }'
```

## Running

### Development

```bash
npm run dev
```

Service runs on http://localhost:3002

### Production

```bash
# Build
npm run build

# Start
npm start
```

### Docker

```bash
# Build image
docker build -t zmart-event-indexer .

# Run container
docker run -p 3002:3002 \
  --env-file .env \
  zmart-event-indexer
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "zmart-event-indexer",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

### Webhook Endpoint

```bash
POST /api/webhooks/helius
```

Headers:
- `Content-Type: application/json`
- `x-helius-signature: <signature>`

Body: Helius webhook payload

Response:
```json
{
  "received": true,
  "eventsProcessed": 3
}
```

## Event Types

### 1. MarketCreated

Triggered when a new market is created.

**Database Impact**:
- Insert into `markets` table
- Insert into `users` table (if new creator)

### 2. TradeExecuted

Triggered when a buy or sell trade is executed.

**Database Impact**:
- Insert into `trades` table
- Update `positions` table (user holdings)
- Update `users` table (trading stats)
- Update `markets` table (share counts)

### 3. MarketResolved

Triggered when a market is resolved.

**Database Impact**:
- Update `markets` table (state, outcome)
- Insert into `resolutions` table

### 4. DisputeRaised

Triggered when a resolution is disputed.

**Database Impact**:
- Update `markets` table (state = DISPUTED)
- Update `resolutions` table (disputed = true)
- Insert into `disputes` table

### 5. DisputeResolved

Triggered when a dispute is resolved.

**Database Impact**:
- Update `markets` table (finalized)
- Update `resolutions` table (finalized)
- Update `disputes` table (outcome)

### 6-9. Other Events

- **VoteSubmitted**: Log aggregated votes
- **ProposalApproved**: Update proposal status
- **WinningsClaimed**: Update position (claimed)

## Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
# Requires Supabase connection
npm run test:integration
```

### Load Testing

```bash
# Send 1000 test events
npm run test:load
```

Expected performance:
- Event processing: <100ms per event
- Database writes: <50ms per insert
- Webhook response: <200ms

## Monitoring

### Logs

Logs are written to:
- Console (all levels)
- `logs/combined.log` (all levels)
- `logs/error.log` (errors only)

Format: Structured JSON

Example:
```json
{
  "timestamp": "2025-01-08T12:00:00.000Z",
  "level": "info",
  "message": "Event processed successfully",
  "type": "MarketCreated",
  "signature": "3kL9..."
}
```

### Metrics

Health check includes:
- Database connection status
- Service uptime
- Version information

Future: Prometheus metrics on port 9090

## Troubleshooting

### Database Connection Fails

**Symptom**: `database: disconnected` in health check

**Solutions**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Check network connectivity
3. Ensure Supabase project is running
4. Check RLS policies allow service role

### Webhook Signature Invalid

**Symptom**: 401 response from webhook endpoint

**Solutions**:
1. Verify `HELIUS_WEBHOOK_SECRET` matches Helius dashboard
2. Check webhook is sent from Helius IP ranges
3. Ensure payload is not modified in transit
4. For development, temporarily disable signature check

### Events Not Processing

**Symptom**: Webhook received but no database updates

**Solutions**:
1. Check logs for parsing errors
2. Verify program ID matches
3. Check event discriminators match program
4. Ensure user has write permissions in database

### Slow Query Performance

**Symptom**: Queries taking >200ms

**Solutions**:
1. Check indexes exist: `npm run migrate`
2. Analyze query plans in Supabase dashboard
3. Add additional indexes for your queries
4. Enable connection pooling

## Production Deployment

### Checklist

- [ ] Environment variables set
- [ ] Database schema deployed
- [ ] Helius webhook configured
- [ ] SSL certificate configured
- [ ] Firewall allows webhooks
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Error alerting configured

### Performance Targets

- Event-to-database latency: <5 seconds
- Query response time p95: <200ms
- Webhook response time: <500ms
- Database uptime: 99.9%
- Event processing success rate: >99%

## Reconciliation

### Data Integrity Validation

Run daily reconciliation to ensure database matches on-chain state:

```bash
npm run reconcile
```

This script:
1. Fetches all markets from on-chain
2. Compares with database records
3. Reports discrepancies
4. Optionally auto-fixes minor issues

## Security

### Best Practices

1. **Never commit `.env`** - Use environment-specific configs
2. **Use service role key** - Has admin privileges
3. **Verify webhook signatures** - Prevent unauthorized access
4. **Enable RLS policies** - Enforce access control
5. **Rate limit webhooks** - Prevent abuse
6. **Monitor logs** - Detect suspicious activity

### Secrets Management

In production, use:
- AWS Secrets Manager
- Google Cloud Secret Manager
- Kubernetes Secrets
- HashiCorp Vault

Never hardcode secrets in code.

## Support

### Documentation

- [Database Schema](./migrations/001_initial_schema.sql)
- [Event Types](./src/types/events.ts)
- [Implementation Plan](../../docs/IMPLEMENTATION_PHASES.md)

### Issues

Report bugs at: https://github.com/your-org/zmartV0.69/issues

### Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT
