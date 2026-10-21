/**
 * API Client for Git Synth.
 * Auto-detects live backend server (probes ports 8000, 8001, 8002, 8005)
 * and seamlessly provides fallback mock data if server is offline.
 */
import { generateMockSequence } from './mock-data.js';

class GitSynthApiClient {
  constructor() {
    this.baseUrl = '';
    this.isLive = false;
    this.activePort = null;
    this.probeDone = false;
  }

  async probeBackend() {
    if (this.probeDone && this.isLive) return this.baseUrl;

    // Check candidate endpoints
    const portsToTry = [8000, 8001, 8002, 8005, null]; // null means relative /api
    for (const port of portsToTry) {
      const url = port ? `http://127.0.0.1:${port}/api/health` : `/api/health`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.service === 'git-synth') {
            this.baseUrl = port ? `http://127.0.0.1:${port}` : '';
            this.isLive = true;
            this.activePort = port || 'proxy';
            this.probeDone = true;
            console.log(`[GitSynth API] Connected to live engine at ${this.baseUrl || 'relative origin'}`);
            return this.baseUrl;
          }
        }
      } catch (e) {
        // Continue probing next port
      }
    }

    this.probeDone = true;
    this.isLive = false;
    console.log('[GitSynth API] Live backend offline. Operating in High-Fidelity Standalone Simulator mode.');
    return null;
  }

  async fetchSequence(scale = 'synthwave_minor', limit = 30) {
    await this.probeBackend();

    if (this.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/api/sequence?scale=${scale}&limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          data.is_fallback = false;
          return data;
        }
      } catch (err) {
        console.warn('[GitSynth API] Error fetching sequence from live backend, falling back:', err);
      }
    }

    return generateMockSequence(scale, limit);
  }

  async fetchAuthors() {
    await this.probeBackend();
    if (this.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/api/authors`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        // fallback
      }
    }
    const mock = generateMockSequence();
    return { total_authors: Object.keys(mock.authors).length, authors: mock.authors };
  }

  async fetchStats() {
    await this.probeBackend();
    if (this.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/api/stats`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        // fallback
      }
    }
    const mock = generateMockSequence();
    return {
      repo_stats: mock.repo_stats,
      churn_spikes: [],
      audio_parameters: {
        tempo_bpm: mock.metadata.bpm,
        time_signature: "4/4",
        base_scale: "A Minor Pentatonic"
      }
    };
  }
}

export const apiClient = new GitSynthApiClient();
