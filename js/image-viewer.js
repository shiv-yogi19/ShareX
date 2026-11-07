/**
 * ShareX Image Viewer — Pan, Zoom, Lightbox & Fullscreen
 */

class ImageViewer {
  constructor() {
    this.modal = null;
    this.viewport = null;
    this.imageEl = null;
    this.currentImage = null;

    this.scale = 1.0;
    this.pointX = 0;
    this.pointY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this._init();
  }

  _init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.modal = document.getElementById('image-viewer-modal');
      this.viewport = document.getElementById('image-canvas-viewport');
      this.imageEl = document.getElementById('image-preview-element');
      this._bindEvents();
    });
  }

  _bindEvents() {
    const zoomIn = document.getElementById('img-zoom-in');
    const zoomOut = document.getElementById('img-zoom-out');
    const zoomReset = document.getElementById('img-zoom-reset');
    const closeBtn = document.getElementById('img-close-btn');
    const fsBtn = document.getElementById('img-fs-btn');
    const dlBtn = document.getElementById('img-download-btn');

    if (zoomIn) zoomIn.addEventListener('click', () => this.zoom(0.25));
    if (zoomOut) zoomOut.addEventListener('click', () => this.zoom(-0.25));
    if (zoomReset) zoomReset.addEventListener('click', () => this.reset());

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.modal.classList.remove('open');
      });
    }

    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const container = this.modal.querySelector('.image-viewer-modal');
        if (!document.fullscreenElement) {
          container.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        if (this.currentImage && window.transferEngine) {
          window.transferEngine.downloadFile(this.currentImage);
        }
      });
    }

    // Pan with Pointer Events
    if (this.viewport) {
      this.viewport.addEventListener('pointerdown', (e) => {
        this.isDragging = true;
        this.startX = e.clientX - this.pointX;
        this.startY = e.clientY - this.pointY;
        this.viewport.setPointerCapture(e.pointerId);
      });

      this.viewport.addEventListener('pointermove', (e) => {
        if (!this.isDragging) return;
        this.pointX = e.clientX - this.startX;
        this.pointY = e.clientY - this.startY;
        this._updateTransform();
      });

      this.viewport.addEventListener('pointerup', () => {
        this.isDragging = false;
      });

      this.viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        this.zoom(delta);
      }, { passive: false });
    }
  }

  zoom(delta) {
    this.scale = Math.min(4.0, Math.max(0.5, this.scale + delta));
    this._updateTransform();
  }

  reset() {
    this.scale = 1.0;
    this.pointX = 0;
    this.pointY = 0;
    this._updateTransform();
  }

  _updateTransform() {
    if (this.imageEl) {
      this.imageEl.style.transform = `translate(${this.pointX}px, ${this.pointY}px) scale(${this.scale})`;
    }
    const zoomVal = document.getElementById('img-zoom-val');
    if (zoomVal) {
      zoomVal.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  openImage(item) {
    this.currentImage = item;
    const titleEl = document.getElementById('img-viewer-title');
    if (titleEl) titleEl.textContent = item.name;

    this.imageEl.src = item.blobUrl || URL.createObjectURL(item.blob);
    this.reset();
    this.modal.classList.add('open');
  }
}

window.imageViewer = new ImageViewer();
