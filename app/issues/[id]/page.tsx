'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  getIssue, getProject, updateIssue, deleteIssue,
  getComments, addComment, deleteComment,
  getActivity, getSubtasks, getIssueLinks, addIssueLink, removeIssueLink,
  getEpics, getSprints, getIssues, createIssue,
  getAttachments, uploadAttachment, deleteAttachment,
} from '@/lib/store';
import type { StoredAttachment } from '@/lib/store';
import type { Issue, Project, Comment, ActivityLog, Epic, Sprint, IssueLink, IssueStatus, IssuePriority, IssueType, LinkType } from '@/lib/types';
import { STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG, STATUS_ORDER } from '@/lib/config';
import { useToast } from '@/components/ToastProvider';
import { formatDistanceToNow } from 'date-fns';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

export default function IssuePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [subtasks, setSubtasks] = useState<Issue[]>([]);
  const [links, setLinks] = useState<IssueLink[]>([]);
  const [attachments, setAttachments] = useState<StoredAttachment[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tab, setTab] = useState<'comments' | 'activity' | 'subtasks' | 'links' | 'attachments'>('comments');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkTarget, setLinkTarget] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('relates_to');
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  const load = useCallback(async () => {
    const i = await getIssue(id);
    if (!i) { router.replace('/'); return; }
    setIssue(i);
    const proj = await getProject(i.project_id);
    setProject(proj);
    const [cms, act, subs, lnks, atts] = await Promise.all([
      getComments(id),
      getActivity(id),
      getSubtasks(id),
      getIssueLinks(id),
      getAttachments(id),
    ]);
    setComments(cms);
    setActivity(act);
    setSubtasks(subs);
    setLinks(lnks);
    setAttachments(atts);
    if (proj) {
      const [allI, eps, sps] = await Promise.all([
        getIssues(proj.id),
        getEpics(proj.id),
        getSprints(proj.id),
      ]);
      setAllIssues(allI.filter(x => x.id !== id && x.parent_id === null));
      setEpics(eps);
      setSprints(sps.filter(s => s.status !== 'completed'));
    }
  }, [id, router]);

  useEffect(() => {
    load();
    window.addEventListener('jira:refresh', load);
    return () => window.removeEventListener('jira:refresh', load);
  }, [load]);

  const update = async (data: Partial<Issue>) => {
    await updateIssue(id, data);
    await load();
    window.dispatchEvent(new Event('jira:refresh'));
  };

  const handleDelete = async () => {
    if (!confirm('Delete this issue? This cannot be undone.')) return;
    await deleteIssue(id);
    router.back();
    showToast('Issue deleted', '🗑');
  };

  const handleComment = async () => {
    if (!commentBody.trim()) return;
    await addComment({ issue_id: id, author: 'You', body: commentBody.trim() });
    setCommentBody('');
    await load();
  };

  const handleAddLink = async () => {
    if (!linkTarget) return;
    await addIssueLink({ source_issue_id: id, target_issue_id: linkTarget, link_type: linkType });
    setShowLinkForm(false);
    setLinkTarget('');
    await load();
    showToast('Issue link added', '🔗');
  };

  const handleAddSubtask = async () => {
    if (!subtaskTitle.trim() || !project) return;
    await createIssue({ project_id: project.id, parent_id: id, type: 'subtask', title: subtaskTitle.trim(), priority: 'medium' });
    setSubtaskTitle('');
    setShowSubtaskForm(false);
    await load();
    showToast('Subtask created', '⤷');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await Promise.all(Array.from(files).map(file => uploadAttachment(id, file)));
      await load();
      showToast(`${files.length} file(s) attached`, '📎');
    } catch (err) {
      showToast('Upload failed — check file size', '❌');
    } finally {
      setUploading(false);
    }
  };

  if (!issue || !project) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    </div>
  );

  const type = TYPE_CONFIG[issue.type];
  const priority = PRIORITY_CONFIG[issue.priority];
  const status = STATUS_CONFIG[issue.status];

  const linkedIssues = links.map(l => {
    const otherId = l.source_issue_id === id ? l.target_issue_id : l.source_issue_id;
    const other = allIssues.find(i => i.id === otherId);
    const rel = l.source_issue_id === id ? l.link_type : (l.link_type === 'blocks' ? 'blocked_by' : l.link_type === 'blocked_by' ? 'blocks' : l.link_type);
    return { link: l, other, rel };
  });

  return (
    <div className="app-layout">
      <Sidebar currentProjectKey={project.key} />
      <div className="main-content">
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <Link href={`/projects/${project.key}`} style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>{project.name}</Link>
            <span className="sep">/</span>
            <span className="issue-key" style={{ fontSize: 13 }}>{issue.issue_key}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </div>
        </div>

        <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'flex-start' }}>
          {/* Left: main content */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16, color: type.color }}>{type.icon}</span>
              <span className="issue-key">{issue.issue_key}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 12, color: type.color }}>{type.label}</span>
            </div>

            <h1
              contentEditable
              suppressContentEditableWarning
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, outline: 'none', borderBottom: '1px solid transparent', padding: '2px 0' }}
              onBlur={e => update({ title: e.currentTarget.textContent ?? issue.title })}
              onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--accent)')}
              onBlurCapture={e => ((e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent')}
            >
              {issue.title}
            </h1>

            <div style={{ marginBottom: 24 }}>
              <label className="label">Description</label>
              <textarea
                className="input textarea"
                defaultValue={issue.description ?? ''}
                placeholder="Add a description..."
                style={{ minHeight: 100 }}
                onBlur={e => update({ description: e.target.value || null })}
              />
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 16 }}>
              {(['comments', 'activity', 'subtasks', 'links', 'attachments'] as const).map(t => (
                <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'comments' && comments.length > 0 && <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 100, fontWeight: 700 }}>{comments.length}</span>}
                  {t === 'subtasks' && subtasks.length > 0 && <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 100, fontWeight: 700 }}>{subtasks.length}</span>}
                  {t === 'links' && links.length > 0 && <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 100, fontWeight: 700 }}>{links.length}</span>}
                  {t === 'attachments' && attachments.length > 0 && <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 100, fontWeight: 700 }}>{attachments.length}</span>}
                </button>
              ))}
            </div>

            {/* Comments */}
            {tab === 'comments' && (
              <div>
                {comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <div className="avatar" style={{ background: '#6366f1', flexShrink: 0 }}>{c.author[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.author}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                        <button onClick={async () => { await deleteComment(c.id); await load(); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{c.body}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="avatar" style={{ background: '#6366f1', flexShrink: 0 }}>Y</div>
                  <div style={{ flex: 1 }}>
                    <textarea
                      className="input textarea"
                      value={commentBody}
                      onChange={e => setCommentBody(e.target.value)}
                      placeholder="Add a comment..."
                      style={{ minHeight: 60, marginBottom: 8 }}
                      onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleComment(); }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleComment} disabled={!commentBody.trim()}>Add comment</button>
                  </div>
                </div>
              </div>
            )}

            {/* Activity */}
            {tab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activity.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity yet.</div> : activity.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="avatar" style={{ background: '#8b5cf6', flexShrink: 0 }}>{a.actor[0]}</div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{a.actor}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}> changed <strong>{a.field_changed}</strong> from </span>
                      <span style={{ fontSize: 12, background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>{a.old_value ?? 'none'}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}> to </span>
                      <span style={{ fontSize: 12, background: 'var(--accent-subtle)', padding: '1px 6px', borderRadius: 4, color: 'var(--accent)' }}>{a.new_value ?? 'none'}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subtasks */}
            {tab === 'subtasks' && (
              <div>
                {subtasks.map(s => {
                  const st = STATUS_CONFIG[s.status];
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 6, cursor: 'pointer' }}
                      onClick={() => router.push(`/issues/${s.id}`)}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>⤷</span>
                      <span className="issue-key">{s.issue_key}</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{s.title}</span>
                      <span className="badge" style={{ background: 'var(--bg-elevated)', color: st.color, fontSize: 11 }}>{st.label}</span>
                    </div>
                  );
                })}
                {!showSubtaskForm ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowSubtaskForm(true)}>+ Add subtask</button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input className="input" placeholder="Subtask title..." value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} />
                    <button className="btn btn-primary btn-sm" onClick={handleAddSubtask}>Add</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowSubtaskForm(false)}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            {/* Links */}
            {tab === 'links' && (
              <div>
                {linkedIssues.map(({ link, other, rel }) => (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 80 }}>{rel.replace('_', ' ')}</span>
                    {other ? (
                      <span className="issue-key" style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => router.push(`/issues/${other.id}`)}>{other.issue_key}</span>
                    ) : <span className="issue-key">Unknown</span>}
                    {other && <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{other.title}</span>}
                    <button onClick={async () => { await removeIssueLink(link.id); await load(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                {!showLinkForm ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowLinkForm(true)}>+ Add link</button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <select className="input select" style={{ width: 140 }} value={linkType} onChange={e => setLinkType(e.target.value as LinkType)}>
                      <option value="blocks">blocks</option>
                      <option value="blocked_by">blocked by</option>
                      <option value="duplicates">duplicates</option>
                      <option value="relates_to">relates to</option>
                    </select>
                    <select className="input select" style={{ flex: 1 }} value={linkTarget} onChange={e => setLinkTarget(e.target.value)}>
                      <option value="">Select issue...</option>
                      {allIssues.map(i => <option key={i.id} value={i.id}>{i.issue_key} — {i.title}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={handleAddLink} disabled={!linkTarget}>Add</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowLinkForm(false)}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {tab === 'attachments' && (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => document.getElementById('attachment-input')?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                    background: dragOver ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                    transition: 'all 0.15s', marginBottom: 16,
                  }}
                >
                  <input id="attachment-input" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{uploading ? '⟳' : '📎'}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {uploading ? 'Uploading to cloud...' : 'Click or drag & drop files here'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Screenshots, PDFs, docs — stored in Supabase Storage</div>
                </div>

                {attachments.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>No attachments yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {attachments.map(a => {
                      const isImage = a.mime_type.startsWith('image/');
                      const sizeKb = Math.round(a.size_bytes / 1024);
                      const url = a.public_url ?? '';
                      return (
                        <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                          {isImage && (
                            <div style={{ background: 'var(--bg-tertiary)', maxHeight: 200, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                              <img src={url} alt={a.filename} style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                            </div>
                          )}
                          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{isImage ? '🖼️' : '📄'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sizeKb} KB · {a.uploaded_by} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                            </div>
                            <a href={url} download={a.filename} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="Download" onClick={e => e.stopPropagation()}>⬇</a>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Delete"
                              style={{ color: 'var(--danger)' }}
                              onClick={async () => { await deleteAttachment(a.id, a.storage_path); await load(); showToast('Attachment deleted', '🗑'); }}
                            >✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: sidebar fields */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Field label="Status">
                <select className="input select" value={issue.status} onChange={e => update({ status: e.target.value as IssueStatus })}>
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </Field>
              <hr className="divider" />
              <Field label="Priority">
                <select className="input select" value={issue.priority} onChange={e => update({ priority: e.target.value as IssuePriority })}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </Field>
              <hr className="divider" />
              <Field label="Assignee">
                <input className="input" defaultValue={issue.assignee ?? ''} placeholder="Unassigned" onBlur={e => update({ assignee: e.target.value || null })} />
              </Field>
              <hr className="divider" />
              <Field label="Story points">
                <input className="input" type="number" min={0} max={99} defaultValue={issue.story_points ?? ''} placeholder="—" onBlur={e => update({ story_points: e.target.value ? parseInt(e.target.value) : null })} />
              </Field>
              <hr className="divider" />
              <Field label="Due date">
                <input className="input" type="date" defaultValue={issue.due_date ?? ''} onBlur={e => update({ due_date: e.target.value || null })} />
              </Field>
              {epics.length > 0 && (<>
                <hr className="divider" />
                <Field label="Epic">
                  <select className="input select" value={issue.epic_id ?? ''} onChange={e => update({ epic_id: e.target.value || null })}>
                    <option value="">None</option>
                    {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                  </select>
                </Field>
              </>)}
              {sprints.length > 0 && (<>
                <hr className="divider" />
                <Field label="Sprint">
                  <select className="input select" value={issue.sprint_id ?? ''} onChange={e => update({ sprint_id: e.target.value || null })}>
                    <option value="">Backlog</option>
                    {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
              </>)}
              <hr className="divider" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                <div>Created by <strong>{issue.reporter}</strong></div>
                <div>{new Date(issue.created_at).toLocaleDateString()}</div>
                <div style={{ marginTop: 4 }}>Updated {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
