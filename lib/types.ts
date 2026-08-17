export type IssueType = 'task' | 'bug' | 'story' | 'subtask';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type SprintStatus = 'planning' | 'active' | 'completed';
export type LinkType = 'blocks' | 'blocked_by' | 'duplicates' | 'relates_to';

export interface Project {
  id: string;
  name: string;
  key: string; // e.g. "PCH"
  description: string | null;
  color: string;
  issue_counter: number; // auto-increment for issue keys
  created_at: string;
}

export interface Epic {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done';
  color: string;
  created_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  start_date: string | null;
  end_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  issue_key: string; // e.g. "PCH-42"
  epic_id: string | null;
  sprint_id: string | null;
  parent_id: string | null;
  type: IssueType;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assignee: string | null;
  reporter: string;
  story_points: number | null;
  due_date: string | null;
  labels: string[];
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  issue_id: string;
  actor: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface IssueLink {
  id: string;
  source_issue_id: string;
  target_issue_id: string;
  link_type: LinkType;
}

export interface Attachment {
  id: string;
  issue_id: string;
  filename: string;
  url: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

// Enriched issue with related data
export interface IssueWithRelations extends Issue {
  subtasks?: Issue[];
  comments?: Comment[];
  activity?: ActivityLog[];
  links?: IssueLink[];
  attachments?: Attachment[];
  epic?: Epic | null;
  sprint?: Sprint | null;
}
