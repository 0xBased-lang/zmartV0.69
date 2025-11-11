# Performance Testing Guide - ZMART V0.69

**Purpose:** Validate platform performance under load before production deployment.

**Last Updated:** November 11, 2025

---

## 📋 Overview

This guide covers comprehensive performance testing to ensure ZMART can handle production traffic:
- Load testing (expected traffic patterns)
- Stress testing (maximum capacity)
- Spike testing (sudden traffic bursts)
- Endurance testing (sustained load)
- Database query performance
- WebSocket connection limits
- Real-time update performance

---

## 🎯 Performance Targets

### Response Time Targets

| Endpoint | Target (p50) | Target (p95) | Target (p99) | Max Acceptable |
|----------|--------------|--------------|--------------|----------------|
| GET /api/markets | <100ms | <200ms | <500ms | 1000ms |
| GET /api/markets/:id | <100ms | <200ms | <500ms | 1000ms |
| POST /api/trade | <500ms | <1000ms | <2000ms | 5000ms |
| WebSocket connection | <1000ms | <2000ms | <3000ms | 5000ms |
| Real-time updates | <2000ms | <5000ms | <10000ms | 15000ms |

### Throughput Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Concurrent users | 1000+ | 500+ | 100+ |
| Requests/second | 100+ | 50+ | 10+ |
| WebSocket connections | 500+ | 250+ | 50+ |
| Trades/minute | 100+ | 50+ | 10+ |
| Database queries/sec | 500+ | 250+ | 50+ |

### Resource Limits

| Resource | Target | Acceptable | Critical |
|----------|--------|------------|----------|
| CPU usage (VPS) | <50% | <75% | <90% |
| Memory usage (VPS) | <4GB | <6GB | <8GB |
| Database connections | <20 | <40 | <100 |
| Disk I/O | <50% | <75% | <90% |
| Network bandwidth | <50Mbps | <100Mbps | <200Mbps |

---

## 🔧 Testing Tools

### 1. Artillery (Load Testing)
```bash
npm install -g artillery
```

### 2. k6 (Performance Testing)
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6
```

### 3. Autocannon (HTTP Benchmarking)
```bash
npm install -g autocannon
```

### 4. PostgreSQL pg_bench (Database Testing)
```bash
# Already installed with PostgreSQL
```

---

## 📊 Test Scenarios

### Scenario 1: Normal Load Test (Baseline)

**Goal:** Verify system handles expected daily traffic

**Load Profile:**
- 100 concurrent users
- 10 requests/second sustained
- Duration: 5 minutes
- Ramp-up: 1 minute

**Test Script** (`tests/performance/load-test-normal.yml`):
```yaml
config:
  target: "http://185.202.236.71:4000"
  phases:
    - duration: 60
      arrivalRate: 2
      name: "Warm up"
    - duration: 300
      arrivalRate: 10
      name: "Sustained load"
  processor: "./load-test-processor.js"

scenarios:
  - name: "Browse markets"
    weight: 50
    flow:
      - get:
          url: "/api/markets"
      - think: 2
      - get:
          url: "/api/markets?state=ACTIVE"
      - think: 3

  - name: "View market details"
    weight: 30
    flow:
      - get:
          url: "/api/markets"
      - function: "selectRandomMarket"
      - get:
          url: "/api/markets/{{ marketId }}"
      - think: 5

  - name: "Check portfolio"
    weight: 20
    flow:
      - get:
          url: "/api/users/{{ userId }}/positions"
      - think: 3
```

**Run:**
```bash
artillery run tests/performance/load-test-normal.yml --output report-normal.json
artillery report report-normal.json
```

**Success Criteria:**
- ✅ p95 response time < 200ms
- ✅ p99 response time < 500ms
- ✅ 0% error rate
- ✅ CPU < 50%
- ✅ Memory < 4GB

---

### Scenario 2: Stress Test (Maximum Capacity)

**Goal:** Find breaking point and maximum capacity

**Load Profile:**
- Start: 50 users
- Ramp to: 500 users
- Step: +50 users every minute
- Duration: 10 minutes

**Test Script** (`tests/performance/stress-test.yml`):
```yaml
config:
  target: "http://185.202.236.71:4000"
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 50
      name: "Ramp to 50 users"
    - duration: 60
      arrivalRate: 50
      rampTo: 100
      name: "Ramp to 100 users"
    - duration: 60
      arrivalRate: 100
      rampTo: 200
      name: "Ramp to 200 users"
    - duration: 60
      arrivalRate: 200
      rampTo: 300
      name: "Ramp to 300 users"
    - duration: 60
      arrivalRate: 300
      rampTo: 500
      name: "Ramp to 500 users"

scenarios:
  - name: "Mixed workload"
    flow:
      - get:
          url: "/api/markets"
      - think: 1
      - get:
          url: "/api/markets?state=ACTIVE&sort=volume"
      - think: 2
```

**Run:**
```bash
artillery run tests/performance/stress-test.yml --output report-stress.json
artillery report report-stress.json
```

**Success Criteria:**
- ✅ Handles 200+ concurrent users with <5% error rate
- ✅ Graceful degradation (not complete failure)
- ✅ Recovery after load decreases
- ✅ No memory leaks

---

### Scenario 3: Spike Test (Traffic Bursts)

**Goal:** Test resilience to sudden traffic spikes

**Load Profile:**
- Baseline: 10 users
- Spike to: 200 users (instant)
- Hold: 1 minute
- Return to: 10 users

**Test Script** (`tests/performance/spike-test.yml`):
```yaml
config:
  target: "http://185.202.236.71:4000"
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Baseline load"
    - duration: 60
      arrivalRate: 200
      name: "SPIKE!"
    - duration: 120
      arrivalRate: 10
      name: "Recovery"

scenarios:
  - flow:
      - get:
          url: "/api/markets"
```

**Success Criteria:**
- ✅ System doesn't crash during spike
- ✅ Error rate < 10% during spike
- ✅ Recovery to baseline within 60s
- ✅ No cascading failures

---

### Scenario 4: Endurance Test (Sustained Load)

**Goal:** Detect memory leaks and degradation over time

**Load Profile:**
- 50 concurrent users
- Duration: 1 hour
- Constant load

**Run:**
```bash
artillery quick --count 50 --num 3600 http://185.202.236.71:4000/api/markets
```

**Success Criteria:**
- ✅ No performance degradation over time
- ✅ Memory usage stable (no leaks)
- ✅ No connection pool exhaustion
- ✅ Consistent response times

---

### Scenario 5: Database Performance Test

**Goal:** Validate database query performance

**Test Queries:**
```sql
-- 1. Market listing (most frequent)
EXPLAIN ANALYZE
SELECT * FROM markets
WHERE state = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;
-- Target: < 50ms

-- 2. User positions (frequent)
EXPLAIN ANALYZE
SELECT * FROM positions
WHERE user_id = 'some-user-id';
-- Target: < 50ms

-- 3. Trade history (frequent)
EXPLAIN ANALYZE
SELECT * FROM trades
WHERE market_id = 'some-market-id'
ORDER BY created_at DESC
LIMIT 50;
-- Target: < 100ms

-- 4. Complex aggregation (less frequent)
EXPLAIN ANALYZE
SELECT
  market_id,
  SUM(shares_yes) as total_yes,
  SUM(shares_no) as total_no
FROM positions
GROUP BY market_id;
-- Target: < 500ms
```

**Run:**
```bash
# Connect to Supabase
psql "postgresql://postgres.tkkqqxepelibqjjhxxct:Dodo-good-2025@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Run queries and check EXPLAIN ANALYZE output
```

**Success Criteria:**
- ✅ All queries under target times
- ✅ Proper index usage
- ✅ No sequential scans on large tables
- ✅ Connection pool efficient

---

### Scenario 6: WebSocket Stress Test

**Goal:** Test WebSocket server capacity

**Load Profile:**
- 500 concurrent WebSocket connections
- Each connection subscribes to 3 market channels
- Total: 1500 active subscriptions

**Test Script** (`tests/performance/websocket-stress.spec.ts`):
```typescript
// Already exists - run it:
pnpm test:e2e tests/e2e/websocket-stress.spec.ts
```

**Success Criteria:**
- ✅ Handles 500+ connections simultaneously
- ✅ Message delivery < 5 seconds
- ✅ No dropped messages
- ✅ Graceful handling of connection churn

---

### Scenario 7: Trading Performance Test

**Goal:** Validate trading throughput

**Load Profile:**
- 50 simultaneous trades
- Mix of buy/sell
- 100 trades/minute sustained

**Metrics to Monitor:**
- Transaction build time
- Signature time (wallet)
- Solana confirmation time
- Database update time
- WebSocket broadcast time

**Test Script** (`tests/performance/trading-performance.js`):
```javascript
// Simplified pseudo-code
const { Connection, Keypair } = require('@solana/web3.js');

async function performanceTest() {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = Keypair.generate();

  const startTime = Date.now();

  // Execute 100 trades
  for (let i = 0; i < 100; i++) {
    const tradeStart = Date.now();

    // Build transaction
    const tx = await buildTradeTx(wallet.publicKey, 'buy', 10);

    // Sign
    tx.sign(wallet);

    // Send
    const signature = await connection.sendRawTransaction(tx.serialize());

    // Confirm
    await connection.confirmTransaction(signature);

    const tradeTime = Date.now() - tradeStart;
    console.log(`Trade ${i + 1}: ${tradeTime}ms`);
  }

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / 100;
  const throughput = (100 / totalTime) * 1000 * 60; // trades/minute

  console.log(`Total: ${totalTime}ms`);
  console.log(`Average: ${avgTime}ms per trade`);
  console.log(`Throughput: ${throughput} trades/minute`);
}
```

**Success Criteria:**
- ✅ Average trade time < 3 seconds
- ✅ Throughput > 20 trades/minute
- ✅ Success rate > 95%
- ✅ No bottlenecks detected

---

## 📈 Performance Monitoring

### Real-Time Monitoring During Tests

**VPS Monitoring:**
```bash
# SSH to VPS
ssh kek

# Monitor CPU, memory, network
htop

# Monitor PM2 processes
pm2 monit

# Monitor logs in real-time
pm2 logs --lines 100

# Check process resource usage
ps aux | grep node
```

**Database Monitoring:**
```sql
-- Active queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Cache hit ratio (should be >90%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

**Network Monitoring:**
```bash
# Monitor network traffic
sudo iftop

# Check bandwidth usage
vnstat -l
```

---

## 🚨 Performance Issues & Solutions

### Issue: High Response Times

**Symptoms:**
- API responses > 1 second
- Timeouts on frontend

**Debug:**
```bash
# Check backend logs
ssh kek && pm2 logs api-gateway --lines 100

# Check for slow database queries
# (see Database Monitoring section above)

# Check CPU/memory usage
htop
```

**Solutions:**
1. Add database indexes
2. Implement caching (Redis)
3. Optimize database queries
4. Scale horizontally (add more servers)

---

### Issue: Memory Leaks

**Symptoms:**
- Memory usage increases over time
- Eventually runs out of memory (OOM)

**Debug:**
```bash
# Monitor memory over time
watch -n 5 'free -h'

# Check PM2 memory usage
pm2 status

# Heap snapshot (Node.js)
node --expose-gc --inspect index.js
```

**Solutions:**
1. Fix event listener leaks
2. Clear intervals/timeouts properly
3. Limit connection pool size
4. Implement proper cleanup in WebSocket handlers

---

### Issue: Database Connection Pool Exhaustion

**Symptoms:**
- "Too many connections" errors
- Requests queued waiting for connection

**Debug:**
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT * FROM pg_stat_activity WHERE state = 'idle';
```

**Solutions:**
1. Increase pool size (carefully)
2. Reduce connection timeout
3. Fix connection leaks in code
4. Implement connection pooling at application level

---

### Issue: WebSocket Disconnections

**Symptoms:**
- Frequent reconnections
- Real-time updates delayed/missing

**Debug:**
```bash
# Check WebSocket server logs
pm2 logs websocket-server --lines 100

# Check connection count
# (from WebSocket server metrics)
```

**Solutions:**
1. Increase WebSocket timeout
2. Implement heartbeat/ping-pong
3. Add connection retry logic
4. Scale WebSocket server

---

## 📊 Performance Test Report Template

```markdown
# Performance Test Report - [DATE]

**Tester:** [NAME]
**Environment:** Devnet VPS (185.202.236.71)
**Duration:** [START] to [END]

## Test Results Summary

| Test | Target | Actual | Status |
|------|--------|--------|--------|
| Normal Load (100 users) | p95 < 200ms | __ms | PASS/FAIL |
| Stress Test (max users) | 200+ users | __ users | PASS/FAIL |
| Spike Test | < 10% errors | __% | PASS/FAIL |
| Endurance (1 hour) | No degradation | __ | PASS/FAIL |
| Database queries | < 50ms | __ms | PASS/FAIL |
| WebSocket (500 connections) | <5s delivery | __s | PASS/FAIL |
| Trading throughput | 20+ trades/min | __ trades/min | PASS/FAIL |

## Detailed Results

### Normal Load Test
- Requests: _____
- Duration: _____
- p50: ___ms
- p95: ___ms
- p99: ___ms
- Errors: ___%
- CPU: ___%
- Memory: ___GB

### Stress Test
- Max users handled: ___
- Breaking point: ___ users
- Error rate at max: ___%
- Recovery time: ___s

### Resource Usage
- Peak CPU: ___%
- Peak Memory: ___GB
- Peak DB connections: ___
- Peak network: ___Mbps

## Issues Found
1. [Issue description]
2. [Additional issues...]

## Recommendations
1. [Performance optimization suggestions]
2. [Scaling recommendations]

## Conclusion
- Ready for production: YES/NO
- Max recommended load: ___ users
- Scaling needed: YES/NO
```

---

## ✅ Success Criteria

**Must Pass:**
- ✅ Normal load test passes all targets
- ✅ Handles 200+ concurrent users
- ✅ No memory leaks in 1-hour test
- ✅ Database queries optimized
- ✅ WebSocket handles 250+ connections

**Nice to Have:**
- ✅ Handles 500+ concurrent users
- ✅ All tests pass with green metrics
- ✅ Sub-100ms p95 response times
- ✅ 1000+ WebSocket connections

---

## 📝 Next Steps

1. **Run all 7 test scenarios** documented above
2. **Document results** in test report template
3. **Fix performance issues** identified
4. **Retest** after optimizations
5. **Approve for production** if all criteria met
6. **Set up production monitoring** (Datadog, New Relic, etc.)

---

**Questions?**
- Review [docs/orientation/SERVICE_ARCHITECTURE.md](../orientation/SERVICE_ARCHITECTURE.md)
- Check backend logs: `ssh kek && pm2 logs`
- Monitor database: Supabase dashboard

**Good luck with performance testing! 🚀**
 Human: continue