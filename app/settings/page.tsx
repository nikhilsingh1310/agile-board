'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { seedDemoData } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      window.dispatchEvent(new Event('jira:refresh'));
      showToast('Demo projects added!', '🌱');
      router.push('/');
    } catch (e) {
      showToast('Error loading demo data', '❌');
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('This will delete ALL projects, issues, and data from Supabase. Continue?')) return;
    setClearing(true);
    try {
      // Delete in dependency order (children first)
      await supabase.from('attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('issue_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sprints').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('epics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('labels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      window.dispatchEvent(new Event('jira:refresh'));
      showToast('All data cleared', '🗑');
      router.push('/');
    } catch (e) {
      showToast('Error clearing data', '❌');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <h1 className="topbar-title">Settings</h1>
        </div>
        <div className="page-content" style={{ maxWidth: 560 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Demo data</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Load a pre-built dataset with 2 projects, 7 issues, sprints, epics, comments, and links. Adds alongside existing projects — does not overwrite.
            </p>
            <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
              {seeding ? '⟳ Loading...' : '🌱 Load demo data'}
            </button>
          </div>

          <div className="card" style={{ border: '1px solid rgba(248,81,73,0.3)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--danger)' }}>Danger zone</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Permanently delete all projects, issues, sprints, comments, and attachments from Supabase. This cannot be undone.
            </p>
            <button className="btn btn-danger" onClick={handleClear} disabled={clearing}>
              {clearing ? '⟳ Clearing...' : '🗑 Clear all data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
