import React, { useEffect } from 'react';

// PUBLIC_INTERFACE
export function HelpAboutModal({ onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <strong>Help & About</strong>
          <button className="btn-ghost" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{lineHeight:1.6}}>
          <p>This offline app lets you organize and edit text documents in a virtual folder tree. It works without any network access.</p>
          <p>Keyboard shortcuts:</p>
          <ul>
            <li>Ctrl/Cmd+N: New document</li>
            <li>Ctrl/Cmd+S: Save</li>
            <li>Ctrl/Cmd+F: Search</li>
            <li>Ctrl/Cmd+B: Backup (Import/Export)</li>
            <li>Ctrl/Cmd+,: Settings</li>
          </ul>
          <p>All data is stored locally in your browser using IndexedDB with localStorage fallback.</p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
