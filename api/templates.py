"""Jinja-rendered template routes (original HTML frontend).

These serve the legacy server-side rendered pages and remain fully
operational alongside the new JSON API.
"""

from typing import Annotated
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Form, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from db import services as _services
from ai import pdfsummarizer as _summarizer
from ai import ocr as _ocr
from api.deps import DbSession

BASE_DIR = Path(__file__).resolve().parent.parent  # FileServerProject/
templates = Jinja2Templates(directory=BASE_DIR / "templates")

router = APIRouter(tags=["templates"])


# --- Home ---

@router.get("/")
def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


# --- File upload (multipart form) ---

@router.post("/upload")
async def upload_file(
    request: Request,
    db: DbSession,
    files: Annotated[list[UploadFile], File(...)],
    parent_folder_id: str | None = Form(None),
    current_path: str = Form(""),
):
    original_names = [Path(file.filename).name for file in files]

    p_id = parent_folder_id if parent_folder_id else None
    await _services.create_file(files=files, db=db, parent_folder_id=p_id)

    return templates.TemplateResponse(
        request=request,
        name="upload.html",
        context={"filenames": original_names, "current_path": current_path},
    )


# --- File browser (folder listing) ---

@router.get("/files")
@router.get("/files/{folder_path:path}")
def list_file(request: Request, db: DbSession, folder_path: str = ""):
    try:
        current_folder = _services.resolve_path_to_folder(folder_path, db)
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error resolving path: {e}")
        current_folder = None
        folder_path = ""

    parts = [p for p in folder_path.split("/") if p]
    parent_path = None
    if parts:
        parent_path = "/".join(parts[:-1])

    breadcrumbs = [{"name": "Root", "path": ""}]
    accumulated = []
    for part in parts:
        accumulated.append(part)
        breadcrumbs.append({"name": part, "path": "/".join(accumulated)})

    current_folder_id = str(current_folder.id) if current_folder else None
    folders, files = _services.get_folder_contents(current_folder_id, db)

    subfolders = [
        {
            "id": str(f.id),
            "name": f.name,
            "path": f"{folder_path}/{f.name}" if folder_path else f.name,
        }
        for f in folders
    ]

    files_list = [(str(f.id), f.filename) for f in files]

    return templates.TemplateResponse(
        request=request,
        name="files.html",
        context={
            "files": files_list,
            "subfolders": subfolders,
            "current_folder": current_folder,
            "current_path": folder_path,
            "parent_path": parent_path,
            "breadcrumbs": breadcrumbs,
        },
    )


# --- Folder create / delete (form posts) ---

@router.post("/folders")
def create_folder(
    request: Request,
    db: DbSession,
    name: str = Form(...),
    parent_folder_id: str | None = Form(None),
    current_path: str = Form(""),
):
    p_id = parent_folder_id if parent_folder_id else None
    try:
        _services.create_folder(name=name, parent_folder_id=p_id, db=db)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    target_url = f"/files/{current_path}" if current_path else "/files"
    return RedirectResponse(url=target_url, status_code=303)


@router.post("/folders/delete")
def delete_folder(
    request: Request,
    db: DbSession,
    folder_id: str = Form(...),
    current_path: str = Form(""),
):
    try:
        _services.delete_folder_recursive(folder_id=folder_id, db=db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    parts = [p for p in current_path.split("/") if p]
    parent_path = "/".join(parts[:-1]) if parts else ""
    target_url = f"/files/{parent_path}" if parent_path else "/files"
    return RedirectResponse(url=target_url, status_code=303)


# --- File download / delete (form posts) ---

@router.post("/download")
def download_file(file_id: str = Form(...), db: DbSession = None):
    print("I GOT HERE")
    print(file_id)

    file_path, filename = _services.download_file(file_id=file_id, db=db)

    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=filename,
    )


@router.post("/delete")
def delete_file(
    request: Request,
    file_id: str = Form(...),
    current_path: str = Form(""),
    db: DbSession = None,
):
    msg = _services.delete_file(file_id=file_id, db=db)

    return templates.TemplateResponse(
        request=request,
        name="delete.html",
        context={"resp": msg, "current_path": current_path},
    )


# --- AI features (form posts) ---

@router.post("/summary")
async def summarize(
    request: Request,
    file_id: str = Form(...),
    current_path: str = Form(""),
    db: DbSession = None,
):
    summary = _summarizer.summarize(file_id, db)
    print(summary)
    return templates.TemplateResponse(
        request=request,
        name="summary.html",
        context={"summary": summary, "current_path": current_path},
    )


@router.post("/ocr")
async def ocr(
    request: Request,
    file_id: str = Form(...),
    current_path: str = Form(""),
    db: DbSession = None,
):
    ocr_text = _ocr.extract_text(file_id, db)
    return templates.TemplateResponse(
        request=request,
        name="ocr.html",
        context={"ocr": ocr_text, "current_path": current_path},
    )

