#!/usr/bin/env python3
"""
Git Synth - Audio-Visual Commit Equalizer & Rhythm Engine.
Unified CLI Launcher and Local Static Server.

Usage:
  python run.py
  python run.py --repo /path/to/repo
  python run.py --port 8080 --no-browser
"""

import os
import sys
import time
import socket
import argparse
import threading
import webbrowser
import urllib.request
from typing import Optional

# Ensure project root and backend are in sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import uvicorn
from server import app, find_free_port, check_port_in_use

BANNER = r"""
   ╔══════════════════════════════════════════════════════════════════════╗
   ║   ██████╗ ██╗████████╗   ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗ ║
   ║  ██╔════╝ ██║╚══██╔══╝   ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║ ║
   ║  ██║  ███╗██║   ██║      ███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║ ║
   ║  ██║   ██║██║   ██║      ╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║ ║
   ║  ╚██████╔╝██║   ██║      ███████║   ██║   ██║ ╚████║   ██║   ██║  ██║ ║
   ║   GIT SYNTH // AUDIO-VISUAL COMMIT EQUALIZER & RHYTHM ENGINE v1.0.0   ║
   ╚═══════════════════════════════════════════════════════════════════════╝
"""


def open_browser_when_ready(url: str, host: str, port: int, timeout_sec: float = 12.0) -> None:
    """Polls the health endpoint until the server is ready, then triggers the web browser."""
    check_host = "127.0.0.1" if host in ("0.0.0.0", "::", "") else host
    health_url = f"http://{check_host}:{port}/api/health"
    start_time = time.time()

    while time.time() - start_time < timeout_sec:
        try:
            req = urllib.request.Request(
                health_url,
                headers={"User-Agent": "GitSynthLauncher/1.0"}
            )
            with urllib.request.urlopen(req, timeout=0.5) as resp:
                if resp.status == 200:
                    break
        except Exception:
            time.sleep(0.15)

    try:
        webbrowser.open(url)
    except Exception as exc:
        print(f"[*] Note: Could not auto-launch browser ({exc}). Open {url} in your browser.")


def parse_args(argv=None) -> argparse.Namespace:
    """Configures and parses CLI command-line arguments."""
    parser = argparse.ArgumentParser(
        prog="git-synth",
        description="Git Synth // Audio-Visual Commit Equalizer and Procedural Rhythm Engine",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "-r", "--repo",
        type=str,
        default=".",
        help="Path to git repository to analyze (defaults to current directory)"
    )
    parser.add_argument(
        "-p", "--port",
        type=int,
        default=8000,
        help="Preferred port number to bind (automatically falls back if busy)"
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host interface to bind"
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        default=False,
        help="Suppress automatic web browser launch"
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["critical", "error", "warning", "info", "debug", "trace"],
        help="Uvicorn server log level"
    )
    return parser.parse_args(argv)


def run(argv=None):
    """Main CLI launcher."""
    args = parse_args(argv)

    # Resolve target repository path and configure environment
    resolved_repo = os.path.abspath(args.repo)
    if not os.path.exists(resolved_repo):
        print(f"[!] Error: Specified repository directory does not exist: {resolved_repo}", file=sys.stderr)
        sys.exit(1)

    os.environ["GIT_SYNTH_REPO"] = resolved_repo

    # Check port conflicts with automatic fallback
    active_port = args.port
    if check_port_in_use(args.host, active_port):
        fallback_port = find_free_port(start_port=active_port + 1, max_port=active_port + 50, host=args.host)
        print(f"[*] Notice: Preferred port {active_port} is already busy. Switched to port {fallback_port}.")
        active_port = fallback_port

    display_host = "localhost" if args.host in ("127.0.0.1", "0.0.0.0") else args.host
    browser_url = f"http://{display_host}:{active_port}"

    print(BANNER)
    print(f"  [+] Target Repository   : {resolved_repo}")
    print(f"  [+] Web Equalizer UI    : {browser_url}")
    print(f"  [+] REST API Service    : {browser_url}/api/sequence")
    print(f"  [+] OpenAPI Docs        : {browser_url}/docs")
    print(f"  [+] Audio Engine        : 4-Track Procedural WebAudio DSP")
    print(f"  [+] Browser Auto-Launch : {'Disabled (--no-browser)' if args.no_browser else 'Enabled'}")
    print("=" * 75)
    print("Starting Git Synth engine... Press Ctrl+C to terminate.\n")

    if not args.no_browser:
        browser_thread = threading.Thread(
            target=open_browser_when_ready,
            args=(browser_url, args.host, active_port),
            daemon=True
        )
        browser_thread.start()

    config = uvicorn.Config(
        app=app,
        host=args.host,
        port=active_port,
        log_level=args.log_level
    )
    server = uvicorn.Server(config)

    try:
        server.run()
    except (KeyboardInterrupt, SystemExit):
        print("\n[*] Shutting down Git Synth Engine cleanly...")
        sys.exit(0)


if __name__ == "__main__":
    run()
