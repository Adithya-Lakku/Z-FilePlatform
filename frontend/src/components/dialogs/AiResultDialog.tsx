import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface AiResultDialogProps {
  title: string;
  content: string;
  onClose: () => void;
}

export const AiResultDialog: React.FC<AiResultDialogProps> = ({
  title,
  content,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" style={{ maxWidth: '640px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="dialog-body">
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              maxHeight: '340px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)',
            }}
          >
            {content}
          </div>
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="dialog-btn secondary"
            onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
          <button type="button" className="dialog-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiResultDialog;
