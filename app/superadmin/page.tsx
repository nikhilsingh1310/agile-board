'use client';
import { useState, useEffect } from 'react';
import { getAllProfiles, getProjects, toggleSuperadmin, getCurrentUserProfile } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';
import Sidebar from '@/components/Sidebar';

export default function SuperadminPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadData = async () => {
    try {
      const [allUsers, allProjects, user] = await Promise.all([
        getAllProfiles(),
        getProjects(),
        getCurrentUserProfile()
      ]);
      setUsers(allUsers || []);
      setProjects(allProjects || []);
      setCurrentUser(user);
    } catch (e: any) {
      console.error(e);
      showToast('Failed to load superadmin data. You might not have access.', '❌');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleSuperadmin(userId, !currentStatus);
      showToast(`Superadmin access ${!currentStatus ? 'granted' : 'revoked'}`, '✅');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update access', '❌');
    }
  };

  // If we've loaded and the current user is NOT a superadmin, don't show the dashboard
  if (!loading && currentUser && !currentUser.is_superadmin) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content flex items-center justify-center h-full">
          <div className="empty-state">
            <h2>Access Denied</h2>
            <p>You must be a superadmin to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <h1 className="topbar-title">👑 Superadmin Dashboard</h1>
        </div>

        <div className="page-content">
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading system data...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              
              {/* Users Panel */}
              <div className="card">
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>All Registered Users ({users.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {users.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {u.full_name?.[0] || 'U'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{u.full_name || 'Unnamed User'}</span>
                            {u.id === currentUser?.id && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(You)</span>}
                            {u.city && (
                              <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 6, fontWeight: 500 }}>
                                📍 {u.city}
                              </span>
                            )}
                          </div>
                          {u.designation && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              💼 {u.designation}
                            </div>
                          )}
                          {u.is_superadmin && (
                            <div style={{ fontSize: 11, color: '#eab308', fontWeight: 600, marginTop: 2 }}>👑 SUPERADMIN</div>
                          )}
                        </div>
                      </div>
                      
                      {u.id !== currentUser?.id && (
                        <button 
                          onClick={() => handleToggleAdmin(u.id, u.is_superadmin)}
                          className={`btn btn-sm ${u.is_superadmin ? 'btn-ghost' : 'btn-secondary'}`}
                          style={u.is_superadmin ? { color: 'var(--danger)' } : {}}
                        >
                          {u.is_superadmin ? 'Revoke Superadmin' : 'Make Superadmin'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects Panel */}
              <div className="card">
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>All Projects in System ({projects.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {projects.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                          {p.key[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.key} • {p.issue_counter} issues created</div>
                        </div>
                      </div>
                      <a href={`/projects/${p.key}`} className="btn btn-secondary btn-sm">Enter Project</a>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
