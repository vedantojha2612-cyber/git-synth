/**
 * Master Transport, Controls & Timeline Scrubber Component.
 */

export class TransportComponent {
  constructor(synthEngine, onScaleChange, onReload) {
    this.synth = synthEngine;
    this.onScaleChange = onScaleChange;
    this.onReload = onReload;
    this.isDragging = false;

    this.playBtn = document.getElementById('btn-play');
    this.stopBtn = document.getElementById('btn-stop');
    this.loopBtn = document.getElementById('btn-loop');
    this.rewindBtn = document.getElementById('btn-rewind');
    this.bpmSlider = document.getElementById('bpm-slider');
    this.bpmVal = document.getElementById('bpm-val');
    this.scaleSelect = document.getElementById('scale-select');
    this.timeDisplay = document.getElementById('display-time');
    this.barDisplay = document.getElementById('display-bar');
    this.beatDisplay = document.getElementById('display-beat');
    this.timelineContainer = document.getElementById('timeline-container');
    this.playhead = document.getElementById('timeline-playhead');
    this.commitMarkers = document.getElementById('timeline-markers');
    this.masterVol = document.getElementById('master-volume');

    this.initEvents();
  }

  initEvents() {
    this.playBtn.addEventListener('click', () => {
      if (this.synth.isPlaying) {
        this.synth.pause();
      } else {
        this.synth.play();
      }
    });

    this.stopBtn.addEventListener('click', () => {
      this.synth.stop();
      this.updatePlayState(false);
    });

    this.rewindBtn.addEventListener('click', () => {
      this.synth.seek(0);
    });

    this.loopBtn.addEventListener('click', () => {
      this.synth.isLooping = !this.synth.isLooping;
      this.loopBtn.classList.toggle('active', this.synth.isLooping);
    });

    this.bpmSlider.addEventListener('input', (e) => {
      const bpm = parseFloat(e.target.value);
      this.bpmVal.textContent = bpm.toFixed(0);
      this.synth.bpm = bpm;
    });

    this.scaleSelect.addEventListener('change', (e) => {
      if (this.onScaleChange) {
        this.onScaleChange(e.target.value);
      }
    });

    if (this.masterVol) {
      this.masterVol.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.synth.setMasterVolume(val);
      });
    }

    // Timeline Scrubbing Interaction
    const handleSeek = (e) => {
      const rect = this.timelineContainer.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const fraction = clickX / rect.width;
      const targetTime = fraction * this.synth.getDuration();
      this.synth.seek(targetTime);
    };

    this.timelineContainer.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      handleSeek(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        handleSeek(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }

  updatePlayState(isPlaying) {
    if (isPlaying) {
      this.playBtn.innerHTML = '<span class="icon">❚❚</span> PAUSE';
      this.playBtn.classList.add('playing');
    } else {
      this.playBtn.innerHTML = '<span class="icon">▶</span> PLAY';
      this.playBtn.classList.remove('playing');
    }
  }

  renderTimelineMarkers(sequenceData) {
    if (!this.commitMarkers || !sequenceData?.commits) return;
    this.commitMarkers.innerHTML = '';
    const commits = sequenceData.commits;
    const dur = sequenceData.metadata?.duration_seconds || 48.0;

    commits.forEach((c, idx) => {
      const fraction = (idx / commits.length);
      const marker = document.createElement('div');
      marker.className = `timeline-marker ${c.is_merge ? 'marker-merge' : ''} ${c.tags?.length ? 'marker-tag' : ''}`;
      marker.style.left = `${fraction * 100}%`;
      marker.title = `${c.short_hash}: ${c.message} (+${c.insertions}/-${c.deletions})`;

      // Milestone chip
      if (c.tags?.length) {
        const tagChip = document.createElement('span');
        tagChip.className = 'marker-tag-label';
        tagChip.textContent = c.tags[0];
        marker.appendChild(tagChip);
      }

      this.commitMarkers.appendChild(marker);
    });
  }

  updateProgress(currentTime, duration, bar, beat) {
    const fraction = duration > 0 ? (currentTime / duration) : 0;
    if (this.playhead) {
      this.playhead.style.left = `${Math.min(100, fraction * 100)}%`;
    }

    // Format digital displays
    const mins = Math.floor(currentTime / 60).toString().padStart(2, '0');
    const secs = (currentTime % 60).toFixed(1).padStart(4, '0');
    if (this.timeDisplay) this.timeDisplay.textContent = `${mins}:${secs}`;
    if (this.barDisplay) this.barDisplay.textContent = bar.toString().padStart(2, '0');
    if (this.beatDisplay) this.beatDisplay.textContent = beat.toFixed(1);
  }
}
