'use client';
import { useState, useEffect } from 'react';
import { getProjectByKey, getProjectMembers, getAllProfiles, addProjectMember, removeProjectMember, getCurrentUserProfile } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';

export default function TeamSettingsPage({ params }: { params: { key: string } }) {
  const { showToast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('developer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const proj = await getProjectByKey(params.key);
      if (!proj) return;
      setProject(proj);
      
      const [mems, profs, user] = await Promise.all([
        getProjectMembers(proj.id),
        getAllProfiles(),
        getCurrentUserProfile()
      ]);
      setMembers(mems || []);
      setAllProfiles(profs || []);
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
      showToast('Failed to load team data', '❌');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.key]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsSubmitting(true);
    try {
      await addProjectMember(project.id, selectedUserId, selectedRole);
      showToast('Member added successfully', '✅');
      setSelectedUserId('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add member', '❌');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await removeProjectMember(project.id, userId);
      showToast('Member removed', '✅');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', '❌');
    }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading team...</div>;
  if (!project) return <div style={{ padding: 40 }}>Project not found.</div>;

  // Check if current user is admin
  const currentUserMember = members.find(m => m.user_id === currentUser?.id);
  const isAdmin = currentUserMember?.role === 'admin';

  // Filter out users who are already in the project
  const availableUsers = allProfiles.filter(p => !members.some(m => m.user_id === p.id));

  return (
    <div className="page-content" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Team Settings</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Manage who has access to {project.name}.</p>

      {isAdmin && (
        <div className="card" style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add New Member</h3>
          <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label className="label">User</label>
              <select className="input select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} required>
                <option value="">Select a user...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || 'Unnamed User'}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Role</label>
              <select className="input select" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="qa">QA</option>
                <option value="ba">BA</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedUserId}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </button>
          </form>
          {availableUsers.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>All registered users are already in this project.</p>
          )}
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Current Members ({members.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map(member => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {member.profiles?.avatar_url ? (
                  <img src={member.profiles.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {member.profiles?.full_name?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {member.profiles?.full_name || 'Unnamed User'}
                    {member.user_id === currentUser?.id && <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>(You)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {member.role}
                  </div>
                </div>
              </div>
              
              {isAdmin && member.user_id !== currentUser?.id && (
                <button 
                  onClick={() => handleRemoveMember(member.user_id)}
                  className="btn btn-ghost btn-sm" 
                  style={{ color: 'var(--danger)' }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
