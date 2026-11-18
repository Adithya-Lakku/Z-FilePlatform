# NimbusFS — Architecture Decision Records (ADRs)

This document records the foundational architectural decisions made in NimbusFS, along with the technical context, rationale, and consequences for each decision.

---

## DEC-001: Preserve the Existing FastAPI Backend

### Context
NimbusFS already has a functioning backend implemented in FastAPI with SQLAlchemy, handling database interactions, file persistence, path resolution, and AI integrations.

### Decision
The React migration must reuse and extend the existing FastAPI backend rather than replacing or rewriting it with another language or framework (such as Node.js or Go).

### Reason
- The backend contains functional, tested business logic in `db/services.py` (e.g., recursive folder deletion, breadcrumb resolution, safe disk streaming).
- Reimplementing the backend from scratch introduces unnecessary regression risk and duplicates database schema work.
- FastAPI provides automatic OpenAPI documentation, async support, and high performance suitable for file streaming.

### Consequences
- Existing routes must be preserved or adapted to serve JSON responses alongside or in place of Jinja templates.
- Backend logic must remain decoupled from presentation logic.

---

## DEC-002: Use React, TypeScript, and Vite for the Frontend

### Context
The initial user interface is built with server-rendered Jinja2 templates. While functional, server-rendered forms cause full-page reloads on every upload, navigation, or AI action, resulting in a suboptimal user experience for a file explorer.

### Decision
Migrate the user interface to a Single Page Application (SPA) built with React, TypeScript, and Vite.

### Reason
- **User Experience:** File management benefits greatly from client-side state (instant folder switching, optimistic UI updates, drag-and-drop, upload progress bars, and modal dialogs).
- **Type Safety:** TypeScript enforces compile-time type alignment with backend Pydantic models.
- **Fast Developer Feedback:** Vite provides near-instant Hot Module Replacement (HMR).

### Consequences
- Requires establishing JSON API contracts between React and FastAPI.
- Requires building and serving the compiled SPA bundle in production Docker containers or via an Nginx reverse proxy.

---

## DEC-003: Virtual Folder Hierarchy in PostgreSQL

### Context
File systems can be structured either by mirroring directory trees physically on disk (e.g., creating actual folders `/uploads/folder1/folder2/file.txt`) or by storing files flat and maintaining a virtual hierarchy in the database.

### Decision
NimbusFS maintains a virtual folder hierarchy in the PostgreSQL `folders` table using a self-referencing `parent_folder_id` foreign key.

### Reason
- **Renaming and Moving Performance:** In a virtual hierarchy, renaming or moving a folder containing thousands of files is an $O(1)$ database update (`UPDATE folders SET parent_folder_id = ...`) rather than an expensive recursive filesystem move.
- **Security & Integrity:** Eliminates directory traversal vulnerabilities (e.g. `../../etc/passwd`).
- **Constraint Enforcement:** PostgreSQL enforces uniqueness constraints (`uix_parent_folder_name` and `uix_root_folder_name`) transactionally.

### Consequences
- Folder paths in URLs must be dynamically resolved to folder IDs via `resolve_path_to_folder`.
- Deleting a folder requires explicit recursive cleanup in both the database and on disk (`delete_folder_recursive`).

---

## DEC-004: Flat Physical Storage with UUID Prefixing

### Context
Uploaded files need a safe, collision-resistant storage pattern on the server's local disk.

### Decision
Store all file payloads flat inside the `uploads/` directory, naming each file with the pattern `{uuid}_{sanitized_original_filename}`.

### Reason
- **Collision Avoidance:** Multiple files uploaded with identical names (e.g., `resume.pdf` or `invoice.pdf`) will never overwrite each other.
- **Path Sanitization:** The filename component is extracted via `Path(file.filename).name`, preventing malicious directory traversal in user-supplied filenames.
- **Direct Access:** Files can be located and deleted with a single filesystem operation using the stored `filepath`.

### Consequences
- The physical storage directory does not reflect the user's virtual directory structure.
- Orphan file detection requires reconciling filesystem contents against the `files` table in PostgreSQL.

---

## DEC-005: Store AI Metadata in PostgreSQL JSON Field

### Context
Different AI features produce varying metadata structures (e.g., PDF summarization outputs text summaries and token counts; OCR outputs raw text and confidence scores; future features may extract EXIF or tags).

### Decision
Store AI results and arbitrary file attributes in a PostgreSQL `JSON` column (`files.metadata`, mapped in Python as `file_metadata`).

### Reason
- **Schema Flexibility:** New AI extractors or metadata fields can be stored immediately without running database migrations or altering column schemas.
- **Atomic Updates:** The `updateMetadata` service function shallow-merges new keys into existing metadata objects atomically.

### Consequences
- Application code must validate the presence of expected JSON keys before using them.
- JSON queries are schema-free and do not enforce field-level constraints in the database engine.

---

## DEC-006: Local Privacy-First AI via Ollama and Tesseract

### Context
NimbusFS provides document intelligence (summarization and OCR) without sending private user documents to external cloud services (e.g. OpenAI, Google Cloud).

### Decision
Use local, containerized AI inference engines:
1. **Ollama (`gemma3:4b`)** running in a dedicated container for LLM summarization.
2. **Tesseract OCR** installed directly in the application container for image text extraction.

### Reason
- **Privacy:** User documents, PDFs, and scanned receipts never leave the self-hosted environment.
- **Cost:** Zero recurring API fees for cloud inference.
- **Offline Capability:** The system functions in air-gapped or disconnected environments.

### Consequences
- Host hardware must have sufficient CPU/RAM (or GPU passthrough) to run local model inference.
- Inference is computationally intensive and requires asynchronous or background execution to avoid blocking the HTTP worker thread.

---

## DEC-007: Dual-Surface API Compatibility During Migration

### Context
The application is actively being migrated from server-rendered Jinja2 HTML templates to a React Single Page Application.

### Decision
Maintain dual-surface compatibility during the migration phase: do not arbitrarily delete Jinja templates or break HTML form endpoints until the React equivalent is fully verified.

### Reason
- Allows developers and users to verify and compare behavior between the legacy UI and the new React UI.
- Prevents breaking the application in the middle of active development.

### Consequences
- Endpoints must either be duplicated with an `/api` prefix (e.g. `/api/files`) or use HTTP content negotiation (`Accept: application/json`) to return JSON to React and HTML to legacy browsers.
