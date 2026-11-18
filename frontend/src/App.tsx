import { useState, useCallback, useEffect, useRef } from 'react';
import type { FileInfo, FolderInfo, Breadcrumb, ViewMode, SortConfig, ContextMenuState, UploadEntry } from './types';
import { getFolderContents } from './api/folders';
import { uploadFiles } from './api/files';
import Sidebar from './components/layout/Sidebar';
import Toolbar from './components/navigation/Toolbar';
import ExplorerView from './components/explorer/ExplorerView';
import ContextMenu from './components/context-menu/ContextMenu';
import UploadPanel from './components/upload/UploadPanel';
import DragOverlay from './components/upload/DragOverlay';
import CreateFolderDialog from './components/dialogs/CreateFolderDialog';
import RenameDialog from './components/dialogs/RenameDialog';
import DeleteConfirmDialog from './components/dialogs/DeleteConfirmDialog';
import FileInfoDialog from './components/dialogs/FileInfoDialog';
import AiResultDialog from './components/dialogs/AiResultDialog';
import ToastContainer from './components/layout/ToastContainer';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  // --- Core navigation state ---
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ name: 'Root', id: null }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Navigation history (back/forward) ---
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // --- View state ---
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  // --- Selection state ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Context menu ---
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, item: null, itemType: null,
  });

  // --- Dialogs ---
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ item: FileInfo | FolderInfo; type: 'file' | 'folder' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ item: FileInfo | FolderInfo; type: 'file' | 'folder' } | null>(null);
  const [fileInfoTarget, setFileInfoTarget] = useState<FileInfo | null>(null);
  const [aiResult, setAiResult] = useState<{ title: string; content: string; fileId: string } | null>(null);

  // --- Uploads ---
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // --- Drag-and-drop (file upload from desktop) ---
  const [dragOverExplorer, setDragOverExplorer] = useState(false);
  const dragCounter = useRef(0);

  // --- Toasts ---
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // --- Load folder contents ---
  const loadFolder = useCallback(async (folderId: string | null) => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const data = await getFolderContents(folderId);
      setFolders(data.folders);
      setFiles(data.files);
      setBreadcrumbs(data.breadcrumbs);
      setCurrentFolderId(folderId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load folder';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    loadFolder(null);
  }, [loadFolder]);

  // --- Navigate to a folder (with history) ---
  const navigateToFolder = useCallback((folderId: string | null) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(folderId);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
    loadFolder(folderId);
  }, [historyIndex, loadFolder]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadFolder(history[newIndex]);
    }
  }, [historyIndex, history, loadFolder]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadFolder(history[newIndex]);
    }
  }, [historyIndex, history, loadFolder]);

  const goUp = useCallback(() => {
    // Navigate to the parent of the current folder
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      navigateToFolder(parentBreadcrumb.id);
    }
  }, [breadcrumbs, navigateToFolder]);

  const refresh = useCallback(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, loadFolder]);

  // --- Selection handlers ---
  const handleSelect = useCallback((id: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Toggle individual
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else if (event.shiftKey) {
      // Range select: select all items from the last selected to this one
      const allItems = [...folders.map(f => f.id), ...files.map(f => f.id)];
      const lastSelected = [...selectedIds].pop();
      if (lastSelected) {
        const fromIndex = allItems.indexOf(lastSelected);
        const toIndex = allItems.indexOf(id);
        if (fromIndex !== -1 && toIndex !== -1) {
          const start = Math.min(fromIndex, toIndex);
          const end = Math.max(fromIndex, toIndex);
          const rangeIds = allItems.slice(start, end + 1);
          setSelectedIds(prev => {
            const next = new Set(prev);
            rangeIds.forEach(rid => next.add(rid));
            return next;
          });
          return;
        }
      }
      setSelectedIds(new Set([id]));
    } else {
      setSelectedIds(new Set([id]));
    }
  }, [folders, files, selectedIds]);

  const handleCheckboxToggle = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = [...folders.map(f => f.id), ...files.map(f => f.id)];
    setSelectedIds(new Set(allIds));
  }, [folders, files]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // --- Context menu ---
  const handleContextMenu = useCallback((
    event: React.MouseEvent,
    item: FileInfo | FolderInfo,
    itemType: 'file' | 'folder'
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // If right-clicking an unselected item, select just it.
    // If it's already selected, keep the multi-selection.
    if (!selectedIds.has(item.id)) {
      setSelectedIds(new Set([item.id]));
    }

    // Position within viewport
    const x = Math.min(event.clientX, window.innerWidth - 200);
    const y = Math.min(event.clientY, window.innerHeight - 300);

    setContextMenu({ visible: true, x, y, item, itemType });
  }, [selectedIds]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // Close context menu on click outside or Escape
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible, closeContextMenu]);

  // --- Upload handler ---
  const handleUploadFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setShowUploadPanel(true);

    const newEntries: UploadEntry[] = fileList.map(f => ({
      id: Date.now().toString() + Math.random().toString(36),
      file: f,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploads(prev => [...prev, ...newEntries]);

    // Upload each file individually so we get per-file progress
    for (const entry of newEntries) {
      setUploads(prev => prev.map(u =>
        u.id === entry.id ? { ...u, status: 'uploading' } : u
      ));

      try {
        await uploadFiles(
          [entry.file],
          currentFolderId,
          (progress) => {
            setUploads(prev => prev.map(u =>
              u.id === entry.id ? { ...u, progress } : u
            ));
          }
        );
        setUploads(prev => prev.map(u =>
          u.id === entry.id ? { ...u, progress: 100, status: 'success' } : u
        ));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploads(prev => prev.map(u =>
          u.id === entry.id ? { ...u, status: 'error', error: msg } : u
        ));
        addToast(`Upload failed: ${entry.file.name}`, 'error');
      }
    }

    // Refresh folder after all uploads complete
    refresh();
    addToast(`${fileList.length} file(s) uploaded`, 'success');
  }, [currentFolderId, refresh, addToast]);

  // File picker
  const handleFilePickerUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleUploadFiles(Array.from(target.files));
      }
    };
    input.click();
  }, [handleUploadFiles]);

  // --- Drag-and-drop from desktop ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragOverExplorer(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverExplorer(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragOverExplorer(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleUploadFiles]);

  // --- Search filter ---
  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Sorting ---
  const sortItems = useCallback(<T extends FileInfo | FolderInfo>(items: T[], isFolder: boolean): T[] => {
    return [...items].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      switch (sortConfig.field) {
        case 'name': {
          const nameA = isFolder ? (a as FolderInfo).name : (a as FileInfo).filename;
          const nameB = isFolder ? (b as FolderInfo).name : (b as FileInfo).filename;
          return nameA.localeCompare(nameB) * dir;
        }
        case 'size': {
          if (isFolder) return 0;
          const sizeA = (a as FileInfo).size_bytes || 0;
          const sizeB = (b as FileInfo).size_bytes || 0;
          return (sizeA - sizeB) * dir;
        }
        case 'date': {
          const dateA = a.date_created || '';
          const dateB = b.date_created || '';
          return dateA.localeCompare(dateB) * dir;
        }
        default:
          return 0;
      }
    });
  }, [sortConfig]);

  const sortedFolders = sortItems(filteredFolders, true);
  const sortedFiles = sortItems(filteredFiles, false);

  return (
    <div className="app-layout">
      <div className="app-body">
        <Sidebar
          onNavigateRoot={() => navigateToFolder(null)}
          currentFolderId={currentFolderId}
        />
        <div className="main-content">
          <Toolbar
            breadcrumbs={breadcrumbs}
            onBreadcrumbClick={(id) => navigateToFolder(id)}
            onBack={goBack}
            onForward={goForward}
            onUp={goUp}
            onRefresh={refresh}
            canGoBack={historyIndex > 0}
            canGoForward={historyIndex < history.length - 1}
            canGoUp={breadcrumbs.length > 1}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onUpload={handleFilePickerUpload}
            onCreateFolder={() => setCreateFolderOpen(true)}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
          />

          {selectedIds.size > 0 && (
            <div className="selection-bar">
              <span>{selectedIds.size} item(s) selected</span>
              <button onClick={selectAll}>Select all</button>
              <button onClick={clearSelection}>Clear selection</button>
            </div>
          )}

          <div
            className="explorer-container"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {dragOverExplorer && <DragOverlay />}
            <ExplorerView
              folders={sortedFolders}
              files={sortedFiles}
              viewMode={viewMode}
              loading={loading}
              error={error}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onCheckboxToggle={handleCheckboxToggle}
              onDoubleClickFolder={navigateToFolder}
              onContextMenu={handleContextMenu}
              onRetry={refresh}
              currentFolderId={currentFolderId}
              onMoveComplete={refresh}
              addToast={addToast}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
            />
          </div>

          <div className="status-bar">
            <span>{folders.length} folder(s), {files.length} file(s)</span>
            <span>{viewMode === 'grid' ? 'Grid view' : 'List view'}</span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.item && contextMenu.itemType && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          itemType={contextMenu.itemType}
          onClose={closeContextMenu}
          onDownload={() => {}}
          onRename={(item, type) => setRenameTarget({ item, type })}
          onDelete={(item, type) => setDeleteTarget({ item, type })}
          onFileInfo={(item) => setFileInfoTarget(item as FileInfo)}
          onSummarize={() => {}}
          onOcr={() => {}}
          onOpen={(item) => navigateToFolder(item.id)}
          onRefresh={refresh}
          addToast={addToast}
          setAiResult={setAiResult}
        />
      )}

      {/* Upload Panel */}
      {showUploadPanel && uploads.length > 0 && (
        <UploadPanel
          uploads={uploads}
          onClose={() => {
            setShowUploadPanel(false);
            setUploads(prev => prev.filter(u => u.status !== 'success'));
          }}
          onClear={() => setUploads([])}
        />
      )}

      {/* Dialogs */}
      {createFolderOpen && (
        <CreateFolderDialog
          parentFolderId={currentFolderId}
          onClose={() => setCreateFolderOpen(false)}
          onCreated={() => { setCreateFolderOpen(false); refresh(); addToast('Folder created', 'success'); }}
        />
      )}

      {renameTarget && (
        <RenameDialog
          item={renameTarget.item}
          itemType={renameTarget.type}
          onClose={() => setRenameTarget(null)}
          onRenamed={() => { setRenameTarget(null); refresh(); addToast('Renamed successfully', 'success'); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          item={deleteTarget.item}
          itemType={deleteTarget.type}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); refresh(); addToast('Deleted successfully', 'success'); }}
        />
      )}

      {fileInfoTarget && (
        <FileInfoDialog
          file={fileInfoTarget}
          onClose={() => setFileInfoTarget(null)}
        />
      )}

      {aiResult && (
        <AiResultDialog
          title={aiResult.title}
          content={aiResult.content}
          onClose={() => setAiResult(null)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
