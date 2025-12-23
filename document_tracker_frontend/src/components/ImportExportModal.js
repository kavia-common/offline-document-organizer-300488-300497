import React, { useEffect, useState } from 'react';
import { useStorage } from '../store/storage';

// PUBLIC_INTERFACE
export function ImportExportModal({ onClose }) {
  const { exportAll, importAll } = useStorage();
  const [merge, setMerge] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const onImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      await importAll(text, { merge });
      onClose();
    } catch (err) {
      setError(err.message || 'Import failed');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <strong>Backup / Import & Export</strong>
          <button className="btn-ghost" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body">
          <div style={{marginBottom:12}}>
            <button className="btn" onClick={exportAll}>Export to JSON</button>
          </div>
          <div style={{marginBottom:12}}>
            <label><input type="checkbox" checked={merge} onChange={e=>setMerge(e.target.checked)} /> Merge on import (conflicts resolved by latest updated)</label>
          </div>
          <div>
            <input type="file" accept="application/json,.json" onChange={onImport} />
          </div>
          {error && <div className="error">{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
