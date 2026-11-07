/**
 * ShareX Document Viewer — PDF & Plain Text Reading Interface
 */

class DocumentViewer {
  constructor() {
    this.modal = null;
    this.contentContainer = null;
    this.zoomLevel = 1.0;
    this.currentDoc = null;
    this._init();
  }

  _init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.modal = document.getElementById('doc-viewer-modal');
      this.contentContainer = document.getElementById('doc-content-area');
      this._bindEvents();
    });
  }

  _bindEvents() {
    const zoomIn = document.getElementById('doc-zoom-in');
    const zoomOut = document.getElementById('doc-zoom-out');
    const zoomReset = document.getElementById('doc-zoom-reset');
    const closeBtn = document.getElementById('doc-close-btn');
    const fsBtn = document.getElementById('doc-fullscreen-btn');
    const dlBtn = document.getElementById('doc-download-btn');

    if (zoomIn) {
      zoomIn.addEventListener('click', () => {
        this.zoomLevel = Math.min(2.5, this.zoomLevel + 0.15);
        this._applyZoom();
      });
    }

    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        this.zoomLevel = Math.max(0.6, this.zoomLevel - 0.15);
        this._applyZoom();
      });
    }

    if (zoomReset) {
      zoomReset.addEventListener('click', () => {
        this.zoomLevel = 1.0;
        this._applyZoom();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.modal.classList.remove('open');
      });
    }

    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const modalContainer = this.modal.querySelector('.doc-viewer-modal');
        if (!document.fullscreenElement) {
          modalContainer.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        if (this.currentDoc && window.transferEngine) {
          window.transferEngine.downloadFile(this.currentDoc);
        }
      });
    }
  }

  _applyZoom() {
    const textTarget = this.contentContainer.querySelector('.doc-text-area');
    const iframeTarget = this.contentContainer.querySelector('iframe');
    const zoomValElem = document.getElementById('doc-zoom-val');

    if (textTarget) {
      textTarget.style.fontSize = `${13 * this.zoomLevel}px`;
    }
    if (iframeTarget) {
      iframeTarget.style.transform = `scale(${this.zoomLevel})`;
      iframeTarget.style.transformOrigin = 'top center';
    }
    if (zoomValElem) {
      zoomValElem.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  async openDocument(item) {
    this.currentDoc = item;
    const titleEl = document.getElementById('doc-viewer-title');
    if (titleEl) titleEl.textContent = item.name;

    this.zoomLevel = 1.0;
    this._applyZoom();
    this.contentContainer.innerHTML = '';

    if (item.type === 'application/pdf') {
      // Embed PDF using native browser PDF viewer
      const iframe = document.createElement('iframe');
      iframe.src = item.blobUrl || URL.createObjectURL(item.blob);
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      this.contentContainer.appendChild(iframe);
    } else {
      // Text reading mode
      try {
        let text = '';
        if (item.blob) {
          text = await item.blob.text();
        } else if (item.blobUrl) {
          const res = await fetch(item.blobUrl);
          text = await res.text();
        }
        const textWrapper = document.createElement('div');
        textWrapper.className = 'doc-text-area selectable';
        textWrapper.textContent = text;
        this.contentContainer.appendChild(textWrapper);
      } catch (err) {
        this.contentContainer.innerHTML = `<div style="color: var(--status-danger);">Failed to parse document text</div>`;
      }
    }

    this.modal.classList.add('open');
  }
}

window.documentViewer = new DocumentViewer();
