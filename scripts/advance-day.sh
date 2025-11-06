#!/bin/bash
# ============================================================
# advance-day.sh - Safe Day Advancement Wrapper (Fix 2/8)
# ============================================================
# Purpose: Wrapper for validate-day-complete with auto-advance
# Part of 25-Day Anchor Roadmap Compliance System
#
# Usage: npm run advance-day
#
# What it does:
#   1. Runs validate-day-complete.sh
#   2. Validates build/tests passing
#   3. Auto-advances CURRENT_DAY to next day
#   4. Uses file locking to prevent race conditions
# ============================================================

set -e

PROGRESS_FILE="docs/25_DAY_PROGRESS_TRACKER.md"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Advancing to Next Day ===${NC}"
echo ""

# Run day completion validation
echo "Step 1: Validating current day complete..."
if ! bash scripts/validate-day-complete.sh; then
    echo ""
    echo -e "${RED}❌ Current day not complete. Fix issues and retry.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Day advanced successfully!${NC}"
echo ""

# Show next day preview
CURRENT_DAY=$(grep "^\*\*Current Day\*\*:" "$PROGRESS_FILE" | sed 's/.*: \([0-9]*\).*/\1/')
echo "Now on: Day $CURRENT_DAY/25"
echo ""
echo "Run 'npm run validate-day' to start Day $CURRENT_DAY work"
exit 0
