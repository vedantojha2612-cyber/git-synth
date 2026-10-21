/**
 * 3D Synthwave Horizon & Outrun Perspective Grid.
 * Canvas-based 3D vector graphics with retro sun, neon mountain silhouettes,
 * and audio-reactive horizon warp.
 */

export class SynthwaveGrid3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animationId = null;
    this.offsetZ = 0;
    this.speed = 1.8;
    this.audioEnergy = 0;

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

  setAudioEnergy(energy) {
    this.audioEnergy = Math.max(0, Math.min(1, energy));
  }

  start() {
    if (this.animationId) return;
    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
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

    ctx.clearRect(0, 0, w, h);

    const horizonY = h * 0.52;
    const vpX = w * 0.5;
    const vpY = horizonY;

    // 1. Deep Void Sky with radial sunset glow
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#060713');
    skyGrad.addColorStop(0.65, '#160927');
    skyGrad.addColorStop(1, '#3b0a3f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY);

    // 2. Neon Retro Synthwave Sun
    const sunRadius = Math.min(w, h) * 0.22;
    const sunY = horizonY - sunRadius * 0.25;

    ctx.save();
    // Sun outer aura
    const sunGlow = ctx.createRadialGradient(vpX, sunY, sunRadius * 0.2, vpX, sunY, sunRadius * 1.6);
    sunGlow.addColorStop(0, 'rgba(255, 0, 110, 0.45)');
    sunGlow.addColorStop(0.5, 'rgba(255, 170, 0, 0.2)');
    sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(vpX, sunY, sunRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Sun gradient (yellow top -> hot pink bottom)
    const sunGrad = ctx.createLinearGradient(vpX, sunY - sunRadius, vpX, sunY + sunRadius);
    sunGrad.addColorStop(0, '#ffea00');
    sunGrad.addColorStop(0.4, '#ff0077');
    sunGrad.addColorStop(1, '#7700a6');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(vpX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Sun horizontal blinds cutouts (80s style)
    ctx.fillStyle = '#160927';
    const numBlinds = 7;
    for (let i = 0; i < numBlinds; i++) {
      const blindY = sunY + (i / numBlinds) * sunRadius;
      const blindHeight = (i + 1) * 2.2;
      ctx.fillRect(vpX - sunRadius - 10, blindY, (sunRadius + 10) * 2, blindHeight);
    }
    ctx.restore();

    // 3. Neon Wireframe Mountain Silhouette in background
    ctx.save();
    ctx.strokeStyle = '#ff0080';
    ctx.shadowColor = '#ff0080';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);

    const mountainPoints = [
      [0, horizonY],
      [w * 0.12, horizonY - h * 0.08],
      [w * 0.25, horizonY - h * 0.03],
      [w * 0.38, horizonY - h * 0.14],
      [w * 0.50, horizonY - h * 0.06],
      [w * 0.62, horizonY - h * 0.18],
      [w * 0.76, horizonY - h * 0.05],
      [w * 0.88, horizonY - h * 0.12],
      [w, horizonY]
    ];
    for (let i = 1; i < mountainPoints.length; i++) {
      ctx.lineTo(mountainPoints[i][0], mountainPoints[i][1]);
    }
    ctx.lineTo(w, horizonY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 8, 30, 0.85)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Ground Perspective 3D Grid
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    groundGrad.addColorStop(0, '#0c071d');
    groundGrad.addColorStop(0.5, '#070b1e');
    groundGrad.addColorStop(1, '#03040b');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Grid animation movement
    const baseSpeed = this.speed + this.audioEnergy * 3.5;
    this.offsetZ = (this.offsetZ + baseSpeed) % 40;

    // Vanishing perspective vertical lines
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.2;

    const numPerspLines = 26;
    const spread = w * 2.4;
    for (let i = -numPerspLines; i <= numPerspLines; i++) {
      const bottomX = vpX + (i / numPerspLines) * spread;
      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }

    // Horizontal grid lines with non-linear exponential perspective
    const numHorizLines = 18;
    for (let i = 1; i <= numHorizLines; i++) {
      const z = i * 40 - this.offsetZ;
      if (z <= 10) continue;

      // Perspective projection
      const k = Math.pow(i / numHorizLines, 2.4);
      const lineY = horizonY + k * (h - horizonY);

      // Audio-reactive bounce
      const waveOffset = Math.sin(i * 0.4 + Date.now() * 0.003) * (this.audioEnergy * 8);
      const finalY = lineY + waveOffset;

      const alpha = Math.min(1.0, (i / numHorizLines) * 1.3);
      ctx.strokeStyle = `rgba(255, 0, 110, ${alpha * 0.75})`;
      ctx.shadowColor = '#ff006e';
      ctx.shadowBlur = 6 * alpha;
      ctx.lineWidth = 1 + alpha * 1.2;

      ctx.beginPath();
      ctx.moveTo(0, finalY);
      ctx.lineTo(w, finalY);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Glowing Horizon Laser Line
    ctx.save();
    ctx.strokeStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.stroke();
    ctx.restore();
  }
}
