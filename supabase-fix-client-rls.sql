-- Fix RLS policies to allow new clients to create their own client record, link themselves, and request projects
-- Run this in the Supabase SQL editor

-- 1. Allow authenticated users (clients) to INSERT a new row into clients
DROP POLICY IF EXISTS "Clients can create own client record" ON public.clients;
CREATE POLICY "Clients can create own client record" 
  ON public.clients FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Allow authenticated users to link themselves in client_users
DROP POLICY IF EXISTS "Users can link themselves to a client" ON public.client_users;
CREATE POLICY "Users can link themselves to a client" 
  ON public.client_users FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 3. Allow clients to INSERT their own project request (status = 'discovery')
DROP POLICY IF EXISTS "Clients can create project requests" ON public.projects;
CREATE POLICY "Clients can create project requests" 
  ON public.projects FOR INSERT TO authenticated WITH CHECK (status = 'discovery');
