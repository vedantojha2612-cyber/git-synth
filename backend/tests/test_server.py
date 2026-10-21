"""
Automated Tests for Git Synth Static File Serving, SPA Routing, and Runner Logic.
Verifies:
  - Root / serves index.html (200)
  - Static asset files (/assets/*.css, *.js) return 200 with correct mime types
  - SPA fallback routing handles arbitrary client subpaths
  - API 404 isolation prevents html hijacking on /api/* routes
  - All API endpoints (/api/health, /api/sequence, /api/authors, /api/stats) return valid JSON
  - Port fallback logic detects occupied ports and resolves open ports
  - CLI argument parsing and repo environment variable resolution
"""

import os
import sys
import socket
import unittest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, ".."))

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from server import app, find_free_port, check_port_in_use, resolve_repo_path, STATIC_DIR
from run import parse_args


class TestStaticServerAndSPA(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_root_serves_index_html(self):
        """GET / returns 200, text/html, and contains Git Synth page contents."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers.get("content-type", ""))
        self.assertIn("Git Synth", res.text)
        self.assertIn("DSP-80", res.text)

    def test_index_html_explicit(self):
        """GET /index.html returns 200, text/html."""
        res = self.client.get("/index.html")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers.get("content-type", ""))
        self.assertIn("canvas-3d-grid", res.text)

    def test_static_assets_serving(self):
        """Static assets under /assets/* are served correctly."""
        assets_dir = os.path.join(STATIC_DIR, "assets")
        if os.path.isdir(assets_dir):
            files = os.listdir(assets_dir)
            css_files = [f for f in files if f.endswith(".css")]
            js_files = [f for f in files if f.endswith(".js")]

            if css_files:
                css_res = self.client.get(f"/assets/{css_files[0]}")
                self.assertEqual(css_res.status_code, 200)
                self.assertIn("text/css", css_res.headers.get("content-type", ""))
                self.assertGreater(len(css_res.text), 100)

            if js_files:
                js_res = self.client.get(f"/assets/{js_files[0]}")
                self.assertEqual(js_res.status_code, 200)
                self.assertIn("javascript", js_res.headers.get("content-type", ""))
                self.assertGreater(len(js_res.text), 100)

    def test_spa_fallback_routes(self):
        """SPA client subroutes gracefully fall back to index.html."""
        for path in ["/equalizer", "/synth/timeline", "/author-timbre", "/visualizer"]:
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200)
            self.assertIn("text/html", res.headers.get("content-type", ""))
            self.assertIn("Git Synth", res.text)

    def test_api_404_isolation(self):
        """Non-existent /api/* routes must return 404 JSON, NOT SPA HTML."""
        res = self.client.get("/api/unknown_synth_endpoint")
        self.assertEqual(res.status_code, 404)
        self.assertIn("application/json", res.headers.get("content-type", ""))
        data = res.json()
        self.assertIn("detail", data)


class TestApiEndpointsIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "git-synth")
        self.assertEqual(data["tracks_count"], 4)
        self.assertIn("static_dir", data)

    def test_sequence_endpoint(self):
        res = self.client.get("/api/sequence?limit=8&scale=synthwave_minor")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("metadata", data)
        self.assertIn("tracks", data)
        self.assertIn("timeline", data)
        self.assertIn("repo_stats", data)
        self.assertEqual(data["metadata"]["total_bars"], 8)
        self.assertEqual(len(data["tracks"]), 4)

    def test_authors_endpoint(self):
        res = self.client.get("/api/authors?limit=15")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_authors", data)
        self.assertIn("authors", data)
        self.assertGreater(data["total_authors"], 0)

    def test_stats_endpoint(self):
        res = self.client.get("/api/stats?limit=15")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("repo_stats", data)
        self.assertIn("churn_spikes", data)
        self.assertIn("audio_parameters", data)
        self.assertIn("tempo_bpm", data["audio_parameters"])


class TestPortFallbackAndRunner(unittest.TestCase):
    def test_check_port_in_use_and_fallback(self):
        """Tests that port collision detection detects a bound port and finds the next open port."""
        # Bind a temporary socket on a free port
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", 0))
        sock.listen(1)
        busy_port = sock.getsockname()[1]

        try:
            # check_port_in_use should detect it
            self.assertTrue(check_port_in_use("127.0.0.1", busy_port))

            # find_free_port starting from busy_port should return a different, free port
            resolved = find_free_port(start_port=busy_port, max_port=busy_port + 20, host="127.0.0.1")
            self.assertNotEqual(resolved, busy_port)
            self.assertFalse(check_port_in_use("127.0.0.1", resolved))
        finally:
            sock.close()

    def test_cli_parser_defaults(self):
        args = parse_args([])
        self.assertEqual(args.repo, ".")
        self.assertEqual(args.port, 8000)
        self.assertEqual(args.host, "127.0.0.1")
        self.assertFalse(args.no_browser)
        self.assertEqual(args.log_level, "info")

    def test_cli_parser_custom(self):
        args = parse_args([
            "-r", "/var/my-repo",
            "-p", "8888",
            "--host", "0.0.0.0",
            "--no-browser",
            "--log-level", "warning"
        ])
        self.assertEqual(args.repo, "/var/my-repo")
        self.assertEqual(args.port, 8888)
        self.assertEqual(args.host, "0.0.0.0")
        self.assertTrue(args.no_browser)
        self.assertEqual(args.log_level, "warning")

    def test_repo_env_override(self):
        old_env = os.environ.get("GIT_SYNTH_REPO")
        try:
            os.environ["GIT_SYNTH_REPO"] = "/tmp/synth-test-repo"
            # When repo_path is "." (default), it resolves to the env var
            resolved = resolve_repo_path(".")
            self.assertEqual(resolved, os.path.abspath("/tmp/synth-test-repo"))

            # When explicit repo_path is given, explicit wins
            explicit = resolve_repo_path("/var/log")
            self.assertEqual(explicit, os.path.abspath("/var/log"))
        finally:
            if old_env is None:
                os.environ.pop("GIT_SYNTH_REPO", None)
            else:
                os.environ["GIT_SYNTH_REPO"] = old_env


if __name__ == "__main__":
    unittest.main()
