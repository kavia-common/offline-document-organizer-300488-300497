import React, { useMemo, useState } from 'react';
import { useStorage } from '../store/storage';

// PUBLIC_INTERFACE
export function TreePane() {
  const { nodes, selectedId, selectById, createNode, renameNode, deleteNode, moveNode, uiState, setUIState } = useStorage();
  const [expanded, setExpanded] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null); // node id awaiting confirmation

  const roots = useMemo(() => nodes.filter(n => n.parentId === null).sort((a,b)=>a.order-b.order), [nodes]);
  const childrenOf = (id) => nodes.filter(n => n.parentId === id).sort((a,b)=>a.order-b.order);

  const toggle = (id) => setExpanded(prev => ({...prev, [id]: !prev[id]}));

  const onCreateUnder = (parentId, type='doc') => {
    const id = createNode({ type, parentId });
    if (type === 'doc') selectById(id);
    setExpanded(prev => ({...prev, [parentId]: true}));
    setUIState({ createUnderSelected:false });
  };

  const Item = ({ node, level }) => {
    const isFolder = node.type === 'folder';
    const isExpanded = !!expanded[node.id];
    const hasKids = childrenOf(node.id).length > 0;
    const pad = 8 + level * 14;
    const confirmOpen = pendingDelete === node.id;

    return (
      <div>
        <div
          onClick={() => isFolder ? toggle(node.id) : selectById(node.id)}
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding: '6px 8px', paddingLeft: pad,
            cursor:'pointer',
            background: selectedId === node.id ? 'rgba(59,130,246,0.1)' : 'transparent'
          }}
        >
          <span style={{width:16, textAlign:'center'}}>{isFolder ? (isExpanded ? '📂' : '📁') : '📝'}</span>
          <span style={{flex:1}} title={node.title}>{node.title}</span>
          <button className="btn-ghost" title="Rename" onClick={(e)=>{e.stopPropagation(); const t=window.prompt('New name', node.title); if (t!=null) renameNode(node.id, t);}}>✏️</button>
          <button className="btn-ghost" title="New doc" onClick={(e)=>{e.stopPropagation(); onCreateUnder(isFolder ? node.id : node.parentId, 'doc');}}>➕📝</button>
          <button className="btn-ghost" title="New folder" onClick={(e)=>{e.stopPropagation(); onCreateUnder(isFolder ? node.id : node.parentId, 'folder');}}>➕📁</button>
          {!confirmOpen && (
            <button
              className="btn-ghost danger"
              title="Delete"
              onClick={(e)=>{e.stopPropagation(); setPendingDelete(node.id);}}
            >🗑️</button>
          )}
        </div>
        {confirmOpen && (
          <div style={{display:'flex', gap:8, paddingLeft: 8 + level * 14, padding:'6px 8px'}}>
            <span>Delete “{node.title}” and its children?</span>
            <button className="btn" onClick={(e)=>{e.stopPropagation(); deleteNode(node.id); setPendingDelete(null);}}>Delete</button>
            <button className="btn-ghost" onClick={(e)=>{e.stopPropagation(); setPendingDelete(null);}}>Cancel</button>
          </div>
        )}
        {isFolder && isExpanded && hasKids && (
          <div>
            {childrenOf(node.id).map(ch => <Item key={ch.id} node={ch} level={level+1} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{display:'flex', gap:6, padding:8, borderBottom:`1px solid var(--border-color)`}}>
        <button className="btn" onClick={()=>onCreateUnder(null,'folder')}>New Folder</button>
        <button className="btn" onClick={()=>onCreateUnder(null,'doc')}>New Doc</button>
      </div>
      <div>
        {roots.map(r => <Item key={r.id} node={r} level={0} />)}
      </div>
    </div>
  );
}
