-- ==============================================================================
-- PERSONAL JIRA (jira-clone) - COMPLETE SUPABASE SCHEMA & POLICIES
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Projects Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  description text,
  color text not null default '#6366f1',
  issue_counter integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Epics Table
create table if not exists public.epics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  color text not null default '#8b5cf6',
  created_at timestamptz not null default now()
);

-- 3. Sprints Table
create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  goal text,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed')),
  start_date text,
  end_date text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Issues Table
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  issue_key text not null,
  epic_id uuid references public.epics (id) on delete set null,
  sprint_id uuid references public.sprints (id) on delete set null,
  parent_id uuid references public.issues (id) on delete cascade,
  type text not null check (type in ('task', 'bug', 'story', 'subtask')),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  assignee text,
  reporter text not null default 'You',
  story_points numeric,
  due_date text,
  labels text[] default '{}',
  issue_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Comments Table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  author text not null default 'You',
  body text not null,
  created_at timestamptz not null default now()
);

-- 6. Activity Logs Table
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  actor text not null default 'You',
  field_changed text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

-- 7. Issue Links Table
create table if not exists public.issue_links (
  id uuid primary key default gen_random_uuid(),
  source_issue_id uuid not null references public.issues (id) on delete cascade,
  target_issue_id uuid not null references public.issues (id) on delete cascade,
  link_type text not null check (link_type in ('blocks', 'blocked_by', 'duplicates', 'relates_to')),
  created_at timestamptz not null default now()
);

-- 8. Attachments Table
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  filename text not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  mime_type text,
  uploaded_by text not null default 'You',
  created_at timestamptz not null default now()
);

-- 9. Labels Table
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1'
);

-- Indexes for fast querying
create index if not exists idx_issues_project_id on public.issues (project_id);
create index if not exists idx_issues_sprint_id on public.issues (sprint_id);
create index if not exists idx_issues_epic_id on public.issues (epic_id);
create index if not exists idx_issues_parent_id on public.issues (parent_id);
create index if not exists idx_comments_issue_id on public.comments (issue_id);
create index if not exists idx_activity_logs_issue_id on public.activity_logs (issue_id);
create index if not exists idx_attachments_issue_id on public.attachments (issue_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & PUBLIC PERMISSIONS
-- This app uses direct client-side Supabase operations (anon key).
-- We enable RLS and add full CRUD policies for public/anon access.
-- ==============================================================================

alter table public.projects enable row level security;
alter table public.epics enable row level security;
alter table public.sprints enable row level security;
alter table public.issues enable row level security;
alter table public.comments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.issue_links enable row level security;
alter table public.attachments enable row level security;
alter table public.labels enable row level security;

-- Drop existing policies if any to prevent conflicts
drop policy if exists "Allow all access to projects" on public.projects;
drop policy if exists "Allow all access to epics" on public.epics;
drop policy if exists "Allow all access to sprints" on public.sprints;
drop policy if exists "Allow all access to issues" on public.issues;
drop policy if exists "Allow all access to comments" on public.comments;
drop policy if exists "Allow all access to activity_logs" on public.activity_logs;
drop policy if exists "Allow all access to issue_links" on public.issue_links;
drop policy if exists "Allow all access to attachments" on public.attachments;
drop policy if exists "Allow all access to labels" on public.labels;

-- Create full access policies for anon/authenticated
create policy "Allow all access to projects" on public.projects for all using (true) with check (true);
create policy "Allow all access to epics" on public.epics for all using (true) with check (true);
create policy "Allow all access to sprints" on public.sprints for all using (true) with check (true);
create policy "Allow all access to issues" on public.issues for all using (true) with check (true);
create policy "Allow all access to comments" on public.comments for all using (true) with check (true);
create policy "Allow all access to activity_logs" on public.activity_logs for all using (true) with check (true);
create policy "Allow all access to issue_links" on public.issue_links for all using (true) with check (true);
create policy "Allow all access to attachments" on public.attachments for all using (true) with check (true);
create policy "Allow all access to labels" on public.labels for all using (true) with check (true);

-- ==============================================================================
-- GRANT PERMISSIONS TO ANON AND AUTHENTICATED ROLES
-- ==============================================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;

alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on routines to anon, authenticated;

-- ==============================================================================
-- STORAGE BUCKET FOR ISSUE ATTACHMENTS
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('issue-attachments', 'issue-attachments', true)
on conflict (id) do nothing;

drop policy if exists "Public Access to issue-attachments" on storage.objects;

create policy "Public Access to issue-attachments"
on storage.objects for all
using (bucket_id = 'issue-attachments')
with check (bucket_id = 'issue-attachments');



