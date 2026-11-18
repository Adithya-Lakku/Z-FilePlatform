import api from './client';

interface SummarizeResponse {
  summary: string;
  file_id: string;
}

interface OcrResponse {
  ocr_text: string;
  file_id: string;
  note?: string;
}

/**
 * Summarize a PDF file using Ollama (backend AI).
 * NOTE: This is synchronous on the backend and may take a long time.
 * The Ollama service must be running with the gemma3:4b model pulled.
 */
export async function summarizeFile(fileId: string): Promise<SummarizeResponse> {
  const res = await api.post<SummarizeResponse>(`/summarize/${fileId}`);
  return res.data;
}

/**
 * Run OCR on an image file using Tesseract (backend AI).
 * NOTE: The backend has a known bug in ai/ocr.py (UnboundLocalError).
 * This will likely fail until the bug is fixed.
 */
export async function ocrFile(fileId: string): Promise<OcrResponse> {
  const res = await api.post<OcrResponse>(`/ocr/${fileId}`);
  return res.data;
}
