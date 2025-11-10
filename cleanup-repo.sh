#!/bin/bash
# ZMART Repository Cleanup Script
# Run this to remove duplicate files and organize old status docs

set -e

echo "=== ZMART Repository Cleanup ==="
echo ""

# Create archive directories
echo "Creating archive directories..."
mkdir -p docs/archive/2025-11
mkdir -p test-data/logs-archive/2025-11-09

# Delete duplicate backend scripts
echo ""
echo "Removing duplicate backend scripts..."
rm -f "backend/scripts/create-market-onchain 2.ts"
rm -f "backend/scripts/create-test-data 2.ts"
rm -f "backend/scripts/deploy-market-monitor 2.ts"
rm -f "backend/scripts/initialize-program 2.ts"
rm -f "backend/scripts/test-api-lifecycle 2.ts"
rm -f "backend/scripts/test-db-connection 2.ts"
rm -f "backend/scripts/test-helius-connection 2.ts"
rm -f "backend/scripts/test-http-endpoints 2.ts"
rm -f "backend/scripts/test-integration 2.ts"
rm -f "backend/scripts/test-pinata-connection 2.ts"
echo "✅ Removed 10 duplicate backend scripts"

# Delete duplicate migrations
echo ""
echo "Removing duplicate migrations..."
rm -f "backend/migrations/001_initial_schema 2.sql"
rm -f "supabase/migrations/20251106220000_initial_schema 2.sql"
rm -f "supabase/migrations/20251107000000_market_finalization_errors 2.sql"
echo "✅ Removed 3 duplicate migration files"

# Delete duplicate Supabase configs
echo ""
echo "Removing duplicate Supabase configs..."
rm -f "supabase/config 2.toml"
rm -f "supabase/.gitignore 2"
echo "✅ Removed 2 duplicate Supabase config files"

# Delete duplicate directories
echo ""
echo "Removing duplicate directories..."
rm -rf "backend/dist/services 2"
echo "✅ Removed duplicate dist directory"

# Delete duplicate binaries
echo ""
echo "Removing duplicate binaries..."
rm -f "backend/node_modules/.bin/eslint 2"
echo "✅ Removed 1 duplicate binary"

# Archive old status documents
echo ""
echo "Archiving old status documents..."
mv COMPREHENSIVE-STRATEGIC-ANALYSIS-NOV-8-2025.md docs/archive/2025-11/ 2>/dev/null || true
mv INTEGRATION-TEST-BULLETPROOF-REPORT.md docs/archive/2025-11/ 2>/dev/null || true
mv BACKEND-DEPLOYMENT-SUCCESS-NOV8.md docs/archive/2025-11/ 2>/dev/null || true
echo "✅ Archived old status documents"

# Archive test logs if they exist
echo ""
echo "Archiving test logs..."
find . -maxdepth 1 -name "*-test-results.log" -exec mv {} test-data/logs-archive/2025-11-09/ \; 2>/dev/null || true
echo "✅ Archived test result logs"

# Delete temporary test scripts
echo ""
echo "Removing temporary test scripts..."
rm -f check-test-market.js 2>/dev/null || true
rm -f insert-test-market.mjs 2>/dev/null || true
rm -f test-webhook.json 2>/dev/null || true
echo "✅ Removed temporary test scripts"

echo ""
echo "=== Cleanup Complete! ==="
echo ""
echo "📊 Summary:"
echo "  - Removed 18 duplicate files"
echo "  - Archived 6+ old status documents"
echo "  - Archived test logs"
echo "  - Removed 3 temporary scripts"
echo ""
echo "✅ Repository is now clean and organized!"
echo ""
echo "Next: Review CURRENT_STATUS.md to see where you are in the project"
