# ShareX Changelog

All notable changes and releases for the ShareX P2P File Sharing & Streaming Platform.

---

## [1.0.0] — Initial Production Release

### Added
- **Core Engine**:
  - Full WebRTC RTCPeerConnection and RTCDataChannel binary chunk streaming engine.
  - 64KB chunk slicing with DataChannel backpressure management (`bufferedAmount` and `onbufferedamountlow`).
  - Web Crypto API SHA-256 integrity verification.
  - Multi-file send and receive queues with pause, resume, cancel, and progress synchronization.
- **Branding & Visuals**:
  - Custom SX Monogram SVG logo in multiple colorways (Electric Blue, Violet, Light).
  - High-resolution 192x192 and 512x512 PWA icons and SVG favicons.
  - Liquid Glass UI design system with backdrop blur, midnight backgrounds, and glowing accents.
  - 6 custom themes: Midnight Glass, Dark Glass, Black & White Glass, Electric Blue, Violet Glass, Light Glass.
- **Cinematic Experience**:
  - 3.4-second cinematic opening sequence with light-ring expansion, title fade, tagline glow, and smooth dashboard transition (STRICT NO SKIP).
  - 50+ purpose-engineered CSS keyframes and transitions in `css/animations.css`.
  - Ambient particle canvas with dynamic density and connection wave animation.
  - Interactive desktop cursor glow and magnetic hover effects.
- **Media Streaming & Viewers**:
  - Cinematic Video Player with 3-second auto-fading controls, playback speed selector, fullscreen, and PiP.
  - Animated Music Player with vinyl disc rotation, dynamic waveform visualizer, and floating mini-player bar.
  - PDF & Plain Text Document Viewer with zoom controls and clean dark reading layout.
  - Image Lightbox Viewer with pointer pan and drag, scroll zoom, and fullscreen inspection.
- **Signaling & Architecture**:
  - Cloudflare Worker WebRTC signaling server supporting WebSocket upgrades and HTTP fallback.
  - In-browser `BroadcastChannel` local signaling bus for instant multi-tab testing without external dependencies.
  - Zero cloud storage: direct peer-to-peer memory transmission.
- **Progressive Web App**:
  - Web App Manifest with shortcuts and standalone configuration.
  - Service worker application shell caching for offline loading.
- **Documentation**:
  - README, Architecture, Feature Matrix, Deployment Guide, Testing Guide, and Security Specification.
