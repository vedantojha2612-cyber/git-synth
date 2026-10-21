/**
 * 4-Channel Hardware Equalizer & Mixer Console.
 * Volume Faders, Pan Knobs, Mute/Solo logic, and 12-Segment LED VU Meters.
 */

export class MixerComponent {
  constructor(synthEngine) {
    this.synth = synthEngine;
    this.container = document.getElementById('mixer-channels');
    this.channelsConfig = [
      { id: 'percussion', name: 'RHYTHM / DRUMS', color: '#00f3ff', tag: 'CH-01', desc: '808 Kick / Snare / Hats' },
      { id: 'bass', name: 'SUB BASS', color: '#ff0055', tag: 'CH-02', desc: 'Saw/Triangle Sub Low-Pass' },
      { id: 'lead', name: 'LEAD ARP', color: '#ffaa00', tag: 'CH-03', desc: 'Hex Pulse Chiptune Delay' },
      { id: 'pad', name: 'AMBIENT PAD', color: '#b026ff', tag: 'CH-04', desc: 'Polyphonic Drone Reverb' }
    ];

    this.meterElements = {};
    this.render();
    this.startMeterLoop();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    this.channelsConfig.forEach((cfg) => {
      const channelEl = document.createElement('div');
      channelEl.className = 'channel-strip';
      channelEl.id = `channel-${cfg.id}`;
      channelEl.style.setProperty('--channel-color', cfg.color);

      channelEl.innerHTML = `
        <div class="channel-header">
          <span class="channel-tag">${cfg.tag}</span>
          <span class="channel-signal-led" id="signal-${cfg.id}"></span>
        </div>
        <div class="channel-title">${cfg.name}</div>
        <div class="channel-desc">${cfg.desc}</div>

        <div class="channel-body">
          <!-- 12 Segment LED VU Meter -->
          <div class="vu-meter" id="vu-${cfg.id}">
            ${Array.from({ length: 12 }).map((_, i) => {
              const segIdx = 12 - i;
              const type = segIdx >= 11 ? 'peak' : (segIdx >= 8 ? 'mid' : 'low');
              return `<div class="vu-segment ${type}" data-idx="${segIdx}"></div>`;
            }).join('')}
          </div>

          <!-- Vertical Volume Fader -->
          <div class="fader-container">
            <input type="range" class="volume-fader" id="vol-${cfg.id}" min="0" max="1.4" step="0.01" value="0.8" orient="vertical">
            <div class="fader-scale">
              <span>+6</span>
              <span>0</span>
              <span>-6</span>
              <span>-12</span>
              <span>-∞</span>
            </div>
          </div>
        </div>

        <div class="channel-controls">
          <!-- Pan Slider -->
          <div class="pan-control">
            <label>PAN</label>
            <input type="range" class="pan-slider" id="pan-${cfg.id}" min="-1" max="1" step="0.05" value="0">
          </div>

          <!-- Mute / Solo Buttons -->
          <div class="mute-solo-group">
            <button class="btn-mute" id="mute-${cfg.id}">M</button>
            <button class="btn-solo" id="solo-${cfg.id}">S</button>
          </div>
        </div>
      `;

      this.container.appendChild(channelEl);

      // Bind events
      const volSlider = channelEl.querySelector(`#vol-${cfg.id}`);
      volSlider.addEventListener('input', (e) => {
        this.synth.setTrackVolume(cfg.id, parseFloat(e.target.value));
      });

      const panSlider = channelEl.querySelector(`#pan-${cfg.id}`);
      panSlider.addEventListener('input', (e) => {
        this.synth.setTrackPan(cfg.id, parseFloat(e.target.value));
      });

      const muteBtn = channelEl.querySelector(`#mute-${cfg.id}`);
      muteBtn.addEventListener('click', () => {
        const isMuted = !muteBtn.classList.contains('active');
        muteBtn.classList.toggle('active', isMuted);
        this.synth.setTrackMute(cfg.id, isMuted);
      });

      const soloBtn = channelEl.querySelector(`#solo-${cfg.id}`);
      soloBtn.addEventListener('click', () => {
        const isSolo = !soloBtn.classList.contains('active');
        soloBtn.classList.toggle('active', isSolo);
        this.synth.setTrackSolo(cfg.id, isSolo);
      });

      // Cache meter elements
      this.meterElements[cfg.id] = {
        segments: Array.from(channelEl.querySelectorAll('.vu-segment')),
        signalLed: channelEl.querySelector(`#signal-${cfg.id}`)
      };
    });
  }

  flashSignal(trackId) {
    const el = this.meterElements[trackId]?.signalLed;
    if (el) {
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 80);
    }
  }

  startMeterLoop() {
    const update = () => {
      for (const cfg of this.channelsConfig) {
        const level = this.synth.getChannelLevel(cfg.id);
        const meterData = this.meterElements[cfg.id];
        if (!meterData) continue;

        const activeSegments = Math.round(level * 12);
        meterData.segments.forEach((seg) => {
          const idx = parseInt(seg.getAttribute('data-idx'), 10);
          seg.classList.toggle('active', idx <= activeSegments);
        });
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
}
