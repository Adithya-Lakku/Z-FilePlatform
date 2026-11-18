import React, { useState, useEffect, useRef } from 'react';
import { createFolder } from '../../api/folders';

interface CreateFolderDialogProps {
  parentFolderId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  parentFolderId,
  onClose,
  onCreated,
}) => {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) {
      setError('Folder name cannot be empty');
      return;
    }
    if (trimmed.includes('/')) {
      setError('Folder name cannot contain slashes');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createFolder(trimmed, parentFolderId);
      onCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create folder';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Folder</h2>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <p>Enter the name for the new folder:</p>
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder Name"
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
              disabled={loading || !folderName.trim()}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderDialog;
