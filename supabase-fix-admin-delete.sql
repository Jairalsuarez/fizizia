-- ==========================================
-- FIZZIA: Fix admin delete + check profile
-- ==========================================

-- 1. Check which users have admin role
SELECT id, full_name, role FROM profiles WHERE role IN ('admin', 'manager');

-- 2. If your admin user doesn't have the right role, fix it:
-- UPDATE profiles SET role = 'admin' WHERE full_name = 'Tu Nombre';

-- 3. Ensure clients DELETE policy exists and works for admin
DROP POLICY IF EXISTS "Admin can delete clients" ON clients;
CREATE POLICY "Admin can delete clients"
  ON clients FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 4. Ensure leads DELETE policy exists and works for admin
DROP POLICY IF EXISTS "Admin can delete leads" ON leads;
CREATE POLICY "Admin can delete leads"
  ON leads FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 5. Ensure projects DELETE policy exists for admin
DROP POLICY IF EXISTS "Admin can delete projects" ON projects;
CREATE POLICY "Admin can delete projects"
  ON projects FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
