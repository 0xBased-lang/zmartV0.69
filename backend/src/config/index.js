"use strict";
// ============================================================
// Configuration Index
// ============================================================
// Purpose: Central export for all configuration modules
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedis = exports.testRedisConnection = exports.getRedisClient = exports.getBackendBalance = exports.testSolanaConnection = exports.getProgramIds = exports.getProvider = exports.getBackendKeypair = exports.getConnection = exports.testDatabaseConnection = exports.getSupabaseClient = exports.env = exports.config = void 0;
exports.testAllConnections = testAllConnections;
var env_1 = require("./env");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return env_1.config; } });
Object.defineProperty(exports, "env", { enumerable: true, get: function () { return __importDefault(env_1).default; } });
var database_1 = require("./database");
Object.defineProperty(exports, "getSupabaseClient", { enumerable: true, get: function () { return database_1.getSupabaseClient; } });
Object.defineProperty(exports, "testDatabaseConnection", { enumerable: true, get: function () { return database_1.testDatabaseConnection; } });
var solana_1 = require("./solana");
Object.defineProperty(exports, "getConnection", { enumerable: true, get: function () { return solana_1.getConnection; } });
Object.defineProperty(exports, "getBackendKeypair", { enumerable: true, get: function () { return solana_1.getBackendKeypair; } });
Object.defineProperty(exports, "getProvider", { enumerable: true, get: function () { return solana_1.getProvider; } });
Object.defineProperty(exports, "getProgramIds", { enumerable: true, get: function () { return solana_1.getProgramIds; } });
Object.defineProperty(exports, "testSolanaConnection", { enumerable: true, get: function () { return solana_1.testSolanaConnection; } });
Object.defineProperty(exports, "getBackendBalance", { enumerable: true, get: function () { return solana_1.getBackendBalance; } });
var redis_1 = require("./redis");
Object.defineProperty(exports, "getRedisClient", { enumerable: true, get: function () { return redis_1.getRedisClient; } });
Object.defineProperty(exports, "testRedisConnection", { enumerable: true, get: function () { return redis_1.testRedisConnection; } });
Object.defineProperty(exports, "closeRedis", { enumerable: true, get: function () { return redis_1.closeRedis; } });
/**
 * Test all connections
 * @returns True if all connections successful
 */
async function testAllConnections() {
    const { testDatabaseConnection } = await Promise.resolve().then(() => __importStar(require("./database")));
    const { testSolanaConnection } = await Promise.resolve().then(() => __importStar(require("./solana")));
    const { testRedisConnection } = await Promise.resolve().then(() => __importStar(require("./redis")));
    const results = await Promise.all([
        testDatabaseConnection(),
        testSolanaConnection(),
        testRedisConnection(),
    ]);
    return results.every((r) => r === true);
}
//# sourceMappingURL=index.js.map