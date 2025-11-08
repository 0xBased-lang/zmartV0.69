"use strict";
// ============================================================
// Solana Configuration
// ============================================================
// Purpose: Initialize Solana connection and load backend keypair
// Pattern Prevention: #6 (Security Afterthought) - Secure keypair handling
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.getBackendKeypair = getBackendKeypair;
exports.getProvider = getProvider;
exports.getProgramIds = getProgramIds;
exports.testSolanaConnection = testSolanaConnection;
exports.getBackendBalance = getBackendBalance;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const env_1 = require("./env");
const logger_1 = __importDefault(require("../utils/logger"));
const fs_1 = __importDefault(require("fs"));
// Singleton instances
let connection = null;
let backendKeypair = null;
let provider = null;
/**
 * Get or create Solana connection
 * @returns Solana connection instance
 */
function getConnection() {
    if (!connection) {
        logger_1.default.info("Initializing Solana connection", {
            rpcUrl: env_1.config.solana.rpcUrl,
        });
        connection = new web3_js_1.Connection(env_1.config.solana.rpcUrl, {
            commitment: "confirmed",
            confirmTransactionInitialTimeout: 60000,
        });
        logger_1.default.info("Solana connection initialized successfully");
    }
    return connection;
}
/**
 * Load backend authority keypair from file
 * @returns Backend keypair
 */
function getBackendKeypair() {
    if (!backendKeypair) {
        try {
            logger_1.default.info("Loading backend keypair", {
                path: env_1.config.solana.backendKeypairPath,
            });
            const keypairData = fs_1.default.readFileSync(env_1.config.solana.backendKeypairPath, "utf-8");
            const secretKey = Uint8Array.from(JSON.parse(keypairData));
            backendKeypair = web3_js_1.Keypair.fromSecretKey(secretKey);
            logger_1.default.info("Backend keypair loaded successfully", {
                publicKey: backendKeypair.publicKey.toBase58(),
            });
        }
        catch (error) {
            logger_1.default.error("Failed to load backend keypair", { error });
            throw new Error(`Failed to load backend keypair from ${env_1.config.solana.backendKeypairPath}`);
        }
    }
    return backendKeypair;
}
/**
 * Get Anchor provider
 * @returns Anchor provider instance
 */
function getProvider() {
    if (!provider) {
        const conn = getConnection();
        const keypair = getBackendKeypair();
        const wallet = {
            publicKey: keypair.publicKey,
            signTransaction: async (tx) => {
                tx.sign([keypair]);
                return tx;
            },
            signAllTransactions: async (txs) => {
                return txs.map((tx) => {
                    tx.sign([keypair]);
                    return tx;
                });
            },
        };
        provider = new anchor_1.AnchorProvider(conn, wallet, {
            commitment: "confirmed",
            preflightCommitment: "confirmed",
        });
        logger_1.default.info("Anchor provider initialized successfully");
    }
    return provider;
}
/**
 * Get program IDs
 * @returns Program IDs for core and proposal programs
 */
function getProgramIds() {
    return {
        core: new web3_js_1.PublicKey(env_1.config.solana.programIds.core),
        proposal: new web3_js_1.PublicKey(env_1.config.solana.programIds.proposal),
    };
}
/**
 * Test Solana connection
 * @returns True if connection successful
 */
async function testSolanaConnection() {
    try {
        const conn = getConnection();
        // Get slot to test connection
        const slot = await conn.getSlot();
        logger_1.default.info("Solana connection test successful", { slot });
        return true;
    }
    catch (error) {
        logger_1.default.error("Solana connection test failed", { error });
        return false;
    }
}
/**
 * Check backend keypair balance
 * @returns Balance in lamports
 */
async function getBackendBalance() {
    try {
        const conn = getConnection();
        const keypair = getBackendKeypair();
        const balance = await conn.getBalance(keypair.publicKey);
        logger_1.default.info("Backend balance retrieved", {
            balance,
            sol: balance / 1e9,
        });
        return balance;
    }
    catch (error) {
        logger_1.default.error("Failed to get backend balance", { error });
        throw error;
    }
}
exports.default = {
    getConnection,
    getBackendKeypair,
    getProvider,
    getProgramIds,
    testSolanaConnection,
    getBackendBalance,
};
//# sourceMappingURL=solana.js.map