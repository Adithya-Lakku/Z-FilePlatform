"""JSON API routes for AI features (summarization, OCR)."""

from fastapi import APIRouter, HTTPException
from ai import pdfsummarizer as _summarizer
from ai import ocr as _ocr
from api.deps import DbSession

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/summarize/{file_id}")
async def api_summarize(file_id: str, db: DbSession):
    """Summarize a PDF file using Ollama. Returns JSON with the summary text."""
    try:
        summary = _summarizer.summarize(file_id, db)
        if summary:
            return {"summary": summary, "file_id": file_id}
        else:
            raise HTTPException(
                status_code=500,
                detail="Summarization returned no result. Ensure Ollama is running and the model is available.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@router.post("/ocr/{file_id}")
async def api_ocr(file_id: str, db: DbSession):
    """Run OCR on an image file. Returns JSON with extracted text."""
    try:
        ocr_text = _ocr.extract_text(file_id, db)

        if ocr_text:
            text_str = ocr_text.decode("utf-8", errors="ignore") if isinstance(ocr_text, bytes) else str(ocr_text)
            return {"ocr_text": text_str, "file_id": file_id}
        else:
            return {"ocr_text": "", "file_id": file_id, "note": "No text could be extracted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

