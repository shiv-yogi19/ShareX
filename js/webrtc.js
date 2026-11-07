/**
 * ShareX WebRTC Manager
 * Manages RTCPeerConnection, STUN/TURN, Signaling (CF Worker WebSocket + BroadcastChannel fallback),
 * and dual DataChannels (Control & Binary Transfer)
 */

class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.controlChannel = null;
    this.transferChannel = null;
    this.roomCode = null;
    this.isInitiator = false;
    this.remoteDeviceId = null;
    this.remoteDeviceName = 'Unknown Device';

    // Signaling channels
    this.wsSignaling = null;
    this.broadcastSignaling = null;
    this.signalingState = 'disconnected';

    // Callbacks
    this.onStateChange = null;
    this.onPeerConnected = null;
    this.onPeerDisconnected = null;
    this.onControlMessage = null;
    this.onBinaryChunk = null;

    this.deviceId = 'dev_' + Math.random().toString(36).substr(2, 8);
    this.deviceName = this._generateDeviceName();

    this._setupBroadcastFallback();
  }

  _generateDeviceName() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const os = /Mac/i.test(navigator.userAgent) ? 'Mac'
             : /Windows/i.test(navigator.userAgent) ? 'Windows'
             : /Linux/i.test(navigator.userAgent) ? 'Linux'
             : isMobile ? 'Mobile' : 'Device';
    const num = Math.floor(100 + Math.random() * 900);
    return `ShareX ${os}-${num}`;
  }

  _setupBroadcastFallback() {
    // BroadcastChannel enables instant multi-tab & same-origin P2P testing without internet or server!
    if ('BroadcastChannel' in window) {
      this.broadcastSignaling = new BroadcastChannel('sharex_signaling_bus');
      this.broadcastSignaling.onmessage = (event) => {
        this._handleSignalingMessage(event.data);
      };
    }
  }

  /**
   * Connects signaling to Cloudflare Worker or local bus
   */
  async initSignaling(roomCode, isInitiator = false) {
    this.roomCode = roomCode;
    this.isInitiator = isInitiator;

    const customSignalingUrl = window.settingsManager ? window.settingsManager.settings.signalingUrl : '';

    if (customSignalingUrl && customSignalingUrl.startsWith('ws')) {
      try {
        const fullWsUrl = `${customSignalingUrl}?room=${encodeURIComponent(roomCode)}&peer=${this.deviceId}`;
        this.wsSignaling = new WebSocket(fullWsUrl);
        this.wsSignaling.onopen = () => {
          this.signalingState = 'connected';
          this._sendSignaling({ type: 'join', room: roomCode, deviceId: this.deviceId, deviceName: this.deviceName });
        };
        this.wsSignaling.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            this._handleSignalingMessage(data);
          } catch (err) {}
        };
        this.wsSignaling.onerror = (e) => {
          console.warn('[WebRTC] WS Signaling error, falling back to BroadcastChannel:', e);
        };
      } catch (err) {
        console.warn('[WebRTC] Could not initialize WebSocket signaling:', err);
      }
    }

    // Always announce presence on local BroadcastChannel for seamless local tests
    this._sendSignaling({
      type: 'join',
      room: roomCode,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      isInitiator
    });
  }

  _sendSignaling(data) {
    data.from = this.deviceId;
    data.room = this.roomCode;

    // Send via WebSocket if connected
    if (this.wsSignaling && this.wsSignaling.readyState === WebSocket.OPEN) {
      this.wsSignaling.send(JSON.stringify(data));
    }

    // Send via BroadcastChannel
    if (this.broadcastSignaling) {
      this.broadcastSignaling.postMessage(data);
    }
  }

  _handleSignalingMessage(msg) {
    if (!msg || msg.from === this.deviceId) return; // Ignore own messages
    if (msg.room !== this.roomCode) return; // Different pairing room

    switch (msg.type) {
      case 'join':
        this.remoteDeviceId = msg.deviceId;
        this.remoteDeviceName = msg.deviceName || 'Remote Peer';
        // If we are initiator (sender), create WebRTC offer
        if (this.isInitiator) {
          this._createOffer();
        } else {
          // If we are receiver, send hello ack so sender knows to send offer
          this._sendSignaling({
            type: 'ready',
            deviceId: this.deviceId,
            deviceName: this.deviceName
          });
        }
        break;

      case 'ready':
        this.remoteDeviceId = msg.deviceId;
        this.remoteDeviceName = msg.deviceName || 'Remote Peer';
        if (this.isInitiator) {
          this._createOffer();
        }
        break;

      case 'offer':
        this.remoteDeviceId = msg.from;
        this.remoteDeviceName = msg.deviceName || this.remoteDeviceName;
        this._handleOffer(msg.offer);
        break;

      case 'answer':
        this._handleAnswer(msg.answer);
        break;

      case 'candidate':
        if (this.peerConnection && msg.candidate) {
          this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(e => {
            console.warn('[WebRTC] Candidate error:', e);
          });
        }
        break;

      case 'leave':
        this._handleDisconnection();
        break;
    }
  }

  /**
   * Initializes RTCPeerConnection instance
   */
  _initPeerConnection() {
    if (this.peerConnection) return;

    const iceServers = window.settingsManager ? window.settingsManager.getIceServers() : [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];

    const config = {
      iceServers,
      iceCandidatePoolSize: 4
    };

    this.peerConnection = new RTCPeerConnection(config);

    // ICE Candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this._sendSignaling({
          type: 'candidate',
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Connection state handler
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this._updateConnectionUI(state);
      if (state === 'connected') {
        if (this.onPeerConnected) this.onPeerConnected(this.remoteDeviceName);
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this._handleDisconnection();
      }
    };

    // Receiver: Incoming DataChannel handler
    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label === 'sharex-control') {
        this._bindControlChannel(channel);
      } else if (channel.label === 'sharex-transfer') {
        this._bindTransferChannel(channel);
      }
    };
  }

  async _createOffer() {
    this._initPeerConnection();

    // Create Data Channels as initiator
    this.controlChannel = this.peerConnection.createDataChannel('sharex-control', { ordered: true });
    this._bindControlChannel(this.controlChannel);

    this.transferChannel = this.peerConnection.createDataChannel('sharex-transfer', { ordered: true });
    this._bindTransferChannel(this.transferChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this._sendSignaling({
      type: 'offer',
      offer: { type: offer.type, sdp: offer.sdp },
      deviceName: this.deviceName
    });
  }

  async _handleOffer(offerDesc) {
    this._initPeerConnection();
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerDesc));

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this._sendSignaling({
      type: 'answer',
      answer: { type: answer.type, sdp: answer.sdp },
      deviceName: this.deviceName
    });
  }

  async _handleAnswer(answerDesc) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerDesc));
  }

  _bindControlChannel(channel) {
    this.controlChannel = channel;
    this.controlChannel.onopen = () => {
      console.log('[WebRTC] Control channel opened');
      // Send handshake
      this.sendControlMessage({ type: 'handshake', deviceName: this.deviceName });
    };
    this.controlChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (this.onControlMessage) this.onControlMessage(msg);
      } catch (e) {
        console.warn('[WebRTC] Invalid JSON on control channel:', e);
      }
    };
    this.controlChannel.onclose = () => {
      console.log('[WebRTC] Control channel closed');
    };
  }

  _bindTransferChannel(channel) {
    this.transferChannel = channel;
    this.transferChannel.binaryType = 'arraybuffer';
    this.transferChannel.onopen = () => {
      console.log('[WebRTC] Binary transfer channel opened');
    };
    this.transferChannel.onmessage = (event) => {
      if (this.onBinaryChunk) {
        this.onBinaryChunk(event.data);
      }
    };
  }

  sendControlMessage(obj) {
    if (this.controlChannel && this.controlChannel.readyState === 'open') {
      this.controlChannel.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  sendBinary(chunk) {
    if (this.transferChannel && this.transferChannel.readyState === 'open') {
      this.transferChannel.send(chunk);
      return true;
    }
    return false;
  }

  getBufferedAmount() {
    return this.transferChannel ? this.transferChannel.bufferedAmount : 0;
  }

  setBufferedAmountLowThreshold(threshold) {
    if (this.transferChannel) {
      this.transferChannel.bufferedAmountLowThreshold = threshold;
    }
  }

  onBufferedAmountLow(callback) {
    if (this.transferChannel) {
      this.transferChannel.onbufferedamountlow = callback;
    }
  }

  listenForPeer(pairingCode) {
    this.initSignaling(pairingCode, false);
  }

  connectToPeer(pairingCode) {
    this.initSignaling(pairingCode, true);
  }

  _updateConnectionUI(state) {
    const indicator = document.getElementById('connection-status-dot');
    const label = document.getElementById('connection-status-text');
    if (indicator && label) {
      indicator.className = 'indicator-dot';
      if (state === 'connected') {
        indicator.classList.add('online');
        label.textContent = `Connected (${this.remoteDeviceName})`;
      } else if (state === 'connecting' || state === 'checking') {
        indicator.classList.add('connecting');
        label.textContent = 'Connecting...';
      } else {
        label.textContent = 'Offline';
      }
    }
    if (this.onStateChange) this.onStateChange(state);
  }

  _handleDisconnection() {
    this._updateConnectionUI('disconnected');
    if (this.onPeerDisconnected) this.onPeerDisconnected();
  }

  close() {
    if (this.controlChannel) {
      this.controlChannel.close();
      this.controlChannel = null;
    }
    if (this.transferChannel) {
      this.transferChannel.close();
      this.transferChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this._handleDisconnection();
  }
}

window.webrtcManager = new WebRTCManager();
