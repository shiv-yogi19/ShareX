/**
 * ShareX Notifications System — Toasts, Sound Alerts & History Drawer
 */

class NotificationManager {
  constructor() {
    this.container = null;
    this.drawer = null;
    this.badge = null;
    this.history = JSON.parse(localStorage.getItem('sharex_notifications') || '[]');
    this.unreadCount = 0;
    this._init();
  }

  _init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.container = document.getElementById('toast-container');
      this.drawer = document.getElementById('notification-drawer-body');
      this.badge = document.getElementById('notification-badge-count');
      this.renderDrawer();
    });
  }

  show({ title, message, type = 'info', duration = 4500, silent = false }) {
    // Add to history
    const item = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title,
      message,
      type,
      timestamp: Date.now(),
      timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.history.unshift(item);
    if (this.history.length > 50) this.history.pop();
    try {
      localStorage.setItem('sharex_notifications', JSON.stringify(this.history));
    } catch (e) {}

    this.unreadCount++;
    this._updateBadge();
    this.renderDrawer();

    // Play synthesized sound
    if (!silent && window.soundEngine) {
      if (type === 'success') window.soundEngine.playComplete();
      else if (type === 'error') window.soundEngine.playError();
      else window.soundEngine.playNotification();
    }

    // Render Toast element
    if (!this.container) return item;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="#10b981"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="#f59e0b"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" fill="#38bdf8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${this._escape(title)}</div>
        <div class="toast-desc">${this._escape(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    this.container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    const removeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }

    return item;
  }

  renderDrawer() {
    if (!this.drawer) return;
    if (this.history.length === 0) {
      this.drawer.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="opacity: 0.3; margin-bottom: 12px;">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    this.drawer.innerHTML = this.history.map(item => `
      <div class="glass-card" style="padding: 14px; display: flex; gap: 12px; align-items: flex-start;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${item.type === 'success' ? '#10b981' : item.type === 'error' ? '#ef4444' : '#38bdf8'}; margin-top: 6px; flex-shrink: 0;"></div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
            <strong style="font-size: 13px; color: var(--text-primary);">${this._escape(item.title)}</strong>
            <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${item.timeString}</span>
          </div>
          <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">${this._escape(item.message)}</p>
        </div>
      </div>
    `).join('');
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem('sharex_notifications');
    this.unreadCount = 0;
    this._updateBadge();
    this.renderDrawer();
  }

  resetUnread() {
    this.unreadCount = 0;
    this._updateBadge();
  }

  _updateBadge() {
    if (!this.badge) return;
    if (this.unreadCount > 0) {
      this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      this.badge.style.display = 'inline-flex';
      this.badge.classList.remove('badge-count-pulse');
      void this.badge.offsetWidth;
      this.badge.classList.add('badge-count-pulse');
    } else {
      this.badge.style.display = 'none';
    }
  }

  _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.notifications = new NotificationManager();
