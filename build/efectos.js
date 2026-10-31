/* ===================== EFECTOS: ONDAS, CONTADORES Y SALIDA DE LA PANTALLA DE CARGA (Axioma Flux) ===================== */
var FX_QUIETO = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Onda que nace donde se pulsa un botón o una pestaña. */
document.addEventListener('pointerdown', function (e) {
  if (FX_QUIETO || !e.target.closest) return;
  var b = e.target.closest('.btn, #pestanas button, #menu-nuevo button'); if (!b || b.disabled) return;
  var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span');
  if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
  b.style.overflow = 'hidden';
  s.className = 'fx-onda'; s.style.width = s.style.height = d + 'px';
  s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
  b.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
}, true);

/** Las cifras de los indicadores suben desde cero al abrir una vista. */
function contarKpis() {
  if (FX_QUIETO) return;
  [].forEach.call(document.querySelectorAll('.vista.activa .kpi .v'), function (el) {
    var final = el.textContent, m = final.match(/^(−?)([\d.]+)(,\d+)?(\s*\D*)$/);
    if (!m) return;
    var n = parseInt(m[2].replace(/\./g, ''), 10); if (!(n > 0) || n > 1e9) return;
    var t0 = performance.now(), dur = Math.min(900, 420 + Math.log10(n + 1) * 120), tok = {};
    el.__fx = tok;
    (function paso(ahora) {
      if (el.__fx !== tok || el.textContent === final && ahora - t0 > dur) return;
      var p = Math.min(1, (ahora - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? m[1] + miles(Math.round(n * e)) + (m[3] || '') + m[4] : final;
      if (p < 1) requestAnimationFrame(paso);
    })(t0);
  });
}
var mostrarFx = mostrar;
mostrar = function (vista) { var antes = ESTADO.vista; mostrarFx(vista); if (ESTADO.vista !== antes) contarKpis(); };

/** La pantalla de carga se desvanece en lugar de desaparecer de golpe. */
function ocultarCargando() {
  var c = $('cargando'); if (!c || c.style.display === 'none') return;
  if (FX_QUIETO) { c.style.display = 'none'; return; }
  c.classList.add('fx-sale');
  setTimeout(function () { c.style.display = 'none'; c.classList.remove('fx-sale'); contarKpis(); }, 400);
}
