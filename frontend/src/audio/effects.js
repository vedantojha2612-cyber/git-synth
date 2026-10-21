/**
 * Audio Effects DSP Chain for Git Synth.
 * Adds 80s tape warmth, stereo delay, and master limiting.
 */

export function createDelay(ctx, delaySeconds = 0.28, feedbackAmount = 0.35) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const delay = ctx.createDelay();
  const feedback = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  delay.delayTime.setValueAtTime(delaySeconds, ctx.currentTime);
  feedback.gain.setValueAtTime(feedbackAmount, ctx.currentTime);
  
  // High-frequency dampening for tape delay feel
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, ctx.currentTime);

  input.connect(output);
  input.connect(delay);
  delay.connect(filter);
  filter.connect(feedback);
  feedback.connect(delay);
  feedback.connect(output);

  return { input, output, delay, feedback };
}

export function createMasterBus(ctx) {
  const masterIn = ctx.createGain();
  const masterOut = ctx.createGain();

  // Vintage Master Compressor / Limiter
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-14, ctx.currentTime);
  compressor.knee.setValueAtTime(10, ctx.currentTime);
  compressor.ratio.setValueAtTime(4.0, ctx.currentTime);
  compressor.attack.setValueAtTime(0.005, ctx.currentTime);
  compressor.release.setValueAtTime(0.15, ctx.currentTime);

  // Master Analyser Node for Oscilloscope & Spectrum
  const masterAnalyser = ctx.createAnalyser();
  masterAnalyser.fftSize = 512;
  masterAnalyser.smoothingTimeConstant = 0.82;

  masterIn.connect(compressor);
  compressor.connect(masterOut);
  masterOut.connect(masterAnalyser);
  masterAnalyser.connect(ctx.destination);

  return {
    input: masterIn,
    output: masterOut,
    analyser: masterAnalyser,
    compressor
  };
}
