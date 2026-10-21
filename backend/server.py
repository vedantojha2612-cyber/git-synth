"""
FastAPI Server for Git Synth Engine.
Provides clean REST API endpoints for repository sequence generation,
author metrics, audio synthesis parameters, and system health.
Mounts frontend SPA static assets at root / and provides smart port fallback.
"""

import os
import sys
import socket
import argparse
from typing import Optional, Dict, Any

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

# Ensure backend directory is in python module search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from git_analyzer import GitAnalyzer
from music_mapper import MusicMapper

# Static directory resolution
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
FRONTEND_DIST = os.path.join(PROJECT_ROOT, 'frontend', 'dist')
FRONTEND_SRC = os.path.join(PROJECT_ROOT, 'frontend')

if os.path.isdir(FRONTEND_DIST):
    STATIC_DIR = FRONTEND_DIST
elif os.path.isdir(FRONTEND_SRC):
    STATIC_DIR = FRONTEND_SRC
else:
    STATIC_DIR = PROJECT_ROOT

app = FastAPI(
    title="Git Synth Audio Engine API",
    description="Algorithmic Audio-Visual Commit Equalizer and Rhythm Engine",
    version="1.0.0"
)

# Enable CORS for local web development & frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resolve_repo_path(repo_path: Optional[str] = None) -> str:
    """
    Resolves repository path:
    If a custom repo_path is provided, use it.
    Otherwise, fall back to GIT_SYNTH_REPO env var if set, or '.' default.
    """
    if repo_path and repo_path != ".":
        return os.path.abspath(repo_path)
    env_repo = os.environ.get("GIT_SYNTH_REPO")
    if env_repo:
        return os.path.abspath(env_repo)
    return os.path.abspath(repo_path or ".")


def check_port_in_use(host: str, port: int) -> bool:
    """Checks if a host/port combination is currently bound."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
            return False
        except OSError:
            return True


def find_free_port(start_port: int = 8000, max_port: int = 8090, host: str = "127.0.0.1") -> int:
    """Scans for an available TCP port to avoid collisions with active services."""
    for port in range(start_port, max_port + 1):
        if not check_port_in_use(host, port):
            return port
    return start_port


# --- API Endpoints ---

@app.get("/api/health")
def get_health() -> Dict[str, Any]:
    """Service health check and capabilities endpoint."""
    return {
        "status": "ok",
        "service": "git-synth",
        "version": "1.0.0",
        "scales_supported": ["synthwave_minor", "dorian", "natural_minor"],
        "tracks_count": 4,
        "static_dir": STATIC_DIR
    }


@app.get("/api/sequence")
def get_sequence(
    repo_path: str = Query(".", description="Path to git repository or target directory"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of commits to synthesize"),
    scale: str = Query("synthwave_minor", description="Musical scale profile")
) -> Dict[str, Any]:
    """
    Analyzes target git repository and returns synchronized 4-track musical timeline.
    """
    try:
        resolved_path = resolve_repo_path(repo_path)
        analyzer = GitAnalyzer(resolved_path)
        commits = analyzer.get_commits(limit=limit)
        mapper = MusicMapper(scale_type=scale)
        sequence_data = mapper.generate_sequence(commits)
        repo_stats = analyzer.get_repo_stats(commits)

        sequence_data["repo_stats"] = repo_stats
        sequence_data["repo_path"] = analyzer.repo_path
        sequence_data["is_git_repository"] = analyzer.is_git_repository()

        return sequence_data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate music sequence: {str(exc)}")


@app.get("/api/authors")
def get_authors(
    repo_path: str = Query(".", description="Path to git repository"),
    limit: int = Query(100, ge=1, le=500)
) -> Dict[str, Any]:
    """
    Retrieves contributor telemetry with procedural synthesizer timbre profiles.
    """
    try:
        resolved_path = resolve_repo_path(repo_path)
        analyzer = GitAnalyzer(resolved_path)
        commits = analyzer.get_commits(limit=limit)
        author_stats = analyzer.get_author_stats(commits)
        return {
            "total_authors": len(author_stats),
            "authors": author_stats
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve author metrics: {str(exc)}")


@app.get("/api/stats")
def get_stats(
    repo_path: str = Query(".", description="Path to git repository"),
    limit: int = Query(100, ge=1, le=500)
) -> Dict[str, Any]:
    """
    Returns code churn metrics, impact spikes, and audio DSP synthesis params.
    """
    try:
        resolved_path = resolve_repo_path(repo_path)
        analyzer = GitAnalyzer(resolved_path)
        commits = analyzer.get_commits(limit=limit)
        stats = analyzer.get_repo_stats(commits)
        churn_spikes = analyzer.get_churn_spikes(commits)

        mapper = MusicMapper()
        tempo = mapper.compute_tempo(commits)

        return {
            "repo_stats": stats,
            "churn_spikes": churn_spikes,
            "churn_spikes_count": len(churn_spikes),
            "audio_parameters": {
                "tempo_bpm": tempo,
                "time_signature": "4/4",
                "base_scale": "A Minor Pentatonic",
                "sub_bass_hz": 55.0,
                "lead_hz_range": [220.0, 1318.5]
            }
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve repository stats: {str(exc)}")


# --- Static Files and SPA Routing ---

# Mount assets directory (CSS, JS bundles) if present
assets_path = os.path.join(STATIC_DIR, "assets")
if os.path.isdir(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


@app.get("/", include_in_schema=False)
def serve_index():
    """Serves the frontend SPA index.html at root /."""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file, media_type="text/html")
    return HTMLResponse("<h1>Git Synth API</h1><p>Frontend assets not found.</p>")


@app.get("/index.html", include_in_schema=False)
def serve_index_html():
    """Explicit /index.html endpoint."""
    return serve_index()


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa_or_static(full_path: str):
    """
    Catch-all route for static assets and client-side SPA routing.
    Preserves 404 behavior for unknown API routes.
    """
    # Do not intercept API or documentation routes
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail=f"API endpoint '/{full_path}' not found")

    # If the exact file exists in STATIC_DIR, serve it directly
    candidate = os.path.join(STATIC_DIR, full_path)
    if os.path.isfile(candidate):
        return FileResponse(candidate)

    # SPA routing fallback: serve index.html
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file, media_type="text/html")

    raise HTTPException(status_code=404, detail=f"Path not found: /{full_path}")


def main():
    """CLI runner with smart port detection."""
    parser = argparse.ArgumentParser(description="Git Synth API Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=None, help="TCP port to listen on (auto-detected if omitted)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")

    args = parser.parse_args()
    selected_port = args.port or find_free_port(8000, 8090, host=args.host)

    print(f"[*] Starting Git Synth Engine on http://{args.host}:{selected_port}")
    import uvicorn
    uvicorn.run("server:app", host=args.host, port=selected_port, reload=args.reload)


if __name__ == "__main__":
    main()
