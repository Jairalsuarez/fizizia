-- Fizzia Supabase schema
-- Run this in the Supabase SQL editor after creating the project.

create extension if not exists pgcrypto;

do $$
begin
  create type public.profile_role as enum ('admin', 'manager', 'sales', 'designer', 'developer', 'client');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.lead_status as enum ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_status as enum ('discovery', 'quoted', 'active', 'paused', 'review', 'delivered', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_status as enum ('todo', 'doing', 'blocked', 'review', 'done', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.billing_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role public.profile_role not null default 'client',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'client'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_fizzia_admin()
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

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  bucket text not null default 'landing-assets',
  path text not null,
  public_url text,
  alt_text text,
  asset_type text not null default 'image',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  is_public boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  eyebrow text,
  title text not null,
  subtitle text,
  body text,
  cta_label text,
  cta_href text,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null,
  description text,
  category text not null default 'digital',
  starting_price numeric(12,2),
  currency char(3) not null default 'USD',
  estimated_days_min integer,
  estimated_days_max integer,
  icon_name text,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  client_name text,
  industry text,
  province text,
  city text,
  summary text not null,
  challenge text,
  solution text,
  results text,
  website_url text,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_project_services (
  project_id uuid not null references public.portfolio_projects(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  primary key (project_id, service_id)
);

create table if not exists public.portfolio_project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.portfolio_projects(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  company_name text,
  role_title text,
  quote text not null,
  rating integer check (rating between 1 and 5),
  avatar_asset_id uuid references public.media_assets(id) on delete set null,
  project_id uuid references public.portfolio_projects(id) on delete set null,
  province text,
  city text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'general',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company_name text,
  province text,
  city text,
  service_interest text,
  budget_range text,
  message text not null,
  source text not null default 'landing',
  metadata jsonb not null default '{}',
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_message_id uuid references public.contact_messages(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  company_name text,
  tax_id text,
  province text,
  city text,
  source text not null default 'landing',
  status public.lead_status not null default 'new',
  service_id uuid references public.services(id) on delete set null,
  budget_range text,
  need_summary text,
  probability integer not null default 0 check (probability between 0 and 100),
  assigned_to uuid references public.profiles(id) on delete set null,
  next_follow_up_at timestamptz,
  converted_client_id uuid,
  won_at timestamptz,
  lost_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tax_id text,
  client_type text not null default 'business',
  email text,
  phone text,
  website_url text,
  province text,
  city text,
  address text,
  status text not null default 'active',
  notes text,
  created_from_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads
  drop constraint if exists leads_converted_client_id_fkey;

alter table public.leads
  add constraint leads_converted_client_id_fkey
  foreign key (converted_client_id) references public.clients(id) on delete set null;

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  role_title text,
  email text,
  phone text,
  whatsapp text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_users (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_view_finances boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  name text not null,
  slug text unique,
  description text,
  status public.project_status not null default 'discovery',
  budget numeric(12,2),
  currency char(3) not null default 'USD',
  start_date date,
  due_date date,
  delivered_at timestamptz,
  project_manager_id uuid references public.profiles(id) on delete set null,
  repository_url text,
  staging_url text,
  production_url text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_services (
  project_id uuid not null references public.projects(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  primary key (project_id, service_id)
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority integer not null default 2 check (priority between 0 and 3),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  asset_id uuid references public.media_assets(id) on delete set null,
  title text not null,
  file_url text,
  visibility text not null default 'internal',
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  status public.billing_status not null default 'draft',
  currency char(3) not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  valid_until date,
  sent_at timestamptz,
  accepted_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (quantity * unit_price) stored,
  sort_order integer not null default 0
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  invoice_number text not null unique,
  status public.billing_status not null default 'draft',
  currency char(3) not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  issued_at date,
  due_at date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (quantity * unit_price) stored,
  sort_order integer not null default 0
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  currency char(3) not null default 'USD',
  method text,
  reference text,
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  category text,
  amount numeric(12,2) not null,
  currency char(3) not null default 'USD',
  expense_date date not null default current_date,
  receipt_asset_id uuid references public.media_assets(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  meeting_url text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  description text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_media_assets_public on public.media_assets (is_public, asset_type);
create index if not exists idx_landing_sections_published on public.landing_sections (is_published, sort_order);
create index if not exists idx_services_active on public.services (is_active, sort_order);
create index if not exists idx_portfolio_published on public.portfolio_projects (is_published, is_featured, sort_order);
create index if not exists idx_contact_messages_created_at on public.contact_messages (created_at desc);
create index if not exists idx_leads_status on public.leads (status, created_at desc);
create index if not exists idx_leads_assigned_to on public.leads (assigned_to);
create index if not exists idx_clients_name on public.clients (name);
create index if not exists idx_projects_client_id on public.projects (client_id);
create index if not exists idx_projects_status on public.projects (status, due_date);
create index if not exists idx_project_tasks_project_status on public.project_tasks (project_id, status);
create index if not exists idx_invoices_client_status on public.invoices (client_id, status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'media_assets', 'site_settings', 'landing_sections', 'services',
    'portfolio_projects', 'portfolio_project_services', 'portfolio_project_media',
    'testimonials', 'faqs', 'contact_messages', 'leads', 'lead_notes',
    'clients', 'client_contacts', 'client_users', 'projects', 'project_services',
    'project_milestones', 'project_tasks', 'project_files', 'proposals',
    'proposal_items', 'invoices', 'invoice_items', 'payments', 'expenses',
    'appointments', 'activity_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'media_assets', 'site_settings', 'landing_sections', 'services',
    'portfolio_projects', 'portfolio_project_services', 'portfolio_project_media',
    'testimonials', 'faqs', 'contact_messages', 'leads', 'lead_notes',
    'clients', 'client_contacts', 'client_users', 'projects', 'project_services',
    'project_milestones', 'project_tasks', 'project_files', 'proposals',
    'proposal_items', 'invoices', 'invoice_items', 'payments', 'expenses',
    'appointments', 'activity_log'
  ]
  loop
    execute format('drop policy if exists "Internal users manage %1$I" on public.%1$I', table_name);
    execute format(
      'create policy "Internal users manage %1$I" on public.%1$I for all to authenticated using (public.is_internal_user()) with check (public.is_internal_user())',
      table_name
    );
  end loop;
end $$;

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_internal_user());

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Public can read public media"
on public.media_assets for select
to anon, authenticated
using (is_public = true);

create policy "Public can read public site settings"
on public.site_settings for select
to anon, authenticated
using (is_public = true);

create policy "Public can read published landing sections"
on public.landing_sections for select
to anon, authenticated
using (is_published = true);

create policy "Public can read active services"
on public.services for select
to anon, authenticated
using (is_active = true);

create policy "Public can read published portfolio"
on public.portfolio_projects for select
to anon, authenticated
using (is_published = true);

create policy "Public can read portfolio services"
on public.portfolio_project_services for select
to anon, authenticated
using (
  exists (
    select 1
    from public.portfolio_projects p
    where p.id = project_id
      and p.is_published = true
  )
);

create policy "Public can read portfolio media"
on public.portfolio_project_media for select
to anon, authenticated
using (
  exists (
    select 1
    from public.portfolio_projects p
    where p.id = project_id
      and p.is_published = true
  )
);

create policy "Public can read published testimonials"
on public.testimonials for select
to anon, authenticated
using (is_published = true);

create policy "Public can read published faqs"
on public.faqs for select
to anon, authenticated
using (is_published = true);

create policy "Public can create contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (true);

create policy "Client users can read own client"
on public.clients for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.client_users cu
    where cu.client_id = id
      and cu.user_id = auth.uid()
  )
);

create policy "Client users can read own contacts"
on public.client_contacts for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.client_users cu
    where cu.client_id = client_contacts.client_id
      and cu.user_id = auth.uid()
  )
);

create policy "Client users can read own projects"
on public.projects for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.client_users cu
    where cu.client_id = projects.client_id
      and cu.user_id = auth.uid()
  )
);

create policy "Client users can read project milestones"
on public.project_milestones for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.projects p
    join public.client_users cu on cu.client_id = p.client_id
    where p.id = project_milestones.project_id
      and cu.user_id = auth.uid()
  )
);

create policy "Client users can read visible project files"
on public.project_files for select
to authenticated
using (
  public.is_internal_user()
  or (
    visibility = 'client'
    and exists (
      select 1
      from public.projects p
      join public.client_users cu on cu.client_id = p.client_id
      where p.id = project_files.project_id
        and cu.user_id = auth.uid()
    )
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'media_assets', 'site_settings', 'landing_sections', 'services',
    'portfolio_projects', 'testimonials', 'faqs', 'leads', 'clients',
    'client_contacts', 'projects', 'project_milestones', 'project_tasks',
    'proposals', 'invoices', 'expenses', 'appointments'
  ]
  loop
    execute format('drop trigger if exists set_%1$I_updated_at on public.%1$I', table_name);
    execute format(
      'create trigger set_%1$I_updated_at before update on public.%1$I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values
  ('landing-assets', 'landing-assets', true),
  ('project-files', 'project-files', false)
on conflict (id) do nothing;

drop policy if exists "Public reads landing assets" on storage.objects;
create policy "Public reads landing assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'landing-assets');

drop policy if exists "Internal users manage landing assets" on storage.objects;
create policy "Internal users manage landing assets"
on storage.objects for all
to authenticated
using (bucket_id = 'landing-assets' and public.is_internal_user())
with check (bucket_id = 'landing-assets' and public.is_internal_user());

drop policy if exists "Internal users manage project files" on storage.objects;
create policy "Internal users manage project files"
on storage.objects for all
to authenticated
using (bucket_id = 'project-files' and public.is_internal_user())
with check (bucket_id = 'project-files' and public.is_internal_user());

insert into public.site_settings (key, value, is_public)
values
  ('brand', '{"name":"Fizzia","tagline":"Agilizando tu vida digital por ti.","country":"Ecuador","currency":"USD","primaryColor":"#4caf50"}', true),
  ('contact', '{"whatsapp":"","email":"","instagram":"","city":"","province":""}', true),
  ('landing_copy', '{"heroTitle":"Creamos paginas, apps y sistemas digitales para negocios en Ecuador","heroSubtitle":"Disenamos y construimos tecnologia clara, moderna y lista para vender, operar y crecer."}', true)
on conflict (key) do update
set value = excluded.value,
    is_public = excluded.is_public,
    updated_at = now();

insert into public.services (slug, name, short_description, category, sort_order, is_featured)
values
  ('landing-pages', 'Landing pages', 'Paginas enfocadas en captar clientes y convertir visitas en contactos.', 'web', 10, true),
  ('apps-web', 'Apps web', 'Aplicaciones para operar procesos, clientes, ventas y equipos.', 'software', 20, true),
  ('apps-moviles', 'Apps moviles', 'Experiencias moviles para clientes, comunidades o equipos internos.', 'software', 30, true),
  ('automatizaciones', 'Automatizaciones', 'Flujos digitales para ahorrar tiempo y reducir trabajo manual.', 'operations', 40, false),
  ('branding-digital', 'Branding digital', 'Identidad visual, contenidos y presencia digital para lanzar mejor.', 'brand', 50, false)
on conflict (slug) do nothing;

insert into public.landing_sections (slug, label, eyebrow, title, subtitle, sort_order)
values
  ('hero', 'Hero', 'Fizzia Ecuador', 'Tu negocio digital, construido con claridad', 'Paginas, apps y sistemas para vender mejor y gestionar mejor.', 10),
  ('services', 'Servicios', 'Que hacemos', 'Construimos lo que tu negocio necesita para crecer', 'Desde una landing que capta clientes hasta una app completa de gestion.', 20),
  ('portfolio', 'Portafolio', 'Proyectos', 'Muestra resultados, no solo pantallas bonitas', 'Casos, imagenes y resultados publicados desde Supabase.', 30),
  ('process', 'Proceso', 'Metodo', 'De idea a producto sin enredarte', 'Diagnostico, propuesta, diseno, desarrollo, lanzamiento y soporte.', 40),
  ('contact', 'Contacto', 'Cotiza tu proyecto', 'Hablemos de lo que quieres construir', 'Recibe solicitudes desde la landing y conviertelas en clientes.', 50)
on conflict (slug) do nothing;
