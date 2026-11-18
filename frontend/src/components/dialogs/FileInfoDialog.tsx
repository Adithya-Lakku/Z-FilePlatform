import React from 'react';
import type { FileInfo } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';

interface FileInfoDialogProps {
  file: FileInfo;
  onClose: () => void;
}

export const FileInfoDialog: React.FC<FileInfoDialogProps> = ({ file, onClose }) => {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>File Properties</h2>
        <div className="dialog-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Name: </span>
              <strong>{file.filename}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Size: </span>
              <span>{formatFileSize(file.size_bytes)} ({file.size_bytes} bytes)</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Created: </span>
              <span>{formatDate(file.date_created)}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>ID: </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{file.id}</span>
            </div>
            {file.filepath && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Disk Path: </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', wordBreak: 'break-all' }}>
                  {file.filepath}
                </span>
              </div>
            )}

            {/* File Metadata */}
            {file.file_metadata && Object.keys(file.file_metadata).length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Metadata:
                </span>
                <pre
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {JSON.stringify(file.file_metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileInfoDialog;
