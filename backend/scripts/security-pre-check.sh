#!/bin/bash

###############################################################################
# Security Pre-Check Script
# Purpose: Automated security validation before Week 2 audit
# Date: November 9, 2025
###############################################################################

# set -e  # Don't exit on error - we want to run all checks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
PASS_COUNT=0

# Output file
REPORT_FILE="$(pwd)/SECURITY_PRE_CHECK_REPORT.txt"
> "$REPORT_FILE"  # Clear file

###############################################################################
# Helper Functions
###############################################################################

log_section() {
    echo "" | tee -a "$REPORT_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$REPORT_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$REPORT_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$REPORT_FILE"
}

log_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1" | tee -a "$REPORT_FILE"
    ((PASS_COUNT++))
}

log_critical() {
    echo -e "${RED}🚨 CRITICAL:${NC} $1" | tee -a "$REPORT_FILE"
    ((CRITICAL_COUNT++))
}

log_high() {
    echo -e "${RED}❌ HIGH:${NC} $1" | tee -a "$REPORT_FILE"
    ((HIGH_COUNT++))
}

log_medium() {
    echo -e "${YELLOW}⚠️  MEDIUM:${NC} $1" | tee -a "$REPORT_FILE"
    ((MEDIUM_COUNT++))
}

log_low() {
    echo -e "${YELLOW}📋 LOW:${NC} $1" | tee -a "$REPORT_FILE"
    ((LOW_COUNT++))
}

###############################################################################
# Security Checks
###############################################################################

echo "🔒 Starting Security Pre-Check Automation..." | tee -a "$REPORT_FILE"
echo "Date: $(date)" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

###############################################################################
# CHECK 1: Dependency Vulnerabilities
###############################################################################

log_section "CHECK 1: NPM Dependency Vulnerabilities"

echo "Running npm audit..." | tee -a "$REPORT_FILE"
if npm audit --audit-level=moderate 2>&1 | tee -a "$REPORT_FILE"; then
    log_pass "No moderate or higher vulnerabilities found in dependencies"
else
    AUDIT_RESULT=$(npm audit --json 2>/dev/null || echo '{}')
    CRITICAL_VULNS=$(echo "$AUDIT_RESULT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    HIGH_VULNS=$(echo "$AUDIT_RESULT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
    MODERATE_VULNS=$(echo "$AUDIT_RESULT" | jq -r '.metadata.vulnerabilities.moderate // 0' 2>/dev/null || echo "0")

    if [ "$CRITICAL_VULNS" -gt 0 ]; then
        log_critical "Found $CRITICAL_VULNS critical vulnerabilities in dependencies"
    fi
    if [ "$HIGH_VULNS" -gt 0 ]; then
        log_high "Found $HIGH_VULNS high severity vulnerabilities in dependencies"
    fi
    if [ "$MODERATE_VULNS" -gt 0 ]; then
        log_medium "Found $MODERATE_VULNS moderate severity vulnerabilities in dependencies"
    fi
fi

###############################################################################
# CHECK 2: Environment Variable Leaks
###############################################################################

log_section "CHECK 2: Environment Variable Leaks"

echo "Scanning for hardcoded secrets..." | tee -a "$REPORT_FILE"

# Check for API keys, secrets, passwords in code
LEAKED_SECRETS=$(grep -r -i "API_KEY.*=\|SECRET.*=\|PASSWORD.*=" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    --exclude="config/env.ts" \
    2>/dev/null || true)

if [ -z "$LEAKED_SECRETS" ]; then
    log_pass "No hardcoded API keys, secrets, or passwords found in source code"
else
    log_high "Found potential hardcoded secrets in source code:"
    echo "$LEAKED_SECRETS" | tee -a "$REPORT_FILE"
fi

# Check for .env files in git
if git ls-files | grep -q "\.env$"; then
    log_critical ".env file is tracked by git (contains secrets!)"
else
    log_pass ".env file is not tracked by git"
fi

###############################################################################
# CHECK 3: Hardcoded Credentials
###############################################################################

log_section "CHECK 3: Hardcoded Credentials"

echo "Scanning for hardcoded credentials..." | tee -a "$REPORT_FILE"

# Check for password assignments
HARDCODED_PASSWORDS=$(grep -r "password\s*=\s*['\"]" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$HARDCODED_PASSWORDS" ]; then
    log_pass "No hardcoded passwords found"
else
    log_critical "Found hardcoded passwords:"
    echo "$HARDCODED_PASSWORDS" | head -10 | tee -a "$REPORT_FILE"
fi

# Check for private keys
PRIVATE_KEYS=$(grep -r "BEGIN.*PRIVATE KEY" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$PRIVATE_KEYS" ]; then
    log_pass "No private keys found in source code"
else
    log_critical "Found private keys in source code:"
    echo "$PRIVATE_KEYS" | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 4: SQL Injection Risks
###############################################################################

log_section "CHECK 4: SQL Injection Risks"

echo "Scanning for SQL injection vulnerabilities..." | tee -a "$REPORT_FILE"

# Check for raw SQL queries (Supabase uses parameterized queries by default)
RAW_QUERIES=$(grep -r "\.raw\|executeQuery\|query.*\`" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$RAW_QUERIES" ]; then
    log_pass "No raw SQL queries found (using Supabase parameterized queries)"
else
    log_medium "Found raw SQL queries (verify parameterization):"
    echo "$RAW_QUERIES" | head -10 | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 5: CORS Configuration
###############################################################################

log_section "CHECK 5: CORS Configuration"

echo "Checking CORS configuration..." | tee -a "$REPORT_FILE"

# Check for wildcard CORS
WILDCARD_CORS=$(grep -r "Access-Control-Allow-Origin.*\*\|cors.*origin.*\*" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$WILDCARD_CORS" ]; then
    log_pass "No wildcard CORS configuration found"
else
    log_medium "Found wildcard CORS (may allow unauthorized origins):"
    echo "$WILDCARD_CORS" | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 6: Authentication Bypass
###############################################################################

log_section "CHECK 6: Authentication Bypass Risks"

echo "Checking for authentication bypass vulnerabilities..." | tee -a "$REPORT_FILE"

# Check for disabled authentication
AUTH_BYPASS=$(grep -r "requireAuth.*false\|skipAuth\|noAuth" src/api/routes --include="*.ts" --include="*.js" \
    2>/dev/null || true)

if [ -z "$AUTH_BYPASS" ]; then
    log_pass "No authentication bypass flags found"
else
    log_high "Found potential authentication bypass:"
    echo "$AUTH_BYPASS" | tee -a "$REPORT_FILE"
fi

# Check for commented-out auth middleware
COMMENTED_AUTH=$(grep -r "//.*requireAuth\|/\*.*requireAuth" src/api/routes --include="*.ts" --include="*.js" \
    2>/dev/null || true)

if [ -z "$COMMENTED_AUTH" ]; then
    log_pass "No commented-out authentication middleware found"
else
    log_medium "Found commented-out authentication middleware (review if intentional):"
    echo "$COMMENTED_AUTH" | head -5 | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 7: Rate Limiting
###############################################################################

log_section "CHECK 7: Rate Limiting Protection"

echo "Checking for rate limiting implementation..." | tee -a "$REPORT_FILE"

# Check if rate limiting is configured
RATE_LIMIT=$(grep -r "rateLimit\|rate-limit\|express-rate-limit" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -n "$RATE_LIMIT" ]; then
    log_pass "Rate limiting middleware found"
    echo "$RATE_LIMIT" | head -3 | tee -a "$REPORT_FILE"
else
    log_medium "No rate limiting middleware found (vulnerable to DoS)"
fi

###############################################################################
# CHECK 8: Input Validation
###############################################################################

log_section "CHECK 8: Input Validation Coverage"

echo "Checking input validation coverage..." | tee -a "$REPORT_FILE"

# Find all route files
ROUTE_FILES=$(find src/api/routes -name "*.ts" 2>/dev/null || true)
TOTAL_ROUTES=0
VALIDATED_ROUTES=0

for file in $ROUTE_FILES; do
    if [ -f "$file" ]; then
        # Count POST/PUT/PATCH routes
        ROUTES=$(grep -c "router\.\(post\|put\|patch\)" "$file" 2>/dev/null || echo "0")
        TOTAL_ROUTES=$((TOTAL_ROUTES + ROUTES))

        # Check if file has validation
        if grep -q "validate\|Joi\|zod" "$file" 2>/dev/null; then
            VALIDATED_ROUTES=$((VALIDATED_ROUTES + ROUTES))
        fi
    fi
done

if [ $TOTAL_ROUTES -eq 0 ]; then
    log_pass "No routes found to validate"
elif [ $VALIDATED_ROUTES -eq $TOTAL_ROUTES ]; then
    log_pass "All $TOTAL_ROUTES routes have input validation"
else
    COVERAGE=$((VALIDATED_ROUTES * 100 / TOTAL_ROUTES))
    if [ $COVERAGE -lt 80 ]; then
        log_high "Only $VALIDATED_ROUTES/$TOTAL_ROUTES routes have input validation ($COVERAGE%)"
    else
        log_medium "$VALIDATED_ROUTES/$TOTAL_ROUTES routes have input validation ($COVERAGE%)"
    fi
fi

###############################################################################
# CHECK 9: Error Handling Security
###############################################################################

log_section "CHECK 9: Error Handling Security"

echo "Checking for information disclosure in error messages..." | tee -a "$REPORT_FILE"

# Check for stack traces in production
STACK_TRACES=$(grep -r "stack\|error\.stack" src/api --include="*.ts" --include="*.js" \
    --exclude="error-handler.ts" \
    2>/dev/null || true)

if [ -z "$STACK_TRACES" ]; then
    log_pass "No exposed stack traces found in routes"
else
    log_medium "Found stack trace exposure (may leak sensitive info):"
    echo "$STACK_TRACES" | head -5 | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 10: File Upload Security
###############################################################################

log_section "CHECK 10: File Upload Security"

echo "Checking file upload configurations..." | tee -a "$REPORT_FILE"

# Check for file upload handlers
FILE_UPLOADS=$(grep -r "multer\|upload\|file" src/api/routes --include="*.ts" --include="*.js" \
    2>/dev/null | grep -i "upload" || true)

if [ -z "$FILE_UPLOADS" ]; then
    log_pass "No file upload handlers found"
else
    # Check for file type validation
    FILE_VALIDATION=$(echo "$FILE_UPLOADS" | grep -i "mimetype\|fileFilter" || true)
    if [ -z "$FILE_VALIDATION" ]; then
        log_high "File upload handlers found without MIME type validation"
    else
        log_pass "File upload handlers have validation"
    fi
fi

###############################################################################
# CHECK 11: JWT/Token Security
###############################################################################

log_section "CHECK 11: JWT/Token Security"

echo "Checking JWT/token security..." | tee -a "$REPORT_FILE"

# Check for weak JWT secrets
WEAK_SECRETS=$(grep -r "jwt.*secret.*=.*['\"].\{1,15\}['\"]" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$WEAK_SECRETS" ]; then
    log_pass "No weak JWT secrets found in code"
else
    log_high "Found weak JWT secrets (less than 16 characters):"
    echo "$WEAK_SECRETS" | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 12: Logging Sensitive Data
###############################################################################

log_section "CHECK 12: Logging Security"

echo "Checking for sensitive data in logs..." | tee -a "$REPORT_FILE"

# Check for password/secret logging
SENSITIVE_LOGS=$(grep -r "logger.*password\|console\.log.*password\|logger.*secret" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$SENSITIVE_LOGS" ]; then
    log_pass "No sensitive data logging found"
else
    log_high "Found logging of potentially sensitive data:"
    echo "$SENSITIVE_LOGS" | head -5 | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 13: XSS Prevention
###############################################################################

log_section "CHECK 13: XSS Prevention"

echo "Checking for XSS vulnerabilities..." | tee -a "$REPORT_FILE"

# Check for innerHTML usage
INNERHTML=$(grep -r "innerHTML\|dangerouslySetInnerHTML" src/ --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$INNERHTML" ]; then
    log_pass "No direct HTML injection found"
else
    log_medium "Found direct HTML injection (verify sanitization):"
    echo "$INNERHTML" | head -5 | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 14: Prototype Pollution
###############################################################################

log_section "CHECK 14: Prototype Pollution Protection"

echo "Checking for prototype pollution vulnerabilities..." | tee -a "$REPORT_FILE"

# Check for unsafe object merge
UNSAFE_MERGE=$(grep -r "Object\.assign\|\.\.\..*req\.body\|\.\.\..*req\.query" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -z "$UNSAFE_MERGE" ]; then
    log_pass "No obvious prototype pollution vectors found"
else
    log_medium "Found potential prototype pollution vectors (review carefully):"
    echo "$UNSAFE_MERGE" | head -5 | tee -a "$REPORT_FILE"
fi

###############################################################################
# CHECK 15: Security Headers
###############################################################################

log_section "CHECK 15: Security Headers"

echo "Checking security headers implementation..." | tee -a "$REPORT_FILE"

# Check for helmet or security headers
SECURITY_HEADERS=$(grep -r "helmet\|X-Frame-Options\|Content-Security-Policy" src/ --include="*.ts" --include="*.js" \
    --exclude-dir=node_modules \
    2>/dev/null || true)

if [ -n "$SECURITY_HEADERS" ]; then
    log_pass "Security headers middleware found"
else
    log_medium "No security headers middleware found (vulnerable to clickjacking, etc.)"
fi

###############################################################################
# Summary Report
###############################################################################

log_section "SECURITY PRE-CHECK SUMMARY"

echo "" | tee -a "$REPORT_FILE"
echo "Total Checks Performed: 15" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo -e "${GREEN}✅ Passed: $PASS_COUNT${NC}" | tee -a "$REPORT_FILE"
echo -e "${RED}🚨 Critical Issues: $CRITICAL_COUNT${NC}" | tee -a "$REPORT_FILE"
echo -e "${RED}❌ High Priority Issues: $HIGH_COUNT${NC}" | tee -a "$REPORT_FILE"
echo -e "${YELLOW}⚠️  Medium Priority Issues: $MEDIUM_COUNT${NC}" | tee -a "$REPORT_FILE"
echo -e "${YELLOW}📋 Low Priority Issues: $LOW_COUNT${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# Calculate score
TOTAL_ISSUES=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT + LOW_COUNT))
SCORE=$((PASS_COUNT * 100 / 15))

echo "Security Score: $SCORE/100" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

if [ $CRITICAL_COUNT -gt 0 ]; then
    echo -e "${RED}⚠️  CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED${NC}" | tee -a "$REPORT_FILE"
    exit 1
elif [ $HIGH_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  High priority issues found - address before audit${NC}" | tee -a "$REPORT_FILE"
    exit 0
else
    echo -e "${GREEN}✅ No critical or high priority security issues found${NC}" | tee -a "$REPORT_FILE"
    exit 0
fi
