'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { createProject } from '@/lib/store';
import { PROJECT_COLORS } from '@/lib/config';
import { useToast } from '@/components/ToastProvider';

export default function NewProjectPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [keyManual, setKeyManual] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (v: string) => {
    setName(v);
    if (!keyManual) {
      setKey(v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Project name is required');
    if (!key.trim()) return setError('Project key is required');
    if (!/^[A-Z][A-Z0-9]{1,5}$/.test(key)) return setError('Key must be 2–6 uppercase letters/numbers, starting with a letter');

    try {
      const p = await createProject({ name: name.trim(), key, description: description.trim() || null, color });
      window.dispatchEvent(new Event('jira:refresh'));
      showToast(`Project "${p.name}" created!`, '🎉');
      router.push(`/projects/${p.key}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
          <h1 className="topbar-title">New project</h1>
        </div>
        <div className="page-content" style={{ maxWidth: 560 }}>
          <div className="card" style={{ marginTop: 16 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Name */}
              <div>
                <label className="label">Project name *</label>
                <input
                  className="input"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Payroll Certification Hub"
                  autoFocus
                />
              </div>

              {/* Key */}
              <div>
                <label className="label">Project key *</label>
                <input
                  className="input"
                  value={key}
                  onChange={e => { setKeyManual(true); setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); }}
                  placeholder="PCH"
                  style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Issues will be named {key || 'KEY'}-1, {key || 'KEY'}-2, etc.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                />
              </div>

              {/* Color */}
              <div>
                <label className="label">Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: c, border: '2px solid',
                        borderColor: color === c ? 'white' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                        transform: color === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', boxShadow: `0 0 20px ${color}40` }}>
                  {key[0] || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{name || 'Project name'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{key || 'KEY'}</div>
                </div>
              </div>

              {error && <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(248,81,73,0.1)', borderRadius: 6 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">Create project</button>
                <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
