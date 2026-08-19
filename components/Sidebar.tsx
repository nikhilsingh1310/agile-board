'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Project } from '@/lib/types';
import { getProjects, getCurrentUserProfile } from '@/lib/store';
import { signout } from '@/app/login/actions';

interface SidebarProps {
  currentProjectKey?: string;
}

export default function Sidebar({ currentProjectKey }: SidebarProps) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [projectsOpen, setProjectsOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const profileData = await getCurrentUserProfile();
        setUserProfile(profileData);
      } catch (err) {
        console.error('Error in Sidebar getCurrentUserProfile:', err);
      }

      try {
        const projData = await getProjects();
        setProjects(projData || []);
      } catch (err) {
        console.error('Error in Sidebar getProjects:', err);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener('jira:refresh', handler);
    return () => window.removeEventListener('jira:refresh', handler);
  }, []);

  const currentProject = projects.find(p => p.key === currentProjectKey);

  const navItem = (href: string, icon: string, label: string) => {
    const active = pathname === href;
    return (
      <Link key={href} href={href} className={`sidebar-item ${active ? 'active' : ''}`}>
        <span className="icon">{icon}</span>
        {label}
      </Link>
    );
  };

  const projectNav = (key: string, href: string, icon: string, label: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link key={href} href={href} className={`sidebar-item ${active ? 'active' : ''}`} style={{ paddingLeft: 16 }}>
        <span className="icon" style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 13 }}>{label}</span>
      </Link>
    );
  };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">J</div>
        <span className="logo-text">Personal JIRA</span>
      </div>

      {/* Global nav */}
      <div className="sidebar-section">
        {navItem('/', '🏠', 'Home')}
        {navItem('/settings', '⚙️', 'Settings')}
        {userProfile?.is_superadmin && navItem('/superadmin', '👑', 'Superadmin')}
      </div>

      {/* Projects list */}
      <div className="sidebar-section" style={{ flex: 1 }}>
        <div
          className="sidebar-section-label"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setProjectsOpen(o => !o)}
        >
          <span>Projects</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: projectsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
        </div>

        {projectsOpen && projects.map(p => (
          <div key={p.id}>
            <Link
              href={`/projects/${p.key}`}
              className={`sidebar-item ${pathname.startsWith(`/projects/${p.key}`) ? 'active' : ''}`}
            >
              <span className="project-dot" style={{ background: p.color }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.key}</span>
            </Link>
            {/* Sub-nav for current project */}
            {currentProjectKey === p.key && (
              <div>
                {projectNav(p.key, `/projects/${p.key}/board`, '📋', 'Board')}
                {projectNav(p.key, `/projects/${p.key}/backlog`, '📝', 'Backlog')}
                {projectNav(p.key, `/projects/${p.key}/sprints`, '🏃', 'Sprints')}
                {projectNav(p.key, `/projects/${p.key}/team`, '👥', 'Team Settings')}
              </div>
            )}
          </div>
        ))}

        <Link href="/projects/new" className="sidebar-item" style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="icon" style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          New project
        </Link>
      </div>

      {/* Bottom */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-subtle)' }}>
        {userProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', marginBottom: '8px', borderRadius: '6px', background: 'var(--bg-subtle)' }}>
            {userProfile.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>
                {userProfile.full_name?.[0] || 'U'}
              </div>
            )}
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userProfile.full_name || 'User'}
            </div>
            <form action={signout}>
              <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Sign Out">🚪</button>
            </form>
          </div>
        )}
        <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Press <kbd className="kbd">?</kbd> for shortcuts</span>
        </div>
      </div>
    </nav>
  );
}
