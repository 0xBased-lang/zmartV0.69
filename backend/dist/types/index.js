"use strict";
// ============================================================
// TypeScript Type Definitions
// ============================================================
// Purpose: Shared types for backend services
// Pattern Prevention: #4 (Schema Drift) - Type-safe data structures
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketState = void 0;
/**
 * Market state enum (matches Solana program)
 */
var MarketState;
(function (MarketState) {
    MarketState[MarketState["PROPOSED"] = 0] = "PROPOSED";
    MarketState[MarketState["APPROVED"] = 1] = "APPROVED";
    MarketState[MarketState["ACTIVE"] = 2] = "ACTIVE";
    MarketState[MarketState["RESOLVING"] = 3] = "RESOLVING";
    MarketState[MarketState["DISPUTED"] = 4] = "DISPUTED";
    MarketState[MarketState["FINALIZED"] = 5] = "FINALIZED";
})(MarketState || (exports.MarketState = MarketState = {}));
exports.default = {
    MarketState,
};
//# sourceMappingURL=index.js.map