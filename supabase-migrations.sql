-- Add final_price to projects (separate from client budget)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_price numeric(12,2);

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
