-- Migrate project statuses to new names
-- Run this in the Supabase SQL editor

-- 1. Create new enum type with new values
CREATE TYPE public.project_status_new AS ENUM ('solicitado', 'preparando', 'trabajando', 'pausado', 'cancelado', 'entregado');

-- 2. Alter the projects table to use text temporarily, then to new enum
ALTER TABLE public.projects ALTER COLUMN status TYPE text USING status::text;

-- 3. Migrate existing values
UPDATE public.projects SET status = 'solicitado' WHERE status = 'discovery';
UPDATE public.projects SET status = 'preparando' WHERE status IN ('active', 'doing', 'quoted');
UPDATE public.projects SET status = 'trabajando' WHERE status = 'review';
-- paused, cancelled, delivered stay the same name

-- 4. Convert column to new enum
ALTER TABLE public.projects ALTER COLUMN status TYPE public.project_status_new USING status::public.project_status_new;

-- 5. Drop old enum
DROP TYPE IF EXISTS public.project_status;

-- 6. Rename new enum
ALTER TYPE public.project_status_new RENAME TO project_status;
