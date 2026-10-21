/**
 * Real-Time Canvas Oscilloscope & Spectrum Analyzer.
 * 80s CRT Phosphor Bloom, Dual-Channel Waveform, and Peak-Hold Equalizer.
 */

export class OscilloscopeVisualizer {
  constructor(canvas, synthEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.synthEngine = synthEngine;
    this.mode = 'scope'; // 'scope' | 'spectrum' | 'lissajous'
    this.peaks = new Float32Array(64);
    this.peaksDecay = 0.94;
    this.animationId = null;

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.width = rect.width;
    this.height = rect.height;
    this.ctx.scale(dpr, dpr);
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (this.animationId) return;
    const loop = () => {
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (!w || !h) return;

    // Subtle phosphor persistence trail
    ctx.fillStyle = 'rgba(7, 9, 20, 0.28)';
    ctx.fillRect(0, 0, w, h);

    // Reticle Grid
    this.drawReticle(ctx, w, h);

    const waveform = this.synthEngine.getMasterWaveform();
    const frequency = this.synthEngine.getMasterFrequencyData();

    if (this.mode === 'scope') {
      this.drawWaveform(ctx, w, h, waveform);
    } else if (this.mode === 'spectrum') {
      this.drawSpectrum(ctx, w, h, frequency);
    } else if (this.mode === 'lissajous') {
      this.drawLissajous(ctx, w, h, waveform);
    }
  }

  drawReticle(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
    ctx.lineWidth = 1;

    // Grid lines (8 divisions horizontal, 6 vertical)
    const cols = 8;
    const rows = 6;
    for (let c = 1; c < cols; c++) {
      const x = (c / cols) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = (r / rows) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center Crosshair
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Corner tech markers
    ctx.strokeStyle = '#00f3ff';
    const markerLen = 8;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(4, 4 + markerLen); ctx.lineTo(4, 4); ctx.lineTo(4 + markerLen, 4);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(w - 4 - markerLen, 4); ctx.lineTo(w - 4, 4); ctx.lineTo(w - 4, 4 + markerLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(4, h - 4 - markerLen); ctx.lineTo(4, h - 4); ctx.lineTo(4 + markerLen, h - 4);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(w - 4 - markerLen, h - 4); ctx.lineTo(w - 4, h - 4); ctx.lineTo(w - 4, h - 4 - markerLen);
    ctx.stroke();

    ctx.restore();
  }

  drawWaveform(ctx, w, h, data) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f3ff';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    if (!data || !this.synthEngine.isPlaying) {
      // Idle resting wave
      const time = Date.now() * 0.003;
      for (let x = 0; x < w; x += 4) {
        const y = h / 2 + Math.sin(x * 0.04 + time) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else {
      const sliceWidth = w / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0; // 0.0 to 2.0
        const y = (v * h) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }
    }
    ctx.stroke();

    // Hot pink harmonic overlay
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)';
    ctx.shadowColor = '#ff0055';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  drawSpectrum(ctx, w, h, frequencyData) {
    ctx.save();
    const numBars = 48;
    const barWidth = (w / numBars) - 2;

    for (let i = 0; i < numBars; i++) {
      const freqIdx = Math.floor(Math.pow(i / numBars, 1.4) * (frequencyData ? frequencyData.length * 0.65 : 1));
      const rawVal = (frequencyData && this.synthEngine.isPlaying) ? (frequencyData[freqIdx] / 255.0) : 0.05 + Math.sin(i * 0.3 + Date.now() * 0.002) * 0.03;
      const barHeight = rawVal * (h * 0.85);

      // Peak hold calculation
      if (rawVal > this.peaks[i]) {
        this.peaks[i] = rawVal;
      } else {
        this.peaks[i] *= this.peaksDecay;
      }

      const x = i * (barWidth + 2) + 2;
      const y = h - barHeight - 4;

      // Synthwave gradient for bars
      const grad = ctx.createLinearGradient(x, h, x, y);
      grad.addColorStop(0, '#00f3ff');
      grad.addColorStop(0.5, '#b026ff');
      grad.addColorStop(1, '#ff0055');

      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = rawVal > 0.4 ? 8 : 2;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Peak Hold indicator line
      const peakY = h - (this.peaks[i] * (h * 0.85)) - 6;
      ctx.fillStyle = '#ffea00';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 4;
      ctx.fillRect(x, peakY, barWidth, 2);
    }
    ctx.restore();
  }

  drawLissajous(ctx, w, h, waveform) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff0077';
    ctx.strokeStyle = '#ff0077';
    ctx.lineWidth = 2.0;

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.38;

    ctx.beginPath();
    if (!waveform || !this.synthEngine.isPlaying) {
      const t = Date.now() * 0.002;
      for (let theta = 0; theta < Math.PI * 2; theta += 0.05) {
        const r = radius * (0.8 + Math.sin(theta * 3 + t) * 0.1);
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta * 2 + t) * r;
        if (theta === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else {
      const step = 2;
      for (let i = 0; i < waveform.length - step; i += step) {
        const xVal = (waveform[i] - 128) / 128.0;
        const yVal = (waveform[i + step] - 128) / 128.0;

        const x = cx + xVal * radius * 1.4;
        const y = cy + yVal * radius * 1.4;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Dual cyan inner beam
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.7)';
    ctx.shadowColor = '#00f3ff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
