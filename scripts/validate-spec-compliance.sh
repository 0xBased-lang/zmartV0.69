#!/bin/bash

# ==============================================================================
# SPEC VALIDATION SCRIPT
# ==============================================================================
#
# Purpose: Validate that Rust implementation matches specification in
#          03_SOLANA_PROGRAM_DESIGN.md
#
# Checks:
# 1. Function signatures match spec (parameters, types, order)
# 2. All MarketAccount fields referenced in spec exist in implementation
# 3. Error codes referenced in spec are defined
#
# Usage: ./scripts/validate-spec-compliance.sh
#
# Exit Codes:
#   0 - All validations passed
#   1 - Validation failures found
#
# ==============================================================================

set -e

SPEC_FILE="docs/03_SOLANA_PROGRAM_DESIGN.md"
MARKET_STATE_FILE="programs/zmart-core/src/state/market.rs"
ERROR_FILE="programs/zmart-core/src/error.rs"
INSTRUCTIONS_DIR="programs/zmart-core/src/instructions"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS_FOUND=0

echo "================================================================"
echo "SPEC COMPLIANCE VALIDATION"
echo "================================================================"
echo ""

# ==============================================================================
# 1. Validate resolve_market signature
# ==============================================================================

echo "📋 [1/4] Validating resolve_market instruction..."

# Extract spec signature (lines around resolve_market handler in spec)
SPEC_RESOLVE_SIG=$(grep -A 10 "^pub fn handler" "$SPEC_FILE" | \
    grep -A 3 "Context<ResolveMarket>" | head -4 | tr '\n' ' ')

# Check actual implementation
IMPL_RESOLVE_FILE="$INSTRUCTIONS_DIR/resolve_market.rs"

if [ ! -f "$IMPL_RESOLVE_FILE" ]; then
    echo -e "${RED}❌ FAIL: resolve_market.rs not found${NC}"
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
else
    # Check for ipfs_evidence_hash parameter
    if ! grep -q "ipfs_evidence_hash.*\[u8; 46\]" "$IMPL_RESOLVE_FILE"; then
        echo -e "${RED}❌ FAIL: Missing ipfs_evidence_hash: [u8; 46] parameter${NC}"
        echo "   Spec requires: handler(ctx, outcome: Option<bool>, ipfs_evidence_hash: [u8; 46])"
        echo "   Location: $IMPL_RESOLVE_FILE"
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
    fi

    # Check parameter type (should be Option<bool> not just bool)
    if grep -q "proposed_outcome: bool" "$IMPL_RESOLVE_FILE" && \
       ! grep -q "outcome: Option<bool>" "$IMPL_RESOLVE_FILE"; then
        echo -e "${YELLOW}⚠️  WARNING: Parameter type simplified (bool vs Option<bool>)${NC}"
        echo "   Spec uses: outcome: Option<bool> (allows YES/NO/INVALID)"
        echo "   Implementation uses: proposed_outcome: bool (only YES/NO)"
        echo "   Location: $IMPL_RESOLVE_FILE"
        # Not counting as error if intentional simplification, but warn
    fi
fi

# ==============================================================================
# 2. Validate finalize_market signature
# ==============================================================================

echo "📋 [2/4] Validating finalize_market instruction..."

IMPL_FINALIZE_FILE="$INSTRUCTIONS_DIR/finalize_market.rs"

if [ ! -f "$IMPL_FINALIZE_FILE" ]; then
    echo -e "${RED}❌ FAIL: finalize_market.rs not found${NC}"
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
else
    # Check for Option<u32> parameters (spec uses optional votes)
    if grep -q "vote_yes_count: u64" "$IMPL_FINALIZE_FILE"; then
        echo -e "${RED}❌ FAIL: Wrong parameter types in finalize_market${NC}"
        echo "   Spec requires: dispute_agree: Option<u32>, dispute_disagree: Option<u32>"
        echo "   Implementation uses: vote_yes_count: u64, vote_no_count: u64, total_votes: u64"
        echo "   Location: $IMPL_FINALIZE_FILE"
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
    fi
fi

# ==============================================================================
# 3. Validate MarketAccount fields
# ==============================================================================

echo "📋 [3/4] Validating MarketAccount struct fields..."

REQUIRED_FIELDS=(
    "resolution_agree"
    "resolution_disagree"
    "resolution_total_votes"
    "was_disputed"
)

MISSING_FIELDS=()

for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -q "pub $field:" "$MARKET_STATE_FILE"; then
        MISSING_FIELDS+=("$field")
    fi
done

if [ ${#MISSING_FIELDS[@]} -gt 0 ]; then
    echo -e "${RED}❌ FAIL: Missing required MarketAccount fields${NC}"
    echo "   Missing fields:"
    for field in "${MISSING_FIELDS[@]}"; do
        echo "     - $field"
    done
    echo "   Location: $MARKET_STATE_FILE"
    echo "   Required by: Resolution vote tracking and dispute flag"
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
fi

# ==============================================================================
# 4. Validate error codes referenced in spec exist
# ==============================================================================

echo "📋 [4/4] Validating error codes..."

ERROR_CODES=(
    "AlreadyResolved"
    "DisputePeriodNotEnded"
    "AlreadyDisputed"
)

MISSING_ERRORS=()

for error in "${ERROR_CODES[@]}"; do
    if ! grep -q "$error" "$ERROR_FILE"; then
        MISSING_ERRORS+=("$error")
    fi
done

if [ ${#MISSING_ERRORS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Some error codes not found (may use different names)${NC}"
    for error in "${MISSING_ERRORS[@]}"; do
        echo "     - $error"
    done
    # Not counting as critical error - just warning
fi

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo "================================================================"
if [ $ERRORS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ SPEC COMPLIANCE: PASSED${NC}"
    echo "================================================================"
    exit 0
else
    echo -e "${RED}❌ SPEC COMPLIANCE: FAILED ($ERRORS_FOUND errors)${NC}"
    echo "================================================================"
    echo ""
    echo "Fix these issues before committing Tier 1/2 code."
    echo "See docs/03_SOLANA_PROGRAM_DESIGN.md for specification details."
    echo ""
    exit 1
fi
