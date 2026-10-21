/**
 * 80s Cyberpunk Drum Synthesizer (Web Audio API)
 * Pure procedural synthesis without external samples.
 */

let noiseBuffer = null;

function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
  noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

export class DrumSynth {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.destination = destination;
  }

  playKick(time, velocity = 0.9) {
    const t = Math.max(time, this.ctx.currentTime);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Pitch envelope: punchy drop from 160Hz to 42Hz
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);

    // Amplitude envelope
    gain.gain.setValueAtTime(1.0 * velocity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    // Transient click generator
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(320, t);
    clickOsc.frequency.exponentialRampToValueAtTime(30, t + 0.025);
    clickGain.gain.setValueAtTime(0.8 * velocity, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    clickOsc.connect(clickGain);
    clickGain.connect(this.destination);

    osc.connect(gain);
    gain.connect(this.destination);

    osc.start(t);
    osc.stop(t + 0.38);
    clickOsc.start(t);
    clickOsc.stop(t + 0.03);
  }

  playSnare(time, velocity = 0.85, isMerge = false) {
    const t = Math.max(time, this.ctx.currentTime);
    const duration = isMerge ? 0.38 : 0.22;

    // Noise component
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = getNoiseBuffer(this.ctx);

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(isMerge ? 1800 : 2200, t);
    noiseFilter.Q.setValueAtTime(1.2, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime((isMerge ? 1.0 : 0.75) * velocity, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.destination);

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isMerge ? 220 : 185, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

    oscGain.gain.setValueAtTime(0.7 * velocity, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(oscGain);
    oscGain.connect(this.destination);

    noiseSource.start(t);
    noiseSource.stop(t + duration + 0.02);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  playHiHat(time, velocity = 0.6, isOpen = false) {
    const t = Math.max(time, this.ctx.currentTime);
    const duration = isOpen ? 0.28 : 0.06;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = getNoiseBuffer(this.ctx);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(isOpen ? 7000 : 8500, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(velocity * (isOpen ? 0.8 : 0.6), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.destination);

    noiseSource.start(t);
    noiseSource.stop(t + duration + 0.02);
  }
}
