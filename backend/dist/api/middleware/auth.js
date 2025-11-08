"use strict";
// ============================================================
// Authentication Middleware
// ============================================================
// Purpose: Wallet signature verification (SIWE-like)
// Story: 2.4 (Day 12)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWalletSignature = verifyWalletSignature;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.checkOwnership = checkOwnership;
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const error_handler_1 = require("./error-handler");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Verify Solana wallet signature
 */
function verifyWalletSignature(message, signature, wallet) {
    try {
        // Decode wallet public key
        const publicKey = new web3_js_1.PublicKey(wallet);
        // Decode signature from base58
        const signatureBytes = bs58_1.default.decode(signature);
        // Encode message to bytes
        const messageBytes = new TextEncoder().encode(message);
        // Verify signature using ed25519
        const verified = tweetnacl_1.default.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
        return verified;
    }
    catch (error) {
        logger_1.default.error("[Auth] Signature verification error:", error);
        return false;
    }
}
/**
 * Authentication middleware
 * Requires wallet signature in request body or header
 */
function requireAuth(req, res, next) {
    try {
        // Check Authorization header first
        const authHeader = req.headers.authorization;
        let authData;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            // Parse JWT-like format (for future OAuth integration)
            throw new error_handler_1.ApiError(401, "JWT authentication not yet implemented");
        }
        else {
            // Check request body for signature
            authData = req.body;
            if (!authData.message || !authData.signature || !authData.wallet) {
                throw new error_handler_1.ApiError(401, "Authentication required: message, signature, and wallet must be provided");
            }
        }
        // Verify signature
        const verified = verifyWalletSignature(authData.message, authData.signature, authData.wallet);
        if (!verified) {
            throw new error_handler_1.ApiError(401, "Invalid wallet signature");
        }
        // Verify message format (SIWE-like)
        // Expected format: "Sign this message to authenticate with ZMART: {timestamp}"
        if (!authData.message.includes("Sign this message to authenticate with ZMART")) {
            throw new error_handler_1.ApiError(401, "Invalid authentication message format");
        }
        // Extract timestamp and verify it's recent (within 5 minutes)
        const timestampMatch = authData.message.match(/(\d{13})/);
        if (timestampMatch) {
            const messageTimestamp = parseInt(timestampMatch[1]);
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            if (Math.abs(now - messageTimestamp) > fiveMinutes) {
                throw new error_handler_1.ApiError(401, "Authentication message expired");
            }
        }
        else {
            throw new error_handler_1.ApiError(401, "Invalid timestamp in authentication message");
        }
        // Set user in request
        req.user = {
            wallet: authData.wallet,
        };
        logger_1.default.debug(`[Auth] User authenticated: ${authData.wallet}`);
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Optional authentication middleware
 * Continues if no auth provided
 */
function optionalAuth(req, res, next) {
    try {
        // Try to authenticate, but don't fail if not provided
        const authData = req.body;
        if (authData.message && authData.signature && authData.wallet) {
            const verified = verifyWalletSignature(authData.message, authData.signature, authData.wallet);
            if (verified) {
                req.user = {
                    wallet: authData.wallet,
                };
                logger_1.default.debug(`[Auth] User authenticated (optional): ${authData.wallet}`);
            }
        }
        next();
    }
    catch (error) {
        // Continue without auth
        next();
    }
}
/**
 * Check if user owns resource
 * Use after requireAuth
 */
function checkOwnership(resourceWalletKey) {
    return (req, res, next) => {
        if (!req.user) {
            throw new error_handler_1.ApiError(401, "Authentication required");
        }
        const resourceWallet = req.body[resourceWalletKey] || req.params[resourceWalletKey];
        if (!resourceWallet) {
            throw new error_handler_1.ApiError(400, `Resource wallet key '${resourceWalletKey}' not found`);
        }
        if (req.user.wallet !== resourceWallet) {
            throw new error_handler_1.ApiError(403, "You do not have permission to access this resource");
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map