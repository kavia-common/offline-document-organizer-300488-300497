import React, { useEffect, useMemo, useState } from 'react';
import { useStorage } from '../store/storage';

// PUBLIC_INTERFACE
export function SearchModal({ onClose }) {
  const { nodes, docs } = useStorage();
  const [q, setQ] = useState('');
  const [folderScope, setFolderScope] = useState('');
  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const results = useMemo(() => {
    if (!q && !folderScope && !dateMin && !dateMax) return [];
    const ql = q.toLowerCase();
    const scopeSet = new Set();
    if (folderScope) {
      const collect = (pid) => {
        nodes.filter(n=>n.parentId===pid).forEach(n => { scopeSet.add(n.id); if (n.type==='folder') collect(n.id); });
      };
      scopeSet.add(folderScope);
      collect(folderScope);
    }
    const minTs = dateMin ? new Date(dateMin).getTime() : -Infinity;
    const maxTs = dateMax ? new Date(dateMax).getTime() + 24*3600*1000 : Infinity;

    const matches = [];
    nodes.forEach(n => {
      if (folderScope && !scopeSet.has(n.id) && n.parentId !== folderScope) return;
      if (n.updatedAt < minTs || n.updatedAt > maxTs) return;
      const d = docs[n.id];
      const hayTitle = (n.title || '').toLowerCase();
      const hayTags = (n.tags||[]).join(' ').toLowerCase();
      const hayContent = (d?.content || '').toLowerCase();
      const ok = q ? (hayTitle.includes(ql) || hayTags.includes(ql) || (showContent && hayContent.includes(ql))) : true;
      if (ok) {
        const snippet = showContent && d?.content ? makeSnippet(d.content, q) : '';
        matches.push({ node: n, snippet });
      }
    });
    return matches.sort((a,b)=> (b.node.updatedAt||0) - (a.node.updatedAt||0));
  }, [q, folderScope, dateMin, dateMax, showContent, nodes, docs]);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <strong>Search</strong>
          <button className="btn-ghost" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{display:'grid', gridTemplateColumns:'1fr 260px', gap:12}}>
          <div>
            <input placeholder="Search titles, tags, content..." value={q} onChange={e=>setQ(e.target.value)} autoFocus />
            <div style={{marginTop:8, maxHeight:360, overflow:'auto'}}>
              {results.map(r => (
                <div key={r.node.id} className="result">
                  <div className="result-title">{r.node.type==='doc'?'📝':'📁'} {highlight(r.node.title, q)}</div>
                  <div className="result-meta">Updated: {new Date(r.node.updatedAt).toLocaleString()}</div>
                  {r.snippet && <div className="result-snippet" dangerouslySetInnerHTML={{__html:r.snippet}}/>}
                </div>
              ))}
              {results.length===0 && <div style={{opacity:0.6, padding:'8px 0'}}>No matches</div>}
            </div>
          </div>
          <div>
            <div style={{fontSize:12, opacity:0.7, marginBottom:6}}>Filters</div>
            <select value={folderScope} onChange={e=>setFolderScope(e.target.value)}>
              <option value="">All folders</option>
              {nodes.filter(n=>n.type==='folder').map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8}}>
              <div>
                <label style={{fontSize:12, opacity:0.7}}>Updated After</label>
                <input type="date" value={dateMin} onChange={e=>setDateMin(e.target.value)} />
              </div>
              <div>
                <label style={{fontSize:12, opacity:0.7}}>Updated Before</label>
                <input type="date" value={dateMax} onChange={e=>setDateMax(e.target.value)} />
              </div>
            </div>
            <div style={{marginTop:8}}>
              <label><input type="checkbox" checked={showContent} onChange={e=>setShowContent(e.target.checked)} /> Search in content</label>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function makeSnippet(content, q) {
  if (!q) return '';
  const lower = content.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return '';
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + q.length + 40);
  const seg = content.slice(start, end);
  return highlight(seg, q);
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
}

function highlight(text, q) {
  if (!q) return escapeHtml(text);
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'ig'));
  return parts.map((p,i) => i%2===1 ? `<mark>${escapeHtml(p)}</mark>` : escapeHtml(p)).join('');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
