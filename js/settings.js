/**
 * ShareX Settings & Performance Engine
 * Manages themes, performance modes, transfer parameters, and local persistence
 */

class SettingsManager {
  constructor() {
    this.defaults = {
      theme: 'midnight-glass',
      performanceMode: 'auto',
      animationQuality: 'high',
      blurQuality: 'high',
      particleDensity: 'medium',
      fpsPreference: 'auto',
      chunkSize: 65536, // 64KB WebRTC optimal buffer
      autoAccept: false,
      soundEnabled: true,
      soundVolume: 0.5,
      customStun: 'stun:stun.l.google.com:19302',
      customTurn: '',
      turnUsername: '',
      turnCredential: '',
      signalingUrl: '' // Empty means default to CF Worker or local BroadcastChannel
    };

    this.settings = Object.assign({}, this.defaults);
    this.capabilities = {};
    this._loadSettings();
    this._detectCapabilities();
  }

  _loadSettings() {
    try {
      const saved = localStorage.getItem('sharex_user_settings');
      if (saved) {
        this.settings = Object.assign({}, this.defaults, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('[Settings] Failed to parse saved settings:', e);
    }
  }

  save() {
    try {
      localStorage.setItem('sharex_user_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[Settings] Failed to save settings to localStorage:', e);
    }
    this.apply();
  }

  apply() {
    // Apply Theme to <html> or <body>
    document.documentElement.setAttribute('data-theme', this.settings.theme);

    // Apply Performance Mode
    document.documentElement.setAttribute('data-performance', this.settings.performanceMode);

    // Update Sound Engine state
    if (window.soundEngine) {
      window.soundEngine.enabled = this.settings.soundEnabled;
      window.soundEngine.volume = this.settings.soundVolume;
    }

    // Update Ambient Canvas particle density
    if (window.ambientCanvas) {
      window.ambientCanvas.setDensity(this.settings.particleDensity);
      window.ambientCanvas.setMode(this.settings.performanceMode);
    }

    // Apply blur quality variable
    const blurVal = this.settings.blurQuality === 'off' ? 'none'
                  : this.settings.blurQuality === 'low' ? 'blur(8px)'
                  : 'blur(24px) saturate(180%)';
    document.documentElement.style.setProperty('--glass-blur', blurVal);

    // Dispatch settings change event for active WebRTC / Transfer listeners
    window.dispatchEvent(new CustomEvent('sharex_settings_updated', { detail: this.settings }));
  }

  setTheme(themeName) {
    this.settings.theme = themeName;
    this.save();
  }

  setPerformanceMode(mode) {
    this.settings.performanceMode = mode;
    if (mode === 'battery-saver') {
      this.settings.particleDensity = 'off';
      this.settings.blurQuality = 'low';
      this.settings.animationQuality = 'reduced';
    } else if (mode === 'ultra') {
      this.settings.particleDensity = 'high';
      this.settings.blurQuality = 'high';
      this.settings.animationQuality = 'high';
    } else if (mode === 'balanced') {
      this.settings.particleDensity = 'medium';
      this.settings.blurQuality = 'high';
      this.settings.animationQuality = 'high';
    }
    this.save();
  }

  _detectCapabilities() {
    this.capabilities = {
      webrtc: !!(window.RTCPeerConnection && window.RTCDataChannel),
      fileSystemAccess: !!window.showSaveFilePicker,
      mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      barcodeDetector: !!window.BarcodeDetector,
      webShare: !!navigator.share,
      serviceWorker: 'serviceWorker' in navigator,
      cryptoSubtle: !!(window.crypto && window.crypto.subtle),
      pictureInPicture: !!document.pictureInPictureEnabled,
      webAudio: !!(window.AudioContext || window.webkitAudioContext),
      storageQuota: 'storage' in navigator && 'estimate' in navigator.storage,
      touchDevice: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
    };
  }

  getIceServers() {
    const servers = [];
    if (this.settings.customStun && this.settings.customStun.trim()) {
      servers.push({ urls: this.settings.customStun.trim() });
    } else {
      servers.push({ urls: 'stun:stun.l.google.com:19302' });
      servers.push({ urls: 'stun:stun1.l.google.com:19302' });
    }

    if (this.settings.customTurn && this.settings.customTurn.trim()) {
      const turnConfig = { urls: this.settings.customTurn.trim() };
      if (this.settings.turnUsername) turnConfig.username = this.settings.turnUsername.trim();
      if (this.settings.turnCredential) turnConfig.credential = this.settings.turnCredential.trim();
      servers.push(turnConfig);
    }
    return servers;
  }
}

window.settingsManager = new SettingsManager();
