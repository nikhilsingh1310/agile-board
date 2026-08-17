'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Issue, Project, Epic, Sprint } from '@/lib/types';
import type { IssueType, IssuePriority } from '@/lib/types';
import { getEpics, getSprints, createIssue } from '@/lib/store';
import { TYPE_CONFIG, PRIORITY_CONFIG } from '@/lib/config';
import { useToast } from '@/components/ToastProvider';

interface CreateIssueModalProps {
  project: Project;
  defaultSprintId?: string | null;
  onClose: () => void;
  onCreated: (issue: Issue) => void;
}

export default function CreateIssueModal({ project, defaultSprintId, onClose, onCreated }: CreateIssueModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [epicId, setEpicId] = useState('');
  const [sprintId, setSprintId] = useState(defaultSprintId ?? '');
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [eps, sps] = await Promise.all([getEpics(project.id), getSprints(project.id)]);
      setEpics(eps);
      setSprints(sps.filter(s => s.status !== 'completed'));
    })();
  }, [project.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required');
    try {
      const issue = await createIssue({
        project_id: project.id,
        type,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        assignee: assignee.trim() || null,
        epic_id: epicId || null,
        sprint_id: sprintId || null,
        story_points: storyPoints ? parseInt(storyPoints) : null,
        due_date: dueDate || null,
      });
      showToast(`${issue.issue_key} created`, TYPE_CONFIG[type].icon);
      onCreated(issue);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create issue</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Type + Priority row */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="label">Type</label>
                <select className="input select" value={type} onChange={e => setType(e.target.value as IssueType)}>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Priority</label>
                <select className="input select" value={priority} onChange={e => setPriority(e.target.value as IssuePriority)}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="label">Title *</label>
              <input
                className="input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Issue title..."
                autoFocus
              />
              {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{error}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea
                className="input textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add details, steps to reproduce, acceptance criteria..."
                style={{ minHeight: 80 }}
              />
            </div>

            {/* Row 2 */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="label">Assignee</label>
                <input className="input" value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Name..." />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Story points</label>
                <input className="input" type="number" min={0} max={99} value={storyPoints} onChange={e => setStoryPoints(e.target.value)} placeholder="e.g. 3" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Due date</label>
                <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            {/* Epic + Sprint */}
            <div style={{ display: 'flex', gap: 12 }}>
              {epics.length > 0 && (
                <div style={{ flex: 1 }}>
                  <label className="label">Epic</label>
                  <select className="input select" value={epicId} onChange={e => setEpicId(e.target.value)}>
                    <option value="">None</option>
                    {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                  </select>
                </div>
              )}
              {sprints.length > 0 && (
                <div style={{ flex: 1 }}>
                  <label className="label">Sprint</label>
                  <select className="input select" value={sprintId} onChange={e => setSprintId(e.target.value)}>
                    <option value="">Backlog</option>
                    {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create issue</button>
          </div>
        </form>
      </div>
    </div>
  );
}
