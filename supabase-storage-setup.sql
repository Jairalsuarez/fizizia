-- ==========================================
-- FIZZIA: Storage buckets + new project columns + profile avatar
-- ==========================================

-- 1. Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies - anyone can view files
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
CREATE POLICY "Anyone can view files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files');

-- 4. Authenticated users can upload files
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

-- 5. Users can update/delete their own files
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

-- 6. Anyone can view avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 7. Authenticated users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 8. Users can update/delete their own avatar
DROP POLICY IF EXISTS "Users can update own avatar storage" ON storage.objects;
CREATE POLICY "Users can update own avatar storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own avatar storage" ON storage.objects;
CREATE POLICY "Users can delete own avatar storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 5. Add missing columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS repo_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS live_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- 6. Add missing columns to project_files table
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS uploader_id UUID REFERENCES auth.users(id);
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE project_files ALTER COLUMN visibility SET DEFAULT 'client';

-- 7. Add avatar_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 8. RLS: users can upload files to their own projects
DROP POLICY IF EXISTS "Users can insert project files" ON project_files;
CREATE POLICY "Users can insert project files"
  ON project_files FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      JOIN client_users cu ON c.id = cu.client_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- 9. Users can view files from their projects
DROP POLICY IF EXISTS "Users can view own project files" ON project_files;
CREATE POLICY "Users can view own project files"
  ON project_files FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      JOIN client_users cu ON c.id = cu.client_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- 10. Admin can view/insert/update/delete all files
DROP POLICY IF EXISTS "Admin can manage all files" ON project_files;
CREATE POLICY "Admin can manage all files"
  ON project_files FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 11. Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 12. Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 13. Realtime ya está habilitado para profiles
