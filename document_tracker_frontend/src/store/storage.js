import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { idbOpen, idbGetAll, idbPutAll, idbClear, idbExportJSON, idbImportJSON, idbAvailable } from '../utils/idb';
import { v4 as uuidv4 } from '../utils/uuid';
import { debounce } from '../utils/debounce';

/**
 * Data Model
 * - nodes: array of { id, type: 'folder'|'doc', parentId|null, title, order, tags:[], updatedAt }
 * - docs: map id -> { id, content, references: [docId], updatedAt, history:[] }
 * - prefs: { theme, fontSize, autosaveMs, featureFlags, diagnostics }
 * - meta: { version }
 */

const DEFAULT_PREFS = {
  theme: 'light',
  fontSize: 15,
  autosaveMs: 800,
  featureFlags: {
    backlinks: true,
    searchFilters: true
  }
};

const DEFAULT_META = { version: 1 };

const StorageCtx = createContext(null);

// PUBLIC_INTERFACE
export function StorageProvider({ children }) {
  /**
   * Provider that manages offline persistence (IndexedDB with localStorage fallback),
   * selection, UI state, and offers actions to manipulate the tree and documents.
   */
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [theme, setTheme] = useState('light');
  const [nodes, setNodes] = useState([]); // array
  const [docs, setDocs] = useState({});   // id -> doc
  const [meta, setMeta] = useState(DEFAULT_META);
  const [selectedId, setSelectedId] = useState(null);
  const [uiState, setUIStateBase] = useState({
    searchOpen: false,
    importExportOpen: false,
    settingsOpen: false,
    helpOpen: false,
    createUnderSelected: false
  });

  // Undo/redo stacks for structure changes
  const structUndo = useRef([]);
  const structRedo = useRef([]);

  // Init load
  useEffect(() => {
    (async () => {
      let loaded = null;
      try {
        if (await idbAvailable()) {
          const all = await idbGetAll();
          loaded = all;
        }
      } catch(e) {
        // ignore and fallback
      }
      if (!loaded) {
        const raw = localStorage.getItem('offline-doc-tracker');
        if (raw) {
          try { loaded = JSON.parse(raw); } catch { /* ignore */ }
        }
      }
      if (loaded) {
        setNodes(loaded.nodes || []);
        setDocs(loaded.docs || {});
        setPrefs({ ...DEFAULT_PREFS, ...(loaded.prefs || {}) });
        setTheme((loaded.prefs && loaded.prefs.theme) || 'light');
        setMeta({ ...DEFAULT_META, ...(loaded.meta || {}) });
        setSelectedId(loaded.selectedId || null);
      }
      setReady(true);
    })();
  }, []);

  // Persist debounced
  const persist = useMemo(() => debounce(async (state) => {
    const payload = JSON.parse(JSON.stringify(state));
    try {
      if (await idbAvailable()) {
        await idbPutAll(payload);
      }
    } catch (e) {
      // ignore idb error and still try localStorage
    }
    try {
      localStorage.setItem('offline-doc-tracker', JSON.stringify(payload));
    } catch (e) {
      // storage full or blocked
      console.warn('localStorage persist failed:', e);
    }
  }, 400), []);

  useEffect(() => {
    if (!ready) return;
    persist({ nodes, docs, prefs: {...prefs, theme}, meta, selectedId });
  }, [ready, nodes, docs, prefs, theme, meta, selectedId, persist]);

  // PUBLIC_INTERFACE
  const initBootstrapIfNeeded = useCallback(() => {
    if (nodes.length > 0) return;
    // Bootstrap initial state
    const rootId = uuidv4();
    const docId = uuidv4();
    const now = Date.now();
    const initialNodes = [
      { id: rootId, type: 'folder', parentId: null, title: 'My Notes', order: 0, tags: [], updatedAt: now },
      { id: docId, type: 'doc', parentId: rootId, title: 'Welcome', order: 0, tags: ['getting-started'], updatedAt: now }
    ];
    const initialDocs = {
      [docId]: {
        id: docId,
        content:
`# Welcome to Offline Document Tracker

This app runs fully offline and stores your data locally.

Tips:
- Ctrl/Cmd+N: New document
- Ctrl/Cmd+S: Save
- Ctrl/Cmd+F: Search
- Ctrl/Cmd+B: Backup (Import/Export)
- Ctrl/Cmd+,: Settings

Select a document from the left to begin.`,
        references: [],
        updatedAt: now,
        history: []
      }
    };
    setNodes(initialNodes);
    setDocs(initialDocs);
    setSelectedId(docId);
  }, [nodes.length]);

  // PUBLIC_INTERFACE
  const setUIState = useCallback((partial) => {
    setUIStateBase(prev => ({ ...prev, ...partial }));
  }, []);

  // Structure operations with undo/redo
  const commitStruct = useCallback((nextNodes, actionLabel) => {
    structUndo.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), label: actionLabel });
    structRedo.current = [];
    setNodes(nextNodes);
  }, [nodes]);

  // PUBLIC_INTERFACE
  const undoStruct = useCallback(() => {
    const prev = structUndo.current.pop();
    if (!prev) return;
    structRedo.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), label: 'redo' });
    setNodes(prev.nodes);
  }, [nodes]);

  // PUBLIC_INTERFACE
  const redoStruct = useCallback(() => {
    const next = structRedo.current.pop();
    if (!next) return;
    structUndo.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), label: 'undo' });
    setNodes(next.nodes);
  }, [nodes]);

  // PUBLIC_INTERFACE
  const createNode = useCallback(({ type, parentId, title }) => {
    const id = uuidv4();
    const now = Date.now();
    const siblings = nodes.filter(n => n.parentId === parentId);
    const order = siblings.length;
    const newNode = { id, type, parentId: parentId || null, title: title || (type === 'folder' ? 'New Folder' : 'New Document'), order, tags: [], updatedAt: now };
    const next = [...nodes, newNode];
    commitStruct(next, 'createNode');
    if (type === 'doc') {
      setDocs(prev => ({ ...prev, [id]: { id, content: '', references: [], updatedAt: now, history: [] }}));
      setSelectedId(id);
    }
    return id;
  }, [nodes, commitStruct]);

  // PUBLIC_INTERFACE
  const renameNode = useCallback((id, title) => {
    const now = Date.now();
    const next = nodes.map(n => n.id === id ? { ...n, title, updatedAt: now } : n);
    commitStruct(next, 'renameNode');
  }, [nodes, commitStruct]);

  // PUBLIC_INTERFACE
  const deleteNode = useCallback((id) => {
    // recursive delete of descendants
    const toDelete = new Set();
    const collect = (nodeId) => {
      toDelete.add(nodeId);
      nodes.filter(n => n.parentId === nodeId).forEach(n => collect(n.id));
    };
    collect(id);
    const nextNodes = nodes.filter(n => !toDelete.has(n.id));
    commitStruct(nextNodes, 'deleteNode');
    setDocs(prev => {
      const copy = { ...prev };
      for (const nid of toDelete) {
        if (copy[nid]) delete copy[nid];
      }
      // remove references to deleted docs
      Object.keys(copy).forEach(did => {
        copy[did].references = (copy[did].references || []).filter(r => !toDelete.has(r));
      });
      return copy;
    });
    if (toDelete.has(selectedId)) {
      setSelectedId(null);
    }
  }, [nodes, commitStruct, selectedId]);

  // PUBLIC_INTERFACE
  const moveNode = useCallback((id, newParentId, newOrder) => {
    const target = nodes.find(n => n.id === id);
    if (!target) return;
    const sameParentSiblings = nodes.filter(n => n.parentId === newParentId && n.id !== id).sort((a,b)=>a.order-b.order);
    sameParentSiblings.splice(Math.min(Math.max(newOrder,0), sameParentSiblings.length), 0, target);
    const updatedOrders = sameParentSiblings.map((n, idx) => ({ ...n, parentId: newParentId || null, order: idx, updatedAt: Date.now() }));
    const ids = new Set(updatedOrders.map(n => n.id));
    const next = nodes.map(n => ids.has(n.id) ? updatedOrders.find(x=>x.id===n.id) : n);
    commitStruct(next, 'moveNode');
  }, [nodes, commitStruct]);

  // PUBLIC_INTERFACE
  const selectById = useCallback((id) => {
    setSelectedId(id || null);
    if (id) {
      window.location.hash = `#doc/${id}`;
    }
  }, []);

  // Document editing with autosave and undo stack per doc
  const updateDocContent = useCallback((id, updater, opts = { pushHistory: true }) => {
    setDocs(prev => {
      const existing = prev[id] || { id, content:'', references:[], updatedAt: Date.now(), history: [] };
      const next = typeof updater === 'function' ? updater(existing) : updater;
      const now = Date.now();
      let history = existing.history || [];
      if (opts.pushHistory) {
        history = [...history, { content: existing.content, ts: now }];
        if (history.length > 100) history.shift();
      }
      return { ...prev, [id]: { ...existing, ...next, updatedAt: now, history } };
    });
  }, []);

  // PUBLIC_INTERFACE
  const undoDoc = useCallback((id) => {
    setDocs(prev => {
      const d = prev[id];
      if (!d || !d.history || d.history.length === 0) return prev;
      const last = d.history[d.history.length - 1];
      const rest = d.history.slice(0, -1);
      return { ...prev, [id]: { ...d, content: last.content, history: rest, updatedAt: Date.now() } };
    });
  }, []);

  // PUBLIC_INTERFACE
  const redoDoc = useCallback((_id) => {
    // Simple implementation: Not maintaining forward stack; skipped to keep bundle minimal
    // Could be extended by tracking separate redo stack.
  }, []);

  // PUBLIC_INTERFACE
  const addReference = useCallback((fromId, toId) => {
    if (!toId || fromId === toId) return;
    setDocs(prev => {
      const d = prev[fromId] || { id: fromId, content:'', references:[], updatedAt: Date.now(), history: [] };
      const refs = new Set(d.references || []);
      refs.add(toId);
      return { ...prev, [fromId]: { ...d, references: Array.from(refs), updatedAt: Date.now() } };
    });
  }, []);

  // PUBLIC_INTERFACE
  const removeReference = useCallback((fromId, toId) => {
    setDocs(prev => {
      const d = prev[fromId];
      if (!d) return prev;
      return { ...prev, [fromId]: { ...d, references: (d.references||[]).filter(x=>x!==toId), updatedAt: Date.now() } };
    });
  }, []);

  // PUBLIC_INTERFACE
  const exportAll = useCallback(async () => {
    const payload = { nodes, docs, prefs: { ...prefs, theme }, meta: { ...meta, exportedAt: Date.now() }, selectedId };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-docs-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, docs, prefs, theme, meta, selectedId]);

  // PUBLIC_INTERFACE
  const importAll = useCallback(async (jsonText, { merge = true } = {}) => {
    let incoming = null;
    try { incoming = JSON.parse(jsonText); } catch (e) { throw new Error('Invalid JSON'); }
    if (!incoming || !incoming.nodes || !incoming.docs) throw new Error('Missing nodes/docs in file');

    if (!merge) {
      setNodes(incoming.nodes);
      setDocs(incoming.docs);
      setPrefs({ ...DEFAULT_PREFS, ...(incoming.prefs || {}) });
      setTheme((incoming.prefs && incoming.prefs.theme) || 'light');
      setMeta({ ...DEFAULT_META, ...(incoming.meta || {}) });
      setSelectedId(incoming.selectedId || null);
      return;
    }

    // Merge strategy: preserve local, append incoming new ids, update conflicts by most recent updatedAt
    const localNodesById = Object.fromEntries(nodes.map(n => [n.id, n]));
    const nextNodesMap = { ...localNodesById };
    incoming.nodes.forEach(n => {
      const existing = nextNodesMap[n.id];
      if (!existing || (n.updatedAt || 0) > (existing.updatedAt || 0)) {
        nextNodesMap[n.id] = n;
      }
    });
    const nextNodes = Object.values(nextNodesMap).sort((a,b)=> (a.parentId === b.parentId) ? (a.order - b.order) : ((a.parentId||'').localeCompare(b.parentId||'')));

    const nextDocs = { ...docs };
    Object.keys(incoming.docs).forEach(id => {
      const inc = incoming.docs[id];
      const existing = nextDocs[id];
      if (!existing || (inc.updatedAt || 0) > (existing.updatedAt || 0)) {
        nextDocs[id] = inc;
      }
    });

    setNodes(nextNodes);
    setDocs(nextDocs);
    setPrefs(prev => ({ ...prev, ...(incoming.prefs || {}) }));
    if (incoming.prefs && incoming.prefs.theme) setTheme(incoming.prefs.theme);
    setMeta(prev => ({ ...prev, ...(incoming.meta || {}) }));
    if (incoming.selectedId) setSelectedId(incoming.selectedId);
  }, [nodes, docs]);

  // PUBLIC_INTERFACE
  const diagnostics = useCallback(async () => {
    const out = {
      idbAvailable: false,
      quota: null,
      persisted: false
    };
    try {
      out.idbAvailable = await idbAvailable();
    } catch {}
    try {
      if (navigator.storage && navigator.storage.estimate) {
        out.quota = await navigator.storage.estimate();
      }
    } catch {}
    try {
      if (navigator.storage && navigator.storage.persist) {
        out.persisted = await navigator.storage.persist();
      }
    } catch {}
    return out;
  }, []);

  const value = useMemo(() => ({
    ready,
    nodes, docs, prefs, theme, meta, selectedId, uiState,
    setPrefs, setTheme, setUIState,
    selectById, createNode, renameNode, deleteNode, moveNode,
    updateDocContent, undoDoc, redoDoc,
    addReference, removeReference,
    exportAll, importAll,
    undoStruct, redoStruct,
    initBootstrapIfNeeded,
    diagnostics
  }), [
    ready, nodes, docs, prefs, theme, meta, selectedId, uiState,
    setPrefs, setTheme, setUIState,
    selectById, createNode, renameNode, deleteNode, moveNode,
    updateDocContent, undoDoc, redoDoc,
    addReference, removeReference,
    exportAll, importAll,
    undoStruct, redoStruct,
    initBootstrapIfNeeded,
    diagnostics
  ]);

  return <StorageCtx.Provider value={value}>{children}</StorageCtx.Provider>;
}

// PUBLIC_INTERFACE
export function useStorage() {
  /** Hook to consume storage API */
  const ctx = useContext(StorageCtx);
  if (!ctx) throw new Error('useStorage must be used within StorageProvider');
  return ctx;
}
