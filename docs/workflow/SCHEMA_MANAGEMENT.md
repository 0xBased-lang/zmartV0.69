# Schema Management & Type Safety (PATTERN #4 PREVENTION)

**Purpose**: Prevent schema drift syndrome through Supabase type generation
**Pattern Prevention**: Addresses Pattern #4 from lessons-learned (16+ fix commits, defensive code everywhere)

---

## Problem: Schema Drift Syndrome

**From lessons-learned**: Previous Zmart had 16+ commits fixing schema mismatches, defensive code everywhere

**Root Cause**: Database schema and TypeScript types evolved separately

**Example of drift**:
```typescript
// Database has: title
// Code expects: question
const market = await supabase.from('markets').select('question') // ❌ Fails at runtime

// Defensive code needed everywhere:
const title = market.title || market.question || 'Untitled' // 🚩 Code smell!
```

---

## Solution: Supabase Type Generation (Single Source of Truth)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Supabase Database (PostgreSQL)                 │
│          ↓                                              │
│    Source of Truth (schema lives here)                  │
└─────────────────────────────────────────────────────────┘
                         ↓
              supabase gen types typescript
                         ↓
┌─────────────────────────────────────────────────────────┐
│     types/database.ts (Auto-Generated)                  │
│     ↓                                                   │
│     TypeScript code imports these types                 │
└─────────────────────────────────────────────────────────┘
```

**Key Principle**: Database schema is source of truth, TypeScript derives from it

**Why NOT Prisma**: Prisma requires managing schema in `schema.prisma` file (conflicts with Supabase migrations). Supabase has built-in type generation (simpler, native, integrated).

---

## Setup & Workflow

### 1. Initial Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Generate types from your database
supabase gen types typescript --local > types/database.ts

# Commit generated types
git add types/database.ts
git commit -m "chore: Generate Supabase types"
```

### 2. Git Pre-Commit Hook (Automated Type Sync)

**Already included in `.git-hooks/pre-commit`**:

```bash
# Auto-regenerate types if database migrations changed
if echo "$STAGED_FILES" | grep -q "supabase/migrations/"; then
    echo "📊 Database migration detected - regenerating types..."
    supabase gen types typescript --local > types/database.ts
    git add types/database.ts
    echo "✅ Types updated automatically"
fi
```

**Installation**:
```bash
# Copy hook to .git/hooks/
cp .git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 3. Usage in Code

```typescript
// ❌ BAD: Manual type definitions (will drift!)
interface Market {
    question: string  // What if DB has 'title'?
    status: string
}

// ✅ GOOD: Import from generated types
import { Database } from '@/types/database'

type Market = Database['public']['Tables']['markets']['Row']
type MarketInsert = Database['public']['Tables']['markets']['Insert']
type MarketUpdate = Database['public']['Tables']['markets']['Update']

// TypeScript now KNOWS the exact structure from database
const { data, error } = await supabase
    .from('markets')
    .select('*')  // TypeScript validates these fields!

// If you select 'question' but DB has 'title', TypeScript error at compile time! ✅
```

---

## Migration Workflow (Pattern #4 Prevention)

### Before Creating Migration

```bash
# 1. Plan your schema change
# Write migration SQL in supabase/migrations/YYYYMMDDHHMMSS_description.sql

# Example: supabase/migrations/20251105120000_add_voting_tables.sql
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES markets(id),
    user_wallet TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

# 2. Test migration locally
supabase db reset  # Applies all migrations from scratch
supabase db diff   # Check what changed

# 3. Regenerate types (AUTOMATIC via git hook)
supabase gen types typescript --local > types/database.ts

# 4. Update application code to use new types
# TypeScript will show errors where code doesn't match new schema

# 5. Commit migration + types together
git add supabase/migrations/*.sql types/database.ts
git commit -m "feat: Story X.Y - Add voting tables with generated types"
```

### Migration Review Checklist

**Before deploying ANY database migration:**

□ Migration SQL reviewed and tested locally
□ Types regenerated (`supabase gen types typescript`)
□ All TypeScript compilation errors fixed
□ All queries updated to match new schema
□ Integration tests updated (if schema changed)
□ Rollback migration written and tested
□ RLS policies added/updated (if applicable)

**ONLY after ALL checks → Deploy migration**

---

## CI/CD Integration

**Add to `.github/workflows/ci.yml`** (included in infrastructure files):

```yaml
supabase-types:
  name: Verify Supabase Types
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Supabase CLI
      run: npm install -g supabase

    - name: Generate types and compare
      run: |
        supabase gen types typescript --local > temp-types.ts

        if ! diff temp-types.ts types/database.ts; then
          echo "❌ ERROR: Supabase types out of sync!"
          echo "   Run: supabase gen types typescript --local > types/database.ts"
          exit 1
        fi

        echo "✅ Supabase types in sync"
```

---

## Benefits of This Approach

✅ **IMPOSSIBLE for schema drift**: Types always match database
✅ **Compile-time safety**: TypeScript catches mismatches before runtime
✅ **No manual sync needed**: Automated via git hooks
✅ **CI/CD validation**: Pipeline blocks if types out of sync
✅ **Zero defensive code**: No more `field1 || field2 || field3` fallbacks
✅ **Self-documenting**: Types serve as API documentation

---

## Common Scenarios

### Scenario 1: Adding a new table

```sql
-- Migration: supabase/migrations/20251105_add_disputes.sql
CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES markets(id),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```typescript
// After regenerating types, immediately available:
import { Database } from '@/types/database'

type Dispute = Database['public']['Tables']['disputes']['Row']

const { data } = await supabase
    .from('disputes')  // ✅ TypeScript knows this table exists
    .select('*')
```

### Scenario 2: Renaming a column

```sql
-- Migration: supabase/migrations/20251105_rename_question_to_title.sql
ALTER TABLE markets RENAME COLUMN question TO title;
```

```typescript
// After regenerating types, TypeScript will ERROR on old usage:
const { data } = await supabase
    .from('markets')
    .select('question')  // ❌ TypeScript error: Property 'question' does not exist

// Must update to:
const { data } = await supabase
    .from('markets')
    .select('title')  // ✅ Correct
```

**This is GOOD** - catches issues at compile time, not runtime!

### Scenario 3: Changing column type

```sql
-- Migration: supabase/migrations/20251105_change_status_type.sql
ALTER TABLE markets ALTER COLUMN status TYPE TEXT;
```

After regenerating types, TypeScript knows status is now `string` (not enum or other type).

---

## What NOT to Do (Anti-Patterns)

❌ Manual type definitions separate from database
❌ "We'll sync types later" (Pattern #4: it won't happen)
❌ Deploying migrations without regenerating types
❌ Skipping the pre-commit hook "just this once"
❌ Using Prisma with Supabase (conflicts, unnecessary complexity)
❌ Defensive code like `field1 || field2 || field3` (indicates drift)

---

## Troubleshooting

### Types out of sync after pulling changes

```bash
# Someone else made a migration, regenerate types
supabase gen types typescript --local > types/database.ts
git add types/database.ts
git commit -m "chore: Sync Supabase types"
```

### Migration failed, need to rollback

```bash
# Reset to previous migration
supabase db reset

# Or rollback specific migration
supabase migrations rollback --count 1
```

### Type generation fails

```bash
# Check Supabase CLI is installed
supabase --version

# Check you're linked to correct project
supabase link --project-ref YOUR_PROJECT_REF

# Test with explicit output
supabase gen types typescript --local
```

---

## Alternative: Prisma (NOT RECOMMENDED for this project)

**Why NOT Prisma with Supabase**:
- Prisma requires managing schema in `schema.prisma` file (conflicts with Supabase migrations)
- Supabase has built-in type generation (no need for Prisma)
- Prisma adds complexity without benefits for Supabase projects
- Prisma Client is an ORM (different from Supabase client SDK)

**When to use Prisma**: If NOT using Supabase (e.g., self-hosted PostgreSQL without Supabase)

**For ZMART v0.69**: Use Supabase type generation (simple, native, integrated)

---

## Related Documents

- **Definition of Done**: `docs/DEFINITION_OF_DONE.md` (Tier 3-4 require schema validation)
- **Git Workflow**: `docs/DEVELOPMENT_WORKFLOW.md` (commit conventions)
- **Pre-Commit Hook**: `.git-hooks/pre-commit` (auto-regenerates types)
- **CI/CD Pipeline**: `docs/CICD_PIPELINE.md` (validates types in sync)
- **Database Schema**: `docs/08_DATABASE_SCHEMA.md` (complete schema design)

---

**Last Updated**: November 5, 2025
**Version**: 1.0 (Supabase Type Generation)
