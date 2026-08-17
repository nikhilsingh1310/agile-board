import type { IssuePriority, IssueStatus, IssueType, SprintStatus } from './types';

export const PRIORITY_CONFIG: Record<IssuePriority, { label: string; color: string; bg: string; icon: string }> = {
  low:      { label: 'Low',      color: '#64748b',  bg: '#f1f5f9',  icon: '↓' },
  medium:   { label: 'Medium',   color: '#0284c7',  bg: '#e0f2fe',  icon: '→' },
  high:     { label: 'High',     color: '#d97706',  bg: '#fef3c7',  icon: '↑' },
  critical: { label: 'Critical', color: '#dc2626',  bg: '#fee2e2',  icon: '⚡' },
};

export const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; bg: string; border: string }> = {
  todo:        { label: 'To Do',       color: '#64748b',  bg: '#f1f5f9',  border: '#cbd5e1' },
  in_progress: { label: 'In Progress', color: '#4f46e5',  bg: '#ede9fe',  border: '#a5b4fc' },
  in_review:   { label: 'In Review',   color: '#7c3aed',  bg: '#f3e8ff',  border: '#c4b5fd' },
  done:        { label: 'Done',        color: '#16a34a',  bg: '#dcfce7',  border: '#86efac' },
};

export const TYPE_CONFIG: Record<IssueType, { label: string; color: string; icon: string }> = {
  task:    { label: 'Task',    color: '#0284c7', icon: '☑' },
  bug:     { label: 'Bug',     color: '#dc2626', icon: '🐛' },
  story:   { label: 'Story',   color: '#16a34a', icon: '📖' },
  subtask: { label: 'Subtask', color: '#64748b', icon: '⤷' },
};

export const SPRINT_STATUS_CONFIG: Record<SprintStatus, { label: string; color: string }> = {
  planning:  { label: 'Planning',  color: '#64748b' },
  active:    { label: 'Active',    color: '#16a34a' },
  completed: { label: 'Completed', color: '#7c3aed' },
};

export const STATUS_BAR_COLORS: Record<IssueStatus, string> = {
  not_started: '#cbd5e1',
  in_progress: '#4f46e5',
  in_review:   '#7c3aed',
  done:        '#16a34a',
  blocked:     '#dc2626',
  passed:      '#16a34a',
  failed:      '#ea580c',
  needs_retest:'#7c3aed',
} as unknown as Record<IssueStatus, string>;

export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#84cc16',
];

export const STATUS_ORDER: IssueStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
