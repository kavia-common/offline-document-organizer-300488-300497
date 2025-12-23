# Offline Document Tracker (React)

A fully offline single‑page app to organize and edit text documents with a virtual folder tree, references, search, and backup. Runs with no backend or network calls.

## Quick start
- npm start — dev server on http://localhost:3000
- npm run build — produces a build that works via file:// open
- Data is stored in IndexedDB with localStorage fallback

## Features
- Two‑pane layout: folder/doc tree (left) and editor + references (right)
- Create, rename, move, and delete folders/documents
- Rich text via textarea, debounced autosave, per‑doc undo
- References and backlinks
- Advanced search (titles, tags, content) with filters and highlighting
- Import/Export backup to one JSON file; merge or replace
- Keyboard: Ctrl/Cmd+N (new doc), Ctrl/Cmd+S (save), Ctrl/Cmd+F (search), Ctrl/Cmd+B (backup), Ctrl/Cmd+, (settings)
- Settings for theme, font size, autosave
- Self‑check diagnostics in Settings

No external services or runtime network dependencies.
