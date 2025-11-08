"use strict";
// ============================================================
// Environment Configuration
// ============================================================
// Purpose: Load and validate environment variables
// Pattern Prevention: #4 (Schema Drift) - Type-safe configuration
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
const path_1 = __importDefault(require("path"));
// Load .env file
dotenv_1.default.config({ path: path_1.default.join(__dirname, "../../.env") });
// Environment variable schema
const envSchema = joi_1.default.object({
    // Node Environment
    NODE_ENV: joi_1.default.string()
        .valid("development", "production", "test")
        .default("development"),
    // Solana Configuration
    SOLANA_RPC_URL: joi_1.default.string()
        .uri()
        .required()
        .description("Solana RPC endpoint"),
    SOLANA_PROGRAM_ID_CORE: joi_1.default.string()
        .required()
        .description("zmart-core program ID"),
    SOLANA_PROGRAM_ID_PROPOSAL: joi_1.default.string()
        .required()
        .description("zmart-proposal program ID"),
    BACKEND_KEYPAIR_PATH: joi_1.default.string()
        .required()
        .description("Path to backend authority keypair"),
    // Supabase Configuration
    SUPABASE_URL: joi_1.default.string().uri().required().description("Supabase project URL"),
    SUPABASE_ANON_KEY: joi_1.default.string()
        .required()
        .description("Supabase anonymous key"),
    SUPABASE_SERVICE_ROLE_KEY: joi_1.default.string()
        .required()
        .description("Supabase service role key"),
    // Redis Configuration
    REDIS_URL: joi_1.default.string()
        .uri()
        .default("redis://localhost:6379")
        .description("Redis connection URL"),
    // IPFS Configuration (Optional - for IPFS Service)
    IPFS_PROJECT_ID: joi_1.default.string()
        .optional()
        .description("Infura IPFS project ID (optional until IPFS service deployed)"),
    IPFS_PROJECT_SECRET: joi_1.default.string()
        .optional()
        .description("Infura IPFS project secret (optional until IPFS service deployed)"),
    IPFS_GATEWAY_URL: joi_1.default.string()
        .uri()
        .optional()
        .description("IPFS gateway URL (optional until IPFS service deployed)"),
    // Helius Configuration (Optional - for Event Indexer)
    HELIUS_RPC_URL: joi_1.default.string()
        .uri()
        .optional()
        .description("Helius RPC URL (optional until Event Indexer deployed)"),
    HELIUS_WEBHOOK_SECRET: joi_1.default.string()
        .optional()
        .description("Helius webhook secret (optional until Event Indexer deployed)"),
    // Pinata Configuration (Optional - for IPFS Service)
    PINATA_API_KEY: joi_1.default.string()
        .optional()
        .description("Pinata API key (optional until IPFS service deployed)"),
    PINATA_SECRET_KEY: joi_1.default.string()
        .optional()
        .description("Pinata secret key (optional until IPFS service deployed)"),
    PINATA_GATEWAY_URL: joi_1.default.string()
        .uri()
        .optional()
        .description("Pinata gateway URL (optional until IPFS service deployed)"),
    // API Configuration
    API_PORT: joi_1.default.number().port().default(3000).description("API server port"),
    API_HOST: joi_1.default.string().default("localhost").description("API server host"),
    CORS_ORIGINS: joi_1.default.string()
        .default("http://localhost:3001,http://localhost:3000")
        .description("CORS allowed origins (comma-separated)"),
    // WebSocket Configuration
    WS_PORT: joi_1.default.number().port().default(3001).description("WebSocket server port"),
    // Service Configuration
    VOTE_AGGREGATION_INTERVAL: joi_1.default.number()
        .default(300000)
        .description("Vote aggregation interval (ms)"),
    IPFS_SNAPSHOT_CRON: joi_1.default.string()
        .default("0 0 * * *")
        .description("IPFS snapshot cron schedule"),
    MIN_PROPOSAL_VOTES: joi_1.default.number()
        .default(10)
        .description("Minimum votes before aggregation"),
    PROPOSAL_APPROVAL_THRESHOLD: joi_1.default.number()
        .min(0)
        .max(1)
        .default(0.7)
        .description("Proposal approval threshold (70%)"),
    DISPUTE_THRESHOLD: joi_1.default.number()
        .min(0)
        .max(1)
        .default(0.6)
        .description("Dispute threshold (60%)"),
    // Logging
    LOG_LEVEL: joi_1.default.string()
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
exports.config = {
    node: {
        env: envVars.NODE_ENV,
        isDevelopment: envVars.NODE_ENV === "development",
        isProduction: envVars.NODE_ENV === "production",
        isTest: envVars.NODE_ENV === "test",
    },
    solana: {
        rpcUrl: envVars.SOLANA_RPC_URL,
        programIds: {
            core: envVars.SOLANA_PROGRAM_ID_CORE,
            proposal: envVars.SOLANA_PROGRAM_ID_PROPOSAL,
        },
        backendKeypairPath: envVars.BACKEND_KEYPAIR_PATH,
    },
    supabase: {
        url: envVars.SUPABASE_URL,
        anonKey: envVars.SUPABASE_ANON_KEY,
        serviceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY,
    },
    redis: {
        url: envVars.REDIS_URL,
    },
    ipfs: {
        projectId: envVars.IPFS_PROJECT_ID,
        projectSecret: envVars.IPFS_PROJECT_SECRET,
        gatewayUrl: envVars.IPFS_GATEWAY_URL,
    },
    api: {
        port: envVars.API_PORT,
        host: envVars.API_HOST,
        corsOrigins: envVars.CORS_ORIGINS.split(",").map((s) => s.trim()),
    },
    websocket: {
        port: envVars.WS_PORT,
    },
    services: {
        voteAggregationInterval: envVars.VOTE_AGGREGATION_INTERVAL,
        ipfsSnapshotCron: envVars.IPFS_SNAPSHOT_CRON,
        minProposalVotes: envVars.MIN_PROPOSAL_VOTES,
        proposalApprovalThreshold: envVars.PROPOSAL_APPROVAL_THRESHOLD,
        disputeThreshold: envVars.DISPUTE_THRESHOLD,
    },
    logging: {
        level: envVars.LOG_LEVEL,
    },
};
exports.default = exports.config;
//# sourceMappingURL=env.js.map