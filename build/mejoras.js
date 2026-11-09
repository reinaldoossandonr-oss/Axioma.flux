/* ===================== MEJORAS NOV-2026 (Axioma Flux) =====================
   · Huecos libres visibles en la bodega 3D y gráfico de libres/ocupadas por pasillo.
   · Optimizar espacio: vista «Antes / Después» en 3D.
   · Órdenes de compra desde Stock y quiebres (una orden por proveedor) y pestaña Compras.          */

/* ---------- Huecos libres en 3D ---------- */
COLOR.Libre = '#22D3EE';
/** Las cajas de hueco libre se ven sin filtros o con el filtro «Solo libres». */
function verHuecosLibres() {
  var f = ESTADO.filtro || {};
  if (f.disp === 'libre') return true;
  return !(f.categoria || f.rotacion || f.disp || f.pasillo || ESTADO.resaltar);
}

/* ---------- Gráfico de posiciones libres y ocupadas por pasillo ---------- */
ESTADO.grafPas = false;
function datosPasillos() {
  var P = {};
  D.ubicaciones.forEach(function (u) { var p = P[u.pasillo] = P[u.pasillo] || { t: 0, l: 0 }; p.t++; if (!C.ubi[u.id].it) p.l++; });
  return Object.keys(P).sort(function (a, b) { return a.localeCompare(b, 'es', { numeric: true }); }).map(function (k) { return { p: k, t: P[k].t, l: P[k].l }; });
}
function pintarGrafPasillos() {
  var c = $('b-graf'), btn = $('b-btn-graf'); if (!c) return;
  c.hidden = !ESTADO.grafPas;
  if (btn) { btn.classList.toggle('activo', !!ESTADO.grafPas); btn.setAttribute('aria-expanded', ESTADO.grafPas ? 'true' : 'false'); }
  if (!ESTADO.grafPas || !D) return;
  var L = datosPasillos(), tl = 0, tt = 0, max = 1, f = ESTADO.filtro || {};
  L.forEach(function (x) { tl += x.l; tt += x.t; max = Math.max(max, x.t); });
  c.innerHTML = '<div class="bg-cab"><div><h4>Posiciones por pasillo</h4><p><b>' + num(tl) + '</b> libres de ' + num(tt) + ' · pulsa un pasillo para ver sus huecos</p></div>' +
    '<button class="btn mini" data-accion="grafPasillos" aria-label="Cerrar el gráfico">✕</button></div>' +
    '<div class="bg-lista">' + L.map(function (x) {
      var oc = x.t - x.l, sel = f.pasillo === x.p && f.disp === 'libre', lleno = x.t ? oc / x.t * 100 : 0;
      return '<button class="bg-fila' + (sel ? ' sel' : '') + '" data-accion="verLibresPasillo" data-id="' + esc(x.p) + '" title="' + (sel ? 'Ver toda la bodega' : 'Ver los huecos libres del pasillo ' + esc(x.p)) + '">' +
        '<span class="bg-p">' + esc(x.p) + '</span>' +
        '<span class="bg-pista"><span class="bg-barra" style="width:' + (x.t / max * 100) + '%"><i class="oc' + (lleno >= 92 ? ' rojo' : lleno >= 80 ? ' ambar' : '') + '" style="width:' + lleno + '%"></i><i class="li" style="width:' + (100 - lleno) + '%"></i></span></span>' +
        '<span class="bg-n"><b>' + num(x.l) + '</b> libres<small>' + num(oc) + '/' + num(x.t) + '</small></span></button>';
    }).join('') + '</div>' +
    '<div class="bg-ley"><span><i class="oc"></i>Ocupadas</span><span><i class="li"></i>Libres</span><span class="tenue">Ámbar desde el 80 % · rojo desde el 92 %</span></div>';
}
ACCIONES.grafPasillos = function () { ESTADO.grafPas = !ESTADO.grafPas; pintarGrafPasillos(); };
ACCIONES.verLibresPasillo = function (p) {
  var f = ESTADO.filtro, mismo = f.pasillo === p && f.disp === 'libre', antes = f.pasillo;
  f.disp = mismo ? '' : 'libre'; f.pasillo = mismo ? '' : p;
  aplicarFiltro(antes !== f.pasillo);
};
var pintarPosicionesMej = PINTAR.posiciones;
PINTAR.posiciones = function () { pintarPosicionesMej(); pintarGrafPasillos(); };

/* ---------- Optimizar espacio: antes y después en 3D ---------- */
OPT.fase = 'antes'; OPT.sim = null;
function movimientosSug(s) { return s.tipo === 'mover' ? [[s.p.u.id, s.a.u.id]] : [[s.a.u.id, s.lej.u.id], [s.p.u.id, s.a.u.id]]; }
/** Aplica (o deshace) la sugerencia solo en pantalla, para ver cómo queda la bodega. No guarda nada. */
function optSimular(on) {
  if (OPT.sim) { OPT.sim.forEach(function (g) { g.x.it = g.it; g.x.stock = g.stock; }); OPT.sim = null; }
  if (!on) return;
  var s = OPT.res && OPT.res.sug[OPT.sel]; if (!s) return;
  var M = movimientosSug(s), guarda = [], visto = {};
  M.forEach(function (m) { m.forEach(function (id) { var x = C.ubi[id]; if (x && !visto[id]) { visto[id] = 1; guarda.push({ x: x, it: x.it, stock: x.stock }); } }); });
  M.forEach(function (m) { var a = C.ubi[m[0]], b = C.ubi[m[1]]; if (!a || !b) return; b.it = a.it; b.stock = a.stock; a.it = null; a.stock = 0; });
  OPT.sim = guarda;
}
function optFinSimulacion() { if (OPT.sim) { optSimular(false); OPT.fase = 'antes'; if (ESTADO.vista === 'posiciones') BODEGA.actualizar(); } OPT.fase = 'antes'; }
ACCIONES.optFase = function (f) {
  OPT.fase = f === 'despues' ? 'despues' : 'antes';
  optSimular(OPT.fase === 'despues');
  BODEGA.actualizar(); pintarControlRutas(); pintarPanelPosicion(); pintarGrafPasillos();
};
var mostrarMej = mostrar;
mostrar = function (vista) { if (vista !== 'posiciones') optFinSimulacion(); return mostrarMej(vista); };
var aplicarRutasMej = aplicarRutas;
aplicarRutas = function (enfocar) { if (ESTADO.rutaSel !== 'opt') optFinSimulacion(); return aplicarRutasMej(enfocar); };
var pintarControlRutasMej = pintarControlRutas;
pintarControlRutas = function () {
  pintarControlRutasMej();
  var b = $('b-ruta'); if (!b) return;
  b.classList.remove('op-barra');
  var s = OPT.res && OPT.sel != null && OPT.res.sug[OPT.sel];
  if (ESTADO.rutaSel !== 'opt' || !s || !(ESTADO.rutas || []).length) return;
  b.classList.add('op-barra');
  b.innerHTML = '<div class="op-b1"><b>Sugerencia ' + (OPT.sel + 1) + '</b><span>' + (s.tipo === 'mover' ? 'Mover a un hueco libre' : 'Intercambio en 2 pasos') + ' · <em>−' + metros(s.ahorro) + ' al mes</em></span>' +
    '<div class="seg op-fase" role="group" aria-label="Ver la bodega antes o después del cambio">' +
    '<button data-accion="optFase" data-id="antes" class="' + (OPT.fase !== 'despues' ? 'activo' : '') + '" aria-pressed="' + (OPT.fase !== 'despues') + '">Antes</button>' +
    '<button data-accion="optFase" data-id="despues" class="' + (OPT.fase === 'despues' ? 'activo' : '') + '" aria-pressed="' + (OPT.fase === 'despues') + '">Después</button></div></div>' +
    '<div class="op-b2">' + pasosTexto(s) + '</div>' +
    '<div class="op-b3"><span class="op-ley"><span><i style="background:#EF4444"></i>Sale de aquí</span><span><i style="background:#22C55E"></i>Llega aquí</span>' +
    (s.tipo === 'mover' ? '' : '<span><i style="background:#F59E0B"></i>Va al fondo</span>') + '</span>' +
    '<button class="btn mini" data-accion="repetirRuta">Repetir recorrido</button><button class="btn mini" data-accion="volverPicking">Volver a optimizar</button><button class="btn mini" data-accion="quitarRuta">Quitar</button></div>';
};
function pasosTexto(s) {
  var linea = function (n, p, desde, hasta) {
    return '<div class="op-b-paso">' + (n ? '<span class="op-paso-n">' + n + '</span>' : '') + '<b>' + esc(corto2(nombreReal(p), 30)) + '</b> <span class="op-pos-mini rojo">' + esc(desde.u.pos) + '</span><i>→</i><span class="op-pos-mini ' + (hasta === s.lej ? 'ambar' : 'verde') + '">' + esc(hasta.u.pos) + '</span></div>';
  };
  return s.tipo === 'mover' ? linea('', s.p, s.p, s.a) : linea(1, s.a, s.a, s.lej) + linea(2, s.p, s.p, s.a);
}
/** Nombre del producto antes de la simulación «Después» (que mueve los productos en pantalla). */
function nombreReal(p) {
  var g = (OPT.sim || []).filter(function (x) { return x.x === p.x; })[0];
  return g ? (g.it ? g.it.p.nombre : 'Libre') : nombreDe(p);
}
function corto2(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

/* ---------- Compras: proveedores y órdenes de compra ---------- */
var COMPRAS = { datos: null, cargando: false, sel: {}, prov: null };
var OCM = null;   // orden en preparación (ventana)

function cargarCompras(despues) {
  if (COMPRAS.cargando) return;
  COMPRAS.cargando = true;
  servidor('comprasDatos', null, function (r) { COMPRAS.datos = r; COMPRAS.cargando = false; if (despues) despues(); },
    function () { COMPRAS.cargando = false; COMPRAS.datos = COMPRAS.datos || { proveedores: [], asignacion: {}, ordenes: [] }; if (despues) despues(); });
}
function proveedorDe(idProv) { return ((COMPRAS.datos && COMPRAS.datos.proveedores) || []).filter(function (p) { return p.id === idProv; })[0] || null; }
function provDeProducto(idProd) { return COMPRAS.datos && COMPRAS.datos.asignacion ? COMPRAS.datos.asignacion[idProd] || '' : ''; }
function itemPorId(id) { for (var i = 0; i < C.items.length; i++) if (C.items[i].p.id === id) return C.items[i]; return null; }
function sumarDias(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + Number(n || 0)); return d.toISOString().slice(0, 10); }
function cantidadSugerida(it) { return it.reponer > 0 ? it.reponer : Math.max(1, Math.round(it.ritmo * (it.cob || 30)) || 1); }

/* Stock y quiebres con selección para comprar */
PINTAR.stock = function () {
  if (!COMPRAS.datos && !COMPRAS.cargando) cargarCompras(function () { if (ESTADO.vista === 'stock') pintar(); });
  var q = $('s-buscar').value, cat = $('s-categoria').value, al = $('s-alerta').value;
  var l = C.items.filter(function (it) { return coincide(it, q) && (!cat || it.p.categoria === cat) && (!al || it.alerta === al); })
    .sort(function (a, b) { return (a.dias == null ? 1e9 : a.dias) - (b.dias == null ? 1e9 : b.dias); });
  var S = COMPRAS.sel, todos = l.length && l.every(function (it) { return S[it.p.id]; });
  $('s-tabla').innerHTML = '<tr><th class="escribe oc-chk"><input type="checkbox" id="s-oc-todos" aria-label="Seleccionar todos los productos de la lista"' + (todos ? ' checked' : '') + '></th>' +
    '<th>SKU</th><th>Producto</th><th class="n">Stock actual</th><th class="n">Venta 90 días</th><th class="n">Mismo periodo año ant.</th><th class="n">Ritmo diario</th><th>Días de stock</th><th>Alerta</th><th class="n">Óptimo</th><th class="n">A reponer</th><th>Proveedor</th><th class="escribe"></th></tr>' +
    (l.map(function (it) {
      var w = it.dias == null ? 0 : Math.min(100, it.dias / 90 * 100), pv = proveedorDe(provDeProducto(it.p.id));
      return '<tr class="' + (S[it.p.id] ? 'oc-marcada' : '') + '"><td class="escribe oc-chk"><input type="checkbox" data-oc-sel="' + esc(it.p.id) + '" aria-label="Seleccionar ' + esc(it.p.nombre) + '"' + (S[it.p.id] ? ' checked' : '') + '></td>' +
        '<td>' + esc(it.p.sku) + '</td><td class="largo"><b>' + esc(it.p.nombre) + '</b><br><span class="tenue">' + esc(it.p.categoria) + '</span></td><td class="n"><b>' + num(it.stock) + '</b></td><td class="n">' + num(it.v90) + '</td><td class="n">' + num(it.vaa) + '</td><td class="n">' + it.ritmo.toFixed(1).replace('.', ',') + '</td>' +
        '<td style="min-width:130px"><div style="display:flex;align-items:center;gap:8px"><div class="barra" style="flex:1"><i style="width:' + w + '%;background:' + COLOR[it.alerta] + '"></i></div><b style="width:38px;text-align:right">' + (it.dias == null ? '—' : it.dias) + '</b></div></td>' +
        '<td>' + chip(ALERTA[it.alerta][0], ALERTA[it.alerta][1]) + '</td><td class="n">' + num(it.optimo) + '</td><td class="n">' + (it.reponer ? '<b class="ojo">+' + num(it.reponer) + '</b>' : '<span class="tenue">0</span>') + '</td>' +
        '<td class="oc-prov">' + (pv ? esc(pv.nombre) : '<span class="tenue">' + (COMPRAS.datos ? 'Sin asignar' : '…') + '</span>') + '</td>' +
        '<td class="escribe"><button class="btn mini" data-accion="ocUno" data-id="' + esc(it.p.id) + '" title="Crear una orden de compra solo para este producto">Pedir</button></td></tr>';
    }).join('') || '<tr><td colspan="13" class="vacio">Sin productos.</td></tr>');
  $('s-cuenta').textContent = l.length + ' productos';
  pintarBarraOC();
};
function pintarBarraOC() {
  var n = Object.keys(COMPRAS.sel).length, b = $('s-oc');
  if (b) { b.disabled = !n; b.textContent = n ? 'Generar orden de compra (' + n + ')' : 'Generar orden de compra'; }
  var q = $('s-oc-quitar'); if (q) q.style.display = n ? '' : 'none';
}
ACCIONES.ocReponer = function () {
  var n = 0; C.items.forEach(function (it) { if (it.reponer > 0) { COMPRAS.sel[it.p.id] = 1; n++; } });
  avisar(n ? n + ' productos con unidades a reponer seleccionados.' : 'No hay productos por debajo del óptimo.');
  pintar();
};
ACCIONES.ocQuitarSel = function () { COMPRAS.sel = {}; pintar(); };
ACCIONES.ocUno = function (id) { abrirOC([id]); };
ACCIONES.ocSeleccion = function () { abrirOC(Object.keys(COMPRAS.sel)); };
document.addEventListener('change', function (e) {
  var t = e.target; if (!t || !t.getAttribute) return;
  var id = t.getAttribute('data-oc-sel');
  if (id) { if (t.checked) COMPRAS.sel[id] = 1; else delete COMPRAS.sel[id]; t.closest('tr').classList.toggle('oc-marcada', t.checked); pintarBarraOC(); return; }
  if (t.id === 's-oc-todos') {
    [].forEach.call(document.querySelectorAll('[data-oc-sel]'), function (c) { c.checked = t.checked; var k = c.getAttribute('data-oc-sel'); if (t.checked) COMPRAS.sel[k] = 1; else delete COMPRAS.sel[k]; c.closest('tr').classList.toggle('oc-marcada', t.checked); });
    pintarBarraOC(); return;
  }
  if (t.hasAttribute('data-oc-prov')) asignarDesdeOC(t.getAttribute('data-oc-prov'), t.value);
});

/* Ventana de la orden de compra */
function abrirOC(ids) {
  ids = (ids || []).filter(function (id) { return itemPorId(id); });
  if (!ids.length) { avisar('Elige al menos un producto.', true); return; }
  OCM = { lineas: ids.map(function (id) { return { id: id, cant: cantidadSugerida(itemPorId(id)) }; }), textos: {}, nuevo: null, ver: null };
  var abrir = function () { $('oc-fondo').hidden = false; $('oc-modal').hidden = false; document.body.classList.add('oc-abierta'); pintarOC(); var p = $('oc-modal').querySelector('input,select,textarea,button'); if (p) p.focus(); };
  if (COMPRAS.datos) abrir(); else cargarCompras(abrir);
}
function cerrarOC() { OCM = null; $('oc-fondo').hidden = true; $('oc-modal').hidden = true; document.body.classList.remove('oc-abierta'); }
ACCIONES.ocCerrar = cerrarOC;
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && OCM) cerrarOC(); });

function textosOC(prov) {
  var t = OCM.textos[prov.id];
  if (!t) {
    var u = (D.usuario && D.usuario.nombre) || '', emp = (D.empresa && D.empresa.nombre) || '';
    t = OCM.textos[prov.id] = { para: prov.email || '', entrega: sumarDias(D.hoy, prov.plazo), asunto: '',
      mensaje: 'Hola' + (prov.contacto ? ' ' + prov.contacto : '') + ',\n\nOs enviamos nuestra orden de compra con los productos y cantidades del detalle. ' +
        'Por favor, confirmad la recepción y la fecha de entrega prevista.\n\nGracias,\n' + u + (emp ? '\n' + emp : '') };
  }
  return t;
}
function leerOC() {
  if (!OCM) return;
  [].forEach.call(document.querySelectorAll('#oc-modal [data-oc-cant]'), function (e) {
    var l = OCM.lineas.filter(function (x) { return x.id === e.getAttribute('data-oc-cant'); })[0]; if (l) l.cant = Math.max(0, Math.round(Number(e.value) || 0));
  });
  [].forEach.call(document.querySelectorAll('#oc-modal [data-oc-campo]'), function (e) {
    var k = e.getAttribute('data-oc-campo').split('|'); if (OCM.textos[k[0]]) OCM.textos[k[0]][k[1]] = e.value;
  });
}
function gruposOC() {
  var g = {}, orden = [];
  OCM.lineas.forEach(function (l) { var k = provDeProducto(l.id); if (!g[k]) { g[k] = []; orden.push(k); } g[k].push(l); });
  return { g: g, orden: orden.filter(function (k) { return k; }), sin: g[''] || [] };
}
function opcionesProv(sel) {
  return '<option value="">Elige el proveedor…</option>' + COMPRAS.datos.proveedores.filter(function (p) { return p.activo; }).map(function (p) {
    return '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.nombre) + '</option>'; }).join('') + '<option value="__nuevo">+ Nuevo proveedor…</option>';
}
function formProveedor(p, contexto) {
  p = p || {};
  return '<div class="oc-nuevo" data-prov-form="' + esc(contexto) + '"><div class="campos">' +
    '<div class="campo"><label for="pv-nombre">Nombre del proveedor *</label><input id="pv-nombre" value="' + esc(p.nombre || '') + '" autocomplete="organization"></div>' +
    '<div class="campo"><label for="pv-email">Email para pedidos</label><input id="pv-email" type="email" value="' + esc(p.email || '') + '" placeholder="pedidos@proveedor.com"></div>' +
    '<div class="campo"><label for="pv-contacto">Persona de contacto</label><input id="pv-contacto" value="' + esc(p.contacto || '') + '"></div>' +
    '<div class="campo"><label for="pv-telefono">Teléfono</label><input id="pv-telefono" value="' + esc(p.telefono || '') + '"></div>' +
    '<div class="campo"><label for="pv-plazo">Plazo de entrega (días)</label><input id="pv-plazo" type="number" min="0" max="365" value="' + esc(p.plazo != null ? p.plazo : 7) + '"></div></div>' +
    '<input type="hidden" id="pv-id" value="' + esc(p.id || '') + '">' +
    '<div class="pie-form"><button class="btn primario" type="button" data-accion="guardarProv" data-id="' + esc(contexto) + '">' + (p.id ? 'Guardar cambios' : 'Guardar proveedor') + '</button>' +
    '<button class="btn" type="button" data-accion="cancelarProv" data-id="' + esc(contexto) + '">Cancelar</button></div></div>';
}

function pintarOC() {
  if (!OCM) return;
  if (OCM.ver) { pintarVerOC(); return; }
  var G = gruposOC(), h = '', T = 0, mon = function (n) { return euros2(n); };
  h += '<div class="oc-cab"><div><h3 id="oc-titulo">Nueva orden de compra</h3><div class="sub">' + OCM.lineas.length + (OCM.lineas.length === 1 ? ' producto' : ' productos') +
    (G.orden.length ? ' · ' + G.orden.length + (G.orden.length === 1 ? ' proveedor, una orden' : ' proveedores, una orden por proveedor') : '') + '</div></div>' +
    '<button class="btn mini" data-accion="ocCerrar" aria-label="Cerrar">✕</button></div><div class="oc-cuerpo">';
  if (G.sin.length) {
    h += '<section class="oc-grupo oc-sin"><h4>Falta el proveedor de ' + G.sin.length + (G.sin.length === 1 ? ' producto' : ' productos') + '</h4>' +
      '<p class="sub">Elige su proveedor habitual. Queda guardado para las próximas órdenes.</p>' +
      G.sin.map(function (l) { var it = itemPorId(l.id);
        return '<div class="oc-asig"><span><b>' + esc(it.p.nombre) + '</b> <span class="tenue">' + esc(it.p.sku) + '</span></span><select class="sel" data-oc-prov="' + esc(l.id) + '" aria-label="Proveedor de ' + esc(it.p.nombre) + '">' + opcionesProv('') + '</select>' +
          '<button class="btn mini" data-accion="ocQuitarLinea" data-id="' + esc(l.id) + '" aria-label="Quitar ' + esc(it.p.nombre) + ' de la orden">✕</button></div>';
      }).join('') +
      (G.sin.length > 1 ? '<div class="oc-asig todos"><span>Asignar a todos</span><select class="sel" data-oc-prov="__todos" aria-label="Proveedor para todos los productos sin asignar">' + opcionesProv('') + '</select><span></span></div>' : '') +
      (OCM.nuevo ? formProveedor(null, OCM.nuevo) : '') + '</section>';
  }
  G.orden.forEach(function (k) {
    var p = proveedorDe(k), t = textosOC(p), tot = 0;
    var filas = G.g[k].map(function (l) {
      var it = itemPorId(l.id), imp = l.cant * Number(it.p.costo || 0); tot += imp;
      return '<tr><td class="largo"><b>' + esc(it.p.nombre) + '</b><br><span class="tenue">' + esc(it.p.sku) + ' · stock ' + num(it.stock) + (it.reponer ? ' · reponer <b class="ojo">+' + num(it.reponer) + '</b>' : '') + '</span></td>' +
        '<td class="n"><input type="number" min="0" step="1" class="oc-cant" data-oc-cant="' + esc(l.id) + '" value="' + l.cant + '" aria-label="Unidades de ' + esc(it.p.nombre) + '"></td>' +
        '<td class="n tenue">' + mon(Number(it.p.costo || 0)) + '</td><td class="n" data-oc-imp="' + esc(l.id) + '">' + mon(imp) + '</td>' +
        '<td><button class="btn mini" data-accion="ocQuitarLinea" data-id="' + esc(l.id) + '" aria-label="Quitar ' + esc(it.p.nombre) + '">✕</button></td></tr>';
    }).join('');
    T += tot;
    h += '<section class="oc-grupo" data-prov="' + esc(k) + '"><div class="oc-gcab"><div><h4>' + esc(p.nombre) + '</h4><span class="sub">Plazo habitual ' + p.plazo + ' días' + (p.telefono ? ' · ' + esc(p.telefono) : '') + '</span></div>' +
      '<div class="oc-tot"><small>Total sin IVA</small><b data-oc-tot="' + esc(k) + '">' + mon(tot) + '</b></div></div>' +
      '<div class="tabla-caja"><table class="oc-tabla"><tr><th>Producto</th><th class="n">Unidades</th><th class="n">Costo</th><th class="n">Importe</th><th></th></tr>' + filas + '</table></div>' +
      '<div class="campos oc-campos">' +
      '<div class="campo"><label for="oc-para-' + esc(k) + '">Enviar a</label><input type="email" id="oc-para-' + esc(k) + '" data-oc-campo="' + esc(k) + '|para" value="' + esc(t.para) + '" placeholder="pedidos@proveedor.com"></div>' +
      '<div class="campo"><label for="oc-ent-' + esc(k) + '">Entrega solicitada</label><input type="date" id="oc-ent-' + esc(k) + '" data-oc-campo="' + esc(k) + '|entrega" value="' + esc(t.entrega) + '"></div>' +
      '<div class="campo ancho"><label for="oc-asu-' + esc(k) + '">Asunto</label><input id="oc-asu-' + esc(k) + '" data-oc-campo="' + esc(k) + '|asunto" value="' + esc(t.asunto) + '" placeholder="Orden de compra (nº al crearla) · ' + esc((D.empresa && D.empresa.nombre) || '') + '"></div>' +
      '<div class="campo ancho"><label for="oc-msg-' + esc(k) + '">Mensaje</label><textarea id="oc-msg-' + esc(k) + '" rows="5" data-oc-campo="' + esc(k) + '|mensaje">' + esc(t.mensaje) + '</textarea></div></div>' +
      '<p class="nota-form">El correo incluye debajo la tabla de productos, cantidades, precios y el total.</p></section>';
  });
  var listos = G.orden.length, falta = G.sin.length;
  h += '</div><div class="oc-pie"><div class="sub">' + (falta ? 'Asigna el proveedor que falta para crear ' + (listos + 1 > 1 ? 'las órdenes' : 'la orden') + '.' :
      'Total <b data-oc-total>' + mon(T) + '</b> · ' + listos + (listos === 1 ? ' orden' : ' órdenes')) + '</div>' +
    '<button class="btn" data-accion="ocCrear" data-id="borrador"' + (falta || !listos ? ' disabled' : '') + '>Guardar como borrador</button>' +
    '<button class="btn primario" data-accion="ocCrear" data-id="enviar"' + (falta || !listos ? ' disabled' : '') + '>' + (listos > 1 ? 'Crear y enviar ' + listos + ' correos' : 'Crear y enviar por correo') + '</button></div>';
  $('oc-modal').innerHTML = h;
}
function totalesOC() {
  if (!OCM || OCM.ver) return;
  leerOC();
  var G = gruposOC(), T = 0;
  G.orden.forEach(function (k) {
    var tot = 0;
    G.g[k].forEach(function (l) { var it = itemPorId(l.id), imp = l.cant * Number(it.p.costo || 0); tot += imp; var c = document.querySelector('[data-oc-imp="' + l.id + '"]'); if (c) c.textContent = euros2(imp); });
    T += tot; var e = document.querySelector('[data-oc-tot="' + k + '"]'); if (e) e.textContent = euros2(tot);
  });
  var t = document.querySelector('[data-oc-total]'); if (t) t.textContent = euros2(T);
}
document.addEventListener('input', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-oc-cant')) totalesOC(); });
ACCIONES.ocQuitarLinea = function (id) {
  leerOC(); OCM.lineas = OCM.lineas.filter(function (l) { return l.id !== id; });
  if (!OCM.lineas.length) { cerrarOC(); return; }
  pintarOC();
};
function asignarDesdeOC(prodId, prov) {
  leerOC();
  if (prov === '__nuevo') { OCM.nuevo = prodId; pintarOC(); var n = $('pv-nombre'); if (n) n.focus(); return; }
  if (!prov) return;
  var ids = prodId === '__todos' ? gruposOC().sin.map(function (l) { return l.id; }) : [prodId];
  servidor('asignarProveedor', { productos: ids, proveedor: prov }, function () {
    ids.forEach(function (id) { COMPRAS.datos.asignacion[id] = prov; });
    if (OCM) pintarOC(); else pintar();
  });
}
ACCIONES.guardarProv = function (contexto) {
  var d = { id: valor('pv-id'), nombre: valor('pv-nombre'), email: valor('pv-email'), contacto: valor('pv-contacto'), telefono: valor('pv-telefono'), plazo: Number(valor('pv-plazo') || 7) };
  if (!d.nombre) { avisar('Escribe el nombre del proveedor.', true); $('pv-nombre').focus(); return; }
  if (OCM) leerOC();
  servidor('guardarProveedor', d, function (r) {
    avisar(r.mensaje);
    var tras = function () {
      if (OCM && contexto && contexto !== 'lista') {
        OCM.nuevo = null;
        var ids = contexto === '__todos' ? gruposOC().sin.map(function (l) { return l.id; }) : [contexto];
        servidor('asignarProveedor', { productos: ids, proveedor: r.id }, function () { ids.forEach(function (id) { COMPRAS.datos.asignacion[id] = r.id; }); pintarOC(); });
      } else { COMPRAS.prov = null; pintar(); }
    };
    cargarCompras(tras);
  });
};
ACCIONES.cancelarProv = function (contexto) { if (OCM && contexto !== 'lista') { leerOC(); OCM.nuevo = null; pintarOC(); } else { COMPRAS.prov = null; pintar(); } };

ACCIONES.ocCrear = function (modo) {
  leerOC();
  var G = gruposOC(); if (G.sin.length || !G.orden.length) return;
  var ordenes = G.orden.map(function (k) {
    var t = textosOC(proveedorDe(k));
    return { proveedor: k, para: t.para, asunto: t.asunto, mensaje: t.mensaje, entrega: t.entrega,
      lineas: G.g[k].filter(function (l) { return l.cant > 0; }).map(function (l) { var it = itemPorId(l.id); return { producto: l.id, cantidad: l.cant, costo: Number(it.p.costo || 0) }; }) };
  }).filter(function (o) { return o.lineas.length; });
  if (!ordenes.length) { avisar('Indica al menos una unidad.', true); return; }
  if (modo === 'enviar') {
    var sinMail = ordenes.filter(function (o) { return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(o.para || '').trim()); });
    if (sinMail.length) { avisar('Falta un email válido para ' + sinMail.map(function (o) { return proveedorDe(o.proveedor).nombre; }).join(', ') + '.', true); return; }
  }
  [].forEach.call(document.querySelectorAll('#oc-modal .oc-pie .btn'), function (b) { b.disabled = true; });
  var boton = document.querySelector('#oc-modal [data-accion="ocCrear"][data-id="' + modo + '"]'); if (boton) boton.textContent = modo === 'enviar' ? 'Enviando…' : 'Guardando…';
  servidor('crearOrdenesCompra', { ordenes: ordenes }, function (r) {
    var fin = function (enviadas) {
      COMPRAS.sel = {}; cerrarOC();
      var n = r.ids.length, txt = modo !== 'enviar' ? r.mensaje + ' Quedan como borrador en Compras.'
        : enviadas === n ? (n === 1 ? 'Orden ' + r.ids[0] + ' creada y enviada al proveedor.' : n + ' órdenes creadas y enviadas, una a cada proveedor.')
        : !enviadas ? (n === 1 ? 'La orden se creó, pero no se pudo enviar el correo. Queda como borrador en Compras.' : 'Las ' + n + ' órdenes se crearon, pero no se pudo enviar ningún correo. Quedan como borrador en Compras.')
        : enviadas + ' de ' + n + ' órdenes enviadas. Las demás quedan como borrador en Compras.';
      avisar(txt, modo === 'enviar' && enviadas < n);
      cargarCompras(function () { mostrar('compras'); });
    };
    if (modo !== 'enviar') { fin(0); return; }
    enviarVarias(r.ids.slice(), fin);
  }, function () { pintarOC(); });
};
function enviarVarias(ids, fin) {
  var ok = 0, sig = function () {
    if (!ids.length) { fin(ok); return; }
    servidor('enviarOC', { id: ids.shift() }, function () { ok++; sig(); }, sig);
  };
  sig();
}

/* Pestaña Compras */
function chipOC(e) { return chip({ 'Borrador': 'gris', 'Enviada': 'azul', 'Recibida': 'verde', 'Anulada': 'gris' }[e] || 'gris', e); }
PINTAR.compras = function () {
  if (!COMPRAS.datos) { $('co-ordenes').innerHTML = '<div class="vacio">Cargando compras…</div>'; if (!COMPRAS.cargando) cargarCompras(function () { if (ESTADO.vista === 'compras') pintar(); }); return; }
  var X = COMPRAS.datos, O = X.ordenes, curso = O.filter(function (o) { return o.estado === 'Enviada'; }), bor = O.filter(function (o) { return o.estado === 'Borrador'; });
  var reponer = C.items.filter(function (it) { return it.reponer > 0; }).length;
  $('co-kpis').innerHTML =
    kpi('Pendientes de recibir', num(curso.length), euros(curso.reduce(function (s, o) { return s + Number(o.total); }, 0)) + ' en camino', curso.length ? '' : 'bien') +
    kpi('Borradores sin enviar', num(bor.length), bor.length ? 'Revísalos y envíalos al proveedor' : 'Todo enviado', bor.length ? 'ojo' : 'bien') +
    kpi('Productos por reponer', num(reponer), 'Por debajo del inventario óptimo', reponer ? 'ojo' : 'bien') +
    kpi('Proveedores', num(X.proveedores.length), num(Object.keys(X.asignacion).length) + ' de ' + num(C.items.length) + ' productos con proveedor');
  $('co-ordenes').innerHTML = '<h3>Órdenes de compra</h3><div class="sub">Las abiertas y las de los últimos 120 días</div>' + (O.length ?
    '<div class="tabla-caja" style="max-height:560px"><table><tr><th>Orden</th><th>Fecha</th><th>Proveedor</th><th class="n">Productos</th><th class="n">Total</th><th>Estado</th><th></th></tr>' +
    O.map(function (o) {
      var p = proveedorDe(o.proveedor), abierta = o.estado === 'Borrador' || o.estado === 'Enviada';
      return '<tr><td><b>' + esc(o.id) + '</b></td><td>' + esc(o.fecha) + '</td><td class="largo">' + esc(p ? p.nombre : o.proveedor) + '<br><span class="tenue">' + esc(o.para || 'sin email') + '</span></td>' +
        '<td class="n">' + o.lineas.length + '</td><td class="n"><b>' + euros2(Number(o.total)) + '</b></td>' +
        '<td>' + chipOC(o.estado) + (o.enviada ? '<br><span class="tenue">' + esc(o.enviada) + '</span>' : '') + (o.error && abierta ? '<br><span class="mal" title="' + esc(o.error) + '">No se pudo enviar</span>' : '') + '</td>' +
        '<td><div class="pk-acc"><button class="btn mini" data-accion="ocVer" data-id="' + esc(o.id) + '">Ver</button>' +
        (abierta ? '<button class="btn mini primario escribe" data-accion="ocEnviar" data-id="' + esc(o.id) + '">' + (o.estado === 'Enviada' ? 'Reenviar' : 'Enviar') + '</button>' +
          '<button class="btn mini escribe" data-accion="ocRecibida" data-id="' + esc(o.id) + '">Recibida</button><button class="btn mini escribe" data-accion="ocAnular" data-id="' + esc(o.id) + '">Anular</button>' : '') + '</div></td></tr>';
    }).join('') + '</table></div>' :
    '<div class="vacio">Aún no hay órdenes de compra. Ve a <button class="btn mini" data-vista="stock">Stock y quiebres</button>, marca los productos y pulsa «Generar orden de compra».</div>');
  var cuenta = {}; Object.keys(X.asignacion).forEach(function (k) { cuenta[X.asignacion[k]] = (cuenta[X.asignacion[k]] || 0) + 1; });
  $('co-proveedores').innerHTML = '<div class="pk-prop-cab"><div><h3>Proveedores</h3><div class="sub">Email de pedidos y plazo de entrega habitual</div></div>' +
    (COMPRAS.prov ? '' : '<button class="btn mini primario escribe" data-accion="nuevoProv">+ Proveedor</button>') + '</div>' +
    (COMPRAS.prov ? formProveedor(COMPRAS.prov === 'nuevo' ? null : proveedorDe(COMPRAS.prov), 'lista') : '') +
    (X.proveedores.length ? X.proveedores.map(function (p) {
      return '<div class="dato co-prov"><span><b>' + esc(p.nombre) + '</b><br><span class="tenue">' + esc(p.email || 'sin email') + ' · ' + p.plazo + ' días · ' + (cuenta[p.id] || 0) + ' productos</span></span>' +
        '<button class="btn mini escribe" data-accion="editarProv" data-id="' + esc(p.id) + '">Editar</button></div>';
    }).join('') : (COMPRAS.prov ? '' : '<div class="vacio">Añade tu primer proveedor o créalo al hacer una orden.</div>'));
};
ACCIONES.nuevoProv = function () { COMPRAS.prov = 'nuevo'; pintar(); var n = $('pv-nombre'); if (n) n.focus(); };
ACCIONES.editarProv = function (id) { COMPRAS.prov = id; pintar(); var n = $('pv-nombre'); if (n) n.focus(); };
function ordenPorId(id) { return ((COMPRAS.datos && COMPRAS.datos.ordenes) || []).filter(function (o) { return o.id === id; })[0]; }
ACCIONES.ocEnviar = function (id) {
  var o = ordenPorId(id); if (!o) return;
  if (!confirmar('¿Enviar la orden ' + id + ' a ' + (o.para || 'el proveedor') + '?')) return;
  servidor('enviarOC', { id: id }, function (r) { avisar(r.mensaje); cargarCompras(function () { if (OCM) cerrarOC(); pintar(); }); }, function () { cargarCompras(function () { pintar(); }); });
};
ACCIONES.ocRecibida = function (id) {
  if (!confirmar('¿Marcar la orden ' + id + ' como recibida? Registra después el ingreso de la mercancía en su posición.')) return;
  servidor('estadoOrdenCompra', { id: id, estado: 'Recibida' }, function (r) { avisar(r.mensaje); cargarCompras(function () { pintar(); }); });
};
ACCIONES.ocAnular = function (id) {
  if (!confirmar('¿Anular la orden ' + id + '?')) return;
  servidor('estadoOrdenCompra', { id: id, estado: 'Anulada' }, function (r) { avisar(r.mensaje); cargarCompras(function () { pintar(); }); });
};
ACCIONES.ocVer = function (id) {
  var o = ordenPorId(id); if (!o) return;
  OCM = { ver: id, lineas: [], textos: {} };
  $('oc-fondo').hidden = false; $('oc-modal').hidden = false; document.body.classList.add('oc-abierta'); pintarOC();
  var b = $('oc-modal').querySelector('button'); if (b) b.focus();
};
function pintarVerOC() {
  var o = ordenPorId(OCM.ver), p = proveedorDe(o.proveedor), abierta = o.estado === 'Borrador' || o.estado === 'Enviada';
  $('oc-modal').innerHTML = '<div class="oc-cab"><div><h3 id="oc-titulo">Orden ' + esc(o.id) + ' ' + chipOC(o.estado) + '</h3><div class="sub">' + esc(p ? p.nombre : o.proveedor) + ' · ' + esc(o.fecha) +
    (o.entrega ? ' · entrega solicitada ' + esc(o.entrega) : '') + '</div></div><button class="btn mini" data-accion="ocCerrar" aria-label="Cerrar">✕</button></div><div class="oc-cuerpo">' +
    (o.error && abierta ? '<div class="aviso-demo oc-error">No se pudo enviar: ' + esc(o.error) + '</div>' : '') +
    '<section class="oc-grupo"><div class="dato" style="border-top:0"><span>Para</span><b>' + esc(o.para || 'sin email') + '</b></div>' +
    (o.asunto ? '<div class="dato"><span>Asunto</span><b>' + esc(o.asunto) + '</b></div>' : '') +
    '<div class="oc-msg">' + esc(o.mensaje || '') + '</div>' +
    '<div class="tabla-caja"><table class="oc-tabla"><tr><th>Producto</th><th class="n">Unidades</th><th class="n">Costo</th><th class="n">Importe</th></tr>' +
    o.lineas.map(function (l) { return '<tr><td class="largo"><b>' + esc(l.nombre) + '</b><br><span class="tenue">' + esc(l.sku) + '</span></td><td class="n">' + num(l.cantidad) + '</td><td class="n tenue">' + euros2(Number(l.costo)) + '</td><td class="n">' + euros2(l.cantidad * Number(l.costo)) + '</td></tr>'; }).join('') +
    '<tr class="total"><td colspan="3">Total sin IVA</td><td class="n">' + euros2(Number(o.total)) + '</td></tr></table></div></section></div>' +
    '<div class="oc-pie"><div class="sub"></div><button class="btn" data-accion="ocImprimir" data-id="' + esc(o.id) + '">Imprimir o guardar PDF</button>' +
    (abierta ? '<button class="btn primario escribe" data-accion="ocEnviar" data-id="' + esc(o.id) + '">' + (o.estado === 'Enviada' ? 'Reenviar por correo' : 'Enviar por correo') + '</button>' : '') + '</div>';
}
ACCIONES.ocImprimir = function (id) {
  var o = ordenPorId(id); if (!o) return;
  var p = proveedorDe(o.proveedor), emp = (D.empresa && D.empresa.nombre) || '', w = window.open('', '_blank');
  if (!w) { avisar('Permite las ventanas emergentes para imprimir la orden.', true); return; }
  w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Orden ' + esc(o.id) + '</title><style>body{font:14px/1.5 Arial,sans-serif;color:#0B1324;max-width:760px;margin:32px auto;padding:0 20px}h1{font-size:22px;margin:0}' +
    '.sub{color:#5A6A82;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#0B1324;color:#fff;text-align:left;padding:8px 10px;font-size:12px}td{padding:8px 10px;border-bottom:1px solid #E3E9F1}.n{text-align:right}' +
    '.tot td{font-weight:bold;border:0;font-size:15px}.cab{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #0B1324;padding-bottom:14px;margin-bottom:16px}.msg{white-space:pre-line;margin:16px 0}</style></head><body>' +
    '<div class="cab"><div><h1>Orden de compra ' + esc(o.id) + '</h1><div class="sub">' + esc(emp) + ' · ' + esc(o.fecha) + '</div></div><div class="sub" style="text-align:right"><b style="color:#0B1324">' + esc(p ? p.nombre : '') + '</b><br>' + esc(o.para || '') +
    (o.entrega ? '<br>Entrega solicitada: ' + esc(o.entrega) : '') + '</div></div><div class="msg">' + esc(o.mensaje || '') + '</div>' +
    '<table><tr><th>SKU</th><th>Producto</th><th class="n">Uds.</th><th class="n">Precio</th><th class="n">Importe</th></tr>' +
    o.lineas.map(function (l) { return '<tr><td>' + esc(l.sku) + '</td><td>' + esc(l.nombre) + '</td><td class="n">' + num(l.cantidad) + '</td><td class="n">' + euros2(Number(l.costo)) + '</td><td class="n">' + euros2(l.cantidad * Number(l.costo)) + '</td></tr>'; }).join('') +
    '<tr class="tot"><td colspan="4" class="n">Total sin IVA</td><td class="n">' + euros2(Number(o.total)) + '</td></tr></table></body></html>');
  w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 250);
};
