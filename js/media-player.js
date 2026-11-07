/**
 * ShareX Media Players — Cinematic Video Player & Animated Music Player
 */

class MediaPlayerManager {
  constructor() {
    this.videoModal = null;
    this.videoElement = null;
    this.videoControls = null;
    this.videoTimeout = null;

    this.audioModal = null;
    this.miniPlayer = null;
    this.audioElement = new Audio();
    this.currentTrack = null;
    this.audioPlaylist = [];
    this.audioIndex = 0;

    this.audioCtx = null;
    this.analyser = null;
    this.waveformAnimationId = null;

    this._initDomListeners();
  }

  _initDomListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.videoModal = document.getElementById('video-player-modal');
      this.videoElement = document.getElementById('main-video-element');
      this.videoControls = document.getElementById('video-controls-overlay');

      this.audioModal = document.getElementById('music-player-modal');
      this.miniPlayer = document.getElementById('mini-music-player');

      this._bindVideoEvents();
      this._bindAudioEvents();
    });
  }

  /* ------------------------------------------------------------------------
     1. CINEMATIC VIDEO PLAYER
     ------------------------------------------------------------------------ */
  openVideo(url, title = 'Video Playback', isStreaming = false) {
    if (!this.videoElement) return;

    this.videoElement.src = url;
    const titleElem = document.getElementById('video-player-title');
    if (titleElem) titleElem.textContent = title;

    const streamBadge = document.getElementById('video-streaming-badge');
    if (streamBadge) streamBadge.style.display = isStreaming ? 'inline-flex' : 'none';

    this.videoModal.classList.add('open');

    // Cinematic Intro Flash Effect
    const flash = document.createElement('div');
    flash.className = 'video-intro-flash';
    this.videoElement.parentElement.appendChild(flash);
    setTimeout(() => flash.remove(), 800);

    this.videoElement.play().catch(() => {});
    this._resetControlsTimer();
  }

  _bindVideoEvents() {
    if (!this.videoElement) return;

    const playBtn = document.getElementById('video-play-btn');
    const playIcon = document.getElementById('video-play-icon');
    const scrubTrack = document.getElementById('video-scrub-container');
    const playedFill = document.getElementById('video-played-fill');
    const bufferFill = document.getElementById('video-buffer-fill');
    const timeDisplay = document.getElementById('video-time-display');
    const volSlider = document.getElementById('video-vol-slider');
    const pipBtn = document.getElementById('video-pip-btn');
    const fsBtn = document.getElementById('video-fs-btn');
    const speedSelect = document.getElementById('video-speed-select');
    const closeBtn = document.getElementById('video-close-btn');

    // Play/Pause toggle
    const togglePlay = () => {
      if (this.videoElement.paused) {
        this.videoElement.play();
      } else {
        this.videoElement.pause();
      }
      this._resetControlsTimer();
    };

    if (playBtn) playBtn.addEventListener('click', togglePlay);
    this.videoElement.addEventListener('click', togglePlay);

    this.videoElement.addEventListener('play', () => {
      if (playIcon) playIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    });

    this.videoElement.addEventListener('pause', () => {
      if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    });

    // Time update & Scrubbing
    this.videoElement.addEventListener('timeupdate', () => {
      const cur = this.videoElement.currentTime;
      const dur = this.videoElement.duration || 1;
      const pct = (cur / dur) * 100;
      if (playedFill) playedFill.style.width = `${pct}%`;

      if (timeDisplay) {
        timeDisplay.textContent = `${this._formatDuration(cur)} / ${this._formatDuration(dur)}`;
      }

      // Buffer fill
      if (this.videoElement.buffered.length > 0 && bufferFill) {
        const bufferedEnd = this.videoElement.buffered.end(this.videoElement.buffered.length - 1);
        bufferFill.style.width = `${(bufferedEnd / dur) * 100}%`;
      }
    });

    if (scrubTrack) {
      scrubTrack.addEventListener('click', (e) => {
        const rect = scrubTrack.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.videoElement.currentTime = pos * (this.videoElement.duration || 0);
        this._resetControlsTimer();
      });
    }

    // Volume
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        this.videoElement.volume = parseFloat(e.target.value);
      });
    }

    // PiP
    if (pipBtn) {
      pipBtn.addEventListener('click', async () => {
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else if (this.videoElement.requestPictureInPicture) {
            await this.videoElement.requestPictureInPicture();
          }
        } catch (e) {}
      });
    }

    // Fullscreen
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const container = this.videoElement.closest('.video-player-container');
        if (!document.fullscreenElement) {
          container.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Speed
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.videoElement.playbackRate = parseFloat(e.target.value);
      });
    }

    // Auto-fade controls after 3 seconds
    const showControls = () => {
      if (this.videoControls) this.videoControls.classList.remove('hidden');
      this._resetControlsTimer();
    };

    this.videoElement.parentElement.addEventListener('mousemove', showControls);
    this.videoElement.parentElement.addEventListener('touchstart', showControls);

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.videoElement.pause();
        this.videoModal.classList.remove('open');
      });
    }
  }

  _resetControlsTimer() {
    if (this.videoTimeout) clearTimeout(this.videoTimeout);
    this.videoTimeout = setTimeout(() => {
      if (this.videoElement && !this.videoElement.paused && this.videoControls) {
        this.videoControls.classList.add('hidden');
      }
    }, 3000);
  }

  /* ------------------------------------------------------------------------
     2. MUSIC PLAYER & VISUALIZER
     ------------------------------------------------------------------------ */
  openAudio(url, title = 'Audio Track', artist = 'ShareX Peer') {
    this.currentTrack = { url, title, artist };
    this.audioElement.src = url;

    const titleEl = document.getElementById('music-title');
    const artistEl = document.getElementById('music-artist');
    const miniTitle = document.getElementById('mini-music-title');

    if (titleEl) titleEl.textContent = title;
    if (artistEl) artistEl.textContent = artist;
    if (miniTitle) miniTitle.textContent = title;

    if (this.audioModal) this.audioModal.classList.add('open');
    if (this.miniPlayer) this.miniPlayer.style.display = 'flex';

    this.audioElement.play().catch(() => {});
    this._startWaveformSimulation();
  }

  _bindAudioEvents() {
    const playBtn = document.getElementById('music-play-btn');
    const playIcon = document.getElementById('music-play-icon');
    const miniPlayBtn = document.getElementById('mini-play-btn');
    const miniPlayIcon = document.getElementById('mini-play-icon');
    const disc = document.getElementById('vinyl-disc');
    const scrubTrack = document.getElementById('audio-scrub-track');
    const progressFill = document.getElementById('audio-progress-fill');
    const timeDisplay = document.getElementById('audio-time-display');
    const closeBtn = document.getElementById('music-close-btn');

    const togglePlay = () => {
      if (this.audioElement.paused) {
        this.audioElement.play();
      } else {
        this.audioElement.pause();
      }
    };

    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (miniPlayBtn) miniPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });

    this.audioElement.addEventListener('play', () => {
      if (disc) disc.classList.add('playing');
      const pauseSvg = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
      if (playIcon) playIcon.innerHTML = pauseSvg;
      if (miniPlayIcon) miniPlayIcon.innerHTML = pauseSvg;
    });

    this.audioElement.addEventListener('pause', () => {
      if (disc) disc.classList.remove('playing');
      const playSvg = `<path d="M8 5v14l11-7z"/>`;
      if (playIcon) playIcon.innerHTML = playSvg;
      if (miniPlayIcon) miniPlayIcon.innerHTML = playSvg;
    });

    this.audioElement.addEventListener('timeupdate', () => {
      const cur = this.audioElement.currentTime;
      const dur = this.audioElement.duration || 1;
      const pct = (cur / dur) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (timeDisplay) {
        timeDisplay.textContent = `${this._formatDuration(cur)} / ${this._formatDuration(dur)}`;
      }
    });

    if (scrubTrack) {
      scrubTrack.addEventListener('click', (e) => {
        const rect = scrubTrack.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.audioElement.currentTime = pos * (this.audioElement.duration || 0);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.audioModal.classList.remove('open');
        // Keep mini player floating
        if (this.miniPlayer) this.miniPlayer.style.display = 'flex';
      });
    }

    if (this.miniPlayer) {
      this.miniPlayer.addEventListener('click', () => {
        if (this.audioModal) this.audioModal.classList.add('open');
      });
    }
  }

  _startWaveformSimulation() {
    const bars = document.querySelectorAll('.waveform-container .wave-bar');
    if (!bars.length) return;

    bars.forEach((bar, i) => {
      bar.className = `wave-bar simulated-${(i % 4) + 1}`;
    });
  }

  _formatDuration(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

window.mediaPlayerManager = new MediaPlayerManager();
