#!/bin/bash
# validate-day.sh - Validate we're ready to start today's work
# Part of 25-Day Anchor Roadmap Compliance System

set -e

ROADMAP_FILE="docs/25_DAY_ANCHOR_ROADMAP.md"
PROGRESS_FILE="docs/25_DAY_PROGRESS_TRACKER.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 25-Day Roadmap Validation ===${NC}"
echo ""

# Extract current day from progress tracker
if [ ! -f "$PROGRESS_FILE" ]; then
    echo -e "${RED}❌ Progress tracker not found: $PROGRESS_FILE${NC}"
    exit 1
fi

CURRENT_DAY=$(grep "^\*\*Current Day\*\*:" "$PROGRESS_FILE" | sed 's/.*: \([0-9]*\).*/\1/')
if [ -z "$CURRENT_DAY" ]; then
    echo -e "${RED}❌ Could not determine current day from progress tracker${NC}"
    exit 1
fi

echo -e "Current Day: ${BLUE}$CURRENT_DAY/25${NC}"

# Check if project hasn't started yet
if [ "$CURRENT_DAY" -eq 0 ]; then
    echo -e "${YELLOW}⏳ Project not started yet. Ready to begin Day 1.${NC}"
    echo ""
    echo "To start Day 1:"
    echo "  1. Update CURRENT_DAY in $PROGRESS_FILE to 1"
    echo "  2. Run: npm run validate-day"
    echo "  3. Begin Day 1 tasks from $ROADMAP_FILE"
    exit 0
fi

# Check if yesterday is complete (if not day 1)
if [ "$CURRENT_DAY" -gt 1 ]; then
    PREV_DAY=$((CURRENT_DAY - 1))
    echo -e "Checking Day $PREV_DAY completion..."

    # Check for completion marker in progress tracker (case-insensitive)
    PREV_COMPLETE=$(grep -i "day $PREV_DAY" "$PROGRESS_FILE" | grep -o "✅" || echo "")
    if [ -z "$PREV_COMPLETE" ]; then
        echo -e "${RED}❌ Day $PREV_DAY not marked complete${NC}"
        echo "Run: npm run validate-day-complete"
        exit 1
    fi
    echo -e "${GREEN}✅ Day $PREV_DAY marked complete${NC}"
fi

# Check dependencies for current day
echo ""
echo -e "Checking Day $CURRENT_DAY dependencies..."

# Extract dependencies from roadmap (basic check) - support both ## and ### headers
DAY_SECTION=$(sed -n "/^### Day $CURRENT_DAY:/,/^### Day $((CURRENT_DAY + 1)):/p" "$ROADMAP_FILE")
if [ -z "$DAY_SECTION" ]; then
    # Try with ## if ### didn't work
    DAY_SECTION=$(sed -n "/^## Day $CURRENT_DAY:/,/^## Day $((CURRENT_DAY + 1)):/p" "$ROADMAP_FILE")
fi
if [ -z "$DAY_SECTION" ]; then
    echo -e "${RED}❌ Could not find Day $CURRENT_DAY in roadmap${NC}"
    exit 1
fi

# Check if build passes (for days after 1)
if [ "$CURRENT_DAY" -gt 1 ] && [ -f "programs/zmart-core/Cargo.toml" ]; then
    echo "Checking compilation..."
    if ! cargo check --manifest-path programs/zmart-core/Cargo.toml > /dev/null 2>&1; then
        echo -e "${RED}❌ Compilation failing - fix before starting Day $CURRENT_DAY${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Compilation passing${NC}"
fi

# Check if tests pass (for days after 3)
if [ "$CURRENT_DAY" -gt 3 ] && [ -f "programs/zmart-core/Cargo.toml" ]; then
    echo "Running unit tests..."
    if ! cargo test --manifest-path programs/zmart-core/Cargo.toml > /dev/null 2>&1; then
        echo -e "${RED}❌ Unit tests failing - fix before starting Day $CURRENT_DAY${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Unit tests passing${NC}"
fi

# Success
echo ""
echo -e "${GREEN}✅ Ready to start Day $CURRENT_DAY work!${NC}"
echo ""
echo "Today's tasks (from roadmap):"
echo "$DAY_SECTION" | grep "^### Micro-Tasks" -A 10 | grep "^-" | head -5
echo ""
echo "See full details: $ROADMAP_FILE (search 'Day $CURRENT_DAY')"

# Create validation marker (Fix 3/8)
MARKER_DIR=".validation"
mkdir -p "$MARKER_DIR"

MARKER_FILE="$MARKER_DIR/day-${CURRENT_DAY}-validated"
DATE_MARKER=$(date "+%Y-%m-%d")
echo "$DATE_MARKER" > "$MARKER_FILE"

echo ""
echo "✅ Validation marker created: $MARKER_FILE"
echo "   Valid until midnight today"

exit 0
