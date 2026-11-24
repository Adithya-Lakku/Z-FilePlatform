# NimbusFS — Development Changelog

This changelog records feature-level evolutions, architectural changes, and operational milestones in the NimbusFS codebase. It explains why changes were made and how components evolved.

---

## 2026-11-24 — API Router Refactor (main.py → api/ package)

### Changes
- Created `api/` package with modular route files following the FastAPI `APIRouter` pattern:
  - [`api/router.py`](file:///home/zacro/Desktop/testingold/FileServerProject/api/router.py) — master router that assembles all sub-routers.
  - [`api/folders.py`](file:///home/zacro/Desktop/testingold/FileServerProject/api/folders.py) — JSON folder CRUD (`/api/folders`).
  - [`api/files.py`](file:///home/zacro/Desktop/testingold/FileServerProject/api/files.py) — JSON file CRUD (`/api/files`).
  - [`api/ai.py`](file:///home/zacro/Desktop/testingold/FileServerProject/api/ai.py) — JSON AI endpoints (`/api/ai`).
  - [`api/templates.py`](file:///home/zacro/Desktop/testingold/FileServerProject/api/templates.py) — all Jinja template routes (unchanged behavior).
  - [`api/deps.py`](file:///home/zacro/Desktop/testingold/FileServerProject/api/deps.py) — shared `DbSession` dependency.
  - [`api/schemas.py`](file:///home/zacro/Desktop/testingold/FileServerProject/api/schemas.py) — Pydantic request models extracted from `main.py`.
- Reduced [`main.py`](file:///home/zacro/Desktop/testingold/FileServerProject/main.py) from **557 lines → 65 lines**. It now only handles app creation, middleware, lifespan, and SPA serving.
- Updated `Context/FILE_MAP.md` and `Context/ARCHITECTURE.md` to reflect the new routing layer.

### Motivation
- Original `main.py` was a single 557-line monolith mixing app config, Jinja routes, JSON API routes, and Pydantic models.
- Followed the routing pattern from `sandbox/routertest/` as the reference architecture.

### Route Mapping (all URLs unchanged)
| Module | Prefix | Endpoints |
|---|---|---|
| `api/folders.py` | `/api/folders` | `GET /contents`, `POST /`, `DELETE /{id}`, `PATCH /{id}/rename`, `PATCH /{id}/move` |
| `api/files.py` | `/api/files` | `POST /upload`, `GET /{id}`, `GET /{id}/download`, `DELETE /{id}`, `PATCH /{id}/rename`, `PATCH /{id}/move` |
| `api/ai.py` | `/api/ai` | `POST /summarize/{id}`, `POST /ocr/{id}` |
| `api/templates.py` | *(root)* | `GET /`, `POST /upload`, `GET /files`, `POST /folders`, `POST /download`, `POST /delete`, `POST /summary`, `POST /ocr` |

### Verification
- All Python files pass `py_compile` syntax checks.
- No URL changes — all existing frontend and template links remain functional.

---

## 2026-10-21 — Fix OCR Module & Database Connection Fallback
 
### Changes
- Updated [`db/database.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/database.py) with fallback default `DATABASE_URL` (`postgresql://ADMIN:2371@localhost:5432/MYDB`) so scripts like `ocrtest.py` and local testing run without failing when the `DATABASE_URL` environment variable is not explicitly exported.
- Fixed `UnboundLocalError` in [`ai/ocr.py`](file:///home/zacro/Desktop/testingold/FileServerProject/ai/ocr.py) by assigning `extracted_text = result.stdout` before checking `isinstance(extracted_text, bytes)` and decoding.
- Updated [`ai/ocr.py`](file:///home/zacro/Desktop/testingold/FileServerProject/ai/ocr.py) to return decoded string rather than raw bytes.
- Updated [`ocrtest.py`](file:///home/zacro/Desktop/testingold/FileServerProject/ocrtest.py) to use an instantiated `SessionLocal()` session instead of FastAPI dependency `Annotated` type alias.

### Verification
- Ran `python ocrtest.py` on test file `Screenshot_20261013_143052.png` (`05bf7fe7-cfb5-42de-beb0-cd5d5fa9e850`).
- OCR successfully extracted text and persisted `ocr_text` into PostgreSQL `files.metadata`.

---

## 2026-10-16 — Backend Service Layer Refactoring (Separation of Concerns)

### Changes
- Refactored JSON API endpoints in `main.py` to eliminate all direct database queries, mutations, and model imports.
- Extended `db/services.py` with dedicated service functions:
  - `get_folder_by_id`: UUID resolution and query for folder records.
  - `get_breadcrumbs`: Ancestor hierarchy traversal returning ordered breadcrumb trails.
  - `rename_folder`: Name validation, sibling collision checks, and persistence.
  - `move_folder`: Circular subtree cycle prevention, target verification, collision checks, and parent update.
  - `get_file_by_id`: File lookup by ID.
  - `rename_file`: Name validation and persistence.
  - `move_file`: Target folder validation and parent update.
  - Updated `create_file` to return created file model records directly.
- Restored strict architecture boundary: `main.py` is strictly a routing/presentation layer delegating to `db/services.py`.

### Files Changed
- `main.py`
- `db/services.py`

---

## 2026-10-14 — Establishment of CONTEXT Documentation System

### Changes
- Established structured AI/agent context documentation under `Context/` (`README.md`, `CURRENT_STATE.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `FILE_MAP.md`, `DECISIONS.md`).
- Authored root-level `AGENTS.md` specifying pair-programming guidelines and context maintenance protocols.
- Audited complete codebase to verify operational status of backend routes, Jinja templates, Docker configurations, and AI features.
- Formally identified known defect in `ai/ocr.py` (unassigned `extracted_text` variable).

### Files Changed / Created
- `Context/README.md`
- `Context/CURRENT_STATE.md`
- `Context/ARCHITECTURE.md`
- `Context/CHANGELOG.md`
- `Context/FILE_MAP.md`
- `Context/DECISIONS.md`
- `AGENTS.md`

### Verification
- Codebase audit: Completed across all Python modules, Docker configs, and Jinja templates.
- Backend regression test: No runtime code altered.

---

## 2026-10-13 — Tesseract OCR Integration

### Changes
- Added optical character recognition support for image files.
- Added `ai/ocr.py` executing `tesseract <filepath> stdout` via `subprocess.run`.
- Added `templates/ocr.html` and wired `/ocr` endpoint in `main.py`.
- Updated Dockerfile to install `tesseract-ocr` via `apt-get`.

### Files Changed
- `ai/ocr.py`
- `templates/ocr.html`
- `templates/files.html`
- `main.py`
- `dockerfile`

### Verification & Issues
- Known Issue: `ai/ocr.py` contains an `UnboundLocalError` due to accessing `extracted_text` before assigning `result.stdout`.
- Docker build installs tesseract, but endpoint runtime requires variable fix.

---

## 2026-10-13 — Prometheus & Grafana Monitoring

### Changes
- Integrated `prometheus_fastapi_instrumentator` into FastAPI application.
- Exposed `/metrics` endpoint on FastAPI app.
- Configured Prometheus scrape job in `prometheus.yml` (10s scrape interval targeting `fastapi_app:8000`).
- Added Prometheus and Grafana containers to `docker-compose.yml`.

### Files Changed
- `main.py`
- `requirements.txt`
- `prometheus.yml`
- `docker-compose.yml`

### Verification
- FastAPI exports standard Prometheus metrics.
- Prometheus container runs on port 9090, Grafana on port 3000.

---

## 2026-07-01 — Dockerization & Ollama PDF Summarization

### Changes
- Containerized the application with Docker and Docker Compose.
- Set up PostgreSQL container (`fastapi-postgres`) with persistent volume `pgdata`.
- Introduced Ollama container with volume mount for local LLM inference.
- Implemented `ai/pdfsummarizer.py` extracting PDF text with `PyPDF2` and posting to `http://ollama:11434/api/generate` (`gemma3:4b`).
- Stored generated summaries inside PostgreSQL `files.metadata` JSON column.
- Added `templates/summary.html` and `/summary` route in `main.py`.

### Files Changed
- `docker-compose.yml`
- `dockerfile`
- `ai/pdfsummarizer.py`
- `templates/summary.html`
- `main.py`
- `db/services.py`

### Verification
- Uploaded sample PDFs (`VIT PAYMENT.pdf`, `resume-7.pdf`) verified in storage.
- Documented requirement for manual `ollama pull gemma3:4b` step.

---

## 2026-06-26 — React Frontend Proof of Concept (Branch: `newbranch`)

### Changes
- Tested a standalone React frontend prototype with Vite, TypeScript, and Tailwind/Vanilla CSS.
- Prototyped file explorer components: `ExplorerView`, `FileCard`, `FolderCard`, `Breadcrumbs`, and `UploadManager`.
- Prototyped Axios API client and custom hooks (`useFiles`, `useUpload`, `useCurrentFolder`).
- Identified requirement to provide JSON API responses in FastAPI alongside or replacing Jinja templates.

### Files Changed (in `newbranch`)
- `frontend/*` (Vite SPA project structure)
- `db/services.py` (preliminary JSON formatting tweaks)

### Status
- Kept on `newbranch` as design inspiration; clean migration initialized on branch `react_v1`.

---

## 2026-06-25 — Multi-File Upload & Folder Hierarchy

### Changes
- Refactored upload handler to accept multiple files simultaneously (`files: list[UploadFile]`).
- Implemented hierarchical folder system:
  - `db/models.py`: Added `Folder` table with self-referencing `parent_folder_id` and unique constraints.
  - `db/services.py`: Added `resolve_path_to_folder` for dynamic path traversal (`/folder1/subfolder2`).
  - Added recursive folder deletion removing child folders, physical files, and database records.
- Updated `templates/files.html` with breadcrumbs navigation and folder creation form.

### Files Changed
- `main.py`
- `db/models.py`
- `db/schemas.py`
- `db/services.py`
- `templates/files.html`
- `templates/upload.html`

### Verification
- Folder creation, nested navigation, and recursive deletion tested and operational.

---

## Early Commits — Initial FastAPI & Database Foundation

### Changes
- Initial project creation with FastAPI, Jinja2, and local file storage.
- Replaced direct filesystem listing with PostgreSQL persistence via SQLAlchemy 2.0.
- Implemented UUID file identifiers with disk storage pattern `{uuid}_{filename}`.
- Added database connection pooling and Pydantic schemas.
