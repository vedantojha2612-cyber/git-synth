# Git Synth // Retro Synthwave & Oscilloscope UI (Step 2)

An 80s Cyberpunk / Outrun hardware console web interface that transforms Git commit history into a living, synchronized 4-track audio-visual symphony.

Designed and crafted by **ITACHI (UI UX DESIGNER)** for **SAARTHAK OJHA** and **FUGAKU (Chief of Staff)**.

---

## 🌟 Visual & Audio Features

1. **80s Cyberpunk CRT Hardware Aesthetic:**
   - Deep CRT phosphor glow with toggleable raster scanlines, phosphor bloom, and tube curvature simulation.
   - Dual-layer Canvas: Animated 3D perspective wireframe horizon with retro vector sun blinds and distant mountain silhouettes reactive to audio velocity.
   - Custom segmented digital LED clock displays (Time, Bar, Beat, BPM).

2. **Master Oscilloscope & Spectral Analyzer (Canvas 2D):**
   - **Oscilloscope Mode:** Real-time dual-beam audio time-domain waveform with phosphor bloom persistence and voltage reticle.
   - **Spectrum Bars Mode:** 48-band neon equalizer frequency bars with falling peak-hold indicators.
   - **Lissajous XY Mode:** Vector phase scope rendering orbital harmonic Lissajous geometry.

3. **Web Audio 4-Track Synthesizer Engine (Zero external audio samples):**
   - **Track 1 (Rhythm / Drums):** Procedural 808-style sine kick with exponential pitch decay, punchy filtered noise snare (with dynamic velocity accent on merge commits), and tight closed/open hi-hats.
   - **Track 2 (Sub Bass):** Dual-oscillator Sawtooth + Sub-sine synth passing through a resonant 24dB low-pass filter with envelope punch.
   - **Track 3 (Lead Arpeggiator):** Hex hash-derived procedural melodic arpeggio synthesized with pulse oscillators, vibrato LFO, and a 280ms tape ping-pong feedback delay line.
   - **Track 4 (Ambient Pad):** Warm polyphonic chord drone (Saw/Triangle chorused detune) with slow envelope through a low-pass filter and faux-reverb delay line.

4. **4-Channel Hardware Equalizer & Mixer Console:**
   - Vertical volume faders (-∞ to +6dB).
   - Stereo Pan knobs (-100 to +100).
   - Illuminated Mute [M] and Solo [S] buttons with dynamic signal routing.
   - Real-time 12-segment LED VU Meters (Green, Yellow, Red peak) driven by instantaneous Web Audio RMS analysis.

5. **Commit Telemetry & Author Timbre Inspector:**
   - Live Commit Inspector card displaying commit short hash, author avatar, commit message, and visual Diff Churn Ratio (insertions vs deletions).
   - Contributor Sound Signature Matrix: maps author identity procedurally into synthesis parameters (waveform type, filter cutoff frequency, and reverb mix).
   - Interactive Scrubber: Seek anywhere across the timeline with a glowing laser playhead.

6. **Smart Backend Discovery & Seamless Standalone Fallback:**
   - Automatically probes ports `8000`, `8001`, `8002`, `8005` or relative `/api/health`.
   - If the backend server is offline or loading, automatically operates in High-Fidelity Standalone Simulator mode with deterministic procedural commits and musical timeline so the app works anywhere without installation hurdles!

---

## 🚀 Quickstart & Development

### 1. Run Development Server (Vite)
```bash
cd git-synth/frontend
npm run dev
# Opens on http://localhost:3000
```

### 2. Build for Production
```bash
cd git-synth/frontend
npm run build
# Builds optimized standalone bundle to dist/
```

### 3. Run Static Distribution Directly
```bash
python3 -m http.server 8080 --directory git-synth/frontend
# Or serve dist/
python3 -m http.server 8080 --directory git-synth/frontend/dist
```

---

## 📁 File Structure
```
git-synth/frontend/
├── index.html                 # Main application shell
├── package.json               # NPM package configuration (Vite)
├── vite.config.js             # Vite build & proxy configuration
├── README.md                  # Comprehensive documentation
├── preview.png                # Attached UI screenshot preview
├── src/
│   ├── main.js                # App coordinator & event wiring
│   ├── styles/
│   │   ├── main.css           # Grid layout, mixer & inspector styles
│   │   ├── synthwave.css      # Cyberpunk neon design tokens
│   │   └── crt.css            # CRT phosphor & scanline effects
│   ├── audio/
│   │   ├── synth-engine.js    # 4-track Web Audio API scheduler
│   │   ├── drum-synth.js      # Procedural Kick, Snare & Hi-Hat
│   │   └── effects.js         # Tape delay, master bus limiter & analyser
│   ├── visualizer/
│   │   ├── oscilloscope.js    # Multi-mode waveform / spectrum / Lissajous
│   │   └── synthwave-grid-3d.js # 3D perspective wireframe horizon
│   ├── api/
│   │   ├── client.js          # API client with auto-discovery & fallback
│   │   └── mock-data.js       # High-fidelity mock generator matching backend
│   └── components/
│       ├── transport.js       # Master controls, BPM, timeline scrubber
│       ├── mixer.js           # 4-channel strip, volume faders, VU meters
│       ├── inspector.js       # Commit telemetry & sound signature card
│       └── modal.js           # Contributor matrix & repo stats modal
└── dist/                      # Production build assets
```
