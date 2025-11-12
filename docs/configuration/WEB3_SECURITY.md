# ZMART Web3 Security Guide

**Last Updated**: November 12, 2025
**Status**: Production-Ready Security Framework

---

## Table of Contents

1. [Overview](#overview)
2. [Keypair Management](#keypair-management)
3. [RPC Security](#rpc-security)
4. [Transaction Security](#transaction-security)
5. [Secret Manager Integration](#secret-manager-integration)
6. [Monitoring & Auditing](#monitoring--auditing)
7. [Incident Response](#incident-response)
8. [Security Checklist](#security-checklist)

---

## Overview

This guide covers security best practices for ZMART's Solana/Web3 integration, with focus on keypair management, transaction security, and production hardening.

**Security Principles**:
1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions for each component
3. **Secure by Default**: Security enabled from the start
4. **Auditability**: All security events logged and monitored
5. **Incident Readiness**: Pre-defined response procedures

**Threat Model**:
- **Keypair Compromise**: Unauthorized access to private keys
- **Transaction Manipulation**: Malicious transaction signing
- **RPC Attacks**: DDoS, man-in-the-middle, censorship
- **Program Exploitation**: Vulnerabilities in on-chain programs
- **Social Engineering**: Phishing, impersonation

---

## Keypair Management

### Keypair Types

ZMART uses different keypairs for different purposes:

```typescript
// 1. Admin/Authority Keypair
// - Controls program upgrades
// - Creates markets
// - High-value operations
const adminKeypair = loadKeypairFromEnv('SOLANA_ADMIN_KEYPAIR');

// 2. Fee Payer Keypair
// - Pays transaction fees
// - Medium-value operations
// - Can be rotated frequently
const feePayerKeypair = loadKeypairFromEnv('SOLANA_FEE_PAYER_KEYPAIR');

// 3. Market Creator Keypair
// - Creates new markets
// - Limited permissions
// - Low-value operations
const marketCreatorKeypair = loadKeypairFromEnv('SOLANA_MARKET_CREATOR_KEYPAIR');
```

**Separation Rationale**:
- **Admin**: Rarely used, highest security, cold storage
- **Fee Payer**: Frequently used, hot wallet, limited funds
- **Market Creator**: Frequent use, minimal privileges

### Keypair Generation

**Development Keypairs**:

```bash
# Generate development keypair
solana-keygen new --outfile dev-keypair.json

# Fund with devnet SOL
solana airdrop 2 --keypair dev-keypair.json --url devnet

# Verify balance
solana balance --keypair dev-keypair.json --url devnet
```

**Production Keypairs**:

```bash
# Generate with strong entropy
solana-keygen new --outfile prod-admin-keypair.json

# Backup to secure location
# 1. Encrypted USB drive
# 2. Hardware security module (HSM)
# 3. Secret manager (AWS Secrets Manager, HashiCorp Vault)

# CRITICAL: Store seed phrase offline in secure location
# NEVER commit keypair files to git
# NEVER share private keys

# Add to .gitignore
echo "*-keypair.json" >> .gitignore
echo "**/*.json" >> .gitignore  # Be careful with this one
```

### Keypair Storage Formats

**JSON Format** (Solana CLI default):

```json
[250,223,182,117,45,210,...]  // Uint8Array[64] - Full keypair
```

**Base58 Format** (For environment variables):

```typescript
// Convert JSON keypair to base58
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Load JSON keypair
const keypairData = JSON.parse(fs.readFileSync('keypair.json', 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

// Convert to base58
const base58PrivateKey = bs58.encode(keypair.secretKey);
console.log(base58PrivateKey);  // Store this in .env
```

**Loading from Environment**:

```typescript
// Load base58-encoded keypair from env
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

function loadKeypairFromEnv(envVar: string): Keypair {
  const base58Key = process.env[envVar];
  if (!base58Key) {
    throw new Error(`${envVar} not found in environment`);
  }

  try {
    const secretKey = bs58.decode(base58Key);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(`Invalid keypair format for ${envVar}: ${error.message}`);
  }
}

const adminKeypair = loadKeypairFromEnv('SOLANA_ADMIN_KEYPAIR');
```

### Keypair Rotation

**Rotation Policy**:

| Keypair Type | Frequency | Process |
|--------------|-----------|---------|
| Admin | Every 6 months | Manual, with program authority update |
| Fee Payer | Every 3 months | Automated via script |
| Market Creator | Every month | Automated via script |

**Rotation Procedure** (Fee Payer Example):

```bash
#!/bin/bash
# rotate-fee-payer.sh

set -e

echo "Starting fee payer keypair rotation..."

# 1. Generate new keypair
solana-keygen new --outfile new-fee-payer.json --no-bip39-passphrase

# 2. Convert to base58
NEW_KEYPAIR_BASE58=$(node -e "
  const fs = require('fs');
  const bs58 = require('bs58');
  const data = JSON.parse(fs.readFileSync('new-fee-payer.json'));
  console.log(bs58.encode(Uint8Array.from(data)));
")

# 3. Fund new keypair
solana transfer $(solana-keygen pubkey new-fee-payer.json) 1 --keypair old-fee-payer.json

# 4. Update secret manager
aws secretsmanager update-secret \
  --secret-id solana-fee-payer-keypair \
  --secret-string "$NEW_KEYPAIR_BASE58"

# 5. Restart services (they'll load new keypair from secret manager)
pm2 restart all

# 6. Verify new keypair is being used
curl http://localhost:4000/health | jq '.config.solana_keypair_pubkey'

# 7. Transfer remaining funds from old keypair
OLD_BALANCE=$(solana balance --keypair old-fee-payer.json | awk '{print $1}')
solana transfer $(solana-keygen pubkey new-fee-payer.json) $OLD_BALANCE --keypair old-fee-payer.json

# 8. Archive old keypair (encrypted backup)
tar -czf "old-fee-payer-$(date +%Y%m%d).tar.gz" old-fee-payer.json
gpg --encrypt --recipient admin@zmart.io old-fee-payer-$(date +%Y%m%d).tar.gz
rm old-fee-payer-$(date +%Y%m%d).tar.gz
rm old-fee-payer.json new-fee-payer.json

echo "✅ Fee payer keypair rotation complete!"
```

**Admin Keypair Rotation** (More Complex):

```bash
# Admin rotation requires updating program authority on-chain

# 1. Generate new admin keypair
solana-keygen new --outfile new-admin.json

# 2. Update program authority
solana program set-upgrade-authority \
  $PROGRAM_ID \
  $(solana-keygen pubkey new-admin.json) \
  --upgrade-authority old-admin.json

# 3. Verify authority changed
solana program show $PROGRAM_ID | grep "Authority"

# 4. Update secret manager and restart services
# (same as fee payer rotation)

# 5. Archive old keypair securely
```

### Keypair Security Best Practices

**✅ DO**:
- Generate keypairs with strong entropy (use `solana-keygen` or `@solana/web3.js`)
- Store production keypairs in secret manager (AWS Secrets Manager, HashiCorp Vault)
- Use different keypairs for different environments (dev/staging/prod)
- Encrypt keypair backups (GPG, age)
- Rotate keypairs regularly (quarterly minimum)
- Use hardware wallets for admin keypairs (Ledger, Grid+)
- Implement multi-sig for critical operations
- Monitor keypair usage for anomalies

**❌ DON'T**:
- Commit keypairs to git
- Share keypairs between team members
- Store keypairs in plaintext on servers
- Use same keypair across environments
- Store keypairs in application logs
- Send keypairs over unencrypted channels
- Reuse keypairs after compromise
- Store seed phrases digitally

---

## RPC Security

### RPC Provider Selection

**Development**:
```typescript
// Free public endpoints (rate-limited, unreliable)
const connection = new Connection('https://api.devnet.solana.com');
```

**Production**:
```typescript
// Paid RPC providers (reliable, fast, monitored)
const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  }
);
```

**RPC Provider Comparison**:

| Provider | Pricing | Features | Reliability |
|----------|---------|----------|-------------|
| **Helius** | $0-$499/mo | Webhooks, enhanced APIs, 99.9% uptime | ⭐⭐⭐⭐⭐ |
| **QuickNode** | $0-$999/mo | Global edge network, analytics | ⭐⭐⭐⭐⭐ |
| **Triton** | $49-$499/mo | Ultra-low latency, DDoS protection | ⭐⭐⭐⭐ |
| **Public RPC** | Free | Basic RPC, rate-limited | ⭐⭐ |

**Recommendation**: Use Helius or QuickNode for production

### RPC Redundancy & Failover

```typescript
// Multiple RPC endpoints for redundancy
const RPC_ENDPOINTS = [
  process.env.HELIUS_RPC_URL,  // Primary
  process.env.QUICKNODE_RPC_URL,  // Fallback 1
  'https://api.mainnet-beta.solana.com',  // Fallback 2 (public)
];

let currentEndpointIndex = 0;

async function getConnectionWithFailover(): Promise<Connection> {
  for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
    const endpoint = RPC_ENDPOINTS[(currentEndpointIndex + i) % RPC_ENDPOINTS.length];

    try {
      const connection = new Connection(endpoint);
      await connection.getVersion();  // Health check
      currentEndpointIndex = (currentEndpointIndex + i) % RPC_ENDPOINTS.length;
      return connection;
    } catch (error) {
      console.warn(`RPC endpoint ${endpoint} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All RPC endpoints failed');
}

// Usage
const connection = await getConnectionWithFailover();
```

### Rate Limiting & Throttling

```typescript
import pLimit from 'p-limit';

// Limit concurrent RPC requests
const limit = pLimit(10);  // Max 10 concurrent requests

async function batchGetAccountInfo(publicKeys: PublicKey[]): Promise<AccountInfo[]> {
  const connection = await getConnectionWithFailover();

  return Promise.all(
    publicKeys.map(pubkey =>
      limit(async () => {
        try {
          return await connection.getAccountInfo(pubkey);
        } catch (error) {
          console.error(`Failed to get account info for ${pubkey.toBase58()}:`, error);
          return null;
        }
      })
    )
  );
}
```

### RPC Request Monitoring

```typescript
// Monitor RPC request latency and errors
import { logger } from './logger';

class MonitoredConnection extends Connection {
  async getAccountInfo(publicKey: PublicKey, commitment?: Commitment): Promise<AccountInfo | null> {
    const startTime = Date.now();

    try {
      const result = await super.getAccountInfo(publicKey, commitment);
      const latency = Date.now() - startTime;

      logger.info('RPC request successful', {
        method: 'getAccountInfo',
        publicKey: publicKey.toBase58(),
        latency,
      });

      // Alert if latency is high
      if (latency > 5000) {
        logger.warn('High RPC latency detected', { latency });
      }

      return result;
    } catch (error) {
      logger.error('RPC request failed', {
        method: 'getAccountInfo',
        publicKey: publicKey.toBase58(),
        error: error.message,
      });
      throw error;
    }
  }
}
```

---

## Transaction Security

### Transaction Signing

**Secure Transaction Signing**:

```typescript
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

async function signAndSendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[]
): Promise<string> {
  // 1. Validate transaction before signing
  validateTransaction(transaction);

  // 2. Set recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;

  // 3. Set fee payer
  transaction.feePayer = signers[0].publicKey;

  // 4. Sign transaction
  transaction.sign(...signers);

  // 5. Verify signatures
  if (!transaction.verifySignatures()) {
    throw new Error('Transaction signature verification failed');
  }

  // 6. Send and confirm with timeout
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      signers,
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    logger.info('Transaction confirmed', { signature });
    return signature;
  } catch (error) {
    logger.error('Transaction failed', { error: error.message });
    throw error;
  }
}

function validateTransaction(transaction: Transaction): void {
  // Check transaction size
  const serialized = transaction.serialize({ requireAllSignatures: false });
  if (serialized.length > 1232) {
    throw new Error('Transaction size exceeds maximum (1232 bytes)');
  }

  // Check number of signers
  if (transaction.signatures.length > 16) {
    throw new Error('Too many signers (max 16)');
  }

  // Check instruction count
  if (transaction.instructions.length > 64) {
    throw new Error('Too many instructions (max 64)');
  }

  // Validate fee payer
  if (!transaction.feePayer) {
    throw new Error('Fee payer not set');
  }
}
```

### Transaction Confirmation Strategies

```typescript
// Strategy 1: Simple confirmation (fast but less reliable)
async function confirmTransactionSimple(
  connection: Connection,
  signature: string
): Promise<void> {
  await connection.confirmTransaction(signature, 'confirmed');
}

// Strategy 2: Wait for finalization (slower but more reliable)
async function confirmTransactionFinalized(
  connection: Connection,
  signature: string
): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  }, 'finalized');
}

// Strategy 3: Poll with timeout
async function confirmTransactionWithTimeout(
  connection: Connection,
  signature: string,
  timeout: number = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await connection.getSignatureStatus(signature);

    if (status?.value?.confirmationStatus === 'finalized') {
      return;
    }

    if (status?.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Transaction confirmation timeout');
}
```

### Slippage Protection

```typescript
// Slippage protection for market trades
async function buySharesWithSlippage(
  marketId: PublicKey,
  shares: number,
  maxCost: number,
  slippageBps: number = 100  // 1% slippage
): Promise<string> {
  // 1. Get current price
  const currentPrice = await getCurrentPrice(marketId);

  // 2. Calculate max cost with slippage
  const maxCostWithSlippage = maxCost * (1 + slippageBps / 10000);

  // 3. Estimate actual cost
  const estimatedCost = await estimateBuyCost(marketId, shares);

  // 4. Check slippage
  if (estimatedCost > maxCostWithSlippage) {
    throw new Error(`Slippage exceeded: estimated ${estimatedCost}, max ${maxCostWithSlippage}`);
  }

  // 5. Execute trade
  const signature = await executeBuyShares(marketId, shares, maxCostWithSlippage);

  return signature;
}
```

---

## Secret Manager Integration

### AWS Secrets Manager

**Setup**:

```bash
# Install AWS CLI
brew install awscli

# Configure AWS credentials
aws configure

# Create secret
aws secretsmanager create-secret \
  --name solana-admin-keypair \
  --description "ZMART Solana admin keypair" \
  --secret-string "base58_encoded_private_key_here"
```

**Integration**:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function loadKeypairFromAWS(secretName: string): Promise<Keypair> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error(`Secret ${secretName} not found`);
  }

  const secretKey = bs58.decode(response.SecretString);
  return Keypair.fromSecretKey(secretKey);
}

// Usage
const adminKeypair = await loadKeypairFromAWS('solana-admin-keypair');
```

### HashiCorp Vault

**Setup**:

```bash
# Start Vault server (development)
vault server -dev

# Set Vault address
export VAULT_ADDR='http://127.0.0.1:8200'

# Store secret
vault kv put secret/solana/admin-keypair value=base58_encoded_private_key_here
```

**Integration**:

```typescript
import Vault from 'node-vault';

const vault = Vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

async function loadKeypairFromVault(path: string): Promise<Keypair> {
  const response = await vault.read(path);
  const base58Key = response.data.value;

  const secretKey = bs58.decode(base58Key);
  return Keypair.fromSecretKey(secretKey);
}

// Usage
const adminKeypair = await loadKeypairFromVault('secret/data/solana/admin-keypair');
```

---

## Monitoring & Auditing

### Security Event Logging

```typescript
import { logger } from './logger';

// Log all security-relevant events
function logSecurityEvent(event: {
  type: 'keypair_loaded' | 'transaction_signed' | 'authority_changed' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical';
  details: any;
}) {
  logger.log({
    level: event.severity,
    message: `[SECURITY] ${event.type}`,
    ...event.details,
    timestamp: new Date().toISOString(),
  });

  // Send critical events to alerting system
  if (event.severity === 'critical') {
    sendAlert(event);
  }
}

// Example usage
logSecurityEvent({
  type: 'keypair_loaded',
  severity: 'info',
  details: {
    keypairType: 'admin',
    publicKey: adminKeypair.publicKey.toBase58(),
  },
});
```

### Transaction Monitoring

```typescript
// Monitor all outgoing transactions
async function monitorTransaction(signature: string) {
  const connection = new Connection(process.env.SOLANA_RPC_URL);

  // 1. Get transaction details
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    logger.error('Transaction not found', { signature });
    return;
  }

  // 2. Analyze transaction
  const analysis = {
    signature,
    fee: tx.meta?.fee,
    success: tx.meta?.err === null,
    slot: tx.slot,
    blockTime: tx.blockTime,
    accounts: tx.transaction.message.accountKeys.length,
    instructions: tx.transaction.message.compiledInstructions.length,
  };

  // 3. Log analysis
  logger.info('Transaction monitored', analysis);

  // 4. Alert on suspicious activity
  if (analysis.fee > 0.01 * 1e9) {  // >0.01 SOL fee
    logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'warning',
      details: { message: 'High transaction fee detected', ...analysis },
    });
  }

  if (!analysis.success) {
    logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'warning',
      details: { message: 'Transaction failed', ...analysis },
    });
  }
}
```

### Keypair Usage Monitoring

```typescript
// Monitor keypair usage patterns
const keypairUsageStats = new Map<string, {
  firstUse: Date;
  lastUse: Date;
  transactionCount: number;
  totalFees: number;
}>();

function trackKeypairUsage(publicKey: PublicKey, fee: number) {
  const key = publicKey.toBase58();
  const stats = keypairUsageStats.get(key) || {
    firstUse: new Date(),
    lastUse: new Date(),
    transactionCount: 0,
    totalFees: 0,
  };

  stats.lastUse = new Date();
  stats.transactionCount++;
  stats.totalFees += fee;

  keypairUsageStats.set(key, stats);

  // Alert on unusual patterns
  if (stats.transactionCount > 1000) {
    logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'warning',
      details: {
        message: 'High transaction count from single keypair',
        publicKey: key,
        count: stats.transactionCount,
      },
    });
  }
}
```

---

## Incident Response

### Keypair Compromise Response Plan

**Phase 1: Detection** (Minutes 0-5)

1. Identify compromised keypair
2. Alert security team
3. Document initial findings

**Phase 2: Containment** (Minutes 5-15)

1. Rotate compromised keypair immediately
2. Transfer funds to secure wallet
3. Revoke permissions on-chain
4. Block suspicious transactions

**Phase 3: Investigation** (Hours 1-4)

1. Review transaction logs
2. Identify unauthorized transactions
3. Assess financial impact
4. Determine attack vector

**Phase 4: Recovery** (Hours 4-24)

1. Update all systems with new keypairs
2. Verify no backdoors remain
3. Restore normal operations
4. Update security controls

**Phase 5: Post-Incident** (Days 1-7)

1. Conduct post-mortem analysis
2. Update security policies
3. Improve detection mechanisms
4. Train team on lessons learned

### Incident Response Script

```bash
#!/bin/bash
# incident-response.sh - Automated keypair compromise response

set -e

COMPROMISED_KEYPAIR=$1
NEW_KEYPAIR_PATH=$2

echo "🚨 INCIDENT RESPONSE: Keypair Compromise"
echo "Compromised keypair: $COMPROMISED_KEYPAIR"

# 1. Generate new keypair
echo "Step 1: Generating new keypair..."
solana-keygen new --outfile $NEW_KEYPAIR_PATH --no-bip39-passphrase

# 2. Transfer all funds
echo "Step 2: Transferring funds to new keypair..."
BALANCE=$(solana balance --keypair $COMPROMISED_KEYPAIR | awk '{print $1}')
NEW_PUBKEY=$(solana-keygen pubkey $NEW_KEYPAIR_PATH)
solana transfer $NEW_PUBKEY $BALANCE --keypair $COMPROMISED_KEYPAIR --allow-unfunded-recipient

# 3. Update program authority (if admin keypair)
echo "Step 3: Updating program authority..."
# solana program set-upgrade-authority $PROGRAM_ID $NEW_PUBKEY --upgrade-authority $COMPROMISED_KEYPAIR

# 4. Update secret manager
echo "Step 4: Updating secret manager..."
NEW_KEYPAIR_BASE58=$(node -e "
  const fs = require('fs');
  const bs58 = require('bs58');
  const data = JSON.parse(fs.readFileSync('$NEW_KEYPAIR_PATH'));
  console.log(bs58.encode(Uint8Array.from(data)));
")

aws secretsmanager update-secret \
  --secret-id solana-admin-keypair \
  --secret-string "$NEW_KEYPAIR_BASE58"

# 5. Restart services
echo "Step 5: Restarting services..."
pm2 restart all

# 6. Verify new keypair
echo "Step 6: Verifying new keypair..."
curl http://localhost:4000/health | jq '.config.solana_keypair_pubkey'

# 7. Archive old keypair
echo "Step 7: Archiving compromised keypair..."
tar -czf "compromised-keypair-$(date +%Y%m%d-%H%M%S).tar.gz" $COMPROMISED_KEYPAIR
gpg --encrypt --recipient security@zmart.io compromised-keypair-*.tar.gz
rm compromised-keypair-*.tar.gz
rm $COMPROMISED_KEYPAIR

echo "✅ Incident response complete!"
echo "Next steps:"
echo "1. Review transaction logs for unauthorized activity"
echo "2. Identify attack vector"
echo "3. Update security controls"
echo "4. Conduct post-mortem analysis"
```

---

## Security Checklist

### Pre-Deployment Checklist

**Keypair Security**:
- [ ] All keypairs generated with strong entropy
- [ ] Production keypairs stored in secret manager
- [ ] Keypairs never committed to git
- [ ] Different keypairs for dev/staging/prod
- [ ] Keypair rotation policy documented
- [ ] Multi-sig enabled for admin operations
- [ ] Hardware wallet integration for admin keypair

**RPC Security**:
- [ ] Using paid RPC provider (Helius/QuickNode)
- [ ] RPC failover configured
- [ ] Rate limiting implemented
- [ ] RPC request monitoring enabled
- [ ] Connection timeouts configured

**Transaction Security**:
- [ ] Transaction validation before signing
- [ ] Slippage protection implemented
- [ ] Confirmation strategies defined
- [ ] Transaction monitoring enabled
- [ ] Error handling comprehensive

**Monitoring**:
- [ ] Security event logging enabled
- [ ] Transaction monitoring active
- [ ] Keypair usage tracking configured
- [ ] Alerting system configured
- [ ] Incident response plan documented

**Infrastructure**:
- [ ] TLS/SSL enabled for all connections
- [ ] Firewalls configured
- [ ] VPS hardened
- [ ] Backup procedures tested
- [ ] Disaster recovery plan documented

### Post-Deployment Checklist

- [ ] Health checks passing
- [ ] Monitoring dashboards configured
- [ ] Alert recipients verified
- [ ] Incident response tested
- [ ] Team trained on security procedures
- [ ] Security audit completed
- [ ] Penetration testing conducted

---

## Related Documentation

- [ENVIRONMENT_VARS.md](./ENVIRONMENT_VARS.md) - Complete environment variable reference
- [ARCHITECTURE_MAP.md](./ARCHITECTURE_MAP.md) - System architecture and directory structure
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common security issues and solutions

---

**Last Updated**: November 12, 2025
**Maintainer**: ZMART Security Team
**Status**: Production-Ready ✅
