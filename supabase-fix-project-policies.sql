-- ==========================================
-- FIX: Políticas RLS para que clientes editen/eliminen sus proyectos
-- ==========================================

-- Clientes pueden editar sus propios proyectos
DROP POLICY IF EXISTS "Clients can update their projects" ON projects;
CREATE POLICY "Clients can update their projects"
  ON projects FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM client_users cu WHERE cu.client_id = client_id AND cu.user_id = auth.uid()
    )
  );

-- Clientes pueden eliminar sus propios proyectos
DROP POLICY IF EXISTS "Clients can delete their projects" ON projects;
CREATE POLICY "Clients can delete their projects"
  ON projects FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM client_users cu WHERE cu.client_id = client_id AND cu.user_id = auth.uid()
    )
  );
