"""
Comprehensive Test Suite for Git Synth Engine.
Tests Git history analyzer, procedural music mapper, and FastAPI endpoints.
"""

import os
import sys
import unittest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from git_analyzer import GitAnalyzer, GitCommit
from music_mapper import (
    MusicMapper,
    midi_to_freq,
    midi_to_name,
    build_scale_pool
)
from server import app, find_free_port
from fastapi.testclient import TestClient


class TestGitAnalyzer(unittest.TestCase):
    def setUp(self):
        self.analyzer = GitAnalyzer('/tmp/nonexistent_git_dir_12345')

    def test_non_git_repo_detection(self):
        self.assertFalse(self.analyzer.is_git_repository())

    def test_sample_commits_generation(self):
        commits = self.analyzer.get_commits(limit=15)
        self.assertEqual(len(commits), 15)
        
        c0 = commits[0]
        self.assertIsInstance(c0, GitCommit)
        self.assertTrue(len(c0.hash) >= 7)
        self.assertTrue(len(c0.short_hash) <= 7)
        self.assertGreater(c0.timestamp, 0)
        self.assertIsInstance(c0.author_name, str)
        self.assertIsInstance(c0.message, str)
        self.assertGreaterEqual(c0.churn, 0)
        self.assertEqual(c0.churn, c0.insertions + c0.deletions)
        self.assertEqual(c0.net_lines, c0.insertions - c0.deletions)

    def test_log_parser(self):
        raw_log = (
            "COMMIT_START\n"
            "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b|1a2b3c4|Linus Torvalds|linus@kernel.org|1600000000|2020-09-13T12:00:00+00:00|feat(core): initial engine release| (HEAD -> main, tag: v1.0.0)|0000000\n"
            "120\t15\tcore/engine.c\n"
            "45\t0\tcore/engine.h\n"
            "\n"
            "COMMIT_START\n"
            "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0|a1b2c3d|Alan Turing|alan@synth.org|1600003600|2020-09-13T13:00:00+00:00|Merge branch 'feat/dsp' into main||prev1 prev2\n"
            "0\t0\t\n"
        )
        commits = self.analyzer._parse_git_log_output(raw_log)
        self.assertEqual(len(commits), 2)

        c1 = commits[0]
        self.assertEqual(c1.short_hash, '1a2b3c4')
        self.assertEqual(c1.author_name, 'Linus Torvalds')
        self.assertEqual(c1.insertions, 165)
        self.assertEqual(c1.deletions, 15)
        self.assertEqual(c1.files_changed, 2)
        self.assertIn('v1.0.0', c1.tags)
        self.assertIn('main', c1.branches)
        self.assertFalse(c1.is_merge)

        c2 = commits[1]
        self.assertTrue(c2.is_merge)
        self.assertEqual(len(c2.parents), 2)

    def test_author_stats(self):
        commits = self.analyzer._generate_sample_commits(count=20)
        author_stats = self.analyzer.get_author_stats(commits)
        self.assertGreater(len(author_stats), 0)

        for name, data in author_stats.items():
            self.assertEqual(name, data['name'])
            self.assertGreaterEqual(data['commit_count'], 1)
            self.assertIn('sound_signature', data)
            sig = data['sound_signature']
            self.assertIn(sig['waveform'], ['sawtooth', 'square', 'triangle', 'sine'])
            self.assertIn('filter_cutoff', sig)

    def test_churn_spikes(self):
        commits = self.analyzer._generate_sample_commits(count=30)
        spikes = self.analyzer.get_churn_spikes(commits, threshold_factor=1.5)
        self.assertIsInstance(spikes, list)
        for s in spikes:
            self.assertIn('churn', s)
            self.assertIn('intensity', s)
            self.assertGreaterEqual(s['intensity'], 0.0)

    def test_repo_stats(self):
        commits = self.analyzer._generate_sample_commits(count=20)
        stats = self.analyzer.get_repo_stats(commits)
        self.assertEqual(stats['total_commits'], 20)
        self.assertGreater(stats['total_authors'], 0)
        self.assertGreater(stats['total_insertions'], 0)
        self.assertIn('commit_frequency_per_day', stats)


class TestMusicMapper(unittest.TestCase):
    def setUp(self):
        self.mapper = MusicMapper('synthwave_minor')

    def test_midi_to_freq(self):
        self.assertEqual(midi_to_freq(69), 440.0)
        self.assertEqual(midi_to_freq(57), 220.0)
        self.assertEqual(midi_to_freq(81), 880.0)

    def test_midi_to_name(self):
        self.assertEqual(midi_to_name(69), 'A4')
        self.assertEqual(midi_to_name(60), 'C4')
        self.assertEqual(midi_to_name(36), 'C2')
        self.assertEqual(midi_to_name(33), 'A1')

    def test_scale_pools(self):
        for scale in ['synthwave_minor', 'dorian', 'natural_minor']:
            pool = build_scale_pool(scale)
            self.assertGreater(len(pool), 10)
            self.assertTrue(all(33 <= n <= 96 for n in pool))

    def test_tempo_computation(self):
        analyzer = GitAnalyzer('/tmp')
        commits = analyzer.get_commits(limit=10)
        bpm = self.mapper.compute_tempo(commits)
        self.assertGreaterEqual(bpm, 95.0)
        self.assertLessEqual(bpm, 135.0)

    def test_sequence_generation(self):
        analyzer = GitAnalyzer('/tmp')
        commits = analyzer.get_commits(limit=10)
        seq = self.mapper.generate_sequence(commits)

        meta = seq['metadata']
        self.assertEqual(meta['time_signature'], '4/4')
        self.assertEqual(meta['total_bars'], 10)
        self.assertGreater(meta['duration_seconds'], 0.0)

        tracks = seq['tracks']
        self.assertEqual(len(tracks), 4)

        track_ids = [t['id'] for t in tracks]
        self.assertIn('percussion', track_ids)
        self.assertIn('bass', track_ids)
        self.assertIn('lead', track_ids)
        self.assertIn('pad', track_ids)

        for track in tracks:
            self.assertGreater(len(track['notes']), 0)
            for note in track['notes']:
                self.assertGreaterEqual(note['time'], 0.0)
                self.assertGreater(note['duration'], 0.0)
                self.assertGreater(note['frequency_hz'], 0.0)
                self.assertGreater(note['velocity'], 0.0)
                self.assertLessEqual(note['velocity'], 1.0)

        timeline = seq['timeline']
        self.assertGreater(len(timeline), 0)
        times = [n['time'] for n in timeline]
        self.assertEqual(times, sorted(times))


class TestServerEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['service'], 'git-synth')
        self.assertEqual(data['tracks_count'], 4)

    def test_sequence_endpoint(self):
        res = self.client.get('/api/sequence?limit=5')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('metadata', data)
        self.assertIn('tracks', data)
        self.assertIn('timeline', data)
        self.assertEqual(data['metadata']['total_bars'], 5)

    def test_authors_endpoint(self):
        res = self.client.get('/api/authors?limit=10')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('total_authors', data)
        self.assertIn('authors', data)

    def test_stats_endpoint(self):
        res = self.client.get('/api/stats?limit=10')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('repo_stats', data)
        self.assertIn('churn_spikes', data)
        self.assertIn('audio_parameters', data)

    def test_find_free_port(self):
        port = find_free_port(8000, 8050)
        self.assertIsInstance(port, int)
        self.assertGreaterEqual(port, 8000)


if __name__ == '__main__':
    unittest.main()
