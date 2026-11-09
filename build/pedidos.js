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

/** Colores de ruta por lote abierto (estables mientras el lote esté abierto). */
var COLORES_RUTA = ['#0EA5F0', '#A855F7', '#F97316', '#10B981', '#EC4899', '#EAB308', '#6366F1', '#14B8A6'];
function lotesAbiertos() { return ((D && D.lotes) || []).filter(function (l) { return l.estado === 'Abierto'; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; }); }
function colorLote(id) { var i = lotesAbiertos().map(function (l) { return l.id; }).indexOf(id); return COLORES_RUTA[Math.max(0, i) % COLORES_RUTA.length]; }

/** Datos que necesita la bodega 3D para pintar una ruta: puntos del suelo y, por parada, producto y unidades a retirar. */
function ruta3D(obj, titulo, color, id) {
  var G = geometriaBodega(); if (!G) return null;
  return { id: id || '', titulo: titulo, color: color || COLORES_RUTA[0], metros: obj.metros, metrosBase: obj.metrosBase, puntos: puntosRuta(G, obj.paradas),
    deposito: { x: G.deposito.x, y: G.corr[0].y },
    paradas: obj.paradas.map(function (p) {
      var u = G.porId[p.u] || {}, it = C.porSku[p.sku];
      return { x: Number(p.x), cy: G.corr[p.c].y, y: Number(u.y || 0), z: Number(u.z || 0), pos: p.pos, sku: p.sku,
        nombre: it ? it.p.nombre : p.sku, uds: p.items.reduce(function (s, z) { return s + z.c; }, 0) };
    }) };
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
  $('pk-abiertos').innerHTML = '<div class="pk-prop-cab"><h3>Lotes en curso</h3>' + (abiertos.length && tiene('posiciones') ? '<button class="btn mini" data-accion="todos3d">Ver ' + (abiertos.length > 1 ? 'todos ' : '') + 'en 3D</button>' : '') + '</div>' +
    '<div class="sub">Carros que se están preparando</div>' + (abiertos.map(function (l) {
    var sel = PK.sel && PK.sel.tipo === 'lote' && PK.sel.id === l.id;
    return '<div class="pk-lote' + (sel ? ' sel' : '') + '"><div class="pk-prop-cab"><b><i class="pk-color" style="background:' + colorLote(l.id) + '"></i>' + esc(l.id) + '</b><span class="tenue">' + esc(l.responsable || 'Sin preparador') + ' · ' + esc(l.creado.slice(11)) + '</span></div>' +
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
// Selección de rutas en la bodega 3D: '' (ninguna) · 'todos' (todos los lotes abiertos) · id de un lote · 'prop:n' (lote propuesto)
ESTADO.rutaSel = ''; ESTADO.rutas = [];
function rutasSeleccionadas() {
  var s = ESTADO.rutaSel, r = [];
  if (!s) return r;
  if (s === 'opt') return (typeof OPT !== 'undefined' && OPT.rutas) ? OPT.rutas.slice() : r;
  if (s.indexOf('prop:') === 0) {
    var i = Number(s.slice(5)), o = PK.propuestas && PK.propuestas[i];
    if (o) r.push(ruta3D(o, 'Lote propuesto ' + (i + 1), COLORES_RUTA[0], s));
  } else lotesAbiertos().forEach(function (l) {
    if (s === 'todos' || s === l.id) r.push(ruta3D({ paradas: l.ruta, metros: Number(l.metros), metrosBase: Number(l.metrosBase) }, 'Lote ' + l.id, colorLote(l.id), l.id));
  });
  return r.filter(Boolean);
}
function aplicarRutas(enfocar) {
  ESTADO.rutas = rutasSeleccionadas();
  if (!ESTADO.rutas.length) ESTADO.rutaSel = '';
  ESTADO.rutasD = D;
  BODEGA.ruta(enfocar);
  pintarControlRutas();
}
function pintarControlRutas() {
  var sel = $('b-rutas-sel'), b = $('b-ruta'), L = lotesAbiertos(), s = ESTADO.rutaSel;
  if (sel) {
    sel.innerHTML = !tiene('posiciones') ? '' : '<select class="sel' + (s ? ' activo' : '') + '" id="b-rutas" title="Rutas de picking" aria-label="Rutas de picking">' +
      '<option value="">' + (L.length ? 'Rutas de picking: ninguna' : 'Sin lotes de picking abiertos') + '</option>' +
      (L.length > 1 ? '<option value="todos"' + (s === 'todos' ? ' selected' : '') + '>Todos los lotes abiertos (' + L.length + ')</option>' : '') +
      L.map(function (l) { return '<option value="' + esc(l.id) + '"' + (s === l.id ? ' selected' : '') + '>● ' + esc(l.id) + ' · ' + l.pedidos.length + ' pedidos · ' + l.ruta.length + ' paradas</option>'; }).join('') +
      (s.indexOf('prop:') === 0 ? '<option value="' + esc(s) + '" selected>Lote propuesto ' + (Number(s.slice(5)) + 1) + ' (sin crear)</option>' : '') +
      (s === 'opt' ? '<option value="opt" selected>Sugerencia de reubicación</option>' : '') + '</select>';
  }
  if (!b) return;
  var R = ESTADO.rutas || [];
  if (!R.length) { b.style.display = 'none'; return; }
  b.style.display = '';
  var botones = '<button class="btn mini" data-accion="repetirRuta">Repetir recorrido</button><button class="btn mini" data-accion="volverPicking">' + (ESTADO.rutaSel === 'opt' ? 'Volver a optimizar' : 'Volver al picking') + '</button><button class="btn mini" data-accion="quitarRuta">Quitar ' + (R.length > 1 ? 'rutas' : 'ruta') + '</button>';
  if (R.length === 1) {
    var r = R[0], ah = r.metrosBase > r.metros ? (r.metrosBase - r.metros) / r.metrosBase * 100 : 0;
    b.innerHTML = '<i class="pk-color" style="background:' + r.color + '"></i><b>' + esc(r.titulo) + '</b><span>' + r.paradas.length + ' paradas · ' + num(r.paradas.reduce(function (t, p) { return t + p.uds; }, 0)) + ' uds · ' + metros(r.metros) +
      (ah ? ' · <em>−' + pct(ah) + ' vs pedido a pedido</em>' : '') + '</span>' + botones;
  } else {
    b.innerHTML = '<b>' + R.length + ' lotes en curso</b><span>' + R.reduce(function (t, r) { return t + r.paradas.length; }, 0) + ' paradas · ' + metros(R.reduce(function (t, r) { return t + r.metros; }, 0)) + '</span>' +
      '<span class="pk-leyenda">' + R.map(function (r) { return '<span><i class="pk-color" style="background:' + r.color + '"></i>' + esc(r.id) + '</span>'; }).join('') + '</span>' + botones;
  }
}
var pintarPosicionesBase = PINTAR.posiciones;
PINTAR.posiciones = function () {
  pintarPosicionesBase();
  // Si los datos cambiaron (lote despachado o nuevo), las rutas se recalculan sin mover la cámara
  if (ESTADO.rutasD !== D && ESTADO.rutaSel) aplicarRutas(false); else pintarControlRutas();
};
function ir3D(sel) {
  if (!tiene('posiciones')) { avisar('La bodega 3D está incluida en el plan Profesional.', true); return; }
  ESTADO.rutaSel = sel; ESTADO.pasillo = ''; if (ESTADO.filtro) ESTADO.filtro.pasillo = '';
  mostrar('posiciones'); aplicarRutas(true);
  if (!ESTADO.rutas.length) avisar('No se pudo calcular la ruta.', true);
}
document.addEventListener('change', function (e) { if (e.target && e.target.id === 'b-rutas') { ESTADO.rutaSel = e.target.value; aplicarRutas(true); } });

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
ACCIONES.lote3d = function (id) { if (lotePorId(id)) ir3D(id); };
ACCIONES.todos3d = function () { ir3D(lotesAbiertos().length > 1 ? 'todos' : (lotesAbiertos()[0] || {}).id || ''); };
ACCIONES.prop3d = function (i) { if (PK.propuestas && PK.propuestas[Number(i)]) ir3D('prop:' + Number(i)); };
ACCIONES.quitarRuta = function () { ESTADO.rutaSel = ''; aplicarRutas(false); };
ACCIONES.volverPicking = function () { mostrar(ESTADO.rutaSel === 'opt' ? 'optimizar' : 'picking'); };
ACCIONES.repetirRuta = function () { BODEGA.ruta(false); };

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

/* ---------- Inicio: operación de bodega y picking ---------- */
var pintarInicioBase = PINTAR.inicio;
PINTAR.inicio = function () { pintarInicioBase(); pintarInicioOperacion(); };
function pintarInicioOperacion() {
  if (!$('i-op-kpis')) return;
  var pend = pedidosDe('Pendiente'), prep = pedidosDe('En preparación'), L = lotesAbiertos(), cfg = cfgPicking(), con3d = tiene('posiciones');
  var urg = pend.filter(function (p) { return p.prioridad === 'Urgente'; }), hoy = pedidosDe('Despachado').filter(function (p) { return String(p.despachado).slice(0, 10) === D.hoy; });
  var desde = new Date(C.hoy.getTime() - 30 * 864e5).toISOString().slice(0, 10);
  var rec = (D.lotes || []).filter(function (l) { return l.estado !== 'Cancelado' && l.creado.slice(0, 10) >= desde; });
  var ahM = rec.reduce(function (s, l) { return s + Math.max(0, l.metrosBase - l.metros); }, 0), baseM = rec.reduce(function (s, l) { return s + Number(l.metrosBase); }, 0);
  var total = D.ubicaciones.length, libres = D.ubicaciones.filter(function (u) { return !u.sku; }).length;
  var uds = function (l) { return l.reduce(function (s, p) { return s + unidadesPedido(p); }, 0); };
  $('i-op-kpis').innerHTML =
    (con3d ? kpi('Lotes de picking activos', num(L.length), L.length ? num(prep.length) + ' pedidos en preparación' : 'Ningún carro en curso', L.length ? 'bien' : '') : '') +
    kpi('Pedidos por preparar', num(pend.length), urg.length ? '<span class="mal">' + urg.length + ' urgentes</span> · ' + num(uds(pend)) + ' uds' : num(uds(pend)) + ' unidades', urg.length ? 'ojo' : '') +
    kpi('Despachados hoy', num(hoy.length), num(uds(hoy)) + ' unidades', hoy.length ? 'bien' : '') +
    (con3d ? kpi('Recorrido ahorrado · 30 días', metros(ahM), baseM ? pct(ahM / baseM * 100) + ' menos que pedido a pedido · ' + tiempo(ahM / cfg.velocidad) : 'Crea lotes para medirlo', ahM ? 'bien' : '') : '') +
    kpi('Posiciones libres', num(libres), total ? pct(libres / total * 100) + ' de ' + num(total) + ' posiciones' : '');
  $('i-op-kpis').style.setProperty('--c', con3d ? 5 : 3);
  // Lotes en curso con su avance (paradas marcadas en la lista de picking)
  $('i-lotes').innerHTML = L.length ? L.map(function (l) {
    var h = Object.keys(hechosDe(l.id)).length, n = l.ruta.length || 1, p = Math.round(h / n * 100);
    return '<div class="fila-barra i-lote"><div class="cab"><b><i class="pk-color" style="background:' + colorLote(l.id) + '"></i>' + esc(l.id) + '</b>' +
      '<span>' + l.pedidos.length + ' pedidos · ' + h + '/' + l.ruta.length + ' paradas · ' + esc(l.responsable || 'sin preparador') + '</span></div>' +
      '<div class="barra"><i style="width:' + Math.max(2, p) + '%;background:' + colorLote(l.id) + '"></i></div>' +
      '<div class="pk-acc" style="margin-top:6px"><button class="btn mini" data-accion="verLote" data-id="' + esc(l.id) + '">Lista</button><button class="btn mini" data-accion="lote3d" data-id="' + esc(l.id) + '">Ruta 3D</button></div></div>';
  }).join('') : '<div class="vacio">No hay carros en curso.' + (pend.length ? '<div class="pie-form" style="justify-content:center"><button class="btn mini primario escribe" data-vista="picking">Proponer lotes</button></div>' : '') + '</div>';
  // Pedidos por preparar: urgentes primero
  var cola = pend.slice().sort(function (a, b) { return (b.prioridad === 'Urgente') - (a.prioridad === 'Urgente') || (a.fecha < b.fecha ? -1 : 1); }).slice(0, 6);
  $('i-pedidos').innerHTML = cola.length ? cola.map(function (p) {
    return '<div class="item"><i class="punto" style="background:' + (p.prioridad === 'Urgente' ? COLOR.critico : COLOR.precaucion) + '"></i><div class="x"><b>' + esc(p.cliente) + '</b><span>' + esc(p.id) + ' · ' + p.lineas.length + ' productos' + (p.prioridad === 'Urgente' ? ' · urgente' : '') + '</span></div>' +
      '<div class="y">' + num(unidadesPedido(p)) + ' uds<small>' + fecha(p.fecha) + '</small></div></div>';
  }).join('') + (pend.length > 6 ? '<div class="pie-form" style="justify-content:center"><button class="btn mini" data-vista="pedidos">Ver los ' + pend.length + ' pedidos</button></div>' : '') : '<div class="vacio">No hay pedidos pendientes.</div>';
  // Ocupación por pasillo
  var pas = {}; D.ubicaciones.forEach(function (u) { var x = pas[u.pasillo] = pas[u.pasillo] || { t: 0, o: 0 }; x.t++; if (u.sku) x.o++; });
  $('i-pasillos').innerHTML = Object.keys(pas).sort().map(function (k) {
    var x = pas[k], p = x.o / x.t * 100;
    return '<div class="fila-barra"><div class="cab"><b>Pasillo ' + esc(k) + '</b><span>' + num(x.o) + ' de ' + num(x.t) + ' · ' + pct(p) + '</span></div><div class="barra"><i style="width:' + p + '%;background:' + (p > 92 ? 'var(--rojo)' : p > 80 ? 'var(--ambar)' : 'var(--azul)') + '"></i></div></div>';
  }).join('') || '<div class="vacio">Sin posiciones.</div>';
}
