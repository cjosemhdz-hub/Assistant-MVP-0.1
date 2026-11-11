-- MFA Assistant MVP: multi-tenant foundation for Supabase/PostgreSQL.
-- Apply only after creating a dedicated Supabase project and reviewing policies.
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  tax_id text,
  currency char(3) not null default 'MXN',
  created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('mfa_admin','mfa_staff','client_admin','client_viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);
create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_month date not null,
  status text not null default 'open' check (status in ('open','in_review','approved','closed')),
  created_at timestamptz not null default now(),
  unique (organization_id,period_month)
);
create table if not exists public.source_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_id uuid references public.periods(id) on delete set null,
  uploaded_by uuid not null references auth.users(id),
  category text not null check (category in ('trial_balance','bank_statement','cfdi_xml','supporting_document','dictionary')),
  object_path text not null,
  original_name text not null,
  mime_type text,
  sha256 text,
  processing_status text not null default 'pending' check (processing_status in ('pending','processed','failed','quarantined')),
  created_at timestamptz not null default now()
);
create table if not exists public.review_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_id uuid not null references public.periods(id) on delete cascade,
  initiated_by uuid not null references auth.users(id),
  engine_version text not null default '0.1.0',
  status text not null default 'running' check (status in ('running','completed','failed','approved')),
  input_manifest jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.review_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  severity text not null check (severity in ('info','low','medium','high','critical')),
  title text not null,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  recommendation text,
  status text not null default 'open' check (status in ('open','in_review','resolved','accepted_risk')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.memberships m where m.organization_id=org_id and m.user_id=auth.uid()); $$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.periods enable row level security;
alter table public.source_files enable row level security;
alter table public.review_runs enable row level security;
alter table public.findings enable row level security;
alter table public.audit_events enable row level security;

create policy "org members read own org" on public.organizations for select using (public.is_org_member(id));
create policy "members read own org membership" on public.memberships for select using (public.is_org_member(organization_id));
create policy "members read periods" on public.periods for select using (public.is_org_member(organization_id));
create policy "members manage periods" on public.periods for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members read source files" on public.source_files for select using (public.is_org_member(organization_id));
create policy "members add source files" on public.source_files for insert with check (public.is_org_member(organization_id) and uploaded_by=auth.uid());
create policy "members read review runs" on public.review_runs for select using (public.is_org_member(organization_id));
create policy "members create review runs" on public.review_runs for insert with check (public.is_org_member(organization_id) and initiated_by=auth.uid());
create policy "members read findings" on public.findings for select using (public.is_org_member(organization_id));
create policy "members update findings" on public.findings for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members read audit events" on public.audit_events for select using (public.is_org_member(organization_id));
create policy "members insert audit events" on public.audit_events for insert with check (public.is_org_member(organization_id) and actor_id=auth.uid());

-- NOTE: Organization creation, membership invitations, privileged MFA roles, and Storage bucket policies
-- must be implemented via trusted server-side functions after MFA's identity-verification workflow is defined.
-- Never expose Supabase service_role or OpenAI API keys in the browser.
