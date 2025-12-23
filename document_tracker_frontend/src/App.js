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

  const [hash, setHash] = useState(window.location.hash || '');
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '');
    window.addEventListener('hashchange', onHashChange);
    // Navigate to doc from hash: #doc/<id>
    if (hash.startsWith('#doc/')) {
      const id = hash.replace('#doc/', '');
      selectById(id);
    }
    return () => window.removeEventListener('hashchange', onHashChange);
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
