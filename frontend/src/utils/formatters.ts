/**
 * Format byte size into human-readable string.
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format ISO date string into a user-friendly display.
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Extract file extension from filename.
 */
export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

/**
 * Get the MIME type category from a filename extension.
 */
export function getFileCategory(filename: string): 'image' | 'pdf' | 'text' | 'video' | 'audio' | 'archive' | 'code' | 'unknown' {
  const ext = getFileExtension(filename);
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'tif'];
  const pdfExts = ['pdf'];
  const textExts = ['txt', 'md', 'csv', 'log', 'rtf', 'doc', 'docx', 'odt'];
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'];
  const archiveExts = ['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'];
  const codeExts = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'css', 'html', 'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'rs', 'go'];

  if (imageExts.includes(ext)) return 'image';
  if (pdfExts.includes(ext)) return 'pdf';
  if (textExts.includes(ext)) return 'text';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (archiveExts.includes(ext)) return 'archive';
  if (codeExts.includes(ext)) return 'code';
  return 'unknown';
}
