import Joi from "joi";
import { Request, Response, NextFunction } from "express";
/**
 * Validation schemas for API endpoints
 */
export declare const schemas: {
    createMarket: Joi.ObjectSchema<any>;
    buyTrade: Joi.ObjectSchema<any>;
    sellTrade: Joi.ObjectSchema<any>;
    proposalVote: Joi.ObjectSchema<any>;
    disputeVote: Joi.ObjectSchema<any>;
    createDiscussion: Joi.ObjectSchema<any>;
    resolveMarket: Joi.ObjectSchema<any>;
    userWallet: Joi.ObjectSchema<any>;
};
/**
 * Validate request middleware factory
 */
export declare function validate(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate query parameters
 */
export declare function validateQuery(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate route parameters
 */
export declare function validateParams(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map