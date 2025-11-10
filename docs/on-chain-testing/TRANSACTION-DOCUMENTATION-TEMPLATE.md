# Transaction Documentation Template

**Purpose:** Standardized template for documenting every on-chain transaction during testing.
**Usage:** Copy this template for each test execution and fill in all fields.

---

## Test Execution Metadata

### Test Information
- **Test ID:** `TEST-{YYYY-MM-DD}-{sequence}` (e.g., TEST-2025-11-08-001)
- **Test Name:** [Descriptive name of what is being tested]
- **Test Category:** [Lifecycle | Trading | Voting | Resolution | Admin | Security]
- **Test Objective:** [What we're trying to verify]
- **Tester:** [Name/ID of person or automation running test]
- **Date/Time:** [YYYY-MM-DD HH:MM:SS UTC]
- **Network:** [Devnet | Testnet | Mainnet]
- **Program Version:** [Git commit hash]

### Environment
- **RPC Endpoint:** [URL]
- **Commitment Level:** [confirmed | finalized]
- **Slot Height:** [Current slot number]
- **Block Time:** [Unix timestamp]
- **Cluster Version:** [Solana version]

---

## Transaction Details

### Transaction 1: [Instruction Name]

#### Pre-Transaction State
```json
{
  "wallet_balance": "[SOL amount]",
  "account_states": {
    "global_config": {
      "address": "[PDA address]",
      "data": "[Account data snapshot]",
      "lamports": "[Balance]"
    },
    "market_account": {
      "address": "[PDA address]",
      "state": "[PROPOSED | APPROVED | ACTIVE | etc.]",
      "data": "[Account data snapshot]",
      "lamports": "[Balance]"
    },
    "user_position": {
      "address": "[PDA address]",
      "yes_shares": "[Amount]",
      "no_shares": "[Amount]",
      "data": "[Account data snapshot]",
      "lamports": "[Balance]"
    }
  }
}
```

#### Transaction Submission
```json
{
  "signature": "[Transaction signature]",
  "instruction": "[Instruction name]",
  "accounts": [
    {
      "pubkey": "[Account address]",
      "is_signer": true/false,
      "is_writable": true/false,
      "role": "[Description of account role]"
    }
  ],
  "instruction_data": {
    "discriminator": "[8-byte instruction discriminator]",
    "arguments": {
      "arg1": "[value]",
      "arg2": "[value]"
    }
  },
  "submitted_at": "[ISO timestamp]",
  "submitted_slot": "[Slot number]"
}
```

#### Transaction Execution
```json
{
  "status": "success | failed",
  "confirmation_status": "processed | confirmed | finalized",
  "confirmed_at": "[ISO timestamp]",
  "confirmed_slot": "[Slot number]",
  "confirmation_time_ms": "[Milliseconds from submission to confirmation]",
  "compute_units_consumed": "[CU count]",
  "compute_units_limit": "[CU limit]",
  "compute_unit_efficiency": "[consumed/limit %]",
  "fee_paid_lamports": "[Fee amount]",
  "fee_paid_sol": "[Fee in SOL]"
}
```

#### Transaction Logs
```
[PASTE COMPLETE TRANSACTION LOGS HERE]

Example:
Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS invoke [1]
Program log: Instruction: SubmitProposalVote
Program log: Vote recorded: user=4Mkyb..., vote=true
Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS consumed 5432 of 200000 compute units
Program 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS success
```

#### Post-Transaction State
```json
{
  "wallet_balance": "[New SOL amount]",
  "balance_delta": "[Change in SOL]",
  "account_states": {
    "global_config": {
      "address": "[PDA address]",
      "data": "[Account data snapshot]",
      "lamports": "[Balance]",
      "changes": "[List of changed fields]"
    },
    "market_account": {
      "address": "[PDA address]",
      "state": "[New state]",
      "data": "[Account data snapshot]",
      "lamports": "[Balance]",
      "changes": "[List of changed fields]"
    },
    "vote_record": {
      "address": "[PDA address]",
      "voter": "[Wallet address]",
      "vote": "[true/false]",
      "timestamp": "[Unix timestamp]",
      "data": "[Account data snapshot]",
      "lamports": "[Balance]"
    }
  }
}
```

#### State Validation
- **Expected State:** [What we expected to happen]
- **Actual State:** [What actually happened]
- **Validation Result:** ✅ PASS | ❌ FAIL
- **Discrepancies:** [List any unexpected behaviors]

---

## Data Analysis

### Performance Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Transaction Time | [ms] | <3000ms | ✅/❌ |
| Compute Units | [CU] | <50000 | ✅/❌ |
| Fee Paid | [lamports] | <10000 | ✅/❌ |
| Confirmation Time | [ms] | <2000ms | ✅/❌ |

### State Transition Verification
| Field | Before | After | Expected | Valid |
|-------|--------|-------|----------|-------|
| market.state | PROPOSED | PROPOSED | PROPOSED | ✅ |
| market.proposal_likes | 0 | 1 | 1 | ✅ |
| market.proposal_dislikes | 0 | 0 | 0 | ✅ |
| vote_record.created | false | true | true | ✅ |

### LMSR Calculations (if applicable)
```json
{
  "before_trade": {
    "yes_quantity": "[Amount]",
    "no_quantity": "[Amount]",
    "yes_price": "[Price]",
    "no_price": "[Price]",
    "cost_function": "[C(q_yes, q_no)]"
  },
  "trade_parameters": {
    "outcome": "YES | NO",
    "shares_requested": "[Amount]",
    "target_cost": "[Amount]",
    "slippage_tolerance": "[%]"
  },
  "after_trade": {
    "yes_quantity": "[Amount]",
    "no_quantity": "[Amount]",
    "yes_price": "[Price]",
    "no_price": "[Price]",
    "cost_function": "[C(q_yes, q_no)]"
  },
  "verification": {
    "cost_calculated": "[Amount from LMSR]",
    "cost_charged": "[Actual amount]",
    "difference": "[Absolute difference]",
    "tolerance": "0.001",
    "valid": true/false
  }
}
```

### Fee Distribution (if applicable)
```json
{
  "total_cost": "[Amount]",
  "base_cost": "[Amount before fees]",
  "total_fees": "[10% of base]",
  "fee_breakdown": {
    "protocol_fee": "[3% of base]",
    "resolver_reward": "[2% of base]",
    "lp_fee": "[5% of base]"
  },
  "fee_recipients": {
    "protocol_treasury": "[Wallet address]",
    "resolver": "[Wallet address]",
    "liquidity_provider": "[Wallet address]"
  },
  "verification": {
    "sum_matches_total": true/false,
    "percentages_correct": true/false,
    "all_fees_distributed": true/false
  }
}
```

---

## Errors and Issues

### Error Details (if failed)
```json
{
  "error_type": "[Error name/code]",
  "error_message": "[Full error message]",
  "error_code": "[Numeric error code]",
  "program_error": "[Custom program error]",
  "stack_trace": "[If available]",
  "error_logs": "[Relevant log lines]"
}
```

### Root Cause Analysis
- **Immediate Cause:** [What directly caused the error]
- **Underlying Cause:** [Why that condition existed]
- **Contributing Factors:** [Other factors that contributed]

### Resolution Steps
1. [Step 1 to fix]
2. [Step 2 to fix]
3. [Step 3 to fix]

### Prevention
- **Code Changes:** [What code should change]
- **Test Additions:** [What tests to add]
- **Documentation:** [What to document]

---

## Inconsistencies Detected

### Inconsistency 1: [Description]
- **Expected:** [What should have happened]
- **Observed:** [What actually happened]
- **Severity:** Critical | High | Medium | Low
- **Impact:** [Description of impact]
- **Reproduction Steps:**
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Workaround:** [If available]
- **Fix Required:** [What needs to be fixed]

### Inconsistency 2: [Description]
[Same structure as above]

---

## References and Links

### Blockchain Explorers
- **Solana Explorer:** `https://explorer.solana.com/tx/{signature}?cluster=devnet`
- **Solscan:** `https://solscan.io/tx/{signature}?cluster=devnet`
- **Solana Beach:** `https://solanabeach.io/transaction/{signature}?cluster=devnet`

### Related Documentation
- **Test Scenario:** [Link to 01-TEST-SCENARIOS.md section]
- **Program Instruction:** [Link to code]
- **State Definition:** [Link to state.rs]
- **Math Implementation:** [Link to math module]

### Related Tests
- **Previous Test:** [TEST-ID and link]
- **Next Test:** [TEST-ID and link]
- **Related Tests:** [List of related TEST-IDs]

---

## Lessons Learned

### What Worked Well
1. [Observation 1]
2. [Observation 2]
3. [Observation 3]

### What Could Be Improved
1. [Improvement 1]
2. [Improvement 2]
3. [Improvement 3]

### Knowledge Gained
1. [Learning 1]
2. [Learning 2]
3. [Learning 3]

### Future Test Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

---

## Attachments

### Screenshots
- [Link to screenshot 1]
- [Link to screenshot 2]

### Raw Data Files
- [Link to JSON dump]
- [Link to log file]
- [Link to account data dump]

### Video Recording
- [Link to screen recording if applicable]

---

## Sign-Off

### Test Execution
- **Executed By:** [Name/ID]
- **Execution Date:** [YYYY-MM-DD]
- **Execution Result:** PASS | FAIL | BLOCKED
- **Notes:** [Any additional notes]

### Test Review
- **Reviewed By:** [Name/ID]
- **Review Date:** [YYYY-MM-DD]
- **Review Status:** APPROVED | NEEDS_REVISION | REJECTED
- **Review Notes:** [Reviewer comments]

---

**Template Version:** 1.0.0
**Last Updated:** November 8, 2025
**Maintained By:** ZMART Development Team
