from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import init_db
from app.routers import (
    auth,
    opportunities,
    profile,
    applications,
    organizer,
    teams,
    tasks,
    dashboard,
    staff,
    p1
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    init_db()
    yield

app = FastAPI(
    title="CampusForge API",
    description="CampusForge — Student Opportunity & Collaboration Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth.router, prefix="/api")
app.include_router(opportunities.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(organizer.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(staff.router, prefix="/api")
app.include_router(p1.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "CampusForge"}

# Mount built frontend dist if available (for single-service deployment)
from fastapi.responses import FileResponse
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
assets_dir = os.path.join(frontend_dist, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Do not intercept API requests
    if full_path.startswith("api/"):
        return {"detail": "Endpoint not found"}
    if os.path.exists(frontend_dist):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return {"message": "CampusForge API is running. Build frontend with 'npm run build' to view UI."}

