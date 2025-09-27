// js/main.js (hotfix v5: diagnostic banner + toggle)
import { initMap } from './map.js';
import { initUI } from './ui.js';
import { mountPartials } from './partials.js';

const state = window.__APP_STATE__ || { assets: [], zones: [], selectedId: null, paused: false };
window.__APP_STATE__ = state;

const banner = document.getElementById('diag-banner');
const toggle = document.getElementById('diag-toggle');

function setDiagStatus(cls) {
  [banner, toggle].forEach(el => {
    if (!el) return;
    el.classList.remove('ok', 'error');
    if (cls) el.classList.add(cls);
  });
}

function diagMsg(msg, isError=false) {
  if (banner) banner.textContent = msg;
  setDiagStatus(isError ? 'error' : 'ok');
  // If error, force banner visible
  if (isError) {
    banner && banner.classList.remove('min');
    localStorage.setItem('diag.minimized', '0');
  }
}

function mountDiagToggle() {
  if (!banner || !toggle) return;
  const saved = localStorage.getItem('diag.minimized');
  if (saved === '1') banner.classList.add('min');
  toggle.addEventListener('click', () => {
    const isMin = banner.classList.toggle('min');
    localStorage.setItem('diag.minimized', isMin ? '1' : '0');
  });
}

async function boot() {
  try {
    mountDiagToggle();

    if (document.readyState === 'loading') {
      await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    await mountPartials();
    const map = await initMap(state);
    if (map && map.draw) window.drawMap = map.draw;
    initUI(state);
    function loop() {
      if (!state.paused && typeof window.drawMap === 'function') {
        try { window.drawMap(); } catch (e) { console.error('[drawMap]', e); }
      }
      requestAnimationFrame(loop);
    }
    loop();
    diagMsg('[boot] app ready');
    console.log('[boot] ready on GitHub Pages');
  } catch (err) {
    console.error('[boot] fatal', err);
    diagMsg('[boot] fatal: ' + err.message, true);
  }
}
boot();
