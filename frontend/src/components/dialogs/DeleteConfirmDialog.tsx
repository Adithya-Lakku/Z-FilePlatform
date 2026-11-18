import React, { useState } from 'react';
import type { FileInfo, FolderInfo } from '../../types';
import { deleteFile } from '../../api/files';
import { deleteFolder } from '../../api/folders';

interface DeleteConfirmDialogProps {
  item: FileInfo | FolderInfo;
  itemType: 'file' | 'folder';
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  item,
  itemType,
  onClose,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = itemType === 'file' ? (item as FileInfo).filename : (item as FolderInfo).name;
  const isFolder = itemType === 'folder';

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isFolder) {
        await deleteFolder(item.id);
      } else {
        await deleteFile(item.id);
      }
      onDeleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Confirm Deletion</h2>
        <div className="dialog-body">
          <p>
            Are you sure you want to delete <strong>{name}</strong>?
          </p>
          {isFolder && (
            <p style={{ color: 'var(--warning)', fontSize: '12px' }}>
              ⚠️ Deleting this folder will permanently delete all files and subfolders contained within it.
            </p>
          )}
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
            type="button"
            className="dialog-btn danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
