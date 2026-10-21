/**
 * Commit Telemetry & Sound Signature Inspector Component.
 */

export class InspectorComponent {
  constructor() {
    this.hashEl = document.getElementById('commit-hash');
    this.authorEl = document.getElementById('commit-author');
    this.messageEl = document.getElementById('commit-message');
    this.insEl = document.getElementById('commit-ins');
    this.delEl = document.getElementById('commit-del');
    this.churnBarIns = document.getElementById('churn-bar-ins');
    this.churnBarDel = document.getElementById('churn-bar-del');
    this.soundSigWave = document.getElementById('sig-wave');
    this.soundSigCutoff = document.getElementById('sig-cutoff');
    this.soundSigReverb = document.getElementById('sig-reverb');
    this.tagBadge = document.getElementById('commit-tag-badge');
    this.copyHashBtn = document.getElementById('btn-copy-hash');

    this.currentHash = '';
    this.initEvents();
  }

  initEvents() {
    if (this.copyHashBtn) {
      this.copyHashBtn.addEventListener('click', () => {
        if (this.currentHash) {
          navigator.clipboard?.writeText(this.currentHash);
          const orig = this.copyHashBtn.textContent;
          this.copyHashBtn.textContent = 'COPIED!';
          setTimeout(() => { this.copyHashBtn.textContent = orig; }, 1200);
        }
      });
    }
  }

  updateCommit(commit) {
    if (!commit) return;
    this.currentHash = commit.hash || commit.short_hash;

    if (this.hashEl) this.hashEl.textContent = commit.short_hash || commit.hash?.slice(0, 7) || '---';
    if (this.authorEl) this.authorEl.textContent = commit.author_name || commit.author || 'Unknown';
    if (this.messageEl) this.messageEl.textContent = commit.message || 'No commit message';

    const ins = commit.insertions || 0;
    const del = commit.deletions || 0;
    const total = Math.max(1, ins + del);

    if (this.insEl) this.insEl.textContent = `+${ins}`;
    if (this.delEl) this.delEl.textContent = `-${del}`;

    if (this.churnBarIns) this.churnBarIns.style.width = `${(ins / total) * 100}%`;
    if (this.churnBarDel) this.churnBarDel.style.width = `${(del / total) * 100}%`;

    // Tags & Milestone badge
    if (this.tagBadge) {
      if (commit.tags?.length) {
        this.tagBadge.style.display = 'inline-block';
        this.tagBadge.textContent = commit.tags[0];
        this.tagBadge.className = 'badge-tag';
      } else if (commit.is_merge) {
        this.tagBadge.style.display = 'inline-block';
        this.tagBadge.textContent = 'MERGE COMMIT';
        this.tagBadge.className = 'badge-merge';
      } else {
        this.tagBadge.style.display = 'none';
      }
    }

    // Procedural sound signature
    const sig = commit.sound_signature || {};
    if (this.soundSigWave) this.soundSigWave.textContent = sig.waveform || 'sawtooth';
    if (this.soundSigCutoff) this.soundSigCutoff.textContent = sig.filter_cutoff ? `${sig.filter_cutoff}Hz` : '2100Hz';
    if (this.soundSigReverb) this.soundSigReverb.textContent = sig.reverb_mix !== undefined ? `${Math.round(sig.reverb_mix * 100)}%` : '35%';
  }
}
