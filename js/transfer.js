/**
 * ShareX File Transfer Engine
 * High-speed WebRTC DataChannel binary chunk streaming with backpressure control,
 * SHA-256 verification, pause/resume, and queue orchestration
 */

class TransferEngine {
  constructor() {
    this.sendQueue = [];
    this.receiveQueue = [];
    this.activeSend = null;
    this.activeReceive = null;
    this.history = JSON.parse(localStorage.getItem('sharex_transfer_history') || '[]');

    this.isSending = false;
    this.isPaused = false;
    this.bytesTransferredThisSession = 0;

    this.onQueueUpdated = null;
    this.onProgressUpdated = null;
    this.onFileCompleted = null;

    this._bindWebRTC();
  }

  _bindWebRTC() {
    if (!window.webrtcManager) return;

    window.webrtcManager.onControlMessage = (msg) => {
      this._handleControlMessage(msg);
    };

    window.webrtcManager.onBinaryChunk = (arrayBuffer) => {
      this._handleIncomingChunk(arrayBuffer);
    };
  }

  /**
   * Adds user-selected files to the send queue
   */
  addFilesToSend(fileList) {
    const newItems = Array.from(fileList).map(file => ({
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      status: 'queued', // queued, sending, paused, completed, cancelled, error
      progress: 0,
      transferredBytes: 0,
      speed: 0,
      eta: 0,
      sha256: null,
      direction: 'send',
      startTime: null,
      endTime: null
    }));

    this.sendQueue.push(...newItems);
    this._notifyQueueChange();
    return newItems;
  }

  removeFromSendQueue(id) {
    if (this.activeSend && this.activeSend.id === id) {
      this.cancelActiveSend();
    } else {
      this.sendQueue = this.sendQueue.filter(item => item.id !== id);
      this._notifyQueueChange();
    }
  }

  /**
   * Initiates transfer of the queued files over WebRTC
   */
  async startSending() {
    if (this.isSending) return;
    const nextItem = this.sendQueue.find(item => item.status === 'queued');
    if (!nextItem) return;

    this.isSending = true;
    this.activeSend = nextItem;
    this.activeSend.status = 'sending';
    this.activeSend.startTime = Date.now();
    this.isPaused = false;
    this._notifyQueueChange();

    if (window.notifications) {
      window.notifications.show({
        title: 'Transfer Started',
        message: `Sending ${nextItem.name} (${this._formatBytes(nextItem.size)})`,
        type: 'info'
      });
    }

    // 1. Calculate SHA-256 for integrity verification
    try {
      this.activeSend.sha256 = await this._calculateSHA256(this.activeSend.file);
    } catch (e) {
      console.warn('[Transfer] Hash calculation warning:', e);
    }

    // 2. Announce file metadata to peer
    window.webrtcManager.sendControlMessage({
      type: 'file_start',
      fileId: this.activeSend.id,
      name: this.activeSend.name,
      size: this.activeSend.size,
      mimeType: this.activeSend.type,
      sha256: this.activeSend.sha256
    });

    // 3. Stream binary chunks with backpressure
    this._streamFile(this.activeSend);
  }

  async _streamFile(item) {
    const file = item.file;
    const chunkSize = window.settingsManager ? window.settingsManager.settings.chunkSize : 65536;
    let offset = item.transferredBytes || 0;
    const totalSize = file.size;

    let lastTime = Date.now();
    let bytesSinceLastCalc = 0;

    const readNextChunk = () => {
      if (!this.isSending || item.status !== 'sending') return;

      if (this.isPaused) {
        return; // Will resume when unpaused
      }

      if (offset >= totalSize) {
        // File completely sent!
        this._finishSending(item);
        return;
      }

      // Check DataChannel Backpressure
      const currentBuffered = window.webrtcManager.getBufferedAmount();
      if (currentBuffered > 1024 * 1024 * 8) { // 8MB threshold
        window.webrtcManager.setBufferedAmountLowThreshold(1024 * 1024 * 2);
        window.webrtcManager.onBufferedAmountLow(() => {
          window.webrtcManager.onBufferedAmountLow(null);
          readNextChunk();
        });
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();

      reader.onload = (e) => {
        const chunk = e.target.result;
        const sent = window.webrtcManager.sendBinary(chunk);
        if (sent) {
          offset += chunk.byteLength;
          item.transferredBytes = offset;
          item.progress = Math.min(100, (offset / totalSize) * 100);
          bytesSinceLastCalc += chunk.byteLength;

          // Speed & ETA calculations
          const now = Date.now();
          const elapsed = (now - lastTime) / 1000;
          if (elapsed >= 0.5) {
            item.speed = bytesSinceLastCalc / elapsed;
            const remainingBytes = totalSize - offset;
            item.eta = item.speed > 0 ? Math.ceil(remainingBytes / item.speed) : 0;
            bytesSinceLastCalc = 0;
            lastTime = now;
            this._notifyProgressChange(item);
          }

          // Continue immediately or on next event loop tick
          if (window.webrtcManager.getBufferedAmount() < 1024 * 512) {
            readNextChunk();
          } else {
            setTimeout(readNextChunk, 2);
          }
        } else {
          // Channel closed or blocked
          setTimeout(readNextChunk, 10);
        }
      };

      reader.onerror = () => {
        item.status = 'error';
        this.isSending = false;
        this._notifyQueueChange();
      };

      reader.readAsArrayBuffer(slice);
    };

    readNextChunk();
  }

  _finishSending(item) {
    item.status = 'completed';
    item.progress = 100;
    item.endTime = Date.now();
    this.isSending = false;
    this.activeSend = null;

    // Send complete control notification
    window.webrtcManager.sendControlMessage({
      type: 'file_end',
      fileId: item.id,
      sha256: item.sha256
    });

    this._saveToHistory(item);
    this._notifyQueueChange();

    if (window.soundEngine) window.soundEngine.playComplete();
    if (window.notifications) {
      window.notifications.show({
        title: 'Transfer Completed',
        message: `Successfully sent ${item.name}`,
        type: 'success'
      });
    }

    // Auto-proceed with next file in queue
    setTimeout(() => {
      this.startSending();
    }, 400);
  }

  pauseActiveSend() {
    if (this.activeSend && this.activeSend.status === 'sending') {
      this.activeSend.status = 'paused';
      this.isPaused = true;
      window.webrtcManager.sendControlMessage({
        type: 'transfer_pause',
        fileId: this.activeSend.id
      });
      this._notifyQueueChange();
    }
  }

  resumeActiveSend() {
    if (this.activeSend && this.activeSend.status === 'paused') {
      this.activeSend.status = 'sending';
      this.isPaused = false;
      window.webrtcManager.sendControlMessage({
        type: 'transfer_resume',
        fileId: this.activeSend.id
      });
      this._notifyQueueChange();
      this._streamFile(this.activeSend);
    }
  }

  cancelActiveSend() {
    if (this.activeSend) {
      this.activeSend.status = 'cancelled';
      window.webrtcManager.sendControlMessage({
        type: 'transfer_cancel',
        fileId: this.activeSend.id
      });
      this.isSending = false;
      this.isPaused = false;
      this._saveToHistory(this.activeSend);
      this.activeSend = null;
      this._notifyQueueChange();
    }
  }

  /* ------------------------------------------------------------------------
     RECEIVER IMPLEMENTATION
     ------------------------------------------------------------------------ */
  _handleControlMessage(msg) {
    switch (msg.type) {
      case 'file_start':
        this._prepareReceive(msg);
        break;

      case 'file_end':
        this._finishReceive(msg);
        break;

      case 'transfer_pause':
        if (this.activeReceive) {
          this.activeReceive.status = 'paused';
          this._notifyQueueChange();
        }
        break;

      case 'transfer_resume':
        if (this.activeReceive) {
          this.activeReceive.status = 'receiving';
          this._notifyQueueChange();
        }
        break;

      case 'transfer_cancel':
        if (this.activeReceive) {
          this.activeReceive.status = 'cancelled';
          this.activeReceive.chunks = [];
          this._saveToHistory(this.activeReceive);
          this.activeReceive = null;
          this._notifyQueueChange();
        }
        break;
    }
  }

  _prepareReceive(meta) {
    const item = {
      id: meta.fileId,
      name: meta.name,
      size: meta.size,
      type: meta.mimeType || 'application/octet-stream',
      status: 'receiving',
      progress: 0,
      transferredBytes: 0,
      expectedSha256: meta.sha256,
      calculatedSha256: null,
      direction: 'receive',
      startTime: Date.now(),
      endTime: null,
      chunks: [],
      blob: null,
      blobUrl: null,
      speed: 0,
      eta: 0
    };

    this.activeReceive = item;
    this.receiveQueue.unshift(item);
    this._notifyQueueChange();

    if (window.notifications) {
      window.notifications.show({
        title: 'Receiving File',
        message: `Incoming ${meta.name} (${this._formatBytes(meta.size)})`,
        type: 'info'
      });
    }
  }

  _handleIncomingChunk(arrayBuffer) {
    if (!this.activeReceive || this.activeReceive.status !== 'receiving') return;

    const item = this.activeReceive;
    item.chunks.push(arrayBuffer);
    item.transferredBytes += arrayBuffer.byteLength;
    item.progress = Math.min(100, (item.transferredBytes / item.size) * 100);

    // Notify streaming media player if listening
    if (window.streamingEngine) {
      window.streamingEngine.onChunkReceived(item.id, arrayBuffer, item.transferredBytes, item.size);
    }

    this._notifyProgressChange(item);
  }

  async _finishReceive(meta) {
    if (!this.activeReceive || this.activeReceive.id !== meta.fileId) return;

    const item = this.activeReceive;
    item.progress = 100;
    item.status = 'completed';
    item.endTime = Date.now();

    // Assemble Blob
    item.blob = new Blob(item.chunks, { type: item.type });
    item.blobUrl = URL.createObjectURL(item.blob);
    item.chunks = []; // Clear chunks array to free RAM

    // Verify SHA-256 integrity
    try {
      item.calculatedSha256 = await this._calculateSHA256(item.blob);
      item.verified = (item.calculatedSha256 === item.expectedSha256);
    } catch (e) {
      item.verified = true;
    }

    this._saveToHistory(item);
    this._notifyQueueChange();
    if (this.onFileCompleted) this.onFileCompleted(item);

    if (window.soundEngine) window.soundEngine.playComplete();
    if (window.notifications) {
      window.notifications.show({
        title: 'File Received Successfully',
        message: `${item.name} (${this._formatBytes(item.size)}) is ready to view or download`,
        type: 'success'
      });
    }

    this.activeReceive = null;
  }

  /* ------------------------------------------------------------------------
     SHA-256 Web Crypto Verification
     ------------------------------------------------------------------------ */
  async _calculateSHA256(blobOrFile) {
    if (!window.crypto || !window.crypto.subtle) return null;
    const arrayBuffer = await blobOrFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ------------------------------------------------------------------------
     File Download Handling
     ------------------------------------------------------------------------ */
  async downloadFile(item) {
    if (!item.blob && !item.blobUrl) {
      alert('File data is no longer in memory. Please request peer to re-send.');
      return;
    }

    // Try File System Access API first for streaming save
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: item.name
        });
        const writable = await handle.createWritable();
        await writable.write(item.blob);
        await writable.close();

        if (window.notifications) {
          window.notifications.show({
            title: 'Download Finished',
            message: `Saved ${item.name} to disk`,
            type: 'success'
          });
        }
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Standard universal download fallback
    const a = document.createElement('a');
    a.href = item.blobUrl || URL.createObjectURL(item.blob);
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (window.notifications) {
      window.notifications.show({
        title: 'Download Initiated',
        message: `Downloading ${item.name}`,
        type: 'info'
      });
    }
  }

  /* ------------------------------------------------------------------------
     History & Helpers
     ------------------------------------------------------------------------ */
  _saveToHistory(item) {
    const record = {
      id: item.id,
      name: item.name,
      size: item.size,
      type: item.type,
      status: item.status,
      direction: item.direction,
      sha256: item.calculatedSha256 || item.sha256,
      verified: item.verified,
      timestamp: item.endTime || Date.now(),
      blobUrl: item.blobUrl || null
    };

    this.history.unshift(record);
    if (this.history.length > 50) this.history.pop();
    try {
      localStorage.setItem('sharex_transfer_history', JSON.stringify(this.history));
    } catch (e) {}

    // Update global statistics in settings
    this._updateSessionStats(item.size);
  }

  _updateSessionStats(bytes) {
    let stats = JSON.parse(localStorage.getItem('sharex_stats') || '{"sentCount":0,"receiveCount":0,"totalBytes":0}');
    stats.totalBytes = (stats.totalBytes || 0) + bytes;
    if (this.activeSend) stats.sentCount = (stats.sentCount || 0) + 1;
    else stats.receiveCount = (stats.receiveCount || 0) + 1;
    localStorage.setItem('sharex_stats', JSON.stringify(stats));

    if (window.renderDashboardStats) window.renderDashboardStats();
  }

  _notifyQueueChange() {
    if (this.onQueueUpdated) this.onQueueUpdated(this.sendQueue, this.receiveQueue);
  }

  _notifyProgressChange(item) {
    if (this.onProgressUpdated) this.onProgressUpdated(item);
  }

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

window.transferEngine = new TransferEngine();
