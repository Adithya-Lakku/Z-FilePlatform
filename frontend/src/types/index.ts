// TypeScript types mirroring the backend Pydantic schemas (db/schemas.py)
// and the JSON API response shapes from main.py

export interface FolderInfo {
  id: string;
  name: string;
  date_created: string | null;
  parent_folder_id: string | null;
}

export interface FileInfo {
  id: string;
  filename: string;
  filepath: string;
  size_bytes: number;
  date_created: string | null;
  file_metadata: Record<string, unknown> | null;
  parent_folder_id: string | null;
}

export interface Breadcrumb {
  name: string;
  id: string | null;  // null = root
}

export interface FolderContentsResponse {
  current_folder: {
    id: string;
    name: string;
    parent_folder_id: string | null;
  } | null;
  breadcrumbs: Breadcrumb[];
  folders: FolderInfo[];
  files: FileInfo[];
}

export interface UploadResponse {
  uploaded: Array<{
    id?: string;
    filename: string;
    size_bytes?: number;
    date_created?: string | null;
    parent_folder_id?: string | null;
  }>;
}

export type ViewMode = 'grid' | 'list';

export type SortField = 'name' | 'size' | 'date';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Upload tracking
export interface UploadEntry {
  id: string;        // client-generated unique ID for tracking
  file: File;        // the actual File object
  progress: number;  // 0–100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// Context menu
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: FileInfo | FolderInfo | null;
  itemType: 'file' | 'folder' | null;
}
