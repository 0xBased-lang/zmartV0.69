import Joi from "joi";
/**
 * Custom Joi validator for Solana public keys
 */
export declare const solanaPublicKey: Joi.StringSchema<string>;
/**
 * Common validation schemas
 */
export declare const schemas: {
    wallet: Joi.StringSchema<string>;
    marketId: Joi.StringSchema<string>;
    outcome: Joi.BooleanSchema<boolean>;
    amount: Joi.NumberSchema<number>;
    pagination: Joi.ObjectSchema<any>;
    vote: Joi.BooleanSchema<boolean>;
    discussionContent: Joi.StringSchema<string>;
};
/**
 * Validate data against schema
 * @param data Data to validate
 * @param schema Joi schema
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export declare function validate<T>(data: any, schema: Joi.Schema): T;
/**
 * Custom validation error
 */
export declare class ValidationError extends Error {
    details: Joi.ValidationErrorItem[];
    constructor(message: string, details: Joi.ValidationErrorItem[]);
}
declare const _default: {
    schemas: {
        wallet: Joi.StringSchema<string>;
        marketId: Joi.StringSchema<string>;
        outcome: Joi.BooleanSchema<boolean>;
        amount: Joi.NumberSchema<number>;
        pagination: Joi.ObjectSchema<any>;
        vote: Joi.BooleanSchema<boolean>;
        discussionContent: Joi.StringSchema<string>;
    };
    validate: typeof validate;
    ValidationError: typeof ValidationError;
};
export default _default;
//# sourceMappingURL=validation.d.ts.map