"""
Git Analyzer Engine for Git Synth.
Procedurally extracts commit history, author dynamics, churn spikes,
and metrics from Git repositories with zero external heavy dependencies.
Includes high-fidelity synthetic fallback generation.
"""

import os
import re
import subprocess
import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional


@dataclass
class GitCommit:
    hash: str
    short_hash: str
    author_name: str
    author_email: str
    timestamp: int
    iso_time: str
    message: str
    branches: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    parents: List[str] = field(default_factory=list)
    is_merge: bool = False
    insertions: int = 0
    deletions: int = 0
    files_changed: int = 0
    files: List[str] = field(default_factory=list)

    @property
    def churn(self) -> int:
        return self.insertions + self.deletions

    @property
    def net_lines(self) -> int:
        return self.insertions - self.deletions

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d['churn'] = self.churn
        d['net_lines'] = self.net_lines
        return d


class GitAnalyzer:
    def __init__(self, repo_path: str = "."):
        self.repo_path = os.path.abspath(repo_path)

    def is_git_repository(self) -> bool:
        """Checks if the configured path is inside a working git tree."""
        if not os.path.exists(self.repo_path):
            return False
        try:
            res = subprocess.run(
                ["git", "rev-parse", "--is-inside-work-tree"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=False
            )
            return res.returncode == 0 and res.stdout.strip() == "true"
        except Exception:
            return False

    def get_commits(self, limit: int = 50) -> List[GitCommit]:
        """
        Extracts recent git commits from the repository.
        Falls back seamlessly to synthetic commits if git is unavailable or empty.
        """
        if not self.is_git_repository():
            return self._generate_sample_commits(limit)

        try:
            cmd = [
                "git", "log",
                f"-n{limit}",
                "--pretty=format:COMMIT_START%n%H|%h|%an|%ae|%at|%aI|%s|%d|%P",
                "--numstat"
            ]
            res = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=False
            )

            if res.returncode != 0 or not res.stdout.strip():
                return self._generate_sample_commits(limit)

            commits = self._parse_git_log_output(res.stdout)
            if not commits:
                return self._generate_sample_commits(limit)

            return commits
        except Exception:
            return self._generate_sample_commits(limit)

    def _parse_git_log_output(self, raw_output: str) -> List[GitCommit]:
        """Parses formatted git log output into strongly typed GitCommit objects."""
        commits: List[GitCommit] = []
        raw_blocks = raw_output.split("COMMIT_START")

        for block in raw_blocks:
            lines = [line.strip() for line in block.strip().splitlines() if line.strip()]
            if not lines:
                continue

            header = lines[0]
            parts = header.split("|")
            if len(parts) < 7:
                continue

            commit_hash = parts[0]
            short_hash = parts[1]
            author_name = parts[2]
            author_email = parts[3]
            try:
                timestamp = int(parts[4])
            except ValueError:
                timestamp = int(datetime.datetime.now().timestamp())
            iso_time = parts[5]
            message = parts[6]
            ref_names_raw = parts[7] if len(parts) > 7 else ""
            parents_raw = parts[8] if len(parts) > 8 else ""

            parents = [p for p in parents_raw.split(" ") if p]
            is_merge = len(parents) > 1 or message.lower().startswith("merge ")

            branches = []
            tags = []
            if ref_names_raw:
                cleaned_refs = ref_names_raw.strip().lstrip("(").rstrip(")")
                for item in cleaned_refs.split(","):
                    item = item.strip()
                    if not item:
                        continue
                    if item.startswith("tag:"):
                        tags.append(item.replace("tag:", "").strip())
                    elif "->" in item:
                        branches.append(item.split("->")[-1].strip())
                    elif item.startswith("origin/"):
                        branches.append(item)
                    elif item != "HEAD":
                        branches.append(item)

            insertions = 0
            deletions = 0
            files = []

            for line in lines[1:]:
                stat_parts = line.split("	")
                if len(stat_parts) >= 3:
                    ins_str, del_str, file_name = stat_parts[0], stat_parts[1], stat_parts[2]
                    try:
                        ins = int(ins_str) if ins_str != "-" else 0
                        dels = int(del_str) if del_str != "-" else 0
                        insertions += ins
                        deletions += dels
                        files.append(file_name)
                    except ValueError:
                        pass

            commits.append(
                GitCommit(
                    hash=commit_hash,
                    short_hash=short_hash,
                    author_name=author_name,
                    author_email=author_email,
                    timestamp=timestamp,
                    iso_time=iso_time,
                    message=message,
                    branches=branches,
                    tags=tags,
                    parents=parents,
                    is_merge=is_merge,
                    insertions=insertions,
                    deletions=deletions,
                    files_changed=len(files),
                    files=files
                )
            )

        return commits

    def _generate_sample_commits(self, count: int = 40) -> List[GitCommit]:
        """Generates realistic sample repository commit history for standalone demonstrations."""
        authors = [
            ("Sarthak (Lead)", "sarthak@synth.dev"),
            ("Obito (Audio Core)", "obito@synth.dev"),
            ("Itachi (Visual UX)", "itachi@synth.dev"),
            ("Fugaku (Architect)", "fugaku@synth.dev"),
            ("Shisui (Pipeline)", "shisui@synth.dev")
        ]

        templates = [
            ("feat(core): initialize git audio rhythm synthesizer engine", 450, 12, ["backend/engine.py", "backend/audio.py"], False, ["v0.1.0-alpha"]),
            ("feat(dsp): implement 16-step pentatonic scale quantizer", 180, 5, ["backend/dsp.py"], False, []),
            ("fix(buffer): resolve audio stream underflow in circular buffer", 45, 38, ["backend/buffer.py"], False, []),
            ("Merge branch 'feat/cyber-equalizer' into main", 0, 0, [], True, []),
            ("feat(ui): add neon oscilloscope and spectral visualizer", 620, 20, ["frontend/components/Equalizer.tsx"], False, []),
            ("refactor(audio): vectorize WebAudio oscillator node graph", 85, 140, ["frontend/audio/synth.ts"], False, []),
            ("perf(wasm): optimize FFT audio frequency calculation pipeline", 320, 95, ["wasm/fft.rs"], False, ["v0.2.0-beta"]),
            ("fix(tempo): align BPM sync clock with commit frequency telemetry", 32, 14, ["backend/clock.py"], False, []),
            ("chore(deps): upgrade audio codec dependencies and lockfile", 850, 120, ["package.json", "Cargo.lock"], False, []),
            ("Merge pull request #12 from feature/midi-export", 0, 0, [], True, []),
            ("feat(export): procedural MIDI sequence file generator", 210, 8, ["backend/midi.py"], False, []),
            ("docs(readme): interactive architecture diagram and quickstart guide", 95, 10, ["README.md", "docs/audio-engine.md"], False, []),
            ("feat(release): Git Synth v1.0.0 production milestone", 150, 25, ["backend/server.py", "frontend/App.tsx"], False, ["v1.0.0"])
        ]

        commits = []
        base_time = int(datetime.datetime.now().timestamp()) - (count * 3600 * 4)

        for i in range(count):
            tmpl_idx = i % len(templates)
            msg, ins, dels, flist, is_merge, tags = templates[tmpl_idx]
            author_idx = (i * 3 + tmpl_idx) % len(authors)
            author_name, author_email = authors[author_idx]

            commit_time = base_time + (i * 3600 * 4) + ((i * 73) % 1800)
            iso_str = datetime.datetime.fromtimestamp(commit_time).isoformat()
            hex_hash = f"{((i + 1) * 0xdeadbeef) & 0xffffffffffffffffffffffffffffffffffffffff:040x}"

            commits.append(
                GitCommit(
                    hash=hex_hash,
                    short_hash=hex_hash[:7],
                    author_name=author_name,
                    author_email=author_email,
                    timestamp=commit_time,
                    iso_time=iso_str,
                    message=f"{msg} [build #{i+1}]",
                    branches=["main"] if i == count - 1 else [],
                    tags=tags,
                    parents=[f"{hex_hash[:7]}prev"] if not is_merge else ["prev1", "prev2"],
                    is_merge=is_merge,
                    insertions=ins + (i % 7) * 12,
                    deletions=dels + (i % 5) * 4,
                    files_changed=max(1, len(flist)),
                    files=flist or ["src/core.py"]
                )
            )

        commits.reverse()
        return commits

    def get_author_stats(self, commits: List[GitCommit]) -> Dict[str, Any]:
        """Calculates author dynamics and audio sound signatures."""
        stats: Dict[str, Dict[str, Any]] = {}
        for c in commits:
            if c.author_name not in stats:
                stats[c.author_name] = {
                    "name": c.author_name,
                    "email": c.author_email,
                    "commit_count": 0,
                    "total_insertions": 0,
                    "total_deletions": 0,
                    "net_lines": 0,
                    "merge_count": 0,
                    "first_commit_time": c.iso_time,
                    "last_commit_time": c.iso_time,
                    "sound_signature": self._derive_sound_signature(c.author_name)
                }
            entry = stats[c.author_name]
            entry["commit_count"] += 1
            entry["total_insertions"] += c.insertions
            entry["total_deletions"] += c.deletions
            entry["net_lines"] += c.net_lines
            if c.is_merge:
                entry["merge_count"] += 1
            entry["last_commit_time"] = c.iso_time

        return stats

    def _derive_sound_signature(self, author_name: str) -> Dict[str, Any]:
        """Procedurally maps author identity to synthesis timbre presets."""
        hash_val = sum(ord(ch) for ch in author_name)
        waveforms = ["sawtooth", "square", "triangle", "sine"]
        waveform = waveforms[hash_val % len(waveforms)]
        octave_offset = (hash_val % 3) - 1
        filter_cutoff = 800 + (hash_val % 2400)
        reverb_mix = 0.2 + ((hash_val % 40) / 100.0)

        return {
            "waveform": waveform,
            "octave_offset": octave_offset,
            "filter_cutoff": filter_cutoff,
            "reverb_mix": round(reverb_mix, 2)
        }

    def get_churn_spikes(self, commits: List[GitCommit], threshold_factor: float = 1.8) -> List[Dict[str, Any]]:
        """Finds high impact commits that exceed the churn baseline."""
        if not commits:
            return []

        churns = [c.churn for c in commits]
        mean_churn = sum(churns) / len(churns)
        threshold = max(50.0, mean_churn * threshold_factor)

        spikes = []
        for c in commits:
            if c.churn >= threshold:
                spikes.append({
                    "hash": c.short_hash,
                    "author": c.author_name,
                    "message": c.message,
                    "churn": c.churn,
                    "insertions": c.insertions,
                    "deletions": c.deletions,
                    "iso_time": c.iso_time,
                    "intensity": round(min(1.0, c.churn / max(1.0, threshold * 2)), 2)
                })

        return spikes

    def get_repo_stats(self, commits: List[GitCommit]) -> Dict[str, Any]:
        """Aggregates total code churn, commit frequency, and timeline span."""
        if not commits:
            return {}

        total_ins = sum(c.insertions for c in commits)
        total_dels = sum(c.deletions for c in commits)
        merges = sum(1 for c in commits if c.is_merge)
        authors = set(c.author_name for c in commits)

        timestamps = [c.timestamp for c in commits]
        min_ts = min(timestamps)
        max_ts = max(timestamps)
        span_hours = max(1.0, (max_ts - min_ts) / 3600.0)
        commit_frequency_per_day = round((len(commits) / (span_hours / 24.0)), 2) if span_hours >= 24 else len(commits)

        return {
            "total_commits": len(commits),
            "total_authors": len(authors),
            "total_insertions": total_ins,
            "total_deletions": total_dels,
            "net_lines": total_ins - total_dels,
            "merge_count": merges,
            "span_hours": round(span_hours, 1),
            "commit_frequency_per_day": commit_frequency_per_day,
            "avg_churn_per_commit": round((total_ins + total_dels) / len(commits), 1)
        }
