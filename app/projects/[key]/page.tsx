'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import CreateIssueModal from '@/components/CreateIssueModal';
import { getProjectByKey, getProjectStats, getEpics, getSprints } from '@/lib/store';
import type { Project, Sprint, Epic } from '@/lib/types';
import { useKeyboardShortcuts, KeyboardShortcutsModal } from '@/components/KeyboardShortcuts';

type Stats = Awaited<ReturnType<typeof getProjectStats>>;

export default function ProjectDashboard() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const load = useCallback(async () => {
    const p = await getProjectByKey(key);
    if (!p) { router.replace('/'); return; }
    setProject(p);
    const [s, eps, sprints] = await Promise.all([
      getProjectStats(p.id),
      getEpics(p.id),
      getSprints(p.id),
    ]);
    setStats(s);
    setEpics(eps);
    setActiveSprint(sprints.find(sp => sp.status === 'active') ?? null);
  }, [key, router]);

  useEffect(() => { load(); window.addEventListener('jira:refresh', load); return () => window.removeEventListener('jira:refresh', load); }, [load]);

  useKeyboardShortcuts({
    onCreateIssue: () => setShowCreate(true),
    onGoBoard: () => router.push(`/projects/${key}/board`),
    onGoBacklog: () => router.push(`/projects/${key}/backlog`),
    onShowHelp: () => setShowHelp(true),
  });

  if (!project || !stats) return null;

  const pct = stats.progress;
  const statCards = [
    { label: 'Total Issues', value: stats.total, color: 'var(--text-primary)' },
    { label: 'In Progress', value: stats.byStatus.in_progress, color: '#4f46e5' },
    { label: 'In Review', value: stats.byStatus.in_review, color: '#7c3aed' },
    { label: 'Done', value: stats.byStatus.done, color: '#16a34a' },
  ];

  return (
    <div className="app-layout">
      <Sidebar currentProjectKey={key} />
      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: project.color }} />
            <span className="topbar-title">{project.name}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{project.key}</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create issue</button>
          </div>
        </div>

        <div className="page-content">
          <div className="tabs" style={{ marginBottom: 24 }}>
            <span className="tab active">Overview</span>
            <Link href={`/projects/${key}/board`} className="tab">Board</Link>
            <Link href={`/projects/${key}/backlog`} className="tab">Backlog</Link>
            <Link href={`/projects/${key}/sprints`} className="tab">Sprints</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {statCards.map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Overall progress</h3>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{pct}%</span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: project.color }} />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {Object.entries(stats.byStatus).map(([s, n]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background:
                    s === 'done' ? '#16a34a' : s === 'in_progress' ? '#4f46e5' : s === 'in_review' ? '#7c3aed' : '#cbd5e1'
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n} {s.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Active sprint</h3>
              {activeSprint ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeSprint.name}</div>
                  {activeSprint.goal && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{activeSprint.goal}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/projects/${key}/board`} className="btn btn-secondary btn-sm">View board</Link>
                    <Link href={`/projects/${key}/sprints`} className="btn btn-ghost btn-sm">Manage</Link>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No active sprint.{' '}
                  <Link href={`/projects/${key}/sprints`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create one →</Link>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Epics</h3>
              {epics.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No epics yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {epics.slice(0, 5).map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: e.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.title}</span>
                      <span className="badge" style={{ marginLeft: 'auto', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 10 }}>{e.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreate && <CreateIssueModal project={project} onClose={() => setShowCreate(false)} onCreated={() => { load(); window.dispatchEvent(new Event('jira:refresh')); }} />}
      {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
