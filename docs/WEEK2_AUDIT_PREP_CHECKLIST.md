# Week 2 - PRIMARY AUDIT Preparation Checklist

**Start Date:** Monday, November 18, 2025
**Duration:** 5 days (Week 2 of 14-week timeline)
**Primary Tool:** blockchain-tool skill (470+ vulnerability patterns)
**Parallel Execution:** 3 tracks (Audit + Frontend + Integration)

---

## 🎯 Audit Scope

### Programs to Audit

**1. zmart-core (Primary Focus - 18 Instructions)**
- Location: `/Users/seman/Desktop/zmartV0.69/programs/zmart-core/`
- Program ID: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
- Deployment: Devnet (deployed Nov 7, 2025)
- Lines of Code: ~3,500 lines Rust/Anchor
- Critical Components:
  - LMSR cost function (fixed-point math)
  - 6-state FSM (PROPOSED → FINALIZED)
  - Voting system (proposal + dispute)
  - Trading instructions (buy/sell shares)
  - Resolution + claiming
  - Fee distribution (3/2/5 split)
  - Admin operations

**2. zmart-proposal (Secondary - Vote Aggregation)**
- Location: `/Users/seman/Desktop/zmartV0.69/programs/zmart-proposal/` (if exists)
- Status: TBD (may be integrated into zmart-core)
- Focus: Off-chain vote aggregation → on-chain recording

**3. Backend Services (Integration Security)**
- Vote Aggregator: `/Users/seman/Desktop/zmartV0.69/backend/vote-aggregator/`
- Market Monitor: `/Users/seman/Desktop/zmartV0.69/backend/src/services/market-monitor/`
- Event Indexer: `/Users/seman/Desktop/zmartV0.69/backend/event-indexer/`
- API Gateway: `/Users/seman/Desktop/zmartV0.69/backend/src/api/`

**4. Frontend (When Built - Week 10-12)**
- Next.js dApp (not yet started)
- Wallet integration security
- Transaction handling
- RPC provider security

---

## 📚 Preparation Tasks (Pre-Audit)

### Phase 1: Gather Audit Materials (Day 0 - Before Week 2)

- [ ] **Collect all program source code**
  - [ ] Export zmart-core to single file: `programs/zmart-core/src/lib.rs` + all modules
  - [ ] Export all instruction handlers
  - [ ] Export all state structures
  - [ ] Export all error codes

- [ ] **Document program architecture**
  - [ ] Create visual diagram of 18 instructions
  - [ ] Map all account dependencies
  - [ ] Document CPI calls (if any)
  - [ ] List all external dependencies

- [ ] **Prepare economic context**
  - [ ] Document LMSR formulas from CORE_LOGIC_INVARIANTS.md
  - [ ] Calculate bounded loss verification
  - [ ] List all fee percentages (3/2/5 split)
  - [ ] Identify all economic parameters (30+ parameters)

- [ ] **Create audit workspace**
  - [ ] Directory: `/Users/seman/Desktop/zmartV0.69/security/audits/week2-primary/`
  - [ ] Subdirectories: `findings/`, `reports/`, `fixes/`, `tests/`
  - [ ] Copy blockchain-tool reference files locally for quick access

### Phase 2: Read Reference Materials (Day 1 Morning - 2 hours)

Critical reading order (use blockchain-tool skill):

- [ ] **Solana Advanced Vulnerabilities** (50+ patterns)
  - [ ] Account aliasing (CRITICAL for our trading instructions)
  - [ ] Missing reload() after CPI (if we do token transfers)
  - [ ] Arbitrary CPI (program ID validation)
  - [ ] Revival attacks (closed account recreation)
  - [ ] Signer authorization bypass
  - [ ] Type confusion vulnerabilities

- [ ] **Economic Exploits** (30+ patterns)
  - [ ] Flash loan attack vectors (relevant for LMSR?)
  - [ ] Oracle manipulation (we use internal LMSR pricing)
  - [ ] Price impact attacks
  - [ ] Bounded loss verification
  - [ ] Fee calculation exploits

- [ ] **Operational Issues** (60+ patterns)
  - [ ] Deployment readiness checks
  - [ ] State desynchronization
  - [ ] Integration issues
  - [ ] Testing coverage gaps

---

## 🔍 Critical Vulnerability Priorities for ZMART

### Priority 1: CRITICAL (Must Fix Before Any Production Use)

**Solana-Specific:**
1. **Account Aliasing in Trading**
   - Risk: User passes same account as `user_position_yes` and `user_position_no`
   - Impact: Double-spend, invalid state
   - Check: All instructions that accept multiple mutable accounts

2. **Missing reload() After Token Transfers**
   - Risk: Using stale balance data after CPI to token program
   - Impact: Incorrect calculations, lost funds
   - Check: Any instruction that does token transfers then reads balances

3. **Arbitrary CPI Vulnerabilities**
   - Risk: User-controlled program IDs in CPI calls
   - Impact: Malicious program invocation
   - Check: All CPI calls validate program IDs against known addresses

4. **Signer Authorization Bypass**
   - Risk: Missing `#[account(signer)]` constraints
   - Impact: Unauthorized operations
   - Check: All instructions that should require signatures

**LMSR Economic:**
5. **Bounded Loss Violation**
   - Risk: Cost function exceeds b * ln(2) maximum loss
   - Impact: Liquidity provider insolvency
   - Check: Mathematical proof + fuzzing with extreme values

6. **Integer Overflow in Fixed-Point Math**
   - Risk: Overflow in multiplication/exponentiation
   - Impact: Incorrect pricing, fund loss
   - Check: All LMSR calculations use checked arithmetic

7. **Fee Distribution Errors**
   - Risk: Rounding errors in 3/2/5 fee split
   - Impact: Lost fees or fee theft
   - Check: Fee totals always sum to 10% exactly

### Priority 2: HIGH (Fix Before Mainnet)

8. **State Transition Validation**
   - Risk: Invalid state transitions (e.g., PROPOSED → FINALIZED skipping ACTIVE)
   - Impact: Markets stuck or exploited
   - Check: All state transitions validated against FSM rules

9. **Vote Manipulation**
   - Risk: Double voting, vote replay, unauthorized votes
   - Impact: Incorrect market resolution
   - Check: VoteRecord uniqueness, signer validation

10. **Claim Exploitation**
    - Risk: Double claiming, claiming from wrong outcome
    - Impact: Fund theft
    - Check: Claim flags, outcome validation

### Priority 3: MEDIUM (Best Practices)

11. **Access Control Consistency**
    - Risk: Inconsistent admin checks
    - Impact: Operational issues
    - Check: All admin functions use same authority validation

12. **Error Handling Completeness**
    - Risk: Missing error codes, generic errors
    - Impact: Debugging difficulty
    - Check: All error paths have specific error codes

13. **Event Emission**
    - Risk: Missing events for critical operations
    - Impact: Off-chain indexing gaps
    - Check: All state changes emit events

---

## 📅 Week 2 Execution Plan (Day-by-Day)

### **Monday (Day 1) - Security Analysis**

**Morning (4 hours):**
- [ ] Launch blockchain-tool skill
- [ ] Read all reference files (Solana + Economic + Operational)
- [ ] Begin comprehensive program analysis
- [ ] Document initial findings

**Afternoon (4 hours):**
- [ ] Complete instruction-by-instruction security review
- [ ] Test account aliasing scenarios
- [ ] Verify all CPI calls
- [ ] Check signer constraints

**Evening:**
- [ ] Daily checkpoint: How many CRITICAL issues found?
- [ ] Update findings log

### **Tuesday (Day 2) - Economic Analysis**

**Morning (4 hours):**
- [ ] LMSR bounded loss verification
- [ ] Fixed-point math overflow testing
- [ ] Fee distribution validation
- [ ] Calculate attack profitability scenarios

**Afternoon (4 hours):**
- [ ] Flash loan attack simulation (if applicable)
- [ ] Price manipulation cost analysis
- [ ] Document economic vulnerabilities
- [ ] Calculate fix priorities by economic impact

**Evening:**
- [ ] Daily checkpoint: Economic attack vectors identified?
- [ ] Update findings log

### **Wednesday (Day 3) - Operational & Integration**

**Morning (4 hours):**
- [ ] State transition validation testing
- [ ] Vote system security review
- [ ] Claim logic verification
- [ ] Multi-user interaction testing

**Afternoon (4 hours):**
- [ ] Backend service integration audit (vote-aggregator, market-monitor)
- [ ] Event indexer security review
- [ ] API gateway vulnerability scan
- [ ] Database RLS policy review

**Evening:**
- [ ] Daily checkpoint: All systems audited?
- [ ] Update findings log

### **Thursday (Day 4) - Report Generation**

**Morning (4 hours):**
- [ ] Compile all findings into professional audit report
- [ ] Use blockchain-tool audit report template
- [ ] Categorize by severity (CRITICAL → INFORMATIONAL)
- [ ] Write executive summary with risk levels

**Afternoon (4 hours):**
- [ ] Create fix recommendations with code examples
- [ ] Document testing strategies for each fix
- [ ] Calculate total risk score
- [ ] Generate deployment readiness checklist

**Evening:**
- [ ] Review complete report
- [ ] Verify all findings actionable

### **Friday (Day 5) - Fix Implementation Planning**

**Morning (4 hours):**
- [ ] Prioritize fixes (CRITICAL first)
- [ ] Estimate fix effort (hours per issue)
- [ ] Create fix implementation timeline
- [ ] Identify fixes that can be parallelized

**Afternoon (4 hours):**
- [ ] Begin implementing CRITICAL fixes
- [ ] Write security-focused tests
- [ ] Document fix validation approach
- [ ] Plan Week 3 re-audit

**Evening:**
- [ ] Week 2 Quality Gate: Audit report complete?
- [ ] Update CURRENT_STATUS.md with audit findings

---

## ✅ Week 2 Quality Gate Criteria

**Audit Completeness:**
- [ ] All 18 instructions analyzed
- [ ] All 50+ Solana vulnerability patterns checked
- [ ] Economic analysis complete (attack profitability calculated)
- [ ] Operational issues identified
- [ ] Professional audit report generated

**Findings Documentation:**
- [ ] All findings categorized by severity
- [ ] Each finding has code example + fix recommendation
- [ ] Testing strategy documented for each fix
- [ ] Economic impact calculated for exploits

**Actionability:**
- [ ] 100% of CRITICAL findings have clear fix instructions
- [ ] Fix effort estimated (hours)
- [ ] Implementation timeline created
- [ ] Re-audit plan established

**Quality Standards:**
- [ ] <10% false positives (verify all findings are real)
- [ ] 95%+ coverage (all major vulnerability categories checked)
- [ ] Professional report format (executive summary + detailed findings)
- [ ] Ready to share with external auditor (if needed)

---

## 🔧 Audit Tools & Commands

### blockchain-tool Skill Usage

**Launch Audit:**
```bash
# In Claude Code, invoke skill
Use blockchain-tool skill

# Read Solana reference first
view references/solana-advanced-vulnerabilities.md

# Read economic patterns
view references/economic-exploits.md

# Use report template
view templates/audit-report.md
```

**Analysis Commands:**
```bash
# Account aliasing detection
grep -r "Account<'info" programs/zmart-core/src/

# CPI call audit
grep -r "invoke\|invoke_signed" programs/zmart-core/src/

# Signer constraint verification
grep -r "#\[account(signer)\]" programs/zmart-core/src/

# Fixed-point math audit
grep -r "checked_mul\|checked_add" programs/zmart-core/src/
```

### Anchor Testing

**Run Program Tests:**
```bash
cd /Users/seman/Desktop/zmartV0.69
anchor test

# Run with coverage
anchor test --coverage

# Run specific test
anchor test --test test_lmsr_bounded_loss
```

### Fuzzing (If Time Permits)

**Install Honggfuzz:**
```bash
cargo install honggfuzz

# Fuzz LMSR calculations
cargo hfuzz run lmsr_fuzz
```

---

## 📊 Expected Outcomes

### Audit Report Sections

1. **Executive Summary**
   - Overall risk level (Critical/High/Medium/Low)
   - Total findings count by severity
   - Key recommendations
   - Deployment readiness assessment

2. **Critical Findings** (Expected: 0-3)
   - Account aliasing issues
   - Missing reload() after CPI
   - LMSR bounded loss violations
   - Each with code example + fix

3. **High Findings** (Expected: 3-8)
   - State transition gaps
   - Vote manipulation vectors
   - Claim exploits
   - Each with fix priority

4. **Medium Findings** (Expected: 5-15)
   - Access control inconsistencies
   - Missing error codes
   - Event emission gaps
   - Best practice improvements

5. **Low/Informational** (Expected: 10-20)
   - Code quality improvements
   - Gas optimizations
   - Documentation gaps
   - Testing recommendations

### Deployment Readiness

**After Week 2 Audit:**
- Risk Level: Should be MEDIUM or lower
- CRITICAL Issues: 0 (all fixed)
- HIGH Issues: <3 (with fix plan)
- Test Coverage: >90%
- Deployment Status: READY for Week 3 fixes → Week 4 re-audit

---

## 🚀 Parallel Track Coordination

While PRIMARY AUDIT runs, two other tracks operate in parallel:

### **Track A: Audit (blockchain-tool) - PRIMARY**
- Monday-Friday: Full security audit
- Owner: blockchain-tool skill
- Deliverable: Professional audit report

### **Track B: Frontend Kickoff (Next.js)**
- Start: Week 2 Day 3 (Wednesday)
- Initial setup while audit completes
- Wallet integration planning
- No coding until audit fixes complete

### **Track C: Integration Testing Enhancement**
- Add security-focused E2E tests
- Simulate attack scenarios
- Validate fix effectiveness
- Build regression test suite

---

## 📝 Documentation Requirements

### During Audit

**Daily Logs:**
- Create: `/Users/seman/Desktop/zmartV0.69/security/audits/week2-primary/logs/day{1-5}.md`
- Content: Findings, analysis notes, questions, blockers

**Findings Tracker:**
- Create: `/Users/seman/Desktop/zmartV0.69/security/audits/week2-primary/findings/tracker.csv`
- Columns: ID, Severity, Category, Description, Location, Fix Effort, Status

**Evidence Collection:**
- Screenshots of vulnerable code
- Proof-of-concept exploits (if safe to create)
- Test case failures
- Economic calculations

### After Audit

**Final Deliverables:**
1. Professional audit report (use blockchain-tool template)
2. Fix implementation plan (prioritized by severity + effort)
3. Security-focused test suite
4. Deployment readiness checklist
5. Re-audit schedule (Week 4)

---

## 🎯 Success Metrics

**Audit Quality:**
- [ ] 470+ vulnerability patterns checked ✅
- [ ] <10% false positive rate ✅
- [ ] 100% of findings actionable ✅
- [ ] Professional report quality ✅

**Risk Reduction:**
- [ ] CRITICAL issues: 0 (all fixed or have fix plan)
- [ ] HIGH issues: <3 remaining
- [ ] Overall risk: Medium or lower
- [ ] Deployment blockers: 0

**Timeline Adherence:**
- [ ] Week 2 complete by Friday Nov 22
- [ ] Audit report delivered on schedule
- [ ] No delays to Week 3-14 timeline
- [ ] Parallel tracks coordinated

---

## 🔄 Post-Audit Actions (Week 3-4)

### Week 3: Fix Implementation
- Implement all CRITICAL fixes
- Implement HIGH priority fixes
- Write security-focused tests
- Document all changes

### Week 4: Re-Audit
- Run blockchain-tool audit again
- Verify all fixes effective
- Confirm no new vulnerabilities introduced
- Final deployment readiness check

### Week 5+: Continuous Security
- Integrate security checks into CI/CD
- Monthly re-audits during development
- Pre-deployment final audit
- Bug bounty program (post-mainnet)

---

## 📞 Escalation & Support

**Blockers:**
- If audit reveals CRITICAL unfixable issues → Escalate immediately
- If timeline at risk → Re-prioritize parallel tracks
- If external audit needed → Begin vendor search Week 3

**Resources:**
- blockchain-tool skill: 470+ patterns, professional templates
- CORE_LOGIC_INVARIANTS.md: Blueprint compliance reference
- Solana security best practices: Anchor book, Neodyme guides
- Economic attack analysis: DeFi exploit databases

---

## 🎓 Learning Outcomes

By end of Week 2, team will have:
- Deep understanding of Solana security vulnerabilities
- Economic attack analysis skills
- Professional audit report writing capability
- Security-first development mindset
- Comprehensive fix implementation plan

---

**Ready to Begin Week 2 Audit:** ✅
**Prerequisites Complete:** Monitoring active, services stable
**Next Action:** Monday Nov 18 - Launch blockchain-tool PRIMARY AUDIT

---

*Last Updated: November 9, 2025*
*Status: PREPARATION COMPLETE - READY FOR WEEK 2*
