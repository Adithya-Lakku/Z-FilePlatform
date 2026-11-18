import React, { useState, useEffect, useRef } from 'react';
import type { FileInfo, FolderInfo } from '../../types';
import { renameFile } from '../../api/files';
import { renameFolder } from '../../api/folders';

interface RenameDialogProps {
  item: FileInfo | FolderInfo;
  itemType: 'file' | 'folder';
  onClose: () => void;
  onRenamed: () => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  item,
  itemType,
  onClose,
  onRenamed,
}) => {
  const currentName = itemType === 'file' ? (item as FileInfo).filename : (item as FolderInfo).name;
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Select filename without extension for files
      if (itemType === 'file') {
        const lastDot = currentName.lastIndexOf('.');
        if (lastDot > 0) {
          inputRef.current.setSelectionRange(0, lastDot);
        } else {
          inputRef.current.select();
        }
      } else {
        inputRef.current.select();
      }
    }
  }, [currentName, itemType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }
    if (trimmed.includes('/')) {
      setError('Name cannot contain slashes');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (itemType === 'file') {
        await renameFile(item.id, trimmed);
      } else {
        await renameFolder(item.id, trimmed);
      }
      onRenamed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rename failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Rename {itemType === 'file' ? 'File' : 'Folder'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <p>Enter a new name for <strong>{currentName}</strong>:</p>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            {error && (
              <p style={{ color: 'var(--error)', marginTop: '8px', fontSize: '12px' }}>
                {error}
              </p>
            )}
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="dialog-btn secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dialog-btn primary"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameDialog;
