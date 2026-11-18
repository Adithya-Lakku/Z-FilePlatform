import api from './client';
import type { FileInfo, UploadResponse } from '../types';
import type { AxiosProgressEvent } from 'axios';

/**
 * Upload files using FormData (multipart).
 * This matches the backend POST /api/upload which expects multipart form data
 * with field name "files" and optional "parent_folder_id".
 */
export async function uploadFiles(
  files: File[],
  parentFolderId: string | null,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal,
): Promise<UploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  if (parentFolderId) {
    formData.append('parent_folder_id', parentFolderId);
  }

  const res = await api.post<UploadResponse>('/upload', formData, {
    // Do NOT set Content-Type manually — Axios/browser will set it with the correct boundary
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
    signal: abortSignal,
  });
  return res.data;
}

/**
 * Get full metadata for a single file.
 */
export async function getFileInfo(fileId: string): Promise<FileInfo> {
  const res = await api.get<FileInfo>(`/files/${fileId}`);
  return res.data;
}

/**
 * Download a file. Opens in a new tab or triggers browser download.
 */
export function getDownloadUrl(fileId: string): string {
  return `/api/files/${fileId}/download`;
}

/**
 * Delete a file.
 */
export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}`);
}

/**
 * Rename a file (updates filename in DB, physical file unchanged).
 */
export async function renameFile(fileId: string, newName: string): Promise<FileInfo> {
  const res = await api.patch<FileInfo>(`/files/${fileId}/rename`, {
    new_name: newName,
  });
  return res.data;
}

/**
 * Move a file to a different folder (null = root).
 */
export async function moveFile(fileId: string, newParentFolderId: string | null): Promise<FileInfo> {
  const res = await api.patch<FileInfo>(`/files/${fileId}/move`, {
    new_parent_folder_id: newParentFolderId,
  });
  return res.data;
}
