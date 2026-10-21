/**
 * Standalone High-Fidelity Mock Sequence Generator for Git Synth UI.
 * Replicates the exact schema and mathematical mapping of backend/music_mapper.py
 * and backend/git_analyzer.py.
 */

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToFreq(midi) {
  return +(440.0 * Math.pow(2.0, (midi - 69) / 12.0)).toFixed(2);
}

function midiToName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const pitch = PITCH_NAMES[midi % 12];
  return `${pitch}${octave}`;
}

export function generateMockSequence(customScale = "synthwave_minor", commitCount = 20) {
  const bpm = 118.0;
  const secondsPerBeat = 60.0 / bpm;
  const secondsPerBar = secondsPerBeat * 4.0;

  // Scale intervals relative to A
  let intervals = [0, 3, 5, 7, 10]; // Synthwave Minor (A Minor Pentatonic)
  if (customScale === "dorian") {
    intervals = [0, 2, 3, 5, 7, 9, 10];
  } else if (customScale === "natural_minor") {
    intervals = [0, 2, 3, 5, 7, 8, 10];
  }

  const scalePool = [];
  for (const oct of [33, 45, 57, 69, 81]) {
    for (const iv of intervals) {
      const note = oct + iv;
      if (note >= 33 && note <= 96) scalePool.push(note);
    }
  }

  const bassPool = scalePool.filter(n => n >= 33 && n <= 50);
  const leadPool = scalePool.filter(n => n >= 57 && n <= 88);

  const sampleAuthors = [
    { name: "Itachi (Visual UX)", email: "itachi@synth.dev", timbre: { waveform: "sawtooth", cutoff: 2400, reverb: 0.45 } },
    { name: "Obito (Audio Core)", email: "obito@synth.dev", timbre: { waveform: "square", cutoff: 1800, reverb: 0.3 } },
    { name: "Fugaku (Architect)", email: "fugaku@synth.dev", timbre: { waveform: "triangle", cutoff: 1200, reverb: 0.5 } },
    { name: "Sarthak (Lead)", email: "sarthak@synth.dev", timbre: { waveform: "sawtooth", cutoff: 3100, reverb: 0.4 } },
    { name: "Shisui (Pipeline)", email: "shisui@synth.dev", timbre: { waveform: "sine", cutoff: 900, reverb: 0.25 } }
  ];

  const commitTemplates = [
    { msg: "feat(core): initialize git audio rhythm synthesizer engine", ins: 450, del: 12, merge: false, tags: ["v0.1.0-alpha"] },
    { msg: "feat(dsp): implement 16-step pentatonic scale quantizer", ins: 180, del: 5, merge: false, tags: [] },
    { msg: "fix(buffer): resolve audio stream underflow in circular buffer", ins: 45, del: 38, merge: false, tags: [] },
    { msg: "Merge branch 'feat/cyber-equalizer' into main", ins: 0, del: 0, merge: true, tags: [] },
    { msg: "feat(ui): add neon oscilloscope and spectral visualizer", ins: 620, del: 20, merge: false, tags: [] },
    { msg: "refactor(audio): vectorize WebAudio oscillator node graph", ins: 85, del: 140, merge: false, tags: [] },
    { msg: "perf(wasm): optimize FFT audio frequency calculation pipeline", ins: 320, del: 95, merge: false, tags: ["v0.2.0-beta"] },
    { msg: "fix(tempo): align BPM sync clock with commit frequency telemetry", ins: 32, del: 14, merge: false, tags: [] },
    { msg: "chore(deps): upgrade audio codec dependencies and lockfile", ins: 850, del: 120, merge: false, tags: [] },
    { msg: "Merge pull request #12 from feature/midi-export", ins: 0, del: 0, merge: true, tags: [] },
    { msg: "feat(export): procedural MIDI sequence file generator", ins: 210, del: 8, merge: false, tags: [] },
    { msg: "docs(readme): interactive architecture diagram and quickstart guide", ins: 95, del: 10, merge: false, tags: [] },
    { msg: "feat(release): Git Synth v1.0.0 production milestone", ins: 150, del: 25, merge: false, tags: ["v1.0.0"] }
  ];

  const chords = [
    { name: "Am", midis: [45, 57, 60, 64] },
    { name: "F",  midis: [41, 53, 57, 60] },
    { name: "C",  midis: [36, 48, 52, 55] },
    { name: "G",  midis: [43, 55, 59, 62] },
    { name: "Dm", midis: [38, 50, 53, 57] }
  ];

  const percNotes = [];
  const bassNotes = [];
  const leadNotes = [];
  const padNotes = [];
  const commits = [];

  let eventCounter = 0;
  const baseTime = Date.now() - (commitCount * 3600 * 4 * 1000);

  for (let barIdx = 0; barIdx < commitCount; barIdx++) {
    const barNum = barIdx + 1;
    const barStartTime = barIdx * secondsPerBar;
    const tmpl = commitTemplates[barIdx % commitTemplates.length];
    const author = sampleAuthors[barIdx % sampleAuthors.length];
    const commitTime = new Date(baseTime + (barIdx * 3600 * 4 * 1000)).toISOString();
    const hash = ((barIdx + 1) * 0xdeadbeef).toString(16).padStart(40, "0");
    const shortHash = hash.slice(0, 7);
    const churn = tmpl.ins + tmpl.del;

    const commitObj = {
      hash,
      short_hash: shortHash,
      author_name: author.name,
      author_email: author.email,
      timestamp: Math.floor(Date.parse(commitTime) / 1000),
      iso_time: commitTime,
      message: `${tmpl.msg} [#${barIdx + 1}]`,
      is_merge: tmpl.merge,
      tags: tmpl.tags,
      insertions: tmpl.ins,
      deletions: tmpl.del,
      churn,
      net_lines: tmpl.ins - tmpl.del,
      sound_signature: author.timbre
    };
    commits.push(commitObj);

    // Track 1: Percussion
    // Kick on 1 and 3
    for (const b of [1.0, 3.0]) {
      eventCounter++;
      percNotes.push({
        id: `perc_${eventCounter}`,
        track_id: "percussion",
        bar: barNum,
        beat: b,
        time: +(barStartTime + (b - 1.0) * secondsPerBeat).toFixed(3),
        duration: +(secondsPerBeat * 0.4).toFixed(3),
        duration_beats: 0.4,
        note_name: "Kick",
        midi: 36,
        frequency_hz: 60.0,
        velocity: 0.92,
        commit_hash: shortHash,
        author: author.name,
        metadata: { type: "kick" }
      });
    }

    // Snare on 2 and 4
    for (const b of [2.0, 4.0]) {
      eventCounter++;
      percNotes.push({
        id: `perc_${eventCounter}`,
        track_id: "percussion",
        bar: barNum,
        beat: b,
        time: +(barStartTime + (b - 1.0) * secondsPerBeat).toFixed(3),
        duration: +(secondsPerBeat * 0.35).toFixed(3),
        duration_beats: 0.35,
        note_name: "Snare",
        midi: 38,
        frequency_hz: 210.0,
        velocity: tmpl.merge ? 0.98 : 0.85,
        commit_hash: shortHash,
        author: author.name,
        metadata: { type: "snare", is_merge_accent: tmpl.merge }
      });
    }

    // Hi-Hats: 8th or 16th notes
    const isMicro = churn < 40;
    const hatSteps = isMicro
      ? [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75]
      : [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];

    for (const b of hatSteps) {
      eventCounter++;
      const isOpen = (b === 2.5 || b === 4.5) && (churn > 150);
      percNotes.push({
        id: `perc_${eventCounter}`,
        track_id: "percussion",
        bar: barNum,
        beat: b,
        time: +(barStartTime + (b - 1.0) * secondsPerBeat).toFixed(3),
        duration: +(secondsPerBeat * 0.15).toFixed(3),
        duration_beats: 0.15,
        note_name: isOpen ? "OpenHat" : "ClosedHat",
        midi: isOpen ? 46 : 42,
        frequency_hz: isOpen ? 9500.0 : 8000.0,
        velocity: isOpen ? 0.75 : 0.55,
        commit_hash: shortHash,
        author: author.name,
        metadata: { type: "hihat", open: isOpen }
      });
    }

    // Track 2: Sub-Bassline
    let bassMidi = tmpl.merge ? 41 : (tmpl.del > tmpl.ins ? 38 : bassPool[barIdx % bassPool.length]);
    for (let eighth = 0; eighth < 8; eighth++) {
      const b = 1.0 + eighth * 0.5;
      const noteMidi = bassMidi + (eighth % 2 === 1 ? 12 : 0);
      eventCounter++;
      bassNotes.push({
        id: `bass_${eventCounter}`,
        track_id: "bass",
        bar: barNum,
        beat: b,
        time: +(barStartTime + (b - 1.0) * secondsPerBeat).toFixed(3),
        duration: +(secondsPerBeat * 0.42).toFixed(3),
        duration_beats: 0.42,
        note_name: midiToName(noteMidi),
        midi: noteMidi,
        frequency_hz: midiToFreq(noteMidi),
        velocity: eighth % 2 === 0 ? 0.85 : 0.70,
        commit_hash: shortHash,
        author: author.name,
        metadata: { churn }
      });
    }

    // Track 3: Hex Arpeggiator Lead
    const leadVel = Math.min(1.0, Math.max(0.45, 0.45 + (tmpl.ins / 300.0) * 0.55));
    for (let step = 0; step < 8; step++) {
      const b = 1.0 + step * 0.5;
      const hexChunk = hash.slice(step * 2, step * 2 + 2);
      const chunkVal = parseInt(hexChunk, 16) || 0;
      const leadMidi = leadPool[chunkVal % leadPool.length];
      eventCounter++;
      leadNotes.push({
        id: `lead_${eventCounter}`,
        track_id: "lead",
        bar: barNum,
        beat: b,
        time: +(barStartTime + (b - 1.0) * secondsPerBeat).toFixed(3),
        duration: +(secondsPerBeat * 0.38).toFixed(3),
        duration_beats: 0.38,
        note_name: midiToName(leadMidi),
        midi: leadMidi,
        frequency_hz: midiToFreq(leadMidi),
        velocity: +leadVel.toFixed(2),
        commit_hash: shortHash,
        author: author.name,
        metadata: { hex_byte: hexChunk, insertions: tmpl.ins, message: tmpl.msg }
      });
    }

    // Track 4: Atmospheric Pad
    const chord = chords[barIdx % chords.length];
    const padVel = (tmpl.tags.length > 0 || tmpl.merge) ? 0.85 : 0.55;
    for (const cNote of chord.midis) {
      eventCounter++;
      padNotes.push({
        id: `pad_${eventCounter}`,
        track_id: "pad",
        bar: barNum,
        beat: 1.0,
        time: +(barStartTime).toFixed(3),
        duration: +(secondsPerBar * 0.95).toFixed(3),
        duration_beats: 3.8,
        note_name: midiToName(cNote),
        midi: cNote,
        frequency_hz: midiToFreq(cNote),
        velocity: padVel,
        commit_hash: shortHash,
        author: author.name,
        metadata: { chord: chord.name, is_milestone: tmpl.tags.length > 0 || tmpl.merge, tags: tmpl.tags }
      });
    }
  }

  const allNotes = [...percNotes, ...bassNotes, ...leadNotes, ...padNotes].sort((a, b) => a.time - b.time);
  const totalDuration = commitCount * secondsPerBar;

  const authorStats = {};
  for (const a of sampleAuthors) {
    authorStats[a.name] = {
      name: a.name,
      email: a.email,
      commit_count: commits.filter(c => c.author_name === a.name).length,
      total_insertions: commits.filter(c => c.author_name === a.name).reduce((acc, c) => acc + c.insertions, 0),
      total_deletions: commits.filter(c => c.author_name === a.name).reduce((acc, c) => acc + c.deletions, 0),
      sound_signature: a.timbre
    };
  }

  return {
    metadata: {
      bpm,
      scale: customScale,
      time_signature: "4/4",
      total_bars: commitCount,
      duration_seconds: +totalDuration.toFixed(2),
      total_commits: commitCount,
      total_notes: allNotes.length
    },
    commits,
    tracks: [
      { id: "percussion", name: "Cyberpunk Percussion", instrument_type: "drums", total_notes: percNotes.length, notes: percNotes },
      { id: "bass", name: "Sub-Bassline Synthesizer", instrument_type: "synth_bass", total_notes: bassNotes.length, notes: bassNotes },
      { id: "lead", name: "Hex Arpeggiator Lead", instrument_type: "synth_lead", total_notes: leadNotes.length, notes: leadNotes },
      { id: "pad", name: "Atmospheric Drone Pad", instrument_type: "pad", total_notes: padNotes.length, notes: padNotes }
    ],
    timeline: allNotes,
    repo_stats: {
      total_commits: commitCount,
      total_authors: sampleAuthors.length,
      total_insertions: commits.reduce((acc, c) => acc + c.insertions, 0),
      total_deletions: commits.reduce((acc, c) => acc + c.deletions, 0),
      net_lines: commits.reduce((acc, c) => acc + c.net_lines, 0),
      merge_count: commits.filter(c => c.is_merge).length,
      span_hours: commitCount * 4,
      commit_frequency_per_day: 6.0
    },
    authors: authorStats,
    is_git_repository: true,
    is_fallback: true
  };
}
