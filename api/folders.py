"""JSON API routes for folder operations."""

from fastapi import APIRouter, HTTPException
from db import services as _services
from api.deps import DbSession
from api.schemas import FolderCreateRequest, RenameRequest, MoveRequest

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("/contents")
def api_get_folder_contents(
    db: DbSession,
    folder_id: str | None = None,
    path: str | None = None,
):
    """Get folder contents by folder_id or path. Returns JSON with subfolders and files."""
    current_folder = None
    current_folder_id = folder_id

    # If path is provided, resolve it to a folder
    if path and not folder_id:
        try:
            current_folder = _services.resolve_path_to_folder(path, db)
            current_folder_id = str(current_folder.id) if current_folder else None
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))
    elif folder_id:
        current_folder = _services.get_folder_by_id(folder_id, db)

    folders, files = _services.get_folder_contents(current_folder_id, db)
    breadcrumbs = _services.get_breadcrumbs(current_folder_id, db)

    return {
        "current_folder": {
            "id": str(current_folder.id),
            "name": current_folder.name,
            "parent_folder_id": str(current_folder.parent_folder_id) if current_folder.parent_folder_id else None,
        } if current_folder else None,
        "breadcrumbs": breadcrumbs,
        "folders": [
            {
                "id": str(f.id),
                "name": f.name,
                "date_created": f.date_created.isoformat() if f.date_created else None,
                "parent_folder_id": str(f.parent_folder_id) if f.parent_folder_id else None,
            }
            for f in folders
        ],
        "files": [
            {
                "id": str(f.id),
                "filename": f.filename,
                "filepath": f.filepath,
                "size_bytes": f.size_bytes,
                "date_created": f.date_created.isoformat() if f.date_created else None,
                "file_metadata": f.file_metadata,
                "parent_folder_id": str(f.parent_folder_id) if f.parent_folder_id else None,
            }
            for f in files
        ],
    }


@router.post("")
def api_create_folder(body: FolderCreateRequest, db: DbSession):
    """Create a new folder. Returns JSON."""
    try:
        folder = _services.create_folder(
            name=body.name,
            parent_folder_id=body.parent_folder_id,
            db=db,
        )
        return {
            "id": str(folder.id),
            "name": folder.name,
            "parent_folder_id": str(folder.parent_folder_id) if folder.parent_folder_id else None,
            "date_created": folder.date_created.isoformat() if folder.date_created else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{folder_id}")
def api_delete_folder(folder_id: str, db: DbSession):
    """Recursively delete a folder and all its contents."""
    try:
        _services.delete_folder_recursive(folder_id=folder_id, db=db)
        return {"detail": "Folder deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{folder_id}/rename")
def api_rename_folder(folder_id: str, body: RenameRequest, db: DbSession):
    """Rename a folder."""
    folder = _services.rename_folder(folder_id=folder_id, new_name=body.new_name, db=db)
    return {
        "id": str(folder.id),
        "name": folder.name,
        "parent_folder_id": str(folder.parent_folder_id) if folder.parent_folder_id else None,
    }


@router.patch("/{folder_id}/move")
def api_move_folder(folder_id: str, body: MoveRequest, db: DbSession):
    """Move a folder to a different parent folder (or root)."""
    folder = _services.move_folder(folder_id=folder_id, new_parent_folder_id=body.new_parent_folder_id, db=db)
    return {
        "id": str(folder.id),
        "name": folder.name,
        "parent_folder_id": str(folder.parent_folder_id) if folder.parent_folder_id else None,
    }

