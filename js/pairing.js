/**
 * ShareX Pairing Manager — Secure Pairing Codes, QR Generation, Expiration & Consent
 */

class PairingManager {
  constructor() {
    this.currentCode = null;
    this.expirationTimer = null;
    this.timeRemaining = 300; // 5 minutes in seconds
    this.timerInterval = null;
    this.onConsentCallback = null;
  }

  /**
   * Generates a secure random pairing code in format: XXX-XXXX-XX (e.g., K7M-PQ29-XR)
   */
  generatePairingCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0,1,I,O
    const getRandom = (len) => {
      let res = '';
      const randomValues = new Uint8Array(len);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < len; i++) {
          res += chars[randomValues[i] % chars.length];
        }
      } else {
        for (let i = 0; i < len; i++) {
          res += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      return res;
    };

    this.currentCode = `${getRandom(3)}-${getRandom(4)}-${getRandom(2)}`;
    this.timeRemaining = 300;
    this._startExpirationTimer();
    return this.currentCode;
  }

  _startExpirationTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const updateDisplay = () => {
      const minutes = Math.floor(this.timeRemaining / 60);
      const seconds = this.timeRemaining % 60;
      const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      const elem = document.getElementById('pairing-expiry-timer');
      if (elem) elem.textContent = `Expires in ${formatted}`;

      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (window.notifications) {
          window.notifications.show({
            title: 'Pairing Code Expired',
            message: 'Your temporary pairing session has expired for security.',
            type: 'warning'
          });
        }
        // Regenerate automatically
        this.renderReceiveQR();
      }
      this.timeRemaining--;
    };

    updateDisplay();
    this.timerInterval = setInterval(updateDisplay, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  renderReceiveQR() {
    const code = this.generatePairingCode();
    const qrContainer = document.getElementById('receive-qr-container');
    const codeDisplay = document.getElementById('pairing-code-display');

    if (codeDisplay) {
      codeDisplay.textContent = code;
      codeDisplay.classList.remove('pairing-code-reveal');
      void codeDisplay.offsetWidth;
      codeDisplay.classList.add('pairing-code-reveal');
    }

    if (qrContainer && window.qrEngine) {
      const pairUrl = `${window.location.origin}${window.location.pathname}#pair=${code}`;
      qrContainer.innerHTML = window.qrEngine.renderSVG(pairUrl, 220);
      qrContainer.classList.remove('qr-reveal');
      void qrContainer.offsetWidth;
      qrContainer.classList.add('qr-reveal');
    }

    // Join WebRTC room for this pairing code
    if (window.webrtcManager) {
      window.webrtcManager.listenForPeer(code);
    }
  }

  async copyCode() {
    if (!this.currentCode) return;
    try {
      await navigator.clipboard.writeText(this.currentCode);
      const copyBtn = document.getElementById('copy-code-btn');
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>Copied!</span>
        `;
        copyBtn.classList.add('anim-copied-feedback');
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove('anim-copied-feedback');
        }, 2000);
      }
      if (window.soundEngine) window.soundEngine.playClick();
      if (window.notifications) {
        window.notifications.show({
          title: 'Pairing Code Copied',
          message: `${this.currentCode} copied to clipboard`,
          type: 'info',
          duration: 2500
        });
      }
    } catch (e) {
      // Fallback
      prompt('Copy pairing code:', this.currentCode);
    }
  }

  async shareCode() {
    if (!this.currentCode) return;
    const pairUrl = `${window.location.origin}${window.location.pathname}#pair=${this.currentCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ShareX P2P File Transfer',
          text: `Connect to my ShareX session using pairing code: ${this.currentCode}`,
          url: pairUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') this.copyCode();
      }
    } else {
      this.copyCode();
    }
  }

  /**
   * Prompts receiver for incoming transfer consent
   */
  requestConsent(deviceName, fileList, totalBytes, onAccept, onDecline) {
    const modal = document.getElementById('consent-modal');
    const deviceSpan = document.getElementById('consent-device-name');
    const countSpan = document.getElementById('consent-file-count');
    const sizeSpan = document.getElementById('consent-total-size');
    const listContainer = document.getElementById('consent-file-list');

    if (deviceSpan) deviceSpan.textContent = deviceName || 'Nearby Peer';
    if (countSpan) countSpan.textContent = `${fileList.length} file${fileList.length > 1 ? 's' : ''}`;
    if (sizeSpan) sizeSpan.textContent = this._formatBytes(totalBytes);

    if (listContainer) {
      listContainer.innerHTML = fileList.map(f => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; color: var(--text-primary);">${this._escape(f.name)}</span>
          <span style="font-family: var(--font-mono); color: var(--text-muted);">${this._formatBytes(f.size)}</span>
        </div>
      `).join('');
    }

    const acceptBtn = document.getElementById('consent-accept-btn');
    const declineBtn = document.getElementById('consent-decline-btn');

    const handleAccept = () => {
      cleanup();
      modal.classList.remove('open');
      if (window.soundEngine) window.soundEngine.playConnect();
      onAccept();
    };

    const handleDecline = () => {
      cleanup();
      modal.classList.remove('open');
      onDecline();
    };

    const cleanup = () => {
      acceptBtn.removeEventListener('click', handleAccept);
      declineBtn.removeEventListener('click', handleDecline);
    };

    acceptBtn.addEventListener('click', handleAccept);
    declineBtn.addEventListener('click', handleDecline);

    modal.classList.add('open');
    if (window.soundEngine) window.soundEngine.playNotification();
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
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

window.pairingManager = new PairingManager();
