# NimbusFS — Codebase File Map

This document maps application features to their implementation locations across the backend, database, AI modules, templates, and the target React frontend.

---

## 1. Feature-to-Code Matrix

| Feature | Primary File | Supporting Files | State Maintained In | API / Endpoints Called | Backend Implementation |
|---|---|---|---|---|---|
| **Multi-File Upload** | `main.py` (`POST /upload`) | `db/services.py` (`create_file`), `db/models.py` (`File`) | `uploads/` directory on disk; `files` table in PostgreSQL | `POST /upload` (multipart/form-data) | `db/services.py:create_file` |
| **File Download** | `main.py` (`POST /download`) | `db/services.py` (`download_file`) | Read-only disk lookup | `POST /download` (form with `file_id`) | `db/services.py:download_file` |
| **File Deletion** | `main.py` (`POST /delete`) | `db/services.py` (`delete_file`) | Filesystem unlink; row delete in DB | `POST /delete` (form with `file_id`) | `db/services.py:delete_file` |
| **Folder Creation** | `main.py` (`POST /folders`) | `db/services.py` (`create_folder`), `db/models.py` (`Folder`) | `folders` table in PostgreSQL | `POST /folders` (form: `name`, `parent_folder_id`) | `db/services.py:create_folder` |
| **Folder Navigation** | `main.py` (`GET /files`, `GET /files/{path}`) | `db/services.py` (`resolve_path_to_folder`, `get_folder_contents`) | URL path segments; DB foreign key tree | `GET /files/{folder_path}` | `db/services.py:resolve_path_to_folder` |
| **Folder Deletion (Recursive)** | `main.py` (`POST /folders/delete`) | `db/services.py` (`delete_folder_recursive`) | Cascade unlink on disk; cascade row delete in DB | `POST /folders/delete` (`folder_id`) | `db/services.py:delete_folder_recursive` |
| **AI PDF Summarization** | `ai/pdfsummarizer.py` (`summarize`) | `main.py` (`POST /summary`), `db/services.py` (`updateMetadata`) | `files.metadata` JSON column in PostgreSQL | `POST /summary` -> `http://ollama:11434/api/generate` | `ai/pdfsummarizer.py:summarize` |
| **Image OCR** | `ai/ocr.py` (`extract_text`) | `main.py` (`POST /ocr`), `db/services.py` (`updateMetadata`) | `files.metadata` JSON column in PostgreSQL | `POST /ocr` -> Tesseract CLI subprocess | `ai/ocr.py:extract_text` |
| **Database Lifecycle** | `main.py` (`lifespan`) | `db/database.py`, `db/models.py`, `db/init_db.py` | PostgreSQL schema (`Base.metadata`) | Application startup | `db/database.py:Base.metadata.create_all` |
| **Prometheus Metrics** | `main.py` (`Instrumentator`) | `prometheus.yml`, `docker-compose.yml` | In-memory Prometheus registry | `GET /metrics` | `prometheus_fastapi_instrumentator` |

---

## 2. Source Tree Guide

### Backend (`FileServerProject/`)
- [`main.py`](file:///home/zacro/Desktop/testingold/FileServerProject/main.py):
  - Application entrypoint, FastAPI instance, lifespan context manager.
  - HTTP routing for all file, folder, AI, and home page requests.
- [`requirements.txt`](file:///home/zacro/Desktop/testingold/FileServerProject/requirements.txt):
  - Python dependency specifications.
- [`dockerfile`](file:///home/zacro/Desktop/testingold/FileServerProject/dockerfile):
  - Container build specification based on `python:3.13-slim` with `tesseract-ocr`.
- [`docker-compose.yml`](file:///home/zacro/Desktop/testingold/FileServerProject/docker-compose.yml):
  - Multi-service definition: `fastapi_app`, `db` (Postgres), `ollama`, `prometheus`, `grafana`.

### Database Layer (`FileServerProject/db/`)
- [`db/database.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/database.py):
  - SQLAlchemy engine definition, `SessionLocal` factory, and declarative `Base`.
- [`db/models.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/models.py):
  - SQLAlchemy ORM definitions for `Folder` and `File`.
  - Defines unique constraints (`uix_parent_folder_name`, `uix_root_folder_name`) and foreign keys.
- [`db/schemas.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/schemas.py):
  - Pydantic models: `FolderCreate`, `Folder`, `_BaseFile`, `File`, `FileSummary`.
- [`db/services.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/services.py):
  - Core database operations, filesystem I/O coordination, path resolution, and metadata merging.
- [`db/init_db.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/init_db.py):
  - Utility script to create tables manually via CLI.

### AI Layer (`FileServerProject/ai/`)
- [`ai/pdfsummarizer.py`](file:///home/zacro/Desktop/testingold/FileServerProject/ai/pdfsummarizer.py):
  - PDF text extraction via `PyPDF2.PdfReader`.
  - Ollama REST API integration with model `gemma3:4b`.
  - Persists summaries to database metadata.
- [`ai/ocr.py`](file:///home/zacro/Desktop/testingold/FileServerProject/ai/ocr.py):
  - Invokes `tesseract` CLI via `subprocess.run`.
  - Intended to parse output and persist text to `files.metadata["ocr_text"]`.
  - Contains a known variable scoping bug requiring correction before use.

### Active Jinja Templates (`FileServerProject/templates/`)
- [`templates/index.html`](file:///home/zacro/Desktop/testingold/FileServerProject/templates/index.html):
  - Root landing view with basic upload form, download-by-ID input, and link to file browser.
- [`templates/files.html`](file:///home/zacro/Desktop/testingold/FileServerProject/templates/files.html):
  - Primary file explorer interface: breadcrumb navigation, folder creation, multi-upload, folder deletion, download, delete, summarize, and OCR triggers.
- [`templates/upload.html`](file:///home/zacro/Desktop/testingold/FileServerProject/templates/upload.html):
  - Upload confirmation view displaying names of uploaded files with return links.
- [`templates/summary.html`](file:///home/zacro/Desktop/testingold/FileServerProject/templates/summary.html):
  - AI document summary display view.
- [`templates/ocr.html`](file:///home/zacro/Desktop/testingold/FileServerProject/templates/ocr.html):
  - OCR extracted text display view.
- [`templates/delete.html`](file:///home/zacro/Desktop/testingold/FileServerProject/templates/delete.html):
  - File deletion confirmation view.

---

## 3. Target React Structure (`FileServerProject/frontend/`)

During the React migration, frontend files should be organized according to the following architectural blueprint:

```text
frontend/src/
├── api/
│   ├── client.ts              # Axios instance configured with baseURL and interceptors
│   ├── files.ts               # File upload, download, delete, rename API calls
│   ├── folders.ts             # Folder navigation, creation, recursive deletion API calls
│   └── ai.ts                  # Summarization and OCR execution API calls
├── components/
│   ├── explorer/
│   │   ├── ExplorerView.tsx   # Main file & folder grid/list container
│   │   ├── FileCard.tsx       # Individual file representation with preview/actions
│   │   ├── FolderCard.tsx     # Folder item with click-to-navigate
│   │   └── EmptyState.tsx     # Displayed when folder has no files or subfolders
│   ├── navigation/
│   │   ├── Breadcrumbs.tsx    # Clickable path segment trail
│   │   └── Sidebar.tsx        # Quick links, storage stats, favorites
│   ├── upload/
│   │   ├── UploadManager.tsx  # Upload queue state and modal/drawer
│   │   ├── UploadProgress.tsx # Individual file progress bar
│   │   └── DragOverlay.tsx    # Drag-and-drop dropzone indicator
│   ├── dialogs/
│   │   ├── CreateFolderDialog.tsx
│   │   ├── RenameDialog.tsx
│   │   ├── DeleteConfirmDialog.tsx
│   │   └── FileInfoDialog.tsx # Shows metadata, AI summary, OCR text
│   └── context-menu/
│       └── ContextMenu.tsx    # Right-click context actions for items
├── hooks/
│   ├── useFiles.ts            # SWR/Query hook for fetching current folder items
│   ├── useBreadcrumbs.ts      # Path parsing and navigation history
│   ├── useUpload.ts           # Chunked/parallel upload coordinator
│   └── useCurrentFolder.ts    # Folder ID and path state
├── types/
│   └── index.ts               # TypeScript interfaces mirroring db/schemas.py
└── utils/
    ├── fileIcons.ts           # Extension-to-icon mapper
    └── formatters.ts          # Byte size and date formatting utilities
```

---

## 4. How to Plan Changes Using This Map

When planning a new feature or modification:
1. Locate the feature in the **Feature-to-Code Matrix** above.
2. Check the **Primary File** and its **Supporting Files** before touching code.
3. Review whether the change affects the **Backend Service Layer** (`db/services.py`), the **API Contracts** (`main.py` / `db/schemas.py`), or the **UI Layer**.
4. Confirm any database impacts against `db/models.py` before modifying schemas.
