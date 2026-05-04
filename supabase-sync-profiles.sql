-- ==========================================
-- Sincronizar perfiles existentes desde auth.users
-- ==========================================

UPDATE public.profiles p
SET
  full_name = COALESCE(u.raw_user_meta_data->>'full_name', p.full_name),
  role = COALESCE(u.raw_user_meta_data->>'role', 'client')::profile_role,
  phone = COALESCE(u.raw_user_meta_data->>'phone', p.phone)
FROM auth.users u
WHERE p.id = u.id
  AND (
    p.full_name IS NULL 
    OR p.full_name = '' 
    OR p.phone IS NULL 
    OR p.phone = ''
  );

-- Verificar que se actualizaron
SELECT full_name, phone, role FROM public.profiles LIMIT 10;
