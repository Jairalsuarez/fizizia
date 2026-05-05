-- Add avatar_id column to profiles table for avatar selection system
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_id text DEFAULT '1';

-- Optional: Remove avatar_url column if you no longer need photo uploads
-- ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;
