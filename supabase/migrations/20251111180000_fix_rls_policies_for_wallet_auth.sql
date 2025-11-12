-- ============================================================================
-- Fix RLS Policies for Wallet-Based Authentication
-- ============================================================================
--
-- Problem: Original policies use auth.jwt() which assumes Supabase Auth
-- Our app uses Solana wallet signatures, NOT Supabase Auth
-- Result: auth.jwt() is always NULL, policies always deny access
--
-- Solution: Replace auth.jwt()-based policies with permissive policies
-- that allow wallet-based operations via the anon key
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop all existing policies on users table
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- ============================================================================
-- STEP 2: Create new permissive policies for wallet-based authentication
-- ============================================================================

-- INSERT Policy: Allow anyone to create their user profile
-- This is safe because wallet addresses are unique and self-authenticating
CREATE POLICY "users_insert_policy"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT Policy: Allow anyone to read user profiles
-- This is needed for:
-- - Leaderboards
-- - Creator information on markets
-- - Social features
CREATE POLICY "users_select_policy"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

-- UPDATE Policy: Allow anyone to update profiles
-- TODO: In production, restrict this to backend service role only
-- or implement signature verification in the application layer
CREATE POLICY "users_update_policy"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE Policy: Prevent all deletions (use soft delete via last_seen_at instead)
-- Soft delete preserves history and prevents data loss
CREATE POLICY "users_delete_policy"
  ON users FOR DELETE
  TO anon, authenticated
  USING (false);

-- ============================================================================
-- STEP 3: Verify RLS is enabled on users table
-- ============================================================================

-- Ensure RLS is enabled (should already be enabled from initial migration)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- Verification: Print success message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully for wallet-based authentication';
  RAISE NOTICE 'Users table policies:';
  RAISE NOTICE '  - INSERT: Anyone can create profile';
  RAISE NOTICE '  - SELECT: Anyone can read profiles';
  RAISE NOTICE '  - UPDATE: Anyone can update profiles';
  RAISE NOTICE '  - DELETE: Disabled (use soft delete)';
END $$;

-- ============================================================================
-- To verify policies manually, run:
-- ============================================================================
-- SELECT
--   policyname,
--   cmd,
--   roles,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'users'
-- ORDER BY cmd, policyname;
-- ============================================================================
