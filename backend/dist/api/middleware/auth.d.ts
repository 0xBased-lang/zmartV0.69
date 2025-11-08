import { Request, Response, NextFunction } from "express";
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
 * Verify Solana wallet signature
 */
export declare function verifyWalletSignature(message: string, signature: string, wallet: string): boolean;
/**
 * Authentication middleware
 * Requires wallet signature in request body or header
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional authentication middleware
 * Continues if no auth provided
 */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Check if user owns resource
 * Use after requireAuth
 */
export declare function checkOwnership(resourceWalletKey: string): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map