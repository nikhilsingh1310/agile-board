'use server'

import { createClient } from '@/utils/supabase/server'
import type { Project, Epic, Sprint, Issue, Comment, ActivityLog, IssueLink, Label } from './types';

export type { Project, Epic, Sprint, Issue, Comment, ActivityLog, IssueLink, Label };

export interface StoredAttachment {
  id: string;
  issue_id: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  public_url?: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('*').eq('id', id).single();
  return data as Project | null;
}

export async function getProjectByKey(key: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('*').eq('key', key.toUpperCase()).single();
  return data as Project | null;
}

export async function createProject(data: Pick<Project, 'name' | 'key' | 'description' | 'color'>): Promise<Project> {
  const supabase = await createClient();
  const { data: created, error } = await supabase.from('projects').insert({
    ...data,
    key: data.key.toUpperCase(),
    issue_counter: 0,
  }).select().single();
  if (error) throw error;
  return created as Project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('projects').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ─── Epics ────────────────────────────────────────────────────────────────────

export async function getEpics(projectId: string): Promise<Epic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('epics').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data as Epic[];
}

export async function createEpic(data: Pick<Epic, 'project_id' | 'title' | 'description' | 'color'>): Promise<Epic> {
  const supabase = await createClient();
  const { data: created, error } = await supabase.from('epics').insert(data).select().single();
  if (error) throw error;
  return created as Epic;
}

// ─── Sprints ──────────────────────────────────────────────────────────────────

export async function getSprints(projectId: string): Promise<Sprint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('sprints').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data as Sprint[];
}

export async function createSprint(data: Pick<Sprint, 'project_id' | 'name' | 'goal' | 'start_date' | 'end_date'>): Promise<Sprint> {
  const supabase = await createClient();
  const { data: created, error } = await supabase.from('sprints').insert({ ...data, status: 'planning' }).select().single();
  if (error) throw error;
  return created as Sprint;
}

export async function updateSprint(id: string, data: Partial<Sprint>): Promise<void> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = { ...data };
  if (data.status === 'completed') payload.completed_at = new Date().toISOString();
  const { error } = await supabase.from('sprints').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteSprint(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('sprints').delete().eq('id', id);
  if (error) throw error;
}

// ─── Issues ───────────────────────────────────────────────────────────────────

function mapIssue(row: Record<string, unknown>): Issue {
  const { issue_order, ...rest } = row;
  return { ...rest, order: issue_order } as unknown as Issue;
}

export async function getIssues(projectId: string): Promise<Issue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('issues').select('*')
    .eq('project_id', projectId)
    .order('issue_order').order('created_at');
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(mapIssue);
}

export async function getIssue(id: string): Promise<Issue | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('issues').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapIssue(data as Record<string, unknown>);
}

export async function getSubtasks(parentId: string): Promise<Issue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('issues').select('*').eq('parent_id', parentId).order('created_at');
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(mapIssue);
}

export async function createIssue(data: {
  project_id: string;
  epic_id?: string | null;
  sprint_id?: string | null;
  parent_id?: string | null;
  type: Issue['type'];
  title: string;
  description?: string | null;
  status?: Issue['status'];
  priority: Issue['priority'];
  assignee?: string | null;
  story_points?: number | null;
  due_date?: string | null;
  labels?: string[];
}): Promise<Issue> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const proj = await getProject(data.project_id);
  if (!proj) throw new Error('Project not found');
  const counter = (proj.issue_counter ?? 0) + 1;
  await updateProject(data.project_id, { issue_counter: counter });

  const { data: created, error } = await supabase.from('issues').insert({
    ...data,
    issue_key: `${proj.key}-${counter}`,
    status: data.status ?? 'todo',
    reporter: user.id, // Set reporter to logged in user UUID
    labels: data.labels ?? [],
    issue_order: counter,
  }).select().single();
  if (error) throw error;
  return mapIssue(created as Record<string, unknown>);
}

export async function updateIssue(id: string, data: Partial<Issue>): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const current = await getIssue(id);
  if (current && user) {
    const trackFields: (keyof Issue)[] = ['status', 'priority', 'assignee', 'sprint_id', 'epic_id', 'story_points'];
    for (const field of trackFields) {
      if (field in data && data[field] !== current[field]) {
        await addActivity({
          issue_id: id,
          actor_id: user.id,
          field_changed: field,
          old_value: String(current[field] ?? 'none'),
          new_value: String(data[field] ?? 'none'),
        } as any); // using 'any' bypass temporarily since types might not have actor_id yet
      }
    }
  }
  const payload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  if ('order' in payload) { payload.issue_order = payload.order; delete payload.order; }
  const { error } = await supabase.from('issues').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteIssue(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('issues').delete().eq('id', id);
  if (error) throw error;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(issueId: string): Promise<Comment[]> {
  const supabase = await createClient();
  // With auth, comments table uses author_id. We fetch profiles too.
  const { data, error } = await supabase.from('comments').select('*, profiles(full_name, avatar_url)').eq('issue_id', issueId).order('created_at');
  if (error) throw error;
  return data as any[];
}

export async function addComment(data: Pick<Comment, 'issue_id' | 'author' | 'body'>): Promise<Comment> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: created, error } = await supabase.from('comments').insert({
    issue_id: data.issue_id,
    body: data.body,
    author_id: user.id
  }).select().single();
  if (error) throw error;
  return created as Comment;
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function getActivity(issueId: string): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity_logs').select('*, profiles(full_name, avatar_url)')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function addActivity(data: Pick<ActivityLog, 'issue_id' | 'actor' | 'field_changed' | 'old_value' | 'new_value'> & { actor_id?: string }): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_logs').insert({
    issue_id: data.issue_id,
    field_changed: data.field_changed,
    old_value: data.old_value,
    new_value: data.new_value,
    actor_id: data.actor_id || user.id
  });
}

// ─── Issue Links ──────────────────────────────────────────────────────────────

export async function getIssueLinks(issueId: string): Promise<IssueLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('issue_links').select('*')
    .or(`source_issue_id.eq.${issueId},target_issue_id.eq.${issueId}`);
  if (error) throw error;
  return data as IssueLink[];
}

export async function addIssueLink(data: Pick<IssueLink, 'source_issue_id' | 'target_issue_id' | 'link_type'>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('issue_links').insert(data);
  if (error) throw error;
}

export async function removeIssueLink(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('issue_links').delete().eq('id', id);
  if (error) throw error;
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export async function getAttachments(issueId: string): Promise<StoredAttachment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('attachments').select('*').eq('issue_id', issueId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as StoredAttachment[]).map(row => ({
    ...row,
    public_url: supabase.storage.from('issue-attachments').getPublicUrl(row.storage_path).data.publicUrl,
  }));
}

export async function uploadAttachment(issueId: string, formData: FormData): Promise<StoredAttachment> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get('file') as File;
  if (!file) throw new Error("No file provided");

  const path = `${issueId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('issue-attachments').upload(path, file);
  if (uploadError) throw uploadError;

  const { data: created, error } = await supabase.from('attachments').insert({
    issue_id: issueId,
    filename: file.name,
    storage_path: path,
    size_bytes: file.size,
    mime_type: file.type,
    uploaded_by: user.id,
  }).select().single();
  if (error) throw error;

  return {
    ...(created as StoredAttachment),
    public_url: supabase.storage.from('issue-attachments').getPublicUrl(path).data.publicUrl,
  };
}

export async function deleteAttachment(id: string, storagePath?: string): Promise<void> {
  const supabase = await createClient();
  if (storagePath) {
    await supabase.storage.from('issue-attachments').remove([storagePath]);
  }
  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) throw error;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function getLabels(projectId: string): Promise<Label[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('labels').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data as Label[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getProjectStats(projectId: string) {
  const issues = (await getIssues(projectId)).filter(i => i.parent_id === null);
  const byStatus = {
    todo: issues.filter(i => i.status === 'todo').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    in_review: issues.filter(i => i.status === 'in_review').length,
    done: issues.filter(i => i.status === 'done').length,
  };
  const total = issues.length;
  const done = byStatus.done;
  return { total, done, progress: total > 0 ? Math.round((done / total) * 100) : 0, byStatus };
}

// ─── Profiles/Members (NEW) ───────────────────────────────────────────────────

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('project_members').select('*, profiles(full_name, avatar_url)').eq('project_id', projectId);
  if (error) throw error;
  return data;
}

export async function getAllProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error) throw error;
  return data;
}

export async function toggleSuperadmin(userId: string, isSuperadmin: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ is_superadmin: isSuperadmin }).eq('id', userId);
  if (error) throw error;
}

export async function toggleUserApproval(userId: string, isApproved: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ is_approved: isApproved }).eq('id', userId);
  if (error) throw error;
}

export async function updateUserProfileAdmin(userId: string, data: { full_name?: string; city?: string; designation?: string; is_superadmin?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update(data).eq('id', userId);
  if (error) {
    if (error.message?.includes('column') || (error as any).code === '42703') {
      const { error: fallbackErr } = await supabase.from('profiles').update({
        full_name: data.full_name,
        is_superadmin: data.is_superadmin
      }).eq('id', userId);
      if (fallbackErr) throw new Error(fallbackErr.message);
      return;
    }
    throw new Error(error.message);
  }
}

export async function deleteUserAdmin(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
  if (error) {
    // Fallback: Remove from project_members and profiles directly
    await supabase.from('project_members').delete().eq('user_id', userId);
    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
    if (profileErr) throw new Error(error.message || profileErr.message);
  }
}

export async function addProjectMember(projectId: string, userId: string, role: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    role: role,
  });
  if (error) throw error;
}

export async function removeProjectMember(projectId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_members').delete().match({ project_id: projectId, user_id: userId });
  if (error) throw error;
}

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const isAdminEmail = user.email?.toLowerCase() === 'admin@jira.com';
  let { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  
  if (!data) {
    const { data: newProfile } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || (isAdminEmail ? 'Super Admin' : (user.email?.split('@')[0] || 'User')),
      is_superadmin: isAdminEmail
    }).select().maybeSingle();
    return newProfile;
  }

  // Ensure admin@jira.com always has superadmin enabled
  if (isAdminEmail && !data.is_superadmin) {
    await supabase.from('profiles').update({ is_superadmin: true }).eq('id', user.id);
    data.is_superadmin = true;
  }

  return data;
}

// ─── Seed Demo Data ───────────────────────────────────────────────────────────
// Seed data removed for brevity and security as it relies on hardcoded string authors
export async function seedDemoData(): Promise<void> {
  console.log("Seed data is disabled in secure mode to prevent data corruption.");
}
