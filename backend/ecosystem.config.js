// PM2 Ecosystem Configuration for ZMART Backend Services
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    // Service 1: API Gateway (port 4000)
    {
      name: 'api-gateway',
      script: './dist/index.js',
      cwd: '/Users/seman/Desktop/zmartV0.69/backend',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        API_PORT: 4000,
      },
      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_file: './logs/api-gateway-combined.log',
      time: true,
    },

    // Service 2: WebSocket Server (port 4001)
    {
      name: 'websocket-server',
      script: './dist/services/websocket/server.js',
      cwd: '/Users/seman/Desktop/zmartV0.69/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        WS_PORT: 4001,
      },
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_file: './logs/websocket-combined.log',
      time: true,
    },

    // Service 3: Vote Aggregator (cron: every 5 minutes)
    {
      name: 'vote-aggregator',
      script: './dist/services/vote-aggregator/index.js',
      cwd: '/Users/seman/Desktop/zmartV0.69/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      cron_restart: '*/5 * * * *', // Every 5 minutes
      env: {
        NODE_ENV: 'development',
        VOTE_AGGREGATION_INTERVAL: 300000,
      },
      error_file: './logs/vote-aggregator-error.log',
      out_file: './logs/vote-aggregator-out.log',
      log_file: './logs/vote-aggregator-combined.log',
      time: true,
    },

    // Service 4: Market Monitor (cron: every 5 minutes)
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

    // Service 5: Event Indexer (Helius webhook listener)
    // ❌ DISABLED FOR MVP - Not needed for core functionality
    // Reason: Backend updates database directly when transactions occur
    // Can be re-enabled later if real-time blockchain event monitoring needed
    // {
    //   name: 'event-indexer',
    //   script: './dist/services/event-indexer/standalone.js',
    //   cwd: '/Users/seman/Desktop/zmartV0.69/backend',
    //   exec_mode: 'fork',
    //   instances: 1,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '500M',
    //   env: {
    //     NODE_ENV: 'development',
    //     PORT: 3001,
    //   },
    //   error_file: './logs/event-indexer-error.log',
    //   out_file: './logs/event-indexer-out.log',
    //   log_file: './logs/event-indexer-combined.log',
    //   time: true,
    // },

    // Service 6: IPFS Snapshot Service (cron: daily at midnight UTC)
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
