# On-Chain Testing Debugging Guide

**Purpose:** Common issues and solutions when testing ZMART on-chain components.
**Audience:** Developers running tests on devnet/testnet.

## Quick Diagnostics

### Transaction Failed Checklist
1. [ ] Check wallet balance (SOL and USDC)
2. [ ] Verify program is deployed
3. [ ] Check account exists (for PDAs)
4. [ ] Verify correct network (devnet/testnet/mainnet)
5. [ ] Check transaction logs
6. [ ] Verify instruction data format
7. [ ] Check compute units

---

## Common Errors and Solutions

### 1. Program Errors

#### Error: `Program 7h3g... failed: custom program error: 0x1`
**Meaning:** InsufficientFunds
**Solutions:**
- Check user has enough USDC for trade + fees
- Verify SOL balance for transaction fees
- Ensure slippage tolerance is sufficient

```typescript
// Debug code
const balance = await getTokenBalance(wallet, USDC_MINT);
console.log(`USDC Balance: ${balance}`);
console.log(`Required: ${cost + fees}`);
```

#### Error: `Program 7h3g... failed: custom program error: 0x2`
**Meaning:** Unauthorized
**Solutions:**
- Verify signer is authorized for operation
- Check role (admin, creator, oracle)
- Ensure wallet is connected

```typescript
// Check authorization
if (!wallet.publicKey.equals(expectedAuthority)) {
  throw new Error("Wrong authority");
}
```

#### Error: `Program 7h3g... failed: custom program error: 0x3`
**Meaning:** InvalidState
**Solutions:**
- Check market state matches expected
- Verify state transition is valid
- Check timing (resolution time, dispute window)

```typescript
// Check state
const market = await program.account.market.fetch(marketPDA);
console.log(`Current state: ${market.state}`);
console.log(`Expected: ACTIVE`);
```

### 2. Account Errors

#### Error: `AccountNotFound`
**Meaning:** PDA doesn't exist
**Solutions:**
- Verify PDA derivation is correct
- Check if account was initialized
- Ensure seeds match

```typescript
// Derive PDA correctly
const [marketPDA, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("market"), marketId.toBuffer()],
  program.programId
);
```

#### Error: `AccountAlreadyInitialized`
**Meaning:** Trying to create existing account
**Solutions:**
- Check if market already exists
- Use different market ID
- Or fetch existing market

### 3. Transaction Errors

#### Error: `Transaction too large`
**Meaning:** Transaction exceeds size limit
**Solutions:**
- Split into multiple transactions
- Reduce instruction data size
- Use lookup tables

```typescript
// Split large vote aggregation
const chunks = votes.chunk(100);
for (const chunk of chunks) {
  await aggregateVotes(chunk);
}
```

#### Error: `Blockhash not found`
**Meaning:** Transaction expired
**Solutions:**
- Get fresh blockhash
- Reduce confirmation time
- Use durable nonce

```typescript
// Fresh blockhash
const { blockhash } = await connection.getLatestBlockhash();
tx.recentBlockhash = blockhash;
```

### 4. Compute Unit Errors

#### Error: `Program 7h3g... consumed 201234 of 200000 compute units`
**Meaning:** Exceeded compute budget
**Solutions:**
- Request more compute units
- Optimize instruction
- Split operation

```typescript
// Request more compute units
const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
  units: 300000
});
tx.add(modifyComputeUnits);
```

---

## State-Specific Issues

### PROPOSED State Issues
- **Cannot trade:** Market must be ACTIVE
- **Cannot approve:** Only admin can approve
- **Votes not counting:** Check aggregation threshold

### ACTIVE State Issues
- **Cannot buy:** Check USDC balance
- **Price impact too high:** Reduce trade size
- **Slippage exceeded:** Increase maxCost

### RESOLVING State Issues
- **Cannot dispute:** Within dispute window?
- **Cannot finalize:** Wait 48 hours
- **Wrong outcome:** Check oracle authority

### FINALIZED State Issues
- **Cannot claim:** Check if already claimed
- **No winnings:** Verify outcome and position
- **State locked:** No changes after finalization

---

## LMSR Calculation Issues

### Price Discrepancy
**Symptom:** Frontend price doesn't match on-chain
**Debug:**
```typescript
// Compare calculations
const frontendCost = calculateLMSRCost(shares, b, qYes, qNo);
const onChainCost = await program.methods
  .calculateCost(shares)
  .accounts({ market: marketPDA })
  .view();

console.log(`Frontend: ${frontendCost}`);
console.log(`On-chain: ${onChainCost}`);
console.log(`Difference: ${Math.abs(frontendCost - onChainCost)}`);
```

### Numerical Overflow
**Symptom:** Transaction fails with overflow error
**Solutions:**
- Use smaller trade amounts
- Check for u64 limits
- Implement batch trading

---

## Network Issues

### RPC Errors

#### Error: `429 Too Many Requests`
**Solution:** Use different RPC endpoint
```typescript
const endpoints = [
  "https://api.devnet.solana.com",
  "https://devnet.helius-rpc.com/?api-key=KEY",
  "https://rpc.ankr.com/solana_devnet"
];
```

#### Error: `Failed to get account info`
**Solutions:**
- Retry with exponential backoff
- Check network status
- Verify account exists

### Connection Issues
```typescript
// Robust connection setup
const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  wsEndpoint: WS_URL
});

// With retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(2 ** i * 1000); // Exponential backoff
    }
  }
  throw new Error("Max retries reached");
}
```

---

## Debugging Tools

### 1. Transaction Explorer
```typescript
// Get detailed transaction info
const sig = "4xY9k2...";
console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);

// Parse logs
const txDetails = await connection.getParsedTransaction(sig);
console.log("Logs:", txDetails?.meta?.logMessages);
```

### 2. Account Inspector
```typescript
// Inspect account data
async function inspectAccount(address: PublicKey) {
  const info = await connection.getAccountInfo(address);
  if (!info) {
    console.log("Account does not exist");
    return;
  }

  console.log("Owner:", info.owner.toBase58());
  console.log("Lamports:", info.lamports);
  console.log("Data length:", info.data.length);

  // Decode if it's a known account type
  try {
    const decoded = program.coder.accounts.decode("Market", info.data);
    console.log("Decoded:", decoded);
  } catch {
    console.log("Raw data:", info.data.toString('hex'));
  }
}
```

### 3. Event Monitor
```typescript
// Monitor program events
const listener = program.addEventListener(
  "MarketCreated",
  (event, slot) => {
    console.log("Event:", event);
    console.log("Slot:", slot);
  }
);

// Clean up
program.removeEventListener(listener);
```

### 4. Simulation
```typescript
// Simulate before sending
const simulation = await connection.simulateTransaction(tx);
if (simulation.value.err) {
  console.error("Simulation failed:", simulation.value.err);
  console.log("Logs:", simulation.value.logs);
  // Don't send transaction
} else {
  // Safe to send
  const sig = await connection.sendTransaction(tx);
}
```

---

## Performance Issues

### Slow Confirmations
**Solutions:**
- Use 'processed' commitment for reads
- Use 'confirmed' for writes
- Implement optimistic UI updates

### High Transaction Costs
**Solutions:**
- Batch operations
- Use smaller compute units
- Optimize instruction data

### Rate Limiting
**Solutions:**
- Implement request queuing
- Use multiple RPC endpoints
- Add caching layer

---

## Testing Best Practices

### 1. Isolated Test Accounts
```typescript
// Create fresh accounts for each test
beforeEach(async () => {
  testWallet = Keypair.generate();
  await airdrop(testWallet.publicKey, 2 * LAMPORTS_PER_SOL);
});
```

### 2. Deterministic Tests
```typescript
// Use fixed seeds for reproducibility
const seed = Buffer.from("test-market-001");
const [marketPDA] = PublicKey.findProgramAddressSync(
  [seed],
  program.programId
);
```

### 3. Comprehensive Logging
```typescript
// Log all important values
console.log({
  market: marketPDA.toBase58(),
  user: wallet.publicKey.toBase58(),
  instruction: "buy_shares",
  params: { shares, maxCost },
  result: { cost: actualCost, fees }
});
```

### 4. Error Context
```typescript
// Wrap operations with context
try {
  await buyShares(market, shares);
} catch (error) {
  console.error("Failed to buy shares:", {
    market: market.toBase58(),
    shares,
    wallet: wallet.publicKey.toBase58(),
    balance: await getBalance(wallet),
    error: error.message,
    logs: error.logs
  });
  throw error;
}
```

---

## Emergency Procedures

### Stuck Transaction
1. Check transaction status
2. Wait for timeout (usually 90 seconds)
3. Retry with new blockhash
4. Use different RPC endpoint

### Corrupted State
1. **Never happens on-chain** (immutable)
2. Check local cache/database
3. Resync from chain
4. Verify event replay

### Lost Funds
1. Check transaction history
2. Verify correct recipient
3. Check for refund conditions
4. Contact support with tx signature

---

## Support Resources

### Documentation
- [Solana Cookbook](https://solanacookbook.com)
- [Anchor Book](https://book.anchor-lang.com)
- [ZMART Docs](./README.md)

### Tools
- [Solana Explorer](https://explorer.solana.com)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)
- [Solana CLI](https://docs.solana.com/cli)

### Community
- Discord: [ZMART Discord](#)
- GitHub Issues: [Report bugs](https://github.com/zmart/issues)
- Stack Overflow: Tag `solana` and `zmart`

---

**Last Updated:** November 8, 2025
**Version:** 1.0.0