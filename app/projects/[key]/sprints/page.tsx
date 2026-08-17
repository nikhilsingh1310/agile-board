'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getProjectByKey, getSprints, createSprint, updateSprint, getIssues, updateIssue } from '@/lib/store';
import type { Project, Sprint, Issue } from '@/lib/types';
import { SPRINT_STATUS_CONFIG, STATUS_CONFIG } from '@/lib/config';
import { useToast } from '@/components/ToastProvider';

function CompleteSprintModal({ sprint, sprintIssues, nextSprints, onComplete, onClose }: {
  sprint: Sprint; sprintIssues: Issue[]; nextSprints: Sprint[];
  onComplete: (action: string) => void; onClose: () => void;
}) {
  const unfinished = sprintIssues.filter(i => i.status !== 'done');
  const done = sprintIssues.filter(i => i.status === 'done');
  const [action, setAction] = useState('backlog');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Complete sprint: {sprint.name}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
              <div className="stat-value" style={{ color: '#16a34a' }}>{done.length}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{unfinished.length}</div>
              <div className="stat-label">Remaining</div>
            </div>
          </div>

          {unfinished.length > 0 && (
            <div>
              <label className="label">Move {unfinished.length} unfinished issue(s) to</label>
              <select className="input select" value={action} onChange={e => setAction(e.target.value)}>
                <option value="backlog">Backlog</option>
                {nextSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            This will mark the sprint as completed. {unfinished.length > 0 ? `${unfinished.length} unfinished issue(s) will be moved.` : 'All issues are done! 🎉'}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onComplete(action)}>Complete sprint</button>
        </div>
      </div>
    </div>
  );
}

export default function SprintsPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Sprint | null>(null);
  const [completeIssues, setCompleteIssues] = useState<Issue[]>([]);
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const load = useCallback(async () => {
    const p = await getProjectByKey(key);
    if (!p) { router.replace('/'); return; }
    setProject(p);
    setSprints(await getSprints(p.id));
  }, [key, router]);

  useEffect(() => { load(); window.addEventListener('jira:refresh', load); return () => window.removeEventListener('jira:refresh', load); }, [load]);

  const handleCreate = async () => {
    if (!project || !newName.trim()) return;
    const sprint = await createSprint({ project_id: project.id, name: newName.trim(), goal: newGoal.trim() || null, start_date: newStart || null, end_date: newEnd || null });
    setShowCreate(false);
    setNewName(''); setNewGoal(''); setNewStart(''); setNewEnd('');
    await load();
    showToast(`Sprint "${sprint.name}" created`, '🏃');
  };

  const handleStart = async (s: Sprint) => {
    const active = sprints.find(x => x.status === 'active');
    if (active) return showToast(`"${active.name}" is already active — complete it first`, '⚠️');
    await updateSprint(s.id, { status: 'active' });
    await load();
    showToast(`Sprint "${s.name}" started!`, '🚀');
  };

  const handleComplete = async (action: string) => {
    if (!completeTarget) return;
    // Move unfinished issues
    const unfinished = completeIssues.filter(i => i.status !== 'done');
    const targetSprintId = action === 'backlog' ? null : action;
    await Promise.all(unfinished.map(i => updateIssue(i.id, { sprint_id: targetSprintId })));
    await updateSprint(completeTarget.id, { status: 'completed' });
    const name = completeTarget.name;
    setCompleteTarget(null);
    setCompleteIssues([]);
    await load();
    window.dispatchEvent(new Event('jira:refresh'));
    showToast(`Sprint "${name}" completed!`, '🏁');
  };

  const openCompleteModal = async (s: Sprint) => {
    const issues = await getIssues(project!.id);
    setCompleteIssues(issues.filter(i => i.sprint_id === s.id));
    setCompleteTarget(s);
  };

  if (!project) return null;
  const nonCompleted = sprints.filter(s => s.status !== 'completed');
  const completed = sprints.filter(s => s.status === 'completed');

  return (
    <div className="app-layout">
      <Sidebar currentProjectKey={key} />
      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href={`/projects/${key}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>{project.name}</Link>
            <span className="sep">/</span>
            <span className="topbar-title">Sprints</span>
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowCreate(true)}>+ New sprint</button>
        </div>

        <div className="page-content">
          <div className="tabs" style={{ marginBottom: 20 }}>
            <Link href={`/projects/${key}`} className="tab">Overview</Link>
            <Link href={`/projects/${key}/board`} className="tab">Board</Link>
            <Link href={`/projects/${key}/backlog`} className="tab">Backlog</Link>
            <span className="tab active">Sprints</span>
          </div>

          {sprints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏃</div>
              <div className="empty-state-title">No sprints yet</div>
              <div className="empty-state-desc">Create a sprint to organize your issues into time-boxed iterations.</div>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create sprint</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...nonCompleted, ...completed].map(s => {
                const cfg = SPRINT_STATUS_CONFIG[s.status];

                return (
                  <div key={s.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                          <span className="badge" style={{ background: 'var(--bg-tertiary)', color: cfg.color, fontSize: 11 }}>
                            {cfg.label}
                          </span>
                        </div>
                        {s.goal && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{s.goal}</div>}
                        {(s.start_date || s.end_date) && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                            {s.start_date} {s.start_date && s.end_date && '→'} {s.end_date}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `0%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
                        {s.status === 'planning' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleStart(s)}>▶ Start</button>
                        )}
                        {s.status === 'active' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openCompleteModal(s)}>🏁 Complete</button>
                        )}
                        {s.status !== 'completed' && (
                          <Link href={`/projects/${key}/board`} className="btn btn-ghost btn-sm" style={{ textAlign: 'center' }}>
                            View board
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create sprint modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New sprint</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Sprint name *</label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Sprint 1" autoFocus />
              </div>
              <div>
                <label className="label">Goal</label>
                <input className="input" value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="What do you want to achieve?" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Start date</label>
                  <input className="input" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">End date</label>
                  <input className="input" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>Create sprint</button>
            </div>
          </div>
        </div>
      )}

      {completeTarget && (
        <CompleteSprintModal
          sprint={completeTarget}
          sprintIssues={completeIssues}
          nextSprints={sprints.filter(s => s.id !== completeTarget.id && s.status !== 'completed')}
          onComplete={handleComplete}
          onClose={() => { setCompleteTarget(null); setCompleteIssues([]); }}
        />
      )}
    </div>
  );
}
