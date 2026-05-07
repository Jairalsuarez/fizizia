-- MESSAGES TABLE (chat between clients and admin)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_admin_sender BOOLEAN DEFAULT FALSE,
  channel TEXT NOT NULL DEFAULT 'client' CHECK (channel IN ('client', 'internal')),
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'client';
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_check;
ALTER TABLE messages ADD CONSTRAINT messages_channel_check CHECK (channel IN ('client', 'internal'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_id TEXT DEFAULT '1';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_project_channel ON messages(project_id, channel, created_at);

CREATE TABLE IF NOT EXISTS project_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, developer_id)
);

ALTER TABLE IF EXISTS project_developers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view messages on their projects" ON messages;
CREATE POLICY "Users can view messages on their projects"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects pr
      JOIN client_users cu ON cu.client_id = pr.client_id
      WHERE pr.id = project_id AND cu.user_id = auth.uid() AND messages.channel = 'client'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
    OR
    (
      messages.channel = 'internal'
      AND EXISTS (
        SELECT 1
        FROM project_developers pd
        WHERE pd.project_id = messages.project_id
          AND pd.developer_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can send messages on their projects" ON messages;
CREATE POLICY "Users can send messages on their projects"
  ON messages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects pr
      JOIN client_users cu ON cu.client_id = pr.client_id
      WHERE pr.id = project_id AND cu.user_id = auth.uid() AND messages.channel = 'client'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
    OR
    (
      messages.channel = 'internal'
      AND EXISTS (
        SELECT 1
        FROM project_developers pd
        WHERE pd.project_id = messages.project_id
          AND pd.developer_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE USING (
    sender_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can mark project messages as read" ON messages;
CREATE POLICY "Users can mark project messages as read"
  ON messages FOR UPDATE USING (
    sender_id <> auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM projects pr
        JOIN client_users cu ON cu.client_id = pr.client_id
        WHERE pr.id = project_id AND cu.user_id = auth.uid() AND messages.channel = 'client'
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
      )
      OR
      (
        messages.channel = 'internal'
        AND EXISTS (
          SELECT 1
          FROM project_developers pd
          WHERE pd.project_id = messages.project_id
            AND pd.developer_id = auth.uid()
        )
      )
    )
  ) WITH CHECK (
    sender_id <> auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM projects pr
        JOIN client_users cu ON cu.client_id = pr.client_id
        WHERE pr.id = project_id AND cu.user_id = auth.uid() AND messages.channel = 'client'
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
      )
      OR
      (
        messages.channel = 'internal'
        AND EXISTS (
          SELECT 1
          FROM project_developers pd
          WHERE pd.project_id = messages.project_id
            AND pd.developer_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can view chat participant profiles" ON profiles;
CREATE POLICY "Users can view chat participant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM messages m
      JOIN projects pr ON pr.id = m.project_id
      JOIN client_users cu ON cu.client_id = pr.client_id
      WHERE m.sender_id = profiles.id
        AND m.channel = 'client'
        AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('admin', 'manager', 'developer')
    )
  );

DROP POLICY IF EXISTS "Internal users can view assignable profiles" ON profiles;
CREATE POLICY "Internal users can view assignable profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('admin', 'manager')
    )
  );

CREATE OR REPLACE FUNCTION public.get_assignable_project_developers()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  first_name TEXT,
  email TEXT,
  avatar_id TEXT,
  role TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.first_name,
    p.email,
    p.avatar_id,
    p.role::TEXT AS role
  FROM public.profiles p
  WHERE p.role::TEXT IN ('developer', 'admin')
  ORDER BY
    CASE WHEN p.id = auth.uid() THEN 0 WHEN p.role::TEXT = 'admin' THEN 1 ELSE 2 END,
    COALESCE(p.full_name, p.first_name, p.email);
$$;

GRANT EXECUTE ON FUNCTION public.get_assignable_project_developers() TO authenticated;

CREATE TABLE IF NOT EXISTS project_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, developer_id)
);

ALTER TABLE IF EXISTS project_developers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developers view own assignments" ON project_developers;
DROP POLICY IF EXISTS "Admins manage assignments" ON project_developers;
DROP POLICY IF EXISTS "Internal users view project developer assignments" ON project_developers;
CREATE POLICY "Internal users view project developer assignments"
  ON project_developers FOR SELECT
  TO authenticated
  USING (
    developer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role::TEXT IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Internal users manage project developer assignments" ON project_developers;
CREATE POLICY "Internal users manage project developer assignments"
  ON project_developers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role::TEXT IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role::TEXT IN ('admin', 'manager')
    )
  );

-- Add client_id directly to projects table for simpler queries
-- (if not already present)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add columns for project tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS staging_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_stack TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;
