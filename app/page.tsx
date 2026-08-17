'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getProjects, getProjectStats, seedDemoData } from '@/lib/store';
import type { Project } from '@/lib/types';
import { useKeyboardShortcuts, KeyboardShortcutsModal } from '@/components/KeyboardShortcuts';
import { useToast } from '@/components/ToastProvider';

interface ProjectWithStats extends Project {
  stats: Awaited<ReturnType<typeof getProjectStats>>;
}

export default function HomePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ps = await getProjects();
      const withStats = await Promise.all(ps.map(async p => ({ ...p, stats: await getProjectStats(p.id) })));
      setProjects(withStats);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('jira:refresh', load);
    return () => window.removeEventListener('jira:refresh', load);
  }, [load]);

  useKeyboardShortcuts({
    onCreateIssue: () => router.push('/projects/new'),
    onGoBoard: () => projects[0] && router.push(`/projects/${projects[0].key}/board`),
    onGoBacklog: () => projects[0] && router.push(`/projects/${projects[0].key}/backlog`),
    onShowHelp: () => setShowHelp(true),
  });

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      await load();
      showToast('Demo projects added!', '🌱');
    } catch (e) {
      showToast('Error loading demo data', '❌');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <h1 className="topbar-title">Projects</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleSeed} disabled={seeding}>
              {seeding ? '⟳ Loading...' : '🌱 Load demo data'}
            </button>
            <Link href="/projects/new" className="btn btn-primary btn-sm">+ New project</Link>
          </div>
        </div>

        <div className="page-content">
          {loading ? (
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No projects yet</div>
              <div className="empty-state-desc">Create your first project to start tracking issues, sprints, and epics.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link href="/projects/new" className="btn btn-primary">+ Create project</Link>
                <button className="btn btn-secondary" onClick={handleSeed}>🌱 Load demo data</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {projects.map(p => {
                const { stats } = p;
                const pct = stats.progress;
                return (
                  <Link key={p.id} href={`/projects/${p.key}`} className="card card-hover" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                        {p.key[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{p.name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.key}</div>
                      </div>
                    </div>

                    {p.description && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{p.description}</div>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                      {Object.entries(stats.byStatus).map(([status, count]) =>
                        count > 0 && (
                          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background:
                              status === 'done' ? '#16a34a' : status === 'in_progress' ? '#4f46e5' : status === 'in_review' ? '#7c3aed' : '#cbd5e1'
                            }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} {status.replace('_', ' ')}</span>
                          </div>
                        )
                      )}
                    </div>

                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.total} issues</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{pct}% done</span>
                    </div>
                  </Link>
                );
              })}

              <Link href="/projects/new" className="card" style={{
                textDecoration: 'none', border: '1px dashed var(--border)', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: 160, gap: 8, color: 'var(--text-muted)', transition: 'all 0.2s'
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <span style={{ fontSize: 28 }}>+</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>New project</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
