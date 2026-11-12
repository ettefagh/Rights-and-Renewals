/**
 * theme.js
 * Zero-FOUC Theme Management for CM-LAB Showcase
 * Adheres to W3C DTCG tokens & data-theme="dark" attribute
 */

(function initTheme() {
  const STORAGE_KEY = 'cmlab-theme';
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', initialTheme);

  window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // Storage unavailable in sandbox
    }
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
      themeBtn.setAttribute('title', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      const icon = themeBtn.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = next === 'dark' ? '☀️' : '🌙';
      }
    }
    window.dispatchEvent(new CustomEvent('cmlab-theme-changed', { detail: { theme: next } }));
  };
})();
