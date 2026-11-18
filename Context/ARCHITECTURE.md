# NimbusFS — System Architecture

This document describes the architectural topology, component interactions, database schemas, and data flows of the NimbusFS platform.

---

## 1. System Component Topology

```text
                      +---------------------------------------+
                      |             Client Browser            |
                      |  - Jinja2 HTML Views (Current)        |
                      |  - React SPA / Vite (Target)          |
                      +-------------------+-------------------+
                                          |
                                          | HTTP (HTML Forms / JSON / Multipart)
                                          v
                      +---------------------------------------+
                      |        FastAPI App Container          |
                      |              (main.py)                |
                      |  - Routing & Request Handlers         |
                      |  - Lifespan & DB Init                 |
                      |  - Prometheus Instrumentation         |
                      +---------+-------------------+---------+
                                |                   |
                 +--------------+                   +-------------+
                 |                                                |
                 v                                                v
+---------------------------------+              +---------------------------------+
|     Database Services Layer     |              |       AI Services Layer         |
|        (db/services.py)         |              |        (ai/ - Synchronous)      |
|  - create_file / download_file  |              |  - pdfsummarizer.py (PyPDF2)    |
|  - resolve_path_to_folder       |              |  - ocr.py (Tesseract CLI)       |
|  - delete_folder_recursive      |              +--------+---------------+--------+
|  - updateMetadata               |                       |               |
+-------+-----------------+-------+                       |               |
        |                 |               HTTP API (Port 11434)   | Local Subprocess
        | SQL             | File I/O                      |               |
        v                 v                               v               v
+---------------+ +---------------+              +----------------+ +---------------+
|  PostgreSQL   | | Local Storage |              | Ollama Server  | | Tesseract OCR |
|  (MYDB on     | |   uploads/    |              |  Container     | | (CLI inside   |
|   Port 5432)  | |  {uuid}_{name}|              |  (gemma3:4b)   | |  fastapi_app) |
+---------------+ +---------------+              +----------------+ +---------------+
        ^
        | Scrape metrics (Port 8000 /metrics)
+-------+-------+
|  Prometheus   | <-----+ Grafana Dashboard
|  (Port 9090)  |       | (Port 3000)
+---------------+       +------------------
```

---

## 2. Docker Infrastructure & Networking

The system runs across a dedicated bridge network `fileserver_net` defined in [`docker-compose.yml`](file:///home/zacro/Desktop/testingold/FileServerProject/docker-compose.yml):

| Container Name | Service Name | Internal Host & Port | Host Port Mapping | Health / Dependencies |
|---|---|---|---|---|
| `fastapi-postgres` | `db` | `db:5432` | `5432:5432` | Healthy via `pg_isready -U ADMIN -d MYDB` |
| *(dockerfile build)* | `fastapi_app` | `fastapi_app:8000` | `8000:8000` | Depends on `db` (healthy), `ollama` (started) |
| *(ollama image)* | `ollama` | `ollama:11434` | `11434:11434` | Persistent external volume `ollama` |
| `prometheus` | `prometheus` | `prometheus:9090` | `9090:9090` | Scrapes `fastapi_app:8000` every 10s |
| `grafana` | `grafana` | `grafana:3000` | `3000:3000` | Depends on `prometheus` |

---

## 3. Database Schema & Data Models

NimbusFS uses PostgreSQL with UUID primary keys. Tables are defined in [`db/models.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/models.py) and created on application startup.

### `folders` Table
Represents the virtual directory tree.
```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    parent_folder_id UUID REFERENCES folders(id),
    date_created TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uix_parent_folder_name UNIQUE (parent_folder_id, name)
);
CREATE UNIQUE INDEX uix_root_folder_name ON folders (name) WHERE parent_folder_id IS NULL;
```
- **Self-referencing Foreign Key:** `parent_folder_id` points to `folders.id`. When `parent_folder_id IS NULL`, the folder is at the root level.
- **Uniqueness Guarantee:** No two folders in the same parent (or at root) can share the same name.

### `files` Table
Stores metadata and physical disk pointers for files.
```sql
CREATE TABLE files (
    id UUID PRIMARY KEY,
    filename VARCHAR NOT NULL,
    filepath VARCHAR NOT NULL,
    size_bytes BIGINT,
    date_created TIMESTAMP DEFAULT NOW(),
    metadata JSON,
    parent_folder_id UUID REFERENCES folders(id)
);
```
- `filepath`: The absolute/relative path on disk (e.g. `uploads/<uuid>_<filename>`).
- `metadata`: Flexible JSON column storing AI summaries (`{"summary": "..."}`) and OCR text (`{"ocr_text": "..."}`).
- `parent_folder_id`: Optional UUID linking the file to a folder. If `NULL`, the file resides in the root view.

---

## 4. End-to-End Data Flows

### A. Multi-File Upload Flow
1. **Client Submission:** Browser submits `POST /upload` with multipart form data containing:
   - `files`: Array of `UploadFile` binaries.
   - `parent_folder_id`: Optional UUID string for target folder.
   - `current_path`: Human-readable folder path string (e.g., `projects/docs`).
2. **File Persistence:** `_services.create_file` executes:
   - Generates a new `file_id = str(uuid.uuid4())`.
   - Sanitizes filename: `original_name = Path(file.filename).name`.
   - Streams bytes to disk: `uploads/{file_id}_{original_name}` in 156MB chunks.
   - Calculates verified file size via `save_path.stat().st_size`.
3. **Database Insertion:** Inserts a new `_models.File` record into PostgreSQL with `parent_folder_id`.
4. **Response:** In Jinja, returns `upload.html` with list of filenames. (In React migration, returns JSON list of file metadata objects).

### B. Hierarchical Folder Navigation Flow
1. **Client Request:** Browser requests `GET /files/{folder_path:path}` (or `GET /files` for root).
2. **Path Resolution (`resolve_path_to_folder`):**
   - Splits `folder_path` by `/` into segments: `["work", "reports"]`.
   - Sequentially queries `folders` matching `parent_folder_id` and `name` for each segment.
   - Raises HTTP 404 if any intermediate folder is missing.
3. **Contents Retrieval (`get_folder_contents`):**
   - Queries `folders` where `parent_folder_id == current_folder.id`.
   - Queries `files` where `parent_folder_id == current_folder.id`.
4. **Breadcrumb Assembly:** Iterates over path segments to construct breadcrumb navigation links `[{"name": "Root", "path": ""}, ...]`.
5. **Response:** Renders `files.html` populated with breadcrumbs, subfolders, and files.

### C. File Download Flow
1. **Client Request:** Browser posts `file_id` to `POST /download`.
2. **Record Lookup:** `_services.download_file` fetches `File` by UUID from database. Raises HTTP 404 if record not found.
3. **Disk Verification:** Confirms `Path(file_path).exists()` on host disk.
4. **Streaming Delivery:** Returns FastAPI `FileResponse` with MIME `application/octet-stream` and `Content-Disposition: attachment; filename="{original_filename}"`.

### D. Recursive Folder Deletion Flow
1. **Client Request:** Submits `POST /folders/delete` with `folder_id` and `current_path`.
2. **Recursive Traversal (`delete_folder_recursive`):**
   - Finds all child subfolders where `parent_folder_id == folder_id` and recurses into each.
   - For every file in the current folder: unlinks the physical file from `uploads/` via `unlink(missing_ok=True)` and deletes the DB row.
   - Deletes the folder DB row.
3. **Commit & Redirect:** Commits the database transaction and issues an HTTP 303 redirect to the parent path.

### E. AI Document Summarization Flow
1. **Client Request:** Submits `POST /summary` with `file_id`.
2. **Text Extraction:** PyPDF2 `PdfReader` extracts raw text page-by-page from the disk file.
3. **Ollama LLM Generation:**
   - Issues synchronous POST to `http://ollama:11434/api/generate`.
   - Model: `gemma3:4b`.
   - Prompt: `"summarize the text in 200 words{text} with proper spacing"`.
4. **Metadata Update:** Parsed summary string is merged into `files.metadata["summary"]` via `_services.updateMetadata`.
5. **Response:** Renders `summary.html` with the generated summary.

### F. OCR Image Extraction Flow
1. **Client Request:** Submits `POST /ocr` with `file_id`.
2. **Process Execution:** Executes `tesseract <filepath> stdout` via `subprocess.run` (timeout 30s).
3. **Known Defect:** In current codebase, `extracted_text` variable is referenced prior to assignment from `result.stdout`, resulting in an unhandled exception.
4. **Intended Behavior:** Decode stdout bytes to UTF-8 string, merge into `files.metadata["ocr_text"]`, and return text to client.

---

## 5. React Frontend Integration Strategy

To transition from server-rendered Jinja templates to React SPA without breaking the existing backend:

```text
               +--------------------------------------+
               |          Client HTTP Request         |
               +-------------------+------------------+
                                   |
         +-------------------------+-------------------------+
         | Accepts: application/json                         | Form POST / Browser navigation
         v                                                   v
+-------------------------------+                   +-------------------------------+
|     JSON API Endpoints        |                   |      Jinja2 Endpoints         |
|  (e.g. /api/files, /api/upload)|                   |   (Legacy UI - templates/)    |
+---------------+---------------+                   +---------------+---------------+
                |                                                   |
                +-------------------------+-------------------------+
                                          |
                                          v
                        +-----------------------------------+
                        |   Shared Service Layer (services) |
                        |     - create_file                 |
                        |     - resolve_path_to_folder      |
                        |     - download_file               |
                        +-----------------------------------+
```

- **Dual-Surface Compatibility:** Backend business logic in [`db/services.py`](file:///home/zacro/Desktop/testingold/FileServerProject/db/services.py) remains the single source of truth.
- **RESTful Endpoints:** Endpoints return Pydantic model schemas (`schemas.File`, `schemas.Folder`) formatted as JSON.
- **Client State:** The React application manages local explorer state (breadcrumbs, selected items, upload queue) and interacts with the backend over Axios.
