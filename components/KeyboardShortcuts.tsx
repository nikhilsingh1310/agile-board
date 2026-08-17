'use client';
import { useEffect } from 'react';

interface ShortcutsProps {
  onCreateIssue: () => void;
  onGoBoard: () => void;
  onGoBacklog: () => void;
  onShowHelp: () => void;
}

export function useKeyboardShortcuts({ onCreateIssue, onGoBoard, onGoBacklog, onShowHelp }: ShortcutsProps) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'c': onCreateIssue(); break;
        case 'b': onGoBoard(); break;
        case 'l': onGoBacklog(); break;
        case '?': onShowHelp(); break;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCreateIssue, onGoBoard, onGoBacklog, onShowHelp]);
}

export function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'c', desc: 'Create new issue' },
    { key: 'b', desc: 'Go to Board' },
    { key: 'l', desc: 'Go to Backlog' },
    { key: '?', desc: 'Show this help' },
    { key: 'Esc', desc: 'Close modal / panel' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Keyboard Shortcuts</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shortcuts.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.desc}</span>
              <kbd className="kbd">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
