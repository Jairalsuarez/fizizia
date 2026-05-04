-- ==========================================
-- FIX FINAL: Sin referencia a p.email
-- ==========================================

-- 1. Trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')::profile_role,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Usuarios existentes sin perfil
INSERT INTO public.profiles (id, full_name, role, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'client')::profile_role,
  COALESCE(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- 3. Crear clientes para usuarios sin uno
INSERT INTO public.clients (name, status)
SELECT
  COALESCE(p.full_name, 'Cliente'),
  'active'
FROM public.profiles p
WHERE p.role = 'client'::profile_role
  AND NOT EXISTS (SELECT 1 FROM public.client_users cu WHERE cu.user_id = p.id);

-- 4. Vincular (evitar duplicados por nombre)
INSERT INTO public.client_users (user_id, client_id)
SELECT p.id, c.id
FROM public.profiles p
JOIN LATERAL (
  SELECT c2.id FROM public.clients c2
  WHERE c2.name = COALESCE(p.full_name, 'Cliente')
    AND NOT EXISTS (SELECT 1 FROM public.client_users cu WHERE cu.client_id = c2.id)
  ORDER BY c2.created_at ASC
  LIMIT 1
) c ON true
WHERE p.role = 'client'::profile_role
  AND NOT EXISTS (SELECT 1 FROM public.client_users cu WHERE cu.user_id = p.id);

-- 5. Políticas RLS
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON clients;
CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own client link" ON client_users;
CREATE POLICY "Users can insert own client link"
  ON client_users FOR INSERT WITH CHECK (auth.uid() = user_id);
