-- ==========================================
-- FIZZIA: Complete RLS reset for clients, client_users, projects
-- ==========================================

-- 1. Disable RLS completely first
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Re-enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 3. Force policy recreation - drop ALL existing policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'clients'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON clients';
  END LOOP;
END $$;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'client_users'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON client_users';
  END LOOP;
END $$;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'projects'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON projects';
  END LOOP;
END $$;

-- 4. Create single permissive policies
-- Clients: anyone authenticated can do everything
CREATE POLICY "clients_permissive" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Client users: anyone authenticated can do everything
CREATE POLICY "client_users_permissive" ON client_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projects: anyone authenticated can do everything
CREATE POLICY "projects_permissive" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
