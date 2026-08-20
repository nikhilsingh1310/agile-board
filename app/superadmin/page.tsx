'use client';
import { useState, useEffect } from 'react';
import { getAllProfiles, getProjects, toggleSuperadmin, getCurrentUserProfile, updateUserProfileAdmin, deleteUserAdmin } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';
import Sidebar from '@/components/Sidebar';

export default function SuperadminPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('Mumbai');
  const [editDesignation, setEditDesignation] = useState('');
  const [editIsSuperadmin, setEditIsSuperadmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditName(user.full_name || '');
    setEditCity(user.city || 'Mumbai');
    setEditDesignation(user.designation || '');
    setEditIsSuperadmin(!!user.is_superadmin);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateUserProfileAdmin(editingUser.id, {
        full_name: editName.trim(),
        city: editCity,
        designation: editDesignation.trim(),
        is_superadmin: editIsSuperadmin
      });
      showToast(`User updated successfully`, '✅');
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : (err?.message ? String(err.message) : 'Failed to update user');
      showToast(msg, '❌');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot delete your own admin account!', '⚠️');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to permanently delete user "${user.full_name || 'Unnamed'}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteUserAdmin(user.id);
      showToast(`User "${user.full_name || 'User'}" deleted`, '🗑️');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', '❌');
    }
  };

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

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="topbar-title">👑 Superadmin Control Center</h1>
          <input
            type="text"
            placeholder="Search users or roles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              fontSize: 13,
              width: 220
            }}
          />
        </div>

        <div className="page-content">
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading system data...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28 }}>
              
              {/* Users Panel */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    All Registered Users ({filteredUsers.length})
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>View, Update & Delete Users</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredUsers.map(u => (
                    <div 
                      key={u.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '12px 14px', 
                        border: '1px solid var(--border-subtle)', 
                        borderRadius: 10,
                        background: u.is_superadmin ? 'rgba(234, 179, 8, 0.04)' : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                        ) : (
                          <div style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            background: u.is_superadmin ? '#eab308' : 'var(--accent)', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700,
                            fontSize: 14
                          }}>
                            {u.full_name?.[0] || 'U'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{u.full_name || 'Unnamed User'}</span>
                            {u.id === currentUser?.id && (
                              <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, background: 'var(--accent-subtle)', padding: '1px 6px', borderRadius: 4 }}>You</span>
                            )}
                            {u.city && (
                              <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 6, fontWeight: 500 }}>
                                📍 {u.city}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            {u.designation ? (
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                💼 {u.designation}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No designation</span>
                            )}

                            {u.is_superadmin && (
                              <span style={{ fontSize: 10, color: '#eab308', fontWeight: 700, letterSpacing: '0.05em' }}>• 👑 SUPERADMIN</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons: Edit & Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => openEditModal(u)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          title="Edit user details"
                        >
                          ✏️ Edit
                        </button>

                        {u.id !== currentUser?.id && (
                          <button 
                            onClick={() => handleDeleteUser(u)}
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--danger)', padding: '4px 8px', fontSize: 12 }}
                            title="Delete this user permanently"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredUsers.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No users match "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>

              {/* Projects Panel */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    All Projects ({projects.length})
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Global overview</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {projects.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                          {p.key[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.key} • {p.issue_counter} issues created</div>
                        </div>
                      </div>
                      <a href={`/projects/${p.key}`} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>Enter Project →</a>
                    </div>
                  ))}

                  {projects.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No projects created yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ─── EDIT USER MODAL ──────────────────────────────────────────────────────── */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 24 }}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>Edit User Details</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label" style={{ fontWeight: 600, fontSize: 13 }}>Full Name</label>
                <input
                  className="input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  placeholder="Full Name"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontWeight: 600, fontSize: 13 }}>City</label>
                  <select 
                    className="input select"
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                  >
                    <option value="Mumbai">📍 Mumbai</option>
                    <option value="Pune">📍 Pune</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 600, fontSize: 13 }}>Designation</label>
                  <input
                    className="input"
                    value={editDesignation}
                    onChange={e => setEditDesignation(e.target.value)}
                    placeholder="e.g. QA / Developer"
                  />
                </div>
              </div>

              {/* Toggle Superadmin Role */}
              {editingUser.id !== currentUser?.id && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 14px', 
                  borderRadius: 10, 
                  background: editIsSuperadmin ? '#fefce8' : 'var(--bg-subtle)',
                  border: `1px solid ${editIsSuperadmin ? '#fef08a' : 'var(--border-subtle)'}`
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: editIsSuperadmin ? '#854d0e' : 'var(--text-primary)' }}>
                      👑 Superadmin Access
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Grants full god-mode over all projects & users
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsSuperadmin}
                    onChange={e => setEditIsSuperadmin(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
