import React from 'react';
import { Cloud, Folder, HardDrive, Server, Sparkles } from 'lucide-react';

interface SidebarProps {
  onNavigateRoot: () => void;
  currentFolderId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigateRoot, currentFolderId }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Cloud size={20} />
        <span>Z-FilePlatform</span>
      </div>

      <div className="sidebar-section-title">Places</div>
      <button
        className={`sidebar-item ${currentFolderId === null ? 'active' : ''}`}
        onClick={onNavigateRoot}
      >
        <HardDrive size={16} />
        <span>Root Storage</span>
      </button>

      <div className="sidebar-section-title">Quick Access</div>
      <button
        className={`sidebar-item ${currentFolderId === null ? 'active' : ''}`}
        onClick={onNavigateRoot}
      >
        <Folder size={16} />
        <span>All Files</span>
      </button>

      <div className="sidebar-section-title">Services</div>
      <div className="sidebar-item" style={{ cursor: 'default', opacity: 0.8 }}>
        <Sparkles size={16} />
        <span>AI Engine</span>
      </div>
      <div className="sidebar-item" style={{ cursor: 'default', opacity: 0.8 }}>
        <Server size={16} />
        <span>PostgreSQL</span>
      </div>
    </aside>
  );
};

export default Sidebar;
