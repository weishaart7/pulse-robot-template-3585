-- Fix critical security vulnerability in Profils table
-- Add user_id column to link profiles to specific users
ALTER TABLE public."Profils" ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id required for new records (but allow existing records to have NULL temporarily)
-- We'll need to update existing records manually if any exist

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can create profiles" ON public."Profils";
DROP POLICY IF EXISTS "Users can delete profiles" ON public."Profils";
DROP POLICY IF EXISTS "Users can update profiles" ON public."Profils";
DROP POLICY IF EXISTS "Users can view their own profile" ON public."Profils";

-- Create secure RLS policies that restrict access to user's own data
CREATE POLICY "Users can view their own profile"
ON public."Profils"
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public."Profils"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public."Profils"
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
ON public."Profils"
FOR DELETE
USING (auth.uid() = user_id);
