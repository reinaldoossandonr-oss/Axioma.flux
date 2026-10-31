/* ===================== OPTIMIZACIÓN DE ESPACIO (slotting inteligente) =====================
   Cruza la demanda de cada producto (líneas de venta de los últimos 90 días) con la distancia real a pie desde el despacho
   de cada posición (pasillos + altura). Propone:
   · Mover: un producto de alta rotación lejos del despacho pasa a un hueco libre de la zona preferente.
   · Intercambio en dos pasos: un producto lento que ocupa la zona preferente sale a un hueco del fondo y su sitio lo ocupa uno rápido.
   El ahorro es una estimación: metros de ida y vuelta por línea de pedido, al mes, si cada línea se recogiera por separado.
   Aplicar una sugerencia registra movimientos de tipo «Transferencia» (el stock total no cambia).                                  */
var OPT = { res: null, rutas: [], sel: null };

function distanciaDespacho(G, u) {
  var m = Infinity;
  (G.acceso[Number(u.y)] || [0]).forEach(function (c) { var d = distancia(G, G.deposito, { c: c, x: Number(u.x) }); if (d < m) m = d; });
  return m + (Number(u.nivel) - 1) * 1.2;   // cada nivel de altura cuesta como ~1,2 m más de recorrido
}

function analizarBodega() {
  var G = geometriaBodega(); if (!G) return null;
  // Demanda: líneas de venta de los últimos 90 días por producto
  var lineas = {};
  D.ventas.forEach(function (v) { var d = diasDesde(v[1]); if (d >= 0 && d < 90) lineas[v[2]] = (lineas[v[2]] || 0) + 1; });
  var P = D.ubicaciones.map(function (u) { return { u: u, x: C.ubi[u.id], d: distanciaDespacho(G, u) }; });
  var ocup = P.filter(function (p) { return p.x.it; }), libres = P.filter(function (p) { return !p.x.it; }).sort(function (a, b) { return a.d - b.d; });
  // Cara de picking de cada producto = su posición más cercana al despacho (de ahí se recoge); el resto es reserva
  var prod = {};
  ocup.forEach(function (p) {
    var id = p.x.it.p.id, x = prod[id] = prod[id] || { r: lineas[id] || 0, pos: [] };
    x.pos.push(p); p.r = x.r;
  });
  Object.keys(prod).forEach(function (id) { var x = prod[id]; x.pos.sort(function (a, b) { return a.d - b.d; }); x.cara = x.pos[0]; x.pos.forEach(function (p, i) { p.cara = i === 0; p.prod = x; }); });
  var q = function (arr, f) { return arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * f))] : 0; };
  var ds = P.map(function (p) { return p.d; }).sort(function (a, b) { return a - b; }), corte = q(ds, 0.3);
  var rs = Object.keys(prod).map(function (id) { return prod[id].r; }).sort(function (a, b) { return a - b; }), rAlta = q(rs, 0.7), rBaja = q(rs, 0.3);
  var mes = 2 / 3;   // ida y vuelta · de 90 días a 1 mes
  // Coste de sacar una posición de la zona preferente: solo cuenta si es la cara de picking (su producto pasaría a recogerse más lejos)
  var costeSalir = function (b, nuevoD) {
    if (!b.cara) return 0;
    var sig = b.prod.pos[1] ? b.prod.pos[1].d : Infinity;
    return b.r * Math.max(0, Math.min(sig, nuevoD) - b.d) * mes;
  };
  var subir = Object.keys(prod).map(function (id) { return prod[id].cara; })
    .filter(function (p) { return p.r >= rAlta && p.r > 0 && p.d > corte; }).sort(function (a, b) { return b.r * b.d - a.r * a.d; });
  var bajar = ocup.filter(function (p) { return p.d <= corte && (p.r <= rBaja || !p.cara); })
    .sort(function (a, b) { return (a.cara ? 1 : 0) - (b.cara ? 1 : 0) || a.r - b.r || a.d - b.d; });
  var lejanas = libres.slice().reverse(), usado = {}, sug = [];
  subir.forEach(function (p) {
    if (sug.length >= 40 || usado[p.u.id]) return;
    var h = libres.filter(function (l) { return !usado[l.u.id] && l.d < p.d - 4 && l.d <= corte * 1.25; })[0];
    var opA = h ? { tipo: 'mover', p: p, a: h, ahorro: p.r * (p.d - h.d) * mes } : null;
    var b = bajar.filter(function (x) { return !usado[x.u.id] && x.prod !== p.prod && x.d < p.d - 4; })[0];
    var lej = b && lejanas.filter(function (l) { return !usado[l.u.id] && l.d > b.d + 4; })[0];
    var opB = b && lej ? { tipo: 'intercambio', p: p, a: b, lej: lej, ahorro: p.r * (p.d - b.d) * mes - costeSalir(b, lej.d) } : null;
    var mejor = opA && (!opB || opA.ahorro >= opB.ahorro) ? opA : opB;
    if (!mejor || mejor.ahorro <= 0) return;
    usado[p.u.id] = usado[mejor.a.u.id] = 1; if (mejor.lej) usado[mejor.lej.u.id] = 1;
    sug.push(mejor);
  });
  sug.sort(function (a, b) { return b.ahorro - a.ahorro; });
  sug = sug.slice(0, 15);
  // Zonas por distancia al despacho (rotación según el producto que ocupa cada posición)
  var zonas = [['A · preferente', 0, corte], ['B · media', corte, q(ds, 0.7)], ['C · fondo', q(ds, 0.7), Infinity]].map(function (z, i) {
    var en = P.filter(function (p) { return i === 0 ? p.d <= z[2] : i === 1 ? p.d > z[1] && p.d <= z[2] : p.d > z[1]; });
    var oc = en.filter(function (p) { return p.x.it; });
    return { nombre: z[0], total: en.length, ocupadas: oc.length, alta: oc.filter(function (p) { return p.r >= rAlta && p.r > 0; }).length, baja: oc.filter(function (p) { return p.r <= rBaja; }).length };
  });
  var actual = Object.keys(prod).reduce(function (s, id) { return s + prod[id].r * prod[id].cara.d * mes; }, 0), ahorro = sug.reduce(function (s, x) { return s + x.ahorro; }, 0);
  return { sug: sug, zonas: zonas, subir: subir.length, bajar: bajar.filter(function (p) { return p.r <= rBaja; }).length, actual: actual, ahorro: ahorro, libres: libres.length, total: P.length, D: D };
}

function nombreDe(p) { return p.x.it ? p.x.it.p.nombre : 'Libre'; }

PINTAR.optimizar = function () {
  var cfg = cfgPicking();
  if (!OPT.res || OPT.res.D !== D) { OPT.res = analizarBodega(); OPT.sel = null; }
  var R = OPT.res;
  if (!R) { $('op-kpis').innerHTML = ''; $('op-sugerencias').innerHTML = '<div class="vacio">La bodega no tiene posiciones configuradas.</div>'; $('op-zonas').innerHTML = ''; return; }
  var horas = R.ahorro / cfg.velocidad;
  $('op-kpis').innerHTML =
    kpi('Ahorro estimado de recorrido', metros(R.ahorro) + '<small style="font-size:13px;font-weight:600"> /mes</small>', R.actual ? pct(R.ahorro / R.actual * 100) + ' del recorrido actual · ' + tiempo(horas) + ' de marcha' : '', R.ahorro ? 'bien' : '') +
    kpi('Rápidos lejos del despacho', num(R.subir), 'Productos de alta rotación fuera de la zona A', R.subir ? 'ojo' : 'bien') +
    kpi('Zona preferente ocupada por lentos', num(R.bajar), 'Posiciones de la zona A con baja rotación', R.bajar ? 'ojo' : 'bien') +
    kpi('Huecos libres', num(R.libres), pct(R.libres / Math.max(1, R.total) * 100) + ' de la bodega');
  var h = '<div class="pk-prop-cab"><div><h3>Sugerencias de reubicación</h3><div class="sub">Ordenadas por ahorro: acercar al despacho lo que más se vende y alejar lo que casi no rota</div></div>' +
    (R.sug.length ? '<button class="btn primario escribe" data-accion="optAplicarTodas">Aplicar todas (' + R.sug.length + ')</button>' : '') + '</div>';
  var L = lotesAbiertos();
  if (L.length && R.sug.length) h += '<div class="aviso-demo" style="margin-top:10px">Hay ' + L.length + (L.length === 1 ? ' lote' : ' lotes') + ' de picking en curso: te recomendamos aplicar las reubicaciones cuando se despachen, para no cambiar sus rutas.</div>';
  h += R.sug.length ? '<div class="op-lista">' + R.sug.map(function (s, i) {
    var sel = OPT.sel === i, rap = s.p;
    var cuerpo = s.tipo === 'mover'
      ? '<div class="op-paso"><span class="op-tag verde">Mover</span><b>' + esc(nombreDe(rap)) + '</b> <span class="tenue">' + esc(rap.x.it.p.sku) + '</span><div class="op-desde">' + esc(rap.u.pos) + ' <i>→</i> ' + esc(s.a.u.pos) + ' <span class="tenue">· ' + metros(rap.d) + ' → ' + metros(s.a.d) + ' del despacho</span></div></div>'
      : '<div class="op-paso"><span class="op-tag ambar">1 · Liberar</span><b>' + esc(nombreDe(s.a)) + '</b> <span class="tenue">baja rotación</span><div class="op-desde">' + esc(s.a.u.pos) + ' <i>→</i> ' + esc(s.lej.u.pos) + ' <span class="tenue">· al fondo</span></div></div>' +
        '<div class="op-paso"><span class="op-tag verde">2 · Acercar</span><b>' + esc(nombreDe(rap)) + '</b> <span class="tenue">alta rotación</span><div class="op-desde">' + esc(rap.u.pos) + ' <i>→</i> ' + esc(s.a.u.pos) + ' <span class="tenue">· ' + metros(rap.d) + ' → ' + metros(s.a.d) + ' del despacho</span></div></div>';
    return '<div class="op-sug' + (sel ? ' sel' : '') + '"><div class="op-num">' + (i + 1) + '</div><div class="op-cuerpo">' + cuerpo + '</div>' +
      '<div class="op-ahorro"><b>−' + metros(s.ahorro) + '</b><small>al mes</small><div class="pk-acc"><button class="btn mini" data-accion="optVer3D" data-id="' + i + '">Ver en 3D</button><button class="btn mini primario escribe" data-accion="optAplicar" data-id="' + i + '">Aplicar</button></div></div></div>';
  }).join('') + '</div>' : '<div class="vacio">La bodega ya está bien ordenada: no hay reubicaciones con ahorro relevante.</div>';
  $('op-sugerencias').innerHTML = h;
  $('op-zonas').innerHTML = '<h3>Zonas de la bodega</h3><div class="sub">Por distancia a pie al despacho (incluye la altura de cada nivel)</div>' +
    R.zonas.map(function (z) {
      var po = z.ocupadas ? z.alta / z.ocupadas * 100 : 0, pb = z.ocupadas ? z.baja / z.ocupadas * 100 : 0;
      return '<div class="fila-barra"><div class="cab"><b>Zona ' + esc(z.nombre) + '</b><span>' + num(z.ocupadas) + ' de ' + num(z.total) + ' ocupadas</span></div>' +
        '<div class="barra" style="height:12px"><i style="width:' + po + '%;background:var(--verde)"></i><i style="width:' + Math.max(0, 100 - po - pb) + '%;background:var(--pista2)"></i><i style="width:' + pb + '%;background:var(--rojo)"></i></div></div>';
    }).join('') +
    '<div class="leyenda"><span><i style="background:var(--verde)"></i>Alta rotación</span><span><i style="background:var(--pista2)"></i>Media</span><span><i style="background:var(--rojo)"></i>Baja</span></div>' +
    '<p class="nota-form" style="margin-top:12px">Lo ideal: la zona A llena de verde y la C con el rojo. El ahorro es una estimación con las ventas de los últimos 90 días; con lotes de picking el recorrido real ya es menor.</p>';
};

/** Movimiento de una sugerencia dibujado en la bodega 3D (origen → destino por los pasillos). */
function rutaMovimiento(G, desde, hasta, color, titulo) {
  var nodo = function (p) { var c = (G.acceso[Number(p.u.y)] || [0]).slice().sort(function (a, b) { return Math.abs(G.corr[a].y - Number(p.u.y)) - Math.abs(G.corr[b].y - Number(p.u.y)); })[0]; return { c: c, x: Number(p.u.x) }; };
  var a = nodo(desde), b = nodo(hasta), it = desde.x.it, uds = Math.max(1, desde.x.stock);
  var parada = function (p, n, txt) { return { x: n.x, cy: G.corr[n.c].y, y: Number(p.u.y), z: Number(p.u.z), pos: p.u.pos, sku: p.u.pos, nombre: txt, uds: uds }; };
  var pts = [[a.x, G.corr[a.c].y]].concat(tramoRuta(G, a, b)), largo = 0;
  for (var i = 1; i < pts.length; i++) largo += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
  return { id: 'opt', titulo: titulo, color: color, metros: largo, metrosBase: 0, puntos: pts, deposito: { x: G.deposito.x, y: G.corr[0].y },
    paradas: [parada(desde, a, 'Sale: ' + (it ? it.p.nombre : '')), parada(hasta, b, 'Nuevo hueco')] };
}
ACCIONES.optVer3D = function (i) {
  var s = OPT.res && OPT.res.sug[Number(i)], G = geometriaBodega(); if (!s || !G) return;
  OPT.sel = Number(i);
  OPT.rutas = s.tipo === 'mover' ? [rutaMovimiento(G, s.p, s.a, '#10B981', 'Sugerencia ' + (Number(i) + 1) + ' · mover')]
    : [rutaMovimiento(G, s.a, s.lej, '#F59E0B', 'Sugerencia ' + (Number(i) + 1) + ' · 1 liberar'), rutaMovimiento(G, s.p, s.a, '#10B981', '2 · acercar')];
  ir3D('opt');
};

function transferencias(s) {
  var t = function (p, destino) { return { tipo: 'movimiento', tipoMov: 'Transferencia', sku: p.x.it.p.sku, cantidad: Math.max(1, p.x.stock), origen: p.u.id, destino: destino.u.id, liberarOrigen: true, responsable: 'Optimización de bodega' }; };
  return s.tipo === 'mover' ? [t(s.p, s.a)] : [t(s.a, s.lej), t(s.p, s.a)];
}
function ejecutar(lista, fin) {
  var hechos = 0, sig = function () {
    if (!lista.length) { fin(hechos); return; }
    servidor('guardarRegistro', lista.shift(), function () { hechos++; sig(); }, function () { fin(hechos); });
  };
  sig();
}
ACCIONES.optAplicar = function (i) {
  var s = OPT.res && OPT.res.sug[Number(i)]; if (!s) return;
  var txt = s.tipo === 'mover' ? 'mover ' + nombreDe(s.p) + ' a ' + s.a.u.pos : 'llevar ' + nombreDe(s.a) + ' al fondo y ' + nombreDe(s.p) + ' a ' + s.a.u.pos;
  if (!confirmar('¿Aplicar la sugerencia ' + (Number(i) + 1) + ': ' + txt + '? Se registran transferencias de ubicación.')) return;
  ejecutar(transferencias(s), function (n) { avisar(n + (n === 1 ? ' transferencia registrada.' : ' transferencias registradas.')); OPT.res = null; cargar(function () { mostrar('optimizar'); }); });
};
ACCIONES.optAplicarTodas = function () {
  var S = (OPT.res && OPT.res.sug) || []; if (!S.length) return;
  if (!confirmar('¿Aplicar las ' + S.length + ' sugerencias? Se registran las transferencias de ubicación en orden.')) return;
  var b = document.querySelector('[data-accion="optAplicarTodas"]'); if (b) { b.disabled = true; b.textContent = 'Aplicando…'; }
  var lista = []; S.forEach(function (s) { lista = lista.concat(transferencias(s)); });
  ejecutar(lista, function (n) { avisar(n + ' transferencias registradas. La bodega quedó reordenada.'); OPT.res = null; cargar(function () { mostrar('optimizar'); }); });
};
