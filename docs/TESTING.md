# ShareX Testing & Verification Guide

This guide describes how to thoroughly test all features of ShareX on mobile and desktop environments.

---

## 1. Single-Device Multi-Tab P2P Testing (Zero Server Required)

ShareX features an automated in-browser `BroadcastChannel` signaling bus that allows complete P2P testing between tabs on the same machine without external network dependencies.

### Step-by-Step Test Procedure:
1. Start local web server:
   ```bash
   python3 -m http.server 8080
   ```
2. Open **Tab A** at `http://localhost:8080`:
   - Watch the cinematic opening sequence finish and reveal the Liquid Glass dashboard.
   - Click **RECEIVE** (or press `R`).
   - Confirm that the pairing code is generated (e.g. `K7M-PQ29-XR`), the dynamic SVG QR code renders, and the 5-minute countdown starts.
3. Open **Tab B** at `http://localhost:8080`:
   - Click **SEND** (or press `S`).
   - Enter the pairing code from Tab A into the manual pairing box and click **Connect to Peer**.
   - Notice the connection state badge turns green: `Connected (ShareX Linux-...)`.
4. In **Tab B (Sender)**:
   - Select or drag-and-drop a sample file (e.g., an MP4 video, MP3 audio, PDF document, or image).
   - Click **Start Transfer**.
5. In **Tab A (Receiver)**:
   - If auto-accept is off, confirm that the **Receiver Consent Modal** appears showing the device name, file count, and byte size.
   - Click **Accept Transfer**.
6. Observe:
   - Real-time progress percentage bar smoothly filling on both tabs.
   - Real-time calculated speed (KB/s or MB/s) and estimated time of arrival (ETA).
   - Once 100% complete, the receiver verifies the SHA-256 hash and shows `SHA-256 Verified ✓`.
   - Audio feedback chime plays.

---

## 2. Media Player & Viewer Verification

1. **Video Streaming & Player**:
   - Transfer an `.mp4` or `.webm` video.
   - Click **Watch** on the completed card.
   - Verify fullscreen, volume slider, playback speed selector (0.5x - 2x), and picture-in-picture.
   - Confirm that the glass controls fade automatically after 3 seconds of mouse inactivity and re-appear on movement.
2. **Music Player & Visualizer**:
   - Transfer an `.mp3`, `.wav`, or `.aac` audio file.
   - Click **Listen**.
   - Verify vinyl disc rotation, animated waveform visualizer, seek track, and floating mini-player bar.
3. **Document Viewer**:
   - Transfer a `.pdf` or `.txt` file.
   - Click **View**.
   - Test zoom in (+), zoom out (-), reset (1:1), fullscreen, and direct download.
4. **Image Viewer Lightbox**:
   - Transfer a `.png`, `.jpg`, or `.webp` file.
   - Click **View**.
   - Test pointer drag-to-pan, mousewheel zoom, reset, and fullscreen.

---

## 3. Responsive & Device Capability Testing

- **Mobile Viewport (< 768px)**:
  - Open DevTools device toolbar (e.g., iPhone 14 Pro, Pixel 7).
  - Verify that the sidebar collapses and the **Floating Bottom Glass Dock** appears with active route indicator.
  - Verify that modals transform into mobile bottom sheets.
- **Performance Modes**:
  - Open **Settings**.
  - Switch to **Battery Saver**: confirm that background particles stop and blur is simplified.
  - Switch to **Ultra**: confirm dense particle mesh and cursor glow.
- **Theme Switching**:
  - Toggle between Midnight Glass, Dark Glass, Black & White Glass, Electric Blue, Violet Glass, and Light Glass.
  - Confirm smooth CSS color transitions and persistent state after page refresh.
