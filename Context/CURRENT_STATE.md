# Current Project State

**Last Verified:** 2026-10-14  
**Git Branch:** `react_v1`  
**Working Directory:** `FileServerProject`

---

## 1. Backend

**Status:** Existing Implementation (Operational in Docker & Local Python)

- **FastAPI Engine:** Application lifecycle managed via `@asynccontextmanager lifespan(app)` in [`main.py`](file:///home/zacro/Desktop/testingold/FileServerProject/main.py). Automatically creates SQLAlchemy tables on startup.
- **Database Engine:** PostgreSQL via SQLAlchemy 2.0 [`db/database.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/database.py). Configured via `DATABASE_URL` environment variable.
- **Physical Storage:** File payload bytes stored in local filesystem directory [`uploads/`](file:///home/zacro/Desktop/testingold/FileServerProject/uploads/) named with pattern `{uuid}_{original_name}` to prevent path traversal and collision.
- **Metadata Storage:** Structured file and folder metadata stored in PostgreSQL (`folders` and `files` tables). File metadata supports an open JSON field (`files.file_metadata` mapping to column `"metadata"`).
- **Metrics Instrumentation:** `prometheus_fastapi_instrumentator` instruments all routes and exposes Prometheus metrics at `GET /metrics`.
- **Response Format:** Currently renders server-side Jinja2 HTML templates (`TemplateResponse`) or HTTP 303 redirects (`RedirectResponse`). RESTful JSON response contracts are not yet implemented on this branch.

---

## 2. Frontend

**Status:** React Migration in Progress (Jinja Active Reference)

- **Active Production UI:** Jinja2 server-rendered templates inside [`templates/`](file:///home/zacro/Desktop/testingold/FileServerProject/templates/). All user interactions rely on native HTML forms (`<form method="post">`).
- **React UI Directory:** [`frontend/`](file:///home/zacro/Desktop/testingold/FileServerProject/frontend/) on branch `react_v1` is currently an empty staging directory ready for component implementation.
- **Migration Reference:** An initial proof-of-concept React frontend was previously prototyped in branch `newbranch` (commit `bf2becb`), containing exploratory Vite, React, TypeScript, and Axios components.
- **Target Experience:** A modern client-side Single Page Application (SPA) providing folder navigation, file uploads with progress, context menus, and inline AI inspection without full-page reloads.

---

## 3. Operational Feature Matrix

Each feature is classified using one of five verified statuses:
- **Implemented and verified:** Verified against code and stored artifacts.
- **Implemented but not verified:** Code exists in backend/templates, but requires external service/environment to validate.
- **Partially implemented:** Implementation is underway or missing core layers (e.g. backend exists without frontend, or vice versa).
- **Broken / Blocked:** Code exists but has a fatal bug or unresolved dependency preventing execution.
- **Planned:** Feature designed or desired, but no working code currently exists.

| Feature Category | Specific Operation | Status | Technical Detail |
|---|---|---|---|
| **File Operations** | Multi-file Upload | **Implemented and verified** | `POST /upload` handles `list[UploadFile]`, streams bytes in ~156MB chunks, saves to `uploads/{uuid}_{filename}`, writes metadata to DB. Verified by existing uploaded assets. |
| **File Operations** | File Download | **Implemented and verified** | `POST /download` accepts `file_id`, queries database for path & name, checks disk existence, streams `FileResponse`. |
| **File Operations** | File Deletion | **Implemented and verified** | `POST /delete` unlinks physical file from `uploads/` via `pathlib.Path.unlink(missing_ok=True)` and deletes DB entity record. |
| **File Operations** | File Rename | **Planned** | Neither `main.py` nor `db/services.py` has a rename endpoint or service function. |
| **File Operations** | File Move / Drag-and-Drop | **Planned** | No move endpoint exists in the backend. Moving files between folders is not yet supported. |
| **Folder Operations**| Create Folder | **Implemented and verified** | `POST /folders` creates `Folder` entity with unique constraint checks per parent folder (`uix_parent_folder_name`). |
| **Folder Operations**| Recursive Folder Delete | **Implemented and verified** | `POST /folders/delete` recursively deletes child folders, unlinks all contained physical files, and cleans up DB records. |
| **Folder Operations**| Folder Navigation & Breadcrumbs | **Implemented and verified** | `GET /files` & `GET /files/{folder_path:path}` dynamically traverses path segments via `resolve_path_to_folder` and builds breadcrumb trail. |
| **AI Features** | PDF Summarization | **Implemented but not verified** | `POST /summary` extracts text via `PyPDF2.PdfReader`, queries Ollama (`gemma3:4b`), writes summary to `files.metadata["summary"]`. Dependent on running Ollama service. |
| **AI Features** | Image OCR | **Implemented and verified** | `POST /ocr` & `POST /api/ocr/{file_id}` call `ai/ocr.py` using Tesseract CLI. Extracts text, updates file metadata with `ocr_text`, and returns extracted string. |
| **AI Features** | AI Background Processing Queue | **Planned** | Does not exist. Summarization and OCR are executed synchronously inside HTTP request handlers, blocking worker threads during inference. |
| **User & Auth** | User Authentication / Accounts | **Planned** | `User` entity and relations are commented out in `db/models.py` and `db/schemas.py`. No authentication or multi-tenant isolation exists. |
| **Observability** | Prometheus Metrics | **Implemented and verified** | `GET /metrics` exposed via `prometheus-fastapi-instrumentator`. Scraped by Prometheus container on port 9090. |

---

## 4. Known Limitations & Bugs

### Resolved Critical Bugs
1. **OCR Crash in `ai/ocr.py` & Local Database Fallback in `db/database.py`**:
   - Fixed `UnboundLocalError` in [`ai/ocr.py`](file:///home/zacro/Desktop/testingold/FileServerProject/ai/ocr.py) where `extracted_text` was read before assignment.
   - Fixed return value in `ai/ocr.py` to return the decoded string instead of raw bytes.
   - Added local development fallback to `DATABASE_URL` (`postgresql://ADMIN:2371@localhost:5432/MYDB`) in [`db/database.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/database.py).

### Architectural & Operational Limitations
1. **Synchronous AI Processing**:
   - Calling `/summary` with large PDFs freezes the FastAPI request worker while waiting for Ollama LLM generation. No queueing mechanism (e.g. Celery, Redis, or `BackgroundTasks`) is implemented.
2. **Missing Model Validation in Ollama**:
   - `ai/pdfsummarizer.py` targets model `"gemma3:4b"`. If the user has not explicitly run `ollama pull gemma3:4b` inside the container or host, requests fail with HTTP 404/500 from Ollama.
3. **Template-Coupled HTTP Endpoints**:
   - `main.py` returns HTML templates (`TemplateResponse`) or redirects (`RedirectResponse`). To serve the React frontend, endpoints must provide JSON payloads or support content-negotiation / dedicated API routes.
4. **Volume Mount Artifact in `db/init.sql`**:
   - `db/init.sql` is an empty directory created on the host when Docker ran with a volume mount to a non-existent file (`./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro`). Table creation currently relies on SQLAlchemy `create_all()`.
5. **No File Deduplication or Trash Bin**:
   - Deleting a file permanently removes it from disk and database immediately. There is no soft-delete or trash recovery.
