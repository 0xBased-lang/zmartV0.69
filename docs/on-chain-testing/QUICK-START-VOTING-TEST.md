# Quick Start: Comprehensive Voting System Test

**Purpose:** Step-by-step guide to execute and document the voting system test.
**Duration:** ~5-10 minutes
**Prerequisites:** Solana CLI configured for devnet, program deployed

---

## Overview

This test will:
1. ✅ Initialize GlobalConfig PDA (if needed)
2. ✅ Create a test market in PROPOSED state
3. ✅ Submit 10 proposal votes (7 like, 3 dislike)
4. ✅ Aggregate votes via backend authority
5. ✅ Verify market transitions to APPROVED state
6. 📝 Document every transaction in exhaustive detail

---

## Pre-Flight Checklist

### 1. Check Solana Configuration
```bash
solana config get
```

**Expected output:**
```
RPC URL: https://api.devnet.solana.com
Keypair Path: ~/.config/solana/id.json
Commitment: confirmed
```

### 2. Check Devnet Balance
```bash
solana balance --url devnet
```

**Minimum required:** 2 SOL (for rent + transaction fees)

If balance is low:
```bash
solana airdrop 2 --url devnet
```

### 3. Verify Program Deployment
```bash
solana program show 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet
```

**Expected:** Program should exist with ~411 KB size

---

## Option 1: Automated Test Execution (Recommended)

### Step 1: Navigate to Project Root
```bash
cd /Users/seman/Desktop/zmartV0.69
```

### Step 2: Compile Test Script
```bash
npx ts-node backend/scripts/on-chain-test-voting-system.ts
```

### Step 3: Monitor Output
The script will print detailed progress:
- Transaction signatures
- Compute units used
- State changes
- Validation results
- Inconsistencies detected

### Step 4: Review Results
Results automatically saved to:
```
docs/on-chain-testing/03-TEST-RESULTS/{date}/TEST-{timestamp}.json
```

---

## Option 2: Manual Step-by-Step Execution

If automated script fails, follow these manual steps:

### Step 1: Initialize GlobalConfig (if needed)

**Check if exists:**
```bash
# Get GlobalConfig PDA address
# Seed: "global_config"
# Program: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
# Expected PDA: [Calculate using findProgramAddressSync]

solana account <GLOBAL_CONFIG_PDA> --url devnet
```

**If not found, initialize:**
```bash
anchor test --skip-build --skip-deploy -- --grep "initialize global config"
```

**Document:**
- Transaction signature
- Compute units
- Rent amount
- PDA address

### Step 2: Create Test Market

**Command:**
```bash
# Using backend scripts
npm run script:create-market-onchain
```

**Or manual Anchor test:**
```typescript
// tests/integration/create-market.spec.ts
const marketId = Keypair.generate().publicKey.toBytes().slice(0, 32);
const [marketPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("market"), Buffer.from(marketId)],
  PROGRAM_ID
);

const tx = await program.methods
  .createMarket(
    Array.from(marketId),
    new BN(1000_000_000_000), // b_parameter
    new BN(1000_000_000_000), // initial_liquidity
    Array.from(ipfsHash)
  )
  .accounts({
    market: marketPDA,
    globalConfig: globalConfigPDA,
    creator: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

**Document:**
- Market PDA address
- Transaction signature
- Market ID (32 bytes)
- LMSR parameters (b, initial liquidity)
- Initial state (should be PROPOSED)

### Step 3: Submit 10 Votes

**For each of 10 voters:**

```typescript
// Generate voter keypair
const voter = Keypair.generate();

// Airdrop SOL
const airdropSig = await connection.requestAirdrop(
  voter.publicKey,
  0.1 * LAMPORTS_PER_SOL
);
await connection.confirmTransaction(airdropSig);

// Calculate VoteRecord PDA
const [voteRecordPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vote_record"),
    marketPDA.toBuffer(),
    voter.publicKey.toBuffer(),
    Buffer.from("proposal"),
  ],
  PROGRAM_ID
);

// Submit vote
const vote = i < 7; // true for first 7 (like), false for last 3 (dislike)
const txVote = await program.methods
  .submitProposalVote(vote)
  .accounts({
    voteRecord: voteRecordPDA,
    market: marketPDA,
    voter: voter.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([voter])
  .rpc();
```

**For each vote, document:**
- Voter address
- Vote value (true/false)
- VoteRecord PDA
- Transaction signature
- Compute units
- Confirmation time

**Vote distribution:**
- Votes 1-7: LIKE (vote = true)
- Votes 8-10: DISLIKE (vote = false)

### Step 4: Aggregate Votes

```typescript
const txAggregate = await program.methods
  .aggregateProposalVotes(7, 3) // 7 likes, 3 dislikes
  .accounts({
    market: marketPDA,
    globalConfig: globalConfigPDA,
    backendAuthority: wallet.publicKey, // Must match GlobalConfig backend_authority
  })
  .rpc();
```

**Document:**
- Transaction signature
- Final vote counts (7 likes, 3 dislikes)
- Approval percentage (70%)
- Market state before (PROPOSED)
- Market state after (should be APPROVED)

### Step 5: Verify Market State

```typescript
const marketAccount = await program.account.marketAccount.fetch(marketPDA);
console.log("Market state:", marketAccount.state);
console.log("Proposal likes:", marketAccount.proposalLikes);
console.log("Proposal dislikes:", marketAccount.proposalDislikes);
```

**Expected values:**
```json
{
  "state": { "approved": {} },
  "proposalLikes": 7,
  "proposalDislikes": 3
}
```

**Validate:**
- ✅ State is `{ approved: {} }` (enum variant)
- ✅ Proposal likes = 7
- ✅ Proposal dislikes = 3
- ✅ Approval percentage >= 70% (threshold from GlobalConfig)

---

## Documentation Requirements

For **EVERY** transaction, capture:

### Transaction Metadata
```json
{
  "signature": "[64-char hex]",
  "slot": 123456789,
  "blockTime": 1699564800,
  "confirmationStatus": "confirmed"
}
```

### Compute Units
```json
{
  "consumed": 5432,
  "limit": 200000,
  "efficiency": "2.7%"
}
```

### Fees
```json
{
  "lamports": 5000,
  "sol": 0.000005
}
```

### State Changes
```json
{
  "before": {
    "account": "[PDA address]",
    "lamports": 1500000,
    "exists": false
  },
  "after": {
    "account": "[PDA address]",
    "lamports": 1500000,
    "exists": true
  },
  "delta": {
    "lamports": 1500000,
    "created": true
  }
}
```

### Logs
```
Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS invoke [1]
Program log: Instruction: SubmitProposalVote
Program log: Vote recorded: user=4Mkyb..., vote=true
Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS consumed 5432 of 200000 compute units
Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS success
```

### Validation
- ✅ Expected outcome
- ✅ Actual outcome
- ✅ Match: true/false
- ⚠️ Inconsistencies detected (if any)

---

## Common Issues and Solutions

### Issue 1: "Account already exists" (VoteRecord)
**Cause:** User already voted on this market proposal
**Solution:** Use a new voter keypair

### Issue 2: "Unauthorized" on aggregate_proposal_votes
**Cause:** Caller is not backend_authority from GlobalConfig
**Solution:** Ensure signer matches GlobalConfig.backend_authority

### Issue 3: "Invalid state for voting"
**Cause:** Market not in PROPOSED state
**Solution:** Create a new market or check current market state

### Issue 4: Transaction timeout
**Cause:** Network congestion or high compute usage
**Solution:** Retry with higher priority fee or wait for network to clear

### Issue 5: Insufficient SOL balance
**Cause:** Voter wallet has < 0.01 SOL
**Solution:** Airdrop 0.1 SOL to voter before submitting vote

---

## Results Verification Checklist

After test execution, verify:

- [ ] GlobalConfig PDA exists with correct backend_authority
- [ ] Market PDA created in PROPOSED state
- [ ] 10 VoteRecord PDAs created (7 with vote=true, 3 with vote=false)
- [ ] Market state transitioned to APPROVED after aggregation
- [ ] Market.proposal_likes = 7
- [ ] Market.proposal_dislikes = 3
- [ ] All transaction signatures saved
- [ ] All compute units documented
- [ ] All state changes recorded
- [ ] No critical inconsistencies detected
- [ ] Results saved to docs/on-chain-testing/03-TEST-RESULTS/

---

## Next Steps

After successful voting test:

1. **Test Dispute Voting** (similar workflow for DISPUTED state)
2. **Load Testing** (100+ voters in parallel)
3. **Edge Cases** (50/50 split, 100% approval, 0% approval)
4. **Security Tests** (duplicate votes, unauthorized aggregation)
5. **Integration Tests** (backend vote-aggregator service)

---

## Quick Reference: PDAs and Seeds

### GlobalConfig
```
Seeds: ["global_config"]
Program: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

### Market
```
Seeds: ["market", market_id (32 bytes)]
Program: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

### VoteRecord (Proposal)
```
Seeds: ["vote_record", market_pubkey, voter_pubkey, "proposal"]
Program: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

### VoteRecord (Dispute)
```
Seeds: ["vote_record", market_pubkey, voter_pubkey, "dispute"]
Program: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

---

## Contact and Support

**Issues:** Create detailed issue in GitHub with:
- Test ID
- Transaction signatures
- Error messages
- Expected vs actual behavior

**Documentation:** All test results saved in docs/on-chain-testing/

**Quick Commands:**
```bash
# View latest test results
ls -lt docs/on-chain-testing/03-TEST-RESULTS/*/TEST-*.json | head -1 | xargs cat | jq

# Find all failed transactions
grep -r "\"status\": \"failed\"" docs/on-chain-testing/03-TEST-RESULTS/

# Count total tests run
find docs/on-chain-testing/03-TEST-RESULTS/ -name "TEST-*.json" | wc -l
```

---

**Last Updated:** November 8, 2025
**Test Version:** 1.0.0
**Program Version:** 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
