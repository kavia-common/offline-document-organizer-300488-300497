import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useStorage } from '../store/storage';
import { debounce } from '../utils/debounce';

// PUBLIC_INTERFACE
export function EditorPane() {
  const {
    selectedId,
    nodes,
    docs,
    updateDocContent,
    addReference,
    removeReference,
    prefs,
    undoDoc,
    selectById,
  } = useStorage();

  const doc = selectedId ? docs[selectedId] : null;
  const [content, setContent] = useState(doc ? doc.content : '');
  const [title, setTitle] = useState(() => {
    const n = nodes.find((n) => n.id === selectedId);
    return n ? n.title : '';
  });
  const [refAdd, setRefAdd] = useState('');
  const textRef = useRef(null);

  // Simple in-app toast using CustomEvent to decouple UI
  const showToast = useCallback((msg) => {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg } }));
  }, []);

  useEffect(() => {
    const d = selectedId ? docs[selectedId] : null;
    setContent(d ? d.content : '');
    const n = nodes.find((n) => n.id === selectedId);
    setTitle(n ? n.title : '');
  }, [selectedId, docs, nodes]);

  // Autosave debounce
  const debouncedSave = useMemo(
    () =>
      debounce((id, next) => {
        updateDocContent(id, (prev) => ({ ...prev, content: next }), {
          pushHistory: true,
        });
      }, prefs.autosaveMs || 800),
    [updateDocContent, prefs.autosaveMs]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel && debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Backlinks computed even if no selection; will render conditionally in JSX
  const backlinks = useMemo(() => {
    if (!selectedId) return [];
    return Object.values(docs).filter((d) => (d.references || []).includes(selectedId));
  }, [docs, selectedId]);

  // Save current doc immediately (flush debounce) before navigation
  const autosaveNow = useCallback(() => {
    if (!selectedId) return;
    debouncedSave.cancel && debouncedSave.cancel();
    updateDocContent(selectedId, (prev) => ({ ...prev, content }), { pushHistory: true });
  }, [selectedId, content, updateDocContent, debouncedSave]);

  const navigateToDoc = useCallback(
    (targetId) => {
      if (!targetId) return;
      const exists = nodes.find((n) => n.id === targetId && n.type === 'doc');
      if (!exists) {
        showToast('Target document does not exist.');
        return;
      }
      autosaveNow();
      // Update hash for shareable links and use storage selection to update editor
      window.location.hash = `#doc/${targetId}`;
      selectById(targetId);
      // focus editor when possible
      setTimeout(() => {
        if (textRef.current) textRef.current.focus();
      }, 0);
    },
    [nodes, selectById, autosaveNow, showToast]
  );

  const onKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (selectedId) {
        updateDocContent(selectedId, (prev) => ({ ...prev, content }), { pushHistory: true });
      }
    } else if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (selectedId) undoDoc(selectedId);
    }
  };

  // Derived values and helpers
  const refAddValid = nodes.find((n) => n.id === refAdd && n.type === 'doc');
  const outgoingRefs = doc?.references || [];

  // Detect wiki-style [[Title]] or markdown [Title](doc:<id>) patterns in provided text
  const detectInlineDocLinks = useCallback((text) => {
    const titleToId = new Map();
    nodes.forEach((n) => {
      if (n.type === 'doc') titleToId.set(n.title, n.id);
    });
    const wikiMatches = [];
    const wikiRegex = /\[\[([^[\]]+)\]\]/g;
    let m;
    while ((m = wikiRegex.exec(text)) !== null) {
      const title = m[1].trim();
      const id = titleToId.get(title) || null;
      if (id) wikiMatches.push({ title, id });
    }
    const mdMatches = [];
    const mdRegex = /\[([^\]]+)\]\(doc:([a-zA-Z0-9-]+)\)/g;
    while ((m = mdRegex.exec(text)) !== null) {
      const title = m[1].trim();
      const id = m[2].trim();
      const exists = nodes.find((n) => n.id === id && n.type === 'doc');
      if (exists) mdMatches.push({ title, id });
    }
    const byId = new Map();
    wikiMatches.forEach((x) => {
      byId.set(x.id, x);
    });
    mdMatches.forEach((x) => {
      byId.set(x.id, x);
    });
    return Array.from(byId.values());
  }, [nodes]);

  const inlineLinks = useMemo(() => detectInlineDocLinks(content || ''), [content, detectInlineDocLinks]);

  // Early return after hooks/derived
  if (!selectedId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ opacity: 0.7 }}>Select or create a document to begin.</div>
      </div>
    );
  }

  // Create a link-like element with mouse and keyboard accessibility
  const LinkLike = ({ targetId, titleText }) => {
    const onActivate = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateToDoc(targetId);
    };
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToDoc(targetId);
      }
    };
    return (
      <span
        role="link"
        tabIndex={0}
        className="doc-link"
        title={targetId}
        onClick={onActivate}
        onKeyDown={onKey}
        style={{ display: 'inline', userSelect: 'none' }}
      >
        {titleText}
      </span>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid var(--border-color)` }}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
        </div>
        <textarea
          ref={textRef}
          onKeyDown={onKeyDown}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            debouncedSave(selectedId, e.target.value);
          }}
          style={{
            flex: 1,
            padding: 12,
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: (prefs.fontSize || 15) + 'px',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div style={{ borderLeft: `1px solid var(--border-color)`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: `1px solid var(--border-color)` }}>
          <strong>References</strong>
        </div>
        <div style={{ padding: 8, display: 'flex', gap: 6 }}>
          <input
            placeholder="Paste doc ID to link"
            value={refAdd}
            onChange={(e) => setRefAdd(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn"
            disabled={!refAddValid}
            onClick={() => {
              if (refAddValid) {
                addReference(selectedId, refAdd);
                setRefAdd('');
              } else {
                showToast('Invalid document ID.');
              }
            }}
          >
            Link
          </button>
        </div>
        <div style={{ padding: 8, overflow: 'auto' }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Outgoing</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {outgoingRefs.map((rid) => {
              const node = nodes.find((n) => n.id === rid && n.type === 'doc');
              const titleText = node ? node.title : rid;
              return (
                <li key={rid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <LinkLike targetId={rid} titleText={titleText} />
                  <button className="btn-ghost danger" aria-label="Remove link" onClick={() => removeReference(selectedId, rid)}>
                    ✖
                  </button>
                </li>
              );
            })}
            {outgoingRefs.length === 0 && <li style={{ opacity: 0.6, fontSize: 12 }}>No outgoing links</li>}
          </ul>

          <div style={{ fontSize: 12, opacity: 0.7, margin: '12px 0 4px' }}>Detected Links in Text</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {inlineLinks.map((ln) => (
              <li key={ln.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <LinkLike targetId={ln.id} titleText={ln.title} />
                {!outgoingRefs.includes(ln.id) ? (
                  <button
                    className="btn-ghost"
                    title="Add to references"
                    onClick={() => addReference(selectedId, ln.id)}
                  >
                    ➕
                  </button>
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.6 }}>linked</span>
                )}
              </li>
            ))}
            {inlineLinks.length === 0 && <li style={{ opacity: 0.6, fontSize: 12 }}>No detected links</li>}
          </ul>

          <div style={{ fontSize: 12, opacity: 0.7, margin: '12px 0 4px' }}>Backlinks</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {backlinks.map((b) => {
              const n = nodes.find((n) => n.id === b.id);
              const t = n ? n.title : b.id;
              return (
                <li key={b.id}>
                  <LinkLike targetId={b.id} titleText={t} />
                </li>
              );
            })}
            {backlinks.length === 0 && <li style={{ opacity: 0.6, fontSize: 12 }}>No backlinks</li>}
          </ul>

          <div style={{ marginTop: 12, fontSize: 11, opacity: 0.6 }}>Doc ID: {selectedId}</div>
        </div>
      </div>
    </div>
  );
}
