/**
 * ShareX Application Coordinator & UI Controller
 * Orchestrates cinematic splash, ambient canvas particles, drag-and-drop, UI queues & statistics
 */

class ShareXApp {
  constructor() {
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    this.density = 40;
    this.isConnectingAnimation = false;
    this.deferredInstallPrompt = null;
  }

  init() {
    // 1. Run Cinematic Splash Screen Sequence
    this._runCinematicSplash();

    // 2. Initialize Ambient Canvas Particles
    this._initAmbientCanvas();

    // 3. Initialize Desktop Cursor Glow
    this._initCursorGlow();

    // 4. Initialize Drag & Drop Anywhere
    this._initGlobalDragAndDrop();

    // 5. Bind Action Buttons & Forms
    this._bindUserActions();

    // 6. Bind Transfer Engine Listeners
    this._bindTransferListeners();

    // 7. Render Dashboard Stats
    this.renderStats();

    // 8. PWA Install Prompt Listener
    this._bindPWAInstall();

    // 9. Apply initial theme and performance settings
    if (window.settingsManager) {
      window.settingsManager.apply();
      this._populateSettingsForm();
    }
  }

  /* ------------------------------------------------------------------------
     1. CINEMATIC INTRODUCTION (STRICT NO SKIP BUTTON SEQUENCE)
     ------------------------------------------------------------------------ */
  _runCinematicSplash() {
    const splash = document.getElementById('cinematic-splash');
    if (!splash) return;

    // Sequence timing: 3.4 seconds total for cinematic reveal, expansion, and smooth fade
    setTimeout(() => {
      splash.classList.add('splash-exit');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 1200);
    }, 3400);
  }

  /* ------------------------------------------------------------------------
     2. AMBIENT CANVAS PARTICLE ENGINE
     ------------------------------------------------------------------------ */
  _initAmbientCanvas() {
    this.canvas = document.getElementById('ambient-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this._createParticles();
    };

    window.addEventListener('resize', resize);
    resize();
    this._animateParticles();

    window.ambientCanvas = {
      setDensity: (mode) => {
        if (mode === 'off') this.density = 0;
        else if (mode === 'low') this.density = 20;
        else if (mode === 'high') this.density = 80;
        else this.density = 45;
        this._createParticles();
      },
      setMode: (perf) => {
        if (perf === 'battery-saver') {
          if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
          this._animateParticles();
        }
      }
    };
  }

  _createParticles() {
    this.particles = [];
    for (let i = 0; i < this.density; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 'rgba(56, 189, 248, ' : 'rgba(168, 85, 247, ',
        alpha: Math.random() * 0.5 + 0.1
      });
    }
  }

  _animateParticles() {
    if (document.hidden) {
      setTimeout(() => this._animateParticles(), 500);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `${p.color}${p.alpha})`;
      this.ctx.fill();
    }

    // Connect close particles with subtle glass lines
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * (1 - dist / 100)})`;
          this.ctx.stroke();
        }
      }
    }

    this.animationFrame = requestAnimationFrame(() => this._animateParticles());
  }

  /* ------------------------------------------------------------------------
     3. DESKTOP CURSOR GLOW
     ------------------------------------------------------------------------ */
  _initCursorGlow() {
    const glow = document.getElementById('cursor-ambient-glow');
    if (!glow) return;

    window.addEventListener('mousemove', (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
      glow.style.opacity = '1';

      // Update CSS variables for magnetic card radial hover
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    window.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    });
  }

  /* ------------------------------------------------------------------------
     4. GLOBAL DRAG AND DROP
     ------------------------------------------------------------------------ */
  _initGlobalDragAndDrop() {
    const overlay = document.getElementById('global-drag-overlay');
    if (!overlay) return;

    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      overlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        overlay.classList.remove('active');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('active');

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        window.navigationManager.navigateTo('send');
        window.transferEngine.addFilesToSend(e.dataTransfer.files);
      }
    });
  }

  /* ------------------------------------------------------------------------
     5. BIND USER ACTIONS (Buttons, Inputs, Modals)
     ------------------------------------------------------------------------ */
  _bindUserActions() {
    // File Input Pickers (Send Page)
    const fileInput = document.getElementById('send-file-input');
    const folderInput = document.getElementById('send-folder-input');
    const addFilesBtn = document.getElementById('add-files-btn');
    const addFolderBtn = document.getElementById('add-folder-btn');
    const sendDropzone = document.getElementById('send-file-dropzone');

    if (addFilesBtn && fileInput) addFilesBtn.addEventListener('click', () => fileInput.click());
    if (addFolderBtn && folderInput) addFolderBtn.addEventListener('click', () => folderInput.click());

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          window.transferEngine.addFilesToSend(e.target.files);
          fileInput.value = '';
        }
      });
    }

    if (folderInput) {
      folderInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          window.transferEngine.addFilesToSend(e.target.files);
          folderInput.value = '';
        }
      });
    }

    if (sendDropzone) {
      sendDropzone.addEventListener('click', () => fileInput.click());
    }

    // Manual Pairing Code Connect (Send Page)
    const manualInput = document.getElementById('manual-pairing-input');
    const manualBtn = document.getElementById('manual-pair-submit-btn');

    if (manualBtn && manualInput) {
      manualBtn.addEventListener('click', () => {
        const code = manualInput.value.trim().toUpperCase();
        if (!code) {
          alert('Please enter a valid pairing code (e.g., K7M-PQ29-XR)');
          return;
        }
        manualBtn.disabled = true;
        manualBtn.textContent = 'Connecting...';
        window.webrtcManager.connectToPeer(code);

        // Show connection animation card
        const connCard = document.getElementById('active-connection-card');
        if (connCard) connCard.style.display = 'block';

        setTimeout(() => {
          manualBtn.disabled = false;
          manualBtn.textContent = 'Connect to Peer';
        }, 4000);
      });
    }

    // Receiver Controls (Copy, Share, Regenerate)
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const shareCodeBtn = document.getElementById('share-code-btn');
    const regenCodeBtn = document.getElementById('regen-code-btn');

    if (copyCodeBtn) copyCodeBtn.addEventListener('click', () => window.pairingManager.copyCode());
    if (shareCodeBtn) shareCodeBtn.addEventListener('click', () => window.pairingManager.shareCode());
    if (regenCodeBtn) regenCodeBtn.addEventListener('click', () => window.pairingManager.renderReceiveQR());

    // Sender Transfer Start Button
    const startTransferBtn = document.getElementById('start-transfer-btn');
    if (startTransferBtn) {
      startTransferBtn.addEventListener('click', () => {
        window.transferEngine.startSending();
      });
    }

    // Pause/Resume/Cancel sender actions
    const pauseBtn = document.getElementById('transfer-pause-btn');
    const cancelBtn = document.getElementById('transfer-cancel-btn');

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (window.transferEngine.isPaused) {
          window.transferEngine.resumeActiveSend();
          pauseBtn.textContent = 'Pause';
        } else {
          window.transferEngine.pauseActiveSend();
          pauseBtn.textContent = 'Resume';
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Cancel current file transfer?')) {
          window.transferEngine.cancelActiveSend();
        }
      });
    }

    // Storage Architecture Info Modal
    const infoBtn = document.getElementById('storage-info-btn');
    const infoModal = document.getElementById('storage-info-modal');
    const infoClose = document.getElementById('storage-info-close-btn');

    if (infoBtn && infoModal) infoBtn.addEventListener('click', () => infoModal.classList.add('open'));
    if (infoClose && infoModal) infoClose.addEventListener('click', () => infoModal.classList.remove('open'));

    // Keyboard Shortcuts Modal Close
    const shortcutsClose = document.getElementById('shortcuts-close-btn');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    if (shortcutsClose && shortcutsModal) shortcutsClose.addEventListener('click', () => shortcutsModal.classList.remove('open'));
  }

  /* ------------------------------------------------------------------------
     6. TRANSFER ENGINE & QUEUE UI BINDINGS
     ------------------------------------------------------------------------ */
  _bindTransferListeners() {
    window.transferEngine.onQueueUpdated = (sendQueue, receiveQueue) => {
      this._renderSendQueue(sendQueue);
      this._renderReceiveQueue(receiveQueue);
      this._renderDashboardTransfers(sendQueue, receiveQueue);
    };

    window.transferEngine.onProgressUpdated = (item) => {
      this._updateProgressRow(item);
    };

    window.webrtcManager.onPeerConnected = (deviceName) => {
      if (window.soundEngine) window.soundEngine.playConnect();
      if (window.notifications) {
        window.notifications.show({
          title: 'Peer Connected',
          message: `Direct WebRTC DataChannel established with ${deviceName}`,
          type: 'success'
        });
      }
      // Update Connected Peer Card
      const connInfo = document.getElementById('active-peer-name');
      if (connInfo) connInfo.textContent = deviceName;
      const connCard = document.getElementById('active-connection-card');
      if (connCard) connCard.style.display = 'block';
    };

    window.webrtcManager.onPeerDisconnected = () => {
      const connCard = document.getElementById('active-connection-card');
      if (connCard) connCard.style.display = 'none';
    };
  }

  _renderSendQueue(queue) {
    const list = document.getElementById('send-queue-list');
    const startBtn = document.getElementById('start-transfer-btn');
    const emptyState = document.getElementById('send-queue-empty');

    if (!list) return;

    if (queue.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (startBtn) startBtn.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (startBtn) {
      const hasQueued = queue.some(i => i.status === 'queued');
      startBtn.style.display = hasQueued ? 'inline-flex' : 'none';
    }

    list.innerHTML = queue.map(item => `
      <div class="glass-card transfer-item-row" id="queue-item-${item.id}" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
          <div class="btn-icon" style="background: rgba(56, 189, 248, 0.1); color: var(--accent-blue);">
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this._escape(item.name)}</div>
            <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 10px; margin-top: 2px;">
              <span>${this._formatBytes(item.size)}</span>
              <span id="speed-${item.id}"></span>
              <span id="eta-${item.id}"></span>
            </div>
            <div class="progress-track" style="margin-top: 8px;">
              <div class="progress-fill" id="progress-${item.id}" style="width: ${item.progress}%;"></div>
            </div>
          </div>
        </div>
        <div class="transfer-item-actions" style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
          <span class="badge ${item.status === 'completed' ? 'badge-green' : item.status === 'sending' ? 'badge-blue' : 'badge-violet'}" id="status-badge-${item.id}">
            ${item.status}
          </span>
          ${item.status === 'queued' ? `
            <button class="btn-icon" onclick="window.transferEngine.removeFromSendQueue('${item.id}')" title="Remove">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  _renderReceiveQueue(queue) {
    const list = document.getElementById('receive-queue-list');
    if (!list) return;

    if (queue.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Awaiting incoming transfers from connected peer...</div>`;
      return;
    }

    list.innerHTML = queue.map(item => `
      <div class="glass-card transfer-item-row" id="queue-item-${item.id}" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
          <div class="btn-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--status-success);">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this._escape(item.name)}</div>
            <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 10px; margin-top: 2px;">
              <span>${this._formatBytes(item.size)}</span>
              ${item.verified ? '<span style="color: var(--status-success);">SHA-256 Verified ✓</span>' : ''}
            </div>
            <div class="progress-track" style="margin-top: 8px;">
              <div class="progress-fill" id="progress-${item.id}" style="width: ${item.progress}%;"></div>
            </div>
          </div>
        </div>
        <div class="transfer-item-actions" style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
          ${item.status === 'completed' ? `
            <button class="btn-primary" style="padding: 8px 16px; font-size: 13px;" onclick="window.app.openFileAction('${item.id}')">
              ${this._getActionLabel(item.type)}
            </button>
            <button class="btn-secondary" style="padding: 8px 16px; font-size: 13px;" onclick="window.transferEngine.downloadFile(window.transferEngine.receiveQueue.find(x => x.id === '${item.id}'))">
              Download
            </button>
          ` : `
            <span class="badge badge-blue">${item.status}</span>
          `}
        </div>
      </div>
    `).join('');
  }

  _renderDashboardTransfers(sendQueue, receiveQueue) {
    const dashActive = document.getElementById('dashboard-active-transfers');
    if (!dashActive) return;

    const allActive = [...sendQueue, ...receiveQueue].filter(i => i.status === 'sending' || i.status === 'receiving');
    if (allActive.length === 0) {
      dashActive.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No active transfers</div>`;
      return;
    }

    dashActive.innerHTML = allActive.map(i => `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
          <span style="font-weight: 600;">${this._escape(i.name)}</span>
          <span style="color: var(--accent-blue);">${Math.round(i.progress)}%</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width: ${i.progress}%;"></div></div>
      </div>
    `).join('');
  }

  _updateProgressRow(item) {
    const fill = document.getElementById(`progress-${item.id}`);
    const speedEl = document.getElementById(`speed-${item.id}`);
    const etaEl = document.getElementById(`eta-${item.id}`);

    if (fill) fill.style.width = `${item.progress}%`;
    if (speedEl && item.speed) speedEl.textContent = `${this._formatBytes(item.speed)}/s`;
    if (etaEl && item.eta) etaEl.textContent = `ETA: ${item.eta}s`;
  }

  _getActionLabel(mimeType) {
    if (!mimeType) return 'Download';
    if (mimeType.startsWith('video/')) return 'Watch';
    if (mimeType.startsWith('audio/')) return 'Listen';
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return 'View';
    if (mimeType.startsWith('image/')) return 'View';
    return 'Download';
  }

  openFileAction(id) {
    const item = window.transferEngine.receiveQueue.find(x => x.id === id) ||
                 window.transferEngine.history.find(x => x.id === id);
    if (!item) return;

    const mime = item.type || '';
    if (mime.startsWith('video/')) {
      window.mediaPlayerManager.openVideo(item.blobUrl, item.name);
    } else if (mime.startsWith('audio/')) {
      window.mediaPlayerManager.openAudio(item.blobUrl, item.name);
    } else if (mime === 'application/pdf' || mime.startsWith('text/')) {
      window.documentViewer.openDocument(item);
    } else if (mime.startsWith('image/')) {
      window.imageViewer.openImage(item);
    } else {
      window.transferEngine.downloadFile(item);
    }
  }

  /* ------------------------------------------------------------------------
     7. STATISTICS & HISTORY
     ------------------------------------------------------------------------ */
  renderStats() {
    const stats = JSON.parse(localStorage.getItem('sharex_stats') || '{"sentCount":0,"receiveCount":0,"totalBytes":0}');
    const sentCountEl = document.getElementById('stat-sent-count');
    const recCountEl = document.getElementById('stat-receive-count');
    const totalBytesEl = document.getElementById('stat-total-bytes');

    if (sentCountEl) sentCountEl.textContent = stats.sentCount || 0;
    if (recCountEl) recCountEl.textContent = stats.receiveCount || 0;
    if (totalBytesEl) totalBytesEl.textContent = this._formatBytes(stats.totalBytes || 0);
  }

  /* ------------------------------------------------------------------------
     8. PWA INSTALLATION BANNER
     ------------------------------------------------------------------------ */
  _bindPWAInstall() {
    const installBtn = document.getElementById('pwa-install-btn');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (installBtn) installBtn.style.display = 'inline-flex';
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!this.deferredInstallPrompt) {
          alert('ShareX PWA is ready. Open your browser settings and select "Add to Home Screen" or "Install App".');
          return;
        }
        this.deferredInstallPrompt.prompt();
        const { outcome } = await this.deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          installBtn.style.display = 'none';
        }
        this.deferredInstallPrompt = null;
      });
    }
  }

  /* ------------------------------------------------------------------------
     9. SETTINGS FORM POPULATION
     ------------------------------------------------------------------------ */
  _populateSettingsForm() {
    const settings = window.settingsManager.settings;

    const themeRadios = document.querySelectorAll('input[name="theme-choice"]');
    themeRadios.forEach(radio => {
      radio.checked = (radio.value === settings.theme);
      radio.addEventListener('change', () => {
        window.settingsManager.setTheme(radio.value);
      });
    });

    const perfSelect = document.getElementById('perf-mode-select');
    if (perfSelect) {
      perfSelect.value = settings.performanceMode;
      perfSelect.addEventListener('change', () => {
        window.settingsManager.setPerformanceMode(perfSelect.value);
      });
    }

    const chunkSelect = document.getElementById('chunk-size-select');
    if (chunkSelect) {
      chunkSelect.value = settings.chunkSize;
      chunkSelect.addEventListener('change', () => {
        settings.chunkSize = parseInt(chunkSelect.value, 10);
        window.settingsManager.save();
      });
    }

    const autoAcceptToggle = document.getElementById('auto-accept-toggle');
    if (autoAcceptToggle) {
      autoAcceptToggle.checked = settings.autoAccept;
      autoAcceptToggle.addEventListener('change', () => {
        settings.autoAccept = autoAcceptToggle.checked;
        window.settingsManager.save();
      });
    }

    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.checked = settings.soundEnabled;
      soundToggle.addEventListener('change', () => {
        settings.soundEnabled = soundToggle.checked;
        window.settingsManager.save();
      });
    }

    const stunInput = document.getElementById('stun-server-input');
    const turnInput = document.getElementById('turn-server-input');
    const signalingInput = document.getElementById('signaling-server-input');

    if (stunInput) {
      stunInput.value = settings.customStun;
      stunInput.addEventListener('change', () => {
        settings.customStun = stunInput.value;
        window.settingsManager.save();
      });
    }

    if (turnInput) {
      turnInput.value = settings.customTurn;
      turnInput.addEventListener('change', () => {
        settings.customTurn = turnInput.value;
        window.settingsManager.save();
      });
    }

    if (signalingInput) {
      signalingInput.value = settings.signalingUrl;
      signalingInput.addEventListener('change', () => {
        settings.signalingUrl = signalingInput.value;
        window.settingsManager.save();
      });
    }
  }

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  _escape(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.app = new ShareXApp();
window.renderDashboardStats = () => window.app.renderStats();

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});

// Helper for Camera Scanner Page initialization
window.initScannerPage = async () => {
  const video = document.getElementById('scanner-video');
  const errorMsg = document.getElementById('scanner-error-message');
  if (!video) return;

  if (errorMsg) errorMsg.style.display = 'none';

  await window.qrEngine.startScanner(
    video,
    (scannedText) => {
      // Check if scanned url contains #pair= or is direct pairing code
      let code = scannedText;
      if (code.includes('#pair=')) {
        code = code.split('#pair=')[1];
      }
      code = code.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
      if (window.soundEngine) window.soundEngine.playConnect();

      // Navigate to send page with this pairing code
      window.navigationManager.navigateTo('send');
      const input = document.getElementById('manual-pairing-input');
      if (input) input.value = code;
      const connectBtn = document.getElementById('manual-pair-submit-btn');
      if (connectBtn) connectBtn.click();
    },
    (err) => {
      if (errorMsg) {
        errorMsg.textContent = 'Camera access denied or unavailable. You can enter the pairing code manually below.';
        errorMsg.style.display = 'block';
      }
    }
  );
};

// Helper for History Table Rendering
window.renderHistoryTable = () => {
  const container = document.getElementById('history-table-body');
  if (!container) return;

  const history = window.transferEngine.history;
  if (history.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">No transfer records in history yet</td></tr>`;
    return;
  }

  container.innerHTML = history.map(item => `
    <tr style="border-bottom: 1px solid var(--glass-border);">
      <td style="padding: 14px; font-weight: 600;">${window.app._escape(item.name)}</td>
      <td style="padding: 14px; font-family: var(--font-mono); font-size: 13px;">${window.app._formatBytes(item.size)}</td>
      <td style="padding: 14px;"><span class="badge ${item.direction === 'send' ? 'badge-blue' : 'badge-violet'}">${item.direction}</span></td>
      <td style="padding: 14px;"><span class="badge badge-green">${item.status}</span></td>
      <td style="padding: 14px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${item.sha256 ? item.sha256.substring(0, 10) + '...' : 'N/A'}</td>
      <td style="padding: 14px;">
        ${item.blobUrl ? `
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="window.app.openFileAction('${item.id}')">View</button>
        ` : '<span style="color: var(--text-muted); font-size: 12px;">Session Ended</span>'}
      </td>
    </tr>
  `).join('');
};
