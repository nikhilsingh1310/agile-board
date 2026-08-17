'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import CreateIssueModal from '@/components/CreateIssueModal';
import { getProjectByKey, getIssues, getSprints, updateIssue } from '@/lib/store';
import type { Project, Issue, Sprint, IssueStatus } from '@/lib/types';
import { STATUS_CONFIG, STATUS_ORDER, TYPE_CONFIG, PRIORITY_CONFIG } from '@/lib/config';
import { useToast } from '@/components/ToastProvider';
import { useKeyboardShortcuts, KeyboardShortcutsModal } from '@/components/KeyboardShortcuts';

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="avatar" style={{ background: color, fontSize: 9 }} title={name}>{initials}</div>
  );
}

const AVATAR_COLORS: Record<string, string> = {};
const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
function avatarColor(name: string) {
  if (!AVATAR_COLORS[name]) {
    AVATAR_COLORS[name] = PALETTE[Object.keys(AVATAR_COLORS).length % PALETTE.length];
  }
  return AVATAR_COLORS[name];
}

interface IssueCardProps {
  issue: Issue;
  onClick: () => void;
  isDragging?: boolean;
}

function IssueCard({ issue, onClick, isDragging }: IssueCardProps) {
  const type = TYPE_CONFIG[issue.type];
  const priority = PRIORITY_CONFIG[issue.priority];

  return (
    <div
      className={`issue-card ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: type.color }}>{type.icon}</span>
        <span className="issue-key">{issue.issue_key}</span>
        {issue.due_date && new Date(issue.due_date) < new Date() && issue.status !== 'done' && (
          <span title="Overdue" style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 'auto' }}>⚠ overdue</span>
        )}
      </div>
      <div className="issue-card-title">{issue.title}</div>
      <div className="issue-card-meta">
        <span className="badge" style={{ background: priority.bg, color: priority.color, fontSize: 10 }}>
          {priority.icon} {priority.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {issue.story_points !== null && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 100, fontWeight: 600 }}>
              {issue.story_points}
            </span>
          )}
          {issue.assignee && <Avatar name={issue.assignee} color={avatarColor(issue.assignee)} />}
        </div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<{ id: string; fromStatus: IssueStatus } | null>(null);
  const [dragOver, setDragOver] = useState<IssueStatus | null>(null);

  const load = useCallback(async () => {
    const p = await getProjectByKey(key);
    if (!p) { router.replace('/'); return; }
    setProject(p);
    const [allIssues, sprints] = await Promise.all([getIssues(p.id), getSprints(p.id)]);
    const activeSprint = sprints.find(s => s.status === 'active') ?? null;
    setSprint(activeSprint);
    if (activeSprint) {
      setIssues(allIssues.filter(i => i.sprint_id === activeSprint.id && i.parent_id === null));
    } else {
      setIssues(allIssues.filter(i => !i.sprint_id && i.parent_id === null));
    }
  }, [key, router]);

  useEffect(() => { load(); window.addEventListener('jira:refresh', load); return () => window.removeEventListener('jira:refresh', load); }, [load]);

  useKeyboardShortcuts({
    onCreateIssue: () => setShowCreate(true),
    onGoBoard: () => {},
    onGoBacklog: () => router.push(`/projects/${key}/backlog`),
    onShowHelp: () => setShowHelp(true),
  });

  const handleDrop = async (toStatus: IssueStatus) => {
    if (!dragging || dragging.fromStatus === toStatus) { setDragging(null); setDragOver(null); return; }
    // Optimistic update
    setIssues(is => is.map(i => i.id === dragging.id ? { ...i, status: toStatus } : i));
    await updateIssue(dragging.id, { status: toStatus });
    showToast(
      `Moved to ${STATUS_CONFIG[toStatus].label}`,
      '↔',
      async () => {
        setIssues(is => is.map(i => i.id === dragging.id ? { ...i, status: dragging.fromStatus } : i));
        await updateIssue(dragging.id, { status: dragging.fromStatus });
      }
    );
    setDragging(null);
    setDragOver(null);
  };

  const columns = STATUS_ORDER.map(status => ({
    status,
    config: STATUS_CONFIG[status],
    items: issues.filter(i => i.status === status),
  }));

  if (!project) return null;

  return (
    <div className="app-layout">
      <Sidebar currentProjectKey={key} />
      <div className="main-content" style={{ overflow: 'hidden' }}>
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href={`/projects/${key}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
              {project.name}
            </Link>
            <span className="sep">/</span>
            <span className="topbar-title">Board</span>
            {sprint && <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 11 }}>{sprint.name}</span>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {!sprint && <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>No active sprint — showing backlog</span>}
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Issue</button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', flex: 1, overflow: 'auto' }}>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 16 }}>
            <Link href={`/projects/${key}`} className="tab">Overview</Link>
            <span className="tab active">Board</span>
            <Link href={`/projects/${key}/backlog`} className="tab">Backlog</Link>
            <Link href={`/projects/${key}/sprints`} className="tab">Sprints</Link>
          </div>

          <div className="board">
            {columns.map(col => (
              <div
                key={col.status}
                className="board-column"
                onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.status)}
                style={{
                  outline: dragOver === col.status ? `2px solid var(--accent)` : 'none',
                  transition: 'outline 0.15s',
                }}
              >
                <div className="board-column-header">
                  <span className="board-column-title" style={{ color: col.config.color }}>{col.config.label}</span>
                  <span className="board-column-count">{col.items.length}</span>
                </div>
                <div className="board-column-body">
                  {col.items.map(issue => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={() => setDragging({ id: issue.id, fromStatus: issue.status })}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    >
                      <IssueCard
                        issue={issue}
                        isDragging={dragging?.id === issue.id}
                        onClick={() => router.push(`/issues/${issue.id}`)}
                      />
                    </div>
                  ))}
                  {col.items.length === 0 && (
                    <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      Drop issues here
                    </div>
                  )}
                  {/* Add button on To Do col */}
                  {col.status === 'todo' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 4, color: 'var(--text-muted)' }}
                      onClick={() => setShowCreate(true)}
                    >
                      + Add issue
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreate && <CreateIssueModal project={project} defaultSprintId={sprint?.id} onClose={() => setShowCreate(false)} onCreated={() => { load(); window.dispatchEvent(new Event('jira:refresh')); }} />}
      {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
