// ============================================================
// Environment Configuration
// ============================================================
// Purpose: Load and validate environment variables
// Pattern Prevention: #4 (Schema Drift) - Type-safe configuration

import dotenv from "dotenv";
import Joi from "joi";
import path from "path";

// Load .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Environment variable schema
const envSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),

  // Solana Configuration
  SOLANA_RPC_URL: Joi.string()
    .uri()
    .required()
    .description("Solana RPC endpoint"),
  SOLANA_PROGRAM_ID_CORE: Joi.string()
    .required()
    .description("zmart-core program ID"),
  SOLANA_PROGRAM_ID_PROPOSAL: Joi.string()
    .required()
    .description("zmart-proposal program ID"),
  BACKEND_KEYPAIR_PATH: Joi.string()
    .required()
    .description("Path to backend authority keypair"),

  // Supabase Configuration
  SUPABASE_URL: Joi.string().uri().required().description("Supabase project URL"),
  SUPABASE_ANON_KEY: Joi.string()
    .required()
    .description("Supabase anonymous key"),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string()
    .required()
    .description("Supabase service role key"),

  // Redis Configuration
  REDIS_URL: Joi.string()
    .uri()
    .default("redis://localhost:6379")
    .description("Redis connection URL"),

  // IPFS Configuration (Optional - for IPFS Service)
  IPFS_PROJECT_ID: Joi.string()
    .optional()
    .description("Infura IPFS project ID (optional until IPFS service deployed)"),
  IPFS_PROJECT_SECRET: Joi.string()
    .optional()
    .description("Infura IPFS project secret (optional until IPFS service deployed)"),
  IPFS_GATEWAY_URL: Joi.string()
    .uri()
    .optional()
    .description("IPFS gateway URL (optional until IPFS service deployed)"),

  // Helius Configuration (Optional - for Event Indexer)
  HELIUS_RPC_URL: Joi.string()
    .uri()
    .optional()
    .description("Helius RPC URL (optional until Event Indexer deployed)"),
  HELIUS_WEBHOOK_SECRET: Joi.string()
    .optional()
    .description("Helius webhook secret (optional until Event Indexer deployed)"),

  // Pinata Configuration (Optional - for IPFS Service)
  PINATA_API_KEY: Joi.string()
    .optional()
    .description("Pinata API key (optional until IPFS service deployed)"),
  PINATA_SECRET_KEY: Joi.string()
    .optional()
    .description("Pinata secret key (optional until IPFS service deployed)"),
  PINATA_GATEWAY_URL: Joi.string()
    .uri()
    .optional()
    .description("Pinata gateway URL (optional until IPFS service deployed)"),

  // API Configuration
  API_PORT: Joi.number().port().default(3000).description("API server port"),
  API_HOST: Joi.string().default("localhost").description("API server host"),
  CORS_ORIGINS: Joi.string()
    .default("http://localhost:3001,http://localhost:3000")
    .description("CORS allowed origins (comma-separated)"),

  // WebSocket Configuration
  WS_PORT: Joi.number().port().default(3001).description("WebSocket server port"),

  // Service Configuration
  VOTE_AGGREGATION_INTERVAL: Joi.number()
    .default(300000)
    .description("Vote aggregation interval (ms)"),
  IPFS_SNAPSHOT_CRON: Joi.string()
    .default("0 0 * * *")
    .description("IPFS snapshot cron schedule"),
  MIN_PROPOSAL_VOTES: Joi.number()
    .default(10)
    .description("Minimum votes before aggregation"),
  PROPOSAL_APPROVAL_THRESHOLD: Joi.number()
    .min(0)
    .max(1)
    .default(0.7)
    .description("Proposal approval threshold (70%)"),
  DISPUTE_THRESHOLD: Joi.number()
    .min(0)
    .max(1)
    .default(0.6)
    .description("Dispute threshold (60%)"),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug")
    .default("info")
    .description("Logging level"),
}).unknown(true); // Allow other env variables

// Validate and export configuration
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Type-safe configuration export
export const config = {
  node: {
    env: envVars.NODE_ENV as string,
    isDevelopment: envVars.NODE_ENV === "development",
    isProduction: envVars.NODE_ENV === "production",
    isTest: envVars.NODE_ENV === "test",
  },
  solana: {
    rpcUrl: envVars.SOLANA_RPC_URL as string,
    programIds: {
      core: envVars.SOLANA_PROGRAM_ID_CORE as string,
      proposal: envVars.SOLANA_PROGRAM_ID_PROPOSAL as string,
    },
    backendKeypairPath: envVars.BACKEND_KEYPAIR_PATH as string,
  },
  supabase: {
    url: envVars.SUPABASE_URL as string,
    anonKey: envVars.SUPABASE_ANON_KEY as string,
    serviceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY as string,
  },
  redis: {
    url: envVars.REDIS_URL as string,
  },
  ipfs: {
    projectId: envVars.IPFS_PROJECT_ID as string,
    projectSecret: envVars.IPFS_PROJECT_SECRET as string,
    gatewayUrl: envVars.IPFS_GATEWAY_URL as string,
  },
  api: {
    port: envVars.API_PORT as number,
    host: envVars.API_HOST as string,
    corsOrigins: (envVars.CORS_ORIGINS as string).split(",").map((s) => s.trim()),
  },
  websocket: {
    port: envVars.WS_PORT as number,
  },
  services: {
    voteAggregationInterval: envVars.VOTE_AGGREGATION_INTERVAL as number,
    ipfsSnapshotCron: envVars.IPFS_SNAPSHOT_CRON as string,
    minProposalVotes: envVars.MIN_PROPOSAL_VOTES as number,
    proposalApprovalThreshold: envVars.PROPOSAL_APPROVAL_THRESHOLD as number,
    disputeThreshold: envVars.DISPUTE_THRESHOLD as number,
  },
  logging: {
    level: envVars.LOG_LEVEL as string,
  },
} as const;

export default config;
