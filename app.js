// app.js (legacy shim - hotfix v5)
(function () {
  window.ui = window.ui || {};
  if (typeof window.ui.renderEvents !== 'function') {
    window.ui.renderEvents = function () {};
  }
  if (typeof window.emitEvent !== 'function') {
    window.emitEvent = function () {};
  }
  if (typeof window.drawMap !== 'function') {
    window.drawMap = function () {};
  }
  var banner = document.getElementById('diag-banner');
  var toggle = document.getElementById('diag-toggle');
  if (banner) {
    banner.textContent = '[legacy shim] loaded';
  }
  if (toggle) {
    // Mirror status class on toggle too
    toggle.classList.remove('ok', 'error');
  }
})();