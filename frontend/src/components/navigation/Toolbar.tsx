import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCw,
  Search,
  Upload,
  FolderPlus,
  LayoutGrid,
  List,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import type { Breadcrumb, ViewMode, SortConfig } from '../../types';

interface ToolbarProps {
  breadcrumbs: Breadcrumb[];
  onBreadcrumbClick: (id: string | null) => void;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  onRefresh: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  breadcrumbs,
  onBreadcrumbClick,
  onBack,
  onForward,
  onUp,
  onRefresh,
  canGoBack,
  canGoForward,
  canGoUp,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onUpload,
  onCreateFolder,
  sortConfig,
  onSortChange,
}) => {
  const toggleSort = () => {
    const nextDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ ...sortConfig, direction: nextDirection });
  };

  return (
    <div className="toolbar">
      {/* Navigation Buttons */}
      <button
        className="toolbar-btn"
        onClick={onBack}
        disabled={!canGoBack}
        title="Back"
      >
        <ArrowLeft size={16} />
      </button>
      <button
        className="toolbar-btn"
        onClick={onForward}
        disabled={!canGoForward}
        title="Forward"
      >
        <ArrowRight size={16} />
      </button>
      <button
        className="toolbar-btn"
        onClick={onUp}
        disabled={!canGoUp}
        title="Up to parent folder"
      >
        <ArrowUp size={16} />
      </button>
      <button
        className="toolbar-btn"
        onClick={onRefresh}
        title="Refresh folder"
      >
        <RotateCw size={16} />
      </button>

      <div className="toolbar-separator" />

      {/* Breadcrumb Path */}
      <div className="toolbar-breadcrumbs">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.id ?? 'root'}>
              <span
                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                onClick={() => onBreadcrumbClick(crumb.id)}
              >
                {crumb.name}
              </span>
              {!isLast && <ChevronRight className="breadcrumb-separator" size={12} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="toolbar-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search current folder..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="toolbar-separator" />

      {/* Actions */}
      <div className="toolbar-actions">
        <button
          className="toolbar-action-btn primary"
          onClick={onUpload}
          title="Upload files"
        >
          <Upload size={14} />
          <span>Upload</span>
        </button>

        <button
          className="toolbar-action-btn"
          onClick={onCreateFolder}
          title="Create new folder"
        >
          <FolderPlus size={14} />
          <span>New Folder</span>
        </button>

        <div className="toolbar-separator" />

        {/* Sort order toggle */}
        <button
          className="toolbar-btn"
          onClick={toggleSort}
          title={`Sort ${sortConfig.field} (${sortConfig.direction.toUpperCase()})`}
        >
          <ArrowUpDown size={16} />
        </button>

        {/* View Mode Toggles */}
        <button
          className={`toolbar-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => onViewModeChange('grid')}
          title="Grid View"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`toolbar-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => onViewModeChange('list')}
          title="List View"
        >
          <List size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
