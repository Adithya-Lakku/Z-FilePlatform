from fastapi import FastAPI,UploadFile,HTTPException,Request,Form,Depends,File
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path
import sqlalchemy.orm as _orm
from db import services as _services
from db import schemas as _schemas
from typing import Annotated, Optional
from db import init_db as _init_db
from db import database as _database
from ai import pdfsummarizer as _summarizer
from ai import ocr as _ocr
from prometheus_fastapi_instrumentator import Instrumentator
from contextlib import asynccontextmanager #whatever the fuck this is
from pydantic import BaseModel
import uuid

BASE_DIR = Path(__file__).resolve().parent



@asynccontextmanager
async def lifespan(app):
    _database.Base.metadata.create_all(bind=_database.engine)  # create tables if needed
    yield




app = FastAPI(lifespan=lifespan)

# CORS middleware for React dev server (Vite on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)  # used for prometheurs


templates = Jinja2Templates(directory=BASE_DIR / "templates")

"""UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok = True)   #creates directory if true"""

DbSession = Annotated[_orm.Session,Depends(_services.get_db)] #this shit only helps with pydantic hints but why not







#upload endpnt

@app.post("/upload")
async def upload_file(
    request: Request,
    db: DbSession,
    files: Annotated[ list[UploadFile],File(...)],
    parent_folder_id: str | None = Form(None),
    current_path: str = Form("")
):
    #original_name = Path(file.filename).name
    original_names = [Path(file.filename).name for file in files]




    p_id = parent_folder_id if parent_folder_id else None
    await _services.create_file(files=files, db=db, parent_folder_id=p_id)

    return templates.TemplateResponse(
        request=request,
        name="upload.html",
        #context={"filename": original_name, "current_path": current_path}
        context={"filenames": original_names, "current_path": current_path}  #all uploaded files in same folder so same current_path
        
    )


@app.get("/files")
@app.get("/files/{folder_path:path}")
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
        breadcrumbs.append({
            "name": part,
            "path": "/".join(accumulated)
        })

    current_folder_id = str(current_folder.id) if current_folder else None
    folders, files = _services.get_folder_contents(current_folder_id, db)

    subfolders = [{
        "id": str(f.id),
        "name": f.name,
        "path": f"{folder_path}/{f.name}" if folder_path else f.name
    } for f in folders]

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
            "breadcrumbs": breadcrumbs
        }
    )


@app.post("/folders")
def create_folder(
    request: Request,
    db: DbSession,
    name: str = Form(...),
    parent_folder_id: str | None = Form(None),
    current_path: str = Form("")
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


@app.post("/folders/delete")
def delete_folder(
    request: Request,
    db: DbSession,
    folder_id: str = Form(...),
    current_path: str = Form("")
):
    try:
        _services.delete_folder_recursive(folder_id=folder_id, db=db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Redirect to parent directory or root
    parts = [p for p in current_path.split("/") if p]
    parent_path = "/".join(parts[:-1]) if parts else ""
    target_url = f"/files/{parent_path}" if parent_path else "/files"
    return RedirectResponse(url=target_url, status_code=303)




#download
@app.post("/download")
def download_file(file_id: str = Form(...),db:DbSession = None):
    # Prevent path traversal attacks
    print("I GOT HERE")
    print(file_id)

    #filename = Path(filename).name
    

    file_path , filename = _services.download_file(file_id=file_id,db=db)
    

    if not Path(file_path).exists():
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=filename
    )

#===========AI PART========================


@app.post("/summary")
async def summarize(
    request: Request,
    file_id: str=Form(...),
    current_path:str = Form(""),
    db:DbSession = None
):
    
    summary = _summarizer.summarize(file_id,db)
    print(summary)
    return templates.TemplateResponse(
        request = request,
        name = "summary.html",
        context={"summary":summary,"current_path": current_path}
    )
    
@app.post("/ocr")
async def Ocr(
    request: Request,
    file_id: str=Form(...),
    current_path:str = Form(""),
    db:DbSession = None
):
    
    ocr_text = _ocr.extract_text(file_id,db)
    #print(summary)
    return templates.TemplateResponse(
        request = request,
        name = "ocr.html",
        context={"ocr":ocr_text,"current_path": current_path}
    )
    

#====================================================

@app.post("/delete")
def delete_file(
    request: Request,
    file_id: str = Form(...),
    current_path: str = Form(""),
    db: DbSession = None
):
    msg = _services.delete_file(file_id=file_id, db=db)

    return templates.TemplateResponse(
        request=request,
        name="delete.html",
        context={"resp": msg, "current_path": current_path}
    )




@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )


"""if __name__ == '__main__':
    uvicorn.run("main:app",host="0.0.0.0",port=8000,reload=True)
    #uvicorn.run(app,host="0.0.0.0",port=8000)
"""


# =====================================================================
# JSON API ENDPOINTS FOR REACT FRONTEND
# These reuse existing service functions and return JSON instead of HTML.
# All original Jinja endpoints above remain intact.
# =====================================================================

# --- Pydantic request models for JSON API ---
class FolderCreateRequest(BaseModel):
    name: str
    parent_folder_id: str | None = None

class RenameRequest(BaseModel):
    new_name: str

class MoveRequest(BaseModel):
    new_parent_folder_id: str | None = None  # None = move to root


# --- Folder API ---

@app.get("/api/folders/contents")
def api_get_folder_contents(
    db: DbSession,
    folder_id: str | None = None,
    path: str | None = None
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


@app.post("/api/folders")
def api_create_folder(body: FolderCreateRequest, db: DbSession):
    """Create a new folder. Returns JSON."""
    try:
        folder = _services.create_folder(
            name=body.name,
            parent_folder_id=body.parent_folder_id,
            db=db
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


@app.delete("/api/folders/{folder_id}")
def api_delete_folder(folder_id: str, db: DbSession):
    """Recursively delete a folder and all its contents."""
    try:
        _services.delete_folder_recursive(folder_id=folder_id, db=db)
        return {"detail": "Folder deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/folders/{folder_id}/rename")
def api_rename_folder(folder_id: str, body: RenameRequest, db: DbSession):
    """Rename a folder."""
    folder = _services.rename_folder(folder_id=folder_id, new_name=body.new_name, db=db)
    return {
        "id": str(folder.id),
        "name": folder.name,
        "parent_folder_id": str(folder.parent_folder_id) if folder.parent_folder_id else None,
    }


@app.patch("/api/folders/{folder_id}/move")
def api_move_folder(folder_id: str, body: MoveRequest, db: DbSession):
    """Move a folder to a different parent folder (or root)."""
    folder = _services.move_folder(folder_id=folder_id, new_parent_folder_id=body.new_parent_folder_id, db=db)
    return {
        "id": str(folder.id),
        "name": folder.name,
        "parent_folder_id": str(folder.parent_folder_id) if folder.parent_folder_id else None,
    }


# --- File API ---

@app.post("/api/upload")
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


@app.get("/api/files/{file_id}")
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


@app.get("/api/files/{file_id}/download")
def api_download_file(file_id: str, db: DbSession):
    """Download a file (GET instead of POST for easier linking)."""
    file_path, filename = _services.download_file(file_id=file_id, db=db)

    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=filename
    )


@app.delete("/api/files/{file_id}")
def api_delete_file(file_id: str, db: DbSession):
    """Delete a single file."""
    msg = _services.delete_file(file_id=file_id, db=db)
    return {"detail": msg}


@app.patch("/api/files/{file_id}/rename")
def api_rename_file(file_id: str, body: RenameRequest, db: DbSession):
    """Rename a file."""
    dbfile = _services.rename_file(file_id=file_id, new_name=body.new_name, db=db)
    return {
        "id": str(dbfile.id),
        "filename": dbfile.filename,
        "size_bytes": dbfile.size_bytes,
        "parent_folder_id": str(dbfile.parent_folder_id) if dbfile.parent_folder_id else None,
    }


@app.patch("/api/files/{file_id}/move")
def api_move_file(file_id: str, body: MoveRequest, db: DbSession):
    """Move a file to a different folder (or root if new_parent_folder_id is null)."""
    dbfile = _services.move_file(file_id=file_id, new_parent_folder_id=body.new_parent_folder_id, db=db)
    return {
        "id": str(dbfile.id),
        "filename": dbfile.filename,
        "parent_folder_id": str(dbfile.parent_folder_id) if dbfile.parent_folder_id else None,
    }


# --- AI API ---

@app.post("/api/summarize/{file_id}")
async def api_summarize(file_id: str, db: DbSession):
    """Summarize a PDF file using Ollama. Returns JSON with the summary text."""
    try:
        summary = _summarizer.summarize(file_id, db)
        if summary:
            return {"summary": summary, "file_id": file_id}
        else:
            raise HTTPException(status_code=500, detail="Summarization returned no result. Ensure Ollama is running and the model is available.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@app.post("/api/ocr/{file_id}")
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


# --- React SPA static file serving (production) ---
# Mount the built React app for production serving.
# This must be the LAST route so it doesn't intercept /api/ or Jinja routes.
FRONTEND_BUILD = BASE_DIR / "frontend" / "dist"
if FRONTEND_BUILD.exists():
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React SPA. Falls back to index.html for client-side routing."""
        file_path = FRONTEND_BUILD / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # Return index.html for all non-file paths (React Router handles them)
        index_path = FRONTEND_BUILD / "index.html"
        if index_path.exists():
            return HTMLResponse(index_path.read_text())
        raise HTTPException(status_code=404, detail="Frontend not built")

