'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import CreateIssueModal from '@/components/CreateIssueModal';
import { getProjectByKey, getIssues, getSprints, updateIssue, deleteIssue } from '@/lib/store';
import type { Project, Issue, Sprint, IssueStatus, IssuePriority } from '@/lib/types';
import { STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG } from '@/lib/config';
import { useToast } from '@/components/ToastProvider';
import { useKeyboardShortcuts, KeyboardShortcutsModal } from '@/components/KeyboardShortcuts';

export default function BacklogPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [backlog, setBacklog] = useState<Issue[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<IssueStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<IssuePriority | ''>('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const p = await getProjectByKey(key);
    if (!p) { router.replace('/'); return; }
    setProject(p);
    const [allIssues, sp] = await Promise.all([getIssues(p.id), getSprints(p.id)]);
    setBacklog(allIssues.filter(i => !i.sprint_id && i.parent_id === null));
    setSprints(sp);
  }, [key, router]);

  useEffect(() => { load(); window.addEventListener('jira:refresh', load); return () => window.removeEventListener('jira:refresh', load); }, [load]);

  useKeyboardShortcuts({
    onCreateIssue: () => setShowCreate(true),
    onGoBoard: () => router.push(`/projects/${key}/board`),
    onGoBacklog: () => {},
    onShowHelp: () => setShowHelp(true),
  });

  const filtered = backlog.filter(i => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.issue_key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };

  const handleMoveTo = async (sprintId: string | null) => {
    const ids = Array.from(selected);
    await Promise.all(ids.map(id => updateIssue(id, { sprint_id: sprintId })));
    setSelected(new Set());
    await load();
    window.dispatchEvent(new Event('jira:refresh'));
    showToast(`${ids.length} issue(s) moved to ${sprintId ? sprints.find(s=>s.id===sprintId)?.name ?? 'sprint' : 'backlog'}`, '↗');
  };

  const activeSprints = sprints.filter(s => s.status !== 'completed');

  if (!project) return null;

  return (
    <div className="app-layout">
      <Sidebar currentProjectKey={key} />
      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href={`/projects/${key}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>{project.name}</Link>
            <span className="sep">/</span>
            <span className="topbar-title">Backlog</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Issue</button>
          </div>
        </div>

        <div className="page-content">
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 16 }}>
            <Link href={`/projects/${key}`} className="tab">Overview</Link>
            <Link href={`/projects/${key}/board`} className="tab">Board</Link>
            <span className="tab active">Backlog</span>
            <Link href={`/projects/${key}/sprints`} className="tab">Sprints</Link>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="🔍 Search issues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input select" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as IssueStatus | '')}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="input select" style={{ width: 150 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value as IssuePriority | '')}>
              <option value="">All priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            {(filterStatus || filterPriority || search) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterPriority(''); setSearch(''); }}>Clear</button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} issues</span>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-hover)' }}>{selected.size} selected</span>
              <div style={{ marginLeft: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activeSprints.map(s => (
                  <button key={s.id} className="btn btn-secondary btn-sm" onClick={() => handleMoveTo(s.id)}>
                    → {s.name}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelected(new Set())}>Deselect</button>
            </div>
          )}

          {/* Issue list */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">Backlog is empty</div>
              <div className="empty-state-desc">Issues not assigned to any sprint appear here.</div>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create issue</button>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '36px 36px 1fr 110px 90px 90px 100px', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                <div onClick={selectAll} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" readOnly checked={selected.size === filtered.length && filtered.length > 0} style={{ cursor: 'pointer' }} />
                </div>
                <div>Type</div>
                <div>Title</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Assignee</div>
                <div>Points</div>
              </div>

              {filtered.map((issue, idx) => {
                const type = TYPE_CONFIG[issue.type];
                const priority = PRIORITY_CONFIG[issue.priority];
                const status = STATUS_CONFIG[issue.status];
                const isSelected = selected.has(issue.id);
                return (
                  <div
                    key={issue.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 36px 1fr 110px 90px 90px 100px',
                      gap: 8,
                      padding: '10px 12px',
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      transition: 'background 0.1s',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div onClick={() => toggleSelect(issue.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" readOnly checked={isSelected} style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ fontSize: 14, color: type.color }}>{type.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => router.push(`/issues/${issue.id}`)}
                      >
                        {issue.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className="issue-key">{issue.issue_key}</span>
                        {issue.due_date && new Date(issue.due_date) < new Date() && issue.status !== 'done' && (
                          <span style={{ fontSize: 10, color: 'var(--danger)' }}>⚠ overdue</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="badge" style={{ background: 'var(--bg-tertiary)', color: status.color, fontSize: 11 }}>{status.label}</span>
                    </div>
                    <div>
                      <span className="badge" style={{ background: priority.bg, color: priority.color, fontSize: 11 }}>{priority.icon} {priority.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {issue.assignee_profile?.full_name || issue.assignee || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                      {issue.story_points !== null ? issue.story_points : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateIssueModal project={project} onClose={() => setShowCreate(false)} onCreated={() => { load(); window.dispatchEvent(new Event('jira:refresh')); }} />}
      {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
