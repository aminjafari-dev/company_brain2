-- CompanyBrain Workspace — Supabase schema (free tier)
-- Run in Supabase SQL editor after creating a free project.

create extension if not exists "pgcrypto";

create table if not exists workspaces (
  id text primary key,
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  role text not null check (role in ('client','pm','developer','admin')),
  avatar_url text,
  workspace_id text not null references workspaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  repo text,
  status text,
  progress int default 0,
  lead text,
  requests_count int default 0,
  stack jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists requests (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete set null,
  title text not null,
  subtitle text,
  status text not null,
  confidence numeric,
  objective text,
  business_goal text,
  product_context jsonb,
  business_requirements text,
  acceptance_criteria jsonb,
  technical_impact_summary text,
  ai_recommendation jsonb,
  matched_files jsonb,
  dev_plan jsonb,
  pm_decision text,
  jira_key text,
  completeness jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  project_id text,
  title text,
  status text default 'active',
  related_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender text not null check (sender in ('user','ai')),
  text text not null,
  timestamp text,
  analysis_card jsonb,
  created_at timestamptz not null default now()
);

create table if not exists activity_events (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  actor text not null,
  action text not null,
  target text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists integrations (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text not null,
  last_sync text,
  icon text
);

create table if not exists jira_issues_mock (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  key text not null,
  summary text not null,
  status text,
  assignee text,
  type text,
  linked_req text
);

create table if not exists code_modules_mock (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  path text not null,
  language text,
  lines int,
  module text,
  last_analyzed text,
  content_snippet text
);

create table if not exists development_tasks (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  title text not null,
  project text,
  developer text,
  priority text,
  status text,
  ai_generated boolean default false,
  request_id text
);

create table if not exists workspace_settings (
  workspace_id text primary key references workspaces(id) on delete cascade,
  ai_autonomy text not null default 'Require Approval',
  gemini_model text not null default 'gemini-2.0-flash',
  sync_interval_minutes int not null default 15
);

-- RLS
alter table workspaces enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table requests enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table activity_events enable row level security;
alter table integrations enable row level security;
alter table jira_issues_mock enable row level security;
alter table code_modules_mock enable row level security;
alter table development_tasks enable row level security;
alter table workspace_settings enable row level security;

create or replace function public.current_workspace_id()
returns text
language sql
stable
as $$
  select workspace_id from public.profiles where id = auth.uid()
$$;

create policy "members read workspace" on workspaces
  for select using (id = public.current_workspace_id());

create policy "members read profiles" on profiles
  for select using (workspace_id = public.current_workspace_id());

create policy "members rw requests" on requests
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw projects" on projects
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw conversations" on conversations
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw messages" on messages
  for all using (
    conversation_id in (
      select id from conversations where workspace_id = public.current_workspace_id()
    )
  )
  with check (
    conversation_id in (
      select id from conversations where workspace_id = public.current_workspace_id()
    )
  );

create policy "members rw activity" on activity_events
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw integrations" on integrations
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw jira" on jira_issues_mock
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw code" on code_modules_mock
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw tasks" on development_tasks
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

create policy "members rw settings" on workspace_settings
  for all using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());
