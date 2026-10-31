/* Axioma Flux · panel (portado desde App.html de Apps Script). Generado por build/transformar.py */
/* ===================== ESTADO Y UTILIDADES ===================== */
var D = null, C = {};
var ESTADO = { vista: 'inicio', periodo: 90, color: 'rotacion', sel: null, pasillo: '', calidad: 'alta', cobertura: null };
var SECCIONES = {
  inicio: { titulo: 'Inicio', tabs: [['inicio', 'Resumen']] },
  inventario: { titulo: 'Inventario', tabs: [['inventario', 'Dashboard'], ['catalogo', 'Catálogo'], ['stock', 'Stock y quiebres'], ['reposicion', 'Reposición'], ['movimientos', 'Movimientos']] },
  posiciones: { titulo: 'Posiciones', tabs: [['posiciones', 'Bodega 3D'], ['ubicaciones', 'Mapa de ubicaciones']] },
  pedidos: { titulo: 'Pedidos y despachos', tabs: [['pedidos', 'Pedidos'], ['picking', 'Picking y rutas'], ['ventas', 'Ventas'], ['comercial', 'Análisis de ventas']] },
  embudo: { titulo: 'CRM comercial', tabs: [['embudo', 'Embudo de ventas'], ['equipo', 'Equipo comercial']] },
  finanzas: { titulo: 'Finanzas', tabs: [['finanzas', 'Dashboard'], ['flujo', 'Flujo de caja'], ['cuentas', 'Facturas'], ['pagos', 'Cobros y pagos'], ['gastos', 'Gastos']] },
  cuenta: { titulo: 'Ajustes', tabs: [['cuenta', 'Mi cuenta'], ['empresa', 'Empresa'], ['usuarios', 'Usuarios'], ['integraciones', 'Integraciones'], ['admin', 'Superadmin']] }
};
var FORM_SECCION = { 'f-venta': 'pedidos', 'f-producto': 'inventario', 'f-lead': 'embudo', 'f-contacto': 'embudo', 'f-meta': 'embudo', 'f-movimiento': 'inventario', 'f-factura': 'finanzas', 'f-pago': 'finanzas', 'f-gasto': 'finanzas' };
var CON_PERIODO = { comercial: 1, finanzas: 1 };
var PALETA = ['#38BDF8', '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#FACC15', '#60A5FA', '#F87171', '#2DD4BF', '#C084FC'];
var COLOR = { Alta: '#4ADE80', Media: '#FBBF24', Baja: '#F87171', Ocupado: '#0EA5F0', Libre: '#4ADE80', critico: '#F87171', precaucion: '#FBBF24', seguro: '#4ADE80', sin: '#94A3B8', vacio: '#3B4A68' };
var ALERTA = { critico: ['rojo', '🔴 Crítico'], precaucion: ['ambar', '🟡 Precaución'], seguro: ['verde', '🟢 Seguro'], sin: ['gris', '⚪ Sin ventas'] };

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function miles(n) { return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function num(n) { return (n < 0 ? '−' : '') + miles(n); }
function euros(n) { return (n < 0 ? '−' : '') + miles(n) + ' ' + moneda(); }
function euros2(n) { if (!decimales()) return euros(n); var a = Math.abs(n), e = Math.floor(a + 0.0001), c = Math.round((a - e) * 100); if (c === 100) { e++; c = 0; } return (n < 0 ? '−' : '') + miles(e) + ',' + ('0' + c).slice(-2) + ' ' + moneda(); }
function pct(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',') + ' %'; }
var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function mesTxt(k) { return MESES[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(2, 4); }
function claveMes(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
function fecha(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
function aFecha(iso) { return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))); }
var _dia = {};
function diasDesde(iso) {                       // Días transcurridos desde esa fecha hasta hoy (negativo si es futura)
  var k = iso.slice(0, 10);
  if (_dia[k] === undefined) _dia[k] = Math.round((C.hoy - aFecha(k)) / 864e5);
  return _dia[k];
}
function chip(clase, texto) { return '<span class="chip ' + clase + '">' + esc(texto) + '</span>'; }
function kpi(nombre, valor, detalle, clase) { return '<div class="kpi"><div class="n">' + nombre + '</div><div class="v ' + (clase || '') + '">' + valor + '</div><div class="d">' + (detalle || '&nbsp;') + '</div></div>'; }
function opciones(lista, primero) { return (primero ? '<option value="">' + primero + '</option>' : '') + lista.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); }
function unicos(lista) { var v = {}, r = []; lista.forEach(function (x) { if (x && !v[x]) { v[x] = 1; r.push(x); } }); return r; }
function avisar(texto, error) {
  var a = $('aviso'); a.textContent = texto; a.className = error ? 'error' : ''; a.style.display = 'block';
  clearTimeout(avisar.t); avisar.t = setTimeout(function () { a.style.display = 'none'; }, error ? 5000 : 2400);
}
function servidor(funcion, datos, bien, mal) {
  google.script.run.withSuccessHandler(function (r) {
    if (r && r.ok === false) { avisar(r.mensaje, true); if (mal) mal(); } else if (bien) bien(r);
  }).withFailureHandler(function (e) { avisar('No se pudo guardar: ' + (e && e.message || e), true); if (mal) mal(); })[funcion](datos);
}
function guardarLocal(k, v) { try { localStorage.setItem('axioma-bodega-' + k, v); } catch (e) {} }
function leerLocal(k) { try { return localStorage.getItem('axioma-bodega-' + k); } catch (e) { return null; } }

/* ===================== CÁLCULOS ===================== */
function coberturaDe(categoria) {
  var c = ESTADO.cobertura || {};
  return c[categoria] != null && c[categoria] !== '' && !isNaN(c[categoria]) ? Number(c[categoria]) : D.config.cobertura;
}

function calcular() {
  var cfg = D.config;
  C = { hoy: aFecha(D.hoy), porId: {}, porSku: {}, items: [], ubi: {} };
  _dia = {};
  D.productos.forEach(function (p) {
    var it = { p: p, stock: 0, v90: 0, vaa: 0, ubis: [] };
    C.items.push(it); C.porId[p.id] = it; C.porSku[p.sku] = it;
  });
  D.movimientos.forEach(function (m) {
    var it = C.porSku[m[3]]; if (!it) return;
    if (m[2] === 'Ingreso Existencia' || m[2] === 'Ajuste Entrada') it.stock += m[4];
    else if (m[2] === 'Salida Venta' || m[2] === 'Merma / Daño' || m[2] === 'Ajuste Salida') it.stock -= m[4];
  });
  D.ventas.forEach(function (v) {
    var it = C.porId[v[2]]; if (!it) return;
    var d = diasDesde(v[1]);
    if (d >= 0 && d < 90) it.v90 += v[3];
    if (d >= 365 && d < 455) it.vaa += v[3];
  });
  D.ubicaciones.forEach(function (u) {
    var it = u.sku ? C.porSku[u.sku] : null;
    C.ubi[u.id] = { u: u, it: it, stock: 0 };
    if (it) it.ubis.push(u.id);
  });
  C.items.forEach(function (it) {
    it.ritmo = it.vaa > 0 ? (cfg.peso90 * it.v90 + cfg.pesoAA * it.vaa) / 100 / 90 : it.v90 / 90;
    it.dias = it.ritmo > 0 ? Math.round(it.stock / it.ritmo) : null;
    it.alerta = it.dias == null ? 'sin' : it.dias < cfg.critico ? 'critico' : it.dias < cfg.precaucion ? 'precaucion' : 'seguro';
    it.rot = it.dias == null ? 'Baja' : it.dias <= cfg.rotAlta ? 'Alta' : it.dias <= cfg.rotMedia ? 'Media' : 'Baja';
    it.valor = Math.max(0, it.stock) * it.p.costo;
    // El stock del producto se reparte entre las posiciones que tiene asignadas
    var n = it.ubis.length, base = n ? Math.floor(Math.max(0, it.stock) / n) : 0, resto = n ? Math.max(0, it.stock) - base * n : 0;
    it.ubis.forEach(function (id, i) { C.ubi[id].stock = base + (i < resto ? 1 : 0); });
  });
  // Facturas: total, cobrado y saldo según los cobros y pagos registrados
  var pagado = {};
  D.pagos.forEach(function (p) { pagado[p.cuenta] = (pagado[p.cuenta] || 0) + p.monto; });
  C.cuenta = {};
  D.cuentas.forEach(function (c) {
    c.total = Math.round(c.neto * (100 + c.iva)) / 100; c.pagado = pagado[c.id] || 0;
    c.saldo = Math.max(0, Math.round((c.total - c.pagado) * 100) / 100);
    c.estado = c.saldo <= 0.005 ? 'Pagado' : c.pagado > 0 ? 'Parcial' : 'Pendiente';
    c.dias = c.vence ? -diasDesde(c.vence) : 0; c.vencida = c.saldo > 0.005 && c.dias < 0; c.cobro = c.tipo === 'Cobro Cliente';
    C.cuenta[c.id] = c;
  });
  // Prospectos: último contacto (bitácora) y días sin seguimiento
  var ultimo = {}, nota = {};
  D.bitacora.forEach(function (b) { if (!ultimo[b.lead] || b.fecha >= ultimo[b.lead]) { ultimo[b.lead] = b.fecha; nota[b.lead] = b; } });
  C.lead = {};
  D.leads.forEach(function (l) {
    l.idx = Math.max(0, D.listas.ETAPA.indexOf(l.etapa)); l.abierto = l.idx < 4; l.ganado = l.idx === 4;
    l.ultimo = ultimo[l.id] && ultimo[l.id] > l.fecha ? ultimo[l.id] : l.fecha; l.nota = nota[l.id] || null;
    l.sin = l.ultimo ? diasDesde(l.ultimo) : 0; l.alerta = l.abierto && l.sin > cfg.diasLead;
    C.lead[l.id] = l;
  });
  C.ejecutivos = unicos(D.leads.map(function (l) { return l.ejecutivo; }).concat(D.metas.map(function (m) { return m.ejecutivo; }))).sort();
  calcularOptimo();
  C.categorias = unicos(D.listas.CATEGORIA.concat(D.productos.map(function (p) { return p.categoria; })).filter(function (c) {
    return D.productos.some(function (p) { return p.categoria === c; }) || D.cobertura.some(function (x) { return x.categoria === c; });
  }));
  C.lineas = unicos(D.productos.map(function (p) { return p.linea; }));
  C.r30 = resumen(30); C.r = resumen(ESTADO.periodo);
  calcularFinanzas();
}

/** Inventario óptimo y unidades a reponer: depende de los días de cobertura de cada categoría. */
function calcularOptimo() {
  C.items.forEach(function (it) {
    it.cob = coberturaDe(it.p.categoria);
    it.optimo = Math.ceil(it.ritmo * it.cob - 1e-9);
    it.reponer = Math.max(0, it.optimo - it.stock);
    it.exceso = Math.max(0, it.stock - it.optimo);
    it.costoRep = it.reponer * it.p.costo;
  });
}

/** Ventas, costos y merma de los últimos n días, por línea, producto y canal. */
function resumen(n) {
  var r = { n: n, ingresos: 0, costo: 0, merma: 0, unidades: 0, previo: 0, lineas: {}, productos: {}, canales: {}, gastos: 0, gastosCat: {} };
  var linea = function (l) { return r.lineas[l] || (r.lineas[l] = { linea: l || 'Sin línea', ingresos: 0, costo: 0, merma: 0, unidades: 0 }); };
  D.ventas.forEach(function (v) {
    var it = C.porId[v[2]]; if (!it) return;
    var d = diasDesde(v[1]), ing = v[3] * it.p.precio, cos = v[3] * it.p.costo;
    if (d >= n && d < 2 * n) r.previo += ing;
    if (d < 0 || d >= n) return;
    r.ingresos += ing; r.costo += cos; r.unidades += v[3];
    var l = linea(it.p.linea); l.ingresos += ing; l.costo += cos; l.unidades += v[3];
    var p = r.productos[v[2]] || (r.productos[v[2]] = { it: it, ingresos: 0, costo: 0, unidades: 0 });
    p.ingresos += ing; p.costo += cos; p.unidades += v[3];
    r.canales[v[4]] = (r.canales[v[4]] || 0) + ing;
  });
  D.movimientos.forEach(function (m) {
    if (m[2] !== 'Merma / Daño') return;
    var it = C.porSku[m[3]], d = diasDesde(m[1]); if (!it || d < 0 || d >= n) return;
    var c = m[4] * it.p.costo; r.merma += c; linea(it.p.linea).merma += c;
  });
  D.gastos.forEach(function (g) {
    var d = diasDesde(g.fecha); if (d < 0 || d >= n) return;
    r.gastos += g.monto; r.gastosCat[g.categoria] = (r.gastosCat[g.categoria] || 0) + g.monto;
  });
  r.margen = r.ingresos - r.costo - r.merma;
  r.listaLineas = Object.keys(r.lineas).map(function (k) { var l = r.lineas[k]; l.margen = l.ingresos - l.costo - l.merma; return l; })
    .sort(function (a, b) { return b.margen - a.margen; });
  r.top = Object.keys(r.productos).map(function (k) { var p = r.productos[k]; p.margen = p.ingresos - p.costo; return p; })
    .sort(function (a, b) { return b.margen - a.margen; });
  return r;
}

function calcularFinanzas() {
  var cfg = D.config, f = { pendCobro: 0, pendPago: 0, vencCobro: 0, vencPago: 0, vencidas: 0 };
  D.cuentas.forEach(function (c) {
    if (c.saldo <= 0.005) return;
    if (c.cobro) { f.pendCobro += c.saldo; if (c.vencida) { f.vencCobro += c.saldo; f.vencidas++; } }
    else { f.pendPago += c.saldo; if (c.vencida) f.vencPago += c.saldo; }
  });
  f.inmovilizado = C.items.filter(function (it) { return it.rot === 'Baja' && it.stock > 0; }).sort(function (a, b) { return b.valor - a.valor; });
  f.capital = f.inmovilizado.reduce(function (s, it) { return s + it.valor; }, 0);
  f.valorStock = C.items.reduce(function (s, it) { return s + it.valor; }, 0);
  // Flujo de caja mensual: meses pasados reales, mes en curso (real + previsto) y meses futuros previstos
  var lista = [], mapa = {}, actual = claveMes(C.hoy);
  for (var i = -cfg.mesesPasados; i <= cfg.mesesFuturos; i++) {
    var k = claveMes(new Date(C.hoy.getFullYear(), C.hoy.getMonth() + i, 1));
    mapa[k] = { k: k, tipo: i < 0 ? 'real' : i === 0 ? 'curso' : 'previsto', cobros: 0, contado: 0, pagos: 0, gastos: 0 }; lista.push(mapa[k]);
  }
  D.pagos.forEach(function (p) { var m = mapa[p.fecha.slice(0, 7)], c = C.cuenta[p.cuenta]; if (!m || !c) return; if (c.cobro) m.cobros += p.monto; else m.pagos += p.monto; });
  D.cuentas.forEach(function (c) {                                  // Lo pendiente entra en el mes de su vencimiento (lo vencido, en el mes en curso)
    if (c.saldo <= 0.005 || !c.vence) return;
    var m = mapa[c.vence.slice(0, 7) < actual ? actual : c.vence.slice(0, 7)]; if (!m) return;
    if (c.cobro) m.cobros += c.saldo; else m.pagos += c.saldo;
  });
  D.ventas.forEach(function (v) {
    var m = mapa[v[1].slice(0, 7)], it = C.porId[v[2]]; if (!m || !it || cfg.contado.indexOf(v[4]) === -1) return;
    m.contado += v[3] * it.p.precio * (100 + cfg.iva) / 100;
  });
  D.gastos.forEach(function (g) { var m = mapa[g.fecha.slice(0, 7)]; if (m) m.gastos += g.monto; });
  var saldo = cfg.saldo; f.minimo = saldo;
  lista.forEach(function (m) { m.inicial = saldo; m.neto = m.cobros + m.contado - m.pagos - m.gastos; saldo += m.neto; m.fin = saldo; f.minimo = Math.min(f.minimo, saldo); });
  f.flujo = lista; f.saldoFinal = saldo;
  C.fin = f;
  // Evolución mensual (12 meses)
  var meses = []; mapa = {};
  for (var m = 11; m >= 0; m--) {
    var x = new Date(C.hoy.getFullYear(), C.hoy.getMonth() - m, 1), k = x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2);
    mapa[k] = { k: k, etq: MESES[x.getMonth()], ingresos: 0, margen: 0 };
    meses.push(mapa[k]);
  }
  D.ventas.forEach(function (v) {
    var mes = mapa[v[1].slice(0, 7)], it = C.porId[v[2]]; if (!mes || !it) return;
    mes.ingresos += v[3] * it.p.precio; mes.margen += v[3] * (it.p.precio - it.p.costo);
  });
  C.meses = meses;
}

/* ===================== NAVEGACIÓN ===================== */
function seccionDe(vista) {
  if (FORM_SECCION[vista]) return FORM_SECCION[vista];
  for (var s in SECCIONES) { if (SECCIONES[s].tabs.some(function (t) { return t[0] === vista; })) return s; }
  return 'inicio';
}

function mostrar(vista) {
  if (!document.getElementById('v-' + vista) || (D && !permitida(vista))) vista = 'inicio';
  var anterior = ESTADO.vista;
  if (!FORM_SECCION[anterior]) ESTADO.volver = anterior;
  ESTADO.vista = vista;
  var sec = seccionDe(vista), def = SECCIONES[sec];
  [].forEach.call(document.querySelectorAll('.vista'), function (v) { v.classList.toggle('activa', v.id === 'v-' + vista); });
  [].forEach.call(document.querySelectorAll('.riel button'), function (b) { b.classList.toggle('activo', b.getAttribute('data-vista') === sec); });
  $('titulo').textContent = def.titulo;
  $('pestanas').innerHTML = def.tabs.length > 1 ? def.tabs.map(function (t) {
    return '<button data-vista="' + t[0] + '" class="' + (t[0] === vista ? 'activo' : '') + '">' + t[1] + '</button>';
  }).join('') : '';
  $('periodo').style.display = CON_PERIODO[vista] ? '' : 'none';
  $('menu-nuevo').classList.remove('abierto');
  document.querySelector('main').scrollTop = 0;
  if (FORM_SECCION[vista]) prepararFormulario(vista.slice(2));
  else pintar(vista);
}

function pintar(vista) {
  if (!D) return;
  var f = PINTAR[vista || ESTADO.vista];
  if (f) f();
}

function pintarTodo() {
  calcular();
  var criticos = C.items.filter(function (it) { return it.alerta === 'critico'; }).length;
  $('ins-inventario').textContent = criticos || '';
  $('ins-finanzas').textContent = C.fin.vencidas || '';
  pintar();
}

/* ===================== VISTAS ===================== */
var PINTAR = {};

function listaQuiebres(max) {
  var l = C.items.filter(function (it) { return it.dias != null && it.alerta !== 'seguro'; }).sort(function (a, b) { return a.dias - b.dias; }).slice(0, max);
  if (!l.length) return '<div class="vacio">Ningún producto en riesgo de quiebre.</div>';
  return l.map(function (it) {
    return '<div class="item"><i class="punto" style="background:' + COLOR[it.alerta] + '"></i><div class="x"><b>' + esc(it.p.nombre) + '</b><span>' + esc(it.p.sku) + ' · quedan ' + num(it.stock) + ' uds</span></div>' +
      '<div class="y ' + (it.alerta === 'critico' ? 'mal' : 'ojo') + '">' + it.dias + ' días<small>reponer ' + num(it.reponer) + '</small></div></div>';
  }).join('');
}

PINTAR.inicio = function () {
  var r = C.r30, f = C.fin, total = D.ubicaciones.length, ocupadas = D.ubicaciones.filter(function (u) { return u.sku; }).length;
  var criticos = C.items.filter(function (it) { return it.alerta === 'critico'; }).length, prec = C.items.filter(function (it) { return it.alerta === 'precaucion'; }).length;
  var reponer = C.items.reduce(function (s, it) { return s + it.reponer; }, 0), costoRep = C.items.reduce(function (s, it) { return s + it.costoRep; }, 0);
  var delta = r.previo ? (r.ingresos - r.previo) / r.previo * 100 : null;
  $('i-aviso').innerHTML = !D.productos.length ? '<div class="aviso-demo">El catálogo está vacío. Añade productos con <b>+ Nuevo</b>' +
    (D.superadmin ? ' o carga los datos de ejemplo desde <b>Ajustes › Superadmin</b>.' : '.') + '</div>' : '';
  $('i-kpis').innerHTML =
    kpi('Ventas · 30 días', euros(r.ingresos), delta == null ? '' : '<span class="' + (delta >= 0 ? 'bien' : 'mal') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(delta)) + '</span> vs 30 días previos') +
    kpi('Margen neto · 30 días', euros(r.margen), r.ingresos ? pct(r.margen / r.ingresos * 100) + ' sobre ventas' : '') +
    kpi('Quiebres críticos', criticos, prec + ' en precaución', criticos ? 'mal' : 'bien') +
    kpi('Unidades a reponer', num(reponer), 'Inversión ' + euros(costoRep), reponer ? 'ojo' : '') +
    (tiene('posiciones') ? kpi('Ocupación de bodega', total ? pct(ocupadas / total * 100) : '—', ocupadas + ' de ' + total + ' posiciones') : '');
  $('i-quiebres').innerHTML = listaQuiebres(7);
  var ab = D.leads.filter(function (l) { return l.abierto; });
  $('i-embudo-sub').textContent = ab.length + ' prospectos abiertos · ' + euros(ab.reduce(function (s, l) { return s + l.monto; }, 0));
  $('i-embudo').innerHTML = htmlEmbudo(D.leads, 4);
  var sin = ab.filter(function (l) { return l.alerta; }).sort(function (a, b) { return b.sin - a.sin; }).slice(0, 6);
  $('i-leads').innerHTML = sin.length ? sin.map(function (l) {
    return '<div class="item"><div class="x"><b>' + esc(l.empresa) + '</b><span>' + esc(l.etapa.slice(3)) + ' · ' + esc(l.ejecutivo) + '</span></div><div class="y mal">' + l.sin + ' días<small>' + euros(l.monto) + '</small></div></div>';
  }).join('') : '<div class="vacio">Todos los prospectos abiertos tienen seguimiento reciente.</div>';
  $('i-metas').innerHTML = htmlMetas(claveMes(C.hoy));
  var rep = C.items.filter(function (it) { return it.reponer > 0; }).sort(function (a, b) { return (a.dias == null ? 1e9 : a.dias) - (b.dias == null ? 1e9 : b.dias); }).slice(0, 7);
  $('i-reponer').innerHTML = rep.length ? rep.map(function (it) {
    return '<div class="item"><div class="x"><b>' + esc(it.p.nombre) + '</b><span>Stock ' + num(it.stock) + ' · óptimo ' + num(it.optimo) + ' (' + it.cob + ' días)</span></div><div class="y">+' + num(it.reponer) + '<small>' + euros(it.costoRep) + '</small></div></div>';
  }).join('') : '<div class="vacio">Todo el inventario está en su nivel óptimo o por encima.</div>';
  var cu = D.cuentas.filter(function (c) { return c.saldo > 0.005; }).sort(function (a, b) { return a.vence < b.vence ? -1 : 1; }).slice(0, 7);
  $('i-cuentas').innerHTML = cu.length ? cu.map(function (c) {
    var d = c.dias;
    return '<div class="item"><i class="punto" style="background:' + (c.cobro ? COLOR.Alta : COLOR.Baja) + '"></i><div class="x"><b>' + esc(c.contraparte || c.tipo) + '</b><span>' + (c.cobro ? 'Cobro' : 'Pago') + ' · ' + esc(c.numero) + ' · ' +
      (d < 0 ? '<span class="mal">vencida hace ' + (-d) + ' días</span>' : d === 0 ? 'vence hoy' : 'vence en ' + d + ' días') + '</span></div><div class="y">' + (c.cobro ? '+' : '−') + euros(c.saldo) + '</div></div>';
  }).join('') : '<div class="vacio">Sin facturas pendientes.</div>';
};

PINTAR.comercial = function () {
  var r = C.r, delta = r.previo ? (r.ingresos - r.previo) / r.previo * 100 : null, estrella = r.top[0];
  $('c-kpis').innerHTML =
    kpi('Ventas', euros(r.ingresos), delta == null ? '' : '<span class="' + (delta >= 0 ? 'bien' : 'mal') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(delta)) + '</span> vs periodo anterior') +
    kpi('Margen neto', euros(r.margen), r.ingresos ? pct(r.margen / r.ingresos * 100) + ' sobre ventas' : '') +
    kpi('Unidades vendidas', num(r.unidades), r.n + ' días') +
    kpi('Producto estrella', estrella ? esc(estrella.it.p.nombre) : '—', estrella ? 'Margen ' + euros(estrella.margen) : '');
  var max = Math.max.apply(null, r.listaLineas.map(function (l) { return l.ingresos; }).concat([1]));
  $('c-lineas').innerHTML = r.listaLineas.length ? r.listaLineas.map(function (l) {
    var w = function (x) { return Math.max(0, x) / max * 100; };
    return '<div class="fila-barra"><div class="cab"><b>' + esc(l.linea) + '</b><span>' + euros(l.margen) + ' · ' + (l.ingresos ? pct(l.margen / l.ingresos * 100) : '—') + '</span></div>' +
      '<div class="barra" style="height:12px"><i style="width:' + w(l.costo) + '%;background:var(--pista2)"></i><i style="width:' + w(l.merma) + '%;background:var(--rojo)"></i><i style="width:' + w(l.margen) + '%;background:var(--verde)"></i></div></div>';
  }).join('') : '<div class="vacio">Sin ventas en el periodo.</div>';
  var maxMes = Math.max.apply(null, C.meses.map(function (m) { return m.ingresos; }).concat([1]));
  $('c-evolucion').innerHTML = C.meses.map(function (m) {
    return '<div class="col" title="' + m.etq + ': ' + euros(m.ingresos) + ' · margen ' + euros(m.margen) + '"><div class="b" style="height:' + (m.ingresos / maxMes * 100) + '%"><i style="height:' + (m.ingresos ? Math.max(0, m.margen) / m.ingresos * 100 : 0) + '%"></i></div><span>' + m.etq + '</span></div>';
  }).join('');
  $('c-top').innerHTML = '<tr><th>#</th><th>Producto</th><th>Línea</th><th class="n">Unidades</th><th class="n">Ventas</th><th class="n">Margen</th><th class="n">% margen</th></tr>' +
    (r.top.slice(0, 12).map(function (p, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="largo"><b>' + esc(p.it.p.nombre) + '</b><br><span class="tenue">' + esc(p.it.p.sku) + '</span></td><td>' + esc(p.it.p.linea) + '</td><td class="n">' + num(p.unidades) + '</td><td class="n">' + euros(p.ingresos) + '</td><td class="n"><b>' + euros(p.margen) + '</b></td><td class="n">' + (p.ingresos ? pct(p.margen / p.ingresos * 100) : '—') + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="vacio">Sin ventas en el periodo.</td></tr>');
  var canales = Object.keys(r.canales).sort(function (a, b) { return r.canales[b] - r.canales[a]; });
  $('c-canales').innerHTML = canales.map(function (c, i) {
    var p = r.ingresos ? r.canales[c] / r.ingresos * 100 : 0;
    return '<div class="fila-barra"><div class="cab"><b>' + esc(c) + '</b><span>' + euros(r.canales[c]) + ' · ' + pct(p) + '</span></div><div class="barra"><i style="width:' + p + '%;background:' + PALETA[i % PALETA.length] + '"></i></div></div>';
  }).join('') || '<div class="vacio">Sin ventas en el periodo.</div>';
};

/** Barras del embudo: prospectos y valor por etapa (hasta la etapa indicada). */
function htmlEmbudo(leads, hasta) {
  var et = D.listas.ETAPA.slice(0, hasta == null ? 6 : hasta), datos = et.map(function (e) { var l = leads.filter(function (x) { return x.etapa === e; }); return { e: e, n: l.length, v: l.reduce(function (s, x) { return s + x.monto; }, 0) }; });
  var max = Math.max.apply(null, datos.map(function (d) { return d.n; }).concat([1]));
  return datos.map(function (d, i) {
    return '<div class="fila-barra"><div class="cab"><b>' + esc(d.e) + '</b><span>' + d.n + ' · ' + euros(d.v) + '</span></div><div class="barra" style="height:12px"><i style="width:' + (d.n / max * 100) + '%;background:' + (i === 4 ? 'var(--verde)' : i === 5 ? 'var(--rojo)' : PALETA[i % PALETA.length]) + '"></i></div></div>';
  }).join('');
}

function ganadoEn(ejecutivo, mes) {
  return D.leads.filter(function (l) { return l.ganado && l.ejecutivo === ejecutivo && l.cierre.slice(0, 7) === mes; }).reduce(function (s, l) { return s + l.monto; }, 0);
}
function metaDe(ejecutivo, mes) { var m = D.metas.filter(function (x) { return x.ejecutivo === ejecutivo && x.mes === mes; })[0]; return m ? m.meta : 0; }
function htmlMetas(mes) {
  return C.ejecutivos.map(function (e) {
    var g = ganadoEn(e, mes), m = metaDe(e, mes), p = m ? g / m * 100 : 0;
    return '<div class="fila-barra"><div class="cab"><b>' + esc(e) + '</b><span>' + euros(g) + (m ? ' de ' + euros(m) + ' · <span class="' + (p >= 100 ? 'bien' : p >= 60 ? 'ojo' : 'mal') + '">' + Math.round(p) + ' %</span>' : ' · sin meta') + '</span></div><div class="barra"><i style="width:' + Math.min(100, p) + '%;background:' + (p >= 100 ? 'var(--verde)' : p >= 60 ? 'var(--ambar)' : 'var(--rojo)') + '"></i></div></div>';
  }).join('') || '<div class="vacio">Aún no hay ejecutivos ni metas.</div>';
}
function tasaCierre(leads) { var g = leads.filter(function (l) { return l.ganado; }).length, c = leads.filter(function (l) { return !l.abierto; }).length; return c ? g / c * 100 : null; }

PINTAR.embudo = function () {
  var ej = $('e-ejecutivo').value, q = $('e-buscar').value.trim().toLowerCase();
  var l = D.leads.filter(function (x) { return (!ej || x.ejecutivo === ej) && (!q || (x.empresa + ' ' + x.contacto).toLowerCase().indexOf(q) > -1); });
  var ab = l.filter(function (x) { return x.abierto; }), tasa = tasaCierre(l), sin = ab.filter(function (x) { return x.alerta; }).length;
  var mes = claveMes(C.hoy), gan = l.filter(function (x) { return x.ganado && x.cierre.slice(0, 7) === mes; });
  $('e-kpis').innerHTML =
    kpi('Prospectos abiertos', ab.length, 'En las etapas 1 a 4') +
    kpi('Valor del embudo', euros(ab.reduce(function (s, x) { return s + x.monto; }, 0)), 'Monto estimado de lo abierto') +
    kpi('Ganado este mes', euros(gan.reduce(function (s, x) { return s + x.monto; }, 0)), gan.length + ' prospectos · tasa de cierre ' + (tasa == null ? '—' : Math.round(tasa) + ' %'), 'bien') +
    kpi('Sin seguimiento', sin, 'Más de ' + D.config.diasLead + ' días sin contacto', sin ? 'mal' : 'bien');
  $('e-tablero').innerHTML = D.listas.ETAPA.map(function (e, i) {
    var col = l.filter(function (x) { return x.etapa === e; }).sort(function (a, b) { return i < 4 ? b.sin - a.sin : (a.cierre > b.cierre ? -1 : 1); }), tope = i < 4 ? 40 : 8;
    return '<div class="etapa" data-etapa="' + esc(e) + '"><h4>' + esc(e) + '<span>' + col.length + '</span></h4><div class="val">' + euros(col.reduce(function (s, x) { return s + x.monto; }, 0)) + '</div>' +
      col.slice(0, tope).map(function (x) {
        return '<div class="lead' + (x.alerta ? ' alerta' : '') + '" draggable="true" data-id="' + esc(x.id) + '" title="' + esc((x.nota ? x.nota.tipo + ' ' + fecha(x.nota.fecha) + ': ' + x.nota.resumen + '\n' : '') + x.notas) + '"><b>' + esc(x.empresa) + '</b><div class="l2">' + esc(x.contacto) + ' · ' + esc(x.interes) + '</div>' +
          '<div class="l3"><span>' + euros(x.monto) + '</span>' + (x.abierto ? chip(x.alerta ? 'rojo' : 'gris', x.sin === 0 ? 'hoy' : x.sin + ' d sin contacto') : chip(x.ganado ? 'verde' : 'gris', fecha(x.cierre))) + '</div>' +
          '<div class="l2" style="margin:6px 0 0">' + esc(x.ejecutivo) + '</div>' +
          '<div class="l4"><select data-lead="' + esc(x.id) + '">' + D.listas.ETAPA.map(function (o) { return '<option' + (o === e ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + (x.abierto ? '<button class="btn mini" data-accion="contactar" data-id="' + esc(x.id) + '" title="Registrar un contacto">+ Contacto</button>' : '') + '</div></div>';
      }).join('') + (col.length > tope ? '<div class="mas">y ' + (col.length - tope) + ' más</div>' : '') + (col.length ? '' : '<div class="mas">Sin prospectos</div>') + '</div>';
  }).join('');
  $('e-cuenta').textContent = l.length + ' prospectos · arrastra una tarjeta para cambiarla de etapa';
};

PINTAR.equipo = function () {
  var mes = $('q-mes').value || claveMes(C.hoy), tg = 0, tm = 0;
  var filas = C.ejecutivos.map(function (e) {
    var l = D.leads.filter(function (x) { return x.ejecutivo === e; }), ab = l.filter(function (x) { return x.abierto; });
    var g = ganadoEn(e, mes), m = metaDe(e, mes), p = m ? g / m * 100 : null, tasa = tasaCierre(l), sin = ab.filter(function (x) { return x.alerta; }).length;
    var contactos = D.bitacora.filter(function (b) { return b.ejecutivo === e && b.fecha.slice(0, 7) === mes; }).length;
    tg += g; tm += m;
    return '<tr><td><b>' + esc(e) + '</b></td><td class="n">' + ab.length + '</td><td class="n">' + euros(ab.reduce(function (s, x) { return s + x.monto; }, 0)) + '</td><td class="n">' + l.filter(function (x) { return x.ganado && x.cierre.slice(0, 7) === mes; }).length + '</td><td class="n"><b>' + euros(g) + '</b></td><td class="n">' + (m ? euros(m) : '—') + '</td>' +
      '<td style="min-width:150px">' + (p == null ? '<span class="tenue">Sin meta</span>' : '<div style="display:flex;align-items:center;gap:8px"><div class="barra" style="flex:1"><i style="width:' + Math.min(100, p) + '%;background:' + (p >= 100 ? 'var(--verde)' : p >= 60 ? 'var(--ambar)' : 'var(--rojo)') + '"></i></div><b style="width:44px;text-align:right">' + Math.round(p) + ' %</b></div>') + '</td>' +
      '<td class="n">' + (tasa == null ? '—' : Math.round(tasa) + ' %') + '</td><td class="n">' + contactos + '</td><td class="n">' + (sin ? '<b class="mal">' + sin + '</b>' : '0') + '</td></tr>';
  });
  $('eq-tabla').innerHTML = '<tr><th>Ejecutivo</th><th class="n">Abiertos</th><th class="n">Valor del embudo</th><th class="n">Ganados en el mes</th><th class="n">Monto ganado</th><th class="n">Meta</th><th>Cumplimiento</th><th class="n">Tasa de cierre</th><th class="n">Contactos del mes</th><th class="n">Sin seguimiento</th></tr>' +
    (filas.join('') || '<tr><td colspan="10" class="vacio">Aún no hay ejecutivos. Añade prospectos o metas.</td></tr>');
  var tasa = tasaCierre(D.leads), ab = D.leads.filter(function (x) { return x.abierto; });
  $('eq-kpis').innerHTML =
    kpi('Ganado en ' + mesTxt(mes), euros(tg), tm ? Math.round(tg / tm * 100) + ' % de la meta del equipo' : 'Sin meta definida', tm && tg >= tm ? 'bien' : '') +
    kpi('Meta del equipo', tm ? euros(tm) : '—', tm ? 'Faltan ' + euros(Math.max(0, tm - tg)) : '') +
    kpi('Tasa de cierre', tasa == null ? '—' : Math.round(tasa) + ' %', 'Ganados sobre prospectos cerrados') +
    kpi('Embudo abierto', euros(ab.reduce(function (s, x) { return s + x.monto; }, 0)), ab.length + ' prospectos');
  $('eq-embudo').innerHTML = htmlEmbudo(D.leads);
  var canales = unicos(D.leads.map(function (l) { return l.canal; })).map(function (c) { var l = D.leads.filter(function (x) { return x.canal === c; }); return { c: c, n: l.length, t: tasaCierre(l) }; }).sort(function (a, b) { return b.n - a.n; });
  var max = Math.max.apply(null, canales.map(function (c) { return c.n; }).concat([1]));
  $('eq-canales').innerHTML = canales.map(function (c, i) {
    return '<div class="fila-barra"><div class="cab"><b>' + esc(c.c || 'Sin canal') + '</b><span>' + c.n + ' · cierre ' + (c.t == null ? '—' : Math.round(c.t) + ' %') + '</span></div><div class="barra"><i style="width:' + (c.n / max * 100) + '%;background:' + PALETA[i % PALETA.length] + '"></i></div></div>';
  }).join('') || '<div class="vacio">Sin prospectos.</div>';
  $('eq-bitacora').innerHTML = D.bitacora.slice().sort(function (a, b) { return a.fecha > b.fecha ? -1 : 1; }).slice(0, 7).map(function (b) {
    var l = C.lead[b.lead];
    return '<div class="item"><div class="x"><b>' + esc(l ? l.empresa : b.lead) + '</b><span>' + esc(b.tipo) + ' · ' + esc(b.ejecutivo) + ' · ' + esc(b.resumen) + '</span></div><div class="y"><small>' + fecha(b.fecha) + '</small></div></div>';
  }).join('') || '<div class="vacio">Sin contactos registrados.</div>';
  $('eq-cuenta').textContent = C.ejecutivos.length + ' ejecutivos';
};

function coincide(it, texto) {
  texto = texto.trim().toLowerCase();
  return !texto || (it.p.nombre + ' ' + it.p.sku).toLowerCase().indexOf(texto) > -1;
}

PINTAR.ventas = function () {
  var q = $('ve-buscar').value, canal = $('ve-canal').value, filas = [], total = 0;
  for (var i = D.ventas.length - 1; i >= 0; i--) {
    var v = D.ventas[i], it = C.porId[v[2]];
    if (canal && v[4] !== canal) continue;
    if (q && (!it || !coincide(it, q))) continue;
    total++;
    if (filas.length < 300) filas.push('<tr><td>' + esc(v[0]) + '</td><td>' + fecha(v[1]) + '</td><td class="largo">' + (it ? '<b>' + esc(it.p.nombre) + '</b> <span class="tenue">' + esc(it.p.sku) + '</span>' : esc(v[2])) + '</td><td class="n">' + num(v[3]) + '</td><td>' + esc(v[4]) + '</td><td class="n">' + (it ? euros2(it.p.precio - it.p.costo) : '') + '</td><td class="n"><b>' + (it ? euros2(v[3] * it.p.precio) : '') + '</b></td></tr>');
  }
  $('ve-tabla').innerHTML = '<tr><th>ID</th><th>Fecha</th><th>Producto</th><th class="n">Cantidad</th><th>Canal</th><th class="n">Margen unitario</th><th class="n">Importe</th></tr>' + (filas.join('') || '<tr><td colspan="7" class="vacio">Sin ventas.</td></tr>');
  $('ve-cuenta').textContent = num(total) + ' ventas' + (total > 300 ? ' · se muestran las 300 más recientes' : '');
};

PINTAR.catalogo = function () {
  var q = $('ca-buscar').value, cat = $('ca-categoria').value;
  var l = C.items.filter(function (it) { return coincide(it, q) && (!cat || it.p.categoria === cat); });
  $('ca-tabla').innerHTML = '<tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Línea</th><th class="n">Precio</th><th class="n">Costo</th><th class="n">Margen</th><th class="n">Stock</th><th>Rotación</th></tr>' +
    (l.map(function (it) {
      var p = it.p, m = p.precio - p.costo;
      return '<tr><td>' + esc(p.sku) + '</td><td class="largo"><b>' + esc(p.nombre) + '</b></td><td>' + esc(p.categoria) + '</td><td>' + esc(p.linea) + '</td><td class="n">' + euros2(p.precio) + '</td><td class="n">' + euros2(p.costo) + '</td><td class="n">' + euros2(m) + ' <span class="tenue">' + (p.precio ? pct(m / p.precio * 100) : '') + '</span></td><td class="n">' + num(it.stock) + '</td><td>' + chip(it.rot === 'Alta' ? 'verde' : it.rot === 'Media' ? 'ambar' : 'rojo', it.rot) + '</td></tr>';
    }).join('') || '<tr><td colspan="9" class="vacio">Sin productos.</td></tr>');
  $('ca-cuenta').textContent = l.length + ' productos';
};

PINTAR.inventario = function () {
  var f = C.fin, n = { critico: 0, precaucion: 0, seguro: 0, sin: 0 };
  C.items.forEach(function (it) { n[it.alerta]++; });
  var reponer = C.items.reduce(function (s, it) { return s + it.reponer; }, 0), costoRep = C.items.reduce(function (s, it) { return s + it.costoRep; }, 0);
  var exceso = C.items.reduce(function (s, it) { return s + it.exceso * it.p.costo; }, 0);
  $('n-kpis').innerHTML =
    kpi('Valor del inventario', euros(f.valorStock), C.items.length + ' productos · al costo') +
    kpi('Quiebres críticos', n.critico, 'Menos de ' + D.config.critico + ' días de stock', n.critico ? 'mal' : 'bien') +
    kpi('Unidades a reponer', num(reponer), 'Inversión ' + euros(costoRep), reponer ? 'ojo' : '') +
    kpi('Exceso sobre el óptimo', euros(exceso), 'Stock por encima de la cobertura');
  var total = C.items.length || 1;
  $('n-estado').innerHTML = ['critico', 'precaucion', 'seguro', 'sin'].map(function (k) {
    return '<div class="fila-barra"><div class="cab"><b>' + ALERTA[k][1] + '</b><span>' + n[k] + ' productos</span></div><div class="barra"><i style="width:' + (n[k] / total * 100) + '%;background:' + COLOR[k] + '"></i></div></div>';
  }).join('') + '<p class="nota-form">Ritmo diario = ' + D.config.peso90 + ' % de los últimos 90 días + ' + D.config.pesoAA + ' % del mismo periodo del año anterior.</p>';
  var cats = C.categorias.map(function (c) {
    var l = C.items.filter(function (it) { return it.p.categoria === c; });
    return { c: c, stock: l.reduce(function (s, it) { return s + Math.max(0, it.stock); }, 0), optimo: l.reduce(function (s, it) { return s + it.optimo; }, 0), n: l.length };
  }).filter(function (x) { return x.n; });
  $('n-categorias').innerHTML = cats.map(function (x) {
    var max = Math.max(x.stock, x.optimo, 1), dif = x.stock - x.optimo;
    return '<div class="fila-barra"><div class="cab"><b>' + esc(x.c) + '</b><span>' + num(x.stock) + ' / ' + num(x.optimo) + ' · <span class="' + (dif < 0 ? 'ojo' : 'tenue') + '">' + (dif < 0 ? 'faltan ' + num(-dif) : 'sobran ' + num(dif)) + '</span></span></div>' +
      '<div class="barra" style="position:relative;overflow:visible"><i style="width:' + (x.stock / max * 100) + '%;background:var(--azul);border-radius:5px"></i><i style="position:absolute;left:' + (x.optimo / max * 100) + '%;top:-3px;width:3px;height:14px;background:var(--fuerte);border-radius:2px;margin-left:-2px"></i></div></div>';
  }).join('') || '<div class="vacio">Sin productos.</div>';
  $('n-quiebres').innerHTML = listaQuiebres(8);
};

PINTAR.stock = function () {
  var q = $('s-buscar').value, cat = $('s-categoria').value, al = $('s-alerta').value;
  var l = C.items.filter(function (it) { return coincide(it, q) && (!cat || it.p.categoria === cat) && (!al || it.alerta === al); })
    .sort(function (a, b) { return (a.dias == null ? 1e9 : a.dias) - (b.dias == null ? 1e9 : b.dias); });
  $('s-tabla').innerHTML = '<tr><th>SKU</th><th>Producto</th><th class="n">Stock actual</th><th class="n">Venta 90 días</th><th class="n">Mismo periodo año ant.</th><th class="n">Ritmo diario</th><th>Días de stock</th><th>Alerta</th><th class="n">Óptimo</th><th class="n">A reponer</th></tr>' +
    (l.map(function (it) {
      var w = it.dias == null ? 0 : Math.min(100, it.dias / 90 * 100);
      return '<tr><td>' + esc(it.p.sku) + '</td><td class="largo"><b>' + esc(it.p.nombre) + '</b><br><span class="tenue">' + esc(it.p.categoria) + '</span></td><td class="n"><b>' + num(it.stock) + '</b></td><td class="n">' + num(it.v90) + '</td><td class="n">' + num(it.vaa) + '</td><td class="n">' + it.ritmo.toFixed(1).replace('.', ',') + '</td>' +
        '<td style="min-width:130px"><div style="display:flex;align-items:center;gap:8px"><div class="barra" style="flex:1"><i style="width:' + w + '%;background:' + COLOR[it.alerta] + '"></i></div><b style="width:38px;text-align:right">' + (it.dias == null ? '—' : it.dias) + '</b></div></td>' +
        '<td>' + chip(ALERTA[it.alerta][0], ALERTA[it.alerta][1]) + '</td><td class="n">' + num(it.optimo) + '</td><td class="n">' + (it.reponer ? '<b class="ojo">+' + num(it.reponer) + '</b>' : '<span class="tenue">0</span>') + '</td></tr>';
    }).join('') || '<tr><td colspan="10" class="vacio">Sin productos.</td></tr>');
  $('s-cuenta').textContent = l.length + ' productos';
};

PINTAR.reposicion = function () {
  var reponer = 0, costo = 0, skus = 0, exceso = 0;
  C.items.forEach(function (it) { reponer += it.reponer; costo += it.costoRep; if (it.reponer) skus++; exceso += it.exceso * it.p.costo; });
  $('r-kpis').innerHTML =
    kpi('Unidades a reponer', num(reponer), skus + ' productos bajo el óptimo', reponer ? 'ojo' : 'bien') +
    kpi('Inversión para reponer', euros(costo), 'Al costo unitario estándar') +
    kpi('Inventario óptimo', num(C.items.reduce(function (s, it) { return s + it.optimo; }, 0)) + ' uds', 'Según cobertura por categoría') +
    kpi('Exceso sobre el óptimo', euros(exceso), 'Capital por encima de la cobertura');
  if (!$('r-cobertura').contains(document.activeElement)) {
    $('r-cobertura').innerHTML = C.categorias.map(function (c) {
      return '<div class="cob"><b>' + esc(c) + '</b><input type="number" min="0" max="720" step="1" data-cat="' + esc(c) + '" value="' + coberturaDe(c) + '"><small>días</small></div>';
    }).join('') || '<div class="vacio">Aún no hay categorías.</div>';
  }
  var cambios = coberturaCambiada();
  $('r-guardar').disabled = !cambios; $('r-deshacer').disabled = !cambios;
  var cat = $('r-categoria').value, ver = $('r-ver').value;
  var l = C.items.filter(function (it) { return (!cat || it.p.categoria === cat) && (ver === 'todo' || (ver === 'reponer' ? it.reponer > 0 : it.exceso > 0)); })
    .sort(function (a, b) { return ver === 'exceso' ? b.exceso * b.p.costo - a.exceso * a.p.costo : b.costoRep - a.costoRep; });
  $('r-sub').textContent = 'Diferencia entre el inventario óptimo y el stock actual' + (cambios ? ' · vista previa con los días sin guardar' : '');
  $('r-tabla').innerHTML = '<tr><th>Producto</th><th>Categoría</th><th class="n">Cobertura</th><th class="n">Ritmo diario</th><th class="n">Stock actual</th><th class="n">Óptimo</th><th class="n">A reponer</th><th class="n">Inversión</th></tr>' +
    (l.map(function (it) {
      return '<tr><td class="largo"><b>' + esc(it.p.nombre) + '</b><br><span class="tenue">' + esc(it.p.sku) + '</span></td><td>' + esc(it.p.categoria) + '</td><td class="n">' + it.cob + ' días</td><td class="n">' + it.ritmo.toFixed(1).replace('.', ',') + '</td><td class="n">' + num(it.stock) + '</td><td class="n">' + num(it.optimo) + '</td>' +
        '<td class="n">' + (it.reponer ? '<b class="ojo">+' + num(it.reponer) + '</b>' : '<span class="tenue">sobran ' + num(it.exceso) + '</span>') + '</td><td class="n">' + (it.reponer ? euros(it.costoRep) : '—') + '</td></tr>';
    }).join('') || '<tr><td colspan="8" class="vacio">' + (ver === 'reponer' ? 'No hay nada que reponer con esta cobertura.' : 'Sin productos.') + '</td></tr>') +
    (l.length && ver !== 'exceso' ? '<tr class="total"><td colspan="6">Total</td><td class="n">+' + num(l.reduce(function (s, it) { return s + it.reponer; }, 0)) + '</td><td class="n">' + euros(l.reduce(function (s, it) { return s + it.costoRep; }, 0)) + '</td></tr>' : '');
};

function coberturaGuardada() { var m = {}; D.cobertura.forEach(function (x) { m[x.categoria] = x.dias; }); return m; }
function coberturaCambiada() {
  var g = coberturaGuardada();
  return C.categorias.some(function (c) { return coberturaDe(c) !== (g[c] != null ? g[c] : D.config.cobertura); });
}

PINTAR.movimientos = function () {
  var q = $('m-buscar').value.trim().toLowerCase(), tipo = $('m-tipo').value, filas = [], total = 0;
  var clase = { 'Ingreso Existencia': 'verde', 'Salida Venta': 'azul', 'Merma / Daño': 'rojo', 'Transferencia': 'gris', 'Ajuste Entrada': 'ambar', 'Ajuste Salida': 'ambar' };
  var pos = function (id) { return C.ubi[id] ? C.ubi[id].u.pos : id; };
  for (var i = D.movimientos.length - 1; i >= 0; i--) {
    var m = D.movimientos[i], it = C.porSku[m[3]];
    if (tipo && m[2] !== tipo) continue;
    if (q && (m[3] + ' ' + (it ? it.p.nombre : '') + ' ' + pos(m[5]) + ' ' + pos(m[6]) + ' ' + m[7]).toLowerCase().indexOf(q) === -1) continue;
    total++;
    if (filas.length < 300) filas.push('<tr><td>' + esc(m[0]) + '</td><td>' + fecha(m[1]) + ' <span class="tenue">' + m[1].slice(11) + '</span></td><td>' + chip(clase[m[2]] || 'gris', m[2]) + '</td><td class="largo"><b>' + esc(it ? it.p.nombre : m[3]) + '</b> <span class="tenue">' + esc(m[3]) + '</span></td><td class="n"><b>' + (m[2] === 'Ingreso Existencia' || m[2] === 'Ajuste Entrada' ? '+' : m[2] === 'Transferencia' ? '' : '−') + num(m[4]) + '</b></td><td>' + esc(pos(m[5]) || '—') + '</td><td>' + esc(pos(m[6]) || '—') + '</td><td>' + esc(m[7]) + '</td></tr>');
  }
  $('m-tabla').innerHTML = '<tr><th>ID</th><th>Fecha y hora</th><th>Tipo</th><th>Producto</th><th class="n">Cantidad</th><th>Origen</th><th>Destino</th><th>Responsable</th></tr>' + (filas.join('') || '<tr><td colspan="8" class="vacio">Sin movimientos.</td></tr>');
  $('m-cuenta').textContent = num(total) + ' movimientos' + (total > 300 ? ' · se muestran los 300 más recientes' : '');
};

/* ---------- Posiciones ---------- */
function colorUbi(x) {
  var m = ESTADO.color, it = x.it;
  if (m === 'disponibilidad') return it ? COLOR.Ocupado : COLOR.Libre;
  if (!it) return COLOR.vacio;
  if (m === 'rotacion') return COLOR[it.rot];
  if (m === 'quiebre') return COLOR[it.alerta];
  return PALETA[Math.max(0, C.categorias.indexOf(it.p.categoria)) % PALETA.length];
}

function leyendaColor() {
  var m = ESTADO.color, cuenta = {}, l;
  D.ubicaciones.forEach(function (u) {
    var x = C.ubi[u.id]; if (!pasaFiltro(x)) return; var k = m === 'disponibilidad' ? (x.it ? 'Ocupado' : 'Libre') : !x.it ? '_' : m === 'rotacion' ? x.it.rot : m === 'quiebre' ? x.it.alerta : x.it.p.categoria;
    cuenta[k] = (cuenta[k] || 0) + 1;
  });
  if (m === 'rotacion') l = [['Alta', 'Rotación alta', COLOR.Alta], ['Media', 'Media', COLOR.Media], ['Baja', 'Baja', COLOR.Baja]];
  else if (m === 'disponibilidad') l = [['Ocupado', 'Ocupado', COLOR.Ocupado], ['Libre', 'Libre', COLOR.Libre]];
  else if (m === 'quiebre') l = [['critico', 'Crítico', COLOR.critico], ['precaucion', 'Precaución', COLOR.precaucion], ['seguro', 'Seguro', COLOR.seguro], ['sin', 'Sin ventas', COLOR.sin]];
  else l = C.categorias.map(function (c, i) { return [c, c, PALETA[i % PALETA.length]]; });
  if (m !== 'disponibilidad') l.push(['_', 'Libre', COLOR.vacio]);
  return l.filter(function (x) { return cuenta[x[0]]; }).map(function (x) { return '<span><i style="background:' + x[2] + '"></i>' + esc(x[1]) + ' · ' + cuenta[x[0]] + '</span>'; }).join('');
}

function marcarSegmento(id, atributo, valor) {
  [].forEach.call($(id).querySelectorAll('button'), function (b) { b.classList.toggle('activo', b.getAttribute(atributo) === valor); });
}

function pintarPanelPosicion() {
  var x = ESTADO.sel ? C.ubi[ESTADO.sel] : null, h;
  if (!x) {
    var total = D.ubicaciones.length, oc = D.ubicaciones.filter(function (u) { return u.sku; }).length;
    h = '<h3>Ocupación de la bodega</h3><div class="sub">Pulsa una posición para ver su detalle</div>' +
      '<div class="dato" style="border-top:0"><span>Posiciones</span><b>' + total + '</b></div><div class="dato"><span>Ocupadas</span><b>' + oc + (total ? ' · ' + pct(oc / total * 100) : '') + '</b></div><div class="dato"><span>Libres</span><b>' + (total - oc) + '</b></div>' +
      '<div class="dato"><span>Con producto de baja rotación</span><b class="mal">' + D.ubicaciones.filter(function (u) { var y = C.ubi[u.id]; return y.it && y.it.rot === 'Baja'; }).length + '</b></div>' +
      '<div class="dato"><span>Con riesgo de quiebre crítico</span><b class="mal">' + D.ubicaciones.filter(function (u) { var y = C.ubi[u.id]; return y.it && y.it.alerta === 'critico'; }).length + '</b></div>';
  } else if (!x.it) {
    h = '<h3>' + esc(x.u.pos) + '</h3><div class="sub">Pasillo ' + esc(x.u.pasillo) + ' · rack ' + x.u.rack + ' · nivel ' + x.u.nivel + '</div>' + chip('verde', 'Libre') +
      (x.u.sku ? '<p class="nota-form">Tiene asignado el SKU ' + esc(x.u.sku) + ', que no está en el catálogo.</p>' : '') +
      '<div class="campo" style="margin-top:16px"><label>Asignar un producto a esta posición</label><select id="b-asignar"><option value="">Elige un producto…</option>' +
      C.items.map(function (it) { return '<option value="' + esc(it.p.sku) + '">' + esc(it.p.sku + ' · ' + it.p.nombre) + '</option>'; }).join('') + '</select></div>' +
      '<div class="pie-form"><button class="btn primario" data-accion="asignar">Asignar</button><button class="btn" data-accion="ingresoAqui">Registrar ingreso</button></div>';
  } else {
    var it = x.it;
    h = '<h3>' + esc(x.u.pos) + '</h3><div class="sub">Pasillo ' + esc(x.u.pasillo) + ' · rack ' + x.u.rack + ' · nivel ' + x.u.nivel + '</div>' +
      '<div style="font-size:16px;font-weight:700;margin-bottom:2px">' + esc(it.p.nombre) + '</div><div class="tenue" style="margin-bottom:10px">' + esc(it.p.sku) + ' · ' + esc(it.p.categoria) + ' · ' + esc(it.p.linea) + '</div>' +
      chip(ALERTA[it.alerta][0], ALERTA[it.alerta][1]) + ' ' + chip(it.rot === 'Alta' ? 'verde' : it.rot === 'Media' ? 'ambar' : 'rojo', 'Rotación ' + it.rot.toLowerCase()) +
      '<div class="dato" style="margin-top:12px"><span>Stock en esta posición</span><b>' + num(x.stock) + ' uds</b></div>' +
      '<div class="dato"><span>Stock total del producto</span><b>' + num(it.stock) + ' uds en ' + it.ubis.length + ' posic.</b></div>' +
      '<div class="dato"><span>Venta últimos 90 días</span><b>' + num(it.v90) + '</b></div>' +
      '<div class="dato"><span>Mismo periodo año anterior</span><b>' + num(it.vaa) + '</b></div>' +
      '<div class="dato"><span>Días de stock restantes</span><b class="' + (it.alerta === 'critico' ? 'mal' : it.alerta === 'precaucion' ? 'ojo' : '') + '">' + (it.dias == null ? 'Sin ventas' : it.dias + ' días') + '</b></div>' +
      '<div class="dato"><span>Inventario óptimo (' + it.cob + ' días)</span><b>' + num(it.optimo) + ' uds</b></div>' +
      '<div class="dato"><span>Unidades a reponer</span><b class="' + (it.reponer ? 'ojo' : '') + '">' + (it.reponer ? '+' + num(it.reponer) : '0') + '</b></div>' +
      '<div class="dato"><span>Valor inmovilizado</span><b>' + euros(it.valor) + '</b></div>' +
      '<div class="pie-form" style="flex-wrap:wrap"><button class="btn primario" data-accion="moverDesde">Registrar movimiento</button><button class="btn" data-accion="liberar">Liberar posición</button></div>';
  }
  $('b-panel').innerHTML = resumenFiltro() + h;
}

PINTAR.posiciones = function () {
  marcarSegmento('b-color', 'data-color', ESTADO.color);
  marcarSegmento('b-calidad', 'data-calidad', ESTADO.calidad);
  var pasillos = unicos(D.ubicaciones.map(function (u) { return u.pasillo; }));
  pintarFiltros();
  $('b-leyenda').innerHTML = leyendaColor();
  pintarPanelPosicion();
  BODEGA.mostrar();
};

PINTAR.ubicaciones = function () {
  marcarSegmento('u-color', 'data-color', ESTADO.color);
  pintarFiltros();
  $('u-leyenda').innerHTML = leyendaColor();
  var pasillos = unicos(D.ubicaciones.map(function (u) { return u.pasillo; }));
  $('u-mapa').innerHTML = resumenFiltro() + pasillos.filter(function (p) { return !ESTADO.filtro.pasillo || p === ESTADO.filtro.pasillo; }).map(function (p) {
    var l = D.ubicaciones.filter(function (u) { return u.pasillo === p; });
    var racks = unicos(l.map(function (u) { return u.rack; })).sort(function (a, b) { return a - b; }), niveles = unicos(l.map(function (u) { return u.nivel; })).sort(function (a, b) { return b - a; });
    var h = '<div class="t pasillo"><h3>Pasillo ' + esc(p) + '</h3><div class="malla" style="grid-template-columns:54px repeat(' + racks.length + ',minmax(0,1fr))">';
    niveles.forEach(function (n) {
      h += '<div class="nivel-etq">Nivel ' + n + '</div>';
      racks.forEach(function (r) {
        var u = l.filter(function (u) { return u.rack === r && u.nivel === n; })[0];
        if (!u) { h += '<div></div>'; return; }
        var x = C.ubi[u.id];
        h += '<div class="celda' + (x.it ? '' : ' libre') + (pasaFiltro(x) ? '' : ' oculta') + (ESTADO.sel === u.id ? ' sel' : '') + '" data-accion="verPosicion" data-id="' + esc(u.id) + '" style="background:' + colorUbi(x) + '" title="' + esc(u.pos + (x.it ? ' · ' + x.it.p.nombre + ' · ' + x.stock + ' uds' : ' · Libre')) + '">' + esc(u.pos) + '<small>' + (x.it ? esc(x.it.p.sku) : 'Libre') + '</small></div>';
      });
    });
    return h + '</div></div>';
  }).join('') || '<div class="t vacio">El maestro de bodega no tiene ubicaciones.</div>';
  $('u-cuenta').textContent = D.ubicaciones.length + ' posiciones · pulsa una para verla en 3D';
};

/* ---------- Finanzas ---------- */
PINTAR.finanzas = function () {
  var r = C.r, resultado = r.margen - r.gastos;
  $('f-kpis').innerHTML =
    kpi('Ingresos', euros(r.ingresos), r.n + ' días') +
    kpi('Margen neto de producto', euros(r.margen), r.ingresos ? pct(r.margen / r.ingresos * 100) + ' sobre ventas' : '') +
    kpi('Gastos operativos', euros(r.gastos), r.ingresos ? pct(r.gastos / r.ingresos * 100) + ' de las ventas' : '') +
    kpi('Resultado operativo', euros(resultado), 'Margen neto − gastos', resultado >= 0 ? 'bien' : 'mal');
  var fin = C.fin, facturado = 0, cobrado = 0;
  D.cuentas.forEach(function (c) { var d = diasDesde(c.emision); if (c.cobro && d >= 0 && d < r.n) facturado += c.total; });
  D.pagos.forEach(function (p) { var c = C.cuenta[p.cuenta], d = diasDesde(p.fecha); if (c && c.cobro && d >= 0 && d < r.n) cobrado += p.monto; });
  $('f-kpis2').innerHTML =
    kpi('Facturado a clientes', euros(facturado), r.n + ' días · con IVA') +
    kpi('Cobrado', euros(cobrado), facturado ? Math.round(cobrado / facturado * 100) + ' % de lo facturado' : '', 'bien') +
    kpi('Por cobrar', euros(fin.pendCobro), fin.vencCobro ? '<span class="mal">' + euros(fin.vencCobro) + ' vencido</span>' : 'Nada vencido') +
    kpi('Por pagar', euros(fin.pendPago), fin.vencPago ? '<span class="mal">' + euros(fin.vencPago) + ' vencido</span>' : 'Nada vencido');
  var tramos = [['Sin vencer', 0, 'var(--verde)'], ['Vencido 1–30 días', 0, 'var(--ambar)'], ['Vencido 31–60 días', 0, '#FB923C'], ['Vencido más de 60 días', 0, 'var(--rojo)']], deben = {};
  D.cuentas.forEach(function (c) {
    if (!c.cobro || c.saldo <= 0.005) return;
    tramos[c.dias >= 0 ? 0 : c.dias >= -30 ? 1 : c.dias >= -60 ? 2 : 3][1] += c.saldo;
    deben[c.contraparte] = (deben[c.contraparte] || 0) + c.saldo;
  });
  $('f-aging').innerHTML = tramos.map(function (t) {
    var p = fin.pendCobro ? t[1] / fin.pendCobro * 100 : 0;
    return '<div class="fila-barra"><div class="cab"><b>' + t[0] + '</b><span>' + euros(t[1]) + ' · ' + pct(p) + '</span></div><div class="barra"><i style="width:' + p + '%;background:' + t[2] + '"></i></div></div>';
  }).join('');
  $('f-deudores').innerHTML = Object.keys(deben).sort(function (a, b) { return deben[b] - deben[a]; }).slice(0, 6).map(function (k) {
    return '<div class="item"><div class="x"><b>' + esc(k || 'Sin nombre') + '</b></div><div class="y">' + euros(deben[k]) + '</div></div>';
  }).join('') || '<div class="vacio">Nadie debe nada.</div>';
  $('f-proximos').innerHTML = D.cuentas.filter(function (c) { return !c.cobro && c.saldo > 0.005; }).sort(function (a, b) { return a.vence < b.vence ? -1 : 1; }).slice(0, 6).map(function (c) {
    return '<div class="item"><div class="x"><b>' + esc(c.contraparte) + '</b><span>' + esc(c.numero) + ' · ' + (c.dias < 0 ? '<span class="mal">vencida hace ' + (-c.dias) + ' días</span>' : 'vence el ' + fecha(c.vence)) + '</span></div><div class="y">' + euros(c.saldo) + '</div></div>';
  }).join('') || '<div class="vacio">Sin pagos pendientes.</div>';
  var fila = function (l, total) {
    return '<tr' + (total ? ' class="total"' : '') + '><td>' + esc(l.linea) + '</td><td class="n">' + num(l.unidades) + '</td><td class="n">' + euros(l.ingresos) + '</td><td class="n">' + euros(l.costo) + '</td><td class="n">' + (l.merma ? '<span class="mal">' + euros(l.merma) + '</span>' : '—') + '</td><td class="n"><b>' + euros(l.margen) + '</b></td><td class="n">' + (l.ingresos ? pct(l.margen / l.ingresos * 100) : '—') + '</td></tr>';
  };
  $('f-lineas').innerHTML = '<tr><th>Línea de negocio</th><th class="n">Unidades</th><th class="n">Ingresos</th><th class="n">Costo de ventas</th><th class="n">Costo de merma</th><th class="n">Margen neto</th><th class="n">% margen</th></tr>' +
    (r.listaLineas.map(function (l) { return fila(l); }).join('') || '<tr><td colspan="7" class="vacio">Sin ventas en el periodo.</td></tr>') +
    (r.listaLineas.length ? fila({ linea: 'Total', unidades: r.unidades, ingresos: r.ingresos, costo: r.costo, merma: r.merma, margen: r.margen }, true) : '');
  var cats = Object.keys(r.gastosCat).sort(function (a, b) { return r.gastosCat[b] - r.gastosCat[a]; });
  $('f-gastos-sub').textContent = 'Total ' + euros(r.gastos) + ' en ' + r.n + ' días';
  $('f-gastos').innerHTML = cats.map(function (c, i) {
    var p = r.gastos ? r.gastosCat[c] / r.gastos * 100 : 0;
    return '<div class="fila-barra"><div class="cab"><b>' + esc(c) + '</b><span>' + euros(r.gastosCat[c]) + ' · ' + pct(p) + '</span></div><div class="barra"><i style="width:' + p + '%;background:' + PALETA[i % PALETA.length] + '"></i></div></div>';
  }).join('') || '<div class="vacio">Sin gastos en el periodo.</div>';
};

PINTAR.flujo = function () {
  var f = C.fin, L = f.flujo;
  var fila = function (nombre, campo, signo, clase) {
    var total = 0;
    return '<tr' + (clase ? ' class="' + clase + '"' : '') + '><td>' + nombre + '</td>' + L.map(function (m) {
      var v = m[campo]; total += v;
      if (campo === 'inicial' || campo === 'fin' || campo === 'neto') return '<td class="n ' + (v < 0 ? 'mal' : '') + '">' + euros(v) + '</td>';
      return '<td class="n">' + (v ? '<span class="' + (signo > 0 ? 'bien' : 'mal') + '">' + (signo > 0 ? '+' : '−') + euros(v) + '</span>' : '—') + '</td>';
    }).join('') + '<td class="n"><b>' + (campo === 'inicial' ? euros(L[0].inicial) : campo === 'fin' ? euros(f.saldoFinal) : (signo ? (signo > 0 ? '+' : '−') : '') + euros(total)) + '</b></td></tr>';
  };
  $('x-tabla').innerHTML = '<tr><th>Concepto</th>' + L.map(function (m) {
    return '<th class="n">' + mesTxt(m.k) + '<br><span style="font-weight:500;text-transform:none;color:' + (m.tipo === 'real' ? 'inherit' : 'var(--azul)') + '">' + (m.tipo === 'real' ? 'real' : m.tipo === 'curso' ? 'en curso' : 'previsto') + '</span></th>';
  }).join('') + '<th class="n">Total</th></tr>' +
    fila('Saldo inicial', 'inicial') + fila('Cobros de facturas', 'cobros', 1) + fila('Ventas al contado', 'contado', 1) +
    fila('Pagos a proveedores', 'pagos', -1) + fila('Gastos operativos', 'gastos', -1) + fila('Flujo neto del mes', 'neto') + fila('Saldo final', 'fin', 0, 'total');
  $('x-nota').textContent = 'Meses pasados: cobros, pagos, ventas al contado (' + D.config.contado.join(', ') + ') y gastos reales. Mes en curso y futuros: se suman las facturas pendientes según su vencimiento; no se estiman ventas ni gastos futuros.';
  $('x-kpis').innerHTML =
    kpi('Por cobrar', euros(f.pendCobro), f.vencCobro ? '<span class="mal">' + euros(f.vencCobro) + ' vencido</span>' : 'Nada vencido', 'bien') +
    kpi('Por pagar', euros(f.pendPago), f.vencPago ? '<span class="mal">' + euros(f.vencPago) + ' vencido</span>' : 'Nada vencido', 'mal') +
    kpi('Saldo previsto', euros(f.saldoFinal), f.minimo < 0 ? '<span class="mal">La caja queda en negativo algún mes</span>' : 'Al cierre de ' + mesTxt(L[L.length - 1].k), f.saldoFinal < 0 ? 'mal' : '') +
    kpi('Capital inmovilizado', euros(f.capital), f.valorStock ? pct(f.capital / f.valorStock * 100) + ' del inventario, en baja rotación' : '', f.capital ? 'ojo' : '');
  $('x-sub').textContent = f.inmovilizado.length + ' productos que tardarían más de ' + D.config.rotMedia + ' días en venderse (o no se venden) · ' + euros(f.capital) + ' al costo';
  $('x-inmovilizado').innerHTML = '<tr><th>Producto</th><th>Categoría</th><th class="n">Stock</th><th class="n">Venta 90 días</th><th class="n">Días de stock</th><th class="n">Exceso sobre óptimo</th><th class="n">Capital inmovilizado</th></tr>' +
    (f.inmovilizado.map(function (it) {
      return '<tr><td class="largo"><b>' + esc(it.p.nombre) + '</b> <span class="tenue">' + esc(it.p.sku) + '</span></td><td>' + esc(it.p.categoria) + '</td><td class="n">' + num(it.stock) + '</td><td class="n">' + num(it.v90) + '</td><td class="n">' + (it.dias == null ? 'Sin ventas' : num(it.dias)) + '</td><td class="n">' + num(it.exceso) + ' uds</td><td class="n"><b>' + euros(it.valor) + '</b></td></tr>';
    }).join('') || '<tr><td colspan="7" class="vacio">No hay stock de baja rotación.</td></tr>');
};

function chipFactura(c) {
  return c.estado === 'Pagado' ? chip('verde', c.cobro ? 'Cobrada' : 'Pagada') : c.vencida ? chip('rojo', 'Vencida ' + (-c.dias) + ' d') : c.estado === 'Parcial' ? chip('azul', 'Parcial') : chip('ambar', 'Pendiente');
}

PINTAR.cuentas = function () {
  var tipo = $('q-tipo').value, estado = $('q-estado').value, q = $('q-buscar').value.trim().toLowerCase(), f = C.fin;
  var l = D.cuentas.filter(function (c) {
    return (!tipo || c.tipo === tipo) && (!q || (c.contraparte + ' ' + c.numero).toLowerCase().indexOf(q) > -1) &&
      (!estado || (estado === 'abiertas' ? c.saldo > 0.005 : estado === 'vencidas' ? c.vencida : c.estado === 'Pagado'));
  }).sort(function (a, b) { return estado === 'abiertas' || estado === 'vencidas' ? (a.vence < b.vence ? -1 : 1) : (a.emision > b.emision ? -1 : 1); });
  $('qk-kpis').innerHTML =
    kpi('Por cobrar', euros(f.pendCobro), 'Facturas emitidas pendientes', 'bien') +
    kpi('Vencido por cobrar', euros(f.vencCobro), f.vencidas + ' facturas vencidas', f.vencCobro ? 'mal' : '') +
    kpi('Por pagar', euros(f.pendPago), 'Facturas de proveedores pendientes') +
    kpi('Vencido por pagar', euros(f.vencPago), 'Compromisos atrasados', f.vencPago ? 'mal' : '');
  $('q-tabla').innerHTML = '<tr><th>Nº factura</th><th>Tipo</th><th>Cliente / proveedor</th><th>Emisión</th><th>Vencimiento</th><th class="n">Neto</th><th class="n">Total con IVA</th><th class="n">Cobrado / pagado</th><th class="n">Saldo</th><th>Estado</th><th></th></tr>' +
    (l.slice(0, 300).map(function (c) {
      var abierta = c.saldo > 0.005;
      return '<tr><td><b>' + esc(c.numero || c.id) + '</b></td><td>' + chip(c.cobro ? 'verde' : 'gris', c.cobro ? 'Emitida' : 'Recibida') + '</td><td class="largo">' + esc(c.contraparte) + '</td><td>' + fecha(c.emision) + '</td><td>' + fecha(c.vence) + '</td><td class="n">' + euros2(c.neto) + '</td><td class="n">' + euros2(c.total) + '</td><td class="n">' + (c.pagado ? euros2(c.pagado) : '—') + '</td><td class="n"><b>' + (abierta ? euros2(c.saldo) : '—') + '</b></td><td>' + chipFactura(c) + '</td>' +
        '<td>' + (abierta ? '<button class="btn mini" data-accion="liquidar" data-id="' + esc(c.id) + '">' + (c.cobro ? 'Cobrar todo' : 'Pagar todo') + '</button> <button class="btn mini" data-accion="abonar" data-id="' + esc(c.id) + '">Parcial</button>' : '') + '</td></tr>';
    }).join('') || '<tr><td colspan="11" class="vacio">Sin facturas.</td></tr>');
  $('q-cuenta').textContent = l.length + ' facturas · saldo ' + euros(l.reduce(function (s, c) { return s + c.saldo; }, 0));
};

PINTAR.pagos = function () {
  var tipo = $('pg-tipo').value, total = 0;
  var l = D.pagos.filter(function (p) { var c = C.cuenta[p.cuenta]; return !tipo || (c && c.tipo === tipo); }).sort(function (a, b) { return a.fecha > b.fecha ? -1 : 1; });
  $('pg-tabla').innerHTML = '<tr><th>ID</th><th>Fecha</th><th>Tipo</th><th>Factura</th><th>Cliente / proveedor</th><th>Método</th><th class="n">Monto</th></tr>' +
    (l.slice(0, 300).map(function (p) {
      var c = C.cuenta[p.cuenta], cobro = c && c.cobro;
      return '<tr><td>' + esc(p.id) + '</td><td>' + fecha(p.fecha) + '</td><td>' + chip(cobro ? 'verde' : 'rojo', cobro ? 'Cobro' : 'Pago') + '</td><td>' + esc(c ? c.numero || c.id : p.cuenta) + '</td><td class="largo">' + esc(c ? c.contraparte : '') + '</td><td>' + esc(p.metodo) + '</td><td class="n"><b>' + (cobro ? '+' : '−') + euros2(p.monto) + '</b></td></tr>';
    }).join('') || '<tr><td colspan="7" class="vacio">Sin cobros ni pagos registrados.</td></tr>');
  l.forEach(function (p) { var c = C.cuenta[p.cuenta]; total += c && c.cobro ? p.monto : -p.monto; });
  $('pg-cuenta').textContent = l.length + ' movimientos · neto ' + euros(total);
};

PINTAR.gastos = function () {
  var cat = $('g-categoria').value;
  var l = D.gastos.filter(function (g) { return !cat || g.categoria === cat; }).sort(function (a, b) { return a.fecha > b.fecha ? -1 : 1; });
  $('g-tabla').innerHTML = '<tr><th>ID</th><th>Fecha</th><th>Categoría</th><th>Proveedor</th><th class="n">Monto</th></tr>' +
    (l.slice(0, 300).map(function (g) { return '<tr><td>' + esc(g.id) + '</td><td>' + fecha(g.fecha) + '</td><td>' + esc(g.categoria) + '</td><td class="largo">' + esc(g.proveedor) + '</td><td class="n"><b>' + euros2(g.monto) + '</b></td></tr>'; }).join('') || '<tr><td colspan="5" class="vacio">Sin gastos.</td></tr>');
  $('g-cuenta').textContent = l.length + ' gastos · ' + euros(l.reduce(function (s, g) { return s + g.monto; }, 0));
};

/* ===================== FORMULARIOS ===================== */
function opProductos(valor) { return [['', 'Elige un producto…']].concat(C.items.map(function (it) { return [it.p[valor], it.p.sku + ' · ' + it.p.nombre + ' (stock ' + it.stock + ')']; })); }
function opUbicaciones() { return [['', '— Sin indicar —']].concat(D.ubicaciones.map(function (u) { var x = C.ubi[u.id]; return [u.id, u.pos + (x.it ? ' · ' + x.it.p.sku : ' · libre')]; })); }
function opLista(l) { return function () { return l().map(function (x) { return [x, x]; }); }; }
var FORMULARIOS = {
  venta: { titulo: 'Nueva venta', nota: 'Al guardar se descuenta el inventario con un movimiento de salida.', campos: [
    { id: 'producto', etq: 'Producto', tipo: 'select', op: function () { return opProductos('id'); }, req: 1, ancho: 1 },
    { id: 'cantidad', etq: 'Cantidad vendida', tipo: 'number', req: 1, min: 1 },
    { id: 'canal', etq: 'Canal de venta', tipo: 'select', op: opLista(function () { return D.listas.CANAL; }) },
    { id: 'fecha', etq: 'Fecha', tipo: 'date', hoy: 1 }] },
  movimiento: { titulo: 'Nuevo movimiento de inventario', nota: 'Ingreso: indica la ubicación de destino. Salida o merma: la de origen. Transferencia: ambas.', campos: [
    { id: 'tipoMov', etq: 'Tipo de movimiento', tipo: 'select', op: opLista(function () { return D.listas.TIPO_MOV; }), req: 1 },
    { id: 'sku', etq: 'Producto', tipo: 'select', op: function () { return opProductos('sku'); }, req: 1 },
    { id: 'cantidad', etq: 'Cantidad', tipo: 'number', req: 1, min: 1 },
    { id: 'responsable', etq: 'Responsable', tipo: 'text' },
    { id: 'origen', etq: 'Ubicación de origen', tipo: 'select', op: opUbicaciones },
    { id: 'destino', etq: 'Ubicación de destino', tipo: 'select', op: opUbicaciones },
    { id: 'liberarOrigen', etq: 'En una transferencia, dejar libre la ubicación de origen', tipo: 'checkbox', ancho: 1 }] },
  producto: { titulo: 'Nuevo producto', campos: [
    { id: 'sku', etq: 'SKU', tipo: 'text', req: 1 },
    { id: 'nombre', etq: 'Nombre del producto', tipo: 'text', req: 1 },
    { id: 'categoria', etq: 'Categoría', tipo: 'select', op: opLista(function () { return C.categorias.length ? C.categorias : D.listas.CATEGORIA; }) },
    { id: 'linea', etq: 'Línea de negocio', tipo: 'select', op: opLista(function () { return unicos(D.listas.LINEA.concat(C.lineas)); }) },
    { id: 'precio', etq: 'Precio de venta ({m})', tipo: 'number', req: 1, paso: '0.01' },
    { id: 'costo', etq: 'Costo unitario estándar ({m})', tipo: 'number', paso: '0.01' }] },
  factura: { titulo: 'Nueva factura', nota: 'Emitida a un cliente (por cobrar) o recibida de un proveedor (por pagar). El estado se calcula solo con los cobros y pagos.', campos: [
    { id: 'tipoCuenta', etq: 'Tipo', tipo: 'select', op: function () { return [['Cobro Cliente', 'Emitida a un cliente'], ['Pago Proveedor', 'Recibida de un proveedor']]; }, req: 1 },
    { id: 'numero', etq: 'Nº de factura', tipo: 'text', req: 1 },
    { id: 'contraparte', etq: 'Cliente o proveedor', tipo: 'text', req: 1, lista: function () { return unicos(D.cuentas.map(function (c) { return c.contraparte; })); }, ancho: 1 },
    { id: 'monto', etq: 'Monto neto ({m})', tipo: 'number', req: 1, paso: '0.01' },
    { id: 'iva', etq: 'IVA (%)', tipo: 'number', valor: function () { return D.config.iva; } },
    { id: 'emision', etq: 'Fecha de emisión', tipo: 'date', hoy: 1 },
    { id: 'vence', etq: 'Fecha de vencimiento', tipo: 'date', req: 1 }] },
  pago: { titulo: 'Cobro o pago de una factura', nota: 'Deja el monto vacío para liquidar todo el saldo. Con un monto menor, la factura queda como parcial.', campos: [
    { id: 'cuenta', etq: 'Factura', tipo: 'select', req: 1, ancho: 1, op: function () {
      return [['', 'Elige una factura pendiente…']].concat(D.cuentas.filter(function (c) { return c.saldo > 0.005; }).sort(function (a, b) { return a.vence < b.vence ? -1 : 1; })
        .map(function (c) { return [c.id, (c.cobro ? 'Cobro · ' : 'Pago · ') + (c.numero || c.id) + ' · ' + c.contraparte + ' · saldo ' + euros2(c.saldo)]; })); } },
    { id: 'monto', etq: 'Monto ({m})', tipo: 'number', paso: '0.01' },
    { id: 'metodo', etq: 'Método', tipo: 'select', op: opLista(function () { return D.listas.METODO_PAGO; }) },
    { id: 'fecha', etq: 'Fecha', tipo: 'date', hoy: 1 }] },
  lead: { titulo: 'Nuevo prospecto', campos: [
    { id: 'empresa', etq: 'Empresa', tipo: 'text', req: 1 },
    { id: 'contacto', etq: 'Persona de contacto', tipo: 'text' },
    { id: 'telefono', etq: 'Teléfono o email', tipo: 'text' },
    { id: 'interes', etq: 'Interés', tipo: 'select', op: opLista(function () { return D.listas.INTERES; }) },
    { id: 'ejecutivo', etq: 'Ejecutivo', tipo: 'text', req: 1, lista: function () { return C.ejecutivos; } },
    { id: 'montoEstimado', etq: 'Monto estimado ({m})', tipo: 'number', paso: '0.01' },
    { id: 'etapa', etq: 'Etapa', tipo: 'select', op: opLista(function () { return D.listas.ETAPA; }) },
    { id: 'canalLead', etq: 'Canal de captación', tipo: 'select', op: opLista(function () { return D.listas.CANAL_LEAD; }) },
    { id: 'notas', etq: 'Notas', tipo: 'text', ancho: 1 }] },
  contacto: { titulo: 'Contacto con un prospecto', nota: 'Queda en la bitácora y reinicia los días sin seguimiento del prospecto.', campos: [
    { id: 'lead', etq: 'Prospecto', tipo: 'select', req: 1, ancho: 1, op: function () {
      return [['', 'Elige un prospecto…']].concat(D.leads.filter(function (l) { return l.abierto; }).sort(function (a, b) { return a.empresa < b.empresa ? -1 : 1; }).map(function (l) { return [l.id, l.empresa + ' · ' + l.etapa.slice(3) + ' · ' + l.ejecutivo]; })); } },
    { id: 'tipoContacto', etq: 'Tipo de contacto', tipo: 'select', op: opLista(function () { return D.listas.TIPO_CONTACTO; }) },
    { id: 'fecha', etq: 'Fecha', tipo: 'date', hoy: 1 },
    { id: 'resumen', etq: 'Resumen', tipo: 'text', req: 1, ancho: 1 },
    { id: 'ejecutivo', etq: 'Ejecutivo', tipo: 'text', lista: function () { return C.ejecutivos; } }] },
  meta: { titulo: 'Meta de ventas de un ejecutivo', nota: 'Si el ejecutivo ya tiene meta ese mes, se actualiza.', campos: [
    { id: 'ejecutivo', etq: 'Ejecutivo', tipo: 'text', req: 1, lista: function () { return C.ejecutivos; } },
    { id: 'mes', etq: 'Mes', tipo: 'month', req: 1, valor: function () { return D.hoy.slice(0, 7); } },
    { id: 'meta', etq: 'Meta de ventas ({m})', tipo: 'number', req: 1, paso: '0.01' }] },
  gasto: { titulo: 'Nuevo gasto operativo', campos: [
    { id: 'categoriaGasto', etq: 'Categoría', tipo: 'select', op: opLista(function () { return D.listas.GASTO; }), req: 1 },
    { id: 'proveedor', etq: 'Proveedor', tipo: 'text' },
    { id: 'monto', etq: 'Monto ({m})', tipo: 'number', req: 1, paso: '0.01' },
    { id: 'fecha', etq: 'Fecha', tipo: 'date', hoy: 1 }] }
};

function crearFormularios() {
  $('formularios').innerHTML = Object.keys(FORMULARIOS).map(function (k) {
    var f = FORMULARIOS[k];
    return '<section class="vista" id="v-f-' + k + '"><form class="t form" id="form-' + k + '" data-tipo="' + k + '" novalidate><h3 style="font-size:17px">' + f.titulo + '</h3><div class="sub">' + (f.nota || 'Los campos con * son obligatorios.') + '</div><div class="campos">' +
      f.campos.map(function (c) {
        var id = 'x-' + k + '-' + c.id; c = Object.assign({}, c, { etq: c.etq.replace('{m}', moneda()) });
        if (c.tipo === 'checkbox') return '<div class="campo casilla ancho"><label><input type="checkbox" id="' + id + '"> ' + c.etq + '</label></div>';
        return '<div class="campo' + (c.ancho ? ' ancho' : '') + '"><label for="' + id + '">' + c.etq + (c.req ? ' *' : '') + '</label>' +
          (c.tipo === 'select' ? '<select id="' + id + '"></select>' : '<input id="' + id + '" type="' + c.tipo + '"' + (c.lista ? ' list="' + id + '-l" autocomplete="off"' : '') + (c.tipo === 'number' ? ' step="' + (c.paso || '1') + '" min="' + (c.min || 0) + '" inputmode="decimal"' : '') + '>' + (c.lista ? '<datalist id="' + id + '-l"></datalist>' : '')) + '</div>';
      }).join('') + '</div><div class="pie-form"><button class="btn primario" type="submit">Guardar</button><button class="btn" type="button" data-accion="cancelar">Cancelar</button></div></form></section>';
  }).join('');
}

function prepararFormulario(k, valores) {
  var f = FORMULARIOS[k]; valores = valores || ESTADO.prefijar || {}; ESTADO.prefijar = null;
  f.campos.forEach(function (c) {
    var e = $('x-' + k + '-' + c.id);
    if (c.tipo === 'select') e.innerHTML = c.op().map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
    if (c.lista) $('x-' + k + '-' + c.id + '-l').innerHTML = c.lista().map(function (o) { return '<option value="' + esc(o) + '">'; }).join('');
    if (c.tipo === 'checkbox') e.checked = !!valores[c.id];
    else e.value = valores[c.id] != null ? valores[c.id] : c.hoy ? D.hoy : c.valor ? c.valor() : c.tipo === 'select' ? e.options[0] && e.options[0].value : '';
  });
}

function enviar(form) {
  if (form.hasAttribute('data-propio')) { PROPIOS[form.getAttribute('data-propio')](form); return; }
  var k = form.getAttribute('data-tipo'), f = FORMULARIOS[k], d = { tipo: k }, falta = null;
  f.campos.forEach(function (c) {
    var e = $('x-' + k + '-' + c.id);
    d[c.id] = c.tipo === 'checkbox' ? e.checked : e.value;
    if (c.req && !String(e.value).trim() && !falta) falta = c;
  });
  if (falta) { avisar('Falta: ' + falta.etq, true); $('x-' + k + '-' + falta.id).focus(); return; }
  if (k === 'venta') {
    var it = C.porId[d.producto];
    if (it && Number(d.cantidad) > it.stock) { avisar('Solo hay ' + it.stock + ' unidades en stock de ' + it.p.nombre + '.', true); return; }
  }
  if (k === 'movimiento' && (d.tipoMov === 'Salida Venta' || d.tipoMov === 'Merma / Daño')) {
    var im = C.porSku[d.sku];
    if (im && Number(d.cantidad) > im.stock) { avisar('Solo hay ' + im.stock + ' unidades en stock.', true); return; }
  }
  var boton = form.querySelector('[type=submit]'); boton.disabled = true; boton.textContent = 'Guardando…';
  var fin = function () { boton.disabled = false; boton.textContent = 'Guardar'; };
  servidor('guardarRegistro', d, function () {
    fin(); avisar('Guardado.');
    var volver = { venta: 'ventas', movimiento: 'movimientos', producto: 'catalogo', factura: 'cuentas', pago: 'cuentas', gasto: 'gastos', lead: 'embudo', contacto: 'embudo', meta: 'equipo' }[k];
    cargar(function () { mostrar(volver); });
  }, fin);
}

/* ===================== ACCIONES ===================== */
var ACCIONES = {
  cancelar: function () { mostrar(ESTADO.volver || 'inicio'); },
  verPosicion: function (id) { ESTADO.sel = id; mostrar('posiciones'); },
  abonar: function (id) { ESTADO.prefijar = { cuenta: id }; mostrar('f-pago'); },
  contactar: function (id) { var l = C.lead[id]; ESTADO.prefijar = { lead: id, ejecutivo: l ? l.ejecutivo : '' }; mostrar('f-contacto'); },
  liquidar: function (id) {
    var c = C.cuenta[id]; if (!c) return;
    var p = { id: 'tmp-' + Date.now(), cuenta: id, fecha: D.hoy, monto: c.saldo, metodo: 'Transferencia' };
    D.pagos.push(p); pintarTodo();
    servidor('guardarRegistro', { tipo: 'pago', cuenta: id, monto: '', fecha: D.hoy, metodo: 'Transferencia' }, function (r) { p.id = r.id || p.id; avisar(c.cobro ? 'Factura cobrada.' : 'Factura pagada.'); },
      function () { D.pagos.splice(D.pagos.indexOf(p), 1); pintarTodo(); });
  },
  liberar: function () { asignarPosicion(ESTADO.sel, ''); },
  asignar: function () {
    var sku = $('b-asignar').value;
    if (!sku) { avisar('Elige un producto.', true); return; }
    asignarPosicion(ESTADO.sel, sku);
  },
  ingresoAqui: function () { ESTADO.prefijar = { tipoMov: 'Ingreso Existencia', destino: ESTADO.sel, sku: $('b-asignar').value }; mostrar('f-movimiento'); },
  moverDesde: function () { var x = C.ubi[ESTADO.sel]; ESTADO.prefijar = { tipoMov: 'Transferencia', origen: ESTADO.sel, sku: x.it.p.sku }; mostrar('f-movimiento'); }
};

function cambiarEtapa(id, valor) {
  var l = C.lead[id]; if (!l || l.etapa === valor) return;
  var antes = [l.etapa, l.cierre]; l.etapa = valor; l.cierre = D.listas.ETAPA.indexOf(valor) >= 4 ? D.hoy : ''; pintarTodo();
  servidor('cambiarEstado', { tipo: 'lead', id: id, valor: valor }, function () { avisar('Prospecto en "' + valor.slice(3) + '".'); }, function () { l.etapa = antes[0]; l.cierre = antes[1]; pintarTodo(); });
}

function asignarPosicion(id, sku) {
  var u = D.ubicaciones.filter(function (x) { return x.id === id; })[0]; if (!u) return;
  var antes = u.sku; u.sku = sku; pintarTodo();
  servidor('cambiarEstado', { tipo: 'ubicacion', id: id, valor: sku }, function () { avisar(sku ? 'Producto asignado.' : 'Posición liberada.'); }, function () { u.sku = antes; pintarTodo(); });
}

function seleccionarPosicion(id) {
  ESTADO.sel = id;
  pintarPanelPosicion();
  BODEGA.seleccionar();
}

function enlazar() {
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-vista],[data-accion],[data-color],[data-pasillo],[data-calidad]') : null;
    if (e.target.id !== 'btn-nuevo') $('menu-nuevo').classList.remove('abierto');
    if (!b) return;
    if (b.hasAttribute('data-vista')) { mostrar(b.getAttribute('data-vista')); return; }
    if (b.hasAttribute('data-color')) { ESTADO.color = b.getAttribute('data-color'); guardarLocal('color', ESTADO.color); pintar(); BODEGA.colorear(); return; }
    if (b.hasAttribute('data-pasillo')) { ESTADO.pasillo = b.getAttribute('data-pasillo'); marcarSegmento('b-pasillos', 'data-pasillo', ESTADO.pasillo); BODEGA.enfocar(); return; }
    if (b.hasAttribute('data-calidad')) { ESTADO.calidad = b.getAttribute('data-calidad'); guardarLocal('calidad', ESTADO.calidad); marcarSegmento('b-calidad', 'data-calidad', ESTADO.calidad); BODEGA.calidad(); return; }
    var a = ACCIONES[b.getAttribute('data-accion')];
    if (a) a(b.getAttribute('data-id'));
  });
  $('btn-nuevo').addEventListener('click', function () { $('menu-nuevo').classList.toggle('abierto'); });
  $('periodo').addEventListener('change', function () { ESTADO.periodo = Number(this.value); C.r = resumen(ESTADO.periodo); pintar(); });
  ['e-ejecutivo', 'e-buscar', 'q-mes', 'q-buscar', 'pg-tipo', 've-buscar', 've-canal', 'ca-buscar', 'ca-categoria', 's-buscar', 's-categoria', 's-alerta', 'r-categoria', 'r-ver', 'm-buscar', 'm-tipo', 'q-tipo', 'q-estado', 'g-categoria'].forEach(function (id) {
    $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', function () { pintar(); });
  });
  document.addEventListener('submit', function (e) { e.preventDefault(); enviar(e.target); });
  // Embudo: cambiar de etapa con el desplegable de la tarjeta o arrastrándola a otra columna
  var tablero = $('e-tablero'), arrastrado = null;
  tablero.addEventListener('change', function (e) { var id = e.target.getAttribute('data-lead'); if (id) cambiarEtapa(id, e.target.value); });
  tablero.addEventListener('dragstart', function (e) { var t = e.target.closest && e.target.closest('.lead'); if (!t) return; arrastrado = t.getAttribute('data-id'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', arrastrado); } catch (x) {} });
  tablero.addEventListener('dragover', function (e) { var c = e.target.closest && e.target.closest('.etapa'); if (!c || !arrastrado) return; e.preventDefault(); [].forEach.call(tablero.querySelectorAll('.etapa'), function (x) { x.classList.toggle('encima', x === c); }); });
  tablero.addEventListener('dragend', function () { arrastrado = null; [].forEach.call(tablero.querySelectorAll('.encima'), function (x) { x.classList.remove('encima'); }); });
  tablero.addEventListener('drop', function (e) { var c = e.target.closest && e.target.closest('.etapa'); if (!c || !arrastrado) return; e.preventDefault(); var id = arrastrado; arrastrado = null; cambiarEtapa(id, c.getAttribute('data-etapa')); });
  // Portada
  var portada = $('portada'), entrar = function () { portada.classList.add('fuera'); var v = $('p-video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } };
  if (portada) $('p-entrar').addEventListener('click', entrar);
  document.addEventListener('keydown', function (e) { if (portada && e.key === 'Enter' && !portada.classList.contains('fuera')) entrar(); });
  // Días de cobertura: el óptimo se recalcula mientras se escribe
  $('r-cobertura').addEventListener('input', function (e) {
    var cat = e.target.getAttribute('data-cat'); if (!cat) return;
    ESTADO.cobertura[cat] = e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value)));
    calcularOptimo(); pintar();
  });
  $('r-deshacer').addEventListener('click', function () { ESTADO.cobertura = coberturaGuardada(); document.activeElement.blur(); calcularOptimo(); pintar(); });
  $('r-guardar').addEventListener('click', function () {
    var lista = C.categorias.map(function (c) { return { categoria: c, dias: coberturaDe(c) }; }), antes = D.cobertura, boton = this;
    boton.disabled = true;
    D.cobertura = lista; pintar();
    servidor('guardarCobertura', lista, function () { avisar('Cobertura guardada. El inventario óptimo está actualizado.'); }, function () { D.cobertura = antes; pintar(); });
  });
  window.addEventListener('resize', function () { BODEGA.ajustar(); });
}

function llenarFiltros() {
  var guardar = function (id, html) { var v = $(id).value; $(id).innerHTML = html; $(id).value = v; if ($(id).selectedIndex < 0) $(id).selectedIndex = 0; };
  guardar('ve-canal', opciones(D.listas.CANAL, 'Todos los canales'));
  ['ca-categoria', 's-categoria', 'r-categoria'].forEach(function (id) { guardar(id, opciones(C.categorias, 'Todas las categorías')); });
  guardar('m-tipo', opciones(D.listas.TIPO_MOV.concat(['Ajuste Entrada', 'Ajuste Salida']), 'Todos los tipos'));
  guardar('e-ejecutivo', opciones(C.ejecutivos, 'Todos los ejecutivos'));
  var meses = unicos([claveMes(C.hoy)].concat(D.metas.map(function (m) { return m.mes; })).concat(D.leads.filter(function (l) { return l.cierre; }).map(function (l) { return l.cierre.slice(0, 7); }))).sort().reverse();
  var vm = $('q-mes').value || claveMes(C.hoy); $('q-mes').innerHTML = meses.map(function (m) { return '<option value="' + m + '">' + mesTxt(m) + '</option>'; }).join(''); $('q-mes').value = vm; if ($('q-mes').selectedIndex < 0) $('q-mes').value = claveMes(C.hoy);
  guardar('g-categoria', opciones(unicos(D.listas.GASTO.concat(D.gastos.map(function (g) { return g.categoria; }))), 'Todas las categorías'));
}

function cargar(despues) {
  google.script.run.withSuccessHandler(function (d) {
    if (d && d.ok === false) { mostrarSinEmpresa(d); return; }
    D = d;
    aplicarModulos(); crearFormularios(); CTX.usuarios = null; CTX.empresas = null;
    ESTADO.cobertura = coberturaGuardada();
    if (ESTADO.sel && !D.ubicaciones.some(function (u) { return u.id === ESTADO.sel; })) ESTADO.sel = null;
    calcular(); llenarFiltros();
    BODEGA.datosNuevos();
    $('cargando').style.display = 'none';
    if (despues) despues(); else mostrar(ESTADO.vista);
    pintarTodo();
  }).withFailureHandler(function (e) {
    $('cargando-txt').textContent = 'No se pudieron cargar los datos: ' + (e && e.message || e);
  }).obtenerDatosIniciales();
}

/* ===================== BODEGA 3D ===================== */
var BODEGA = (function () {
  var T = window.THREE, listo = false, fallo = '', caja, render, escena, camara, sol, rayo, raton;
  var grupo, cargas, bandas, etiquetas, huecos, marco, orden = [], sucio = true, anim = null;
  var orb = { theta: 0.7, phi: 1.08, radio: 20, tx: 0, ty: 2, tz: 0 }, centro = { x: 0, y: 2, z: 0 }, radioBase = 20;
  var M = {}, dim = { w: 1.45, h: 1.5, d: 1.15 };

  /* --- Texturas generadas por código (no dependen de archivos externos) --- */
  function lienzo(n, pintar, rx, ry) {
    var c = document.createElement('canvas'); c.width = c.height = n; pintar(c.getContext('2d'), n);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry); t.anisotropy = 8; return t;
  }
  function ruido(g, n, cuantos, tono, alfa) {
    for (var i = 0; i < cuantos; i++) { g.fillStyle = 'rgba(' + tono + ',' + (Math.random() * alfa) + ')'; var s = Math.random() * 2.4 + 0.4; g.fillRect(Math.random() * n, Math.random() * n, s, s); }
  }
  function texHormigon() {
    return lienzo(1024, function (g, n) {
      g.fillStyle = '#7b7f86'; g.fillRect(0, 0, n, n);
      for (var i = 0; i < 46; i++) {                                    // Manchas y zonas pulidas
        var x = Math.random() * n, y = Math.random() * n, r = 60 + Math.random() * 220, gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, i % 2 ? 'rgba(40,44,52,.16)' : 'rgba(200,205,214,.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ruido(g, n, 26000, '20,22,26', 0.22); ruido(g, n, 16000, '235,238,244', 0.14);
      g.strokeStyle = 'rgba(28,30,36,.55)'; g.lineWidth = 3;            // Juntas de dilatación
      g.strokeRect(1, 1, n - 2, n - 2);
      g.strokeStyle = 'rgba(20,22,26,.25)'; g.lineWidth = 1;
      for (var k = 0; k < 9; k++) { g.beginPath(); var a = Math.random() * n, b = Math.random() * n; g.moveTo(a, b); for (var j = 0; j < 6; j++) { a += (Math.random() - 0.5) * 70; b += Math.random() * 46; g.lineTo(a, b); } g.stroke(); }
    }, 7, 7);
  }
  function texCarton() {
    return lienzo(512, function (g, n) {
      g.fillStyle = '#b58a57'; g.fillRect(0, 0, n, n);
      for (var y = 0; y < n; y += 2) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '70,45,20' : '235,205,160') + ',' + (Math.random() * 0.1) + ')'; g.fillRect(0, y, n, 1); }
      ruido(g, n, 5000, '60,40,20', 0.18);
      var m = n / 2;
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {         // 4 cajas por cara
        var x = i * m, yy = j * m;
        g.fillStyle = 'rgba(226,203,150,.75)'; g.fillRect(x, yy + m * 0.44, m, m * 0.12);           // Cinta de embalaje
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, yy + m * 0.45, m, 2);
        g.fillStyle = '#f4f1ea'; g.fillRect(x + m * 0.12, yy + m * 0.66, m * 0.36, m * 0.22);       // Etiqueta
        g.fillStyle = '#1b1b1b'; for (var b = 0; b < 14; b++) g.fillRect(x + m * 0.15 + b * m * 0.021, yy + m * 0.7, (b % 3 ? 1.5 : 3), m * 0.1);
        g.fillRect(x + m * 0.15, yy + m * 0.83, m * 0.2, 2);
        g.strokeStyle = 'rgba(50,30,12,.75)'; g.lineWidth = 4; g.strokeRect(x + 1, yy + 1, m - 2, m - 2);
        g.strokeStyle = 'rgba(255,230,190,.2)'; g.lineWidth = 1; g.strokeRect(x + 4, yy + 4, m - 8, m - 8);
        g.fillStyle = 'rgba(40,24,10,.5)'; g.font = 'bold ' + (m * 0.09) + 'px Arial'; g.fillText('FRÁGIL ↑↑', x + m * 0.56, yy + m * 0.8);
      }
    });
  }
  function texMadera() {
    return lienzo(256, function (g, n) {
      g.fillStyle = '#c29a63'; g.fillRect(0, 0, n, n);
      for (var y = 0; y < n; y++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '90,58,26' : '240,214,170') + ',' + (Math.random() * 0.22) + ')'; g.fillRect(0, y, n, 1); }
      for (var i = 0; i < 5; i++) { g.strokeStyle = 'rgba(70,42,18,.5)'; g.beginPath(); g.ellipse(Math.random() * n, Math.random() * n, 12, 4, 0, 0, 6.3); g.stroke(); }
      g.fillStyle = 'rgba(40,24,10,.6)'; for (var k = 1; k < 5; k++) g.fillRect(0, k * n / 5 - 2, n, 4);                // Separación entre tablas
    });
  }
  function texPanel() {
    return lienzo(256, function (g, n) {
      g.fillStyle = '#3a4352'; g.fillRect(0, 0, n, n);
      for (var x = 0; x < n; x += 32) { var gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(0.5, 'rgba(0,0,0,.14)'); gr.addColorStop(1, 'rgba(255,255,255,.03)'); g.fillStyle = gr; g.fillRect(x, 0, 32, n); }
      ruido(g, n, 1500, '10,12,18', 0.2);
    }, 14, 1);
  }
  function texRotulo(letra) {
    var t = lienzo(256, function (g, n) {
      g.fillStyle = '#0B4F8A'; g.fillRect(0, 0, n, n); g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(12, 12, n - 24, n - 24);
      g.fillStyle = '#fff'; g.font = 'bold 170px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letra, n / 2, n / 2 + 8);
    });
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
  }
  function texPorton() {
    var t = lienzo(256, function (g, n) {
      g.fillStyle = '#9aa3ae'; g.fillRect(0, 0, n, n);
      for (var y = 0; y < n; y += 16) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y, n, 2); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(0, y + 2, n, 2); }
      for (var x = -n; x < n; x += 28) { g.fillStyle = '#F2C200'; g.beginPath(); g.moveTo(x, n); g.lineTo(x + 14, n); g.lineTo(x + 34, n - 20); g.lineTo(x + 20, n - 20); g.fill(); }
    });
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
  }

  function malla(geo, mat, x, y, z, padre, sombra) {
    var m = new T.Mesh(geo, mat); m.position.set(x, y, z);
    if (sombra !== false) { m.castShadow = true; m.receiveShadow = true; }
    (padre || escena).add(m); return m;
  }
  function caj(w, h, d) { return new T.BoxGeometry(w, h, d); }

  /* ===================== ESTILOS DE NAVE (uno por empresa: Ajustes › Empresa › Bodega) ===================== */
  function estiloActual() { var b = D && D.config && D.config.bodega; return ESTILOS3D[b && b.estilo] ? b.estilo : 'clasico'; }

  // Textura de caja clara: se tiñe con el color de cada posición (rotación, quiebre, categoría…)
  function texCajaClara(tipo) {
    return lienzo(512, function (g, n) {
      var m = n / 2;
      g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, n, n);
      if (tipo === 'cubeta') {                                           // Cubeta plástica con nervios
        for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
          var x = i * m, y = j * m;
          g.fillStyle = 'rgba(0,0,0,.10)'; for (var k = 1; k < 6; k++) g.fillRect(x + k * m / 6 - 3, y + m * 0.12, 6, m * 0.76);
          g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + m * 0.06, y + m * 0.06, m * 0.88, m * 0.05);
          g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + m * 0.36, y + m * 0.2, m * 0.28, m * 0.1);     // Asa
          g.fillStyle = '#ffffff'; g.fillRect(x + m * 0.3, y + m * 0.62, m * 0.4, m * 0.18);
          g.fillStyle = '#222'; for (var b = 0; b < 12; b++) g.fillRect(x + m * 0.33 + b * m * 0.028, y + m * 0.66, (b % 3 ? 2 : 4), m * 0.1);
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, m - 4, m - 4);
        }
        return;
      }
      ruido(g, n, 4000, '0,0,0', 0.06);
      for (var p = 0; p < 2; p++) for (var q = 0; q < 2; q++) {           // 4 cajas por cara, con cinta y etiqueta
        var xx = p * m, yy = q * m;
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(xx, yy + m * 0.44, m, m * 0.12);
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(xx, yy + m * 0.56, m, 3);
        g.fillStyle = '#ffffff'; g.fillRect(xx + m * 0.12, yy + m * 0.66, m * 0.36, m * 0.22);
        g.fillStyle = '#1b1b1b'; for (var c = 0; c < 14; c++) g.fillRect(xx + m * 0.15 + c * m * 0.021, yy + m * 0.7, (c % 3 ? 1.5 : 3), m * 0.1);
        g.strokeStyle = 'rgba(0,0,0,.38)'; g.lineWidth = 4; g.strokeRect(xx + 1, yy + 1, m - 2, m - 2);
      }
    });
  }
  function texPlano(fondo, lineas, rx, ry, ruidoAlfa) {
    return lienzo(512, function (g, n) {
      g.fillStyle = fondo; g.fillRect(0, 0, n, n);
      ruido(g, n, 9000, '0,0,0', ruidoAlfa || 0.06); ruido(g, n, 6000, '255,255,255', (ruidoAlfa || 0.06) * 0.8);
      if (lineas) { g.strokeStyle = lineas; g.lineWidth = 2; g.strokeRect(1, 1, n - 2, n - 2); }
    }, rx || 6, ry || 6);
  }
  function texPanelClaro(base, banda) {
    return lienzo(256, function (g, n) {
      g.fillStyle = base; g.fillRect(0, 0, n, n);
      for (var x = 0; x < n; x += 32) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x, 0, 2, n); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 2, 0, 1, n); }
      if (banda) { g.fillStyle = banda; g.fillRect(0, n * 0.9, n, n * 0.1); }
      ruido(g, n, 800, '0,0,0', 0.05);
    }, 14, 1);
  }
  function texCartel(texto, fondo, color, ancho) {
    var t = lienzo(256, function (g, n) {
      g.fillStyle = fondo; g.fillRect(0, 0, n, n);
      g.fillStyle = color; g.font = 'bold ' + (ancho || 120) + 'px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, n / 2, n / 2 + 6);
    });
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
  }
  function mat(o) { var m = new T.MeshStandardMaterial(o); if (m.envMapIntensity === 1) m.envMapIntensity = 0.7; return m; }
  function luzTecho(c, color, intensidad) {
    // Luminarias lineales LED colgadas en filas
    var g = c.altoG;
    for (var i = 0; i < 4; i++) {
      var zl = c.minZ - 1.5 + (c.maxZ - c.minZ + 3) * i / 3;
      malla(caj(c.largo - 6, 0.08, 0.22), M.lampara, c.centro.x, c.techo - 1.4, zl, g, false);
      malla(caj(c.largo - 6, 0.04, 0.3), M.acero, c.centro.x, c.techo - 1.33, zl, g, false);
      if (i % 2 === 0) { var p = new T.PointLight(color, intensidad, 30, 1.5); p.position.set(c.centro.x, c.techo - 2, zl); grupo.add(p); }
    }
  }
  function paredes(c, matPared, zocalo) {
    conRelieve(matPared, 2.4, 0.9);
    malla(caj(c.largo, c.techo, 0.3), matPared, c.centro.x, c.techo / 2, c.zPared, c.pared1);
    malla(caj(0.3, c.techo, c.fondo), matPared, c.xPared, c.techo / 2, c.centro.z, c.pared2);
    if (zocalo) {
      malla(caj(c.largo, 0.5, 0.36), zocalo, c.centro.x, 0.25, c.zPared + 0.05, c.pared1);
      malla(caj(0.36, 0.5, c.fondo), zocalo, c.xPared + 0.05, 0.25, c.centro.z, c.pared2);
    }
  }
  function piso(c, material, rep) {
    conRelieve(material, 1.6, 0.5);
    var p = malla(new T.PlaneGeometry(c.largo + 30, c.fondo + 30), material, c.centro.x, 0, c.centro.z, grupo); p.rotation.x = -Math.PI / 2; p.castShadow = false;
    material.map.repeat.set((c.largo + 30) / (rep || 6), (c.fondo + 30) / (rep || 6));
  }
  function franja(x, z, ancho, largo, material, giro) {
    var f = malla(new T.PlaneGeometry(ancho, largo), material, x, 0.014, z, grupo, false); f.rotation.x = -Math.PI / 2; if (giro) f.rotation.z = giro; f.receiveShadow = true; return f;
  }
  function paleMixto(x, z, colores, alto) {
    malla(caj(1.2, 0.14, 1.0), M.madera, x, 0.07, z, grupo);
    var k = 0;
    for (var a = 0; a < (alto || 2); a++) for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      var m2 = mat({ map: M.cajaTex, color: colores[k++ % colores.length], roughness: 0.8 });
      malla(caj(0.56, 0.42, 0.46), m2, x - 0.29 + i * 0.58, 0.36 + a * 0.43, z - 0.24 + j * 0.48, grupo);
    }
  }

  var ESTILOS3D = {
    clasico: { nombre: 'Almacén pequeño', caja: 'carton', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0xe9b400, fondo: null },

    /* 1 · Centro de distribución regional (cross-docking): nave clara, andenes con portones numerados y zonas de preparación */
    regional: { nombre: 'Centro regional · cross-docking', caja: 'carton', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0x2e7d32,
      nave: function (c) {
        paredes(c, mat({ map: texPanelClaro('#dfe3e8', '#2e7d32'), roughness: 0.75, metalness: 0.15 }), mat({ color: 0x2e7d32, roughness: 0.6 }));
        piso(c, mat({ map: texPlano('#b9bcc1', 'rgba(0,0,0,.18)', 0, 0, 0.05), roughness: 0.45, metalness: 0.1 }), 5);
        // Andenes en la pared del fondo: portones numerados, sellos, topes y semáforos
        var nAnd = Math.max(3, Math.min(18, Math.floor(c.largo / 4.6))), sep = (c.largo - 6) / nAnd;
        for (var i = 0; i < nAnd; i++) {
          var xa = c.centro.x - (c.largo - 6) / 2 + sep * (i + 0.5);
          malla(new T.PlaneGeometry(3.0, 3.4), mat({ map: texPorton(), roughness: 0.6, metalness: 0.5 }), xa, 1.85, c.zPared + 0.17, c.pared1, false);
          malla(caj(3.6, 0.35, 0.4), M.goma, xa, 3.7, c.zPared + 0.3, c.pared1);
          [-1, 1].forEach(function (l) { malla(caj(0.3, 3.6, 0.4), M.goma, xa + l * 1.65, 1.8, c.zPared + 0.3, c.pared1); malla(caj(0.25, 0.35, 0.3), M.amarillo, xa + l * 1.2, 0.5, c.zPared + 0.35, c.pared1); });
          malla(caj(0.7, 0.7, 0.04), new T.MeshBasicMaterial({ map: texCartel('M' + (i + 1), '#0B4F8A', '#fff', 130), toneMapped: false }), xa, 4.45, c.zPared + 0.2, c.pared1, false);
          malla(new T.SphereGeometry(0.11, 12, 8), new T.MeshBasicMaterial({ color: i % 3 ? 0x22c55e : 0xef4444, toneMapped: false }), xa + 1.95, 2.6, c.zPared + 0.25, c.pared1, false);
          var fz = franja(xa, c.minZ - 2.6, 2.6, 3.0, M.verdeSuelo);                        // Zona de preparación pintada
          if (i % 2 === 0) paleMixto(xa - 0.6, c.minZ - 2.6, [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047], i % 4 ? 1 : 2);
        }
        // Zona central de cross-docking: carriles de consolidación con palés en tránsito
        (c.cortes || []).forEach(function (h) {
          var xm = (h[0] + h[1]) / 2, an = h[1] - h[0] - 2;
          franja(xm, c.centro.z, an, c.maxZ - c.minZ + 2, M.verdeSuelo);
          for (var z = c.minZ + 1; z < c.maxZ - 1; z += 2.6) for (var q = -1; q <= 1; q += 2) paleMixto(xm + q * an * 0.25, z, [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa], ((z * 7 + q) % 3 + 3) % 2 + 1);
          carretilla(xm, c.maxZ + 1, 0.4);
        });
        // Pasillo peatonal verde y carretillas
        franja(c.centro.x, c.maxZ + 3.2, c.largo - 4, 0.9, M.verdeSuelo);
        carretilla(c.maxX + c.W / 2 + 3, c.maxZ + 1.5, -0.9);
        luzTecho(c, 0xeaf2ff, 0.55);
      } },

    /* 2 · Centro de frío: cámara frigorífica, paneles blancos, cortina de lamas, evaporadores y -18 °C */
    frio: { nombre: 'Centro de frío · cámara −18 °C', caja: 'cubeta', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0x1e88e5, fondo: 0xcfe0f2,
      nave: function (c) {
        paredes(c, mat({ map: texPanelClaro('#f4f7fa', '#1565c0'), roughness: 0.55, metalness: 0.1 }), mat({ color: 0x1565c0, roughness: 0.5 }));
        piso(c, mat({ map: texPlano('#c9d3de', null, 0, 0, 0.035), roughness: 0.25, metalness: 0.15 }), 8);
        // Puerta frigorífica con cortina de lamas translúcidas
        var xp = c.maxX + c.W / 2 + 3.2;
        malla(caj(3.6, 4.0, 0.2), mat({ color: 0xe8edf2, roughness: 0.4, metalness: 0.3 }), xp, 2.0, c.zPared + 0.12, c.pared1);
        var lama = new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0.1 });
        for (var k = 0; k < 14; k++) malla(caj(0.2, 3.7, 0.02), lama, xp - 1.5 + k * 0.23, 1.95, c.zPared + 0.3 + (k % 2) * 0.02, c.pared1, false);
        // Evaporadores en la pared lateral
        for (var e = 0; e < 3; e++) {
          var ze = c.minZ + (c.maxZ - c.minZ) * (e + 0.5) / 3, gE = new T.Group(); gE.position.set(c.xPared + 0.7, c.techo - 2.2, ze); c.pared2.add(gE);
          malla(caj(1.1, 1.1, 3.2), mat({ color: 0xf0f3f6, roughness: 0.35, metalness: 0.4 }), 0, 0, 0, gE);
          for (var v = 0; v < 3; v++) { var a = malla(new T.CircleGeometry(0.42, 24), mat({ color: 0x29323d, roughness: 0.6 }), 0.56, 0, -1.05 + v * 1.05, gE, false); a.rotation.y = Math.PI / 2; }
        }
        // Pantalla de temperatura
        malla(caj(1.6, 0.8, 0.05), new T.MeshBasicMaterial({ map: texCartel('−18 °C', '#0b1324', '#38bdf8', 64), toneMapped: false }), c.centro.x, c.techo - 2.6, c.zPared + 0.2, c.pared1, false);
        franja(c.centro.x, c.maxZ + 3.2, c.largo - 4, 0.12, M.lineaAzul);
        franja(c.centro.x, c.maxZ + 4.2, c.largo - 4, 0.12, M.lineaAzul);
        luzTecho(c, 0xdff0ff, 0.6);
      } },

    /* 3 · Hub de e-commerce (fulfillment): nave oscura, racks amarillos, cinta transportadora, mesas de empaque y robots */
    ecommerce: { nombre: 'Hub e-commerce · fulfillment', caja: 'cubeta', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0xf2b705, fondo: null,
      nave: function (c) {
        paredes(c, mat({ map: texPanelClaro('#e6e9ee', '#f2b705'), roughness: 0.7, metalness: 0.2 }), M.amarillo);
        piso(c, mat({ map: texPlano('#5b6470', null, 0, 0, 0.05), roughness: 0.3, metalness: 0.2 }), 6);
        // Cinta transportadora de rodillos a lo largo del frente de los racks
        var zc = c.maxZ + 3.0, x0 = c.minX - c.W / 2 - 1, x1 = c.maxX + c.W / 2 + 1, lon = x1 - x0, xm = (x0 + x1) / 2;
        malla(caj(lon, 0.08, 0.9), M.acero, xm, 0.9, zc, grupo);
        malla(caj(lon, 0.04, 0.8), mat({ color: 0x15171b, roughness: 0.9 }), xm, 0.95, zc, grupo);
        [-1, 1].forEach(function (l) { malla(caj(lon, 0.18, 0.05), M.amarillo, xm, 0.98, zc + l * 0.47, grupo); });
        for (var x = x0 + 0.6; x < x1; x += 2.2) [-1, 1].forEach(function (l) { malla(caj(0.08, 0.9, 0.08), M.acero, x, 0.45, zc + l * 0.38, grupo); });
        var colores = [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa];
        for (var b = 0; b < Math.floor(lon / 1.6); b++) malla(caj(0.5, 0.3, 0.4), mat({ map: M.cubetaTex, color: colores[b % colores.length], roughness: 0.5 }), x0 + 0.8 + b * 1.6, 1.12, zc, grupo);
        (c.cortes || []).forEach(function (h) {
          var xm2 = (h[0] + h[1]) / 2, lz = c.maxZ - c.minZ + 4, zm = (c.minZ + c.maxZ) / 2;
          malla(caj(0.9, 0.08, lz), M.acero, xm2, 0.9, zm, grupo); malla(caj(0.8, 0.04, lz), mat({ color: 0x15171b, roughness: 0.9 }), xm2, 0.95, zm, grupo);
          [-1, 1].forEach(function (l) { malla(caj(0.05, 0.18, lz), M.amarillo, xm2 + l * 0.47, 0.98, zm, grupo); });
          for (var z2 = c.minZ - 1; z2 < c.maxZ + 2; z2 += 2.2) [-1, 1].forEach(function (l) { malla(caj(0.08, 0.9, 0.08), M.acero, xm2 + l * 0.38, 0.45, z2, grupo); });
          for (var q2 = 0; q2 < Math.floor(lz / 1.6); q2++) malla(caj(0.4, 0.3, 0.5), mat({ map: M.cubetaTex, color: [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa][q2 % 5], roughness: 0.5 }), xm2, 1.12, c.minZ - 1 + q2 * 1.6, grupo);
          [[xm2 - 2.5, c.centro.z - 3], [xm2 + 2.5, c.centro.z + 4]].forEach(function (p) {
            malla(caj(0.9, 0.3, 0.7), mat({ color: 0xff6d00, roughness: 0.5 }), p[0], 0.18, p[1], grupo);
            malla(caj(0.2, 0.05, 0.2), new T.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false }), p[0], 0.36, p[1], grupo, false);
          });
        });
        // Mesas de empaque con pantalla
        for (var m = 0; m < 3; m++) {
          var xe = x0 + lon * (m + 0.5) / 3, ze = zc + 2.2;
          malla(caj(2.0, 0.08, 0.9), mat({ color: 0xd9d4c7, roughness: 0.7 }), xe, 0.92, ze, grupo);
          [-0.9, 0.9].forEach(function (l) { malla(caj(0.06, 0.9, 0.8), M.acero, xe + l, 0.45, ze, grupo); });
          malla(caj(0.55, 0.36, 0.04), new T.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false }), xe, 1.45, ze + 0.3, grupo, false);
          malla(caj(0.05, 0.4, 0.05), M.acero, xe, 1.15, ze + 0.32, grupo);
        }
        // Robots móviles (AMR) en el piso
        [[c.minX + 1, c.minZ - 2.4], [c.centro.x, c.minZ - 3.2], [c.maxX - 1, zc - 1.6]].forEach(function (p, i) {
          malla(caj(0.9, 0.3, 0.7), mat({ color: 0xff6d00, roughness: 0.5 }), p[0], 0.18, p[1], grupo);
          malla(caj(0.2, 0.05, 0.2), new T.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false }), p[0], 0.36, p[1], grupo, false);
        });
        franja(xm, c.minZ - 2.8, lon, 0.1, M.amarillo); franja(xm, zc - 1.0, lon, 0.1, M.amarillo);
        luzTecho(c, 0xfff3e0, 0.55);
      } }
  };

  /** Colores más marcados para las cajas en 3D (mismo tono que la leyenda, más saturado). */
  function tonoCaja(hex, i) {
    var col = new T.Color(hex), hsl = {}; col.getHSL(hsl);
    var var_ = ((i * 37) % 9 - 4) / 100;                                  // ligera variación entre cajas
    col.setHSL(hsl.h, Math.min(1, hsl.s * 1.4 + 0.15), Math.max(0.22, Math.min(0.42, hsl.l * 0.72 + var_)));
    return col;
  }

  /* ===================== RACKS (genérico e instanciado) =====================
     Soporta: bloques separados por cortes (pasillos transversales), racks dobles espalda con espalda
     y alturas distintas por bloque. Todo con InstancedMesh para naves de miles de posiciones. */
  var _rotulos = {};
  function rotuloMat(letra) { return _rotulos[letra] || (_rotulos[letra] = new T.MeshBasicMaterial({ map: texRotulo(letra), toneMapped: false })); }
  function instanciar(geo, material, lista, sombra) {
    if (!lista.length) return;
    var m = new T.InstancedMesh(geo, material, lista.length), o = new T.Object3D();
    lista.forEach(function (p, i) { o.position.set(p[0], p[1], p[2]); o.scale.set(p[3], p[4], p[5]); o.rotation.set(p[6] || 0, 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = m.receiveShadow = sombra !== false; m.frustumCulled = false; grupo.add(m); return m;
  }
  /** Huecos en X (cortes entre bloques) para que cada estilo decore esas zonas. */
  function cortesX(U, W) {
    var xs = unicos(U.map(function (u) { return String(u.x); })).map(Number).sort(function (a, b) { return a - b; }), r = [];
    for (var i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > W * 1.5) r.push([xs[i - 1] + W / 2, xs[i] - W / 2]);
    return r;
  }
  function construirRacks(U, W, H, Dp) {
    var pil = {}, pies = [], trav = [], diag = [], guardas = [], vigas = [], rejillas = [], lineas = [], filas = {};
    U.forEach(function (u) { (filas[u.y] = filas[u.y] || []).push(u); });
    var ys = Object.keys(filas).map(Number).sort(function (a, b) { return a - b; });
    ys.forEach(function (zc, iy) {
      var fila = filas[zc], xs = unicos(fila.map(function (u) { return String(u.x); })).map(Number).sort(function (a, b) { return a - b; });
      var segs = [], seg = [xs[0]];
      for (var i = 1; i < xs.length; i++) { if (xs[i] - xs[i - 1] > W * 1.5) { segs.push(seg); seg = [xs[i]]; } else seg.push(xs[i]); }
      segs.push(seg);
      var vecinoAntes = iy > 0 && zc - ys[iy - 1] < Dp + 0.8, vecinoDespues = iy < ys.length - 1 && ys[iy + 1] - zc < Dp + 0.8;
      segs.forEach(function (sx) {
        var en = fila.filter(function (u) { return u.x >= sx[0] - 0.01 && u.x <= sx[sx.length - 1] + 0.01; });
        var zs = unicos(en.map(function (u) { return String(u.z); })).map(Number).sort(function (a, b) { return a - b; });
        var x0 = sx[0] - W / 2, x1 = sx[sx.length - 1] + W / 2, hTot = zs[zs.length - 1] + H * 0.92, lon = x1 - x0, xm = (x0 + x1) / 2;
        var postes = []; for (var k = 0; k < sx.length; k += 2) postes.push(sx[k] - W / 2); postes.push(x1);
        postes.forEach(function (xp) {
          var hk = hTot.toFixed(2); pil[hk] = pil[hk] || [];
          [-1, 1].forEach(function (l) { pil[hk].push([xp, hTot / 2, zc + l * Dp / 2, 1, hTot, 1]); pies.push([xp, 0.01, zc + l * Dp / 2, 1, 1, 1]); });
          // Marco: travesaños horizontales y diagonales en zigzag (galvanizados, como en un rack real)
          var paso = 1.1, ang = Math.atan2(paso, Dp - 0.06), largoD = Math.sqrt(paso * paso + (Dp - 0.06) * (Dp - 0.06)), k2 = 0;
          for (var yt = 0.15; yt < hTot - 0.1; yt += paso) {
            trav.push([xp, yt, zc, 1, 1, Dp - 0.06]);
            if (yt + paso < hTot) { diag.push([xp, yt + paso / 2, zc, 1, 1, largoD, k2 % 2 ? ang : -ang]); k2++; }
          }
        });
        zs.forEach(function (z) {
          if (z < 0.2) return;
          [-1, 1].forEach(function (l) { vigas.push([xm, z - 0.055, zc + l * (Dp / 2 + 0.02), lon, 1, 1]); });
          rejillas.push([xm, z + 0.005, zc, lon - 0.1, 1, Dp - 0.06]);
        });
        // Protectores amarillos de cabecera en los extremos del rack
        [x0 - 0.16, x1 + 0.16].forEach(function (xg) { guardas.push([xg, 0.22, zc, 1, 1, Dp + 0.24]); });
        var mr = rotuloMat(en[0].pasillo);
        [x0 - 0.05, x1 + 0.05].forEach(function (xr) {
          malla(caj(0.04, 0.72, 0.72), [mr, mr, M.acero, M.acero, M.acero, M.acero], xr, hTot + 0.52, zc, grupo, false);
          malla(caj(0.04, 0.2, 0.04), M.acero, xr, hTot + 0.08, zc, grupo, false);
        });
        if (!vecinoAntes) lineas.push([xm, 0.012, zc - (Dp / 2 + 0.32), lon + 1.2, 1, 1]);
        if (!vecinoDespues) lineas.push([xm, 0.012, zc + (Dp / 2 + 0.32), lon + 1.2, 1, 1]);
      });
    });
    Object.keys(pil).forEach(function (hk) { instanciar(caj(0.1, 1, 0.075), materialMontante(Number(hk)), pil[hk]); });
    instanciar(caj(0.16, 0.02, 0.16), M.acero, pies);
    instanciar(caj(0.035, 0.035, 1), M.galvanizado, trav);
    instanciar(caj(0.03, 0.03, 1), M.galvanizado, diag);
    instanciar(caj(0.14, 0.44, 1), M.amarillo, guardas);
    instanciar(caj(1, 0.11, 0.05), M.viga, vigas);
    instanciar(caj(1, 0.015, 1), M.rejilla, rejillas, false);
    instanciar(caj(1, 0.004, 0.09), M.lineaRack, lineas, false);
  }

  /** Genera las posiciones de una nave según su trazado (misma fórmula que la base de datos). */
  function generarUbicaciones(b) {
    var r = [], dos = function (n) { return ('0' + n).slice(-2); }, bloques = Math.max(1, b.bloques || 1), porBloque = Math.ceil(b.racks / bloques);
    (b.pasillos || []).forEach(function (p, i) {
      var y = b.dobles ? Math.floor(i / 2) * b.separacion + (i % 2) * 1.35 : i * b.separacion;
      for (var k = 1; k <= b.racks; k++) {
        var bl = Math.floor((k - 1) / porBloque), niv = (b.nivelesBloque && b.nivelesBloque[bl]) || b.niveles;
        for (var n = 1; n <= niv; n++) r.push({ id: 'UB-' + p + dos(k) + '-' + n, pasillo: p, rack: k, nivel: n, pos: p + '-' + dos(k) + '-N' + n,
          x: Math.round(((k - 1) * b.ancho + bl * (b.corte || 0)) * 100) / 100, y: Math.round(y * 100) / 100, z: Math.round((n - 1) * b.alto * 100) / 100, sku: '' });
      }
    });
    return r;
  }

  /* ===================== TEXTURAS PREMIUM =====================
     Relieve (normal map) calculado desde cada textura, reflejos de entorno (PMREM) y acabados
     de metal con laca. Las cajas conservan su color sólido. */
  function relieve(tex, fuerza) {
    var src = tex.image, w = src.width, h = src.height, g = src.getContext('2d'), d = g.getImageData(0, 0, w, h).data;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var gc = c.getContext('2d'), out = gc.createImageData(w, h), o = out.data, f = fuerza || 2;
    var lum = function (x, y) { x = (x + w) % w; y = (y + h) % h; var k = (y * w + x) * 4; return (d[k] * 0.299 + d[k + 1] * 0.587 + d[k + 2] * 0.114) / 255; };
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var dx = (lum(x - 1, y) - lum(x + 1, y)) * f, dy = (lum(x, y - 1) - lum(x, y + 1)) * f, l = Math.sqrt(dx * dx + dy * dy + 1), k = (y * w + x) * 4;
      o[k] = (dx / l * 0.5 + 0.5) * 255; o[k + 1] = (dy / l * 0.5 + 0.5) * 255; o[k + 2] = (1 / l * 0.5 + 0.5) * 255; o[k + 3] = 255;
    }
    gc.putImageData(out, 0, 0);
    var t = new T.CanvasTexture(c); t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.repeat.copy(tex.repeat); t.anisotropy = 8; return t;
  }
  function conRelieve(material, fuerza, escala) {
    if (!material.map || material.normalMap) return material;
    material.normalMap = relieve(material.map, fuerza); material.normalScale = new T.Vector2(escala || 0.8, escala || 0.8);
    material.normalMap.repeat = material.map.repeat; material.needsUpdate = true; return material;
  }
  function entornoPremium() {
    // Nave virtual para los reflejos: degradado de techo a piso con filas de luminarias
    var pm = new T.PMREMGenerator(render), s = new T.Scene();
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
    var g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#f4f7fb'); gr.addColorStop(0.45, '#c9d1dc'); gr.addColorStop(0.55, '#6d7480'); gr.addColorStop(1, '#2a2e35');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    var tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding;
    s.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.MeshBasicMaterial({ map: tex, side: T.BackSide })));
    for (var i = -2; i <= 2; i++) { var p = new T.Mesh(new T.PlaneGeometry(60, 2.2), new T.MeshBasicMaterial({ color: 0xffffff })); p.position.set(0, 18, i * 9); p.rotation.x = Math.PI / 2; s.add(p); }
    escena.environment = pm.fromScene(s, 0.035).texture; pm.dispose();
  }
  function rejillaAlambre() {
    // Malla de alambre real (transparente entre alambres) para los entrepaños
    var t = lienzo(256, function (g, n) {
      g.fillStyle = '#000'; g.fillRect(0, 0, n, n); g.fillStyle = '#fff';
      for (var k = 0; k < n; k += 32) { g.fillRect(k, 0, 5, n); g.fillRect(0, k, n, 3); }
    }, 1, 1);
    t.encoding = T.LinearEncoding; return t;
  }
  function materialesPremium() {
    entornoPremium();
    render.toneMappingExposure = 1.04;
    var laca = function (color) { return new T.MeshPhysicalMaterial({ color: color, roughness: 0.34, metalness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.9 }); };
    M.pilar = laca(0x1c4f9c); M.viga = laca(0xf0661a);
    M.pilar.envMapIntensity = 0.35; M.pilar.metalness = 0.15; M.pilar.clearcoat = 0.35;
    M.viga.envMapIntensity = 0.3; M.viga.metalness = 0.1; M.viga.clearcoat = 0.3; M.viga.roughness = 0.4;
    M.viga.map = texViga(); M.viga.normalMap = relieve(M.viga.map, 3); M.viga.normalMap.repeat = M.viga.map.repeat;
    M.galvanizado = new T.MeshStandardMaterial({ color: 0xd3d8de, roughness: 0.32, metalness: 0.85, envMapIntensity: 1.0 });
    M.pared = new T.MeshStandardMaterial({ map: texPanelClaro('#e3e7ec', '#1c4f9c'), roughness: 0.7, metalness: 0.2 });
    M.acero = new T.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.0 });
    M.amarillo = new T.MeshPhysicalMaterial({ color: 0xe9b400, roughness: 0.45, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    var malla_ = rejillaAlambre();
    M.rejilla = new T.MeshStandardMaterial({ color: 0xaab3c0, roughness: 0.35, metalness: 0.85, alphaMap: malla_, transparent: false, alphaTest: 0.5, side: T.DoubleSide });
    M.rejilla.alphaMap.repeat.set(6, 3);
    conRelieve(M.madera, 3.2, 0.9); M.madera.roughness = 0.78;
    conRelieve(M.piso, 1.6, 0.55); M.piso.roughness = 0.38; M.piso.metalness = 0.05; M.piso.envMapIntensity = 0.75;
    conRelieve(M.pared, 2.4, 0.9); M.pared.envMapIntensity = 0.6;
    M.cajaCarton.normalMap = relieve(M.cajaTex, 1.2); M.cajaCarton.normalScale = new T.Vector2(0.35, 0.35);
    M.cajaCubeta.normalMap = relieve(M.cubetaTex, 2.0); M.cajaCubeta.normalScale = new T.Vector2(0.6, 0.6);
    M.cajaCubeta.envMapIntensity = 0.25; M.cajaCarton.envMapIntensity = 0.15;
  }

  /* ===================== RACK REALISTA (montante azul perforado, viga naranja, marco galvanizado) ===================== */
  var _montantes = {};
  function texMontante() {
    // Cara del montante: pintura azul con perforaciones en dos columnas (ranuras tipo lágrima)
    return lienzo(128, function (g, n) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n);
      ruido(g, n, 600, '0,0,0', 0.05);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, n * 0.08, n); g.fillRect(n * 0.92, 0, n * 0.08, n);       // pliegues laterales
      for (var y = 10; y < n; y += 64) [0.32, 0.68].forEach(function (cx) {
        g.fillStyle = '#0b1220'; g.beginPath(); g.ellipse(n * cx, y + 8, n * 0.035, 7, 0, 0, Math.PI * 2); g.fill();
        g.fillRect(n * cx - n * 0.016, y + 13, n * 0.032, 9);
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(n * cx - n * 0.04, y + 25, n * 0.08, 1);
      });
    }, 1, 1);
  }
  function materialMontante(alto) {
    var k = alto.toFixed(1);
    if (_montantes[k]) return _montantes[k];
    if (!M._texMontante) { M._texMontante = texMontante(); M._normMontante = relieve(M._texMontante, 4); }
    var map = M._texMontante.clone(), nor = M._normMontante.clone();
    map.needsUpdate = nor.needsUpdate = true; map.repeat.set(1, alto * 9); nor.repeat.set(1, alto * 9);
    var m = new T.MeshPhysicalMaterial({ color: M.pilar.color.getHex(), map: map, normalMap: nor, normalScale: new T.Vector2(0.7, 0.7),
      roughness: 0.42, metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.35 });
    return (_montantes[k] = m);
  }
  function texViga() {
    // Viga tipo escalón: cara frontal pintada con canto superior y sombra del escalón
    return lienzo(128, function (g, n) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); ruido(g, n, 500, '0,0,0', 0.05);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, n, n * 0.14);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, n * 0.14, n, n * 0.05);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, n * 0.9, n, n * 0.1);
    }, 6, 1);
  }

  function iniciar() {
    caja = $('lienzo');
    if (!T) { fallo = 'No se pudo cargar el motor 3D (hace falta conexión a internet).'; return false; }
    try {
      render = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (e) { fallo = 'Este dispositivo no admite gráficos 3D (WebGL).'; return false; }
    render.outputEncoding = T.sRGBEncoding;
    render.toneMapping = T.ACESFilmicToneMapping; render.toneMappingExposure = 1.05;
    render.shadowMap.type = T.PCFSoftShadowMap;
    caja.insertBefore(render.domElement, caja.firstChild);
    escena = new T.Scene(); escena.background = new T.Color(0x070c17); escena.fog = new T.Fog(0x070c17, 34, 80); tema();
    camara = new T.PerspectiveCamera(42, 1, 0.1, 200);
    rayo = new T.Raycaster(); raton = new T.Vector2();
    M = {
      piso: new T.MeshStandardMaterial({ map: texHormigon(), roughness: 0.62, metalness: 0.08 }),
      pared: new T.MeshStandardMaterial({ map: texPanel(), roughness: 0.8, metalness: 0.25 }),
      pilar: new T.MeshStandardMaterial({ color: 0x1f5fae, roughness: 0.42, metalness: 0.55 }),
      viga: new T.MeshStandardMaterial({ color: 0xe8701c, roughness: 0.45, metalness: 0.45 }),
      rejilla: new T.MeshStandardMaterial({ color: 0x8d96a6, roughness: 0.5, metalness: 0.7, transparent: true, opacity: 0.55 }),
      madera: new T.MeshStandardMaterial({ map: texMadera(), roughness: 0.85 }),
      carton: new T.MeshStandardMaterial({ map: texCarton(), roughness: 0.88 }),
      banda: new T.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.0 }),
      etiqueta: new T.MeshBasicMaterial({ toneMapped: false }),
      amarillo: new T.MeshStandardMaterial({ color: 0xe9b400, roughness: 0.7 }),
      acero: new T.MeshStandardMaterial({ color: 0x2a313d, roughness: 0.5, metalness: 0.7 }),
      goma: new T.MeshStandardMaterial({ color: 0x111317, roughness: 0.9 }),
      lampara: new T.MeshBasicMaterial({ color: 0xfff4d6, toneMapped: false }),
      hueco: new T.MeshBasicMaterial({ visible: false })
    };
    M.cajaTex = texCajaClara('carton'); M.cubetaTex = texCajaClara('cubeta');
    M.cajaCarton = new T.MeshStandardMaterial({ map: M.cajaTex, roughness: 0.82 });
    M.cajaCubeta = new T.MeshStandardMaterial({ map: M.cubetaTex, roughness: 0.42, metalness: 0.05 });
    M.verdeSuelo = new T.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6, transparent: true, opacity: 0.8 });
    M.lineaAzul = new T.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.6 });
    M.lineaRack = new T.MeshStandardMaterial({ color: 0xe9b400, roughness: 0.7 });
    materialesPremium();
    escena.add(new T.HemisphereLight(0xcfe0ff, 0x30333a, 0.5));
    sol = new T.DirectionalLight(0xfff1dc, 1.05); sol.castShadow = true; sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03;
    escena.add(sol); escena.add(sol.target);
    controles();
    listo = true;
    return true;
  }

  /** Construye la nave y los racks a partir de las ubicaciones del maestro. */
  function construir() {
    if (grupo) { escena.remove(grupo); grupo.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    grupo = new T.Group(); escena.add(grupo);
    var U = D.ubicaciones; orden = U.map(function (u) { return u.id; });
    if (!U.length) return;
    var paso = function (vals, def) { var s = unicos(vals.map(String)).map(Number).sort(function (a, b) { return a - b; }), m = Infinity; for (var i = 1; i < s.length; i++) m = Math.min(m, s[i] - s[i - 1]); return isFinite(m) && m > 0.3 ? m : def; };
    dim.w = paso(U.map(function (u) { return u.x; }), 1.45); dim.h = paso(U.map(function (u) { return u.z; }), 1.5);
    dim.d = Math.min(1.15, Math.max(1.0, paso(U.map(function (u) { return u.y; }), 3.6) * 0.45));
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, alto = 0;
    U.forEach(function (u) { minX = Math.min(minX, u.x); maxX = Math.max(maxX, u.x); minZ = Math.min(minZ, u.y); maxZ = Math.max(maxZ, u.y); alto = Math.max(alto, u.z); });
    var W = dim.w, H = dim.h, Dp = dim.d, techo = Math.max(10.5, alto + H + 4.5);
    centro = { x: (minX + maxX) / 2, y: (alto + H) / 2 * 0.8, z: (minZ + maxZ) / 2 };
    radioBase = Math.max(maxX - minX + 6, (maxZ - minZ) * 1.25 + 8, 12) * 1.02;
    var largo = maxX - minX + W + 16, fondo = maxZ - minZ + 18;
    escena.fog.near = Math.max(34, radioBase * 1.4); escena.fog.far = Math.max(80, radioBase * 3.4); camara.far = Math.max(200, radioBase * 6); camara.updateProjectionMatrix();

    var E = ESTILOS3D[estiloActual()];
    M.pilar.color.setHex(E.pilar); M.viga.color.setHex(E.viga); M.lineaRack.color.setHex(E.linea);
    if (E.fondo) { escena.background.setHex(E.fondo); escena.fog.color.setHex(E.fondo); } else tema();
    if (E.nave) {
      var zPared = minZ - 5.5, xPared = minX - W / 2 - 7;
      var pared1 = new T.Group(), pared2 = new T.Group(), altoG = new T.Group(); grupo.add(pared1); grupo.add(pared2); grupo.add(altoG);
      grupo.userData.ocultar = { pared1: pared1, pared2: pared2, alto: altoG, z: zPared, x: xPared, y: techo - 1.6 };
      E.nave({ minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ, W: W, H: H, Dp: Dp, techo: techo, largo: largo, fondo: fondo,
        zPared: zPared, xPared: xPared, pared1: pared1, pared2: pared2, altoG: altoG, centro: centro, cortes: cortesX(U, W) });
    } else {
    // Nave: piso, paredes, portón, cerchas y lámparas
    var piso = malla(new T.PlaneGeometry(largo + 30, fondo + 30), M.piso, centro.x, 0, centro.z, grupo); piso.rotation.x = -Math.PI / 2; piso.castShadow = false;
    M.piso.map.repeat.set((largo + 30) / 6, (fondo + 30) / 6);
    var zPared = minZ - 5.5, xPared = minX - W / 2 - 7;
    var pared1 = new T.Group(), pared2 = new T.Group(), altoG = new T.Group(); grupo.add(pared1); grupo.add(pared2); grupo.add(altoG);
    grupo.userData.ocultar = { pared1: pared1, pared2: pared2, alto: altoG, z: zPared, x: xPared, y: techo - 1.6 };
    malla(caj(largo, techo, 0.3), M.pared, centro.x, techo / 2, zPared, pared1);
    malla(caj(0.3, techo, fondo), M.pared, xPared, techo / 2, centro.z, pared2);
    malla(caj(largo, 0.5, 0.36), M.amarillo, centro.x, 0.25, zPared + 0.05, pared1);
    var porton = malla(new T.PlaneGeometry(4.2, 4.4), new T.MeshStandardMaterial({ map: texPorton(), roughness: 0.6, metalness: 0.5 }), maxX + W / 2 + 3.5, 2.2, zPared + 0.17, pared1, false); porton.receiveShadow = true;
    malla(caj(4.6, 0.25, 0.3), M.amarillo, maxX + W / 2 + 3.5, 4.5, zPared + 0.2, pared1);
    var lamparas = new T.Group(); grupo.add(lamparas);
    for (var c = 0; c < 4; c++) {
      var xc = minX - 2 + (maxX - minX + 4) * c / 3;
      malla(caj(0.22, 0.4, fondo), M.acero, xc, techo - 0.2, centro.z, altoG, false);
      for (var l = 0; l < 2; l++) {
        var zl = minZ + (maxZ - minZ) * (l ? 0.85 : 0.15) + 1.6;
        malla(caj(0.03, 1.1, 0.03), M.acero, xc, techo - 0.95, zl, altoG, false);
        malla(new T.CylinderGeometry(0.16, 0.48, 0.32, 20, 1, true), M.acero, xc, techo - 1.6, zl, altoG, false);
        malla(new T.CircleGeometry(0.4, 20), M.lampara, xc, techo - 1.75, zl, altoG, false).rotation.x = Math.PI / 2;
        if ((c + l) % 2 === 0) { var p = new T.PointLight(0xffe9c2, 0.5, 26, 1.6); p.position.set(xc, techo - 2, zl); lamparas.add(p); }
      }
    }
    }
    sol.position.set(centro.x + 9, techo + 9, centro.z + 12); sol.target.position.set(centro.x, 0, centro.z);
    var s = Math.max(largo, fondo) * 0.62, sc = sol.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = 1; sc.far = 80; sc.updateProjectionMatrix();

    construirRacks(U, W, H, Dp);

    // Posiciones: palé, carga, banda de color, etiqueta y volumen para el clic (todo instanciado)
    var n = U.length, inst = function (geo, mat, cuantos, sombra) { var m = new T.InstancedMesh(geo, mat, cuantos); m.castShadow = m.receiveShadow = sombra !== false; m.frustumCulled = false; grupo.add(m); return m; };
    var tablas = inst(caj(1.2, 0.025, 1.0), M.madera, n * 2), tacos = inst(caj(1.2, 0.09, 0.11), M.madera, n * 3);
    cargas = inst(caj(1.08, 1, 0.94), E.caja === 'cubeta' ? M.cajaCubeta : M.cajaCarton, n); bandas = inst(caj(1.1, 0.1, 0.96), M.banda, n);
    etiquetas = inst(caj(0.62, 0.085, 0.02), M.etiqueta, n, false); huecos = inst(caj(W * 0.96, H * 0.9, Dp), M.hueco, n, false);
    tablas.userData.n = n;
    grupo.userData.tablas = tablas; grupo.userData.tacos = tacos;
    marco = new T.LineSegments(new T.EdgesGeometry(caj(W * 0.98, H * 0.92, Dp + 0.08)), new T.LineBasicMaterial({ color: 0xffffff, toneMapped: false, depthTest: false, transparent: true }));
    marco.renderOrder = 5; marco.visible = false; grupo.add(marco);

    carretilla(minX - W / 2 - 3.2, maxZ + 2.6, 0.6);
    // Palés vacíos apilados junto a la pared
    for (var k = 0; k < 6; k++) malla(caj(1.2, 0.14, 1.0), M.madera, maxX + W / 2 + 3.4, 0.07 + k * 0.15, minZ - 3.4, grupo).rotation.y = (k % 2) * 0.06;
    actualizar();
  }

  function carretilla(x, z, giro) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = giro; grupo.add(g);
    malla(caj(1.05, 0.55, 1.5), M.amarillo, 0, 0.6, 0, g); malla(caj(1.05, 0.5, 0.5), M.acero, 0, 0.72, -0.85, g);
    malla(caj(0.5, 0.12, 0.5), M.goma, 0, 0.95, -0.1, g); malla(caj(0.5, 0.5, 0.1), M.goma, 0, 1.2, -0.38, g);
    [[-0.48, 0.55], [0.48, 0.55], [-0.48, -0.7], [0.48, -0.7]].forEach(function (p) { malla(caj(0.05, 1.3, 0.05), M.acero, p[0], 1.5, p[1], g); });
    malla(caj(1.06, 0.05, 1.35), M.acero, 0, 2.17, -0.07, g);
    [-0.3, 0.3].forEach(function (px) { malla(caj(0.09, 2.5, 0.12), M.acero, px, 1.4, 0.85, g); malla(caj(0.11, 0.045, 1.1), M.acero, px, 0.14, 1.45, g); });
    malla(caj(0.8, 0.5, 0.05), M.acero, 0, 0.42, 0.93, g);
    [[-0.5, 0.5, 0.3], [0.5, 0.5, 0.3], [-0.45, -0.75, 0.24], [0.45, -0.75, 0.24]].forEach(function (p) { var r = malla(new T.CylinderGeometry(p[2], p[2], 0.22, 20), M.goma, p[0], p[2], p[1], g); r.rotation.z = Math.PI / 2; });
  }

  /** Recoloca y recolorea las posiciones según los datos actuales. */
  function actualizar() {
    if (!listo || !cargas) return;
    var o = new T.Object3D(), col = new T.Color(), U = D.ubicaciones, Dp = dim.d, t = grupo.userData, cero = new T.Matrix4().makeScale(0, 0, 0);
    var maximo = 1; U.forEach(function (u) { maximo = Math.max(maximo, C.ubi[u.id].stock); });
    U.forEach(function (u, i) {
      var x = C.ubi[u.id], hay = !!x.it, y = u.z + (u.z < 0.2 ? 0 : 0.012), pasa = pasaFiltro(x);
      var poner = function (mesh, k, px, py, pz, sx, sy, sz) { o.position.set(px, py, pz); o.scale.set(sx || 1, sy || 1, sz || 1); o.rotation.set(0, 0, 0); o.updateMatrix(); mesh.setMatrixAt(k, o.matrix); };
      if (hay && pasa) {
        poner(t.tablas, i * 2, u.x, y + 0.0125, u.y); poner(t.tablas, i * 2 + 1, u.x, y + 0.1275, u.y);
        for (var k = 0; k < 3; k++) poner(t.tacos, i * 3 + k, u.x, y + 0.07, u.y + (k - 1) * 0.44);
        // Toda posición ocupada muestra al menos una caja, aunque el stock esté en cero
        var lleno = 0.3 + 0.7 * Math.sqrt(Math.min(1, Math.max(0, x.stock) / (maximo * 0.6))), h = (dim.h - 0.42) * lleno;
        poner(cargas, i, u.x, y + 0.14 + h / 2, u.y, 1, h, 1); poner(bandas, i, u.x, y + 0.14 + h * 0.62, u.y);
        cargas.setColorAt(i, col.setRGB(1, 1, 1));
      } else {
        t.tablas.setMatrixAt(i * 2, cero); t.tablas.setMatrixAt(i * 2 + 1, cero);
        for (var j = 0; j < 3; j++) t.tacos.setMatrixAt(i * 3 + j, cero);
        cargas.setMatrixAt(i, cero); bandas.setMatrixAt(i, cero); cargas.setColorAt(i, col.setRGB(1, 1, 1));
      }
      if (pasa) {
        poner(etiquetas, i, u.x, u.z < 0.2 ? 0.05 : u.z - 0.055, u.y + Dp / 2 + (u.z < 0.2 ? 0.2 : 0.055));
        poner(huecos, i, u.x, u.z + dim.h * 0.45, u.y);
      } else { etiquetas.setMatrixAt(i, cero); huecos.setMatrixAt(i, cero); }
    });
    [t.tablas, t.tacos, cargas, bandas, etiquetas, huecos].forEach(function (m) { m.instanceMatrix.needsUpdate = true; });
    cargas.instanceColor.needsUpdate = true;
    colorear(); seleccionar();
  }

  function colorear() {
    if (!listo || !bandas) return;
    var col = new T.Color();
    D.ubicaciones.forEach(function (u, i) {
      var x = C.ubi[u.id]; col.set(colorUbi(x));
      etiquetas.setColorAt(i, col);
      var tono = x.it ? tonoCaja(colorUbi(x), i) : new T.Color(1, 1, 1);
      cargas.setColorAt(i, tono); bandas.setColorAt(i, tono.clone().multiplyScalar(0.55));
    });
    etiquetas.instanceColor.needsUpdate = true; bandas.instanceColor.needsUpdate = true; cargas.instanceColor.needsUpdate = true;
    $('b-leyenda').innerHTML = leyendaColor();
    sucio = true;
  }

  function seleccionar() {
    if (!listo || !marco) return;
    var x = ESTADO.sel ? C.ubi[ESTADO.sel] : null;
    marco.visible = !!x;
    if (x) marco.position.set(x.u.x, x.u.z + dim.h * 0.45, x.u.y);
    $('b-etiqueta').style.display = x ? 'block' : 'none';
    if (x) $('b-etiqueta').textContent = x.u.pos + (x.it ? ' · ' + x.it.p.nombre : ' · Libre');
    sucio = true;
  }

  function enfocar(suave) {
    if (!listo) return;
    var fin = { tx: centro.x, ty: centro.y, tz: centro.z, radio: radioBase, theta: 0.66, phi: 1.2 };
    if (ESTADO.pasillo) {
      var l = D.ubicaciones.filter(function (u) { return u.pasillo === ESTADO.pasillo; });
      if (l.length) { fin.tz = l[0].y; fin.radio = radioBase * 0.62; fin.theta = 0.3; fin.phi = 1.22; }
    }
    fin.radio *= Math.max(1, Math.min(1.9, 1.35 / (camara.aspect || 1.35)));
    if (suave === false) { for (var k in fin) orb[k] = fin[k]; sucio = true; return; }
    var ini = {}, t0 = performance.now(); for (var k2 in fin) ini[k2] = orb[k2];
    anim = function (ahora) { var p = Math.min(1, (ahora - t0) / 550), e = 1 - Math.pow(1 - p, 3); for (var k3 in fin) orb[k3] = ini[k3] + (fin[k3] - ini[k3]) * e; if (p >= 1) anim = null; sucio = true; };
  }

  function calidad() {
    if (!listo) return;
    var q = ESTADO.calidad;
    render.setPixelRatio(q === 'alta' ? Math.min(window.devicePixelRatio || 1, 2) : q === 'media' ? Math.min(window.devicePixelRatio || 1, 1.25) : 1);
    render.shadowMap.enabled = q !== 'baja';
    var n = q === 'alta' ? 4096 : 2048;
    if (sol.shadow.mapSize.x !== n) { sol.shadow.mapSize.set(n, n); if (sol.shadow.map) { sol.shadow.map.dispose(); sol.shadow.map = null; } }
    sol.castShadow = q !== 'baja';
    escena.traverse(function (o) { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; });
    ajustar();
  }

  /** El fondo de la escena sigue al tema de la aplicación (oscuro o claro). */
  function tema() {
    if (!escena) return;
    var c = (getComputedStyle(document.body).getPropertyValue('--escena') || '').trim() || '#070c17';
    escena.background.set(c); escena.fog.color.set(c); sucio = true;
  }

  function ajustar() {
    if (!listo || !caja.clientWidth) return;
    render.setSize(caja.clientWidth, caja.clientHeight, false);
    camara.aspect = caja.clientWidth / Math.max(1, caja.clientHeight); camara.updateProjectionMatrix();
    sucio = true;
  }

  function controles() {
    var el = render.domElement, punteros = {}, ini = null, movido = 0, pellizco = 0;
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    el.addEventListener('pointerdown', function (e) {
      el.setPointerCapture(e.pointerId); punteros[e.pointerId] = { x: e.clientX, y: e.clientY };
      ini = { x: e.clientX, y: e.clientY, boton: e.button, mayus: e.shiftKey }; movido = 0; pellizco = 0; anim = null; $('b-ayuda').style.display = 'none';
    });
    el.addEventListener('pointermove', function (e) {
      var p = punteros[e.pointerId], ids = Object.keys(punteros);
      if (!p) { sobre(e); return; }
      var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; movido += Math.abs(dx) + Math.abs(dy);
      if (ids.length === 2) {
        var a = punteros[ids[0]], b = punteros[ids[1]], dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pellizco) orb.radio = Math.max(4, Math.min(180, orb.radio * pellizco / dist));
        pellizco = dist;
      } else if (ini && (ini.boton === 2 || ini.mayus)) {
        var k = orb.radio * 0.0016, c = Math.cos(orb.theta), s = Math.sin(orb.theta);
        orb.tx -= (dx * c + dy * s * 0.6) * k; orb.tz -= (-dx * s + dy * c * 0.6) * k;
      } else {
        orb.theta -= dx * 0.006; orb.phi = Math.max(0.2, Math.min(1.52, orb.phi - dy * 0.005));
      }
      sucio = true;
    });
    var soltar = function (e) {
      var era = punteros[e.pointerId]; delete punteros[e.pointerId];
      if (era && movido < 6 && ini && ini.boton === 0 && e.type === 'pointerup') { var id = buscar(e); seleccionarPosicion(id === ESTADO.sel ? null : id); }
    };
    el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
    el.addEventListener('wheel', function (e) { e.preventDefault(); orb.radio = Math.max(4, Math.min(180, orb.radio * (e.deltaY > 0 ? 1.1 : 0.9))); anim = null; sucio = true; }, { passive: false });
    function sobre(e) { el.style.cursor = buscar(e) ? 'pointer' : 'grab'; }
  }

  function buscar(e) {
    if (!huecos) return null;
    var r = render.domElement.getBoundingClientRect();
    raton.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    rayo.setFromCamera(raton, camara);
    var h = rayo.intersectObject(huecos, false);
    return h.length ? orden[h[0].instanceId] : null;
  }

  function ciclo(ahora) {
    requestAnimationFrame(ciclo);
    if (anim) anim(ahora);
    if (rutaAnim) rutaAnim(ahora);
    if (!sucio || ESTADO.vista !== 'posiciones') return;
    sucio = false;
    var sp = Math.sin(orb.phi), x = orb.tx + orb.radio * sp * Math.sin(orb.theta), y = orb.ty + orb.radio * Math.cos(orb.phi), z = orb.tz + orb.radio * sp * Math.cos(orb.theta);
    camara.position.set(x, Math.max(0.4, y), z); camara.lookAt(orb.tx, orb.ty, orb.tz);
    var oc = grupo && grupo.userData.ocultar;                        // Paredes y cerchas se apartan si taparían la vista
    if (oc) { oc.pared1.visible = z > oc.z + 0.5; oc.pared2.visible = x > oc.x + 0.5; oc.alto.visible = y < oc.y; }
    render.render(escena, camara);
    if (marco && marco.visible) {
      var v = marco.position.clone(); v.y += dim.h * 0.5; v.project(camara);
      var e = $('b-etiqueta'); e.style.display = v.z < 1 ? 'block' : 'none';
      e.style.left = ((v.x + 1) / 2 * caja.clientWidth) + 'px'; e.style.top = ((1 - v.y) / 2 * caja.clientHeight) + 'px';
    }
    window.__bodegaLista = true;
  }


  var rutaG = null, rutaAnim = null;
  function texEtiqueta(txt, fondo, ancho) {
    var c = document.createElement('canvas'), w = ancho || 128; c.width = w; c.height = 128; var g = c.getContext('2d');
    g.fillStyle = fondo; g.strokeStyle = '#ffffff'; g.lineWidth = 9;
    g.beginPath();
    if (ancho) { var r = 34, a = 6, b = 6, x1 = w - 6, y1 = 122; g.moveTo(a + r, b); g.lineTo(x1 - r, b); g.quadraticCurveTo(x1, b, x1, b + r); g.lineTo(x1, y1 - r); g.quadraticCurveTo(x1, y1, x1 - r, y1); g.lineTo(a + r, y1); g.quadraticCurveTo(a, y1, a, y1 - r); g.lineTo(a, b + r); g.quadraticCurveTo(a, b, a + r, b); }
    else g.arc(64, 64, 55, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '800 ' + (ancho ? 52 : String(txt).length > 2 ? 44 : 60) + 'px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, 67);
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function dibujarRuta() {
    if (rutaG) { escena.remove(rutaG); rutaG.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); rutaG = null; }
    rutaAnim = null; sucio = true;
    var R = ESTADO.ruta; if (!R || !R.puntos || R.puntos.length < 2) return;
    rutaG = new T.Group(); escena.add(rutaG);
    var azul = new T.MeshBasicMaterial({ color: 0x0ea5f0, toneMapped: false }), naranja = new T.MeshBasicMaterial({ color: 0xf97316, toneMapped: false });
    var P = R.puntos, tramos = [], total = 0;
    for (var i = 0; i < P.length - 1; i++) {
      var a = P[i], b = P[i + 1], L = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); if (L < 0.01) continue;
      var m = new T.Mesh(new T.BoxGeometry(Math.abs(b[0] - a[0]) + 0.3, 0.04, Math.abs(b[1] - a[1]) + 0.3), azul);
      m.position.set((a[0] + b[0]) / 2, 0.05, (a[1] + b[1]) / 2); rutaG.add(m);
      tramos.push({ a: a, b: b, L: L, ini: total }); total += L;
    }
    R.paradas.forEach(function (s, k) {
      var disco = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.08, 24), naranja); disco.position.set(s.x, 0.08, s.cy); rutaG.add(disco);
      var lado = Math.abs(s.y - s.cy); if (lado > 0.05) { var en = new T.Mesh(new T.BoxGeometry(0.09, 0.05, lado), naranja); en.position.set(s.x, 0.07, (s.y + s.cy) / 2); rutaG.add(en); }
      var sp = new T.Sprite(new T.SpriteMaterial({ map: texEtiqueta(String(k + 1), '#F97316'), depthTest: false, toneMapped: false }));
      sp.scale.set(0.95, 0.95, 1); sp.position.set(s.x, s.z + dim.h + 0.5, s.y); sp.renderOrder = 20; rutaG.add(sp);
    });
    var dep = new T.Mesh(new T.BoxGeometry(2.6, 0.1, 1.7), new T.MeshBasicMaterial({ color: 0x16a34a, toneMapped: false })); dep.position.set(R.deposito.x, 0.06, R.deposito.y); rutaG.add(dep);
    var spd = new T.Sprite(new T.SpriteMaterial({ map: texEtiqueta('DESPACHO', '#16A34A', 380), depthTest: false, toneMapped: false }));
    spd.scale.set(3.0, 1.0, 1); spd.position.set(R.deposito.x, 1.7, R.deposito.y); spd.renderOrder = 20; rutaG.add(spd);
    var bola = new T.Mesh(new T.SphereGeometry(0.3, 18, 12), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); rutaG.add(bola);
    // Un punto blanco recorre la ruta dos veces y se detiene en el despacho (máx. 30 fps; se apaga si el equipo va lento)
    var vel = Math.max(3, total / 16), t0 = performance.now(), ultimo = 0, lentos = 0;
    var ponerBola = function (d) {
      var t = tramos[0]; for (var j = 0; j < tramos.length; j++) if (d >= tramos[j].ini) t = tramos[j];
      var f = Math.min(1, (d - t.ini) / t.L); bola.position.set(t.a[0] + (t.b[0] - t.a[0]) * f, 0.4, t.a[1] + (t.b[1] - t.a[1]) * f); sucio = true;
    };
    ponerBola(0);
    rutaAnim = function (ahora) {
      if (!tramos.length || ESTADO.vista !== 'posiciones') return;
      if (ultimo && ahora - ultimo < 33) return;
      if (ultimo && ahora - ultimo > 150) lentos++;
      ultimo = ahora;
      var d = (ahora - t0) / 1000 * vel;
      if (d >= total * 2 || lentos > 4) { ponerBola(0); rutaAnim = null; return; }
      ponerBola(d % total);
    };
  }
  function verRuta() {
    if (!ESTADO.ruta) return;
    // Encuadra la zona que recorre la ruta (en naves grandes no hace falta ver toda la bodega)
    var R = ESTADO.ruta, bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    R.puntos.concat(R.paradas.map(function (s) { return [s.x, s.y]; })).concat([[R.deposito.x, R.deposito.y]]).forEach(function (q) {
      bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); bz0 = Math.min(bz0, q[1]); bz1 = Math.max(bz1, q[1]); });
    var ext = Math.max(bx1 - bx0, (bz1 - bz0) * 1.25);
    var fin = { tx: (bx0 + bx1) / 2, ty: 0.5, tz: (bz0 + bz1) / 2, radio: Math.min(radioBase * 1.02, Math.max(14, ext * 1.05 + 8)) * Math.max(1, Math.min(1.9, 1.35 / (camara.aspect || 1.35))), theta: 0.2, phi: 0.7 };
    var ini = {}, t0 = performance.now(); for (var k in fin) ini[k] = orb[k];
    anim = function (ahora) { var p = Math.min(1, (ahora - t0) / 700), e = 1 - Math.pow(1 - p, 3); for (var k2 in fin) orb[k2] = ini[k2] + (fin[k2] - ini[k2]) * e; if (p >= 1) anim = null; sucio = true; };
  }

  var construida = false, pendiente = true;
  return {
    /** Se llama al abrir la vista: crea la escena la primera vez. */
    mostrar: function () {
      if (!listo && !fallo) { if (iniciar()) requestAnimationFrame(ciclo); }
      if (fallo) { if (!$('b-fallo')) $('lienzo').insertAdjacentHTML('beforeend', '<div class="vacio" id="b-fallo" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">' + fallo + '<button class="btn" data-vista="ubicaciones">Ver el mapa de ubicaciones</button></div>'); return; }
      if (pendiente) { construir(); pendiente = false; if (!construida) { calidad(); ajustar(); enfocar(false); construida = true; } }
      ajustar(); seleccionar();
    },
    datosNuevos: function () { pendiente = true; if (listo && ESTADO.vista === 'posiciones') { construir(); pendiente = false; } },
    fijarVista: function (o) { for (var k in o) orb[k] = o[k]; anim = null; sucio = true; },
    ruta: function () { if (listo) { dibujarRuta(); verRuta(); } },
    tema: tema, actualizar: actualizar, colorear: colorear, seleccionar: seleccionar, enfocar: enfocar, calidad: calidad, ajustar: ajustar
  };
})();

/* ===================== SAAS: MÓDULOS, ROLES Y AJUSTES (Axioma Flux) ===================== */
var SECCIONES_BASE = JSON.parse(JSON.stringify(SECCIONES));
var MODULOS = { inventario: 'Inventario y pedidos', posiciones: 'Bodega 3D y picking', comercial: 'CRM comercial', finanzas: 'Finanzas' };
var PLANES = [['free', 'Básico', ['inventario']], ['pro', 'Profesional', ['inventario', 'posiciones']], ['enterprise', 'Empresa', ['inventario', 'posiciones', 'comercial', 'finanzas']]];
var ROLES = { admin: 'Administrador', operador: 'Operador', viewer: 'Solo lectura' };
var ZONAS = ['Europe/Madrid', 'America/Santiago', 'America/Bogota', 'America/Lima', 'America/Mexico_City', 'America/Argentina/Buenos_Aires', 'America/Caracas', 'America/Montevideo', 'America/Guayaquil', 'America/New_York', 'Europe/Berlin', 'Europe/Lisbon', 'UTC'];
var LISTAS_EDITABLES = [['CATEGORIA', 'Categorías de producto'], ['LINEA', 'Líneas de negocio'], ['CANAL', 'Canales de venta'], ['METODO_PAGO', 'Métodos de pago'],
  ['INTERES', 'Intereses de prospectos'], ['CANAL_LEAD', 'Canales de captación'], ['TIPO_CONTACTO', 'Tipos de contacto'], ['GASTO', 'Categorías de gasto']];
var CTX = { usuarios: null, empresas: null, sel: null, clave: null };

function moneda() { return (D && D.config && D.config.moneda) || '€'; }
function decimales() { return D && D.config && Number(D.config.decimales) === 0 ? 0 : 2; }
function tiene(m) { return !D || !D.modulos || D.modulos.indexOf(m) > -1; }
function rol() { return D && D.usuario ? D.usuario.rol : ''; }
function esAdmin() { return rol() === 'admin'; }

/** Muestra u oculta secciones, pestañas y botones según el plan y el rol del usuario. */
function aplicarModulos() {
  var b = document.body;
  Object.keys(MODULOS).forEach(function (m) { b.classList.toggle('m-' + m, tiene(m)); });
  b.classList.toggle('solo-lectura', rol() === 'viewer');
  b.classList.toggle('es-admin', esAdmin());
  SECCIONES.pedidos.tabs = SECCIONES_BASE.pedidos.tabs.filter(function (t) { return t[0] !== 'picking' || tiene('posiciones'); });
  SECCIONES.cuenta.tabs = SECCIONES_BASE.cuenta.tabs.filter(function (t) {
    return t[0] === 'cuenta' || (esAdmin() && (t[0] === 'empresa' || t[0] === 'usuarios' || t[0] === 'integraciones')) || (t[0] === 'admin' && D.superadmin);
  });
  [].forEach.call(document.querySelectorAll('.rejilla[data-ajustar]'), function (r) {
    var n = [].filter.call(r.children, function (c) { return getComputedStyle(c).display !== 'none'; }).length;
    r.style.setProperty('--c', Math.max(1, n));
  });
  $('i-kpis').style.setProperty('--c', tiene('posiciones') ? 5 : 4);
  var e = D.empresa || {}, u = D.usuario || {};
  $('quien').innerHTML = '<b>' + esc(e.nombre || '') + '</b><small>' + esc(u.nombre || u.email || '') + ' · ' + esc(ROLES[u.rol] || '') + '</small>';
  $('quien').title = (u.email || '') + ' · plan ' + (e.planNombre || '');
}

/** Si el plan o el rol no incluye esa vista, se vuelve al inicio. */
function permitida(vista) {
  if (FORM_SECCION[vista]) {
    if (rol() === 'viewer') return false;
    var k = vista.slice(2);
    if (['lead', 'contacto', 'meta'].indexOf(k) > -1) return tiene('comercial');
    if (['factura', 'pago', 'gasto'].indexOf(k) > -1) return tiene('finanzas');
    return true;
  }
  var s = seccionDe(vista);
  if ((s === 'posiciones' || s === 'finanzas') && !tiene(s)) return false;
  if (s === 'embudo' && !tiene('comercial')) return false;
  return SECCIONES[s].tabs.some(function (t) { return t[0] === vista; });
}

function mostrarSinEmpresa(d) {
  $('cargando').style.display = 'flex';
  $('cargando-txt').innerHTML = esc(d.mensaje || 'No tienes acceso.') + '<div class="pie-form" style="justify-content:center"><button class="btn" data-accion="salir">Cerrar sesión</button></div>';
}

/* ---------- Mi cuenta ---------- */
PINTAR.cuenta = function () {
  var u = D.usuario || {}, e = D.empresa || {};
  $('cu-datos').innerHTML =
    '<div class="dato" style="border-top:0"><span>Nombre</span><b>' + esc(u.nombre) + '</b></div>' +
    '<div class="dato"><span>Email</span><b>' + esc(u.email) + '</b></div>' +
    '<div class="dato"><span>Rol</span><b>' + esc(ROLES[u.rol] || u.rol) + '</b></div>' +
    '<div class="dato"><span>Empresa</span><b>' + esc(e.nombre) + '</b></div>' +
    '<div class="dato"><span>Plan</span><b>' + esc(e.planNombre || e.plan) + '</b></div>' +
    '<div class="dato"><span>Módulos incluidos</span><b>' + (D.modulos || []).map(function (m) { return chip('azul', MODULOS[m] || m); }).join(' ') + '</b></div>';
};

/* ---------- Empresa (ajustes, solo admin) ---------- */
function campoAj(id, etq, tipo, valor, extra) {
  return '<div class="campo' + (extra && extra.ancho ? ' ancho' : '') + '"><label for="aj-' + id + '">' + etq + '</label>' +
    (tipo === 'select' ? '<select id="aj-' + id + '">' + extra.op.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'
      : tipo === 'textarea' ? '<textarea id="aj-' + id + '" rows="6">' + esc(valor) + '</textarea>'
      : '<input id="aj-' + id + '" type="' + tipo + '" value="' + esc(valor) + '"' + (tipo === 'number' ? ' step="' + ((extra && extra.paso) || '1') + '" min="0" inputmode="decimal"' : '') + '>') +
    (extra && extra.ayuda ? '<div class="nota-form" style="margin-top:5px">' + extra.ayuda + '</div>' : '') + '</div>';
}

PINTAR.empresa = function () {
  if ($('form-empresa').contains(document.activeElement)) return;
  var c = D.config, e = D.empresa || {}, b = c.bodega || {}, zonas = unicos(ZONAS.concat([c.zona_horaria]));
  var plan = PLANES.filter(function (p) { return p[0] === e.plan; })[0];
  $('em-plan').innerHTML = '<div class="dato" style="border-top:0"><span>Plan contratado</span><b>' + esc(e.planNombre || e.plan) + '</b></div>' +
    '<div class="dato"><span>Módulos activos</span><b>' + (D.modulos || []).map(function (m) { return chip('azul', MODULOS[m] || m); }).join(' ') + '</b></div>' +
    '<p class="nota-form">Para cambiar de plan o activar más módulos, contacta con Axioma.</p>';
  $('em-general').innerHTML = '<div class="campos">' +
    campoAj('nombreEmpresa', 'Nombre de la empresa', 'text', e.nombre, { ancho: 1 }) +
    campoAj('moneda', 'Símbolo de moneda', 'text', c.moneda, { ayuda: 'Ej.: €, $, CLP, S/' }) +
    campoAj('decimales', 'Decimales en importes', 'select', c.decimales, { op: [[2, 'Con céntimos (2)'], [0, 'Sin decimales (0)']] }) +
    campoAj('zona_horaria', 'Zona horaria', 'select', c.zona_horaria, { op: zonas.map(function (z) { return [z, z.replace(/_/g, ' ')]; }) }) +
    campoAj('iva', 'IVA por defecto (%)', 'number', c.iva, { paso: '0.01' }) + '</div>';
  $('em-inventario').innerHTML = '<div class="campos">' +
    campoAj('critico', 'Crítico: menos de (días de stock)', 'number', c.critico) +
    campoAj('precaucion', 'Precaución: menos de (días)', 'number', c.precaucion) +
    campoAj('rotAlta', 'Rotación alta: hasta (días)', 'number', c.rotAlta) +
    campoAj('rotMedia', 'Rotación media: hasta (días)', 'number', c.rotMedia) +
    campoAj('cobertura', 'Cobertura por defecto (días)', 'number', c.cobertura, { ayuda: 'Para categorías sin cobertura propia.' }) +
    campoAj('peso90', 'Peso últimos 90 días (%)', 'number', c.peso90) +
    campoAj('pesoAA', 'Peso año anterior (%)', 'number', c.pesoAA, { ayuda: 'Los dos pesos deben sumar 100.' }) +
    campoAj('diasLead', 'Alerta de prospecto sin contacto (días)', 'number', c.diasLead) + '</div>';
  $('em-finanzas').innerHTML = '<div class="campos">' +
    campoAj('saldo', 'Saldo inicial de caja', 'number', c.saldo, { paso: '0.01' }) +
    campoAj('mesesPasados', 'Meses reales en el flujo', 'number', c.mesesPasados) +
    campoAj('mesesFuturos', 'Meses previstos en el flujo', 'number', c.mesesFuturos) +
    '<div class="campo ancho"><label>Canales que cobran al momento (entran al flujo el día de la venta)</label><div class="casillas">' +
    D.listas.CANAL.map(function (x) { return '<label><input type="checkbox" data-contado="' + esc(x) + '"' + (c.contado.indexOf(x) > -1 ? ' checked' : '') + '> ' + esc(x) + '</label>'; }).join('') + '</div></div></div>';
  var pl = D.plantillas || {};
  $('em-bodega').innerHTML = '<div class="campos">' +
    campoAj('estilo', 'Diseño de la nave (centro de distribución)', 'select', b.estilo || 'clasico', { ancho: 1, op: Object.keys(pl).map(function (k) { return [k, pl[k].nombre]; }),
      ayuda: 'Al elegir un diseño se cargan sus medidas; puedes ajustarlas antes de guardar.' }) +
    campoAj('pasillos', 'Pasillos (separados por coma)', 'text', (b.pasillos || []).join(', '), { ancho: 1 }) +
    campoAj('racks', 'Racks por pasillo', 'number', b.racks) + campoAj('niveles', 'Niveles por rack', 'number', b.niveles) +
    campoAj('ancho', 'Ancho de rack (m)', 'number', b.ancho, { paso: '0.01' }) + campoAj('alto', 'Alto de nivel (m)', 'number', b.alto, { paso: '0.01' }) +
    campoAj('separacion', 'Separación entre pasillos (m)', 'number', b.separacion, { paso: '0.01' }) +
    campoAj('dobles', 'Racks dobles (espalda con espalda)', 'select', b.dobles ? '1' : '0', { op: [['0', 'No'], ['1', 'Sí']] }) +
    campoAj('bloques', 'Bloques de racks', 'number', b.bloques || 1) +
    campoAj('corte', 'Pasillo central entre bloques (m)', 'number', b.corte || 0, { paso: '0.1' }) +
    campoAj('nivelesBloque', 'Niveles por bloque (opcional, ej.: 3, 7)', 'text', (b.nivelesBloque || []).join(', ')) + '</div>' +
    '<h3 style="margin-top:16px">Picking</h3><div class="sub">Para calcular rutas y tiempos de preparación</div><div class="campos">' +
    campoAj('pkDespacho', 'Punto de despacho', 'select', cfgPicking().despacho, { ancho: 1, op: [['porton', 'Junto al portón (extremo derecho)'], ['opuesto', 'Extremo opuesto al portón']] }) +
    campoAj('pkCarro', 'Pedidos por carro', 'number', cfgPicking().carro) + campoAj('pkVelocidad', 'Velocidad a pie (m/s)', 'number', cfgPicking().velocidad, { paso: '0.1' }) +
    campoAj('pkParada', 'Segundos por parada', 'number', cfgPicking().segParada, { ayuda: 'Tiempo medio para recoger en cada posición.' }) + '</div>' +
    '<p class="nota-form">Ahora: ' + D.ubicaciones.length + ' posiciones. Si cambias el trazado, las posiciones que ya no existan se eliminan (los productos y su stock no cambian).</p>';
  $('em-listas').innerHTML = '<div class="campos">' + LISTAS_EDITABLES.map(function (l) {
    return campoAj('l-' + l[0], l[1] + ' (una por línea)', 'textarea', (D.listas[l[0]] || []).join('\n'));
  }).join('') + '</div>';
};

/* ---------- Usuarios (solo admin) ---------- */
function filaUsuario(u, conClave) {
  return '<tr><td><b>' + esc(u.nombre) + '</b>' + (u.yo ? ' <span class="tenue">(tú)</span>' : '') + '</td><td>' + esc(u.email) + '</td>' +
    '<td><select class="sel" data-usuario-rol="' + esc(u.id) + '"' + (u.yo ? ' disabled' : '') + '>' + Object.keys(ROLES).map(function (r) { return '<option value="' + r + '"' + (u.rol === r ? ' selected' : '') + '>' + ROLES[r] + '</option>'; }).join('') + '</select></td>' +
    '<td>' + chip(u.activo ? 'verde' : 'gris', u.activo ? 'Activo' : 'Desactivado') + '</td>' +
    '<td>' + (u.ultimoAcceso ? fecha(String(u.ultimoAcceso).slice(0, 10)) : '<span class="tenue">Nunca</span>') + '</td>' +
    '<td>' + (CTX.clave === u.id ? '<input type="password" id="clave-nueva" placeholder="Nueva contraseña" autocomplete="new-password" style="background:var(--fondo);border:1px solid var(--linea);border-radius:7px;padding:4px 8px;width:160px"> <button class="btn mini primario" data-accion="guardarClave" data-id="' + esc(u.id) + '">Guardar</button> <button class="btn mini" data-accion="clave" data-id="">Cancelar</button>'
      : '<button class="btn mini" data-accion="clave" data-id="' + esc(u.id) + '">Contraseña</button>' + (u.yo ? '' : ' <button class="btn mini" data-accion="usuarioActivo" data-id="' + esc(u.id) + '">' + (u.activo ? 'Desactivar' : 'Activar') + '</button>')) + '</td></tr>';
}

PINTAR.usuarios = function () {
  if (CTX.usuarios === null) {
    $('us-tabla').innerHTML = '<tr><td class="vacio">Cargando usuarios…</td></tr>';
    servidor('listarUsuarios', null, function (l) { CTX.usuarios = l || []; if (ESTADO.vista === 'usuarios') PINTAR.usuarios(); });
    return;
  }
  $('us-tabla').innerHTML = '<tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th></th></tr>' +
    (CTX.usuarios.map(function (u) { return filaUsuario(u); }).join('') || '<tr><td colspan="6" class="vacio">Sin usuarios.</td></tr>');
  $('us-cuenta').textContent = CTX.usuarios.length + ' usuarios · ' + CTX.usuarios.filter(function (u) { return u.activo; }).length + ' activos';
};

function recargarUsuarios() { CTX.usuarios = null; PINTAR.usuarios(); }

/* ---------- Superadmin ---------- */
function planNombre(p) { var x = PLANES.filter(function (y) { return y[0] === p; })[0]; return x ? x[1] : p; }

PINTAR.admin = function () {
  if (CTX.empresas === null) {
    $('ad-tabla').innerHTML = '<tr><td class="vacio">Cargando empresas…</td></tr>';
    servidor('saListarEmpresas', null, function (l) { CTX.empresas = l || []; if (ESTADO.vista === 'admin') PINTAR.admin(); });
    return;
  }
  var l = CTX.empresas, activas = l.filter(function (e) { return e.activo; }).length, us = l.reduce(function (s, e) { return s + e.usuarios.length; }, 0);
  $('ad-kpis').innerHTML = kpi('Empresas', l.length, activas + ' activas') + kpi('Usuarios', us, 'En todas las empresas') +
    PLANES.slice(1).map(function (p) { return kpi('Plan ' + p[1], l.filter(function (e) { return e.plan === p[0]; }).length, 'empresas'); }).join('');
  $('ad-tabla').innerHTML = '<tr><th>Empresa</th><th>Plan</th><th>Módulos</th><th class="n">Usuarios</th><th class="n">Productos</th><th class="n">Ventas</th><th>Estado</th><th></th></tr>' +
    l.map(function (e) {
      return '<tr class="pulsable' + (CTX.sel === e.id ? ' total' : '') + '" data-accion="saGestionar" data-id="' + esc(e.id) + '"><td class="largo"><b>' + esc(e.nombre) + '</b>' + (e.ruc ? '<br><span class="tenue">' + esc(e.ruc) + '</span>' : '') + '</td><td>' + esc(planNombre(e.plan)) + '</td>' +
        '<td>' + (e.modulosEfectivos || []).map(function (m) { return chip(e.modulos ? 'ambar' : 'azul', MODULOS[m] || m); }).join(' ') + '</td><td class="n">' + e.usuarios.length + '</td><td class="n">' + num(e.productos) + '</td><td class="n">' + num(e.ventas) + '</td>' +
        '<td>' + chip(e.activo ? 'verde' : 'rojo', e.activo ? 'Activa' : 'Suspendida') + (e.tieneDemo ? ' ' + chip('gris', 'Demo') : '') + '</td><td><button class="btn mini" data-accion="saGestionar" data-id="' + esc(e.id) + '">Gestionar</button></td></tr>';
    }).join('');
  pintarDetalleEmpresa();
};

function pintarDetalleEmpresa() {
  var e = CTX.empresas && CTX.empresas.filter(function (x) { return x.id === CTX.sel; })[0];
  if (!e) { $('ad-detalle').innerHTML = '<h3>Gestionar empresa</h3><div class="sub">Elige una empresa de la tabla para cambiar su plan, módulos, usuarios o datos de ejemplo.</div>'; return; }
  var propios = !!e.modulos;
  $('ad-detalle').innerHTML = '<h3>' + esc(e.nombre) + '</h3><div class="sub">Creada el ' + fecha(String(e.creada).slice(0, 10)) + '</div>' +
    '<form data-propio="saEmpresa" novalidate><div class="campos">' +
    '<div class="campo"><label>Nombre</label><input id="sa-nombre" value="' + esc(e.nombre) + '"></div>' +
    '<div class="campo"><label>RUT / NIF</label><input id="sa-ruc" value="' + esc(e.ruc || '') + '"></div>' +
    '<div class="campo"><label>Plan</label><select id="sa-plan">' + PLANES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === e.plan ? ' selected' : '') + '>' + p[1] + ' · ' + p[2].map(function (m) { return MODULOS[m]; }).join(', ') + '</option>'; }).join('') + '</select></div>' +
    '<div class="campo"><label>Estado</label><select id="sa-activo"><option value="true"' + (e.activo ? ' selected' : '') + '>Activa</option><option value="false"' + (e.activo ? '' : ' selected') + '>Suspendida (nadie puede entrar)</option></select></div>' +
    '<div class="campo ancho casilla"><label><input type="checkbox" id="sa-propios"' + (propios ? ' checked' : '') + '> Módulos a medida (en vez de los del plan)</label></div>' +
    '<div class="campo ancho"><div class="casillas" id="sa-modulos">' + Object.keys(MODULOS).map(function (m) { return '<label><input type="checkbox" data-modulo-sa="' + m + '"' + ((e.modulosEfectivos || []).indexOf(m) > -1 ? ' checked' : '') + (propios ? '' : ' disabled') + '> ' + MODULOS[m] + '</label>'; }).join('') + '</div></div>' +
    '</div><div class="pie-form"><button class="btn primario" type="submit">Guardar cambios</button></div></form>' +
    '<h3 style="margin-top:22px">Usuarios</h3>' + (e.usuarios.map(function (u) {
      return '<div class="item"><div class="x"><b>' + esc(u.nombre) + '</b><span>' + esc(u.email) + ' · ' + esc(ROLES[u.rol] || u.rol) + (u.activo ? '' : ' · desactivado') + '</span></div></div>';
    }).join('') || '<div class="vacio">Sin usuarios.</div>') +
    '<form data-propio="saUsuario" novalidate style="margin-top:10px"><div class="campos">' +
    '<div class="campo"><label>Nombre *</label><input id="sau-nombre"></div><div class="campo"><label>Email *</label><input id="sau-email" type="email" autocomplete="off"></div>' +
    '<div class="campo"><label>Contraseña inicial *</label><input id="sau-pass" type="text" autocomplete="off"></div>' +
    '<div class="campo"><label>Rol</label><select id="sau-rol">' + Object.keys(ROLES).map(function (r) { return '<option value="' + r + '">' + ROLES[r] + '</option>'; }).join('') + '</select></div>' +
    '</div><div class="pie-form"><button class="btn" type="submit">+ Añadir usuario</button></div></form>' +
    '<h3 style="margin-top:22px">Diseño 3D de la nave</h3><div class="sub">Aplica una plantilla de centro de distribución. Regenera las posiciones; las que ya no existan en la nueva nave se eliminan.</div>' +
    '<div class="pie-form" style="margin-top:6px"><select class="sel" id="sa-estilo">' + Object.keys(D.plantillas || {}).map(function (k) { return '<option value="' + k + '"' + (k === e.estilo ? ' selected' : '') + '>' + esc(D.plantillas[k].nombre) + '</option>'; }).join('') + '</select>' +
    '<button class="btn" data-accion="saNave" data-id="' + esc(e.id) + '">Aplicar nave</button></div>' +
    '<h3 style="margin-top:22px">Datos de ejemplo</h3><div class="sub">36 productos de ferretería, 15 meses de ventas, movimientos, facturas, prospectos y gastos. Se pueden borrar sin tocar los datos reales.</div>' +
    '<div class="pie-form" style="margin-top:6px"><button class="btn" data-accion="saDemo" data-id="' + esc(e.id) + '"' + (e.tieneDemo ? ' disabled' : '') + '>Cargar datos de ejemplo</button><button class="btn" data-accion="saBorrarDemo" data-id="' + esc(e.id) + '"' + (e.tieneDemo ? '' : ' disabled') + '>Borrar datos de ejemplo</button></div>';
}

function recargarEmpresas(despues) {
  servidor('saListarEmpresas', null, function (l) { CTX.empresas = l || []; if (ESTADO.vista === 'admin') PINTAR.admin(); if (despues) despues(); });
}

/* ---------- Envío de los formularios propios ---------- */
function valor(id) { var e = $(id); return e ? String(e.value).trim() : ''; }
function bloquear(form, texto) {
  var b = form.querySelector('[type=submit]'), antes = b.textContent; b.disabled = true; b.textContent = texto || 'Guardando…';
  return function () { b.disabled = false; b.textContent = antes; };
}

var PROPIOS = {
  password: function (form) {
    var p1 = $('cu-p1').value, p2 = $('cu-p2').value;
    if (p1.length < 8) { avisar('La contraseña debe tener al menos 8 caracteres.', true); return; }
    if (p1 !== p2) { avisar('Las contraseñas no coinciden.', true); return; }
    var fin = bloquear(form);
    servidor('miPassword', { password: p1 }, function () { fin(); form.reset(); avisar('Contraseña cambiada.'); }, fin);
  },
  empresa: function (form) {
    var n = function (id) { var v = valor('aj-' + id); return v === '' ? undefined : Number(v.replace(',', '.')); };
    var d = { nombreEmpresa: valor('aj-nombreEmpresa'), moneda: valor('aj-moneda'), zona_horaria: valor('aj-zona_horaria'), decimales: Number(valor('aj-decimales')) };
    ['iva', 'critico', 'precaucion', 'rotAlta', 'rotMedia', 'cobertura', 'peso90', 'pesoAA', 'diasLead', 'saldo', 'mesesPasados', 'mesesFuturos'].forEach(function (k) { var v = n(k); if (v !== undefined && !isNaN(v)) d[k] = v; });
    d.contado = [].map.call(form.querySelectorAll('[data-contado]:checked'), function (x) { return x.getAttribute('data-contado'); });
    d.bodega = { estilo: valor('aj-estilo') || 'clasico', pasillos: unicos(valor('aj-pasillos').toUpperCase().split(/[\s,;]+/).filter(Boolean)), racks: n('racks'), niveles: n('niveles'),
      ancho: n('ancho'), alto: n('alto'), separacion: n('separacion'), dobles: valor('aj-dobles') === '1', bloques: n('bloques') || 1, corte: n('corte') || 0,
      nivelesBloque: valor('aj-nivelesBloque').split(/[\s,;]+/).filter(Boolean).map(Number).filter(function (x) { return x > 0; }) };
    d.picking = { despacho: valor('aj-pkDespacho') || 'porton', carro: n('pkCarro') || 6, velocidad: n('pkVelocidad') || 1, segParada: n('pkParada') == null || isNaN(n('pkParada')) ? 20 : n('pkParada') };
    d.listas = {};
    LISTAS_EDITABLES.forEach(function (l) { d.listas[l[0]] = unicos(valor('aj-l-' + l[0]).split('\n').map(function (x) { return x.trim(); }).filter(Boolean)); });
    var fin = bloquear(form);
    servidor('guardarAjustes', d, function (r) { fin(); avisar(r.mensaje || 'Ajustes guardados.'); document.activeElement.blur(); cargar(function () { mostrar('empresa'); }); }, fin);
  },
  usuario: function (form) {
    var d = { nombre: valor('nu-nombre'), email: valor('nu-email'), password: $('nu-pass').value, rol: valor('nu-rol') };
    if (!d.nombre || !d.email || !d.password) { avisar('Completa nombre, email y contraseña.', true); return; }
    var fin = bloquear(form, 'Creando…');
    servidor('crearUsuario', d, function () { fin(); form.reset(); avisar('Usuario creado.'); recargarUsuarios(); }, fin);
  },
  empresaNueva: function (form) {
    var d = { nombre: valor('ne-nombre'), ruc: valor('ne-ruc'), plan: valor('ne-plan'), admin: { nombre: valor('ne-admin'), email: valor('ne-email'), password: $('ne-pass').value } };
    if (!d.nombre || !d.admin.email || !d.admin.password) { avisar('Completa el nombre de la empresa, el email y la contraseña del administrador.', true); return; }
    var fin = bloquear(form, 'Creando…');
    servidor('crearEmpresa', d, function (r) { fin(); form.reset(); avisar('Empresa creada.'); CTX.sel = r.empresa_id; recargarEmpresas(); }, fin);
  },
  saEmpresa: function (form) {
    var propios = $('sa-propios').checked;
    var cambios = { nombre: valor('sa-nombre'), ruc: valor('sa-ruc'), plan: valor('sa-plan'), activo: valor('sa-activo') === 'true',
      modulos: propios ? [].map.call(form.querySelectorAll('[data-modulo-sa]:checked'), function (x) { return x.getAttribute('data-modulo-sa'); }) : null };
    var fin = bloquear(form);
    servidor('saActualizarEmpresa', { id: CTX.sel, cambios: cambios }, function () {
      fin(); avisar('Empresa actualizada.');
      recargarEmpresas(function () { if (D.empresa && D.empresa.id === CTX.sel) cargar(function () { mostrar('admin'); }); });
    }, fin);
  },
  saUsuario: function (form) {
    var d = { empresa_id: CTX.sel, nombre: valor('sau-nombre'), email: valor('sau-email'), password: $('sau-pass').value, rol: valor('sau-rol') };
    if (!d.nombre || !d.email || !d.password) { avisar('Completa nombre, email y contraseña.', true); return; }
    var fin = bloquear(form, 'Creando…');
    servidor('crearUsuario', d, function () { fin(); avisar('Usuario creado.'); recargarEmpresas(); }, fin);
  }
};

ACCIONES.salir = function () { servidor('salir', null); };
/* Modo claro / oscuro: lo elige cada usuario y se recuerda en este navegador */
function marcarTema() {
  var claro = document.body.classList.contains('claro'), b = $('btn-tema');
  if (b) b.title = claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
}
ACCIONES.tema = function () {
  var claro = !document.body.classList.contains('claro');
  document.body.classList.toggle('claro', claro);
  guardarLocal('tema', claro ? 'claro' : 'oscuro');
  marcarTema(); BODEGA.tema();
  if (D) pintar();
};
ACCIONES.clave = function (id) { CTX.clave = id || null; PINTAR.usuarios(); if (id && $('clave-nueva')) $('clave-nueva').focus(); };
ACCIONES.guardarClave = function (id) {
  var p = $('clave-nueva').value;
  if (p.length < 8) { avisar('La contraseña debe tener al menos 8 caracteres.', true); return; }
  servidor('cambiarPassword', { user_id: id, password: p }, function () { CTX.clave = null; avisar('Contraseña actualizada.'); PINTAR.usuarios(); });
};
ACCIONES.usuarioActivo = function (id) {
  var u = CTX.usuarios.filter(function (x) { return x.id === id; })[0]; if (!u) return;
  servidor('cambiarUsuario', { id: id, rol: u.rol, activo: !u.activo }, function () { avisar(u.activo ? 'Usuario desactivado.' : 'Usuario activado.'); recargarUsuarios(); });
};
ACCIONES.saNave = function (id) {
  servidor('saAplicarNave', { id: id, estilo: $('sa-estilo').value }, function (r) {
    avisar(r.mensaje || 'Nave aplicada.');
    recargarEmpresas(function () { if (D.empresa && D.empresa.id === id) cargar(function () { mostrar('admin'); }); });
  });
};
ACCIONES.saGestionar = function (id) { CTX.sel = id; PINTAR.admin(); };
ACCIONES.saDemo = function (id) {
  avisar('Cargando datos de ejemplo… puede tardar unos segundos.');
  servidor('cargarDemo', { empresa_id: id }, function (r) {
    avisar('Datos de ejemplo cargados: ' + (r.informe ? r.informe.productos + ' productos, ' + r.informe.ventas + ' ventas' : ''));
    recargarEmpresas(function () { if (D.empresa && D.empresa.id === id) cargar(function () { mostrar('admin'); }); });
  });
};
ACCIONES.saBorrarDemo = function (id) {
  servidor('saBorrarDemo', { id: id }, function () {
    avisar('Datos de ejemplo eliminados.');
    recargarEmpresas(function () { if (D.empresa && D.empresa.id === id) cargar(function () { mostrar('admin'); }); });
  });
};

function enlazarSaas() {
  marcarTema();
  $('em-bodega').addEventListener('change', function (e) {
    if (e.target.id !== 'aj-estilo') return;
    var p = (D.plantillas || {})[e.target.value]; if (!p) return;
    var fija = function (k, v) { if ($('aj-' + k)) $('aj-' + k).value = v; };
    fija('pasillos', p.pasillos.join(', ')); ['racks', 'niveles', 'ancho', 'alto', 'separacion', 'bloques', 'corte'].forEach(function (k) { fija(k, p[k] != null ? p[k] : ''); });
    fija('dobles', p.dobles ? '1' : '0'); fija('nivelesBloque', (p.nivelesBloque || []).join(', '));
    avisar('Medidas de "' + p.nombre + '" cargadas. Pulsa Guardar ajustes para aplicarlas.');
  });
  $('us-tabla').addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-usuario-rol'); if (!id) return;
    var u = CTX.usuarios.filter(function (x) { return x.id === id; })[0];
    servidor('cambiarUsuario', { id: id, rol: e.target.value, activo: u ? u.activo : true }, function () { avisar('Rol actualizado.'); recargarUsuarios(); }, recargarUsuarios);
  });
  $('ad-detalle').addEventListener('change', function (e) {
    if (e.target.id !== 'sa-propios') return;
    [].forEach.call($('sa-modulos').querySelectorAll('input'), function (x) { x.disabled = !e.target.checked; });
  });
}

/* ---------- Filtros de posiciones (3D y mapa): esconden lo que no cumple ---------- */
ESTADO.filtro = { categoria: '', rotacion: '', disp: '', pasillo: '' };
function filtroActivo() { var f = ESTADO.filtro; return !!(f.categoria || f.rotacion || f.disp || f.pasillo); }
function pasaFiltro(x) {
  var f = ESTADO.filtro;
  if (f.pasillo && x.u.pasillo !== f.pasillo) return false;
  if (f.disp === 'ocupada' && !x.it) return false;
  if (f.disp === 'libre' && x.it) return false;
  if (f.categoria && (!x.it || x.it.p.categoria !== f.categoria)) return false;
  if (f.rotacion && (!x.it || x.it.rot !== f.rotacion)) return false;
  return true;
}
function htmlFiltros() {
  var f = ESTADO.filtro, op = function (k, lista, todos) {
    return '<select class="sel' + (f[k] ? ' activo' : '') + '" data-filtro="' + k + '" title="' + todos + '"><option value="">' + todos + '</option>' +
      lista.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (f[k] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  };
  return op('categoria', C.categorias.map(function (c) { return [c, c]; }), 'Todas las categorías') +
    op('rotacion', [['Alta', 'Rotación alta'], ['Media', 'Rotación media'], ['Baja', 'Rotación baja']], 'Toda rotación') +
    op('disp', [['ocupada', 'Solo ocupadas'], ['libre', 'Solo libres']], 'Ocupadas y libres') +
    op('pasillo', unicos(D.ubicaciones.map(function (u) { return u.pasillo; })).map(function (p) { return [p, 'Pasillo ' + p]; }), 'Todos los pasillos') +
    (filtroActivo() ? '<button class="btn mini" data-accion="limpiarFiltros">Quitar filtros</button>' : '');
}
function pintarFiltros() { ['b-filtros', 'u-filtros'].forEach(function (id) { if ($(id)) $(id).innerHTML = htmlFiltros(); }); }
function aplicarFiltro(cambioPasillo) {
  if (cambioPasillo) { ESTADO.pasillo = ESTADO.filtro.pasillo; BODEGA.enfocar(); }
  BODEGA.actualizar(); pintar();
}
function resumenFiltro() {
  if (!filtroActivo()) return '';
  var n = D.ubicaciones.filter(function (u) { return pasaFiltro(C.ubi[u.id]); }).length;
  return '<div class="aviso-demo" style="margin-bottom:12px">Filtro activo: se muestran <b>' + num(n) + '</b> de ' + num(D.ubicaciones.length) + ' posiciones.</div>';
}
ACCIONES.limpiarFiltros = function () { var p = !!ESTADO.filtro.pasillo; ESTADO.filtro = { categoria: '', rotacion: '', disp: '', pasillo: '' }; aplicarFiltro(p); };
document.addEventListener('change', function (e) {
  var k = e.target && e.target.getAttribute && e.target.getAttribute('data-filtro'); if (!k) return;
  ESTADO.filtro[k] = e.target.value; aplicarFiltro(k === 'pasillo');
});

/* ===================== INTEGRACIONES (Axioma Flux · fase 1: archivos CSV / Excel) ===================== */
var SISTEMAS = { archivo: 'Archivo CSV / Excel', sap_b1: 'SAP Business One', sap_s4: 'SAP S/4HANA', wms: 'WMS / SGA', odoo: 'Odoo', otro: 'Otro sistema' };
var CONECTORES = [
  ['Archivo CSV / Excel', 'Exporta desde SAP, tu WMS o cualquier ERP y súbelo aquí.', 'Disponible', 'verde'],
  ['WMS / SGA', 'Stock, ubicaciones y movimientos por archivo. Conexión directa por API en la siguiente fase.', 'Por archivo', 'azul'],
  ['SAP Business One', 'Por archivo hoy. Conector nativo vía Service Layer en desarrollo.', 'Próximamente', 'ambar'],
  ['SAP S/4HANA', 'Por archivo hoy. Conexión por APIs OData como proyecto a medida.', 'Bajo proyecto', 'gris'],
  ['API de Flux', 'Cualquier sistema podrá enviar datos a Flux con una clave por empresa.', 'Próximamente', 'ambar']
];
// Campo de Flux: [etiqueta, obligatorio, tipo, sinónimos para reconocer la columna del archivo]
var INT_CAMPOS = {
  sku: ['SKU / código de producto', 1, 't', ['sku', 'codigo', 'cod', 'codigoproducto', 'codigoarticulo', 'itemcode', 'item', 'material', 'matnr', 'articulo', 'referenciaproducto', 'productcode', 'refproducto', 'product']],
  nombre: ['Nombre', 0, 't', ['nombre', 'descripcion', 'itemname', 'producto', 'name', 'maktx', 'description', 'denominacion']],
  categoria: ['Categoría', 0, 't', ['categoria', 'familia', 'grupo', 'itmsgrpnam', 'itemgroup', 'grupoarticulos', 'category', 'matkl']],
  linea: ['Línea', 0, 't', ['linea', 'line', 'marca', 'brand', 'lineanegocio']],
  precio: ['Precio de venta', 0, 'n', ['precio', 'price', 'pvp', 'precioventa', 'price1', 'preciounitario', 'precio1']],
  costo: ['Costo', 0, 'n', ['costo', 'coste', 'cost', 'preciocompra', 'avgprice', 'costounitario', 'costomedio']],
  cantidad: ['Cantidad', 1, 'n', ['cantidad', 'stock', 'qty', 'quantity', 'onhand', 'existencia', 'existencias', 'unidades', 'labst', 'cant', 'enstock', 'disponible']],
  ubicacion: ['Ubicación / posición', 0, 't', ['ubicacion', 'location', 'posicion', 'bin', 'bincode', 'hueco', 'lgpla', 'ubicacionwms', 'emplazamiento']],
  ref: ['Referencia / nº documento', 0, 't', ['ref', 'referencia', 'documento', 'docnum', 'doc', 'numero', 'folio', 'mblnr', 'transaccion', 'id', 'iddocumento', 'numdocumento']],
  fecha: ['Fecha', 1, 'f', ['fecha', 'date', 'docdate', 'fechadocumento', 'budat', 'fechahora', 'fechamovimiento', 'fechaventa']],
  tipo: ['Tipo de movimiento', 1, 't', ['tipo', 'tipomovimiento', 'movementtype', 'bwart', 'transtype', 'clase', 'clasemovimiento']],
  origen: ['Ubicación origen', 0, 't', ['origen', 'from', 'desde', 'ubicacionorigen', 'fromlocation']],
  destino: ['Ubicación destino', 0, 't', ['destino', 'to', 'hacia', 'ubicaciondestino', 'tolocation']],
  responsable: ['Responsable', 0, 't', ['responsable', 'usuario', 'user', 'operario', 'username']],
  canal: ['Canal', 0, 't', ['canal', 'channel', 'tienda', 'sucursal', 'canalventa']]
};
var INT_ENTIDADES = {
  stock: { nombre: 'Foto de stock', campos: ['sku', 'cantidad', 'ubicacion'],
    ayuda: 'El stock que dice tu WMS o SAP hoy. Flux crea ajustes para cuadrar; los SKU que no vengan en el archivo no se tocan. Si traes la ubicación, la posición queda asignada.' },
  productos: { nombre: 'Catálogo', campos: ['sku', 'nombre', 'categoria', 'linea', 'precio', 'costo'],
    ayuda: 'Crea los productos nuevos y actualiza nombre, categoría, precio y costo de los que ya existen (por SKU). El nombre es obligatorio solo para los nuevos.' },
  movimientos: { nombre: 'Movimientos', campos: ['ref', 'fecha', 'tipo', 'sku', 'cantidad', 'origen', 'destino', 'responsable'],
    ayuda: 'Entradas, salidas, mermas, traslados y ajustes. Con la referencia del documento, volver a subir el mismo archivo no duplica nada.' },
  ventas: { nombre: 'Ventas', campos: ['ref', 'fecha', 'sku', 'cantidad', 'canal'],
    ayuda: 'Historial de ventas para la rotación y el pronóstico. No descuenta stock: el stock lo manda la foto de stock de tu sistema.' }
};
var INT_LOTE = 500;
var INT = { datos: null, fuente: '', entidad: 'stock', archivo: '', cab: [], filas: [], inicio: 1, columnas: {}, importando: false, progreso: 0,
  resultado: null, eq: null, eqEnt: 'producto', mapeos: null, borrar: null };

function normCab(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
function fuenteSel() { return (INT.datos ? INT.datos.integraciones : []).filter(function (i) { return i.id === INT.fuente; })[0]; }
function horaCorta(ts) { if (!ts) return ''; var d = new Date(ts); return fecha(d.toISOString().slice(0, 10)) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

/* ---------- Lectura de archivos ---------- */
function parsearCsv(texto) {
  texto = texto.replace(/^﻿/, '');
  var primera = texto.split(/\r?\n/)[0] || '', sep = ',', mejor = -1;
  [';', ',', '\t', '|'].forEach(function (s) { var n = primera.split(s).length; if (n > mejor) { mejor = n; sep = s; } });
  var filas = [], fila = [], campo = '', comillas = false;
  for (var i = 0; i < texto.length; i++) {
    var c = texto[i];
    if (comillas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; } else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

function cargarXlsx(listo) {
  if (window.XLSX) { listo(); return; }
  var s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = listo; s.onerror = function () { avisar('No se pudo cargar el lector de Excel. Guarda el archivo como CSV y vuelve a intentarlo.', true); };
  document.body.appendChild(s);
}

function leerArchivo(file) {
  if (!file) return;
  if (file.size > 40 * 1024 * 1024) { avisar('El archivo pesa más de 40 MB. Divídelo en partes.', true); return; }
  INT.resultado = null;
  var fin = function (filas) {
    filas = filas.filter(function (f) { return f.some(function (v) { return String(v == null ? '' : v).trim() !== ''; }); });
    if (filas.length < 2) { avisar('El archivo no tiene filas de datos debajo de los encabezados.', true); return; }
    INT.archivo = file.name; INT.cab = filas[0].map(function (h, i) { return String(h == null ? '' : h).trim() || 'Columna ' + (i + 1); });
    INT.filas = filas.slice(1); INT.columnas = autoColumnas();
    PINTAR.integraciones();
  };
  if (/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)) {
    cargarXlsx(function () {
      var r = new FileReader();
      r.onload = function () {
        try {
          var lib = XLSX.read(new Uint8Array(r.result), { type: 'array', cellDates: true });
          fin(XLSX.utils.sheet_to_json(lib.Sheets[lib.SheetNames[0]], { header: 1, raw: true, defval: '' }));
        } catch (e) { avisar('No se pudo leer el Excel: ' + e.message, true); }
      };
      r.readAsArrayBuffer(file);
    });
    return;
  }
  var r = new FileReader();
  r.onload = function () {
    var t = r.result;
    if (t.indexOf('�') > -1) {   // no era UTF-8: los CSV de Excel en español suelen venir en Windows-1252
      var r2 = new FileReader(); r2.onload = function () { fin(parsearCsv(r2.result)); }; r2.readAsText(file, 'windows-1252');
    } else fin(parsearCsv(t));
  };
  r.readAsText(file, 'utf-8');
}

/** Propone qué columna del archivo va a cada campo: primero lo recordado de la última vez, luego por nombre. */
function autoColumnas() {
  var f = fuenteSel(), guardadas = (f && f.config && f.config.columnas && f.config.columnas[INT.entidad]) || {}, res = {}, usadas = {};
  var normas = INT.cab.map(normCab);
  INT_ENTIDADES[INT.entidad].campos.forEach(function (k) {
    if (guardadas[k] && INT.cab.indexOf(guardadas[k]) > -1) { res[k] = guardadas[k]; usadas[guardadas[k]] = 1; }
  });
  INT_ENTIDADES[INT.entidad].campos.forEach(function (k) {
    if (res[k]) return;
    var sin = INT_CAMPOS[k][3], i = normas.findIndex(function (n, j) { return !usadas[INT.cab[j]] && sin.indexOf(n) > -1; });
    if (i < 0) i = normas.findIndex(function (n, j) { return !usadas[INT.cab[j]] && n.length > 2 && sin.some(function (s) { return s.length > 3 && n.indexOf(s) > -1; }); });
    if (i > -1) { res[k] = INT.cab[i]; usadas[INT.cab[i]] = 1; }
  });
  return res;
}

/* ---------- Normalización de valores ---------- */
function intNumero(v) {
  if (typeof v === 'number') return v;
  var s = String(v == null ? '' : v).trim().replace(/[\s€$£]|CLP|EUR|USD/gi, '');
  if (s === '') return null;
  var neg = /^\(.*\)$/.test(s) || /-$/.test(s); s = s.replace(/[()]/g, '').replace(/-$/, '');
  var p = s.lastIndexOf('.'), c = s.lastIndexOf(',');
  if (p > -1 && c > -1) s = p > c ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  else if (c > -1) s = (s.match(/,/g).length > 1) ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (p > -1 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  var n = Number(s);
  return isNaN(n) ? NaN : (neg ? -Math.abs(n) : n);
}
function dos(n) { return ('0' + n).slice(-2); }
function intFecha(v) {
  if (v instanceof Date && !isNaN(v)) {
    v = new Date(Math.round(v.getTime() / 60000) * 60000);   // Excel guarda la hora con decimales: 09:14:59.999 → 09:15
    var h = v.getHours() || v.getMinutes() ? ' ' + dos(v.getHours()) + ':' + dos(v.getMinutes()) : '';
    return v.getFullYear() + '-' + dos(v.getMonth() + 1) + '-' + dos(v.getDate()) + h;
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {   // número de serie de Excel
    var d = new Date(Math.round((v - 25569) * 86400000)); return intFecha(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()));
  }
  var s = String(v == null ? '' : v).trim(), m;
  if (!s) return '';
  var hora = '', mh = s.match(/[ T](\d{1,2}):(\d{2})/); if (mh) hora = ' ' + dos(mh[1]) + ':' + mh[2];
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + dos(m[2]) + '-' + dos(m[3]) + hora;
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return m[1] + '-' + m[2] + '-' + m[3];                       // 20261029 (SAP)
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) {                                        // 29/10/2026 · 29.10.26
    var a = m[3].length === 2 ? '20' + m[3] : m[3]; return a + '-' + dos(m[2]) + '-' + dos(m[1]) + hora;
  }
  return s;   // el servidor la marcará como fecha no válida
}
function intTexto(v) { return v instanceof Date ? intFecha(v) : String(v == null ? '' : v).trim(); }

/** Convierte una fila del archivo a la fila que entiende Flux (y anota problemas para la vista previa). */
function filaFlux(fila, i) {
  var o = { _fila: INT.inicio + i + 1 }, mal = [];
  INT_ENTIDADES[INT.entidad].campos.forEach(function (k) {
    var col = INT.columnas[k]; if (!col) return;
    var v = fila[INT.cab.indexOf(col)], t = INT_CAMPOS[k][2];
    if (t === 'n') { var n = intNumero(v); if (n === null) o[k] = ''; else if (isNaN(n)) { o[k] = intTexto(v); mal.push(k); } else o[k] = n; }
    else if (t === 'f') { o[k] = intFecha(v); if (o[k] && !/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(o[k])) mal.push(k); }
    else o[k] = intTexto(v);
  });
  INT_ENTIDADES[INT.entidad].campos.forEach(function (k) { if (INT_CAMPOS[k][1] && (o[k] === undefined || o[k] === '')) mal.push(k); });
  if (INT.entidad === 'productos' && !o.sku) mal.push('sku');
  return { o: o, mal: mal };
}

/* ---------- Pintado ---------- */
PINTAR.integraciones = function () {
  if (INT.datos === null) {
    $('in-fuentes').innerHTML = '<div class="vacio">Cargando integraciones…</div>';
    servidor('intListar', null, function (r) {
      INT.datos = r || { integraciones: [], historial: [] };
      if (!fuenteSel()) INT.fuente = (INT.datos.integraciones.filter(function (i) { return i.estado === 'activa'; })[0] || {}).id || '';
      if (ESTADO.vista === 'integraciones') PINTAR.integraciones();
    });
    pintarConectores();
    return;
  }
  pintarConectores(); pintarFuentes(); pintarImportar(); pintarEquivalencias(); pintarHistorial();
};

function pintarConectores() {
  $('in-conectores').innerHTML = CONECTORES.map(function (c) {
    return '<div class="c"><b>' + esc(c[0]) + '</b><p>' + esc(c[1]) + '</p>' + chip(c[3], c[2]) + '</div>';
  }).join('');
}

function pintarFuentes() {
  var l = INT.datos.integraciones;
  $('in-fuentes').innerHTML = '<h3>Fuentes de datos</h3><div class="sub">Cada sistema que envía datos a Flux. Recuerda sus columnas y equivalencias de códigos.</div>' +
    (l.map(function (i) {
      return '<div class="item int-fuente' + (i.id === INT.fuente ? ' sel' : '') + '"><div class="x"><b>' + esc(i.nombre) + '</b><span>' + esc(SISTEMAS[i.sistema] || i.sistema) +
        ' · ' + (i.ultimaSync ? 'última sincronización ' + horaCorta(i.ultimaSync) : 'sin importaciones') + ' · ' + num(i.mapeos) + ' equivalencias</span>' +
        '<div class="int-acc">' + (i.estado === 'activa' ? '<button class="btn mini' + (i.id === INT.fuente ? ' primario' : '') + '" data-accion="intUsar" data-id="' + i.id + '">Importar</button>' : chip('gris', 'Pausada')) +
        '<button class="btn mini" data-accion="intEq" data-id="' + i.id + '">Equivalencias</button>' +
        '<button class="btn mini" data-accion="intPausar" data-id="' + i.id + '">' + (i.estado === 'activa' ? 'Pausar' : 'Activar') + '</button>' +
        (INT.borrar === i.id ? '<button class="btn mini peligro" data-accion="intBorrar" data-id="' + i.id + '">Confirmar eliminación</button>'
          : '<button class="btn mini" data-accion="intBorrar" data-id="' + i.id + '">Eliminar</button>') + '</div></div></div>';
    }).join('') || '<div class="vacio" style="padding:14px 4px">Aún no hay fuentes. Crea la primera, por ejemplo «SAP de la central» o «WMS bodega Valencia».</div>') +
    '<form data-propio="intFuente" novalidate style="margin-top:12px"><div class="campos" style="grid-template-columns:1fr 1fr">' +
    '<div class="campo"><label for="if-nombre">Nueva fuente *</label><input id="if-nombre" placeholder="Ej.: SAP B1 central"></div>' +
    '<div class="campo"><label for="if-sistema">Sistema</label><select id="if-sistema">' + Object.keys(SISTEMAS).map(function (k) { return '<option value="' + k + '">' + SISTEMAS[k] + '</option>'; }).join('') + '</select></div>' +
    '</div><div class="pie-form" style="margin-top:10px"><button class="btn" type="submit">+ Añadir fuente</button></div></form>';
}

function pintarImportar() {
  var activas = INT.datos.integraciones.filter(function (i) { return i.estado === 'activa'; }), E = INT_ENTIDADES[INT.entidad], h;
  h = '<h3>Importar datos</h3><div class="sub">Sube el archivo que exporta tu sistema. Revisa las columnas, mira la vista previa e importa.</div>';
  if (!activas.length) { $('in-importar').innerHTML = h + '<div class="vacio">Crea una fuente de datos para empezar.</div>'; return; }
  h += '<div class="int-fila"><label>Fuente</label><select class="sel" id="in-fuente">' + activas.map(function (i) {
    return '<option value="' + i.id + '"' + (i.id === INT.fuente ? ' selected' : '') + '>' + esc(i.nombre) + ' · ' + esc(SISTEMAS[i.sistema]) + '</option>'; }).join('') + '</select>' +
    '<button class="btn mini" data-accion="intPlantilla">Descargar plantilla CSV</button></div>';
  h += '<div class="int-ent">' + Object.keys(INT_ENTIDADES).map(function (k) {
    return '<button type="button" class="' + (k === INT.entidad ? 'activo' : '') + '" data-accion="intEntidad" data-id="' + k + '"' + (INT.importando ? ' disabled' : '') + '><b>' + INT_ENTIDADES[k].nombre + '</b><span>' +
      INT_ENTIDADES[k].campos.filter(function (c) { return INT_CAMPOS[c][1]; }).map(function (c) { return INT_CAMPOS[c][0].split(' /')[0]; }).join(', ') + '</span></button>';
  }).join('') + '</div><p class="nota-form" style="margin-top:8px">' + E.ayuda + '</p>';
  h += '<label class="int-zona" id="in-zona"><input type="file" id="in-archivo" accept=".csv,.txt,.xlsx,.xls,.xlsm,.ods" hidden>' +
    (INT.archivo ? '<b>' + esc(INT.archivo) + '</b> · ' + num(INT.filas.length) + ' filas · ' + INT.cab.length + ' columnas<br><span>Pulsa o arrastra otro archivo para cambiarlo</span>'
      : '<b>Arrastra aquí tu archivo</b> o pulsa para elegirlo<br><span>CSV (separado por ; o ,) o Excel · exportación de SAP, WMS o cualquier sistema</span>') + '</label>';

  if (INT.archivo && !INT.importando && !INT.resultado) {
    h += '<h3 style="margin-top:6px">Columnas</h3><div class="sub">Qué columna de tu archivo corresponde a cada dato de Flux. Se recuerda para la próxima vez.</div><div class="int-mapa">' +
      E.campos.map(function (k) {
        return '<div><label>' + INT_CAMPOS[k][0] + (INT_CAMPOS[k][1] ? ' *' : '') + '</label><select class="sel" data-int-col="' + k + '"><option value="">— No importar —</option>' +
          INT.cab.map(function (c) { return '<option' + (INT.columnas[k] === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>';
      }).join('') + '</div>';
    var faltan = E.campos.filter(function (k) { return INT_CAMPOS[k][1] && !INT.columnas[k]; });
    var conv = INT.filas.map(filaFlux), malas = conv.filter(function (x) { return x.mal.length; }).length, usados = E.campos.filter(function (k) { return INT.columnas[k]; });
    h += '<h3>Vista previa</h3><div class="sub">Así entrarán las primeras filas' + (malas ? ' · <b style="color:var(--rojo)">' + num(malas) + (malas === 1 ? ' fila' : ' filas') + ' con datos incompletos o no válidos</b> (se importará el resto y verás el detalle)' : ' · todo correcto') + '</div>' +
      '<div class="tabla-caja" style="max-height:240px"><table><tr><th>Fila</th>' + usados.map(function (k) { return '<th>' + INT_CAMPOS[k][0].split(' /')[0] + '</th>'; }).join('') + '</tr>' +
      conv.slice(0, 8).map(function (x) {
        return '<tr><td class="tenue">' + x.o._fila + '</td>' + usados.map(function (k) { return '<td class="' + (x.mal.indexOf(k) > -1 ? 'mal' : '') + '">' + esc(x.o[k] === '' ? '—' : x.o[k]) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</table></div>' +
      '<div class="pie-form">' + (faltan.length ? '<span class="nota-form" style="margin:0;color:var(--rojo)">Falta elegir la columna de: ' + faltan.map(function (k) { return INT_CAMPOS[k][0]; }).join(', ') + '</span>'
        : '<button class="btn primario" data-accion="intImportar">Importar ' + num(INT.filas.length) + ' filas</button>') +
      '<button class="btn" data-accion="intDescartar">Descartar archivo</button></div>';
  }
  if (INT.importando) {
    h += '<h3>Importando…</h3><div class="int-barra"><i id="in-barra" style="width:' + INT.progreso + '%"></i></div><div class="nota-form" id="in-prog" style="margin:0">' + INT.progreso + ' %</div>';
  }
  if (INT.resultado) h += htmlResultado(INT.resultado);
  $('in-importar').innerHTML = h;
}

function etiquetasSync(ent) {
  return ent === 'stock' ? ['Ajustes de stock', 'Posiciones asignadas', 'SKU que ya cuadraban'] : ['Nuevos', 'Actualizados', 'Ya existían / sin cambios'];
}
function htmlResultado(s) {
  var e = etiquetasSync(s.entidad), col = s.estado === 'ok' ? 'verde' : s.estado === 'error' ? 'rojo' : 'ambar';
  return '<div class="int-res"><h3>Resultado ' + chip(col, ESTADOS_SYNC[s.estado] || s.estado) + '</h3><div class="rejilla kpis" style="--c:4;margin:10px 0">' +
    kpi(e[0], num(s.creados)) + kpi(e[1], num(s.actualizados)) + kpi(e[2], num(s.sin_cambios)) + kpi('Filas con error', num(s.errores), '', s.errores ? 'rojo' : '') + '</div>' +
    '<div class="pie-form" style="margin-top:4px">' + (s.errores ? '<button class="btn" data-accion="intErrores" data-id="' + s.id + '">Descargar errores (CSV)</button>' : '') +
    '<button class="btn primario" data-accion="intDescartar">Importar otro archivo</button></div></div>';
}

var ESTADOS_SYNC = { en_curso: 'En curso', ok: 'Correcta', con_errores: 'Con errores', error: 'Fallida' };
function pintarHistorial() {
  var l = INT.datos.historial;
  $('in-historial').innerHTML = '<tr><th>Fecha</th><th>Fuente</th><th>Datos</th><th>Archivo</th><th class="n">Filas</th><th class="n">Nuevos</th><th class="n">Actualizados</th><th class="n">Sin cambios</th><th class="n">Errores</th><th>Estado</th><th>Usuario</th><th></th></tr>' +
    (l.map(function (s) {
      var col = s.estado === 'ok' ? 'verde' : s.estado === 'error' ? 'rojo' : s.estado === 'en_curso' ? 'azul' : 'ambar';
      return '<tr><td>' + horaCorta(s.iniciado) + '</td><td>' + esc(s.integracion || '—') + '</td><td>' + esc((INT_ENTIDADES[s.entidad] || {}).nombre || s.entidad) + '</td>' +
        '<td class="largo">' + esc(s.origen || '—') + '</td><td class="n">' + num(s.total) + '</td><td class="n">' + num(s.creados) + '</td><td class="n">' + num(s.actualizados) + '</td>' +
        '<td class="n">' + num(s.sin_cambios) + '</td><td class="n">' + (s.errores ? '<b style="color:var(--rojo)">' + num(s.errores) + '</b>' : '0') + '</td><td>' + chip(col, ESTADOS_SYNC[s.estado] || s.estado) + '</td>' +
        '<td>' + esc(s.usuario || '') + '</td><td>' + (s.errores ? '<button class="btn mini" data-accion="intErrores" data-id="' + s.id + '">Errores</button>' : '') + '</td></tr>';
    }).join('') || '<tr><td colspan="12" class="vacio">Todavía no hay importaciones.</td></tr>');
}

function pintarEquivalencias() {
  var f = (INT.datos.integraciones || []).filter(function (i) { return i.id === INT.eq; })[0];
  if (!f) {
    $('in-equivalencias').innerHTML = '<h3>Equivalencias de códigos</h3><div class="sub">Cuando tu SAP o WMS usa otros códigos de producto o de ubicación, aquí dices a qué SKU o posición de Flux corresponde cada uno. Pulsa «Equivalencias» en una fuente.</div>';
    return;
  }
  var ent = INT.eqEnt, l = (INT.mapeos || []).filter(function (m) { return m.entidad === ent; });
  var lista = ent === 'producto' ? D.productos.map(function (p) { return [p.sku, p.nombre]; }) : D.ubicaciones.map(function (u) { return [u.pos || u.id, u.id]; });
  $('in-equivalencias').innerHTML = '<div class="int-fila" style="justify-content:space-between"><div><h3>Equivalencias de códigos · ' + esc(f.nombre) + '</h3><div class="sub" style="margin-bottom:0">El código del otro sistema se traduce al de Flux al importar.</div></div>' +
    '<div class="seg">' + [['producto', 'Productos'], ['ubicacion', 'Ubicaciones']].map(function (x) { return '<button class="' + (x[0] === ent ? 'activo' : '') + '" data-accion="intEqEnt" data-id="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
    '</div><button class="btn mini" data-accion="intEq" data-id="">Cerrar</button></div>' +
    '<div class="rejilla" style="--c:2;margin:12px 0 0">' +
    '<div><div class="tabla-caja" style="max-height:300px"><table><tr><th>Código en ' + esc(SISTEMAS[f.sistema]) + '</th><th>' + (ent === 'producto' ? 'SKU en Flux' : 'Posición en Flux') + '</th><th></th></tr>' +
    (INT.mapeos === null ? '<tr><td colspan="3" class="vacio">Cargando…</td></tr>' : l.map(function (m) {
      return '<tr><td><b>' + esc(m.externo) + '</b></td><td>' + esc(m.interno) + '</td><td><button class="btn mini" data-accion="intEqQuitar" data-id="' + esc(m.externo) + '">Quitar</button></td></tr>';
    }).join('') || '<tr><td colspan="3" class="vacio">Sin equivalencias. Si los códigos son iguales en ambos sistemas no necesitas ninguna.</td></tr>') + '</table></div></div>' +
    '<div><form data-propio="intEquivalencia" novalidate><div class="campos">' +
    '<div class="campo"><label for="ie-ext">Código en el otro sistema *</label><input id="ie-ext" autocomplete="off"></div>' +
    '<div class="campo"><label for="ie-int">' + (ent === 'producto' ? 'SKU en Flux *' : 'Posición en Flux *') + '</label><input id="ie-int" list="ie-lista" autocomplete="off"><datalist id="ie-lista">' +
    lista.slice(0, 3000).map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join('') + '</datalist></div>' +
    '<div class="campo ancho"><label for="ie-masivo">O pega varias, una por línea: código externo ; código Flux</label><textarea id="ie-masivo" rows="4" placeholder="A-000123;EI-1025&#10;A-000124;EI-1026"></textarea></div>' +
    '</div><div class="pie-form" style="margin-top:10px"><button class="btn primario" type="submit">Guardar equivalencias</button></div></form></div></div>';
}

/* ---------- Importación por lotes ---------- */
function importar() {
  var f = fuenteSel(); if (!f) { avisar('Elige la fuente de datos.', true); return; }
  var filas = INT.filas.map(function (x, i) { return filaFlux(x, i).o; }), total = filas.length, n = 0, sync = null;
  INT.importando = true; INT.progreso = 0; INT.resultado = null; pintarImportar();
  var columnas = {}; INT_ENTIDADES[INT.entidad].campos.forEach(function (k) { if (INT.columnas[k]) columnas[k] = INT.columnas[k]; });
  var fallo = function () { INT.importando = false; INT.datos = null; PINTAR.integraciones(); };
  var progreso = function () {
    INT.progreso = Math.min(99, Math.round(n / total * 100));
    if ($('in-barra')) { $('in-barra').style.width = INT.progreso + '%'; $('in-prog').textContent = num(n) + ' de ' + num(total) + ' filas · ' + INT.progreso + ' %'; }
  };
  var siguiente = function () {
    if (n >= total) {
      servidor('intFinalizar', { id: sync }, function (r) {
        INT.importando = false; INT.resultado = r.sincronizacion; INT.datos = null;
        avisar('Importación terminada: ' + (ESTADOS_SYNC[r.sincronizacion.estado] || '').toLowerCase() + '.');
        cargar(function () { mostrar('integraciones'); });
      }, fallo);
      return;
    }
    var lote = filas.slice(n, n + INT_LOTE);
    servidor('intLote', { id: sync, filas: lote }, function () { n += lote.length; progreso(); siguiente(); }, fallo);
  };
  servidor('intIniciar', { integracion: f.id, entidad: INT.entidad, total: total, origen: INT.archivo, columnas: columnas }, function (r) { sync = r.id; siguiente(); }, fallo);
}

function descargarCsv(nombre, filas) {
  var txt = '﻿' + filas.map(function (f) { return f.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

var INT_EJEMPLOS = {
  stock: [['EI-1025', '40', 'A-01-N1'], ['EI-1026', '12', '']],
  productos: [['EI-1025', 'Taladro percutor 750 W', 'Herramientas eléctricas', 'Profesional', '89,90', '52,10']],
  movimientos: [['ALB-2026-0042', '29/10/2026 09:15', 'Entrada', 'EI-1025', '24', '', 'A-01-N1', 'Recepción']],
  ventas: [['FAC-2026-1187', '29/10/2026', 'EI-1025', '3', 'Online']]
};

/* ---------- Acciones y formularios ---------- */
ACCIONES.intUsar = function (id) { INT.fuente = id; INT.columnas = INT.archivo ? autoColumnas() : {}; PINTAR.integraciones(); };
ACCIONES.intEntidad = function (k) { if (INT.importando) return; INT.entidad = k; INT.resultado = null; if (INT.archivo) INT.columnas = autoColumnas(); pintarImportar(); };
ACCIONES.intDescartar = function () { INT.archivo = ''; INT.cab = []; INT.filas = []; INT.columnas = {}; INT.resultado = null; pintarImportar(); };
ACCIONES.intImportar = function () { importar(); };
ACCIONES.intPlantilla = function () {
  var c = INT_ENTIDADES[INT.entidad].campos;
  descargarCsv('plantilla-flux-' + INT.entidad + '.csv', [c.map(function (k) { return INT_CAMPOS[k][0].split(' /')[0]; })].concat(INT_EJEMPLOS[INT.entidad]));
};
ACCIONES.intErrores = function (id) {
  servidor('intErrores', { id: id }, function (l) {
    descargarCsv('errores-importacion.csv', [['Fila del archivo', 'Problema']].concat((l || []).map(function (e) { return [e.fila || '', e.mensaje]; })));
  });
};
ACCIONES.intPausar = function (id) {
  var f = INT.datos.integraciones.filter(function (i) { return i.id === id; })[0]; if (!f) return;
  servidor('intGuardar', { id: id, nombre: f.nombre, estado: f.estado === 'activa' ? 'pausada' : 'activa' }, function () {
    if (INT.fuente === id) INT.fuente = ''; INT.datos = null; PINTAR.integraciones();
  });
};
ACCIONES.intBorrar = function (id) {
  if (INT.borrar !== id) { INT.borrar = id; pintarFuentes(); return; }
  servidor('intBorrar', { id: id }, function (r) {
    avisar(r.mensaje); INT.borrar = null; if (INT.fuente === id) INT.fuente = ''; if (INT.eq === id) INT.eq = null; INT.datos = null; PINTAR.integraciones();
  });
};
ACCIONES.intEq = function (id) {
  INT.eq = id || null; INT.mapeos = null; pintarEquivalencias();
  if (!id) return;
  servidor('intMapeos', { id: id }, function (l) { INT.mapeos = l || []; pintarEquivalencias(); });
  $('in-equivalencias').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
ACCIONES.intEqEnt = function (k) { INT.eqEnt = k; pintarEquivalencias(); };
ACCIONES.intEqQuitar = function (externo) {
  servidor('intGuardarMapeo', { integracion: INT.eq, entidad: INT.eqEnt, externo: externo, interno: '' }, function () { recargarMapeos(); });
};
function recargarMapeos() {
  servidor('intMapeos', { id: INT.eq }, function (l) {
    INT.mapeos = l || []; INT.datos.integraciones.forEach(function (i) { if (i.id === INT.eq) i.mapeos = INT.mapeos.length; });
    pintarEquivalencias(); pintarFuentes();
  });
}

PROPIOS.intFuente = function (form) {
  var d = { nombre: valor('if-nombre'), sistema: valor('if-sistema') };
  if (!d.nombre) { avisar('Ponle un nombre a la fuente.', true); return; }
  var fin = bloquear(form, 'Creando…');
  servidor('intGuardar', d, function (r) { fin(); avisar('Fuente creada.'); INT.fuente = r.id; INT.datos = null; PINTAR.integraciones(); }, fin);
};
PROPIOS.intEquivalencia = function (form) {
  var lista = valor('ie-masivo').split('\n').map(function (l) { var p = l.split(/[;\t]/); return { externo: (p[0] || '').trim(), interno: (p[1] || '').trim() }; })
    .filter(function (x) { return x.externo && x.interno; });
  if (valor('ie-ext') && valor('ie-int')) lista.push({ externo: valor('ie-ext'), interno: valor('ie-int') });
  if (!lista.length) { avisar('Escribe el código externo y su equivalente en Flux.', true); return; }
  var fin = bloquear(form);
  servidor('intGuardarMapeo', { integracion: INT.eq, entidad: INT.eqEnt, lista: lista }, function (r) {
    fin(); avisar(r.mensaje); form.reset(); recargarMapeos();
  }, fin);
};

function enlazarIntegraciones() {
  var v = $('v-integraciones');
  v.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'in-archivo') { leerArchivo(t.files[0]); t.value = ''; return; }
    if (t.id === 'in-fuente') { ACCIONES.intUsar(t.value); return; }
    var k = t.getAttribute('data-int-col'); if (k) { INT.columnas[k] = t.value; pintarImportar(); }
  });
  ['dragenter', 'dragover'].forEach(function (ev) { v.addEventListener(ev, function (e) { var z = e.target.closest && e.target.closest('#in-zona'); if (!z) return; e.preventDefault(); z.classList.add('sobre'); }); });
  v.addEventListener('dragleave', function (e) { var z = e.target.closest && e.target.closest('#in-zona'); if (z) z.classList.remove('sobre'); });
  v.addEventListener('drop', function (e) {
    var z = e.target.closest && e.target.closest('#in-zona'); if (!z) return;
    e.preventDefault(); z.classList.remove('sobre');
    if (!INT.importando && e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]);
  });
}

/* ===================== PEDIDOS Y DESPACHOS · PICKING CON RUTAS (Axioma Flux) =====================
   Pedidos de clientes con varias líneas, agrupación de pedidos en lotes (batch picking) y ruta optimizada.
   La distancia se mide por los pasillos reales de la bodega: se camina por los corredores entre filas de racks
   y se cambia de corredor solo por los pasillos transversales (cabeceras y cortes entre bloques).
   Ruta: vecino más cercano + mejora 2-opt + reubicación de paradas (or-opt).                                   */
var PK = { propuestas: null, sel: null, form: false, lineas: [], geo: null, geoD: null, geoCfg: '' };
var LETRAS = 'ABCDEFGHIJKLMNOPQRST';

function cfgPicking() {
  var p = (D && D.config && D.config.picking) || {};
  return { despacho: p.despacho === 'opuesto' ? 'opuesto' : 'porton', carro: Math.max(1, Math.min(20, Number(p.carro) || 6)),
    velocidad: Math.max(0.3, Number(p.velocidad) || 1), segParada: p.segParada == null || isNaN(p.segParada) ? 20 : Number(p.segParada) };
}
function pedidosDe(estado) { return ((D && D.pedidos) || []).filter(function (p) { return !estado || p.estado === estado; }); }
function pedidoPorId(id) { return ((D && D.pedidos) || []).filter(function (p) { return p.id === id; })[0]; }
function lotePorId(id) { return ((D && D.lotes) || []).filter(function (l) { return l.id === id; })[0]; }
function unidadesPedido(p) { return p.lineas.reduce(function (s, l) { return s + Number(l[2]); }, 0); }
function metros(n) { return num(Math.round(n)) + ' m'; }
function tiempo(seg) {
  seg = Math.round(seg || 0); if (seg < 60) return seg + ' s';
  var m = Math.round(seg / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + ('0' + (m % 60)).slice(-2) + ' min';
}
function chipEstadoPedido(e) { return chip({ 'Pendiente': 'ambar', 'En preparación': 'azul', 'Despachado': 'verde', 'Anulado': 'gris' }[e] || 'gris', e); }
function nombreProd(id) { var it = C.porId[id]; return it ? it.p.nombre : id; }

/* ---------- Geometría de la bodega para medir recorridos ---------- */
function geometriaBodega() {
  var clave = JSON.stringify(cfgPicking());
  if (PK.geoD === D && PK.geoCfg === clave) return PK.geo;
  PK.geoD = D; PK.geoCfg = clave; PK.geo = null;
  var U = (D && D.ubicaciones) || []; if (!U.length) return null;
  var paso = function (vals, def) { var s = unicos(vals.map(String)).map(Number).sort(function (a, b) { return a - b; }), m = Infinity; for (var i = 1; i < s.length; i++) m = Math.min(m, s[i] - s[i - 1]); return isFinite(m) && m > 0.3 ? m : def; };
  var W = paso(U.map(function (u) { return Number(u.x); }), 1.45);
  var Dp = Math.min(1.15, Math.max(1.0, paso(U.map(function (u) { return Number(u.y); }), 3.6) * 0.45));
  var ys = unicos(U.map(function (u) { return String(Number(u.y)); })).map(Number).sort(function (a, b) { return a - b; });
  var xs = unicos(U.map(function (u) { return String(Number(u.x)); })).map(Number).sort(function (a, b) { return a - b; });
  var minX = xs[0], maxX = xs[xs.length - 1], off = Dp / 2 + 1.1, corr = [{ y: ys[0] - off }], acceso = {}, fila = {};
  ys.forEach(function (y) { acceso[y] = []; });
  U.forEach(function (u) { if (!fila[Number(u.y)]) fila[Number(u.y)] = u.pasillo; });
  acceso[ys[0]].push(0);
  // Corredor entre dos filas solo si cabe una persona (en racks dobles, espalda con espalda, no hay paso)
  for (var i = 0; i < ys.length - 1; i++) {
    if (ys[i + 1] - ys[i] >= Dp + 1.0) { corr.push({ y: (ys[i] + ys[i + 1]) / 2 }); acceso[ys[i]].push(corr.length - 1); acceso[ys[i + 1]].push(corr.length - 1); }
  }
  corr.push({ y: ys[ys.length - 1] + off }); acceso[ys[ys.length - 1]].push(corr.length - 1);
  // Pasillos transversales: cabeceras de ambos extremos y cortes entre bloques
  var cruces = [minX - W / 2 - 1.6, maxX + W / 2 + 1.6], tramos = [], ini = xs[0];
  for (var j = 0; j < xs.length - 1; j++) if (xs[j + 1] - xs[j] > W * 1.8) { cruces.push((xs[j] + xs[j + 1]) / 2); tramos.push([ini - W / 2, xs[j] + W / 2]); ini = xs[j + 1]; }
  tramos.push([ini - W / 2, maxX + W / 2]);
  cruces.sort(function (a, b) { return a - b; });
  var porId = {}; U.forEach(function (u) { porId[u.id] = u; });
  var xd = cfgPicking().despacho === 'opuesto' ? cruces[0] : cruces[cruces.length - 1];
  PK.geo = { W: W, Dp: Dp, ys: ys, corr: corr, acceso: acceso, fila: fila, cruces: cruces, tramos: tramos, porId: porId, minX: minX, maxX: maxX,
    deposito: { c: 0, x: xd, dep: true } };
  return PK.geo;
}

/** Metros a pie entre dos puntos de corredor { c: corredor, x }. */
function distancia(G, a, b) {
  if (a.c === b.c) return Math.abs(a.x - b.x);
  var m = Infinity;
  for (var k = 0; k < G.cruces.length; k++) { var d = Math.abs(a.x - G.cruces[k]) + Math.abs(b.x - G.cruces[k]); if (d < m) m = d; }
  return m + Math.abs(G.corr[a.c].y - G.corr[b.c].y);
}
/** Puntos del suelo [x, y] para ir de a hasta b (sin repetir el punto de partida). */
function tramoRuta(G, a, b) {
  var ya = G.corr[a.c].y, yb = G.corr[b.c].y;
  if (a.c === b.c) return [[b.x, yb]];
  var X = G.cruces[0], m = Infinity;
  G.cruces.forEach(function (c) { var d = Math.abs(a.x - c) + Math.abs(b.x - c); if (d < m) { m = d; X = c; } });
  return [[X, ya], [X, yb], [b.x, yb]];
}

/** Orden óptimo de visita: sale y vuelve al punto de despacho. */
function optimizarRuta(G, nodos) {
  var n = nodos.length; if (!n) return { orden: [], metros: 0 };
  var P = [G.deposito].concat(nodos), N = n + 1, M = [], i, j;
  for (i = 0; i < N; i++) { M[i] = []; for (j = 0; j < N; j++) M[i][j] = i === j ? 0 : j < i ? M[j][i] : distancia(G, P[i], P[j]); }
  var t = [0], usado = { 0: true };
  for (var k = 1; k < N; k++) {
    var u = t[t.length - 1], b = -1, bd = Infinity;
    for (var v = 1; v < N; v++) if (!usado[v] && M[u][v] < bd) { bd = M[u][v]; b = v; }
    t.push(b); usado[b] = true;
  }
  t.push(0);
  var largo = function () { var L = 0; for (var z = 0; z < t.length - 1; z++) L += M[t[z]][t[z + 1]]; return L; };
  for (var vuelta = 0; vuelta < 40; vuelta++) {
    var mejora = false;
    // 2-opt: invierte tramos que se cruzan
    for (var a = 1; a < t.length - 2; a++) for (var c = a + 1; c < t.length - 1; c++) {
      if (M[t[a - 1]][t[c]] + M[t[a]][t[c + 1]] + 1e-6 < M[t[a - 1]][t[a]] + M[t[c]][t[c + 1]]) {
        var seg = t.slice(a, c + 1).reverse(); for (var s = 0; s < seg.length; s++) t[a + s] = seg[s]; mejora = true;
      }
    }
    // or-opt: mueve una parada al mejor hueco
    for (var p = 1; p < t.length - 1; p++) {
      var x = t[p], quitar = M[t[p - 1]][x] + M[x][t[p + 1]] - M[t[p - 1]][t[p + 1]];
      var r = t.slice(0, p).concat(t.slice(p + 1)), mejor = -1, md = quitar - 1e-6;
      for (var q = 1; q < r.length; q++) { var poner = M[r[q - 1]][x] + M[x][r[q]] - M[r[q - 1]][r[q]]; if (poner < md) { md = poner; mejor = q; } }
      if (mejor > -1) { r.splice(mejor, 0, x); t = r; mejora = true; }
    }
    if (!mejora) break;
  }
  return { orden: t.slice(1, -1).map(function (z) { return z - 1; }), metros: largo() };
}

/** Líneas de los pedidos con las posiciones de donde se pueden recoger. */
function demandas(peds) {
  var dem = [], sin = [];
  peds.forEach(function (p) {
    p.lineas.forEach(function (l) {
      var it = C.porId[l[1]], d = { p: p.id, l: l[0], prod: l[1], c: Number(l[2]) };
      var cands = it ? (it.ubis || []).filter(function (id) { return C.ubi[id] && C.ubi[id].stock > 0; }) : [];
      if (it && !cands.length) cands = (it.ubis || []).slice();
      if (!cands.length) sin.push(d); else { d.cands = cands; dem.push(d); }
    });
  });
  return { dem: dem, sin: sin };
}

/** Elige posición y corredor para cada producto (cerca de lo que ya hay que visitar) y agrupa por parada. */
function asignarParadas(G, dem) {
  var porProd = {}, grupos = [], fijos = [G.deposito], pend = [];
  dem.forEach(function (d) { if (!porProd[d.prod]) { porProd[d.prod] = { cands: d.cands, ds: [] }; grupos.push(porProd[d.prod]); } porProd[d.prod].ds.push(d); });
  var nodosDe = function (id) { var u = G.porId[id]; return u ? (G.acceso[Number(u.y)] || [0]).map(function (c) { return { c: c, x: Number(u.x), u: id }; }) : []; };
  var cerca = function (n) { var m = Infinity; for (var i = 0; i < fijos.length; i++) { var d = distancia(G, fijos[i], n); if (d < m) m = d; } return m; };
  grupos.forEach(function (g) {
    g.ns = []; g.cands.forEach(function (id) { g.ns = g.ns.concat(nodosDe(id)); });
    if (g.ns.length === 1) { g.nodo = g.ns[0]; fijos.push(g.nodo); } else if (g.ns.length) pend.push(g);
  });
  while (pend.length) {
    var mejor = null, md = Infinity, mn = null;
    pend.forEach(function (g) { g.ns.forEach(function (n) { var d = cerca(n); if (d < md) { md = d; mejor = g; mn = n; } }); });
    mejor.nodo = mn; fijos.push(mn); pend.splice(pend.indexOf(mejor), 1);
  }
  var porU = {}, lista = [];
  grupos.forEach(function (g) {
    if (!g.nodo) return; var k = g.nodo.u;
    if (!porU[k]) { var u = G.porId[k]; porU[k] = { u: k, pos: u.pos, sku: u.sku, c: g.nodo.c, x: g.nodo.x, items: [] }; lista.push(porU[k]); }
    g.ds.forEach(function (d) { porU[k].items.push({ p: d.p, l: d.l, c: d.c }); });
  });
  return lista;
}

/** Plan completo de un lote: paradas en orden, metros, comparación sin agrupar y tiempo estimado. */
function planificarLote(peds) {
  var G = geometriaBodega(); if (!G) return null;
  var cfg = cfgPicking(), dd = demandas(peds), paradas = asignarParadas(G, dd.dem), r = optimizarRuta(G, paradas);
  var orden = r.orden.map(function (i) { return paradas[i]; }), de = {}, base = 0, paradasBase = 0, unidades = 0;
  paradas.forEach(function (s) { s.items.forEach(function (it) { de[it.p + '|' + it.l] = s; unidades += it.c; }); });
  // Sin agrupar ni optimizar: cada pedido es un viaje y se recoge en el orden en que se escribió
  peds.forEach(function (p) {
    var prev = G.deposito, hay = false;
    p.lineas.forEach(function (l) { var s = de[p.id + '|' + l[0]]; if (!s) return; base += distancia(G, prev, s); prev = s; hay = true; paradasBase++; });
    if (hay) base += distancia(G, prev, G.deposito);
  });
  return { pedidos: peds.map(function (p) { return p.id; }), paradas: orden, metros: r.metros, metrosBase: base, unidades: unidades,
    segundos: Math.round(r.metros / cfg.velocidad + orden.length * cfg.segParada),
    segundosBase: Math.round(base / cfg.velocidad + paradasBase * cfg.segParada), sin: dd.sin,
    urgentes: peds.filter(function (p) { return p.prioridad === 'Urgente'; }).length };
}

/** Batch picking: agrupa pedidos pendientes por cercanía en la bodega, respetando la capacidad del carro. */
function proponerLotes(cap) {
  var G = geometriaBodega(); if (!G) return [];
  var pend = pedidosDe('Pendiente').slice().sort(function (a, b) {
    return (b.prioridad === 'Urgente') - (a.prioridad === 'Urgente') || (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id < b.id ? -1 : 1);
  });
  var largoDe = function (ps) { return optimizarRuta(G, asignarParadas(G, demandas(ps).dem)).metros; }, solo = {}, lotes = [];
  pend.forEach(function (p) { solo[p.id] = largoDe([p]); });
  while (pend.length) {
    var lote = [pend.shift()], actual = solo[lote[0].id];
    while (lote.length < cap && pend.length) {
      var mejor = -1, ahorro = -Infinity, nuevo = 0;
      for (var i = 0; i < pend.length && i < 40; i++) {
        var L = largoDe(lote.concat([pend[i]])), a = solo[pend[i].id] - (L - actual) + (pend[i].prioridad === 'Urgente' ? 1e4 : 0);
        if (a > ahorro) { ahorro = a; mejor = i; nuevo = L; }
      }
      if (mejor < 0) break;
      lote.push(pend.splice(mejor, 1)[0]); actual = nuevo;
    }
    lotes.push(planificarLote(lote));
  }
  return lotes;
}

/* ---------- Dibujo de la ruta ---------- */
function puntosRuta(G, paradas) {
  var pts = [[G.deposito.x, G.corr[0].y]], prev = G.deposito;
  paradas.forEach(function (s) { var n = { c: s.c, x: Number(s.x) }; pts = pts.concat(tramoRuta(G, prev, n)); prev = n; });
  return pts.concat(tramoRuta(G, prev, G.deposito));
}

/** Plano de la bodega visto desde arriba con la ruta numerada. */
function mapaRuta(G, paradas) {
  var pts = puntosRuta(G, paradas), dx = G.deposito.x, dy = G.corr[0].y;
  // Si la ruta ocupa una zona pequeña de una bodega grande, el plano se acerca a esa zona
  var b = { x0: dx, x1: dx, y0: dy, y1: dy }, mas = function (x, y) { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); };
  pts.forEach(function (p) { mas(p[0], p[1]); });
  paradas.forEach(function (p) { var u = G.porId[p.u]; if (u) mas(Number(p.x), Number(u.y)); });
  var X0 = G.cruces[0] - 3, X1 = G.cruces[G.cruces.length - 1] + 3, Y0 = G.corr[0].y - 3.2, Y1 = G.corr[G.corr.length - 1].y + 1.8;
  var zoom = X1 - X0 > 30 && b.x1 - b.x0 < (X1 - X0) * 0.6;
  var x0 = X0, x1 = X1, y0 = Y0, y1 = Y1;
  if (zoom) {
    x0 = Math.max(X0, b.x0 - 5); x1 = Math.min(X1, b.x1 + 5); y0 = Math.max(Y0, b.y0 - 4.5); y1 = Math.min(Y1, b.y1 + 3);
    if (x1 - x0 < 24) { var cx = (x0 + x1) / 2; x0 = Math.max(X0, cx - 12); x1 = Math.min(X1, x0 + 24); x0 = Math.max(X0, x1 - 24); }
  }
  var f = Math.max(0.55, Math.min(2.2, (x1 - x0) / 60)), r = f * 0.95;
  if (!zoom) { x0 = G.cruces[0] - Math.max(3, f * 3.4); x1 = G.cruces[G.cruces.length - 1] + Math.max(3, f * 3.4); }
  y0 = Math.min(y0, dy - Math.max(3.2, f * 3.4));
  var w = x1 - x0, h = y1 - y0;
  var s = '<svg class="pk-mapa" viewBox="' + [x0, y0, w, h].map(function (v) { return v.toFixed(2); }).join(' ') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plano de la bodega con la ruta de picking">';
  G.ys.forEach(function (y) {
    G.tramos.forEach(function (t) { s += '<rect class="rk" x="' + t[0].toFixed(2) + '" y="' + (y - G.Dp / 2).toFixed(2) + '" width="' + (t[1] - t[0]).toFixed(2) + '" height="' + G.Dp.toFixed(2) + '"/>'; });
  });
  G.ys.forEach(function (y) {
    var lx = zoom ? Math.max(x0 + f * 0.4, G.tramos[0][0] - f * 0.5) : G.tramos[0][0] - f * 0.5, ancla = zoom && lx > G.tramos[0][0] - f * 0.5 ? 'start' : 'end';
    s += '<text class="fl" x="' + lx.toFixed(2) + '" y="' + (y + f * 0.35).toFixed(2) + '" font-size="' + f.toFixed(2) + '" text-anchor="' + ancla + '">' + esc(G.fila[y] || '') + '</text>';
  });
  if (zoom) s += '<text class="fl" x="' + (x0 + f * 0.4).toFixed(2) + '" y="' + (y1 - f * 0.5).toFixed(2) + '" font-size="' + (f * 0.72).toFixed(2) + '" style="font-weight:600">Vista ampliada de la zona de la ruta</text>';
  s += '<polyline class="ruta" points="' + pts.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ') + '"/>';
  // Etiqueta del despacho dentro del plano (se desplaza hacia dentro si queda en un borde)
  var dw = f * 5.2, dxl = Math.min(Math.max(dx, x0 + dw / 2 + 0.2), x1 - dw / 2 - 0.2);
  s += '<rect class="dep" x="' + (dxl - dw / 2).toFixed(2) + '" y="' + (dy - f * 2.7).toFixed(2) + '" width="' + dw.toFixed(2) + '" height="' + (f * 1.6).toFixed(2) + '" rx="' + (f * 0.3).toFixed(2) + '"/>' +
    '<text class="dep-t" x="' + dxl.toFixed(2) + '" y="' + (dy - f * 1.6).toFixed(2) + '" font-size="' + (f * 0.78).toFixed(2) + '" text-anchor="middle">DESPACHO</text>' +
    '<circle class="dep" cx="' + dx.toFixed(2) + '" cy="' + dy.toFixed(2) + '" r="' + (f * 0.45).toFixed(2) + '"/>';
  // Paradas en el mismo punto del pasillo (mismo rack, distinto nivel) comparten una etiqueta: «1·2»
  var grupos = {}, orden = [];
  paradas.forEach(function (p, i) {
    var k = p.c + '|' + Number(p.x).toFixed(2);
    if (!grupos[k]) { grupos[k] = { p: p, n: [], t: [] }; orden.push(grupos[k]); }
    grupos[k].n.push(i + 1); grupos[k].t.push((i + 1) + ' · ' + p.pos + ' · ' + p.sku);
  });
  // Etiquetas que se pisarían en el mismo pasillo se escalonan hacia el lado contrario al rack
  var ocupado = {};
  orden.slice().sort(function (a, c) { return Number(a.p.x) - Number(c.p.x); }).forEach(function (g) {
    var txt = g.n.join('·'), x = Number(g.p.x), wp = Math.max(r * 2, txt.length * r * 0.62 + r * 0.7), k = g.p.c, u = G.porId[g.p.u];
    var nivel = 0, fin = ocupado[k] || [-Infinity, -Infinity];
    if (x - wp / 2 < fin[0] + r * 0.2 && x - wp / 2 >= fin[1] + r * 0.2) nivel = 1;
    fin[nivel] = x + wp / 2; ocupado[k] = fin;
    var lado = u && Number(u.y) > G.corr[k].y ? -1 : 1;
    g.dy = nivel ? lado * r * 2.25 : 0; g.wp = wp; g.txt = txt;
  });
  orden.forEach(function (g) {
    var p = g.p, u = G.porId[p.u], cy = G.corr[p.c].y + g.dy, fy = u ? Number(u.y) : cy, x = Number(p.x), txt = g.txt, wp = g.wp;
    s += '<line class="esp" x1="' + x.toFixed(2) + '" y1="' + cy.toFixed(2) + '" x2="' + x.toFixed(2) + '" y2="' + fy.toFixed(2) + '"/>' +
      '<rect class="par" x="' + (x - wp / 2).toFixed(2) + '" y="' + (cy - r).toFixed(2) + '" width="' + wp.toFixed(2) + '" height="' + (r * 2).toFixed(2) + '" rx="' + r.toFixed(2) + '"><title>' + esc(g.t.join('\n')) + '</title></rect>' +
      '<text class="par-t" x="' + x.toFixed(2) + '" y="' + (cy + r * 0.36).toFixed(2) + '" font-size="' + (r * (g.n.length > 1 ? 0.9 : 1.05)).toFixed(2) + '" text-anchor="middle">' + txt + '</text>';
  });
  return s + '</svg>';
}

/** Datos que necesita la bodega 3D para pintar la ruta. */
function ruta3D(obj, titulo) {
  var G = geometriaBodega(); if (!G) return null;
  return { titulo: titulo, metros: obj.metros, metrosBase: obj.metrosBase, puntos: puntosRuta(G, obj.paradas),
    deposito: { x: G.deposito.x, y: G.corr[0].y },
    paradas: obj.paradas.map(function (p) { var u = G.porId[p.u] || {}; return { x: Number(p.x), cy: G.corr[p.c].y, y: Number(u.y || 0), z: Number(u.z || 0), pos: p.pos }; }) };
}

/* ---------- Vista: Pedidos ---------- */
PINTAR.pedidos = function () {
  var todos = D.pedidos || [], pend = pedidosDe('Pendiente'), prep = pedidosDe('En preparación');
  var hoy = (D.pedidos || []).filter(function (p) { return p.estado === 'Despachado' && String(p.despachado).slice(0, 10) === D.hoy; });
  var urg = pend.filter(function (p) { return p.prioridad === 'Urgente'; }).length;
  $('pe-kpis').innerHTML =
    kpi('Pedidos pendientes', num(pend.length), urg ? '<span class="mal">' + urg + ' urgentes</span>' : 'Sin urgentes', urg ? 'ojo' : '') +
    kpi('Unidades por preparar', num(pend.reduce(function (s, p) { return s + unidadesPedido(p); }, 0)), num(pend.reduce(function (s, p) { return s + p.lineas.length; }, 0)) + ' líneas') +
    kpi('En preparación', num(prep.length), unicos(prep.map(function (p) { return p.lote; })).length + ' lotes de picking abiertos') +
    kpi('Despachados hoy', num(hoy.length), num(hoy.reduce(function (s, p) { return s + unidadesPedido(p); }, 0)) + ' unidades', hoy.length ? 'bien' : '');
  $('pe-demo').style.display = esAdmin() ? '' : 'none';
  pintarFormPedido();
  var q = valor('pe-buscar').toLowerCase(), est = $('pe-estado').value;
  var l = todos.filter(function (p) {
    if (est === 'activos' ? (p.estado !== 'Pendiente' && p.estado !== 'En preparación') : est && p.estado !== est) return false;
    if (!q) return true;
    return (p.id + ' ' + p.cliente + ' ' + p.canal + ' ' + p.lineas.map(function (x) { var it = C.porId[x[1]]; return it ? it.p.sku + ' ' + it.p.nombre : ''; }).join(' ')).toLowerCase().indexOf(q) > -1;
  }).sort(function (a, b) {
    var ua = a.prioridad === 'Urgente' && a.estado === 'Pendiente', ub = b.prioridad === 'Urgente' && b.estado === 'Pendiente';
    return ub - ua || (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? 1 : -1);
  });
  $('pe-cuenta').textContent = l.length + (l.length === 1 ? ' pedido' : ' pedidos');
  $('pe-tabla').innerHTML = '<tr><th>Pedido</th><th>Cliente</th><th>Prioridad</th><th>Productos</th><th class="n">Unidades</th><th>Estado</th><th>Lote</th><th></th></tr>' +
    (l.slice(0, 400).map(function (p) {
      var det = p.lineas.map(function (x) { var it = C.porId[x[1]]; return x[2] + ' × ' + (it ? it.p.sku + ' · ' + it.p.nombre : x[1]); }).join('\n');
      return '<tr><td><b>' + esc(p.id) + '</b><br><span class="tenue">' + fecha(p.fecha) + '</span></td>' +
        '<td class="largo"><b>' + esc(p.cliente) + '</b><br><span class="tenue">' + esc(p.canal || '—') + '</span></td>' +
        '<td>' + (p.prioridad === 'Urgente' ? chip('rojo', 'Urgente') : '<span class="tenue">Normal</span>') + '</td>' +
        '<td title="' + esc(det) + '">' + p.lineas.length + (p.lineas.length === 1 ? ' producto' : ' productos') + '<br><span class="tenue">' + esc(nombreProd(p.lineas[0] ? p.lineas[0][1] : '')) + (p.lineas.length > 1 ? ' y ' + (p.lineas.length - 1) + ' más' : '') + '</span></td>' +
        '<td class="n">' + num(unidadesPedido(p)) + '</td><td>' + chipEstadoPedido(p.estado) + (p.despachado ? '<br><span class="tenue">' + esc(p.despachado.slice(8, 10) + '/' + p.despachado.slice(5, 7) + ' ' + p.despachado.slice(11)) + '</span>' : '') + '</td>' +
        '<td>' + (p.lote ? '<button type="button" class="enlace" data-accion="verLote" data-id="' + esc(p.lote) + '">' + esc(p.lote) + '</button>' : '<span class="tenue">—</span>') + '</td>' +
        '<td>' + (p.estado === 'Pendiente' ? '<button class="btn mini escribe" data-accion="anularPedido" data-id="' + esc(p.id) + '">Anular</button>' : '') + '</td></tr>';
    }).join('') || '<tr><td colspan="8" class="vacio">No hay pedidos con este filtro.</td></tr>');
};

function etiquetaProd(p) { return p.sku + ' — ' + p.nombre; }
function productoDe(texto) {
  var t = String(texto || '').trim().toUpperCase(); if (!t) return null;
  var sku = t.split(' — ')[0].trim();
  return D.productos.filter(function (p) { return p.sku.toUpperCase() === sku || etiquetaProd(p).toUpperCase() === t; })[0] || null;
}
function comprometido(prodId) {
  var n = 0;
  (D.pedidos || []).forEach(function (p) { if (p.estado === 'Pendiente' || p.estado === 'En preparación') p.lineas.forEach(function (l) { if (l[1] === prodId) n += Number(l[2]); }); });
  return n;
}
function leerLineasPedido() {
  PK.lineas = [].map.call(document.querySelectorAll('#pe-lineas .pe-linea'), function (f) { return { texto: f.querySelector('.pe-prod').value, cant: f.querySelector('.pe-cant').value }; });
}
function pintarLineasPedido() {
  $('pe-lineas').innerHTML = '<div class="pe-cab"><span>Producto</span><span>Cantidad</span><span>Disponible</span><span></span></div>' + PK.lineas.map(function (l, i) {
    return '<div class="pe-linea"><input class="pe-prod" list="pe-productos" placeholder="Busca por SKU o nombre…" value="' + esc(l.texto || '') + '" aria-label="Producto">' +
      '<input class="pe-cant" type="number" min="1" step="1" inputmode="numeric" value="' + esc(l.cant || 1) + '" aria-label="Cantidad">' +
      '<span class="pe-stock"></span><button type="button" class="btn mini" data-accion="quitarLinea" data-id="' + i + '" title="Quitar línea" aria-label="Quitar línea">×</button></div>';
  }).join('');
  stockLineas();
}
function stockLineas() {
  [].forEach.call(document.querySelectorAll('#pe-lineas .pe-linea'), function (f) {
    var p = productoDe(f.querySelector('.pe-prod').value), cant = Number(f.querySelector('.pe-cant').value) || 0, e = f.querySelector('.pe-stock');
    if (!p) { e.innerHTML = '<span class="tenue">—</span>'; return; }
    var it = C.porId[p.id], st = it ? it.stock : 0, comp = comprometido(p.id), libre = st - comp;
    e.innerHTML = '<b class="' + (cant > st ? 'mal' : cant > libre ? 'ojo' : 'bien') + '">' + num(Math.max(0, libre)) + '</b> <span class="tenue">de ' + num(st) + (comp ? ' · ' + num(comp) + ' en pedidos' : '') + (it && !it.ubis.length ? ' · sin ubicación' : '') + '</span>';
  });
}
function pintarFormPedido() {
  var f = $('pe-form');
  if (!PK.form) { f.style.display = 'none'; f.removeAttribute('data-listo'); return; }
  f.style.display = '';
  if (f.getAttribute('data-listo')) return;
  f.setAttribute('data-listo', '1');
  var clientes = unicos((D.pedidos || []).map(function (p) { return p.cliente; })).sort();
  f.innerHTML = '<h3 style="font-size:17px">Nuevo pedido</h3><div class="sub">Queda pendiente hasta que se prepara en un lote de picking; al despacharlo se registra la venta y se descuenta el stock de cada posición.</div>' +
    '<div class="campos">' +
    '<div class="campo"><label for="pe-cliente">Cliente *</label><input id="pe-cliente" list="pe-clientes" autocomplete="off"></div>' +
    '<div class="campo"><label for="pe-canal">Canal</label><select id="pe-canal">' + opciones(D.listas.CANAL || []) + '</select></div>' +
    '<div class="campo"><label for="pe-prioridad">Prioridad</label><select id="pe-prioridad"><option>Normal</option><option>Urgente</option></select></div>' +
    '<div class="campo"><label for="pe-fecha">Fecha</label><input id="pe-fecha" type="date" value="' + esc(D.hoy) + '"></div>' +
    '<div class="campo ancho"><label for="pe-notas">Notas</label><input id="pe-notas" placeholder="Opcional: horario de entrega, transportista…"></div></div>' +
    '<div class="pe-lineas" id="pe-lineas"></div>' +
    '<button type="button" class="btn mini" data-accion="lineaPedido">+ Añadir producto</button>' +
    '<datalist id="pe-productos">' + D.productos.map(function (p) { return '<option value="' + esc(etiquetaProd(p)) + '">'; }).join('') + '</datalist>' +
    '<datalist id="pe-clientes">' + clientes.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
    '<div class="pie-form"><button class="btn primario" type="submit">Crear pedido</button><button class="btn" type="button" data-accion="cerrarPedido">Cancelar</button></div>';
  PK.lineas = [{ texto: '', cant: 1 }];
  pintarLineasPedido();
  $('pe-cliente').focus();
}

PROPIOS.pedido = function (form) {
  leerLineasPedido();
  var d = { cliente: valor('pe-cliente'), canal: valor('pe-canal'), prioridad: valor('pe-prioridad'), fecha: valor('pe-fecha'), notas: valor('pe-notas'), lineas: [] };
  if (!d.cliente) { avisar('Falta: cliente', true); $('pe-cliente').focus(); return; }
  var suma = {};
  for (var i = 0; i < PK.lineas.length; i++) {
    var l = PK.lineas[i]; if (!String(l.texto).trim()) continue;
    var p = productoDe(l.texto), c = Math.round(Number(String(l.cant).replace(',', '.')));
    if (!p) { avisar('No encuentro el producto «' + l.texto + '» en el catálogo.', true); return; }
    if (!(c > 0)) { avisar('La cantidad de ' + p.nombre + ' debe ser mayor que cero.', true); return; }
    suma[p.id] = (suma[p.id] || 0) + c;
    d.lineas.push({ producto: p.id, cantidad: c });
  }
  if (!d.lineas.length) { avisar('Añade al menos un producto al pedido.', true); return; }
  for (var id in suma) { var it = C.porId[id]; if (it && suma[id] > it.stock) { avisar('Solo hay ' + num(it.stock) + ' unidades en stock de ' + it.p.nombre + '.', true); return; } }
  var fin = bloquear(form, 'Creando…');
  servidor('guardarPedido', d, function (r) { fin(); avisar(r.mensaje || 'Pedido creado.'); PK.form = false; cargar(function () { mostrar('pedidos'); }); }, fin);
};

/* ---------- Vista: Picking y rutas ---------- */
function resumenLote(o) {
  var ah = o.metrosBase > 0 ? (o.metrosBase - o.metros) / o.metrosBase * 100 : 0;
  return '<div class="pk-cifras"><span><b>' + o.paradas.length + '</b> paradas</span><span><b>' + num(o.unidades) + '</b> uds</span>' +
    '<span><b>' + metros(o.metros) + '</b>' + (o.metrosBase > o.metros ? ' <s class="tenue">' + metros(o.metrosBase) + '</s>' : '') + '</span>' +
    (o.metrosBase > o.metros ? '<span class="bien">−' + pct(ah) + ' recorrido</span>' : '') + '<span>≈ ' + tiempo(o.segundos) + '</span></div>';
}
function chipsPedidos(ids) {
  return '<div class="pk-chips">' + ids.map(function (id, i) {
    var p = pedidoPorId(id); return '<span class="pk-ped' + (p && p.prioridad === 'Urgente' ? ' urg' : '') + '" title="' + esc(p ? p.cliente : '') + '"><i>' + LETRAS[i] + '</i>' + esc(id.replace(/^PED-\d{4}-/, '#')) + '</span>';
  }).join('') + '</div>';
}

PINTAR.picking = function () {
  var G = geometriaBodega(), cfg = cfgPicking(), pend = pedidosDe('Pendiente'), lotes = D.lotes || [];
  var abiertos = lotes.filter(function (l) { return l.estado === 'Abierto'; });
  var desde = new Date(C.hoy.getTime() - 30 * 864e5).toISOString().slice(0, 10);
  var recientes = lotes.filter(function (l) { return l.estado !== 'Cancelado' && l.creado.slice(0, 10) >= desde; });
  var ahM = recientes.reduce(function (s, l) { return s + Math.max(0, l.metrosBase - l.metros); }, 0), baseM = recientes.reduce(function (s, l) { return s + Number(l.metrosBase); }, 0);
  var ahS = recientes.reduce(function (s, l) { return s + Math.max(0, (l.metrosBase - l.metros) / cfg.velocidad); }, 0);
  var urg = pend.filter(function (p) { return p.prioridad === 'Urgente'; }).length;
  $('pk-kpis').innerHTML =
    kpi('Pedidos por preparar', num(pend.length), urg ? '<span class="mal">' + urg + ' urgentes</span>' : 'Sin urgentes', urg ? 'ojo' : '') +
    kpi('Lotes en curso', num(abiertos.length), num(abiertos.reduce(function (s, l) { return s + l.pedidos.length; }, 0)) + ' pedidos en preparación') +
    kpi('Recorrido ahorrado · 30 días', metros(ahM), baseM ? pct(ahM / baseM * 100) + ' menos que pedido a pedido' : 'Aún sin lotes', ahM ? 'bien' : '') +
    kpi('Tiempo de marcha ahorrado', tiempo(ahS), 'A ' + String(cfg.velocidad).replace('.', ',') + ' m/s · últimos 30 días', ahS ? 'bien' : '');

  // Generar lotes
  var h = '<h3>Generar lotes de picking</h3><div class="sub">Agrupa los pedidos pendientes que comparten zonas de la bodega y calcula, para cada carro, la ruta más corta por los pasillos.</div>';
  if (!G) h += '<div class="vacio">La bodega no tiene posiciones configuradas.</div>';
  else {
    h += '<div class="pk-param escribe"><label>Pedidos por carro<input type="number" id="pk-carro" min="1" max="20" step="1" value="' + esc($('pk-carro') ? $('pk-carro').value : cfg.carro) + '"></label>' +
      '<label>Preparador<input id="pk-resp" placeholder="Nombre (opcional)" value="' + esc($('pk-resp') ? $('pk-resp').value : '') + '"></label>' +
      '<button class="btn primario" data-accion="proponerLotes"' + (pend.length ? '' : ' disabled') + '>Proponer lotes</button></div>';
    if (!pend.length) h += '<div class="vacio">No hay pedidos pendientes. Crea pedidos en la pestaña Pedidos.</div>';
    else if (!PK.propuestas) h += '<p class="nota-form">' + num(pend.length) + ' pedidos pendientes' + (urg ? ', ' + urg + ' urgentes (van primero)' : '') + '. Despacho: ' + (cfg.despacho === 'opuesto' ? 'extremo opuesto al portón' : 'junto al portón') + ' · se ajusta en Ajustes › Empresa.</p>';
    else {
      var P = PK.propuestas, tm = 0, tb = 0, ts = 0, tsb = 0;
      P.forEach(function (o) { tm += o.metros; tb += o.metrosBase; ts += o.segundos; tsb += o.segundosBase; });
      h += '<div class="pk-total"><div><b>' + P.length + (P.length === 1 ? ' lote' : ' lotes') + '</b> para ' + num(P.reduce(function (s, o) { return s + o.pedidos.length; }, 0)) + ' pedidos</div>' +
        '<div class="pk-barras"><div><span>Pedido a pedido</span><i style="width:100%"></i><b>' + metros(tb) + ' · ' + tiempo(tsb) + '</b></div>' +
        '<div class="opt"><span>Con lotes y rutas</span><i style="width:' + (tb ? Math.max(4, tm / tb * 100) : 100) + '%"></i><b>' + metros(tm) + ' · ' + tiempo(ts) + '</b></div></div>' +
        '<div class="pk-ahorro">' + (tb > tm ? '−' + pct((tb - tm) / tb * 100) : '—') + '<small>recorrido</small></div>' +
        '<button class="btn primario escribe" data-accion="crearTodos">Crear todos</button></div>';
      h += '<div class="pk-props">' + P.map(function (o, i) {
        var sel = PK.sel && PK.sel.tipo === 'prop' && PK.sel.i === i;
        return '<div class="pk-prop' + (sel ? ' sel' : '') + '"><div class="pk-prop-cab"><b>Lote ' + (i + 1) + '</b>' + (o.urgentes ? chip('rojo', o.urgentes + ' urgente' + (o.urgentes > 1 ? 's' : '')) : '') + '</div>' +
          chipsPedidos(o.pedidos) + resumenLote(o) +
          (o.sin.length ? '<div class="nota-form mal">' + o.sin.length + ' línea(s) sin posición en la bodega: se preparan aparte.</div>' : '') +
          '<div class="pk-acc"><button class="btn mini" data-accion="verPropuesta" data-id="' + i + '">' + (sel ? 'Viendo ruta' : 'Ver ruta') + '</button>' +
          '<button class="btn mini primario escribe" data-accion="crearLote" data-id="' + i + '">Crear lote</button></div></div>';
      }).join('') + '</div>';
    }
  }
  $('pk-generar').innerHTML = h;

  // Lotes abiertos
  $('pk-abiertos').innerHTML = '<h3>Lotes en curso</h3><div class="sub">Carros que se están preparando</div>' + (abiertos.map(function (l) {
    var sel = PK.sel && PK.sel.tipo === 'lote' && PK.sel.id === l.id;
    return '<div class="pk-lote' + (sel ? ' sel' : '') + '"><div class="pk-prop-cab"><b>' + esc(l.id) + '</b><span class="tenue">' + esc(l.responsable || 'Sin preparador') + ' · ' + esc(l.creado.slice(11)) + '</span></div>' +
      chipsPedidos(l.pedidos) + resumenLote({ paradas: l.ruta, unidades: l.unidades, metros: Number(l.metros), metrosBase: Number(l.metrosBase), segundos: l.segundos }) +
      '<div class="pk-acc"><button class="btn mini" data-accion="verLote" data-id="' + esc(l.id) + '">Lista de picking</button><button class="btn mini" data-accion="lote3d" data-id="' + esc(l.id) + '">Ver en 3D</button>' +
      '<button class="btn mini primario escribe" data-accion="completarLote" data-id="' + esc(l.id) + '">Despachar</button><button class="btn mini escribe" data-accion="cancelarLote" data-id="' + esc(l.id) + '">Cancelar</button></div></div>';
  }).join('') || '<div class="vacio">No hay lotes en curso.</div>');

  pintarDetalle();

  var hist = lotes.filter(function (l) { return l.estado !== 'Abierto'; });
  $('pk-historial').innerHTML = '<tr><th>Lote</th><th>Creado</th><th>Cerrado</th><th>Preparador</th><th class="n">Pedidos</th><th class="n">Paradas</th><th class="n">Recorrido</th><th class="n">Pedido a pedido</th><th class="n">Ahorro</th><th>Estado</th></tr>' +
    (hist.map(function (l) {
      var ah = l.metrosBase > 0 ? (l.metrosBase - l.metros) / l.metrosBase * 100 : 0;
      return '<tr><td><button type="button" class="enlace" data-accion="verLote" data-id="' + esc(l.id) + '"><b>' + esc(l.id) + '</b></button></td><td>' + esc(fecha(l.creado.slice(0, 10)) + ' ' + l.creado.slice(11)) + '</td><td>' + esc(l.cerrado ? fecha(l.cerrado.slice(0, 10)) + ' ' + l.cerrado.slice(11) : '') + '</td>' +
        '<td>' + esc(l.responsable || '—') + '</td><td class="n">' + l.pedidos.length + '</td><td class="n">' + l.ruta.length + '</td><td class="n">' + metros(l.metros) + '</td><td class="n">' + metros(l.metrosBase) + '</td>' +
        '<td class="n ' + (ah > 0 ? 'bien' : '') + '">' + (ah > 0 ? '−' + pct(ah) : '—') + '</td><td>' + chip(l.estado === 'Completado' ? 'verde' : 'gris', l.estado === 'Completado' ? 'Despachado' : l.estado) + '</td></tr>';
    }).join('') || '<tr><td colspan="10" class="vacio">Todavía no se ha cerrado ningún lote.</td></tr>');
};

function objetoSel() {
  if (!PK.sel) return null;
  if (PK.sel.tipo === 'prop') { var o = PK.propuestas && PK.propuestas[PK.sel.i]; return o ? { titulo: 'Lote propuesto ' + (PK.sel.i + 1), o: o, lote: null } : null; }
  var l = lotePorId(PK.sel.id); if (!l) return null;
  return { titulo: 'Lote ' + l.id, lote: l, o: { pedidos: l.pedidos, paradas: l.ruta, metros: Number(l.metros), metrosBase: Number(l.metrosBase), segundos: l.segundos, unidades: l.unidades, sin: [] } };
}
function hechosDe(id) { try { return JSON.parse(leerLocal('pk-' + id) || '{}') || {}; } catch (e) { return {}; } }

function pintarDetalle() {
  var x = objetoSel(), G = geometriaBodega(), cont = $('pk-detalle');
  if (!x || !G) { cont.style.display = 'none'; return; }
  cont.style.display = '';
  var o = x.o, l = x.lote, hechos = l ? hechosDe(l.id) : {}, letra = {};
  o.pedidos.forEach(function (id, i) { letra[id] = LETRAS[i]; });
  var listos = o.paradas.filter(function (p, i) { return hechos[i]; }).length;
  var acciones = l && l.estado === 'Abierto' ?
    '<button class="btn" data-accion="imprimirLote" data-id="' + esc(l.id) + '">Imprimir lista</button><button class="btn" data-accion="lote3d" data-id="' + esc(l.id) + '">Ver ruta en 3D</button><button class="btn primario escribe" data-accion="completarLote" data-id="' + esc(l.id) + '">Despachar lote</button>'
    : l ? '<button class="btn" data-accion="imprimirLote" data-id="' + esc(l.id) + '">Imprimir lista</button>'
    : '<button class="btn" data-accion="prop3d" data-id="' + PK.sel.i + '">Ver ruta en 3D</button><button class="btn primario escribe" data-accion="crearLote" data-id="' + PK.sel.i + '">Crear este lote</button>';
  cont.innerHTML = '<div class="pk-det-cab"><div><h3>' + esc(x.titulo) + (l ? ' ' + chip(l.estado === 'Abierto' ? 'azul' : l.estado === 'Completado' ? 'verde' : 'gris', l.estado === 'Completado' ? 'Despachado' : l.estado) : '') + '</h3>' +
    '<div class="sub">' + o.pedidos.length + ' pedidos en un carro · cada pedido va en su caja (A, B, C…) · la ruta sale y vuelve al despacho</div></div>' +
    '<div class="pie-form" style="margin:0">' + acciones + '<button class="btn" data-accion="cerrarDetalle">Cerrar</button></div></div>' +
    resumenLote(o) +
    '<div class="pk-det"><div class="pk-plano">' + mapaRuta(G, o.paradas) + '<div class="leyenda"><span><i style="background:var(--azul)"></i>Ruta</span><span><i style="background:#F97316"></i>Parada</span><span><i style="background:var(--verde)"></i>Despacho</span></div></div>' +
    '<div class="pk-lista"><div class="pk-lista-cab"><b>Lista de picking</b>' + (l && l.estado === 'Abierto' ? '<span class="tenue">' + listos + ' de ' + o.paradas.length + ' paradas recogidas</span>' : '') + '</div>' +
    '<div class="tabla-caja" style="max-height:440px"><table><tr>' + (l && l.estado === 'Abierto' ? '<th></th>' : '') + '<th>#</th><th>Ubicación</th><th>Producto</th><th class="n">Uds</th><th>Reparto en el carro</th></tr>' +
    o.paradas.map(function (p, i) {
      var it = C.porSku[p.sku], tot = p.items.reduce(function (s, z) { return s + z.c; }, 0);
      return '<tr class="' + (hechos[i] ? 'hecho' : '') + '">' + (l && l.estado === 'Abierto' ? '<td><input type="checkbox" data-hecho="' + i + '" data-lote="' + esc(l.id) + '"' + (hechos[i] ? ' checked' : '') + ' aria-label="Parada ' + (i + 1) + ' recogida"></td>' : '') +
        '<td><span class="pk-num">' + (i + 1) + '</span></td><td><b>' + esc(p.pos) + '</b></td>' +
        '<td class="largo"><b>' + esc(it ? it.p.nombre : p.sku) + '</b><br><span class="tenue">' + esc(p.sku) + '</span></td><td class="n"><b>' + num(tot) + '</b></td>' +
        '<td>' + p.items.map(function (z) { return '<span class="pk-rep"><i>' + (letra[z.p] || '?') + '</i>' + z.c + '</span>'; }).join(' ') + '</td></tr>';
    }).join('') + '</table></div>' +
    (o.sin && o.sin.length ? '<p class="nota-form mal">Sin posición en la bodega: ' + o.sin.map(function (d) { return esc(d.c + ' × ' + nombreProd(d.prod) + ' (' + d.p + ')'); }).join(', ') + '.</p>' : '') +
    '<div class="pk-cajas">' + o.pedidos.map(function (id) { var p = pedidoPorId(id); return '<span><i>' + letra[id] + '</i>' + esc(id) + ' · ' + esc(p ? p.cliente : '') + (p && p.prioridad === 'Urgente' ? ' · <b class="mal">urgente</b>' : '') + '</span>'; }).join('') + '</div>' +
    '</div></div>';
}

/** Hoja imprimible para el preparador. */
function imprimirLote(id) {
  var l = lotePorId(id); if (!l) return;
  var G = geometriaBodega(), letra = {}; l.pedidos.forEach(function (p, i) { letra[p] = LETRAS[i]; });
  var filas = l.ruta.map(function (p, i) {
    var it = C.porSku[p.sku]; return '<tr><td class="c">☐</td><td class="c"><b>' + (i + 1) + '</b></td><td><b>' + esc(p.pos) + '</b></td><td>' + esc(it ? it.p.nombre : p.sku) + '<br><small>' + esc(p.sku) + '</small></td><td class="c"><b>' + p.items.reduce(function (s, z) { return s + z.c; }, 0) + '</b></td><td>' +
      p.items.map(function (z) { return '<b>' + letra[z.p] + '</b>: ' + z.c; }).join(' &nbsp; ') + '</td></tr>';
  }).join('');
  var w = window.open('', '_blank'); if (!w) { avisar('El navegador bloqueó la ventana de impresión.', true); return; }
  w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(l.id) + ' · Lista de picking</title><style>' +
    'body{font:13px/1.4 Inter,system-ui,sans-serif;color:#0B1324;margin:24px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;color:#5A6A82}' +
    'table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border-bottom:1px solid #D5DDE8;padding:7px 6px;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase;color:#5A6A82}' +
    '.c{text-align:center}small{color:#5A6A82}.cajas{display:flex;flex-wrap:wrap;gap:6px 18px;margin:10px 0}svg{width:100%;max-height:360px;border:1px solid #D5DDE8;border-radius:8px}' +
    '.rk{fill:#CBD5E1}.fl{fill:#64748B;font-weight:700}.ruta{fill:none;stroke:#0A93D6;stroke-width:3;vector-effect:non-scaling-stroke;stroke-linejoin:round}.esp{stroke:#F97316;stroke-width:1.5;vector-effect:non-scaling-stroke}' +
    '.par{fill:#F97316;stroke:#fff;stroke-width:1;vector-effect:non-scaling-stroke}.par-t{fill:#fff;font-weight:800}.dep{fill:#16A34A}.dep-t{fill:#fff;font-weight:800}</style></head><body>' +
    '<h1>Lista de picking · ' + esc(l.id) + '</h1><p>' + esc(D.empresa ? D.empresa.nombre : '') + ' · ' + esc(fecha(l.creado.slice(0, 10)) + ' ' + l.creado.slice(11)) + ' · Preparador: ' + esc(l.responsable || '—') +
    ' · ' + l.ruta.length + ' paradas · ' + metros(l.metros) + ' · ≈ ' + tiempo(l.segundos) + '</p>' +
    '<div class="cajas">' + l.pedidos.map(function (id) { var p = pedidoPorId(id); return '<span><b>Caja ' + letra[id] + '</b>: ' + esc(id) + ' · ' + esc(p ? p.cliente : '') + '</span>'; }).join('') + '</div>' +
    (G ? mapaRuta(G, l.ruta) : '') +
    '<table><tr><th class="c">✓</th><th class="c">#</th><th>Ubicación</th><th>Producto</th><th class="c">Uds</th><th>Reparto por caja</th></tr>' + filas + '</table>' +
    '<script>window.onload=function(){window.print()}<\/script></body></html>');
  w.document.close();
}

/* ---------- Ruta en la bodega 3D ---------- */
function pintarBannerRuta() {
  var b = $('b-ruta'); if (!b) return;
  var R = ESTADO.ruta;
  if (!R) { b.style.display = 'none'; return; }
  b.style.display = '';
  var ah = R.metrosBase > R.metros ? (R.metrosBase - R.metros) / R.metrosBase * 100 : 0;
  b.innerHTML = '<b>' + esc(R.titulo) + '</b><span>' + R.paradas.length + ' paradas · ' + metros(R.metros) + (ah ? ' · <em>−' + pct(ah) + ' vs pedido a pedido</em>' : '') + '</span>' +
    '<button class="btn mini" data-accion="repetirRuta">Repetir recorrido</button><button class="btn mini" data-accion="volverPicking">Volver al picking</button><button class="btn mini" data-accion="quitarRuta">Quitar ruta</button>';
}
var pintarPosicionesBase = PINTAR.posiciones;
PINTAR.posiciones = function () { pintarPosicionesBase(); pintarBannerRuta(); };
function verRuta3D(R) {
  if (!R) { avisar('No se pudo calcular la ruta.', true); return; }
  if (!tiene('posiciones')) { avisar('La bodega 3D está incluida en el plan Profesional.', true); return; }
  ESTADO.ruta = R; ESTADO.pasillo = ''; if (ESTADO.filtro) ESTADO.filtro.pasillo = '';
  mostrar('posiciones'); BODEGA.ruta(); pintarBannerRuta();
}

/* ---------- Acciones ---------- */
ACCIONES.nuevoPedido = function () { PK.form = true; if (ESTADO.vista === 'pedidos') pintar(); else mostrar('pedidos'); };
ACCIONES.cerrarPedido = function () { PK.form = false; pintar(); };
ACCIONES.lineaPedido = function () { leerLineasPedido(); PK.lineas.push({ texto: '', cant: 1 }); pintarLineasPedido(); var p = document.querySelectorAll('#pe-lineas .pe-prod'); p[p.length - 1].focus(); };
ACCIONES.quitarLinea = function (i) { leerLineasPedido(); PK.lineas.splice(Number(i), 1); if (!PK.lineas.length) PK.lineas.push({ texto: '', cant: 1 }); pintarLineasPedido(); };
ACCIONES.anularPedido = function (id) {
  if (!confirmar('¿Anular el pedido ' + id + '? No se podrá preparar.')) return;
  servidor('anularPedido', { id: id }, function (r) { avisar(r.mensaje); cargar(); });
};
ACCIONES.demoPedidos = function () {
  servidor('demoPedidos', { n: 24 }, function (r) { avisar(r.mensaje); PK.propuestas = null; cargar(); });
};
ACCIONES.proponerLotes = function () {
  var cap = Math.max(1, Math.min(20, Math.round(Number(valor('pk-carro')) || cfgPicking().carro)));
  var b = document.querySelector('[data-accion="proponerLotes"]'); if (b) { b.disabled = true; b.textContent = 'Calculando…'; }
  setTimeout(function () {
    var t0 = performance.now();
    PK.propuestas = proponerLotes(cap).filter(Boolean);
    PK.sel = PK.propuestas.length ? { tipo: 'prop', i: 0 } : null;
    pintar();
    avisar(PK.propuestas.length + (PK.propuestas.length === 1 ? ' lote propuesto' : ' lotes propuestos') + ' en ' + Math.max(1, Math.round(performance.now() - t0)) + ' ms.');
  }, 30);
};
ACCIONES.verPropuesta = function (i) { PK.sel = { tipo: 'prop', i: Number(i) }; pintar(); $('pk-detalle').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACCIONES.verLote = function (id) { PK.sel = { tipo: 'lote', id: id }; if (ESTADO.vista !== 'picking') mostrar('picking'); else pintar(); var e = $('pk-detalle'); if (e && e.style.display !== 'none') e.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACCIONES.cerrarDetalle = function () { PK.sel = null; pintar(); };
function datosLote(o) {
  return { pedidos: o.pedidos, responsable: valor('pk-resp'), metros: Math.round(o.metros * 10) / 10, metrosBase: Math.round(o.metrosBase * 10) / 10,
    segundos: o.segundos, unidades: o.unidades,
    ruta: o.paradas.map(function (p) { return { u: p.u, pos: p.pos, sku: p.sku, c: p.c, x: Math.round(Number(p.x) * 100) / 100, items: p.items }; }) };
}
ACCIONES.crearLote = function (i) {
  var o = PK.propuestas && PK.propuestas[Number(i)]; if (!o) return;
  servidor('crearLote', datosLote(o), function (r) {
    avisar(r.mensaje); PK.propuestas = null; PK.sel = { tipo: 'lote', id: r.id };
    cargar(function () { mostrar('picking'); });
  });
};
ACCIONES.crearTodos = function () {
  var P = (PK.propuestas || []).slice(), hechos = 0, ultimo = null; if (!P.length) return;
  var b = document.querySelector('[data-accion="crearTodos"]'); if (b) { b.disabled = true; b.textContent = 'Creando…'; }
  var sig = function () {
    if (!P.length) { avisar(hechos + (hechos === 1 ? ' lote creado.' : ' lotes creados.')); PK.propuestas = null; PK.sel = ultimo ? { tipo: 'lote', id: ultimo } : null; cargar(function () { mostrar('picking'); }); return; }
    servidor('crearLote', datosLote(P.shift()), function (r) { hechos++; ultimo = ultimo || r.id; sig(); }, function () { PK.propuestas = null; cargar(function () { mostrar('picking'); }); });
  };
  sig();
};
ACCIONES.completarLote = function (id) {
  var l = lotePorId(id); if (!l) return;
  if (!confirmar('¿Despachar el lote ' + id + '? Se registran las ventas de ' + l.pedidos.length + ' pedidos y se descuenta el stock de cada posición.')) return;
  servidor('completarLote', { id: id }, function (r) { avisar(r.mensaje); try { localStorage.removeItem('axioma-bodega-pk-' + id); } catch (e) {} cargar(function () { mostrar('picking'); }); });
};
ACCIONES.cancelarLote = function (id) {
  if (!confirmar('¿Cancelar el lote ' + id + '? Sus pedidos vuelven a pendientes.')) return;
  servidor('cancelarLote', { id: id }, function (r) { avisar(r.mensaje); if (PK.sel && PK.sel.id === id) PK.sel = null; cargar(function () { mostrar('picking'); }); });
};
ACCIONES.imprimirLote = function (id) { imprimirLote(id); };
ACCIONES.lote3d = function (id) {
  var l = lotePorId(id); if (!l) return;
  verRuta3D(ruta3D({ paradas: l.ruta, metros: Number(l.metros), metrosBase: Number(l.metrosBase) }, 'Ruta del lote ' + l.id));
};
ACCIONES.prop3d = function (i) { var o = PK.propuestas && PK.propuestas[Number(i)]; if (o) verRuta3D(ruta3D(o, 'Ruta del lote propuesto ' + (Number(i) + 1))); };
ACCIONES.quitarRuta = function () { ESTADO.ruta = null; BODEGA.ruta(); pintarBannerRuta(); };
ACCIONES.volverPicking = function () { mostrar('picking'); };
ACCIONES.repetirRuta = function () { BODEGA.ruta(); };

/** Confirmación propia (sin diálogos del navegador). Segundo clic en 4 s = confirmar. */
var CONFIRMA = { clave: '', hasta: 0 };
function confirmar(texto) {
  var ahora = Date.now();
  if (CONFIRMA.clave === texto && ahora < CONFIRMA.hasta) { CONFIRMA.clave = ''; return true; }
  CONFIRMA.clave = texto; CONFIRMA.hasta = ahora + 4000;
  avisar(texto + ' Pulsa otra vez para confirmar.');
  return false;
}

function enlazarPedidos() {
  ['pe-buscar', 'pe-estado'].forEach(function (id) { $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', function () { pintar(); }); });
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#pe-lineas')) stockLineas(); });
  document.addEventListener('change', function (e) {
    var i = e.target.getAttribute && e.target.getAttribute('data-hecho'); if (i == null) return;
    var id = e.target.getAttribute('data-lote'), h = hechosDe(id); if (e.target.checked) h[i] = 1; else delete h[i];
    guardarLocal('pk-' + id, JSON.stringify(h)); pintarDetalle();
  });
}

// Insignia del riel: pedidos pendientes
var pintarTodoPedidos = pintarTodo;
pintarTodo = function () { pintarTodoPedidos(); var e = $('ins-pedidos'); if (e) e.textContent = pedidosDe('Pendiente').length || ''; };

/* ===================== ARRANQUE ===================== */
(function () {
  ESTADO.color = leerLocal('color') || 'rotacion';
  ESTADO.calidad = leerLocal('calidad') || (window.innerWidth < 760 ? 'media' : 'alta');
  if (!COLOR[ESTADO.color] && ['rotacion', 'disponibilidad', 'categoria', 'quiebre'].indexOf(ESTADO.color) === -1) ESTADO.color = 'rotacion';
  crearFormularios();
  enlazar(); enlazarSaas(); enlazarIntegraciones(); enlazarPedidos();
  var pintarBase = pintarTodo;
  pintarTodo = function () { pintarBase(); BODEGA.actualizar(); };
  if (leerLocal('tema') === 'claro') document.body.classList.add('claro');
  cargar();
})();
