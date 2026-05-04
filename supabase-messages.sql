-- MESSAGES TABLE (chat between clients and admin)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_admin_sender BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);

-- RLS Policies
CREATE POLICY "Users can view messages on their projects"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects pr
      JOIN client_users cu ON cu.client_id = pr.client_id
      WHERE pr.id = project_id AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can send messages on their projects"
  ON messages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects pr
      JOIN client_users cu ON cu.client_id = pr.client_id
      WHERE pr.id = project_id AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE USING (
    sender_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
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
