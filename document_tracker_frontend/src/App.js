import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './App.css';
import './index.css';
import { StorageProvider, useStorage } from './store/storage';
import { TreePane } from './components/TreePane';
import { EditorPane } from './components/EditorPane';
import { TopBar } from './components/TopBar';
import { SearchModal } from './components/SearchModal';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpAboutModal } from './components/HelpAboutModal';

// PUBLIC_INTERFACE
function AppShell() {
  /**
   * This component renders the two-pane layout and global modals.
   * It connects to the storage provider for state and actions.
   */
  const {
    theme,
    setTheme,
    initBootstrapIfNeeded,
    selectedId,
    selectById,
    uiState,
    setUIState,
  } = useStorage();

  // Apply theme to root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Bootstrap default data on first run
  useEffect(() => {
    initBootstrapIfNeeded();
  }, [initBootstrapIfNeeded]);

  // Track and react to hash changes: supports #doc/<id> and #doc=<id>
  const [hash, setHash] = useState(window.location.hash || '');
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!hash) return;
    if (hash.startsWith('#doc/')) {
      const id = hash.replace('#doc/', '');
      selectById(id);
    } else if (hash.startsWith('#doc=')) {
      const id = hash.replace('#doc=', '');
      selectById(id);
    }
  }, [hash, selectById]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  const openSearch = useCallback(() => {
    setUIState({ searchOpen: true });
  }, [setUIState]);

  const openImportExport = useCallback(() => {
    setUIState({ importExportOpen: true });
  }, [setUIState]);

  const openSettings = useCallback(() => {
    setUIState({ settingsOpen: true });
  }, [setUIState]);

  const openHelp = useCallback(() => {
    setUIState({ helpOpen: true });
  }, [setUIState]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openSearch();
      } else if (mod && e.key.toLowerCase() === 's') {
        // handled inside editor via event, but prevent default
        e.preventDefault();
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setUIState({ createUnderSelected: true });
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        openImportExport();
      } else if (mod && e.key.toLowerCase() === ',') {
        e.preventDefault();
        openSettings();
      } else if (mod && e.key.toLowerCase() === '/' ) {
        e.preventDefault();
        openHelp();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch, openImportExport, openSettings, openHelp, setUIState]);

  // Simple toast system (non-destructive) for cross-component notifications
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      const msg = e.detail?.msg;
      if (!msg) return;
      setToast(msg);
      const timeout = setTimeout(() => setToast(null), 2200);
      return () => clearTimeout(timeout);
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  return (
    <div className="app-root" style={{display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-primary)', color:'var(--text-primary)'}}>
      <TopBar
        onToggleTheme={toggleTheme}
        theme={theme}
        onOpenSearch={openSearch}
        onOpenBackup={openImportExport}
        onOpenSettings={openSettings}
        onOpenHelp={openHelp}
      />
      <div className="two-pane" style={{display:'flex', flex:1, minHeight:0}}>
        <div className="pane-left" style={{width:280, minWidth:220, borderRight:`1px solid var(--border-color)`, background:'var(--bg-secondary)', overflow:'auto'}}>
          <TreePane />
        </div>
        <div className="pane-right" style={{flex:1, overflow:'hidden', position:'relative'}}>
          <EditorPane key={selectedId || 'none'} />
        </div>
      </div>

      {uiState.searchOpen && <SearchModal onClose={() => setUIState({searchOpen:false})} />}
      {uiState.importExportOpen && <ImportExportModal onClose={() => setUIState({importExportOpen:false})} />}
      {uiState.settingsOpen && <SettingsModal onClose={() => setUIState({settingsOpen:false})} />}
      {uiState.helpOpen && <HelpAboutModal onClose={() => setUIState({helpOpen:false})} />}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 12,
            bottom: 12,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            zIndex: 60,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** App entry point with providers. */
  return (
    <StorageProvider>
      <AppShell />
    </StorageProvider>
  );
}

export default App;
