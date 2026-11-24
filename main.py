from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from pathlib import Path
from contextlib import asynccontextmanager

from db import database as _database
from api.router import router
from prometheus_fastapi_instrumentator import Instrumentator

BASE_DIR = Path(__file__).resolve().parent


# --- Lifespan ---

@asynccontextmanager
async def lifespan(app):
    _database.Base.metadata.create_all(bind=_database.engine)  # create tables if needed
    yield


# --- App factory ---

app = FastAPI(lifespan=lifespan)

# CORS middleware for React dev server (Vite on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)  # used for prometheus

# Include all routes (JSON API + Jinja templates) from the api package
app.include_router(router)


# --- Debug endpoint ---

@app.get("/testing")
def testing_endpoint():
    """Quick debug endpoint — use /api/folders/contents instead."""
    return {"note": "debug endpoint — use /api/folders/contents instead"}


# --- React SPA static file serving (production) ---
# Must be the LAST route so it doesn't intercept /api/ or Jinja routes.
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
