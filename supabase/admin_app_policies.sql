-- Fizzia admin app permissions
-- Run this in Supabase SQL Editor after creating your admin user.

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'manager')
      and is_active = true
  );
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'manager', 'sales', 'designer', 'developer')
      and is_active = true
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'media_assets',
    'site_settings',
    'landing_sections',
    'services',
    'portfolio_projects',
    'portfolio_project_services',
    'portfolio_project_media',
    'testimonials',
    'faqs',
    'contact_messages',
    'leads',
    'lead_notes',
    'clients',
    'client_contacts',
    'client_users',
    'projects',
    'project_services',
    'project_milestones',
    'project_tasks',
    'project_files',
    'proposals',
    'proposal_items',
    'invoices',
    'invoice_items',
    'payments',
    'expenses',
    'appointments',
    'activity_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Fizzia admins manage %1$I" on public.%1$I', table_name);
    execute format(
      'create policy "Fizzia admins manage %1$I" on public.%1$I for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())',
      table_name
    );
  end loop;
end $$;

drop policy if exists "Fizzia users read own profile" on public.profiles;
create policy "Fizzia users read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin_user());

drop policy if exists "Fizzia admins manage profiles" on public.profiles;
create policy "Fizzia admins manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- Replace this email and run it once if your user is still not admin.
-- update public.profiles
-- set role = 'admin', is_active = true
-- where id = (select id from auth.users where email = 'tu-correo@dominio.com');
