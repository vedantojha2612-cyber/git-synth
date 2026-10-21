/**
 * Contributor Telemetry & Synthesizer Matrix Modal.
 */

export class ModalComponent {
  constructor(apiClient) {
    this.api = apiClient;
    this.modal = document.getElementById('telemetry-modal');
    this.openBtn = document.getElementById('btn-open-telemetry');
    this.closeBtn = document.getElementById('btn-close-modal');
    this.tableBody = document.getElementById('authors-table-body');
    this.statsSummary = document.getElementById('modal-stats-summary');

    this.initEvents();
  }

  initEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
  }

  async open() {
    if (!this.modal) return;
    this.modal.classList.add('open');
    const data = await this.api.fetchAuthors();
    const statsData = await this.api.fetchStats();

    if (this.statsSummary && statsData?.repo_stats) {
      const s = statsData.repo_stats;
      this.statsSummary.innerHTML = `
        <div class="stat-pill"><span class="lbl">TOTAL COMMITS:</span> <span class="val">${s.total_commits || 0}</span></div>
        <div class="stat-pill"><span class="lbl">AUTHORS:</span> <span class="val">${s.total_authors || 0}</span></div>
        <div class="stat-pill"><span class="lbl">INSERTIONS:</span> <span class="val text-green">+${s.total_insertions || 0}</span></div>
        <div class="stat-pill"><span class="lbl">DELETIONS:</span> <span class="val text-red">-${s.total_deletions || 0}</span></div>
        <div class="stat-pill"><span class="lbl">TEMPO:</span> <span class="val text-cyan">${statsData.audio_parameters?.tempo_bpm || 118} BPM</span></div>
      `;
    }

    if (this.tableBody && data?.authors) {
      this.tableBody.innerHTML = '';
      const authors = Object.values(data.authors);
      authors.forEach(a => {
        const tr = document.createElement('tr');
        const sig = a.sound_signature || {};
        tr.innerHTML = `
          <td class="author-name"><strong>${a.name}</strong><br><small class="text-dim">${a.email || ''}</small></td>
          <td>${a.commit_count || 0}</td>
          <td><span class="text-green">+${a.total_insertions || 0}</span> / <span class="text-red">-${a.total_deletions || 0}</span></td>
          <td><span class="badge-timbre">${sig.waveform || 'saw'}</span></td>
          <td>${sig.filter_cutoff || 1800} Hz</td>
          <td>${sig.reverb_mix !== undefined ? Math.round(sig.reverb_mix * 100) : 30}%</td>
        `;
        this.tableBody.appendChild(tr);
      });
    }
  }

  close() {
    if (this.modal) this.modal.classList.remove('open');
  }
}
