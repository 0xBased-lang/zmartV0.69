// ============================================================
// Authentication Middleware
// ============================================================
// Purpose: Wallet signature verification (SIWE-like)
// Story: 2.4 (Day 12)

import { Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { ApiError } from "./error-handler";
import logger from "../../utils/logger";

/**
 * Extend Express Request with user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        wallet: string;
      };
    }
  }
}

/**
 * Authentication request body
 */
interface AuthRequest {
  message: string;
  signature: string;
  wallet: string;
}

/**
 * Verify Solana wallet signature
 */
export function verifyWalletSignature(
  message: string,
  signature: string,
  wallet: string
): boolean {
  try {
    // Decode wallet public key
    const publicKey = new PublicKey(wallet);

    // Decode signature from base58
    const signatureBytes = bs58.decode(signature);

    // Encode message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify signature using ed25519
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    return verified;
  } catch (error) {
    logger.error("[Auth] Signature verification error:", error);
    return false;
  }
}

/**
 * Authentication middleware
 * Requires wallet signature in request body or header
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    let authData: AuthRequest;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Parse JWT-like format (for future OAuth integration)
      throw new ApiError(401, "JWT authentication not yet implemented");
    } else {
      // Check request body for signature
      authData = req.body as AuthRequest;

      if (!authData.message || !authData.signature || !authData.wallet) {
        throw new ApiError(
          401,
          "Authentication required: message, signature, and wallet must be provided"
        );
      }
    }

    // Verify signature
    const verified = verifyWalletSignature(
      authData.message,
      authData.signature,
      authData.wallet
    );

    if (!verified) {
      throw new ApiError(401, "Invalid wallet signature");
    }

    // Verify message format (SIWE-like)
    // Expected format: "Sign this message to authenticate with ZMART: {timestamp}"
    if (!authData.message.includes("Sign this message to authenticate with ZMART")) {
      throw new ApiError(401, "Invalid authentication message format");
    }

    // Extract timestamp and verify it's recent (within 5 minutes)
    const timestampMatch = authData.message.match(/(\d{13})/);
    if (timestampMatch) {
      const messageTimestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (Math.abs(now - messageTimestamp) > fiveMinutes) {
        throw new ApiError(401, "Authentication message expired");
      }
    } else {
      throw new ApiError(401, "Invalid timestamp in authentication message");
    }

    // Set user in request
    req.user = {
      wallet: authData.wallet,
    };

    logger.debug(`[Auth] User authenticated: ${authData.wallet}`);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Continues if no auth provided
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Try to authenticate, but don't fail if not provided
    const authData = req.body as Partial<AuthRequest>;

    if (authData.message && authData.signature && authData.wallet) {
      const verified = verifyWalletSignature(
        authData.message,
        authData.signature,
        authData.wallet
      );

      if (verified) {
        req.user = {
          wallet: authData.wallet,
        };
        logger.debug(`[Auth] User authenticated (optional): ${authData.wallet}`);
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
}

/**
 * Check if user owns resource
 * Use after requireAuth
 */
export function checkOwnership(resourceWalletKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const resourceWallet = (req.body as any)[resourceWalletKey] || (req.params as any)[resourceWalletKey];

    if (!resourceWallet) {
      throw new ApiError(400, `Resource wallet key '${resourceWalletKey}' not found`);
    }

    if (req.user.wallet !== resourceWallet) {
      throw new ApiError(403, "You do not have permission to access this resource");
    }

    next();
  };
}
