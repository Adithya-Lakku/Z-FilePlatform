# NimbusFS — Agent Guidelines & Instructions

Welcome, coding agent. This repository is **NimbusFS**, a self-hosted, AI-enabled personal cloud file management platform built with FastAPI, PostgreSQL, Docker, and React.

Follow these strict operational instructions whenever working in this repository.

---

## 1. Mandatory First Step: Read the Context System

Before proposing architectural changes, adding new features, or editing code:
1. **Read [`Context/README.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/README.md)** — Project overview, technology stack, and constraints.
2. **Read [`Context/CURRENT_STATE.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/CURRENT_STATE.md)** — Verified feature status, current limitations, and known bugs.
3. **Read [`Context/ARCHITECTURE.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/ARCHITECTURE.md)** — Component topology, data flows, and database schemas.
4. **Read [`Context/FILE_MAP.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/FILE_MAP.md)** — Feature-to-file mapping. Identify which files own a feature before touching code.
5. **Read [`Context/DECISIONS.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/DECISIONS.md)** — Technical rationales (ADRs) explaining why things are designed this way.

---

## 2. Core Engineering Rules

- **Do Not Rewrite the Backend:** The backend in `main.py` and `db/services.py` has working file operations, database transactions, and AI hooks. Extend or adapt it (e.g. adding JSON responses); do not replace or rewrite it.
- **Preserve Existing Backend Functionality:** Ensure existing routes and Jinja templates remain functional until the React frontend is fully operational and verified.
- **No Unjustified Schema Changes:** The `Folder` and `File` models in `db/models.py` have strict unique constraints. Do not modify the database schema without explicit justification.
- **Honest Verification Only:** Never claim an untested feature works. Mark features as `Implemented and verified`, `Implemented but not verified`, `Partially implemented`, `Broken / Blocked`, or `Planned`.
- **Maintain Virtual Directory Semantics:** Folders are virtual records in PostgreSQL (`parent_folder_id`), while physical file bytes are stored flat in `uploads/{uuid}_{original_name}`. Never assume directory paths exist as physical folders on disk.
- **Keep React Architecture Understandable:** Structure React components cleanly into `components/`, `hooks/`, `api/`, and `types/`. Avoid gratuitous abstraction layers.

---

## 3. Mandatory Context Maintenance Protocol

Whenever you make meaningful changes to the project:
1. **Update [`Context/CURRENT_STATE.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/CURRENT_STATE.md):** Update verified statuses, move items from "Planned" to "Implemented and verified", and record newly discovered limitations.
2. **Update [`Context/CHANGELOG.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/CHANGELOG.md):** Add a concise, feature-level entry describing the change, files modified, verification results, and any known issues.
3. **Update [`Context/FILE_MAP.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/FILE_MAP.md):** Register new components, hooks, or backend routes.
4. **Update [`Context/DECISIONS.md`](file:///home/zacro/Desktop/testingold/FileServerProject/Context/DECISIONS.md):** Document any new architectural decisions (DEC-xxx) explaining context, decision, reasons, and consequences.

---

## 4. Verification Checklist

Before concluding your task:
- [ ] Has the code been verified against existing tests or manual execution?
- [ ] Are all types aligned between backend Pydantic models (`schemas.py`) and TypeScript types (`types/index.ts`)?
- [ ] Have all relevant `Context/` documents been updated to reflect the new state of the repository?
- [ ] Does the implementation preserve existing file storage and database integrity?
