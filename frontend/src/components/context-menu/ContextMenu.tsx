import React from 'react';
import {
  FolderOpen,
  Download,
  Edit2,
  Trash2,
  Info,
  Sparkles,
  FileSearch
} from 'lucide-react';
import type { FileInfo, FolderInfo } from '../../types';
import { getDownloadUrl } from '../../api/files';
import { summarizeFile, ocrFile } from '../../api/ai';
import { getFileCategory } from '../../utils/formatters';

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileInfo | FolderInfo;
  itemType: 'file' | 'folder';
  onClose: () => void;
  onDownload: () => void;
  onRename: (item: FileInfo | FolderInfo, type: 'file' | 'folder') => void;
  onDelete: (item: FileInfo | FolderInfo, type: 'file' | 'folder') => void;
  onFileInfo: (item: FileInfo | FolderInfo) => void;
  onSummarize: () => void;
  onOcr: () => void;
  onOpen: (item: FolderInfo) => void;
  onRefresh: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setAiResult: (res: { title: string; content: string; fileId: string }) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  itemType,
  onClose,
  onRename,
  onDelete,
  onFileInfo,
  onOpen,
  addToast,
  setAiResult,
}) => {
  const isFile = itemType === 'file';
  const file = isFile ? (item as FileInfo) : null;
  const fileCategory = file ? getFileCategory(file.filename) : null;

  const handleDownload = () => {
    onClose();
    if (!file) return;
    const downloadUrl = getDownloadUrl(file.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSummarize = async () => {
    onClose();
    if (!file) return;
    addToast('Generating summary with AI...', 'info');
    try {
      const res = await summarizeFile(file.id);
      setAiResult({
        title: `Summary: ${file.filename}`,
        content: res.summary || 'No summary returned.',
        fileId: file.id,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Summarization failed';
      addToast(msg, 'error');
    }
  };

  const handleOcr = async () => {
    onClose();
    if (!file) return;
    addToast('Extracting text (OCR)...', 'info');
    try {
      const res = await ocrFile(file.id);
      setAiResult({
        title: `OCR Text: ${file.filename}`,
        content: res.ocr_text || res.note || 'No text could be extracted.',
        fileId: file.id,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OCR failed';
      addToast(msg, 'error');
    }
  };

  return (
    <div
      className="context-menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {!isFile ? (
        <button
          className="context-menu-item"
          onClick={() => {
            onClose();
            onOpen(item as FolderInfo);
          }}
        >
          <FolderOpen size={14} />
          <span>Open Folder</span>
        </button>
      ) : (
        <button className="context-menu-item" onClick={handleDownload}>
          <Download size={14} />
          <span>Download</span>
        </button>
      )}

      {isFile && (
        <button
          className="context-menu-item"
          onClick={() => {
            onClose();
            onFileInfo(item);
          }}
        >
          <Info size={14} />
          <span>Details & Properties</span>
        </button>
      )}

      {/* AI Operations */}
      {isFile && fileCategory === 'pdf' && (
        <button className="context-menu-item" onClick={handleSummarize}>
          <Sparkles size={14} />
          <span>Summarize PDF (AI)</span>
        </button>
      )}

      {isFile && fileCategory === 'image' && (
        <button className="context-menu-item" onClick={handleOcr}>
          <FileSearch size={14} />
          <span>Extract Text (OCR)</span>
        </button>
      )}

      <div className="context-menu-separator" />

      <button
        className="context-menu-item"
        onClick={() => {
          onClose();
          onRename(item, itemType);
        }}
      >
        <Edit2 size={14} />
        <span>Rename</span>
      </button>

      <button
        className="context-menu-item danger"
        onClick={() => {
          onClose();
          onDelete(item, itemType);
        }}
      >
        <Trash2 size={14} />
        <span>Delete</span>
      </button>
    </div>
  );
};

export default ContextMenu;
