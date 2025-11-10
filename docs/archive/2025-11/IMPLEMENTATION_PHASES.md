# ZMART V0.69 - IMPLEMENTATION PHASES
## Detailed Week-by-Week Roadmap

**Timeline:** 20 Weeks (4-5 Months) - Realistic with 3X Frontend + 2X Backend Multipliers
**Last Updated:** November 5, 2025
**Status:** Documentation Complete - Ready for Week 1

---

## 📊 TIMELINE OVERVIEW

```
PHASE 1: SOLANA PROGRAMS (Weeks 1-4)    ████░░░░░░░░░░░░░░░░░░░░░░░░
PHASE 2: BACKEND SERVICES (Weeks 5-8)   ░░░░████░░░░░░░░░░░░░░░░░░░░
PHASE 3: TESTING (Weeks 9-10)           ░░░░░░░░██░░░░░░░░░░░░░░░░░░
PHASE 4: FRONTEND (Weeks 11-19)         ░░░░░░░░░░█████████░░░░░░░░░
PHASE 5: LAUNCH PREP (Week 20)          ░░░░░░░░░░░░░░░░░░░█░░░░░░░░

Total: 20 weeks to mainnet-ready platform

```

## ⏰ REALISTIC TIMELINE ADJUSTMENTS

This 20-week timeline incorporates lessons learned from previous Zmart project (see /Users/seman/Desktop/Zmart-BMADFULL/LESSONS-LEARNED-ZMART.md):

### Frontend: 3.2X Multiplier Applied (Pattern #2 Prevention)
**Original Naive Estimate**: 14 stories × 2 days = 4 weeks
**Lessons Learned Reality**: 11 days actual (but with all-night crises + 5,665 TODOs)
**Proper Estimate with Quality**: 9 weeks = 4 weeks × 3.2 multiplier

**Why 3.2X?**
- Base features: 4 weeks (1.0x)
- Component library: +2 weeks (0.5x) - Need consistent UI
- Loading/error states: +0.8 weeks (0.2x) - Every async operation
- Error handling: +1.2 weeks (0.3x) - Every API call
- Performance optimization: +1.2 weeks (0.3x) - Will need it
- Testing (E2E): +2 weeks (0.5x) - Playwright tests
- Polish + "Elite" design: +1.6 weeks (0.4x) - Professional UX
- **Total: 4 × 3.2 = 12.8 weeks** → Rounded to 9 weeks (accounting for learning curve)

**Evidence**: Previous Zmart frontend scope creep was 180% (lines 7767 of code vs planned 14 stories)

### Backend: 2X Multiplier Applied (Pattern #2 Prevention)
**Original Estimate**: 2 weeks (vote aggregator + market monitor)
**Reality**: 11 database migrations (62% were scope additions), 4 backend services
**Proper Estimate**: 4 weeks = 2 weeks × 2 multiplier

**Why 2X?**
- Vote aggregator: 1 week
- Market monitor (auto-resolution): 1 week
- IPFS snapshot service: 0.5 weeks
- Event indexer: 1 week
- Buffer for scope discoveries: 0.5 weeks

**Evidence**: Previous Zmart had voting system added Day 2 (should have been in initial scope)

### Why This Timeline is Realistic
- ✅ Prevents all-night debugging sessions (Pattern #3: Reactive Crisis Loop)
- ✅ Includes performance/security upfront (Pattern #6: Afterthought Tax)
- ✅ Buffers for scope discoveries (Pattern #2: Scope Creep)
- ✅ Sustainable pace (no burnout)
- ✅ Quality gates enforced (Definition of Done at each step)

### Timeline Assumptions
- **Team Size**: 1-3 developers (solo friendly, scales to team)
- **Work Schedule**: Full-time (40 hours/week)
- **Experience Level**: Familiar with Solana/Anchor + React/Next.js
- **Methodology**: Story-first development with git hook enforcement

---

## 🔧 PHASE 1: BACKEND FOUNDATION (Weeks 1-10)

### **WEEK 1: Project Setup**
**Dates:** Week of [START_DATE]
**Focus:** Environment, tooling, and foundation

#### Deliverables
- [ ] Fresh project structure created in `/Users/seman/Desktop/zmartV0.69`
- [ ] Anchor workspace initialized (4 programs)
- [ ] Devnet test SPL token created (6 decimals)
- [ ] Supabase project setup (free tier)
- [ ] Environment configurations (.env files for local/devnet/mainnet)
- [ ] Git repository initialized with proper .gitignore
- [ ] Testing framework setup (Anchor tests + Jest)
- [ ] CI/CD pipeline basic setup (GitHub Actions)
- [ ] Documentation structure (18 docs created)

#### Tasks

**Day 1-2: Development Environment**
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node.js dependencies
pnpm install

# Setup Solana config for devnet
solana config set --url https://api.devnet.solana.com

# Generate program keypairs (2 programs total)
solana-keygen new --outfile ~/.config/solana/zmart-core.json
solana-keygen new --outfile ~/.config/solana/zmart-proposal.json
```

**Day 3-4: Test Token Creation**
```bash
# Create devnet SPL token (6 decimals to match pump.fun)
spl-token create-token --decimals 6

# Save token mint address to env
echo "DEVNET_TOKEN_MINT=<TOKEN_MINT_ADDRESS>" >> .env.devnet

# Create token account for yourself
spl-token create-account <TOKEN_MINT_ADDRESS>

# Mint 1M test tokens
spl-token mint <TOKEN_MINT_ADDRESS> 1000000
```

**Day 5-7: Project Structure**
```
zmartV0.69/
├── Anchor.toml                    # Anchor workspace config
├── Cargo.toml                     # Rust workspace
├── package.json                   # Node.js workspace
├── programs/
│   ├── zmart-core/               # Main program (trading, markets, resolution)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs           # Program entry point
│   │       ├── state.rs         # Account structures (GlobalConfig, MarketAccount, UserPosition)
│   │       ├── instructions/    # 14 instructions
│   │       │   ├── admin.rs     # initialize, update_config
│   │       │   ├── market.rs    # propose, approve, activate, resolve, dispute, finalize
│   │       │   ├── trading.rs   # buy_shares, sell_shares, claim_winnings, withdraw_liquidity
│   │       │   └── moderation.rs # emergency_pause, cancel_market
│   │       └── utils/
│   │           └── lmsr.rs      # LMSR fixed-point math
│   └── zmart-proposal/          # Proposal voting aggregation (4 instructions)
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs           # Vote aggregation logic
│           ├── state.rs         # VoteRecord account
│           └── instructions/    # 4 instructions
│               ├── submit_proposal_vote.rs
│               ├── aggregate_proposal_votes.rs
│               ├── submit_dispute_vote.rs
│               └── aggregate_dispute_votes.rs
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── api/          # Express routes
│   │   ├── aggregator/   # Vote aggregation
│   │   └── monitoring/   # Event listeners
│   └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── load/
│   └── security/
└── docs/                  # All documentation (18 files)
```

#### Success Criteria
✅ All tools installed and working
✅ Anchor workspace compiles
✅ Test token created and funded
✅ Documentation structure complete
✅ Team has access to all resources

---

### **WEEK 2: Initial Program Scaffolding**
**Focus:** Basic program structure without logic

#### Deliverables
- [ ] All 4 programs compile successfully
- [ ] Basic account structures defined
- [ ] PDAs derivation working
- [ ] Simple unit tests passing
- [ ] Program deployment to local validator works

#### Tasks

**market-factory program:**
```rust
// Define basic structs
pub struct Config { ... }
pub struct Market { ... }
pub enum MarketState { ... }

// Implement empty instruction handlers
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    Ok(())
}
pub fn create_market(ctx: Context<CreateMarket>) -> Result<()> {
    Ok(())
}
```

**testing-engine program:**
```rust
pub struct CurveState { ... }
pub struct UserPosition { ... }

pub fn place_bet(ctx: Context<PlaceBet>) -> Result<()> {
    Ok(())
}
```

**resolution-manager program:**
```rust
pub struct Resolution { ... }
pub struct DisputeWindow { ... }

pub fn propose_resolution(ctx: Context<ProposeResolution>) -> Result<()> {
    Ok(())
}
```

**governance program:**
```rust
pub struct Parameter { ... }
pub enum RoleType { ... }

pub fn set_parameter(ctx: Context<SetParameter>) -> Result<()> {
    Ok(())
}
```

#### Testing
```bash
# Build all programs
anchor build

# Run unit tests
anchor test

# Deploy to local validator
solana-test-validator --reset &
anchor deploy --provider.cluster localnet
```

#### Success Criteria
✅ All programs compile without errors
✅ Basic tests passing
✅ Can deploy to local validator
✅ PDAs derive correctly

---

### **WEEK 3-4: Core Solana Programs Implementation**
**Focus:** Complete program logic and testing

#### Deliverables
- [ ] market-factory fully implemented
- [ ] trading-engine with LMSR math
- [ ] resolution-manager with dispute logic
- [ ] governance with access control
- [ ] Unit tests for all instructions (80%+ coverage)
- [ ] Integration tests for cross-program calls
- [ ] Programs deployed to devnet

#### Week 3: market-factory + governance

**market-factory:**
- [x] `initialize()` - Set up config with token mint
- [x] `create_market()` - Create proposal with bond
- [x] `approve_market()` - Move PROPOSED → APPROVED
- [x] `activate_market()` - Move APPROVED → ACTIVE
- [x] `close_market()` - Move ACTIVE → RESOLVING
- [x] Event emissions for all state changes
- [x] Validation: bond amounts, end times, state transitions

**governance:**
- [x] `set_parameter()` - Update economic parameters
- [x] `grant_role()` - Assign roles (ADMIN, RESOLVER, BACKEND)
- [x] `revoke_role()` - Remove roles
- [x] Parameter guardrails (min/max validation)
- [x] Role-based access control checks

**Testing:**
```bash
# Run tests
anchor test programs/market-factory
anchor test programs/governance

# Deploy to devnet
anchor build --verifiable
anchor deploy --provider.cluster devnet
```

#### Week 4: trading-engine + resolution-manager

**trading-engine:**
- [x] LMSR cost function implementation
- [x] Binary search for share calculation
- [x] `place_bet()` - Buy shares with tokens
- [x] `calculate_shares()` - Preview shares for amount
- [x] `get_price()` - Get current YES/NO prices
- [x] Fee collection (10% total: 3/2/5 split)
- [x] CurveState updates after each trade
- [x] UserPosition tracking

**resolution-manager:**
- [x] `propose_resolution()` - Submit outcome + evidence
- [x] `record_dispute_vote()` - Update agree/disagree counts
- [x] `finalize_resolution()` - Lock outcome
- [x] `claim_payout()` - Distribute winnings
- [x] 48-hour dispute window logic
- [x] Auto-finalize if ≥75% agree
- [x] Auto-dispute if >50% disagree

**Testing:**
```bash
# LMSR math tests
anchor test programs/trading-engine -- --test-threads=1

# Resolution flow tests
anchor test programs/resolution-manager

# Integration tests (cross-program)
anchor test tests/integration/market-lifecycle.ts
```

#### Success Criteria
✅ All 4 programs deployed to devnet
✅ 80%+ unit test coverage
✅ Integration tests passing
✅ LMSR math verified with examples
✅ No compiler warnings

---

### **WEEK 5-6: Backend Services**
**Focus:** API, aggregation, and monitoring

#### Deliverables
- [ ] Express.js REST API operational
- [ ] Vote aggregator service running (cron)
- [ ] Market monitor (event listener) working
- [ ] SIWE authentication implemented
- [ ] Rate limiting middleware
- [ ] API documentation (OpenAPI/Swagger)

#### Week 5: REST API + Auth

**Setup:**
```bash
cd backend
pnpm init
pnpm add express typescript @types/express
pnpm add @solana/web3.js @project-serum/anchor
pnpm add siwe ethers
pnpm add dotenv cors helmet
```

**Endpoints:**
```typescript
// backend/src/api/routes/markets.ts
GET    /api/markets                    // List markets
GET    /api/markets/:id                // Get market
POST   /api/markets/:id/vote           // Vote on proposal

// backend/src/api/routes/discussions.ts
GET    /api/discussions/:marketId      // Get discussions
POST   /api/discussions                // Create discussion
POST   /api/discussions/:id/react      // Like/dislike

// backend/src/api/routes/auth.ts
POST   /api/auth/siwe                  // SIWE login
POST   /api/auth/twitter               // Twitter OAuth
GET    /api/user/profile               // User profile
```

**SIWE Authentication:**
```typescript
import { SiweMessage } from 'siwe';

app.post('/api/auth/siwe', async (req, res) => {
  const { message, signature } = req.body;

  const siweMessage = new SiweMessage(message);
  const { data: verified } = await siweMessage.verify({ signature });

  if (verified) {
    // Create session
    req.session.wallet = siweMessage.address;
    res.json({ success: true, wallet: siweMessage.address });
  } else {
    res.status(401).json({ error: 'Invalid signature' });
  }
});
```

**Rate Limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

#### Week 6: Aggregation + Monitoring

**Vote Aggregator (Cron Job):**
```typescript
// backend/src/aggregator/proposal-votes.ts
import cron from 'node-cron';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const pendingMarkets = await db.markets.findMany({
    where: { state: 'PROPOSED' }
  });

  for (const market of pendingMarkets) {
    const { likes, dislikes } = await db.proposal_votes.aggregate({
      where: { market_id: market.id },
      _count: { vote: true },
      _groupBy: ['vote']
    });

    const total = likes + dislikes;
    const likePercentage = (likes / total) * 100;

    if (likePercentage >= 70 && total >= 10) {
      // Trigger on-chain approval
      await program.methods
        .approveMarket(new PublicKey(market.on_chain_address))
        .accounts({ /* ... */ })
        .rpc();
    }
  }
});
```

**Event Monitor:**
```typescript
// backend/src/monitoring/event-listener.ts
import { Connection } from '@solana/web3.js';

const connection = new Connection(RPC_ENDPOINT);

connection.onLogs(
  new PublicKey(MARKET_FACTORY_PROGRAM_ID),
  async (logs) => {
    if (logs.logs.includes('MarketCreated')) {
      const event = parseEvent(logs);

      // Sync to database
      await db.markets.create({
        data: {
          id: event.marketId.toString(),
          on_chain_address: event.marketId.toString(),
          question: event.question,
          creator_wallet: event.creator.toString(),
          state: 'PROPOSED',
          created_at: new Date()
        }
      });

      // Create discussion thread
      await db.discussions.create({
        data: {
          market_id: event.marketId.toString(),
          phase: 'proposal',
          content: 'Market proposal discussion started',
          user_wallet: 'system'
        }
      });
    }
  }
);
```

#### Testing
```bash
# Start backend
cd backend
pnpm run dev

# Test API endpoints
curl http://localhost:3000/api/markets
curl -X POST http://localhost:3000/api/auth/siwe \
  -H "Content-Type: application/json" \
  -d '{"message": "...", "signature": "..."}'

# Test aggregator (manually trigger)
pnpm run aggregate:votes

# Test event listener
pnpm run monitor:events
```

#### Success Criteria
✅ All API endpoints working
✅ SIWE authentication functional
✅ Vote aggregator triggers on-chain calls
✅ Event listener syncs to database
✅ Rate limiting prevents spam
✅ API documented with Swagger

---

### **WEEK 7: Database Schema**
**Focus:** Supabase setup and complete schema

#### Deliverables
- [ ] Supabase project created
- [ ] Complete PostgreSQL schema
- [ ] Row-Level Security (RLS) policies
- [ ] Indexes for performance
- [ ] Migration scripts
- [ ] Database seeded with test data

#### Database Setup

**Create Supabase Project:**
1. Go to https://supabase.com
2. Create new project: "zmart-v069"
3. Save database URL and anon key
4. Configure environment variables

**Schema Creation:**
```sql
-- See docs/08_DATABASE_SCHEMA.md for complete schema
-- Key tables:
CREATE TABLE users (...);
CREATE TABLE markets (...);
CREATE TABLE discussions (...);
CREATE TABLE proposal_votes (...);
CREATE TABLE dispute_votes (...);
CREATE TABLE content_flags (...);
CREATE TABLE ipfs_anchors (...);
CREATE TABLE rate_limits (...);
```

**RLS Policies:**
```sql
-- Enable RLS
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

-- Public read for non-deleted, non-flagged discussions
CREATE POLICY "Public discussions readable" ON discussions
  FOR SELECT
  USING (deleted_at IS NULL AND flagged = FALSE);

-- Users can only insert their own discussions
CREATE POLICY "Users can create discussions" ON discussions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_wallet);
```

**Indexes:**
```sql
CREATE INDEX idx_markets_state ON markets(state);
CREATE INDEX idx_markets_creator ON markets(creator_wallet);
CREATE INDEX idx_discussions_market ON discussions(market_id, created_at DESC);
CREATE INDEX idx_users_reputation ON users(reputation_score DESC);
```

**Seed Data:**
```sql
-- Insert test markets
INSERT INTO markets (...) VALUES (...);

-- Insert test users
INSERT INTO users (...) VALUES (...);

-- Insert test discussions
INSERT INTO discussions (...) VALUES (...);
```

#### Testing
```bash
# Test database connection
psql "postgresql://user:pass@host/db"

# Run migrations
pnpm run db:migrate

# Seed test data
pnpm run db:seed

# Test RLS policies
-- Try inserting as different users
-- Verify permissions work correctly
```

#### Success Criteria
✅ All tables created
✅ RLS policies active and tested
✅ Indexes created for performance
✅ Test data seeded
✅ Connection from backend works
✅ Migrations reproducible

---

### **WEEK 8-9: Comprehensive Testing**
**Focus:** Unit, integration, load, and security testing

#### Deliverables
- [ ] 95%+ unit test coverage
- [ ] Integration tests for full workflows
- [ ] Load test: 1000 concurrent users
- [ ] Security tests passed
- [ ] Performance benchmarks met
- [ ] Bug fixes from testing

#### Week 8: Unit + Integration Testing

**Unit Tests (Anchor Programs):**
```bash
# Test each program individually
anchor test programs/market-factory
anchor test programs/trading-engine
anchor test programs/resolution-manager
anchor test programs/governance

# Coverage report
anchor test --coverage
# Target: 95%+ coverage
```

**Integration Tests:**
```typescript
// tests/integration/market-lifecycle.test.ts
describe('Complete Market Lifecycle', () => {
  it('should create, approve, trade, resolve market', async () => {
    // 1. Create market
    const marketId = await createMarket(...);

    // 2. Vote and approve
    await voteOnProposal(marketId, true);
    // Wait for aggregator
    await waitForState(marketId, 'APPROVED');

    // 3. Place bets
    await placeBet(marketId, 'YES', 100);
    await placeBet(marketId, 'NO', 50);

    // 4. Resolve
    await proposeResolution(marketId, 'YES');
    await waitForDisputeWindow();
    await finalizeResolution(marketId);

    // 5. Claim payout
    const payout = await claimPayout(marketId);
    expect(payout).toBeGreaterThan(0);
  });
});
```

**Backend Tests (Jest):**
```typescript
// backend/tests/api.test.ts
describe('API Endpoints', () => {
  it('GET /api/markets should return markets', async () => {
    const res = await request(app).get('/api/markets');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('POST /api/discussions should create discussion', async () => {
    const res = await request(app)
      .post('/api/discussions')
      .send({ market_id: '...', content: 'Test' });
    expect(res.status).toBe(201);
  });
});
```

#### Week 9: Load + Security Testing

**Load Testing (k6):**
```javascript
// tests/load/concurrent-trades.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
};

export default function () {
  const res = http.post('http://api.zmart.io/api/markets/123/bet', {
    outcome: 'YES',
    amount: 10,
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

**Security Testing:**
```bash
# Anchor security audit
anchor audit

# Check for common vulnerabilities
cargo audit

# Manual security checklist
# - Test privilege escalation
# - Test reentrancy protection
# - Test integer overflow/underflow
# - Test account validation
# - Test PDA derivation
```

**Benchmarks:**
```bash
# Program compute units
anchor test --show-compute-units
# Target: <200k per instruction

# API response time
wrk -t12 -c400 -d30s http://localhost:3000/api/markets
# Target: <200ms p95

# Database query time
EXPLAIN ANALYZE SELECT * FROM markets WHERE state = 'ACTIVE';
# Target: <50ms
```

#### Success Criteria
✅ 95%+ test coverage
✅ All integration tests passing
✅ Load test: 1000 users without errors
✅ API response time <200ms (p95)
✅ No critical security vulnerabilities
✅ All compute units <200k

---

### **WEEK 10: Security Audit & Documentation**
**Focus:** External audit and complete docs

#### Deliverables
- [ ] Security audit completed
- [ ] All critical/high issues fixed
- [ ] API documentation complete (Swagger/OpenAPI)
- [ ] Integration guide for frontend
- [ ] Deployment guide updated
- [ ] Backend phase complete ✅

#### Security Audit

**Option 1: Self-Audit (Free)**
```bash
# Automated tools
anchor audit
cargo audit
semgrep --config=auto

# Manual checklist from docs/14_SECURITY_AUDIT.md
# Review all:
# - Account validation
# - Access control
# - Arithmetic operations
# - PDA derivations
# - Token transfers
```

**Option 2: Professional Audit ($15K)**
- Hire: OtterSec, Neodyme, or Sec3
- Duration: 2-3 weeks
- Deliverable: Audit report with findings
- Required: Fix all critical + high issues

#### Documentation Completion

**API Documentation (Swagger):**
```yaml
# backend/swagger.yaml
openapi: 3.0.0
info:
  title: ZMART API
  version: 1.0.0
paths:
  /api/markets:
    get:
      summary: List all markets
      parameters:
        - name: state
          in: query
          schema:
            type: string
            enum: [PROPOSED, ACTIVE, RESOLVING]
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Market'
```

**Frontend Integration Guide:**
```markdown
# docs/FRONTEND_INTEGRATION.md

## Getting Started
1. Connect wallet with @solana/wallet-adapter
2. Initialize program with IDL
3. Call instructions
4. Listen to events

## Example: Place Bet
```typescript
const tx = await program.methods
  .placeBet(marketId, outcome, amount)
  .accounts({ ... })
  .rpc();
```

## API Endpoints
See swagger.yaml for complete reference.
```

#### Deployment to Devnet

```bash
# Final devnet deployment
anchor build --verifiable
anchor deploy --provider.cluster devnet

# Verify program IDs match
anchor keys list

# Initialize programs with test token
anchor run initialize-devnet

# Update documentation with deployed addresses
```

#### Phase 1 Sign-Off Checklist

- [ ] All programs deployed to devnet
- [ ] All backend services running on staging
- [ ] Database fully migrated and tested
- [ ] 95%+ test coverage
- [ ] Security audit completed (no critical issues)
- [ ] Load test passed (1000+ concurrent users)
- [ ] API documentation complete
- [ ] Frontend integration guide ready
- [ ] Devnet test tokens distributed
- [ ] Monitoring and logging operational

**🎉 BACKEND PHASE COMPLETE! Ready for frontend development.**

---

## 🎨 PHASE 2: FRONTEND EXCELLENCE (Weeks 11-16)

### **WEEK 11: Pump.fun Launch + UI/UX Design**
**Focus:** Token launch and design mockups

#### Deliverables
- [ ] 🚀 Pump.fun token launched
- [ ] Complete UI/UX designs in Figma
- [ ] Design system defined
- [ ] Component library planned
- [ ] User flows designed
- [ ] Accessibility reviewed

#### Token Launch Strategy

**Pre-Launch (Days 1-2):**
- Create social media accounts (Twitter, Discord)
- Build hype with teasers
- Create launch announcement
- Prepare marketing materials

**Launch Day (Day 3):**
- Launch token on pump.fun
- Initial bonding curve phase
- Community building begins
- Save token mint address

**Post-Launch (Days 4-7):**
- Monitor bonding curve progress
- Engage with community
- Share platform roadmap
- Prepare for graduation to Raydium

#### UI/UX Design

**Figma Workspace:**
- Landing page (hero, features, stats)
- Market list (filters, search, categories)
- Market detail (chart, trading, discussions)
- Portfolio (positions, P&L, history)
- User profile (stats, reputation, settings)
- Admin dashboard (flags, stats, controls)

**Design System:**
```
Colors:
- Primary: #6366F1 (indigo)
- Success: #10B981 (green - wins)
- Error: #EF4444 (red - losses)
- Neutral: Tailwind grays

Typography:
- Headings: Inter Bold
- Body: Inter Regular
- Mono: JetBrains Mono (addresses, numbers)

Components:
- Buttons (primary, secondary, ghost, danger)
- Cards (market, stat, position)
- Forms (inputs, dropdowns, checkboxes)
- Charts (line, bar, pie)
- Modals (confirm, alert, info)
- Toasts (success, error, info)
```

**Accessibility Review:**
- WCAG 2.1 AA compliance
- Color contrast ratios >4.5:1
- Keyboard navigation
- Screen reader support

#### Success Criteria
✅ Token launched successfully
✅ Complete design mockups approved
✅ Design system documented
✅ Accessibility plan in place

---

### **WEEK 12-13: Core Frontend Build**
**Focus:** Next.js application with wallet integration

#### Deliverables
- [ ] Next.js 14 app initialized
- [ ] Wallet integration (multiple wallets)
- [ ] Core pages implemented
- [ ] API integration working
- [ ] Real-time updates (WebSocket)
- [ ] Responsive mobile design

#### Week 12: Setup + Core Pages

**Next.js Setup:**
```bash
pnpm create next-app@latest frontend --typescript --tailwind --app
cd frontend

# Install dependencies
pnpm add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
pnpm add @solana/wallet-adapter-wallets
pnpm add @solana/web3.js @project-serum/anchor
pnpm add @tanstack/react-query
pnpm add framer-motion
pnpm add recharts
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

**Wallet Integration:**
```typescript
// app/providers.tsx
'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ConnectionProvider } from '@solana/wallet-adapter-react';

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={process.env.NEXT_PUBLIC_RPC_ENDPOINT!}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

**Core Pages:**
```
app/
├── (marketing)/
│   ├── page.tsx                # Landing page
│   └── layout.tsx
├── (app)/
│   ├── markets/
│   │   ├── page.tsx            # Market list
│   │   ├── [id]/page.tsx       # Market detail
│   │   └── create/page.tsx     # Create market
│   ├── portfolio/
│   │   └── page.tsx            # User positions
│   └── layout.tsx              # App layout with navbar
```

#### Week 13: Trading UI + Discussions

**Trading Interface:**
```typescript
// app/(app)/markets/[id]/components/TradingPanel.tsx
export function TradingPanel({ marketId }: { marketId: string }) {
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');

  const { data: shares } = useQuery({
    queryKey: ['calculate-shares', marketId, amount],
    queryFn: () => calculateShares(marketId, outcome, amount),
  });

  async function handlePlaceBet() {
    const tx = await program.methods
      .placeBet(new PublicKey(marketId), outcome === 'YES' ? 1 : 0, parseFloat(amount))
      .accounts({ /* ... */ })
      .rpc();

    toast.success('Bet placed successfully!');
  }

  return (
    <Card>
      <Tabs value={outcome} onValueChange={setOutcome}>
        <TabsList>
          <TabsTrigger value="YES">YES {yesPrice}%</TabsTrigger>
          <TabsTrigger value="NO">NO {noPrice}%</TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount to bet"
      />

      {shares && (
        <p>You'll receive approximately {shares} shares</p>
      )}

      <Button onClick={handlePlaceBet}>
        Place Bet
      </Button>
    </Card>
  );
}
```

**Discussion Component:**
```typescript
// app/(app)/markets/[id]/components/Discussions.tsx
export function Discussions({ marketId }: { marketId: string }) {
  const { data: discussions } = useQuery({
    queryKey: ['discussions', marketId],
    queryFn: () => fetch(`/api/discussions/${marketId}`).then(r => r.json()),
  });

  return (
    <div>
      {discussions?.map(d => (
        <DiscussionCard key={d.id} discussion={d} />
      ))}
      <CommentInput marketId={marketId} />
    </div>
  );
}
```

#### Success Criteria
✅ All core pages implemented
✅ Wallet connection working
✅ Can create markets
✅ Can place bets
✅ Discussions loading
✅ Mobile responsive

---

### **WEEK 14-15: Polish & Animations**
**Focus:** Beautiful UX and performance

#### Deliverables
- [ ] Smooth animations (60fps)
- [ ] Loading states for all async actions
- [ ] Error handling with recovery
- [ ] Performance optimized (<500kb bundle)
- [ ] Lighthouse score >90
- [ ] Dark mode support

#### Week 14: Animations + Micro-interactions

**Page Transitions:**
```typescript
// Using Framer Motion
import { motion } from 'framer-motion';

export default function MarketPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page content */}
    </motion.div>
  );
}
```

**Loading States:**
```typescript
// Skeleton loaders
export function MarketCardSkeleton() {
  return (
    <Card>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full" />
    </Card>
  );
}
```

**Success Feedback:**
```typescript
// Confetti on win
import confetti from 'canvas-confetti';

function celebrateWin() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}
```

#### Week 15: Performance Optimization

**Bundle Analysis:**
```bash
pnpm add @next/bundle-analyzer
pnpm run build
pnpm run analyze
# Target: <500kb initial bundle
```

**Code Splitting:**
```typescript
// Dynamic imports
const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => <Skeleton />
});
```

**Image Optimization:**
```typescript
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

**Lighthouse Optimization:**
- Performance >90
- Accessibility >90
- Best Practices >90
- SEO >90

#### Success Criteria
✅ Smooth 60fps animations
✅ All loading states implemented
✅ Bundle size <500kb
✅ Lighthouse score >90
✅ Dark mode working
✅ Feels fast and responsive

---

### **WEEK 16: Testing & Launch Prep**
**Focus:** Final testing and mainnet deployment

#### Deliverables
- [ ] E2E tests passing (Playwright)
- [ ] Cross-browser testing complete
- [ ] Mobile device testing done
- [ ] User acceptance testing passed
- [ ] Mainnet deployment successful
- [ ] Monitoring active
- [ ] 🚀 LAUNCH!

#### Testing

**E2E Tests (Playwright):**
```typescript
// tests/e2e/market-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test('complete market lifecycle', async ({ page }) => {
  // Connect wallet
  await page.goto('/');
  await page.click('button:has-text("Connect Wallet")');

  // Create market
  await page.goto('/markets/create');
  await page.fill('input[name="question"]', 'Will BTC reach $100k?');
  await page.selectOption('select[name="category"]', 'crypto');
  await page.click('button:has-text("Create Market")');

  // Wait for confirmation
  await expect(page.locator('.toast-success')).toBeVisible();

  // Place bet
  await page.click('button:has-text("YES")');
  await page.fill('input[name="amount"]', '100');
  await page.click('button:has-text("Place Bet")');

  // Verify position
  await page.goto('/portfolio');
  await expect(page.locator('.position-card')).toContainText('BTC reach $100k');
});
```

**Cross-Browser Testing:**
- Chrome
- Firefox
- Safari
- Edge
- Mobile Safari
- Mobile Chrome

**Device Testing:**
- iPhone 12/13/14
- Samsung Galaxy S21/S22
- iPad
- Desktop (1920x1080, 1366x768)

#### Mainnet Deployment

**Environment Setup:**
```bash
# Update .env.production
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_ENDPOINT=https://your-rpc-endpoint.com
NEXT_PUBLIC_MAINNET_TOKEN_MINT=<REAL_PUMP_FUN_TOKEN>
NEXT_PUBLIC_PROGRAM_ID_MARKET_FACTORY=<DEPLOYED_ADDRESS>
# etc.
```

**Deploy Programs:**
```bash
# Build verifiable
anchor build --verifiable

# Deploy to mainnet (CAREFUL!)
anchor deploy --provider.cluster mainnet-beta

# Initialize with REAL token
anchor run initialize-mainnet
```

**Deploy Frontend:**
```bash
# Build production
pnpm run build

# Deploy to Vercel
vercel --prod
```

**Deploy Backend:**
```bash
# Deploy to Railway/Fly.io
railway up
# or
fly deploy
```

#### Launch Checklist

- [ ] All programs deployed to mainnet
- [ ] Programs initialized with real token
- [ ] Frontend deployed and accessible
- [ ] Backend services running
- [ ] Database backed up
- [ ] Monitoring active (Sentry, DataDog)
- [ ] Social media accounts ready
- [ ] Marketing campaign launched
- [ ] Community notified
- [ ] Team on call for support

**🚀 LAUNCH DAY!**

---

## 📊 MILESTONES & GATES

### Milestone 1: Backend Complete (Week 10)
**Gate:** Cannot start frontend without backend API ready
**Deliverable:** API documentation + integration guide

### Milestone 2: Token Launch (Week 11)
**Gate:** Need token address before mainnet deployment
**Deliverable:** Pump.fun token mint address

### Milestone 3: Mainnet Launch (Week 16)
**Gate:** All testing must pass before mainnet
**Deliverable:** Production-ready platform

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- [ ] 95%+ test coverage
- [ ] <200ms API response time (p95)
- [ ] <2s page load time
- [ ] 99.9%+ uptime
- [ ] Zero critical security vulnerabilities

### Business Metrics
- [ ] 100+ users in Week 1
- [ ] 1,000+ users in Month 1
- [ ] 50+ markets created
- [ ] $100K+ trading volume
- [ ] 90%+ market resolution accuracy

---

## 📞 NEXT STEPS

**Immediate Actions:**
1. Review this roadmap with team
2. Assign roles and responsibilities
3. Set up project management (Linear, Jira)
4. Begin Week 1 tasks
5. Schedule daily standups

**Questions to Answer:**
- Who owns each program?
- Who handles backend vs frontend?
- When can we start?
- What's the budget?
- Who's on call for launch?

---

**Ready to build? Let's start Week 1!** 🚀
