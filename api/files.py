"""JSON API routes for file operations."""

from typing import Annotated
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from db import services as _services
from api.deps import DbSession
from api.schemas import RenameRequest, MoveRequest

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload")
async def api_upload_file(
    db: DbSession,
    files: Annotated[list[UploadFile], File(...)],
    parent_folder_id: str | None = Form(None),
):
    """Upload files via FormData, returns JSON list of uploaded files."""
    created_files = await _services.create_file(files=files, db=db, parent_folder_id=parent_folder_id)
    return {
        "uploaded": [
            {
                "id": str(f.id),
                "filename": f.filename,
                "size_bytes": f.size_bytes,
                "date_created": f.date_created.isoformat() if f.date_created else None,
                "parent_folder_id": str(f.parent_folder_id) if f.parent_folder_id else None,
            }
            for f in created_files
        ]
    }


@router.get("/{file_id}")
def api_get_file_info(file_id: str, db: DbSession):
    """Get full file metadata."""
    dbfile = _services.get_file_by_id(file_id=file_id, db=db)
    return {
        "id": str(dbfile.id),
        "filename": dbfile.filename,
        "filepath": dbfile.filepath,
        "size_bytes": dbfile.size_bytes,
        "date_created": dbfile.date_created.isoformat() if dbfile.date_created else None,
        "file_metadata": dbfile.file_metadata,
        "parent_folder_id": str(dbfile.parent_folder_id) if dbfile.parent_folder_id else None,
    }


@router.get("/{file_id}/download")
def api_download_file(file_id: str, db: DbSession):
    """Download a file (GET instead of POST for easier linking)."""
    file_path, filename = _services.download_file(file_id=file_id, db=db)

    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=filename,
    )


@router.delete("/{file_id}")
def api_delete_file(file_id: str, db: DbSession):
    """Delete a single file."""
    msg = _services.delete_file(file_id=file_id, db=db)
    return {"detail": msg}


@router.patch("/{file_id}/rename")
def api_rename_file(file_id: str, body: RenameRequest, db: DbSession):
    """Rename a file."""
    dbfile = _services.rename_file(file_id=file_id, new_name=body.new_name, db=db)
    return {
        "id": str(dbfile.id),
        "filename": dbfile.filename,
        "size_bytes": dbfile.size_bytes,
        "parent_folder_id": str(dbfile.parent_folder_id) if dbfile.parent_folder_id else None,
    }


@router.patch("/{file_id}/move")
def api_move_file(file_id: str, body: MoveRequest, db: DbSession):
    """Move a file to a different folder (or root if new_parent_folder_id is null)."""
    dbfile = _services.move_file(file_id=file_id, new_parent_folder_id=body.new_parent_folder_id, db=db)
    return {
        "id": str(dbfile.id),
        "filename": dbfile.filename,
        "parent_folder_id": str(dbfile.parent_folder_id) if dbfile.parent_folder_id else None,
    }

