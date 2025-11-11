-- Fix users table INSERT policy
-- Issue: Users cannot insert their own profile due to missing RLS policy
-- Solution: Add INSERT policy to allow user creation

-- Allow users to insert their own profile on first login/registration
-- Using wallet address as the authentication identifier
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  WITH CHECK (true); -- Allow anyone to create a user profile for now

-- Note: In production, you might want to restrict this to:
-- WITH CHECK (wallet = auth.jwt() ->> 'sub');
-- This would require proper JWT authentication setup
