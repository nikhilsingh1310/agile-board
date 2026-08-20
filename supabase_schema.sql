-- ==============================================================================
-- SECURE JIRA CLONE - COMPLETE SUPABASE SCHEMA & POLICIES (WITH RBAC & SUPERADMIN)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 0. Profiles & Auth Setup
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  city text default 'Mumbai',
  designation text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, city, designation)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'city', 'Mumbai'),
    new.raw_user_meta_data->>'designation'
  )
  on conflict (id) do update set
    city = excluded.city,
    designation = excluded.designation;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

-- 1.5 Project Members (Junction Table for Roles)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'developer', 'qa', 'ba')),
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

-- Trigger to auto-add project creator as 'admin'
create or replace function public.handle_new_project()
returns trigger as $$
begin
  if auth.uid() is not null then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, auth.uid(), 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.handle_new_project();


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
  assignee uuid references public.profiles (id) on delete set null,
  reporter uuid not null references public.profiles (id) on delete restrict,
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
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 6. Activity Logs Table
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
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
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
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
create index if not exists idx_project_members_project_id on public.project_members (project_id);
create index if not exists idx_project_members_user_id on public.project_members (user_id);

-- ==============================================================================
-- SECURITY DEFINER HELPERS (PREVENTS INFINITE RECURSION IN RLS)
-- ==============================================================================

create or replace function public.is_superadmin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_superadmin = true
  );
$$ language sql security definer stable;

create or replace function public.is_project_member(p_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members where project_id = p_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function public.is_project_admin(p_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members where project_id = p_id and user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & AUTHENTICATED PERMISSIONS
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.epics enable row level security;
alter table public.sprints enable row level security;
alter table public.issues enable row level security;
alter table public.comments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.issue_links enable row level security;
alter table public.attachments enable row level security;
alter table public.labels enable row level security;

-- Drop all old policies to avoid recursion
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update own profile or superadmins can update" on public.profiles;
drop policy if exists "Allow all access to profiles" on public.profiles;

drop policy if exists "Users can view members of their projects" on public.project_members;
drop policy if exists "Project members and superadmins can view members" on public.project_members;
drop policy if exists "Admins can insert members" on public.project_members;
drop policy if exists "Admins and superadmins can insert members" on public.project_members;
drop policy if exists "Admins can update members" on public.project_members;
drop policy if exists "Admins and superadmins can update members" on public.project_members;
drop policy if exists "Admins can delete members" on public.project_members;
drop policy if exists "Admins and superadmins can delete members" on public.project_members;

drop policy if exists "Users can view their projects" on public.projects;
drop policy if exists "Project members and superadmins can view projects" on public.projects;
drop policy if exists "Authenticated users can create projects" on public.projects;
drop policy if exists "Admins can update projects" on public.projects;
drop policy if exists "Admins and superadmins can update projects" on public.projects;
drop policy if exists "Admins can delete projects" on public.projects;
drop policy if exists "Admins and superadmins can delete projects" on public.projects;

drop policy if exists "Project members can manage epics" on public.epics;
drop policy if exists "Project members and superadmins can manage epics" on public.epics;
drop policy if exists "Project members can manage sprints" on public.sprints;
drop policy if exists "Project members and superadmins can manage sprints" on public.sprints;
drop policy if exists "Project members can manage issues" on public.issues;
drop policy if exists "Project members and superadmins can manage issues" on public.issues;
drop policy if exists "Project members can manage labels" on public.labels;
drop policy if exists "Project members and superadmins can manage labels" on public.labels;
drop policy if exists "Project members can manage comments" on public.comments;
drop policy if exists "Project members and superadmins can manage comments" on public.comments;
drop policy if exists "Project members can manage activity" on public.activity_logs;
drop policy if exists "Project members and superadmins can manage activity" on public.activity_logs;
drop policy if exists "Project members can manage issue links" on public.issue_links;
drop policy if exists "Project members and superadmins can manage issue links" on public.issue_links;
drop policy if exists "Project members can manage attachments" on public.attachments;
drop policy if exists "Project members and superadmins can manage attachments" on public.attachments;

-- 1. PROFILES POLICIES
create policy "Profiles viewable by authenticated" on public.profiles for select using (true);
create policy "Profiles insertable by authenticated" on public.profiles for insert with check (auth.uid() = id or public.is_superadmin());
create policy "Profiles updatable by owner or superadmin" on public.profiles for update using (auth.uid() = id or public.is_superadmin());
create policy "Profiles deletable by superadmin" on public.profiles for delete using (public.is_superadmin());

-- 2. PROJECT MEMBERS POLICIES (Non-recursive via security definer helpers)
create policy "Members select policy" on public.project_members for select using (
  user_id = auth.uid() or public.is_project_member(project_id) or public.is_superadmin()
);
create policy "Members insert policy" on public.project_members for insert with check (
  public.is_project_admin(project_id) or public.is_superadmin() or user_id = auth.uid()
);
create policy "Members update policy" on public.project_members for update using (
  public.is_project_admin(project_id) or public.is_superadmin()
);
create policy "Members delete policy" on public.project_members for delete using (
  public.is_project_admin(project_id) or public.is_superadmin()
);

-- 3. PROJECTS POLICIES
create policy "Projects select policy" on public.projects for select using (
  public.is_project_member(id) or public.is_superadmin()
);
create policy "Projects insert policy" on public.projects for insert with check (
  auth.role() = 'authenticated'
);
create policy "Projects update policy" on public.projects for update using (
  public.is_project_admin(id) or public.is_superadmin()
);
create policy "Projects delete policy" on public.projects for delete using (
  public.is_project_admin(id) or public.is_superadmin()
);

-- 4. EPICS, SPRINTS, ISSUES, LABELS
create policy "Epics policy" on public.epics for all using (
  public.is_project_member(project_id) or public.is_superadmin()
);

create policy "Sprints policy" on public.sprints for all using (
  public.is_project_member(project_id) or public.is_superadmin()
);

create policy "Issues policy" on public.issues for all using (
  public.is_project_member(project_id) or public.is_superadmin()
);

create policy "Labels policy" on public.labels for all using (
  public.is_project_member(project_id) or public.is_superadmin()
);

-- 5. NESTED RELATIONS (Comments, Activity, Links, Attachments)
create policy "Comments policy" on public.comments for all using (
  auth.role() = 'authenticated'
);

create policy "Activity policy" on public.activity_logs for all using (
  auth.role() = 'authenticated'
);

create policy "Issue links policy" on public.issue_links for all using (
  auth.role() = 'authenticated'
);

create policy "Attachments policy" on public.attachments for all using (
  auth.role() = 'authenticated'
);

-- Sync any existing auth users to profiles as superadmin
insert into public.profiles (id, full_name, is_superadmin)
select id, coalesce(raw_user_meta_data->>'full_name', email), true
from auth.users
on conflict (id) do update set is_superadmin = true;
