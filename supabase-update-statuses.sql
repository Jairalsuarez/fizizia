-- Fix: Convert project status from enum to text
-- This avoids all enum migration headaches
-- Run this in the Supabase SQL editor

-- 1. Convert column to text (breaks free from old enum)
ALTER TABLE public.projects ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.projects ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'solicitado';

-- 2. Migrate existing values
UPDATE public.projects SET status = 'solicitado' WHERE status IN ('discovery', 'quoted');
UPDATE public.projects SET status = 'preparando' WHERE status = 'active';
UPDATE public.projects SET status = 'trabajando' WHERE status IN ('doing', 'review');
UPDATE public.projects SET status = 'pausado' WHERE status = 'paused';
UPDATE public.projects SET status = 'cancelado' WHERE status = 'cancelled';
UPDATE public.projects SET status = 'entregado' WHERE status = 'delivered';

-- 3. Drop old enum type (safe since column is now text)
DROP TYPE IF EXISTS public.project_status;
