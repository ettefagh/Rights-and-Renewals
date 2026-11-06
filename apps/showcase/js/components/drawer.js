/**
 * drawer.js
 * AI Agent Quick-Connect Drawer Controller (Feature 5 / Showcase)
 * Claude Desktop, Cursor IDE, Cloudflare Edge Worker & Stdio CLI configurations
 */

export class QuickConnectDrawerController {
  constructor() {
    this.modal = document.getElementById('quick-connect-modal');
    this.closeBtn = document.getElementById('drawer-close-btn');
    this.tabs = document.querySelectorAll('.drawer-tab');
    this.tabPanels = document.querySelectorAll('.drawer-tab-panel');
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn && this.modal) {
      this.closeBtn.addEventListener('click', () => {
        if (typeof this.modal.close === 'function') {
          this.modal.close();
        } else {
          this.modal.removeAttribute('open');
        }
      });
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          if (typeof this.modal.close === 'function') {
            this.modal.close();
          } else {
            this.modal.removeAttribute('open');
          }
        }
      });
    }

    // Tab switcher
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.drawer-tab');
      if (tabBtn) {
        const targetTab = tabBtn.getAttribute('data-tab');
        document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.drawer-tab-panel').forEach(p => p.classList.remove('active'));

        tabBtn.classList.add('active');
        const panel = document.getElementById(`drawer-panel-${targetTab}`);
        if (panel) panel.classList.add('active');
        return;
      }

      // Copy config buttons
      const copyBtn = e.target.closest('.btn-copy-config');
      if (copyBtn) {
        const targetPre = copyBtn.getAttribute('data-target');
        const codeEl = document.getElementById(targetPre);
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
            const orig = copyBtn.textContent;
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => { copyBtn.textContent = orig; }, 2000);
          }).catch(() => {
            prompt('Copy Configuration:', codeEl.textContent.trim());
          });
        }
      }
    });

    // High visibility CTA triggers
    document.querySelectorAll('[data-action="open-quick-connect"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.modal) {
          if (typeof this.modal.showModal === 'function') {
            this.modal.showModal();
          } else {
            this.modal.setAttribute('open', '');
          }
        }
      });
    });
  }
}
