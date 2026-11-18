# NimbusFS — Project Context

## Overview

**NimbusFS** is a self-hosted, lightweight, AI-enabled personal cloud file management platform. It combines traditional hierarchical file and folder management with local AI processing capabilities (document summarization and optical character recognition) while preserving complete user privacy through entirely local/on-premise execution.

## Problem It Solves

Cloud storage services (Google Drive, Dropbox) often lack integrated, privacy-first AI intelligence running on local hardware, while standard NAS solutions lack modern web interfaces and contextual AI processing. NimbusFS provides:
- Secure local storage of files and hierarchical folders.
- Transparent metadata indexing in PostgreSQL.
- Local LLM document analysis (PDF summarization using Ollama and Gemma).
- Optical Character Recognition (OCR using Tesseract) for scanned assets and images.
- Full observability via Prometheus and Grafana metrics instrumentation.

---

## Technology Stack

| Layer | Technology | Details / Versions (Verified) |
|---|---|---|
| **Backend Framework** | FastAPI (Python 3.13) | `fastapi==0.137.2`, `uvicorn==0.49.0`, `starlette==1.0.0` |
| **Database** | PostgreSQL 16 (Alpine) | Running via Docker container `fastapi-postgres` |
| **ORM / Migrations** | SQLAlchemy 2.0 | `SQLAlchemy==2.0.50`, `psycopg2-binary==2.9.12` |
| **Validation / Schemas** | Pydantic v2 | `pydantic-extra-types==2.11.1` |
| **Current UI** | Jinja2 Templates | `Jinja2==3.1.6`, server-rendered HTML forms |
| **Target UI (In Progress)** | React + TypeScript + Vite | Target branch `react_v1`, modern SPA file explorer |
| **AI Inference** | Ollama (`gemma3:4b`) | Local REST API at `http://ollama:11434/api/generate` |
| **OCR Engine** | Tesseract OCR | Installed in Docker image, invoked via subprocess |
| **Document Parsing** | PyPDF2 | `PyPDF2==3.0.1` |
| **Observability** | Prometheus + Grafana | `prometheus-fastapi-instrumentator==8.1.0`, port 9090 & 3000 |
| **Containerization** | Docker & Docker Compose | Multi-container composition (`fastapi_app`, `db`, `ollama`, `prometheus`, `grafana`) |

---

## Project Organization

```text
FileServerProject/
├── Context/                 # AI & Developer Context Documentation System
│   ├── README.md            # Entry point (this file)
│   ├── CURRENT_STATE.md     # Verified operational status & known bugs
│   ├── ARCHITECTURE.md      # System components, data flows, and schema
│   ├── CHANGELOG.md         # Feature-level evolutionary history
│   ├── FILE_MAP.md          # Feature-to-code mapping and navigation
│   └── DECISIONS.md         # Architectural Decision Records (ADRs)
├── ai/                      # AI processing modules
│   ├── ocr.py               # Tesseract CLI integration for image OCR
│   └── pdfsummarizer.py     # PyPDF2 extraction and Ollama LLM summarization
├── db/                      # Database models, schemas, and persistence services
│   ├── database.py          # SQLAlchemy engine, session maker, and Base
│   ├── models.py            # ORM entities (Folder, File)
│   ├── schemas.py           # Pydantic validation and serialization models
│   ├── services.py          # Core business logic for files, folders, and metadata
│   ├── init_db.py           # Database table initialization script
│   └── init.sql/            # Directory artifact from prior Docker volume mount
├── templates/               # Server-side Jinja2 HTML templates
│   ├── index.html           # Landing page with root upload and download forms
│   ├── files.html           # File explorer, breadcrumb navigation, action forms
│   ├── upload.html          # Upload confirmation view
│   ├── delete.html          # File deletion confirmation view
│   ├── summary.html         # AI summary display view
│   └── ocr.html             # OCR extracted text display view
├── frontend/                # React single-page application workspace (Migration target)
├── uploads/                 # Local filesystem storage for uploaded file bytes
├── main.py                  # FastAPI application entrypoint and route handlers
├── requirements.txt         # Python dependencies
├── dockerfile               # Python 3.13-slim image definition with Tesseract
├── docker-compose.yml       # 5-service orchestration definition
├── prometheus.yml           # Prometheus scrape configuration (10s scrape interval)
└── AGENTS.md                # AI agent operating instructions
```

---

## Read These Files First

Before writing code or proposing architectural changes, every agent must read:

1. **[`CURRENT_STATE.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/CURRENT_STATE.md)** — Know what actually works, what is untested, and what is currently broken.
2. **[`ARCHITECTURE.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/ARCHITECTURE.md)** — Understand how components communicate, storage patterns, and data flows.
3. **[`FILE_MAP.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/FILE_MAP.md)** — Identify which files control which features before making edits.
4. **[`DECISIONS.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/DECISIONS.md)** — Understand past technical constraints and architectural choices.
5. **[`CHANGELOG.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/CHANGELOG.md)** — Check when you need historical rationale for feature evolution.

---

## Critical Development Constraints

1. **Preserve Existing Backend Functionality**: Do not break or remove endpoints currently relied upon by the Jinja templates while introducing API capabilities for React.
2. **Do Not Rewrite the Backend**: The backend contains functional database and file persistence logic. Extend and adapt endpoints (e.g., JSON response support); do not rewrite from scratch.
3. **No Schema Changes Without Explicit Justification**: `Folder` and `File` models have strict unique constraints (`uix_parent_folder_name` and `uix_root_folder_name`). Do not alter schemas without careful migration consideration.
4. **Never Claim Untested Features Work**: If a feature has not been exercised and validated end-to-end, mark it clearly as `Implemented but not verified` or `Broken / Blocked`.
5. **Understand the Path Resolution Paradigm**: Folder hierarchy in NimbusFS is resolved dynamically using virtual folder trees linked by `parent_folder_id` in PostgreSQL, not physical subdirectories on disk.
6. **Update CONTEXT Documentation**: Every meaningful change to code, API contracts, components, or dependencies must be reflected in the relevant `Context/` documents.

---

## Source of Truth

**The implementation is authoritative.**

If any statement in documentation contradicts the active codebase:
1. Investigate the discrepancy in the code.
2. Verify actual behavior against running services or tests.
3. Update the documentation to reflect reality rather than assuming the document was correct.
