// PM2 Ecosystem Configuration for ZMART Backend Services
// Usage: pm2 start ecosystem.config.js
//
// 🔧 Architecture: 5 services total (4 active + 1 disabled)
//   - Service 1: API Gateway (includes WebSocket on port 4001)
//   - Service 2: Vote Aggregator
//   - Service 3: Market Monitor
//   - Service 4: Event Indexer
//   - Service 5: IPFS Snapshot (disabled for MVP)

module.exports = {
  apps: [
    // Service 1: API Gateway (REST API + WebSocket) - ports 4000, 4001
    {
      name: 'api-gateway',
      script: './dist/index.js',
      cwd: '/Users/seman/Desktop/zmartV0.69/backend',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
        API_PORT: 4000,
        WS_PORT: 4001,  // WebSocket runs inside api-gateway
      },
      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_file: './logs/api-gateway-combined.log',
      time: true,
    },

    // Service 2: Vote Aggregator (HTTP server + cron: every 5 minutes)
    // NOTE: WebSocket Server runs inside api-gateway (not a separate PM2 process)
    {
      name: 'vote-aggregator',
      script: './dist/index.js',
      cwd: '/Users/seman/Desktop/zmartV0.69/backend/vote-aggregator',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      cron_restart: '*/5 * * * *', // Every 5 minutes
      env: {
        NODE_ENV: 'development',
        VOTE_AGGREGATION_INTERVAL: 300000,
      },
      error_file: '../logs/vote-aggregator-error.log',
      out_file: '../logs/vote-aggregator-out.log',
      log_file: '../logs/vote-aggregator-combined.log',
      time: true,
    },

    // Service 3: Market Monitor (cron: every 5 minutes)
    {
      name: 'market-monitor',
      script: './dist/services/market-monitor/index.js',
      cwd: '/Users/seman/Desktop/zmartV0.69/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      cron_restart: '*/5 * * * *', // Every 5 minutes
      env: {
        NODE_ENV: 'development',
      },
      error_file: './logs/market-monitor-error.log',
      out_file: './logs/market-monitor-out.log',
      log_file: './logs/market-monitor-combined.log',
      time: true,
    },

    // Service 4: Event Indexer (Helius webhook listener) - Week 5
    // ✅ ENABLED - Real-time blockchain event monitoring
    // Receives webhooks from Helius and indexes on-chain events to Supabase
    {
      name: 'event-indexer',
      script: './src/index.ts',
      cwd: '/Users/seman/Desktop/zmartV0.69/backend/event-indexer',
      exec_mode: 'fork',
      interpreter: 'node',
      interpreter_args: '--require ts-node/register',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
        PORT: 4002,
      },
      error_file: '../logs/event-indexer-error.log',
      out_file: '../logs/event-indexer-out.log',
      log_file: '../logs/event-indexer-combined.log',
      time: true,
    },

    // Service 5: IPFS Snapshot Service (cron: daily at midnight UTC)
    // ❌ DISABLED FOR MVP - Not needed for core functionality
    // Reason: Supabase stores discussions reliably, IPFS is nice-to-have
    // Can be re-enabled later if decentralized discussion storage needed
    // {
    //   name: 'ipfs-snapshot',
    //   script: './dist/services/ipfs/standalone.js',
    //   cwd: '/Users/seman/Desktop/zmartV0.69/backend',
    //   exec_mode: 'fork',
    //   instances: 1,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '300M',
    //   env: {
    //     NODE_ENV: 'development',
    //   },
    //   error_file: './logs/ipfs-snapshot-error.log',
    //   out_file: './logs/ipfs-snapshot-out.log',
    //   log_file: './logs/ipfs-snapshot-combined.log',
    //   time: true,
    // },
  ],
};
