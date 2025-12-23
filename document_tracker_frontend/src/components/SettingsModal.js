import React, { useEffect, useState } from 'react';
import { useStorage } from '../store/storage';

// PUBLIC_INTERFACE
export function SettingsModal({ onClose }) {
  const { prefs, setPrefs, theme, setTheme, diagnostics } = useStorage();
  const [fontSize, setFontSize] = useState(prefs.fontSize || 15);
  const [autosaveMs, setAutosaveMs] = useState(prefs.autosaveMs || 800);
  const [featureBacklinks, setFeatureBacklinks] = useState(prefs.featureFlags?.backlinks ?? true);
  const [diag, setDiag] = useState(null);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const save = () => {
    setPrefs(prev => ({
      ...prev,
      fontSize: Number(fontSize) || 15,
      autosaveMs: Number(autosaveMs) || 800,
      featureFlags: { ...prev.featureFlags, backlinks: featureBacklinks }
    }));
    onClose();
  };

  const runDiagnostics = async () => {
    const res = await diagnostics();
    setDiag(res);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <strong>Settings</strong>
          <button className="btn-ghost" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body">
          <div style={{display:'grid', gridTemplateColumns:'160px 1fr', gap:8, alignItems:'center'}}>
            <div>Theme</div>
            <div>
              <select value={theme} onChange={e=>setTheme(e.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>Editor Font Size</div>
            <div><input type="number" min="10" max="28" value={fontSize} onChange={e=>setFontSize(e.target.value)} /></div>
            <div>Autosave Interval (ms)</div>
            <div><input type="number" min="200" step="100" value={autosaveMs} onChange={e=>setAutosaveMs(e.target.value)} /></div>
            <div>Enable Backlinks</div>
            <div><input type="checkbox" checked={featureBacklinks} onChange={e=>setFeatureBacklinks(e.target.checked)} /></div>
          </div>
          <details style={{marginTop:12}}>
            <summary>Diagnostics</summary>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={runDiagnostics}>Run self-check</button>
              {diag && (
                <div style={{marginTop:8, fontSize:13}}>
                  <div>IndexedDB Available: {String(diag.idbAvailable)}</div>
                  <div>Persisted: {String(diag.persisted)}</div>
                  <div>Quota: {diag.quota ? `${Math.round((diag.quota.usage||0)/1024)} KB used / ${Math.round((diag.quota.quota||0)/1024)} KB total` : 'n/a'}</div>
                </div>
              )}
            </div>
          </details>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
