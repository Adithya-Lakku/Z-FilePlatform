import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import type { UploadEntry } from '../../types';

interface UploadPanelProps {
  uploads: UploadEntry[];
  onClose: () => void;
  onClear: () => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  uploads,
  onClose,
}) => {
  return (
    <div className="upload-panel">
      <div className="upload-panel-header">
        <span>Uploads ({uploads.length})</span>
        <button onClick={onClose} title="Close upload panel">
          <X size={16} />
        </button>
      </div>

      <div className="upload-panel-list">
        {uploads.map((entry) => {
          const isSuccess = entry.status === 'success';
          const isError = entry.status === 'error';

          return (
            <div key={entry.id} className="upload-entry">
              <span className="upload-entry-name" title={entry.file.name}>
                {entry.file.name}
              </span>

              <div className="upload-entry-progress">
                <div
                  className={`upload-entry-progress-bar ${isSuccess ? 'success' : ''} ${isError ? 'error' : ''}`}
                  style={{ width: `${entry.progress}%` }}
                />
              </div>

              <span className="upload-entry-pct">
                {isSuccess && <CheckCircle size={14} style={{ color: 'var(--success)' }} />}
                {isError && <AlertCircle size={14} style={{ color: 'var(--error)' }} />}
                {!isSuccess && !isError && `${entry.progress}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UploadPanel;
