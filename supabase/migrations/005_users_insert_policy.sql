-- Migration: 005_users_insert_policy.sql
-- Description: Add INSERT policy for users table to allow OAuth upsert

-- Allow users to insert their own record (for upsert in auth callback)
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
