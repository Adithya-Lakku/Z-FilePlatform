import api from './client';
import type { FolderContentsResponse, FolderInfo } from '../types';

/**
 * Fetch the contents of a folder (subfolders + files + breadcrumbs).
 * Pass folderId=null for root.
 */
export async function getFolderContents(folderId: string | null): Promise<FolderContentsResponse> {
  const params: Record<string, string> = {};
  if (folderId) {
    params.folder_id = folderId;
  }
  const res = await api.get<FolderContentsResponse>('/folders/contents', { params });
  return res.data;
}

/**
 * Create a new folder inside the given parent (null = root).
 */
export async function createFolder(name: string, parentFolderId: string | null): Promise<FolderInfo> {
  const res = await api.post<FolderInfo>('/folders', {
    name,
    parent_folder_id: parentFolderId,
  });
  return res.data;
}

/**
 * Recursively delete a folder and all its contents.
 */
export async function deleteFolder(folderId: string): Promise<void> {
  await api.delete(`/folders/${folderId}`);
}

/**
 * Rename a folder.
 */
export async function renameFolder(folderId: string, newName: string): Promise<FolderInfo> {
  const res = await api.patch<FolderInfo>(`/folders/${folderId}/rename`, {
    new_name: newName,
  });
  return res.data;
}

/**
 * Move a folder to a new parent (null = root).
 */
export async function moveFolder(folderId: string, newParentFolderId: string | null): Promise<FolderInfo> {
  const res = await api.patch<FolderInfo>(`/folders/${folderId}/move`, {
    new_parent_folder_id: newParentFolderId,
  });
  return res.data;
}
