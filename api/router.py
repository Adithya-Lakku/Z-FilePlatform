"""Master router — assembles all sub-routers into a single include point.

main.py only needs:  app.include_router(router)
"""

from fastapi import APIRouter

from api import folders, files, ai, templates

# JSON API — all prefixed under /api
api_router = APIRouter(prefix="/api")
api_router.include_router(folders.router)
api_router.include_router(files.router)
api_router.include_router(ai.router)

# Top-level router bundles both the JSON API and the Jinja template routes
router = APIRouter()
router.include_router(api_router)
router.include_router(templates.router)

