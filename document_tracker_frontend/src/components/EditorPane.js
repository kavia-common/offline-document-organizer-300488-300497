import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStorage } from '../store/storage';
import { debounce } from '../utils/debounce';

// PUBLIC_INTERFACE
export function EditorPane() {
  const { selectedId, nodes, docs, updateDocContent, addReference, removeReference, prefs, undoDoc } = useStorage();
  const doc = selectedId ? docs[selectedId] : null;
  const [content, setContent] = useState(doc ? doc.content : '');
  const [title, setTitle] = useState(() => {
    const n = nodes.find(n=>n.id===selectedId);
    return n ? n.title : '';
  });
  const [refAdd, setRefAdd] = useState('');
  const textRef = useRef(null);

  useEffect(() => {
    const d = selectedId ? docs[selectedId] : null;
    setContent(d ? d.content : '');
    const n = nodes.find(n=>n.id===selectedId);
    setTitle(n ? n.title : '');
  }, [selectedId, docs, nodes]);

  // Autosave debounce
  const debouncedSave = useMemo(() => debounce((id, next) => {
    updateDocContent(id, (prev)=>({ ...prev, content: next }), { pushHistory: true });
  }, prefs.autosaveMs || 800), [updateDocContent, prefs.autosaveMs]);

  useEffect(() => {
    return () => {
      debouncedSave.cancel && debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const backlinks = useMemo(() => {
    if (!selectedId) return [];
    return Object.values(docs).filter(d => (d.references||[]).includes(selectedId));
  }, [docs, selectedId]);

  const onKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (selectedId) {
        updateDocContent(selectedId, (prev)=>({ ...prev, content }), { pushHistory: true });
      }
    } else if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (selectedId) undoDoc(selectedId);
    }
  };

  if (!selectedId) {
    return <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}>
      <div style={{opacity:0.7}}>Select or create a document to begin.</div>
    </div>;
  }

  const refAddValid = nodes.find(n => n.id === refAdd && n.type === 'doc');

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 280px', height:'100%'}}>
      <div style={{display:'flex', flexDirection:'column', minHeight:0}}>
        <div style={{display:'flex', gap:8, alignItems:'center', padding:'8px 12px', borderBottom:`1px solid var(--border-color)`}}>
          <strong style={{fontSize:16}}>{title}</strong>
        </div>
        <textarea
          ref={textRef}
          onKeyDown={onKeyDown}
          value={content}
          onChange={(e)=>{ setContent(e.target.value); debouncedSave(selectedId, e.target.value); }}
          style={{
            flex:1, padding:12, border:'none', outline:'none', resize:'none',
            fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: (prefs.fontSize || 15) + 'px',
            background:'var(--bg-primary)', color:'var(--text-primary)'
          }}
        />
      </div>
      <div style={{borderLeft:`1px solid var(--border-color)`, display:'flex', flexDirection:'column', minHeight:0}}>
        <div style={{padding:'8px 12px', borderBottom:`1px solid var(--border-color)`}}><strong>References</strong></div>
        <div style={{padding:8, display:'flex', gap:6}}>
          <input placeholder="Paste doc ID to link" value={refAdd} onChange={e=>setRefAdd(e.target.value)} style={{flex:1}} />
          <button className="btn" disabled={!refAddValid} onClick={()=>{ if (refAddValid) { addReference(selectedId, refAdd); setRefAdd(''); }}}>Link</button>
        </div>
        <div style={{padding:8, overflow:'auto'}}>
          <div style={{fontSize:12, opacity:0.7, marginBottom:4}}>Outgoing</div>
          <ul style={{margin:0, paddingLeft:16}}>
            {(doc?.references || []).map(rid => {
              const node = nodes.find(n=>n.id===rid);
              return (
                <li key={rid} style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:6}}>
                  <span title={rid}>{node ? node.title : rid}</span>
                  <button className="btn-ghost danger" onClick={()=>removeReference(selectedId, rid)}>✖</button>
                </li>
              );
            })}
          </ul>
          <div style={{fontSize:12, opacity:0.7, margin:'12px 0 4px'}}>Backlinks</div>
          <ul style={{margin:0, paddingLeft:16}}>
            {backlinks.map(b => {
              const node = Object.values(nodes).find ? null : null;
              const title = (function(){
                const n = nodes.find(n=>n.id===b.id);
                return n ? n.title : b.id;
              })();
              return <li key={b.id}>{title}</li>;
            })}
          </ul>
          <div style={{marginTop:12, fontSize:11, opacity:0.6}}>Doc ID: {selectedId}</div>
        </div>
      </div>
    </div>
  );
}
