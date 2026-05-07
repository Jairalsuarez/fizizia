-- Add final_price to projects (separate from client budget)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_price numeric(12,2);

-- Add client deadline and instructions to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_deadline date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS instructions text;

-- Add avatar_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_id text DEFAULT '1';

-- Add payment proof fields to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_holder_name text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_cedula text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES auth.users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_rejection_reason text;

-- Add project reference to payments (for admin queries)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- Make invoice_id nullable so payments can exist without invoices
ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Clients view own payments" ON payments;
  DROP POLICY IF EXISTS "Admins view all payments" ON payments;
  DROP POLICY IF EXISTS "Admins update payments" ON payments;
  DROP POLICY IF EXISTS "Clients insert own payments" ON payments;
  DROP POLICY IF EXISTS "Clients update own payments" ON payments;
  DROP POLICY IF EXISTS "Clients delete own payments" ON payments;
END $$;

-- Clients can only see their own payments
CREATE POLICY "Clients view own payments"
  ON payments FOR SELECT
  USING (client_id = (SELECT client_id FROM client_users WHERE user_id = auth.uid()));

-- Admins can see all payments
CREATE POLICY "Admins view all payments"
  ON payments FOR SELECT
  USING (auth.jwt()->>'role' = 'admin');

-- Admins can update payments (approve/reject)
CREATE POLICY "Admins update payments"
  ON payments FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin');

-- Clients can insert their own payments
CREATE POLICY "Clients insert own payments"
  ON payments FOR INSERT
  WITH CHECK (client_id = (SELECT client_id FROM client_users WHERE user_id = auth.uid()));

-- Enable RLS on project_tasks
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Admins can manage all project tasks
CREATE POLICY "Admins manage project tasks"
  ON project_tasks FOR ALL
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Clients can view project tasks for their projects
CREATE POLICY "Clients view project tasks"
  ON project_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_users cu ON cu.client_id = p.client_id
      WHERE p.id = project_tasks.project_id AND cu.user_id = auth.uid()
    )
  );

-- Add type and paid_to_user_id to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type text DEFAULT 'negocio' CHECK (type IN ('negocio', 'personal'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_to_user_id uuid REFERENCES profiles(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date date DEFAULT CURRENT_DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('gasto_negocio', 'pago_personal'));

-- Drop old category check constraint if exists and add new one
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check CHECK (category IN ('gasto_negocio', 'pago_personal'));

-- Add developer role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('client', 'manager', 'admin', 'developer'));

-- Create project_developers table
CREATE TABLE IF NOT EXISTS project_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, developer_id)
);

ALTER TABLE project_developers ENABLE ROW LEVEL SECURITY;

-- Developers can see their own assignments
CREATE POLICY "Developers view own assignments"
  ON project_developers FOR SELECT
  USING (developer_id = auth.uid());

-- Admins can manage assignments
CREATE POLICY "Admins manage assignments"
  ON project_developers FOR ALL
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Create project_file_requests table
CREATE TABLE IF NOT EXISTS project_file_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_text TEXT NOT NULL,
  fulfilled BOOLEAN DEFAULT false,
  fulfilled_file_id UUID REFERENCES project_files(id),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_file_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all file requests
CREATE POLICY "Admins manage file requests"
  ON project_file_requests FOR ALL
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Clients can view requests for their projects
CREATE POLICY "Clients view file requests"
  ON project_file_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_users cu ON cu.client_id = p.client_id
      WHERE p.id = project_file_requests.project_id AND cu.user_id = auth.uid()
    )
  );

-- Clients can fulfill requests for their projects
CREATE POLICY "Clients fulfill file requests"
  ON project_file_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_users cu ON cu.client_id = p.client_id
      WHERE p.id = project_file_requests.project_id AND cu.user_id = auth.uid()
    )
  );

-- Developers can view requests for their assigned projects
CREATE POLICY "Developers view file requests"
  ON project_file_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_developers pd
      WHERE pd.project_id = project_file_requests.project_id AND pd.developer_id = auth.uid()
    )
  );

