import React from 'react';

// PUBLIC_INTERFACE
export function TopBar({ onToggleTheme, theme, onOpenSearch, onOpenBackup, onOpenSettings, onOpenHelp }) {
  /** Simple top bar with actions and status */
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'8px 12px', background:'var(--bg-secondary)', borderBottom:`1px solid var(--border-color)`
    }}>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <strong style={{fontSize:16}}>📁 Offline Document Tracker</strong>
        <span style={{fontSize:12, opacity:0.7}}>No network required</span>
      </div>
      <div style={{display:'flex', gap:8}}>
        <button className="btn" onClick={onOpenSearch} title="Search (Ctrl/Cmd+F)">🔎 Search</button>
        <button className="btn" onClick={onOpenBackup} title="Import/Export (Ctrl/Cmd+B)">Backup</button>
        <button className="btn" onClick={onOpenSettings} title="Settings (Ctrl/Cmd+,)">⚙️</button>
        <button className="btn" onClick={onToggleTheme} title="Toggle theme">{theme === 'light' ? '🌙' : '☀️'}</button>
        <button className="btn" onClick={onOpenHelp} title="Help/About (Ctrl/Cmd+/)">❓</button>
      </div>
    </div>
  );
}
