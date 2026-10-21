/**
 * 4-Track Algorithmic Synthesizer Engine (Web Audio API)
 * Plays synchronized Git timeline sequences with 80s Cyberpunk timbre.
 */
import { DrumSynth } from './drum-synth.js';
import { createDelay, createMasterBus } from './effects.js';

export class SynthEngine {
  constructor() {
    this.ctx = null;
    this.masterBus = null;
    this.drumSynth = null;
    this.leadDelay = null;
    this.padDelay = null;

    // Track channels: { gain, muteGain, analyser, panner, isMuted, isSolo, volume }
    this.channels = {};
    
    // Playback state
    this.isPlaying = false;
    this.isLooping = true;
    this.sequenceData = null;
    this.bpm = 118.0;
    this.currentTime = 0;       // in musical sequence seconds
    this.playbackStartTime = 0; // ctx.currentTime when play was pressed
    this.startOffset = 0;       // sequence time offset when play was pressed
    this.timerId = null;

    // Lookahead scheduler
    this.lookaheadMs = 25;
    this.scheduleAheadSec = 0.15;
    this.nextNoteIndex = 0;
    this.allNotes = [];

    // Callbacks
    this.onTick = null;       // (time, duration, bar, beat, commit) => void
    this.onStateChange = null;// (isPlaying) => void
    this.onNoteTrigger = null;// (note) => void
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Bus with compressor and analyser
      this.masterBus = createMasterBus(this.ctx);

      // Lead Ping-pong Delay
      this.leadDelay = createDelay(this.ctx, 0.26, 0.38);
      this.leadDelay.output.connect(this.masterBus.input);

      // Pad Reverb/Delay
      this.padDelay = createDelay(this.ctx, 0.42, 0.45);
      this.padDelay.output.connect(this.masterBus.input);

      // Initialize 4 Channels
      const trackIds = ["percussion", "bass", "lead", "pad"];
      for (const tid of trackIds) {
        const gain = this.ctx.createGain();
        gain.gain.value = 0.8;

        const muteGain = this.ctx.createGain();
        muteGain.gain.value = 1.0;

        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.5;

        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

        if (panner) {
          gain.connect(panner);
          panner.connect(muteGain);
        } else {
          gain.connect(muteGain);
        }

        muteGain.connect(analyser);

        if (tid === "lead") {
          analyser.connect(this.leadDelay.input);
        } else if (tid === "pad") {
          analyser.connect(this.padDelay.input);
        } else {
          analyser.connect(this.masterBus.input);
        }

        this.channels[tid] = {
          gain,
          muteGain,
          analyser,
          panner,
          volume: 0.8,
          isMuted: false,
          isSolo: false
        };
      }

      this.drumSynth = new DrumSynth(this.ctx, this.channels.percussion.gain);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  loadSequence(data) {
    this.sequenceData = data;
    this.bpm = data.metadata?.bpm || 118.0;

    // Collect and sort all note events chronologically
    const notes = [];
    if (data.tracks) {
      for (const track of data.tracks) {
        if (track.notes) {
          for (const n of track.notes) {
            notes.push(n);
          }
        }
      }
    }
    notes.sort((a, b) => a.time - b.time);
    this.allNotes = notes;
    this.nextNoteIndex = 0;
    this.currentTime = 0;
    this.startOffset = 0;
  }

  play() {
    this.ensureContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playbackStartTime = this.ctx.currentTime;

    // Fast-forward nextNoteIndex to startOffset
    this.nextNoteIndex = this.findNoteIndexForTime(this.startOffset);

    this.scheduler();
    if (this.onStateChange) this.onStateChange(true);
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    clearTimeout(this.timerId);

    // Save current elapsed position
    this.startOffset = this.getCurrentSequenceTime();
    this.currentTime = this.startOffset;

    if (this.onStateChange) this.onStateChange(false);
  }

  stop() {
    this.pause();
    this.startOffset = 0;
    this.currentTime = 0;
    this.nextNoteIndex = 0;
    if (this.onTick) {
      const commit = this.getCurrentCommit();
      this.onTick(0, this.getDuration(), 1, 1, commit);
    }
  }

  seek(timeSeconds) {
    const dur = this.getDuration();
    const clamped = Math.max(0, Math.min(dur, timeSeconds));
    const wasPlaying = this.isPlaying;

    if (wasPlaying) {
      this.pause();
    }

    this.startOffset = clamped;
    this.currentTime = clamped;
    this.nextNoteIndex = this.findNoteIndexForTime(clamped);

    if (this.onTick) {
      const commit = this.getCurrentCommit();
      const secondsPerBeat = 60.0 / this.bpm;
      const currentBeat = (clamped / secondsPerBeat) % 4 + 1;
      const currentBar = Math.floor(clamped / (secondsPerBeat * 4)) + 1;
      this.onTick(clamped, dur, currentBar, currentBeat, commit);
    }

    if (wasPlaying) {
      this.play();
    }
  }

  getCurrentSequenceTime() {
    if (!this.isPlaying || !this.ctx) return this.startOffset;
    const elapsed = this.ctx.currentTime - this.playbackStartTime;
    let seqTime = this.startOffset + elapsed;
    const dur = this.getDuration();

    if (dur > 0 && seqTime >= dur) {
      if (this.isLooping) {
        seqTime = seqTime % dur;
      } else {
        seqTime = dur;
      }
    }
    return seqTime;
  }

  getDuration() {
    return this.sequenceData?.metadata?.duration_seconds || 48.0;
  }

  findNoteIndexForTime(time) {
    for (let i = 0; i < this.allNotes.length; i++) {
      if (this.allNotes[i].time >= time) return i;
    }
    return this.allNotes.length;
  }

  scheduler() {
    if (!this.isPlaying) return;

    const currentSeqTime = this.getCurrentSequenceTime();
    const scheduleWindowEnd = currentSeqTime + this.scheduleAheadSec;
    const dur = this.getDuration();

    // Schedule all notes within window
    while (this.nextNoteIndex < this.allNotes.length) {
      const note = this.allNotes[this.nextNoteIndex];
      if (note.time <= scheduleWindowEnd) {
        // Calculate audio context trigger time
        const timeDiff = note.time - currentSeqTime;
        const targetAudioTime = this.ctx.currentTime + Math.max(0, timeDiff);

        this.scheduleNote(note, targetAudioTime);
        this.nextNoteIndex++;
      } else {
        break;
      }
    }

    // Handle loop wrap
    if (this.nextNoteIndex >= this.allNotes.length && this.isLooping) {
      if (currentSeqTime >= dur - 0.05) {
        this.playbackStartTime = this.ctx.currentTime;
        this.startOffset = 0;
        this.nextNoteIndex = 0;
      }
    }

    // UI Tick callback
    const commit = this.getCurrentCommit();
    const secondsPerBeat = 60.0 / this.bpm;
    const currentBeat = (currentSeqTime / secondsPerBeat) % 4 + 1;
    const currentBar = Math.floor(currentSeqTime / (secondsPerBeat * 4)) + 1;

    if (this.onTick) {
      this.onTick(currentSeqTime, dur, currentBar, currentBeat, commit);
    }

    this.timerId = setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  scheduleNote(note, audioTime) {
    if (this.onNoteTrigger) {
      this.onNoteTrigger(note);
    }

    const tid = note.track_id;
    if (tid === "percussion") {
      const type = note.metadata?.type || (note.note_name.toLowerCase());
      if (type.includes("kick")) {
        this.drumSynth.playKick(audioTime, note.velocity);
      } else if (type.includes("snare")) {
        this.drumSynth.playSnare(audioTime, note.velocity, note.metadata?.is_merge_accent);
      } else {
        this.drumSynth.playHiHat(audioTime, note.velocity, note.metadata?.open);
      }
    } else if (tid === "bass") {
      this.playBassNote(note, audioTime);
    } else if (tid === "lead") {
      this.playLeadNote(note, audioTime);
    } else if (tid === "pad") {
      this.playPadNote(note, audioTime);
    }
  }

  playBassNote(note, audioTime) {
    const ch = this.channels.bass;
    if (!ch) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(note.frequency_hz, audioTime);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(note.frequency_hz * 0.5, audioTime); // Sub octave

    // Filter envelope
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, audioTime);
    filter.frequency.exponentialRampToValueAtTime(140, audioTime + note.duration);
    filter.Q.setValueAtTime(3.8, audioTime);

    // Amplitude envelope
    const attack = 0.012;
    const decay = note.duration * 0.9;
    noteGain.gain.setValueAtTime(0.001, audioTime);
    noteGain.gain.linearRampToValueAtTime(0.85 * note.velocity, audioTime + attack);
    noteGain.gain.exponentialRampToValueAtTime(0.001, audioTime + decay);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(ch.gain);

    osc1.start(audioTime);
    osc2.start(audioTime);
    osc1.stop(audioTime + note.duration + 0.05);
    osc2.stop(audioTime + note.duration + 0.05);
  }

  playLeadNote(note, audioTime) {
    const ch = this.channels.lead;
    if (!ch) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(note.frequency_hz, audioTime);

    // Subtle pitch vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(5.5, audioTime);
    lfoGain.gain.setValueAtTime(4.0, audioTime);
    lfo.connect(osc.frequency);

    // Bright 80s resonant bandpass
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, audioTime);
    filter.Q.setValueAtTime(2.2, audioTime);

    const attack = 0.01;
    const dur = Math.max(0.1, note.duration);
    noteGain.gain.setValueAtTime(0.001, audioTime);
    noteGain.gain.linearRampToValueAtTime(0.7 * note.velocity, audioTime + attack);
    noteGain.gain.exponentialRampToValueAtTime(0.001, audioTime + dur);

    osc.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(ch.gain);

    lfo.start(audioTime);
    osc.start(audioTime);
    lfo.stop(audioTime + dur + 0.05);
    osc.stop(audioTime + dur + 0.05);
  }

  playPadNote(note, audioTime) {
    const ch = this.channels.pad;
    if (!ch) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(note.frequency_hz, audioTime);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(note.frequency_hz * 1.004, audioTime); // Subtle chorusing detune

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(750, audioTime);
    filter.Q.setValueAtTime(1.5, audioTime);

    const dur = note.duration;
    const attack = 0.28;
    noteGain.gain.setValueAtTime(0.001, audioTime);
    noteGain.gain.linearRampToValueAtTime(0.4 * note.velocity, audioTime + attack);
    noteGain.gain.setValueAtTime(0.35 * note.velocity, audioTime + dur * 0.7);
    noteGain.gain.exponentialRampToValueAtTime(0.001, audioTime + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(ch.gain);

    osc1.start(audioTime);
    osc2.start(audioTime);
    osc1.stop(audioTime + dur + 0.08);
    osc2.stop(audioTime + dur + 0.08);
  }

  getCurrentCommit() {
    if (!this.sequenceData?.commits) return null;
    const commits = this.sequenceData.commits;
    const dur = this.getDuration();
    if (!commits.length || dur <= 0) return null;

    const fraction = this.getCurrentSequenceTime() / dur;
    const commitIdx = Math.min(commits.length - 1, Math.floor(fraction * commits.length));
    return commits[commitIdx];
  }

  setTrackVolume(trackId, val) {
    const ch = this.channels[trackId];
    if (ch) {
      ch.volume = val;
      if (this.ctx) {
        ch.gain.gain.setValueAtTime(val, this.ctx.currentTime);
      }
    }
  }

  setTrackPan(trackId, panVal) {
    const ch = this.channels[trackId];
    if (ch && ch.panner && this.ctx) {
      ch.panner.pan.setValueAtTime(panVal, this.ctx.currentTime);
    }
  }

  setTrackMute(trackId, isMuted) {
    const ch = this.channels[trackId];
    if (ch) {
      ch.isMuted = isMuted;
      this.updateSoloMuteRouting();
    }
  }

  setTrackSolo(trackId, isSolo) {
    const ch = this.channels[trackId];
    if (ch) {
      ch.isSolo = isSolo;
      this.updateSoloMuteRouting();
    }
  }

  updateSoloMuteRouting() {
    const hasSolo = Object.values(this.channels).some(ch => ch.isSolo);
    for (const [tid, ch] of Object.entries(this.channels)) {
      let active = true;
      if (hasSolo) {
        active = ch.isSolo;
      } else if (ch.isMuted) {
        active = false;
      }
      if (this.ctx) {
        ch.muteGain.gain.setValueAtTime(active ? 1.0 : 0.0, this.ctx.currentTime);
      }
    }
  }

  setMasterVolume(val) {
    if (this.masterBus && this.ctx) {
      this.masterBus.input.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  getChannelLevel(trackId) {
    const ch = this.channels[trackId];
    if (!ch || !this.ctx || !this.isPlaying) return 0;
    const data = new Uint8Array(ch.analyser.frequencyBinCount);
    ch.analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1.0, rms * 3.5);
  }

  getMasterWaveform() {
    if (!this.masterBus || !this.ctx) return null;
    const analyser = this.masterBus.analyser;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buffer);
    return buffer;
  }

  getMasterFrequencyData() {
    if (!this.masterBus || !this.ctx) return null;
    const analyser = this.masterBus.analyser;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buffer);
    return buffer;
  }
}

export const synthEngine = new SynthEngine();
