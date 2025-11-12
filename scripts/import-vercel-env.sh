#!/bin/bash

# ==============================================================================
# Vercel Environment Variables Import Script
# ==============================================================================
# This script automatically imports environment variables from .env.vercel
# to Vercel project using Vercel CLI
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE="../frontend/.env.vercel"
PROJECT_DIR="../frontend"
ENVIRONMENTS="production,preview,development"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}  VERCEL ENVIRONMENT VARIABLES IMPORT${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Check if running from scripts directory
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: .env.vercel file not found at: $ENV_FILE${NC}"
    echo -e "${YELLOW}Please run this script from the scripts/ directory${NC}"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Error: Vercel CLI is not installed${NC}"
    echo -e "${YELLOW}Install with: npm i -g vercel${NC}"
    exit 1
fi

# Check if logged in to Vercel
echo -e "${BLUE}Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}❌ Error: Not logged in to Vercel${NC}"
    echo -e "${YELLOW}Run: vercel login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated as: $(vercel whoami)${NC}"
echo ""

# Navigate to frontend directory
cd "$PROJECT_DIR"

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${RED}❌ Error: Project is not linked to Vercel${NC}"
    echo -e "${YELLOW}Run: vercel link${NC}"
    exit 1
fi

PROJECT_NAME=$(cat .vercel/project.json | grep -o '"projectName":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✅ Linked to project: ${PROJECT_NAME}${NC}"
echo ""

# Parse environment file
echo -e "${BLUE}Parsing environment variables from .env.vercel...${NC}"

# Count total variables (excluding comments and empty lines)
TOTAL_VARS=$(grep -v '^#' "$ENV_FILE" | grep -v '^$' | wc -l | tr -d ' ')
echo -e "${YELLOW}Found ${TOTAL_VARS} environment variables${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}This will add ${TOTAL_VARS} environment variables to:${NC}"
echo -e "  Project: ${GREEN}${PROJECT_NAME}${NC}"
echo -e "  Environments: ${GREEN}${ENVIRONMENTS}${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}  IMPORTING ENVIRONMENT VARIABLES${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Counter for progress
COUNTER=0
SUCCESS=0
FAILED=0

# Read and process each line
while IFS= read -r line; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]]; then
        continue
    fi

    # Extract variable name and value
    VAR_NAME=$(echo "$line" | cut -d'=' -f1)
    VAR_VALUE=$(echo "$line" | cut -d'=' -f2-)

    # Skip if no value
    if [[ -z "$VAR_VALUE" ]]; then
        continue
    fi

    ((COUNTER++))

    echo -e "${BLUE}[${COUNTER}/${TOTAL_VARS}]${NC} Adding: ${YELLOW}${VAR_NAME}${NC}"

    # Check if variable already exists
    EXISTING=$(vercel env ls 2>/dev/null | grep -c "^${VAR_NAME}" || true)

    if [ "$EXISTING" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  Variable already exists, removing old value...${NC}"
        vercel env rm "$VAR_NAME" production preview development --yes &>/dev/null || true
    fi

    # Add environment variable to all environments
    if echo "$VAR_VALUE" | vercel env add "$VAR_NAME" production preview development &>/dev/null; then
        echo -e "  ${GREEN}✅ Added successfully${NC}"
        ((SUCCESS++))
    else
        echo -e "  ${RED}❌ Failed to add${NC}"
        ((FAILED++))
    fi

    echo ""

done < "$ENV_FILE"

# Summary
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}  IMPORT COMPLETE${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "Total variables: ${YELLOW}${TOTAL_VARS}${NC}"
echo -e "Successfully added: ${GREEN}${SUCCESS}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 All environment variables imported successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Verify variables in Vercel dashboard"
    echo -e "  2. Trigger new deployment: ${BLUE}vercel --prod${NC}"
    echo ""
else
    echo -e "${RED}⚠️  Some variables failed to import${NC}"
    echo -e "${YELLOW}Please check the errors above and try again${NC}"
    echo ""
fi

echo -e "${BLUE}==============================================================================${NC}"
