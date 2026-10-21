# Git Synth // Audio-Visual Commit Equalizer & Rhythm Engine

Algorithmic 80s Cyberpunk synthesizer engine and oscilloscope console that transforms any Git repository history into a synchronized 4-track musical timeline.

---

## ⚡ Quickstart

Launch the entire stack (FastAPI backend + embedded WebAudio frontend) with a single command:

```bash
# Analyze current repository (auto-launches browser on http://localhost:8000)
python run.py

# Or analyze a specific repository
python run.py --repo /path/to/any/git-repo

# Bind to a custom port without auto-launching browser
python run.py --port 8080 --no-browser
```

### CLI Arguments
| Flag | Short | Default | Description |
|---|---|---|---|
| `--repo` | `-r` | `.` | Target Git repository to analyze |
| `--port` | `-p` | `8000` | Preferred TCP port (automatically falls back if busy) |
| `--host` | | `127.0.0.1` | Network interface to bind |
| `--no-browser` | | `False` | Suppress browser auto-launching (headless / CI mode) |
| `--log-level` | | `info` | Uvicorn server logging verbosity |

---

## 🎧 Architecture

```
git-synth/
├── run.py                 # Unified CLI entrypoint with port collision fallback & browser auto-launch
├── requirements.txt       # Core dependencies (fastapi, uvicorn)
├── backend/
│   ├── git_analyzer.py    # Git DAG log parser, churn analyzer, & author telemetry
│   ├── music_mapper.py    # Procedural 4-track sequencer (Drums, Bass, Hex Arp, Pad)
│   ├── server.py          # FastAPI service with static asset mounting and SPA fallback
│   └── tests/
│       ├── test_engine.py # Analyzer, music theory, and core engine tests
│       └── test_server.py # Static serving, asset delivery, SPA routing, and runner tests
└── frontend/
    ├── src/               # Pure WebAudio DSP oscillators, Canvas visualizers, Mixer UI
    └── dist/              # Optimized static production bundle mounted directly by FastAPI
```

---

## 📡 REST API Endpoints

- `GET /` : Serves the retro synthesizer Web UI (`index.html`)
- `GET /api/sequence?limit=50&scale=synthwave_minor` : Synchronized 4-track procedural timeline
- `GET /api/authors` : Contributor telemetry with sound signature parameters
- `GET /api/stats` : Repository churn metrics, commit density, and audio DSP parameters
- `GET /api/health` : System health check, scale profiles, and static directory status
- `GET /docs` : Interactive OpenAPI Swagger documentation

---

## 🧪 Automated Tests

Run the backend test suites:
```bash
python3 backend/tests/test_engine.py
python3 backend/tests/test_server.py
```
