"""
Music Mapper Engine for Git Synth.
Algorithmic translation of Git commit history and telemetry into
lush multi-track musical sequences (Synthwave / Cyberpunk Minor scales).
Zero AI slop - strictly deterministic musical and mathematical synthesis.
"""

import math
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
from git_analyzer import GitCommit


# Standard Note Pitch Class
PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def midi_to_freq(midi_note: int) -> float:
    """Converts standard MIDI note number to frequency in Hertz (A4 = 440Hz)."""
    return round(440.0 * (2.0 ** ((midi_note - 69) / 12.0)), 2)


def midi_to_name(midi_note: int) -> str:
    """Converts MIDI note number to scientific pitch notation (e.g. 69 -> A4)."""
    octave = (midi_note // 12) - 1
    pitch = PITCH_NAMES[midi_note % 12]
    return f"{pitch}{octave}"


def build_scale_pool(scale_type: str = "synthwave_minor") -> List[int]:
    """
    Constructs multi-octave MIDI note pool for harmonic consistency.
    Synthwave Minor is rooted in A (A minor pentatonic / Dorian).
    """
    # Offsets relative to A (0 = A, 2 = B, 3 = C, 5 = D, 7 = E, 8 = F, 9 = F#, 10 = G)
    if scale_type == "dorian":
        # A Dorian: A, B, C, D, E, F#, G
        intervals = [0, 2, 3, 5, 7, 9, 10]
    elif scale_type == "natural_minor":
        # A Natural Minor: A, B, C, D, E, F, G
        intervals = [0, 2, 3, 5, 7, 8, 10]
    else:
        # Default: A Minor Pentatonic (ultra clean cyberpunk synth harmonies)
        # A, C, D, E, G
        intervals = [0, 3, 5, 7, 10]

    notes = []
    # Spanning octaves 2 to 6 (A2 = 45 up to A6 = 93)
    for oct_base in [33, 45, 57, 69, 81]:  # A1, A2, A3, A4, A5
        for interval in intervals:
            note = oct_base + interval
            if 33 <= note <= 96:
                notes.append(note)

    return sorted(list(set(notes)))


@dataclass
class NoteEvent:
    id: str
    track_id: str
    bar: int
    beat: float
    time: float
    duration: float
    duration_beats: float
    note_name: str
    midi: int
    frequency_hz: float
    velocity: float
    commit_hash: str
    author: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TrackSequence:
    id: str
    name: str
    instrument_type: str
    notes: List[NoteEvent] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "instrument_type": self.instrument_type,
            "total_notes": len(self.notes),
            "notes": [n.to_dict() for n in self.notes]
        }


class MusicMapper:
    def __init__(self, scale_type: str = "synthwave_minor"):
        self.scale_type = scale_type
        self.scale_pool = build_scale_pool(scale_type)
        # Bass pool restricted to lower octaves A1-D3 (33 to 50)
        self.bass_pool = [n for n in self.scale_pool if 33 <= n <= 50] or [33, 36, 38, 40, 45]
        # Lead pool in punchy melodic register A3-E6 (57 to 88)
        self.lead_pool = [n for n in self.scale_pool if 57 <= n <= 88] or [57, 60, 62, 64, 67, 69, 72, 74, 76]

    def compute_tempo(self, commits: List[GitCommit]) -> float:
        """
        Dynamically computes project BPM (95 - 135 BPM)
        based on repository commit density and velocity.
        """
        if len(commits) < 2:
            return 116.0

        timestamps = [c.timestamp for c in commits]
        time_span = max(1.0, max(timestamps) - min(timestamps))
        avg_delta = time_span / max(1, len(commits) - 1)

        # Faster commit intervals produce higher rhythmic energy (closer to 135)
        # Slower intervals chill out around 98 - 110 BPM
        # 1 day = 86400s -> normalized log scale
        delta_hours = max(0.1, avg_delta / 3600.0)
        energy_factor = 1.0 / (1.0 + math.log10(1.0 + delta_hours))
        bpm = 95.0 + (energy_factor * 40.0)

        # Average churn boost
        avg_churn = sum(c.churn for c in commits) / len(commits)
        churn_boost = min(5.0, (avg_churn / 200.0) * 5.0)
        final_bpm = min(135.0, max(95.0, bpm + churn_boost))

        return round(final_bpm, 1)

    def generate_sequence(self, commits: List[GitCommit], custom_bpm: Optional[float] = None) -> Dict[str, Any]:
        """
        Translates a list of commits into a synchronized 4-track audio sequence.
        """
        if not commits:
            return {
                "metadata": {
                    "bpm": 116.0,
                    "scale": self.scale_type,
                    "time_signature": "4/4",
                    "total_bars": 0,
                    "duration_seconds": 0.0,
                    "total_commits": 0
                },
                "tracks": [],
                "timeline": []
            }

        # Sort commits chronologically (oldest to newest) to represent project journey
        chrono_commits = sorted(commits, key=lambda c: c.timestamp)
        bpm = custom_bpm or self.compute_tempo(chrono_commits)
        seconds_per_beat = 60.0 / bpm
        seconds_per_bar = seconds_per_beat * 4.0

        percussion_notes: List[NoteEvent] = []
        bass_notes: List[NoteEvent] = []
        lead_notes: List[NoteEvent] = []
        pad_notes: List[NoteEvent] = []

        total_bars = len(chrono_commits)

        # Chord progression roots (Am, F, C, G, Dm)
        chord_roots = [
            ("Am", [45, 57, 60, 64]),   # A2, A3, C4, E4
            ("F",  [41, 53, 57, 60]),   # F2, F3, A3, C4
            ("C",  [36, 48, 52, 55]),   # C2, C3, E3, G3
            ("G",  [43, 55, 59, 62]),   # G2, G3, B3, D4
            ("Dm", [38, 50, 53, 57])    # D2, D3, F3, A3
        ]

        event_counter = 0

        for bar_idx, commit in enumerate(chrono_commits):
            bar_num = bar_idx + 1
            bar_start_time = bar_idx * seconds_per_bar

            # -----------------------------------------------------------------
            # Track 1: Percussion (Kick, Snare, Hi-hat)
            # -----------------------------------------------------------------
            # Kick on beats 1.0 and 3.0
            for beat_pos in [1.0, 3.0]:
                event_counter += 1
                kick_time = bar_start_time + ((beat_pos - 1.0) * seconds_per_beat)
                percussion_notes.append(
                    NoteEvent(
                        id=f"perc_{event_counter}",
                        track_id="percussion",
                        bar=bar_num,
                        beat=beat_pos,
                        time=round(kick_time, 3),
                        duration=round(seconds_per_beat * 0.4, 3),
                        duration_beats=0.4,
                        note_name="Kick",
                        midi=36,
                        frequency_hz=60.0,
                        velocity=0.92,
                        commit_hash=commit.short_hash,
                        author=commit.author_name,
                        metadata={"type": "kick"}
                    )
                )

            # Snare on beats 2.0 and 4.0
            for beat_pos in [2.0, 4.0]:
                event_counter += 1
                snare_time = bar_start_time + ((beat_pos - 1.0) * seconds_per_beat)
                # Merges trigger accentuated, explosive snare hits
                snare_velocity = 0.98 if commit.is_merge else 0.85
                percussion_notes.append(
                    NoteEvent(
                        id=f"perc_{event_counter}",
                        track_id="percussion",
                        bar=bar_num,
                        beat=beat_pos,
                        time=round(snare_time, 3),
                        duration=round(seconds_per_beat * 0.35, 3),
                        duration_beats=0.35,
                        note_name="Snare",
                        midi=38,
                        frequency_hz=210.0,
                        velocity=snare_velocity,
                        commit_hash=commit.short_hash,
                        author=commit.author_name,
                        metadata={"type": "snare", "is_merge_accent": commit.is_merge}
                    )
                )

            # Hi-hats: 8th or 16th notes based on micro-commits
            # Small changes (< 30 lines) get energetic 16th hats
            is_micro_commit = commit.churn < 30
            hat_steps = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5] if not is_micro_commit else [
                1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75
            ]

            for beat_pos in hat_steps:
                event_counter += 1
                hat_time = bar_start_time + ((beat_pos - 1.0) * seconds_per_beat)
                # Open hat on beat 4.5 or on high churn commits
                is_open = (beat_pos in [2.5, 4.5]) and (commit.churn > 150)
                percussion_notes.append(
                    NoteEvent(
                        id=f"perc_{event_counter}",
                        track_id="percussion",
                        bar=bar_num,
                        beat=beat_pos,
                        time=round(hat_time, 3),
                        duration=round(seconds_per_beat * 0.15, 3),
                        duration_beats=0.15,
                        note_name="OpenHat" if is_open else "ClosedHat",
                        midi=46 if is_open else 42,
                        frequency_hz=9500.0 if is_open else 8000.0,
                        velocity=0.75 if is_open else 0.55,
                        commit_hash=commit.short_hash,
                        author=commit.author_name,
                        metadata={"type": "hihat", "open": is_open}
                    )
                )

            # -----------------------------------------------------------------
            # Track 2: Synth Bassline (Driving 8th notes)
            # -----------------------------------------------------------------
            # Select root note: modulated by merges or commit hash
            if commit.is_merge:
                bass_midi = 41  # F1/F2 (heavy sub shift on merge)
            elif commit.deletions > commit.insertions:
                bass_midi = 38  # D2 (darker modal tone)
            else:
                bass_idx = int(commit.hash[:2], 16) % len(self.bass_pool)
                bass_midi = self.bass_pool[bass_idx]

            # Driving synthwave bass pattern (8 eighth notes per bar)
            for eighth_idx in range(8):
                beat_pos = 1.0 + (eighth_idx * 0.5)
                # Octave jump on odd eighth notes for synthwave rolling bass
                note_midi = bass_midi + (12 if eighth_idx % 2 == 1 else 0)
                event_counter += 1
                b_time = bar_start_time + ((beat_pos - 1.0) * seconds_per_beat)
                bass_velocity = 0.85 if (eighth_idx % 2 == 0) else 0.70

                bass_notes.append(
                    NoteEvent(
                        id=f"bass_{event_counter}",
                        track_id="bass",
                        bar=bar_num,
                        beat=beat_pos,
                        time=round(b_time, 3),
                        duration=round(seconds_per_beat * 0.42, 3),
                        duration_beats=0.42,
                        note_name=midi_to_name(note_midi),
                        midi=note_midi,
                        frequency_hz=midi_to_freq(note_midi),
                        velocity=bass_velocity,
                        commit_hash=commit.short_hash,
                        author=commit.author_name,
                        metadata={"churn": commit.churn}
                    )
                )

            # -----------------------------------------------------------------
            # Track 3: Arpeggiated Lead Synth (Procedural hex hash melody)
            # -----------------------------------------------------------------
            # Parse hex hash chunks (8 notes per bar, 16th or 8th note arpeggio)
            # Lines added (+insertions) scale note velocity and presence
            lead_velocity = min(1.0, max(0.45, 0.45 + (commit.insertions / 300.0) * 0.55))

            # Take slices of commit hash to deterministically synthesize melody
            for step_idx in range(8):
                beat_pos = 1.0 + (step_idx * 0.5)
                hex_offset = step_idx * 2
                chunk_hex = commit.hash[hex_offset:hex_offset + 2]
                chunk_val = int(chunk_hex, 16) if len(chunk_hex) == 2 else 0

                scale_idx = chunk_val % len(self.lead_pool)
                lead_midi = self.lead_pool[scale_idx]

                event_counter += 1
                lead_time = bar_start_time + ((beat_pos - 1.0) * seconds_per_beat)

                lead_notes.append(
                    NoteEvent(
                        id=f"lead_{event_counter}",
                        track_id="lead",
                        bar=bar_num,
                        beat=beat_pos,
                        time=round(lead_time, 3),
                        duration=round(seconds_per_beat * 0.38, 3),
                        duration_beats=0.38,
                        note_name=midi_to_name(lead_midi),
                        midi=lead_midi,
                        frequency_hz=midi_to_freq(lead_midi),
                        velocity=round(lead_velocity, 2),
                        commit_hash=commit.short_hash,
                        author=commit.author_name,
                        metadata={
                            "hex_byte": chunk_hex,
                            "insertions": commit.insertions,
                            "message": commit.message
                        }
                    )
                )

            # -----------------------------------------------------------------
            # Track 4: Atmospheric Pad / Chords (Milestones & harmonic foundation)
            # -----------------------------------------------------------------
            # Pad chord sustains across the entire bar (duration: 4 beats)
            # Chord rotates or triggers heavily on milestones/tags/merges
            chord_name, chord_midis = chord_roots[bar_idx % len(chord_roots)]
            if commit.tags or commit.is_merge:
                # Milestone / Release chord accentuation
                pad_velocity = 0.85
            else:
                pad_velocity = 0.55

            for chord_note_midi in chord_midis:
                event_counter += 1
                pad_notes.append(
                    NoteEvent(
                        id=f"pad_{event_counter}",
                        track_id="pad",
                        bar=bar_num,
                        beat=1.0,
                        time=round(bar_start_time, 3),
                        duration=round(seconds_per_bar * 0.95, 3),
                        duration_beats=3.8,
                        note_name=midi_to_name(chord_note_midi),
                        midi=chord_note_midi,
                        frequency_hz=midi_to_freq(chord_note_midi),
                        velocity=pad_velocity,
                        commit_hash=commit.short_hash,
                        author=commit.author_name,
                        metadata={
                            "chord": chord_name,
                            "is_milestone": bool(commit.tags or commit.is_merge),
                            "tags": commit.tags
                        }
                    )
                )

        tracks = [
            TrackSequence(id="percussion", name="Cyberpunk Percussion", instrument_type="drums", notes=percussion_notes),
            TrackSequence(id="bass", name="Sub-Bassline Synthesizer", instrument_type="synth_bass", notes=bass_notes),
            TrackSequence(id="lead", name="Hex Arpeggiator Lead", instrument_type="synth_lead", notes=lead_notes),
            TrackSequence(id="pad", name="Atmospheric Drone Pad", instrument_type="pad", notes=pad_notes)
        ]

        total_duration = total_bars * seconds_per_bar

        # Unified chronological timeline event list
        all_notes = sorted(
            percussion_notes + bass_notes + lead_notes + pad_notes,
            key=lambda n: n.time
        )

        return {
            "metadata": {
                "bpm": bpm,
                "scale": self.scale_type,
                "time_signature": "4/4",
                "total_bars": total_bars,
                "duration_seconds": round(total_duration, 2),
                "total_commits": len(chrono_commits),
                "total_notes": len(all_notes)
            },
            "tracks": [t.to_dict() for t in tracks],
            "timeline": [n.to_dict() for n in all_notes[:1000]]  # Capped for smooth rendering
        }
