import React, { useState } from 'react';
import {
  Folder,
  File,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Check,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import type { FileInfo, FolderInfo, ViewMode, SortConfig } from '../../types';
import { formatFileSize, formatDate, getFileCategory } from '../../utils/formatters';
import { moveFile } from '../../api/files';
import { moveFolder } from '../../api/folders';

interface ExplorerViewProps {
  folders: FolderInfo[];
  files: FileInfo[];
  viewMode: ViewMode;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onCheckboxToggle: (id: string, event: React.MouseEvent) => void;
  onDoubleClickFolder: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, item: FileInfo | FolderInfo, itemType: 'file' | 'folder') => void;
  onRetry: () => void;
  currentFolderId: string | null;
  onMoveComplete: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  folders,
  files,
  viewMode,
  loading,
  error,
  selectedIds,
  onSelect,
  onCheckboxToggle,
  onDoubleClickFolder,
  onContextMenu,
  onRetry,
  onMoveComplete,
  addToast,
  sortConfig,
  onSortChange,
}) => {
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  const getFileIcon = (filename: string) => {
    const category = getFileCategory(filename);
    switch (category) {
      case 'image':
        return <ImageIcon className="file-icon-image" />;
      case 'pdf':
        return <FileText className="file-icon-pdf" />;
      case 'code':
        return <FileCode className="file-icon-code" />;
      case 'video':
        return <Film className="file-icon-video" />;
      case 'audio':
        return <Music className="file-icon-audio" />;
      case 'archive':
        return <Archive className="file-icon-archive" />;
      case 'text':
        return <FileText className="file-icon-text" />;
      default:
        return <File className="file-icon-default" />;
    }
  };

  // Internal drag-and-drop for moving items into folders
  const handleDragStart = (e: React.DragEvent, item: FileInfo | FolderInfo, itemType: 'file' | 'folder') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, itemType }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropTargetFolderId !== folderId) {
      setDropTargetFolderId(folderId);
    }
  };

  const handleDragLeaveFolder = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(null);
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(null);

    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    try {
      const { id, itemType } = JSON.parse(data);
      if (id === targetFolderId) return;

      if (itemType === 'file') {
        await moveFile(id, targetFolderId);
        addToast('File moved successfully', 'success');
        onMoveComplete();
      } else if (itemType === 'folder') {
        await moveFolder(id, targetFolderId);
        addToast('Folder moved successfully', 'success');
        onMoveComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Move failed';
      addToast(msg, 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading contents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <AlertCircle />
        <p>{error}</p>
        <button onClick={onRetry}>Retry</button>
      </div>
    );
  }

  const isEmpty = folders.length === 0 && files.length === 0;
  if (isEmpty) {
    return (
      <div className="empty-state">
        <FolderOpen />
        <h3>This folder is empty</h3>
        <p>Drag and drop files here, or use the Upload button above.</p>
      </div>
    );
  }

  // --- Grid View ---
  if (viewMode === 'grid') {
    return (
      <div className="file-grid">
        {/* Folders */}
        {folders.map((folder) => {
          const isSelected = selectedIds.has(folder.id);
          const isDragOver = dropTargetFolderId === folder.id;

          return (
            <div
              key={folder.id}
              className={`file-grid-item ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onClick={(e) => onSelect(folder.id, e)}
              onDoubleClick={() => onDoubleClickFolder(folder.id)}
              onContextMenu={(e) => onContextMenu(e, folder, 'folder')}
              draggable
              onDragStart={(e) => handleDragStart(e, folder, 'folder')}
              onDragOver={(e) => handleDragOverFolder(e, folder.id)}
              onDragLeave={handleDragLeaveFolder}
              onDrop={(e) => handleDropOnFolder(e, folder.id)}
              title={folder.name}
            >
              <div
                className="item-checkbox"
                onClick={(e) => onCheckboxToggle(folder.id, e)}
              >
                {isSelected && <Check size={12} />}
              </div>
              <div className="item-icon">
                <Folder className="folder-icon" />
              </div>
              <span className="item-name">{folder.name}</span>
            </div>
          );
        })}

        {/* Files */}
        {files.map((file) => {
          const isSelected = selectedIds.has(file.id);

          return (
            <div
              key={file.id}
              className={`file-grid-item ${isSelected ? 'selected' : ''}`}
              onClick={(e) => onSelect(file.id, e)}
              onContextMenu={(e) => onContextMenu(e, file, 'file')}
              draggable
              onDragStart={(e) => handleDragStart(e, file, 'file')}
              title={`${file.filename} (${formatFileSize(file.size_bytes)})`}
            >
              <div
                className="item-checkbox"
                onClick={(e) => onCheckboxToggle(file.id, e)}
              >
                {isSelected && <Check size={12} />}
              </div>
              <div className="item-icon">
                {getFileIcon(file.filename)}
              </div>
              <span className="item-name">{file.filename}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // --- List View ---
  const handleSortHeader = (field: SortConfig['field']) => {
    if (sortConfig.field === field) {
      onSortChange({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      onSortChange({ field, direction: 'asc' });
    }
  };

  const getSortIndicator = (field: SortConfig['field']) => {
    if (sortConfig.field !== field) return null;
    return <span className="sort-indicator">{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>;
  };

  return (
    <div className="file-list">
      <div className="file-list-header">
        <span />
        <span onClick={() => handleSortHeader('name')}>
          Name {getSortIndicator('name')}
        </span>
        <span onClick={() => handleSortHeader('size')}>
          Size {getSortIndicator('size')}
        </span>
        <span onClick={() => handleSortHeader('date')}>
          Modified {getSortIndicator('date')}
        </span>
      </div>

      {/* Folders in list */}
      {folders.map((folder) => {
        const isSelected = selectedIds.has(folder.id);
        const isDragOver = dropTargetFolderId === folder.id;

        return (
          <div
            key={folder.id}
            className={`file-list-item ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
            onClick={(e) => onSelect(folder.id, e)}
            onDoubleClick={() => onDoubleClickFolder(folder.id)}
            onContextMenu={(e) => onContextMenu(e, folder, 'folder')}
            draggable
            onDragStart={(e) => handleDragStart(e, folder, 'folder')}
            onDragOver={(e) => handleDragOverFolder(e, folder.id)}
            onDragLeave={handleDragLeaveFolder}
            onDrop={(e) => handleDropOnFolder(e, folder.id)}
          >
            <div
              className="item-checkbox"
              onClick={(e) => onCheckboxToggle(folder.id, e)}
            >
              {isSelected && <Check size={10} />}
            </div>
            <div className="item-info">
              <Folder size={18} className="folder-icon" />
              <span className="item-name">{folder.name}</span>
            </div>
            <span className="item-size">—</span>
            <span className="item-date">{formatDate(folder.date_created)}</span>
          </div>
        );
      })}

      {/* Files in list */}
      {files.map((file) => {
        const isSelected = selectedIds.has(file.id);

        return (
          <div
            key={file.id}
            className={`file-list-item ${isSelected ? 'selected' : ''}`}
            onClick={(e) => onSelect(file.id, e)}
            onContextMenu={(e) => onContextMenu(e, file, 'file')}
            draggable
            onDragStart={(e) => handleDragStart(e, file, 'file')}
          >
            <div
              className="item-checkbox"
              onClick={(e) => onCheckboxToggle(file.id, e)}
            >
              {isSelected && <Check size={10} />}
            </div>
            <div className="item-info">
              {getFileIcon(file.filename)}
              <span className="item-name">{file.filename}</span>
            </div>
            <span className="item-size">{formatFileSize(file.size_bytes)}</span>
            <span className="item-date">{formatDate(file.date_created)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ExplorerView;
