/**
 * ShareX Streaming Engine
 * Progressive media streaming and MediaSource buffer management over WebRTC
 */

class StreamingEngine {
  constructor() {
    this.activeStreams = new Map(); // fileId -> { mediaSource, sourceBuffer, queue, totalBytes, receivedBytes, blobParts }
  }

  isStreamable(mimeType) {
    if (!mimeType) return false;
    return mimeType.startsWith('video/') || mimeType.startsWith('audio/');
  }

  onChunkReceived(fileId, arrayBuffer, transferredBytes, totalBytes) {
    const stream = this.activeStreams.get(fileId);
    if (!stream) return;

    stream.receivedBytes = transferredBytes;
    stream.blobParts.push(arrayBuffer);

    // If sourceBuffer is available and not updating, append
    if (stream.sourceBuffer && !stream.sourceBuffer.updating) {
      try {
        stream.sourceBuffer.appendBuffer(arrayBuffer);
      } catch (e) {
        // MediaSource format incompatibility fallback to blob accumulation
      }
    } else if (stream.sourceBuffer) {
      stream.queue.push(arrayBuffer);
    }

    if (stream.onProgress) {
      stream.onProgress(transferredBytes, totalBytes);
    }
  }

  createMediaUrl(fileId, mimeType, totalBytes) {
    // Check if MediaSource is supported for this mime
    if (window.MediaSource && MediaSource.isTypeSupported(mimeType)) {
      const ms = new MediaSource();
      const streamInfo = {
        mediaSource: ms,
        sourceBuffer: null,
        queue: [],
        totalBytes,
        receivedBytes: 0,
        blobParts: []
      };

      ms.addEventListener('sourceopen', () => {
        try {
          const sb = ms.addSourceBuffer(mimeType);
          streamInfo.sourceBuffer = sb;
          sb.addEventListener('updateend', () => {
            if (streamInfo.queue.length > 0 && !sb.updating) {
              sb.appendBuffer(streamInfo.queue.shift());
            }
          });
        } catch (e) {
          console.warn('[Streaming] SourceBuffer error:', e);
        }
      });

      this.activeStreams.set(fileId, streamInfo);
      return URL.createObjectURL(ms);
    } else {
      // Fallback: Accumulate parts into Blob Url
      const streamInfo = {
        mediaSource: null,
        sourceBuffer: null,
        queue: [],
        totalBytes,
        receivedBytes: 0,
        blobParts: []
      };
      this.activeStreams.set(fileId, streamInfo);
      return null;
    }
  }

  getStreamingProgress(fileId) {
    const stream = this.activeStreams.get(fileId);
    if (!stream) return 100;
    return (stream.receivedBytes / stream.totalBytes) * 100;
  }
}

window.streamingEngine = new StreamingEngine();
