/**
 * Main Application Controller for Git Synth UI.
 * Orchestrates 3D Graphics, Web Audio API DSP, Oscilloscope Visualizer,
 * Mixer Console, and Git Telemetry Inspector.
 */

import { synthEngine } from './audio/synth-engine.js';
import { apiClient } from './api/client.js';
import { SynthwaveGrid3D } from './visualizer/synthwave-grid-3d.js';
import { OscilloscopeVisualizer } from './visualizer/oscilloscope.js';
import { TransportComponent } from './components/transport.js';
import { MixerComponent } from './components/mixer.js';
import { InspectorComponent } from './components/inspector.js';
import { ModalComponent } from './components/modal.js';

class GitSynthApp {
  constructor() {
    this.currentScale = 'synthwave_minor';
    this.sequenceData = null;

    // Visualizers
    const gridCanvas = document.getElementById('canvas-3d-grid');
    this.grid3d = new SynthwaveGrid3D(gridCanvas);

    const oscCanvas = document.getElementById('oscilloscope-canvas');
    this.oscilloscope = new OscilloscopeVisualizer(oscCanvas, synthEngine);

    // Sub-components
    this.mixer = new MixerComponent(synthEngine);
    this.inspector = new InspectorComponent();
    this.modal = new ModalComponent(apiClient);

    this.transport = new TransportComponent(
      synthEngine,
      (newScale) => this.handleScaleChange(newScale),
      () => this.loadData()
    );

    this.initAudioCallbacks();
    this.initModeTabs();
    this.initDisplayToggles();
  }

  async init() {
    // Start visual loops
    this.grid3d.start();
    this.oscilloscope.start();

    // Load initial sequence
    await this.loadData();
  }

  async loadData() {
    const statusDot = document.querySelector('#engine-status .status-dot');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('engine-status');

    if (statusText) statusText.textContent = 'PROBING ENGINE...';

    try {
      this.sequenceData = await apiClient.fetchSequence(this.currentScale, 28);
      synthEngine.loadSequence(this.sequenceData);

      // Render timeline markers
      this.transport.renderTimelineMarkers(this.sequenceData);

      // Initial commit inspection
      if (this.sequenceData.commits?.length) {
        this.inspector.updateCommit(this.sequenceData.commits[0]);
      }

      // Update connection badge
      if (apiClient.isLive) {
        statusIndicator?.classList.remove('fallback');
        if (statusText) statusText.textContent = `ONLINE: PORT ${apiClient.activePort}`;
      } else {
        statusIndicator?.classList.add('fallback');
        if (statusText) statusText.textContent = `STANDALONE SIMULATOR (HIGH-FIDELITY)`;
      }

      const timelineStatsLabel = document.getElementById('timeline-stats-label');
      if (timelineStatsLabel && this.sequenceData.metadata) {
        timelineStatsLabel.textContent = `${this.sequenceData.metadata.total_commits} COMMITS · ${this.sequenceData.metadata.total_notes} NOTES · ${this.sequenceData.metadata.duration_seconds}s`;
      }
    } catch (err) {
      console.error('[GitSynth] Failed to load sequence:', err);
      if (statusText) statusText.textContent = 'SIMULATOR MODE';
    }
  }

  async handleScaleChange(newScale) {
    this.currentScale = newScale;
    const wasPlaying = synthEngine.isPlaying;
    await this.loadData();
    if (wasPlaying) {
      synthEngine.play();
    }
  }

  initAudioCallbacks() {
    // Synchronization with playhead & inspector
    synthEngine.onTick = (currentTime, duration, bar, beat, commit) => {
      this.transport.updateProgress(currentTime, duration, bar, beat);
      if (commit) {
        this.inspector.updateCommit(commit);
      }
    };

    // Playback state updates
    synthEngine.onStateChange = (isPlaying) => {
      this.transport.updatePlayState(isPlaying);
    };

    // Note trigger flashes & audio reactive horizon
    synthEngine.onNoteTrigger = (note) => {
      this.mixer.flashSignal(note.track_id);

      // Boost 3D horizon grid speed based on note velocity
      const energy = note.velocity || 0.6;
      this.grid3d.setAudioEnergy(energy);
    };
  }

  initModeTabs() {
    const tabs = document.querySelectorAll('.btn-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.getAttribute('data-mode');
        this.oscilloscope.setMode(mode);
      });
    });
  }

  initDisplayToggles() {
    // CRT Monitor Toggle
    const crtBtn = document.getElementById('btn-toggle-crt');
    let crtOn = true;
    crtBtn?.addEventListener('click', () => {
      crtOn = !crtOn;
      document.body.classList.toggle('crt-off', !crtOn);
      crtBtn.innerHTML = `<span>📺</span> CRT: ${crtOn ? 'ON' : 'OFF'}`;
    });

    // 3D Grid Toggle
    const horizonBtn = document.getElementById('btn-toggle-horizon');
    const gridContainer = document.getElementById('bg-canvas-container');
    let horizonOn = true;
    horizonBtn?.addEventListener('click', () => {
      horizonOn = !horizonOn;
      if (gridContainer) gridContainer.style.display = horizonOn ? 'block' : 'none';
      horizonBtn.innerHTML = `<span>🌅</span> 3D: ${horizonOn ? 'ON' : 'OFF'}`;
    });
  }
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new GitSynthApp();
  app.init();
  window.gitSynthApp = app;
});
