import { supabase } from './supabase';
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
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data } = await supabase.from('projects').select('*').eq('id', id).single();
  return data as Project | null;
}

export async function getProjectByKey(key: string): Promise<Project | null> {
  const { data } = await supabase.from('projects').select('*').eq('key', key.toUpperCase()).single();
  return data as Project | null;
}

export async function createProject(data: Pick<Project, 'name' | 'key' | 'description' | 'color'>): Promise<Project> {
  const { data: created, error } = await supabase.from('projects').insert({
    ...data,
    key: data.key.toUpperCase(),
    issue_counter: 0,
  }).select().single();
  if (error) throw error;
  return created as Project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const { error } = await supabase.from('projects').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ─── Epics ────────────────────────────────────────────────────────────────────

export async function getEpics(projectId: string): Promise<Epic[]> {
  const { data, error } = await supabase.from('epics').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data as Epic[];
}

export async function createEpic(data: Pick<Epic, 'project_id' | 'title' | 'description' | 'color'>): Promise<Epic> {
  const { data: created, error } = await supabase.from('epics').insert(data).select().single();
  if (error) throw error;
  return created as Epic;
}

// ─── Sprints ──────────────────────────────────────────────────────────────────

export async function getSprints(projectId: string): Promise<Sprint[]> {
  const { data, error } = await supabase.from('sprints').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data as Sprint[];
}

export async function createSprint(data: Pick<Sprint, 'project_id' | 'name' | 'goal' | 'start_date' | 'end_date'>): Promise<Sprint> {
  const { data: created, error } = await supabase.from('sprints').insert({ ...data, status: 'planning' }).select().single();
  if (error) throw error;
  return created as Sprint;
}

export async function updateSprint(id: string, data: Partial<Sprint>): Promise<void> {
  const payload: Record<string, unknown> = { ...data };
  if (data.status === 'completed') payload.completed_at = new Date().toISOString();
  const { error } = await supabase.from('sprints').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteSprint(id: string): Promise<void> {
  const { error } = await supabase.from('sprints').delete().eq('id', id);
  if (error) throw error;
}

// ─── Issues ───────────────────────────────────────────────────────────────────

function mapIssue(row: Record<string, unknown>): Issue {
  const { issue_order, ...rest } = row;
  return { ...rest, order: issue_order } as unknown as Issue;
}

export async function getIssues(projectId: string): Promise<Issue[]> {
  const { data, error } = await supabase
    .from('issues').select('*')
    .eq('project_id', projectId)
    .order('issue_order').order('created_at');
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(mapIssue);
}

export async function getIssue(id: string): Promise<Issue | null> {
  const { data } = await supabase.from('issues').select('*').eq('id', id).single();
  if (!data) return null;
  return mapIssue(data as Record<string, unknown>);
}

export async function getSubtasks(parentId: string): Promise<Issue[]> {
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
  const proj = await getProject(data.project_id);
  if (!proj) throw new Error('Project not found');
  const counter = (proj.issue_counter ?? 0) + 1;
  await updateProject(data.project_id, { issue_counter: counter });

  const { data: created, error } = await supabase.from('issues').insert({
    ...data,
    issue_key: `${proj.key}-${counter}`,
    status: data.status ?? 'todo',
    reporter: 'You',
    labels: data.labels ?? [],
    issue_order: counter,
  }).select().single();
  if (error) throw error;
  return mapIssue(created as Record<string, unknown>);
}

export async function updateIssue(id: string, data: Partial<Issue>): Promise<void> {
  const current = await getIssue(id);
  if (current) {
    const trackFields: (keyof Issue)[] = ['status', 'priority', 'assignee', 'sprint_id', 'epic_id', 'story_points'];
    for (const field of trackFields) {
      if (field in data && data[field] !== current[field]) {
        await addActivity({
          issue_id: id,
          actor: 'You',
          field_changed: field,
          old_value: String(current[field] ?? 'none'),
          new_value: String(data[field] ?? 'none'),
        });
      }
    }
  }
  const payload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  if ('order' in payload) { payload.issue_order = payload.order; delete payload.order; }
  const { error } = await supabase.from('issues').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteIssue(id: string): Promise<void> {
  const { error } = await supabase.from('issues').delete().eq('id', id);
  if (error) throw error;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(issueId: string): Promise<Comment[]> {
  const { data, error } = await supabase.from('comments').select('*').eq('issue_id', issueId).order('created_at');
  if (error) throw error;
  return data as Comment[];
}

export async function addComment(data: Pick<Comment, 'issue_id' | 'author' | 'body'>): Promise<Comment> {
  const { data: created, error } = await supabase.from('comments').insert(data).select().single();
  if (error) throw error;
  return created as Comment;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function getActivity(issueId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs').select('*')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ActivityLog[];
}

export async function addActivity(data: Pick<ActivityLog, 'issue_id' | 'actor' | 'field_changed' | 'old_value' | 'new_value'>): Promise<void> {
  await supabase.from('activity_logs').insert(data);
}

// ─── Issue Links ──────────────────────────────────────────────────────────────

export async function getIssueLinks(issueId: string): Promise<IssueLink[]> {
  const { data, error } = await supabase
    .from('issue_links').select('*')
    .or(`source_issue_id.eq.${issueId},target_issue_id.eq.${issueId}`);
  if (error) throw error;
  return data as IssueLink[];
}

export async function addIssueLink(data: Pick<IssueLink, 'source_issue_id' | 'target_issue_id' | 'link_type'>): Promise<void> {
  const { error } = await supabase.from('issue_links').insert(data);
  if (error) throw error;
}

export async function removeIssueLink(id: string): Promise<void> {
  const { error } = await supabase.from('issue_links').delete().eq('id', id);
  if (error) throw error;
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export async function getAttachments(issueId: string): Promise<StoredAttachment[]> {
  const { data, error } = await supabase.from('attachments').select('*').eq('issue_id', issueId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as StoredAttachment[]).map(row => ({
    ...row,
    public_url: supabase.storage.from('issue-attachments').getPublicUrl(row.storage_path).data.publicUrl,
  }));
}

export async function uploadAttachment(issueId: string, file: File): Promise<StoredAttachment> {
  const path = `${issueId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('issue-attachments').upload(path, file);
  if (uploadError) throw uploadError;

  const { data: created, error } = await supabase.from('attachments').insert({
    issue_id: issueId,
    filename: file.name,
    storage_path: path,
    size_bytes: file.size,
    mime_type: file.type,
    uploaded_by: 'You',
  }).select().single();
  if (error) throw error;

  return {
    ...(created as StoredAttachment),
    public_url: supabase.storage.from('issue-attachments').getPublicUrl(path).data.publicUrl,
  };
}

export async function deleteAttachment(id: string, storagePath?: string): Promise<void> {
  if (storagePath) {
    await supabase.storage.from('issue-attachments').remove([storagePath]);
  }
  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) throw error;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function getLabels(projectId: string): Promise<Label[]> {
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

// ─── Seed Demo Data ───────────────────────────────────────────────────────────

export async function seedDemoData(): Promise<void> {
  const existing = await getProjects();
  const pchExists = existing.some(p => p.key === 'PCH');
  const ipExists  = existing.some(p => p.key === 'IP');
  if (pchExists && ipExists) return;

  const p  = pchExists ? existing.find(p => p.key === 'PCH')!
    : await createProject({ name: 'Payroll Certification Hub', key: 'PCH', description: 'UAT tracking for the PCH payroll app at UCSD', color: '#6366f1' });
  const p2 = ipExists  ? existing.find(p => p.key === 'IP')!
    : await createProject({ name: 'Internal Portal', key: 'IP', description: 'Employee self-service portal redesign', color: '#10b981' });

  const e1 = await createEpic({ project_id: p.id, title: 'Reviewer Workflow', description: 'All reviewer-facing screens', color: '#8b5cf6' });
  const e2 = await createEpic({ project_id: p.id, title: 'Approver Workflow', description: 'Approver portfolio and drill-down', color: '#f59e0b' });
  const s1 = await createSprint({ project_id: p.id, name: 'Sprint 1', goal: 'Complete reviewer dashboard UAT', start_date: '2026-08-01', end_date: '2026-08-14' });
  await updateSprint(s1.id, { status: 'active' });

  const issuesData = [
    { project_id: p.id, epic_id: e1.id, sprint_id: s1.id, type: 'story' as const, title: 'Reviewer Dashboard loads within 2s', priority: 'high' as const, assignee: 'Anita S.', story_points: 3 },
    { project_id: p.id, epic_id: e1.id, sprint_id: s1.id, type: 'bug' as const, title: 'Approval button missing on Safari', priority: 'critical' as const, assignee: 'Rohan M.', story_points: 2 },
    { project_id: p.id, epic_id: e1.id, sprint_id: s1.id, type: 'task' as const, title: 'Write test cases for rejection flow', priority: 'medium' as const, assignee: 'Priya K.', story_points: 2 },
    { project_id: p.id, epic_id: e2.id, sprint_id: s1.id, type: 'story' as const, title: 'Approver can see rollup donut chart', priority: 'high' as const, assignee: 'Rohan M.', story_points: 5 },
    { project_id: p.id, type: 'bug' as const, title: 'Date filter resets on page refresh', priority: 'medium' as const, story_points: 1 },
    { project_id: p2.id, type: 'story' as const, title: 'Redesign employee home screen', priority: 'high' as const, assignee: 'You', story_points: 8 },
    { project_id: p2.id, type: 'bug' as const, title: 'SSO login fails for contractors', priority: 'critical' as const, assignee: 'You', story_points: 3 },
  ];

  const created = await Promise.all(issuesData.map(d => createIssue(d)));
  await updateIssue(created[0].id, { status: 'done' });
  await updateIssue(created[1].id, { status: 'in_progress' });
  await updateIssue(created[2].id, { status: 'in_review' });
  await updateIssue(created[3].id, { status: 'in_progress' });
  await addComment({ issue_id: created[1].id, author: 'Rohan M.', body: 'Reproduced on Safari 17. The button is rendered but z-index is wrong.' });
  await addComment({ issue_id: created[0].id, author: 'Priya K.', body: 'Passed ✅ Tested on Chrome, Firefox, and Edge.' });
  await addIssueLink({ source_issue_id: created[1].id, target_issue_id: created[3].id, link_type: 'blocks' });
}
