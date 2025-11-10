# On-Chain Test Data

**Purpose:** Centralized repository of all test data including wallets, markets, and sample transactions.
**Network:** Solana Devnet
**Last Updated:** November 8, 2025

## Test Wallets

### Authority Wallets

#### Program Authority
```json
{
  "name": "Program Authority",
  "publicKey": "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
  "role": "Program upgrade authority and admin",
  "balance": "10 SOL",
  "usage": "Deploy programs, upgrade authority, admin functions"
}
```

#### Backend Authority
```json
{
  "name": "Backend Authority",
  "publicKey": "TODO_AFTER_GENERATION",
  "keypairPath": "~/.config/solana/backend-authority.json",
  "role": "Backend service operations",
  "balance": "5 SOL",
  "usage": "Vote aggregation, market monitoring"
}
```

### Test User Wallets

#### Creator Wallet 1
```json
{
  "name": "Market Creator 1",
  "publicKey": "TODO_AFTER_GENERATION",
  "role": "Market creator",
  "balance": "2 SOL, 1000 USDC",
  "usage": "Create test markets",
  "markets_created": []
}
```

#### Trader Wallet 1
```json
{
  "name": "Trader Alice",
  "publicKey": "TODO_AFTER_GENERATION",
  "role": "Active trader",
  "balance": "1 SOL, 5000 USDC",
  "usage": "Buy/sell shares",
  "positions": []
}
```

#### Trader Wallet 2
```json
{
  "name": "Trader Bob",
  "publicKey": "TODO_AFTER_GENERATION",
  "role": "Active trader",
  "balance": "1 SOL, 5000 USDC",
  "usage": "Buy/sell shares",
  "positions": []
}
```

#### Oracle Wallet
```json
{
  "name": "Oracle Authority",
  "publicKey": "TODO_AFTER_GENERATION",
  "role": "Market resolution oracle",
  "balance": "1 SOL",
  "usage": "Resolve markets",
  "markets_resolved": []
}
```

#### Voter Wallets (10)
```json
{
  "name": "Voter 1-10",
  "publicKeys": [],
  "role": "Proposal/dispute voters",
  "balance": "0.5 SOL each",
  "usage": "Vote on proposals and disputes"
}
```

---

## Test Markets

### Standard Test Markets

#### Market 1: Simple Binary
```typescript
{
  id: "market-001",
  title: "Will ETH reach $5000 by Dec 2025?",
  description: "Resolution based on CoinGecko spot price at 00:00 UTC Dec 31, 2025",
  category: "CRYPTO",
  tags: ["ethereum", "price", "prediction"],
  creator: "CreatorWallet1",
  oracle: "OracleWallet",
  lmsrB: 1000_000_000_000, // 1000 USDC liquidity
  resolutionTime: "2025-12-31T00:00:00Z",
  state: "ACTIVE",
  currentPrices: {
    yes: 0.45,
    no: 0.55
  },
  volume: 50000_000_000_000, // 50,000 USDC
  trades: 234
}
```

#### Market 2: High Liquidity
```typescript
{
  id: "market-002",
  title: "Will Biden win 2024 election?",
  lmsrB: 100000_000_000_000, // 100,000 USDC liquidity
  // ... other fields
}
```

#### Market 3: Low Liquidity
```typescript
{
  id: "market-003",
  title: "Will it rain tomorrow in SF?",
  lmsrB: 100_000_000_000, // 100 USDC liquidity
  // ... other fields
}
```

### Edge Case Markets

#### Market 4: Near Resolution
```typescript
{
  id: "market-edge-001",
  title: "Expires in 1 hour",
  resolutionTime: Date.now() + 3600 * 1000,
  state: "ACTIVE"
}
```

#### Market 5: Maximum Parameters
```typescript
{
  id: "market-edge-002",
  title: "A".repeat(200), // Max title length
  description: "B".repeat(1000), // Max description
  lmsrB: 1000000_000_000_000, // 1M USDC (max liquidity)
  tags: Array(10).fill("tag"), // Max tags
}
```

#### Market 6: Minimum Parameters
```typescript
{
  id: "market-edge-003",
  title: "Min",
  description: "",
  lmsrB: 10_000_000_000, // 10 USDC (min liquidity)
  tags: []
}
```

### State Test Markets

#### Market 7: PROPOSED State
```typescript
{
  id: "market-state-001",
  state: "PROPOSED",
  proposalVotes: { likes: 45, dislikes: 10 }
}
```

#### Market 8: RESOLVING State
```typescript
{
  id: "market-state-002",
  state: "RESOLVING",
  resolvedOutcome: "YES",
  resolutionTime: Date.now() - 24 * 3600 * 1000, // 24 hours ago
  disputeDeadline: Date.now() + 24 * 3600 * 1000 // 24 hours remaining
}
```

#### Market 9: DISPUTED State
```typescript
{
  id: "market-state-003",
  state: "DISPUTED",
  disputeReason: "Oracle provided incorrect outcome",
  disputeVotes: {
    supportOriginal: 120,
    supportDispute: 89
  }
}
```

#### Market 10: FINALIZED State
```typescript
{
  id: "market-state-004",
  state: "FINALIZED",
  finalOutcome: "NO",
  totalPayout: 45000_000_000_000, // 45,000 USDC
  winnersClaimed: 34,
  losersClaimed: 0
}
```

---

## Sample Transactions

### Successful Transactions

#### Buy Transaction
```json
{
  "signature": "4xY9k2...",
  "blockTime": 1699401234,
  "slot": 123456789,
  "type": "BUY_SHARES",
  "data": {
    "market": "market-001",
    "buyer": "TraderAlice",
    "outcome": "YES",
    "shares": 100_000_000_000,
    "cost": 52_345_000_000,
    "fees": 5_234_500_000,
    "priceImpact": 0.023
  },
  "computeUnits": 145_234,
  "fee": 5000,
  "logs": [
    "Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS invoke [1]",
    "Program log: Instruction: BuyShares",
    "Program log: LMSR cost calculated: 52345000000",
    "Program log: Fees deducted: 5234500000",
    "Program log: Shares purchased: 100000000000",
    "Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS consumed 145234 compute units",
    "Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS success"
  ]
}
```

#### Sell Transaction
```json
{
  "signature": "2bZ8m9...",
  "type": "SELL_SHARES",
  "data": {
    "market": "market-001",
    "seller": "TraderBob",
    "outcome": "NO",
    "shares": 50_000_000_000,
    "proceeds": 48_123_000_000,
    "fees": 4_812_300_000
  }
}
```

#### Vote Aggregation Transaction
```json
{
  "signature": "9kL3x2...",
  "type": "AGGREGATE_PROPOSAL_VOTES",
  "data": {
    "market": "market-007",
    "votesAggregated": 155,
    "likes": 112,
    "dislikes": 43,
    "thresholdMet": true,
    "newState": "APPROVED"
  }
}
```

### Failed Transactions

#### Slippage Exceeded
```json
{
  "signature": "5mN9p1...",
  "error": "SlippageExceeded",
  "type": "BUY_SHARES",
  "data": {
    "requestedShares": 1000_000_000_000,
    "maxCost": 500_000_000_000,
    "actualCost": 523_000_000_000
  },
  "logs": [
    "Program log: Error: Slippage protection triggered",
    "Program log: Max cost: 500000000000, Actual: 523000000000"
  ]
}
```

#### Unauthorized Access
```json
{
  "signature": "7qR4t6...",
  "error": "Unauthorized",
  "type": "APPROVE_MARKET",
  "data": {
    "market": "market-001",
    "signer": "RandomWallet",
    "requiredRole": "ADMIN"
  }
}
```

---

## Test Tokens

### USDC (Devnet)
```json
{
  "name": "USD Coin (Devnet)",
  "symbol": "USDC",
  "mint": "TODO_DEVNET_USDC_MINT",
  "decimals": 6,
  "faucet": "https://spl-token-faucet.com"
}
```

### Test Token Distribution
```typescript
const distributions = [
  { wallet: "TraderAlice", amount: 5000_000_000 },
  { wallet: "TraderBob", amount: 5000_000_000 },
  { wallet: "CreatorWallet1", amount: 1000_000_000 },
  { wallet: "MarketMaker1", amount: 10000_000_000 }
];
```

---

## Performance Baselines

### Transaction Times
```json
{
  "create_market": {
    "avg": 2.3,
    "p50": 2.1,
    "p95": 3.8,
    "p99": 5.2
  },
  "buy_shares": {
    "avg": 1.8,
    "p50": 1.6,
    "p95": 2.9,
    "p99": 4.1
  },
  "sell_shares": {
    "avg": 1.7,
    "p50": 1.5,
    "p95": 2.8,
    "p99": 3.9
  }
}
```

### Compute Units
```json
{
  "create_market": 234_567,
  "buy_shares": 145_234,
  "sell_shares": 142_123,
  "aggregate_votes": 567_890,
  "resolve_market": 89_012,
  "claim_winnings": 67_890
}
```

---

## Network Configuration

### Devnet RPC Endpoints
```json
{
  "primary": "https://api.devnet.solana.com",
  "helius": "https://devnet.helius-rpc.com/?api-key=YOUR_KEY",
  "quicknode": "https://YOUR_ENDPOINT.devnet.quiknode.pro/YOUR_KEY"
}
```

### Commitment Levels
```json
{
  "default": "confirmed",
  "critical": "finalized",
  "reading": "processed"
}
```

---

## Helper Scripts

### Generate Test Wallet
```bash
solana-keygen new --outfile ~/.config/solana/test-wallet-1.json
solana airdrop 2 <PUBLIC_KEY> --url devnet
```

### Fund with Test USDC
```typescript
async function fundWithUSDC(wallet: PublicKey, amount: number) {
  // Implementation in scripts/fund-test-wallet.ts
}
```

### Create Test Market
```typescript
async function createTestMarket(params: MarketParams) {
  // Implementation in scripts/create-test-market.ts
}
```

---

## Data Validation

### Checksums
All test data should be validated with checksums to ensure consistency:

```typescript
const validateTestData = (data: any): boolean => {
  const checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');

  return checksum === data.checksum;
};
```

---

**Note:** This document is automatically updated when new test data is generated. Do not manually edit wallet addresses or transaction signatures.

**Last Generated:** November 8, 2025
**Next Update:** When test wallets are created