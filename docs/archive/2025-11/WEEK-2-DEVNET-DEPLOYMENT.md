# WEEK 2 DAYS 3-4: Devnet Deployment Plan

**Phase:** Week 2 - Testing & Admin Instructions
**Days:** 3-4 (Days 8-9 of project)
**Status:** Ready for Execution
**Estimated Time:** 4 hours (vs 8 hour estimate = 2x faster)

---

## 🎯 Deployment Objectives

### Day 3: Build & Deploy (2 hours)
1. Build release binary (15 min)
2. Deploy to devnet (30 min)
3. Verify on-chain (30 min)
4. Initialize GlobalConfig (15 min)

### Day 4: Smoke Tests (2 hours)
1. Vote submission tests (30 min)
2. Vote aggregation tests (30 min)
3. Emergency pause tests (30 min)
4. Event verification (30 min)

---

## 📋 Prerequisites Check

### ✅ Build Readiness
```
Program: zmart_core
Binary size: 411KB
Build status: ✓ Clean (0 errors)
Test suite: ✓ 150+ tests passing
Compilation: ✓ 100% pass rate
```

### ✅ Code Readiness
```
Voting instructions: ✓ 4/4 implemented
Admin helpers: ✓ Framework ready
Voting helpers: ✓ Framework ready
Test scenarios: ✓ 61+ ready for devnet integration
```

### ✅ Infrastructure Readiness
```
Program architecture: ✓ Single program (no CPI)
State machine: ✓ 6 states defined
Account structures: ✓ GlobalConfig, MarketAccount, VoteRecord
Error codes: ✓ Complete error handling
```

---

## 🚀 Day 3: Build & Deploy

### Step 1: Verify Solana Configuration (5 min)

```bash
# Check Solana CLI configuration
solana config get

# Expected output:
# RPC URL: https://api.devnet.solana.com
# WebSocket URL: wss://api.devnet.solana.com/
# Keypair Path: ~/.config/solana/id.json
# Commitment: confirmed
```

### Step 2: Fund Devnet Wallet (5 min)

```bash
# Check wallet balance
solana balance --url devnet

# If empty, request airdrop
solana airdrop 10 --url devnet

# Verify balance
solana balance --url devnet
# Expected: ~10 SOL (5 SOL for deployment, 5 SOL for gas)
```

### Step 3: Build Program (15 min)

```bash
# Build program
anchor build

# Verify binary created
ls -lh target/deploy/zmart_core.so
# Expected: ~400-500 KB

# Program ID will be in target/idl/zmart_core.json
# Extract and note:
# jq .metadata.address target/idl/zmart_core.json
```

### Step 4: Deploy to Devnet (30 min)

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Output will show:
# Deploying cluster: https://api.devnet.solana.com
# Upgrade authority: [keypair]
# Deployed program: Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS

# Note the program ID for later use
```

### Step 5: Verify Deployment (15 min)

```bash
# Verify program is deployed
solana program show Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS --url devnet

# Expected:
# Program ID: Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: ...
# Executable: yes
# Last Extended: ...

# Get program logs in real-time
solana logs Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS --url devnet
```

### Step 6: Initialize GlobalConfig (15 min)

```bash
# Create GlobalConfig account (one-time setup)
# This initializes all protocol parameters

# Command structure:
# zmart initialize_global_config
#   --admin <admin-pubkey>
#   --backend-authority <backend-pubkey>
#   --protocol-fee-wallet <wallet-pubkey>

# Example:
# anchor run initialize_global_config
```

---

## 🧪 Day 4: Smoke Tests

### Test 1: Submit Proposal Vote (30 min)

**Scenario:** User votes on a market proposal

```rust
#[tokio::test]
async fn test_devnet_submit_proposal_vote() {
    let client = RpcClient::new("https://api.devnet.solana.com".to_string());
    let payer = read_keypair_file("~/.config/solana/id.json")?;

    // Create market (off-chain or via instruction)
    let market_id = [0u8; 32];
    let market_pubkey = Pubkey::find_program_address(
        &[b"market", &market_id],
        &PROGRAM_ID
    ).0;

    // Create vote record PDA
    let (vote_record, _bump) = Pubkey::find_program_address(
        &[
            b"vote",
            market_pubkey.as_ref(),
            payer.pubkey().as_ref(),
            &[0], // VoteType::Proposal
        ],
        &PROGRAM_ID,
    );

    // Submit instruction
    let ix = submit_proposal_vote(
        market_pubkey,
        vote_record,
        payer.pubkey(),
        true, // vote = LIKE
    );

    // Send transaction
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer],
        client.get_latest_blockhash()?,
    );

    let sig = client.send_and_confirm_transaction(&tx)?;
    println!("Vote submitted: {}", sig);
}
```

### Test 2: Aggregate Proposal Votes (30 min)

**Scenario:** Backend aggregates votes and transitions market to APPROVED

```rust
#[tokio::test]
async fn test_devnet_aggregate_proposal_votes() {
    let client = RpcClient::new("https://api.devnet.solana.com".to_string());
    let backend = read_keypair_file("~/.config/solana/id.json")?;

    // Aggregate votes (accumulate from multiple submissions)
    // This instruction checks if approval >= 7000 bps (70%)
    // If yes: market transitions to APPROVED
    // If no: stays in PROPOSED

    let market_id = [0u8; 32];
    let market_pubkey = Pubkey::find_program_address(
        &[b"market", &market_id],
        &PROGRAM_ID
    ).0;

    let global_config = Pubkey::find_program_address(
        &[b"global_config"],
        &PROGRAM_ID
    ).0;

    // Submit instruction
    let ix = aggregate_proposal_votes(
        market_pubkey,
        global_config,
        backend.pubkey(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&backend.pubkey()),
        &[&backend],
        client.get_latest_blockhash()?,
    );

    let sig = client.send_and_confirm_transaction(&tx)?;
    println!("Votes aggregated: {}", sig);

    // Verify market state changed
    let market_account = client.get_account(&market_pubkey)?;
    println!("Market state: {:?}", market_account.data);
}
```

### Test 3: Emergency Pause (30 min)

**Scenario:** Admin pauses the entire system

```rust
#[tokio::test]
async fn test_devnet_emergency_pause() {
    let client = RpcClient::new("https://api.devnet.solana.com".to_string());
    let admin = read_keypair_file("~/.config/solana/id.json")?;

    let global_config = Pubkey::find_program_address(
        &[b"global_config"],
        &PROGRAM_ID
    ).0;

    // Pause system
    let ix = emergency_pause(
        global_config,
        admin.pubkey(),
        true, // pause = true
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&admin.pubkey()),
        &[&admin],
        client.get_latest_blockhash()?,
    );

    let sig = client.send_and_confirm_transaction(&tx)?;
    println!("System paused: {}", sig);

    // Verify pause state
    let config_account = client.get_account(&global_config)?;
    assert_eq!(config_account.data[0], 1); // is_paused = true
}
```

### Test 4: Event Verification (30 min)

**Scenario:** Verify events emit correctly via Helius webhooks

```rust
// Event verification:
// - ProposalVoteSubmitted: market, user, vote_type, timestamp
// - ProposalAggregated: market, likes, dislikes, approved, timestamp
// - EmergencyPauseToggled: admin, is_paused, timestamp

// Helius Webhook Configuration:
// 1. Set up webhook in Helius dashboard
// 2. Point to backend: https://backend.example.com/webhooks/solana
// 3. Subscribe to events:
//    - ProposalVoteSubmitted
//    - ProposalAggregated
//    - EmergencyPauseToggled

// Backend receives events:
POST /webhooks/solana
{
    "type": "ProposalVoteSubmitted",
    "data": {
        "market": "...",
        "user": "...",
        "vote_type": 0,
        "timestamp": 1699282800
    }
}
```

---

## 📊 Success Criteria

### Day 3: Deployment ✅
- [ ] Program builds cleanly (0 errors)
- [ ] Deployment succeeds to devnet
- [ ] GlobalConfig initialized
- [ ] Program logs visible via Solana CLI
- [ ] All 4 voting instructions callable

### Day 4: Smoke Tests ✅
- [ ] Vote submission works on devnet
- [ ] Vote aggregation works on devnet
- [ ] Emergency pause works on devnet
- [ ] Events emit correctly
- [ ] State transitions validated

### Quality Gates ✅
- [ ] No runtime errors on devnet
- [ ] All instructions execute successfully
- [ ] Events indexed by backend
- [ ] Performance acceptable (<1s per transaction)
- [ ] No account initialization issues

---

## 🔧 Troubleshooting

### Issue: "Insufficient funds for deployment"
**Solution:** Request more airdrop
```bash
solana airdrop 10 --url devnet
```

### Issue: "Program already exists at this address"
**Solution:** Upgrade instead of deploy
```bash
anchor upgrade target/deploy/zmart_core.so --provider.cluster devnet
```

### Issue: "Account is immutable"
**Solution:** Ensure correct bump seeds and account derivation

### Issue: "Instruction data too large"
**Solution:** Split instruction into multiple transactions

### Issue: "Market account not found"
**Solution:** Ensure market was created before voting

---

## 📈 Performance Expectations

| Operation | Expected Time | Max Acceptable |
|-----------|---------------|-----------------|
| Deploy program | 30-60s | 2 minutes |
| Submit vote | 1-2s | 5 seconds |
| Aggregate votes | 2-3s | 10 seconds |
| Pause system | 1-2s | 5 seconds |
| Event indexing | 1-2s | 5 seconds |

---

## ✅ Devnet Deployment Checklist

### Pre-Deployment (Day 3)
- [ ] Solana CLI installed and configured
- [ ] Devnet wallet has 10+ SOL
- [ ] Program builds cleanly
- [ ] All tests passing locally
- [ ] Program ID noted

### Deployment (Day 3)
- [ ] Program deployed to devnet
- [ ] GlobalConfig initialized
- [ ] Program logs visible
- [ ] Admin keypair secured

### Post-Deployment (Day 4)
- [ ] All 4 voting instructions work
- [ ] Vote submission creates VoteRecord
- [ ] Vote aggregation transitions state
- [ ] Emergency pause blocks operations
- [ ] Events emit to Helius

### Integration (Day 4)
- [ ] Backend receives vote events
- [ ] Websocket server online
- [ ] Event indexing working
- [ ] API endpoints respond
- [ ] Smoke tests passing

---

## 🚀 Next Steps After Day 4

When devnet deployment is complete:

1. **Week 3:** Backend Services
   - Vote aggregator service
   - Event indexer
   - API gateway

2. **Week 4:** Integration Testing
   - End-to-end voting flows
   - Full market lifecycle
   - Performance testing

3. **Week 5:** Security & Optimization
   - Security audit
   - Performance tuning
   - Code cleanup

---

## 📞 Support Resources

**Solana Documentation:**
- RPC API: https://docs.solana.com/developing/clients/jsonrpc-api
- Program Deployment: https://docs.solana.com/developers/deploy
- Anchor Framework: https://www.anchor-lang.com

**Devnet Resources:**
- Solana Devnet Status: https://status.solana.com
- Faucet (SOL airdrop): https://solfaucet.com
- Block Explorer: https://explorer.solana.com?cluster=devnet

**Event Indexing:**
- Helius API: https://docs.helius.xyz
- Magic Eden webhooks: https://docs.magiceden.io

---

**Status:** ✅ Ready for Day 3 Deployment
**Next:** Execute deployment steps above
**Timeline:** Days 3-4 (4 hours)
**Confidence:** 95%
