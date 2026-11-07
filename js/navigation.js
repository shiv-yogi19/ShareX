/**
 * ShareX Navigation System — Page Routing, Transitions, Dock/Sidebar Sync & Keyboard Shortcuts
 */

class NavigationManager {
  constructor() {
    this.currentPage = 'dashboard';
    this.pages = ['dashboard', 'send', 'receive', 'scan', 'history', 'settings'];
    this._init();
  }

  _init() {
    document.addEventListener('DOMContentLoaded', () => {
      this._bindNavElements();
      this._bindKeyboardShortcuts();
      this._handleUrlHash();
    });

    window.addEventListener('hashchange', () => {
      this._handleUrlHash();
    });
  }

  _bindNavElements() {
    // Top Brand Click -> Dashboard
    const brand = document.querySelector('.header-brand');
    if (brand) brand.addEventListener('click', () => this.navigateTo('dashboard'));

    // Desktop Nav Items
    document.querySelectorAll('.desktop-sidebar .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.getAttribute('data-page');
        if (page) this.navigateTo(page);
      });
    });

    // Mobile Dock Items
    document.querySelectorAll('.mobile-floating-dock .dock-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.getAttribute('data-page');
        if (page) this.navigateTo(page);
      });
    });

    // Hero Action Cards on Dashboard (Send, Receive, Scan)
    const sendCard = document.getElementById('hero-send-card');
    const receiveCard = document.getElementById('hero-receive-card');
    const scanCard = document.getElementById('hero-scan-card');

    if (sendCard) sendCard.addEventListener('click', () => this.navigateTo('send'));
    if (receiveCard) receiveCard.addEventListener('click', () => this.navigateTo('receive'));
    if (scanCard) scanCard.addEventListener('click', () => this.navigateTo('scan'));

    // Notifications Button & Drawer
    const notifBtn = document.getElementById('header-notif-btn');
    const notifDrawer = document.getElementById('notification-drawer-backdrop');
    const notifClose = document.getElementById('drawer-close-btn');

    if (notifBtn && notifDrawer) {
      notifBtn.addEventListener('click', () => {
        notifDrawer.classList.add('open');
        if (window.notifications) window.notifications.resetUnread();
      });
    }

    if (notifClose && notifDrawer) {
      notifClose.addEventListener('click', () => {
        notifDrawer.classList.remove('open');
      });
    }

    if (notifDrawer) {
      notifDrawer.addEventListener('click', (e) => {
        if (e.target === notifDrawer) notifDrawer.classList.remove('open');
      });
    }

    // Settings Modal Trigger
    const settingsBtn = document.getElementById('header-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close-btn');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('open');
      });
    }

    if (settingsClose && settingsModal) {
      settingsClose.addEventListener('click', () => {
        settingsModal.classList.remove('open');
      });
    }

    // Modal click-outside dismissal
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
    });
  }

  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if typing inside input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.key === 'Escape') {
        // Close any open modals/drawers
        document.querySelectorAll('.modal-backdrop.open, .drawer-backdrop.open').forEach(el => {
          el.classList.remove('open');
        });
      } else if (e.key.toLowerCase() === 's') {
        this.navigateTo('send');
      } else if (e.key.toLowerCase() === 'r') {
        this.navigateTo('receive');
      } else if (e.key.toLowerCase() === 'q') {
        this.navigateTo('scan');
      } else if (e.key.toLowerCase() === 'h') {
        this.navigateTo('history');
      } else if (e.key === '?') {
        const shortcutsModal = document.getElementById('shortcuts-modal');
        if (shortcutsModal) shortcutsModal.classList.toggle('open');
      }
    });
  }

  _handleUrlHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('pair=')) {
      const code = hash.split('=')[1];
      this.navigateTo('send');
      const manualInput = document.getElementById('manual-pairing-input');
      if (manualInput) manualInput.value = code;
      // Auto connect to this peer
      setTimeout(() => {
        const connectBtn = document.getElementById('manual-pair-submit-btn');
        if (connectBtn) connectBtn.click();
      }, 300);
      return;
    }

    if (this.pages.includes(hash)) {
      this.navigateTo(hash, false);
    }
  }

  navigateTo(pageName, updateHash = true) {
    if (!this.pages.includes(pageName)) pageName = 'dashboard';
    this.currentPage = pageName;

    if (window.soundEngine) window.soundEngine.playClick();

    // Update active page container
    document.querySelectorAll('.view-page').forEach(page => {
      if (page.id === `page-${pageName}`) {
        page.classList.remove('page-transition-leave');
        page.classList.add('active', 'page-transition-enter');
      } else {
        page.classList.remove('active', 'page-transition-enter');
      }
    });

    // Sync Desktop Sidebar
    document.querySelectorAll('.desktop-sidebar .nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-page') === pageName);
    });

    // Sync Mobile Floating Dock
    document.querySelectorAll('.mobile-floating-dock .dock-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-page') === pageName);
    });

    if (updateHash && window.location.hash !== `#${pageName}`) {
      window.history.pushState(null, '', `#${pageName}`);
    }

    // Trigger page-specific setups
    if (pageName === 'receive' && window.pairingManager) {
      window.pairingManager.renderReceiveQR();
    } else if (pageName === 'scan' && window.initScannerPage) {
      window.initScannerPage();
    } else if (pageName !== 'scan' && window.qrEngine) {
      window.qrEngine.stopScanner();
    }

    if (pageName === 'history' && window.renderHistoryTable) {
      window.renderHistoryTable();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

window.navigationManager = new NavigationManager();
