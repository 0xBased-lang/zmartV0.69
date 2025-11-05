# STORY-2.1: Backend Infrastructure Setup (Day 8)

**Status:** 🔄 IN PROGRESS
**Started:** November 5, 2025
**Tier:** Tier 2 (Core - Enhanced DoD)

---

## 📋 Story Overview

**Objective:** Set up complete backend infrastructure for Week 2 services

**Scope:**
- TypeScript + Node.js project configuration
- Database connections (Supabase + Redis)
- Solana connection to devnet programs
- Shared utilities and logging
- Environment variable management
- Development tooling

**Success Criteria:**
- Backend builds without errors ✅
- Can connect to Supabase ✅
- Can connect to Solana devnet ✅
- Can connect to Redis ✅
- Environment variables loaded ✅
- Shared utilities working ✅

---

## 🎯 Acceptance Criteria

### Functional Requirements

1. **GIVEN** empty backend directory
   **WHEN** npm install executed
   **THEN** all dependencies installed successfully

2. **GIVEN** TypeScript configuration
   **WHEN** npm run build executed
   **THEN** compiles without errors

3. **GIVEN** environment variables configured
   **WHEN** services started
   **THEN** connects to all external services

4. **GIVEN** shared utilities
   **WHEN** imported in service files
   **THEN** logger and config work correctly

### Technical Requirements

1. **TypeScript Configuration**
   - Strict mode enabled
   - ES2022 target
   - Module resolution: node
   - Source maps enabled
   - Output to dist/

2. **Dependencies Required**
   - @coral-xyz/anchor ^0.29.0
   - @solana/web3.js ^1.87.6
   - @supabase/supabase-js ^2.38.0
   - express ^4.18.2
   - ws ^8.14.2
   - ioredis ^5.3.2
   - node-cron ^3.0.3
   - ipfs-http-client ^60.0.1
   - dotenv ^16.3.1
   - winston ^3.11.0
   - joi ^17.11.0

3. **Environment Variables**
   - SOLANA_RPC_URL (devnet)
   - SOLANA_PROGRAM_ID (zmart-core)
   - BACKEND_KEYPAIR (secure)
   - SUPABASE_URL
   - SUPABASE_KEY
   - REDIS_URL
   - IPFS_PROJECT_ID
   - IPFS_PROJECT_SECRET

4. **Directory Structure**
   ```
   backend/
   ├── package.json
   ├── tsconfig.json
   ├── .env.example
   ├── README.md
   ├── src/
   │   ├── index.ts
   │   ├── config/
   │   ├── services/
   │   ├── api/
   │   └── utils/
   ├── tests/
   └── scripts/
   ```

---

## 📦 Implementation Tasks

### Phase 1: Project Initialization (30 min)
- [ ] Create backend/ directory structure
- [ ] Initialize npm project
- [ ] Install TypeScript dependencies
- [ ] Configure tsconfig.json
- [ ] Create .env.example
- [ ] Set up .gitignore

### Phase 2: Configuration Setup (45 min)
- [ ] Create config/env.ts (environment variables)
- [ ] Create config/database.ts (Supabase client)
- [ ] Create config/solana.ts (Solana connection)
- [ ] Create config/redis.ts (Redis client)
- [ ] Create config/index.ts (export all)

### Phase 3: Shared Utilities (30 min)
- [ ] Create utils/logger.ts (Winston logger)
- [ ] Create utils/retry.ts (retry logic)
- [ ] Create utils/validation.ts (Joi helpers)
- [ ] Create types/index.ts (TypeScript types)

### Phase 4: Testing & Validation (15 min)
- [ ] Build project (npm run build)
- [ ] Test Supabase connection
- [ ] Test Solana connection
- [ ] Test Redis connection
- [ ] Verify all utilities work

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Config loading tests
- [ ] Database connection tests
- [ ] Utility function tests

### Integration Tests
- [ ] Can connect to Supabase
- [ ] Can connect to Solana devnet
- [ ] Can connect to Redis
- [ ] Can query devnet programs

### Manual Testing
- [ ] npm install succeeds
- [ ] npm run build succeeds
- [ ] npm run dev starts server
- [ ] All environment variables load

---

## Definition of Done (Tier 2 - Core)

### Code Quality
- [ ] TypeScript strict mode passes
- [ ] No ESLint errors
- [ ] All imports resolve correctly
- [ ] Code formatted (Prettier)

### Testing
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] All tests passing
- [ ] Test coverage >80%

### Documentation
- [ ] README.md with setup instructions
- [ ] .env.example documented
- [ ] Code comments for complex logic
- [ ] API documentation started

### Security
- [ ] No secrets in source code
- [ ] Environment variables validated
- [ ] Secure key storage documented
- [ ] Dependencies audited (npm audit)

### Performance
- [ ] Build time <30 seconds
- [ ] Startup time <5 seconds
- [ ] Connection pooling configured

### Integration
- [ ] Connects to devnet programs
- [ ] Supabase queries work
- [ ] Redis caching works

### Deployment Readiness
- [ ] Build scripts working
- [ ] Development mode working
- [ ] Production mode configured

---

## 📚 Dependencies

**Prerequisites:**
- STORY-1.7 complete (devnet programs deployed) ✅
- Supabase project created
- Redis instance available
- IPFS Infura account

**Blocked By:** None

**Blocks:**
- STORY-2.2 (Vote Aggregator)
- STORY-2.3 (IPFS Service)
- STORY-2.4 (API Gateway)

---

## 🔗 Related Documents

- [Week 2 Implementation Plan](../WEEK-2-IMPLEMENTATION-PLAN.md)
- [On-Chain/Off-Chain Integration](../07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md)
- [Database Schema](../08_DATABASE_SCHEMA.md)

---

## 📝 Notes

**Technical Decisions:**
- Using TypeScript strict mode for type safety
- Winston for logging (better than console.log)
- Joi for validation (better than manual checks)
- ioredis for Redis (best performance)

**Risks:**
- Supabase connection failures (use retry logic)
- Solana RPC rate limits (use private RPC if needed)
- Redis memory limits (configure eviction policy)

**Future Enhancements (v2):**
- Add Prisma ORM
- Add GraphQL API
- Add monitoring (Datadog/NewRelic)
- Add tracing (OpenTelemetry)

---

**Created:** November 5, 2025
**Last Updated:** November 5, 2025
**Story Points:** 3 (Small-Medium)
**Estimated Time:** 2 hours
