#!/bin/bash
# validate-day-complete.sh - Validate current day is complete
# Part of 25-Day Anchor Roadmap Compliance System

set -e

ROADMAP_FILE="docs/25_DAY_ANCHOR_ROADMAP.md"
PROGRESS_FILE="docs/25_DAY_PROGRESS_TRACKER.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Day Completion Validation ===${NC}"
echo ""

# Get current day
CURRENT_DAY=$(grep "^\*\*Current Day\*\*:" "$PROGRESS_FILE" | sed 's/.*: \([0-9]*\).*/\1/')
if [ -z "$CURRENT_DAY" ] || [ "$CURRENT_DAY" -eq 0 ]; then
    echo -e "${RED}❌ Project not started yet${NC}"
    exit 1
fi

echo -e "Validating Day ${BLUE}$CURRENT_DAY${NC}..."
echo ""

# Check build passes
if [ -f "programs/zmart-core/Cargo.toml" ]; then
    echo "Checking build..."
    if ! anchor build > /dev/null 2>&1; then
        echo -e "${RED}❌ Build failing${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Build passing${NC}"
fi

# Check tests pass
if [ -f "programs/zmart-core/tests/zmart-core.ts" ]; then
    echo "Running tests..."
    if ! anchor test > /dev/null 2>&1; then
        echo -e "${RED}❌ Tests failing${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Tests passing${NC}"
fi

# Check for story file updates (if applicable)
EXPECTED_STORY="docs/stories/STORY-$(echo "$CURRENT_DAY / 3 + 1" | bc).$(echo "$CURRENT_DAY % 3" | bc).md"
if [ -f "$EXPECTED_STORY" ]; then
    # Check if story was updated today
    if [ "$(uname)" == "Darwin" ]; then
        STORY_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d" "$EXPECTED_STORY")
    else
        STORY_MODIFIED=$(stat -c "%y" "$EXPECTED_STORY" | cut -d' ' -f1)
    fi
    TODAY=$(date "+%Y-%m-%d")

    if [ "$STORY_MODIFIED" != "$TODAY" ]; then
        echo -e "${YELLOW}⚠️  Story file not updated today: $EXPECTED_STORY${NC}"
        echo "Consider updating story file with today's progress"
    else
        echo -e "${GREEN}✅ Story file updated${NC}"
    fi
fi

# Check commits made
GIT_COMMITS_TODAY=$(git log --since="midnight" --oneline | wc -l)
if [ "$GIT_COMMITS_TODAY" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No commits made today${NC}"
    echo "Consider committing your work before marking day complete"
fi

# Update progress tracker
echo ""
echo -e "${GREEN}✅ Day $CURRENT_DAY validation passed!${NC}"
echo ""
echo "Updating progress tracker..."

# Mark day complete in progress tracker
sed -i.bak "s/DAY $CURRENT_DAY.*\] 0%   ⏳ PENDING/DAY $CURRENT_DAY  [█████████████] 100%  ✅ COMPLETE/" "$PROGRESS_FILE"

echo -e "${GREEN}✅ Progress tracker updated${NC}"

# ============================================================
# AUTO-RUN PHASE GATES (Fix 6/8)
# ============================================================

# Check if this is a phase boundary day
PHASE_BOUNDARIES="8 15 20 23 25"
for BOUNDARY_DAY in $PHASE_BOUNDARIES; do
    if [ "$CURRENT_DAY" -eq "$BOUNDARY_DAY" ]; then
        # Determine phase number
        if [ "$BOUNDARY_DAY" -eq 8 ]; then
            PHASE=1
            PHASE_NAME="Phase 1 → 2 (Programs → SDK)"
        elif [ "$BOUNDARY_DAY" -eq 15 ]; then
            PHASE=2
            PHASE_NAME="Phase 2 → 3 (SDK → Testing)"
        elif [ "$BOUNDARY_DAY" -eq 20 ]; then
            PHASE=3
            PHASE_NAME="Phase 3 → 4 (Testing → Events)"
        elif [ "$BOUNDARY_DAY" -eq 23 ]; then
            PHASE=4
            PHASE_NAME="Phase 4 → 5 (Events → Deployment)"
        elif [ "$BOUNDARY_DAY" -eq 25 ]; then
            PHASE=5
            PHASE_NAME="Phase 5 → LAUNCH"
        fi

        echo ""
        echo -e "${BLUE}🚦 PHASE GATE DETECTED: $PHASE_NAME${NC}"
        echo ""
        echo "Running phase gate validation..."

        # Run phase validation
        if bash scripts/validate-phase.sh $PHASE; then
            echo ""
            echo -e "${GREEN}✅ PHASE $PHASE GO - Ready to proceed${NC}"
            echo ""

            # Create phase completion marker
            mkdir -p .validation
            touch ".validation/phase-$PHASE-complete"
        else
            echo ""
            echo -e "${RED}🚨 PHASE $PHASE NO-GO - Fix issues before proceeding${NC}"
            echo ""
            echo "Cannot advance to next phase until all checks pass."
            echo "Review validation output above for specific failures."
            echo ""
            exit 1
        fi

        break
    fi
done

# ============================================================
# AUTO-INCREMENT DAY WITH FILE LOCKING (Fix 2/8)
# ============================================================

# Acquire lock to prevent race conditions
LOCK_FILE=".validation/day-advance.lock"
mkdir -p .validation

if [ -f "$LOCK_FILE" ]; then
    echo ""
    echo -e "${RED}❌ Another validation in progress${NC}"
    echo "   Lock file exists: $LOCK_FILE"
    echo "   Wait for other process or remove stale lock"
    exit 1
fi

# Create lock
touch "$LOCK_FILE"

# ============================================================
# TIME TRACKING SUMMARY (Fix 8/8)
# ============================================================

# Check if time log exists
TIME_LOG=".validation/time-day-$CURRENT_DAY.log"
if [ -f "$TIME_LOG" ]; then
    ACTUAL_TIME=$(awk '{sum+=$1} END {print sum}' "$TIME_LOG" 2>/dev/null || echo "0")

    # Get estimated time
    if [ "$CURRENT_DAY" -eq 5 ]; then
        ESTIMATED=10
    else
        ESTIMATED=8
    fi

    # Calculate efficiency
    if command -v bc &> /dev/null && [ "$ACTUAL_TIME" != "0" ]; then
        EFFICIENCY=$(echo "scale=0; $ESTIMATED / $ACTUAL_TIME * 100" | bc 2>/dev/null || echo "N/A")
    else
        EFFICIENCY="N/A"
    fi

    echo ""
    echo "📊 Time Tracking Summary:"
    echo "   Estimated: ${ESTIMATED}h"
    echo "   Actual:    ${ACTUAL_TIME}h"
    if [ "$EFFICIENCY" != "N/A" ]; then
        echo "   Efficiency: ${EFFICIENCY}%"
    fi

    # Remove time log (day complete)
    rm "$TIME_LOG"
else
    echo ""
    echo "ℹ️  No time tracking data for Day $CURRENT_DAY"
    echo "   Consider adding 'Time: Xh' to commit messages for velocity tracking"
fi

# Auto-increment CURRENT_DAY
NEXT_DAY=$((CURRENT_DAY + 1))

if [ "$NEXT_DAY" -le 25 ]; then
    echo ""
    echo "🔄 Auto-advancing to Day $NEXT_DAY..."

    # Update CURRENT_DAY atomically with backup
    sed -i.bak "s/\*\*Current Day\*\*: $CURRENT_DAY\/25/\*\*Current Day\*\*: $NEXT_DAY\/25/" "$PROGRESS_FILE"

    # Verify update succeeded
    NEW_DAY=$(grep "^\*\*Current Day\*\*:" "$PROGRESS_FILE" | sed 's/.*: \([0-9]*\).*/\1/')

    if [ "$NEW_DAY" = "$NEXT_DAY" ]; then
        echo -e "${GREEN}✅ Advanced to Day $NEXT_DAY${NC}"
        rm -f "$PROGRESS_FILE.bak"

        # Remove validation marker for previous day
        MARKER_FILE=".validation/day-${CURRENT_DAY}-validated"
        if [ -f "$MARKER_FILE" ]; then
            rm "$MARKER_FILE"
        fi
    else
        echo -e "${RED}❌ ERROR: Failed to update CURRENT_DAY${NC}"
        echo "   Restoring backup..."
        mv "$PROGRESS_FILE.bak" "$PROGRESS_FILE"
        rm "$LOCK_FILE"
        exit 1
    fi
else
    echo ""
    echo "🎉 PROJECT COMPLETE! All 25 days finished!"
    echo "   Ready for production launch"
fi

# Release lock
rm "$LOCK_FILE"

echo ""
echo "Next steps:"
echo "  1. Review Day $CURRENT_DAY accomplishments"
echo "  2. Run: npm run validate-day (to start Day $NEXT_DAY)"
echo ""
exit 0
