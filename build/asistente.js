/* ===================== ASISTENTE FLUX (IA) =====================
   La pregunta se traduce a una consulta estructurada (tipo + filtros) y esa consulta se ejecuta aquí, en el navegador,
   sobre los datos que el usuario ya puede ver: la IA nunca recibe stock, ventas ni clientes, solo nombres de catálogo y listas.
   1) Con IA: Edge Function "asistente-flux" (Claude) devuelve la consulta.  2) Sin IA: un intérprete local reconoce las
   preguntas habituales. El resultado se muestra en tabla y se puede resaltar en la bodega 3D.                            */
var IA = { abierto: false, mensajes: [], ocupado: false, modo: '' };
var IA_SUGERENCIAS = ['Productos con riesgo de quiebre', 'Pedidos urgentes pendientes', 'Lotes de picking en curso', '¿Qué productos llevan 60 días sin venderse?',
  'Posiciones libres en el pasillo B', 'Productos de baja rotación', 'Top 5 productos más vendidos', 'Resumen de la bodega'];

function iaNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim(); }

/** Lo único que viaja a la IA: listas y nombres del catálogo (sin cantidades ni clientes). */
function iaContexto() {
  return {
    categorias: C.categorias || unicos(D.productos.map(function (p) { return p.categoria; })),
    lineas: unicos(D.productos.map(function (p) { return p.linea; })),
    pasillos: unicos(D.ubicaciones.map(function (u) { return u.pasillo; })),
    canales: D.listas.CANAL || [],
    productos: D.productos.slice(0, 600).map(function (p) { return [p.sku, p.nombre]; }),
    modulos: D.modulos || []
  };
}

/** Intérprete local: reconoce las preguntas habituales sin conexión. */
function iaLocal(pregunta) {
  var t = iaNorm(pregunta), q = { tipo: 'productos' }, m;
  if (/\bpedido/.test(t)) {
    q.tipo = 'pedidos';
    if (/urgente/.test(t)) q.prioridad = 'Urgente';
    if (/pendiente|por preparar|sin preparar/.test(t)) q.estado = 'Pendiente';
    else if (/preparacion|preparando/.test(t)) q.estado = 'En preparación';
    else if (/despachad|enviad/.test(t)) q.estado = 'Despachado';
    m = t.match(/(?:cliente|de|para) ([a-z0-9&][a-z0-9& ]{2,})$/); if (m && !/urgente|pendiente|hoy/.test(m[1])) q.cliente = m[1];
  } else if (/\blote|\bruta|picking|carro/.test(t)) q.tipo = 'lotes';
  else if (/(posicion|ubicacion|hueco|espacio|lugar)/.test(t) && /(libre|vaci|disponible|desocupad)/.test(t)) { q.tipo = 'posiciones'; q.ocupacion = 'libres'; }
  else if (/resumen|como (va|esta) (la bodega|el inventario|todo)|estado general/.test(t)) q.tipo = 'resumen';
  if (q.tipo === 'productos' || q.tipo === 'posiciones') {
    if (/sin (vender|venta|ventas|movimiento|moverse|rotar|salida)|no (se )?(han )?(vend|mov)|parad|inmovil|muert/.test(t)) {
      m = t.match(/(\d+)\s*(dias|dia|semanas|meses|mes)/); var n = m ? Number(m[1]) * (/seman/.test(m[2]) ? 7 : /mes/.test(m[2]) ? 30 : 1) : 60; q.sinVentasDias = n;
    }
    if (/baja rotacion|no rotan|poca rotacion|lento|menos vendid|peor/.test(t)) q.rotacion = 'Baja';
    else if (/alta rotacion|mas vendid|estrella|top|mejor|mas salida/.test(t)) { q.orden = 'ventas_desc'; if (/alta rotacion/.test(t)) q.rotacion = 'Alta'; }
    else if (/rotacion media/.test(t)) q.rotacion = 'Media';
    if (/critic/.test(t)) q.alerta = 'critico'; else if (/quiebre|agot|sin stock|reponer|falta|riesgo|se acaba/.test(t)) q.alerta = 'riesgo';
    if (/mas stock|mayor stock|sobre ?stock|exceso/.test(t)) q.orden = 'stock_desc';
    if (/mas valor|valor/.test(t) && !q.orden) q.orden = 'valor_desc';
    m = t.match(/menos de (\d+) (unidades|uds|u\b)/); if (m) q.stockMax = Number(m[1]) - 1;
    m = t.match(/mas de (\d+) (unidades|uds|u\b)/); if (m) q.stockMin = Number(m[1]) + 1;
    m = t.match(/pasillo ([a-z])\b/); if (m) q.pasillo = m[1].toUpperCase();
    if (/ocupad/.test(t) && q.tipo === 'posiciones') q.ocupacion = 'ocupadas';
    (C.categorias || []).forEach(function (c) { var k = iaNorm(c); if (k && (t.indexOf(k) > -1 || t.indexOf(k.split(' ')[0]) > -1 && k.split(' ')[0].length > 5)) q.categoria = c; });
    // Producto concreto: por SKU o por las palabras de su nombre
    var mejor = null, pm = 0;
    D.productos.forEach(function (p) {
      if (t.indexOf(iaNorm(p.sku)) > -1) { mejor = p; pm = 99; return; }
      var pal = iaNorm(p.nombre).split(' ').filter(function (w) { return w.length > 3; }), hit = pal.filter(function (w) { return t.indexOf(w) > -1; }).length;
      if (hit > pm) { pm = hit; mejor = p; }
    });
    if (mejor && pm >= 1 && /donde|ubica|stock|cuant|tengo|hay|esta|busca|encuentra/.test(t)) q.texto = pm === 99 ? mejor.sku : mejor.nombre;
    else if (!q.categoria && !q.alerta && !q.rotacion && !q.sinVentasDias && !q.orden && !q.pasillo && q.tipo === 'productos') {
      m = t.match(/(?:donde (?:esta|estan|hay|tengo)|busca|encuentra|ubicacion de) (?:el |la |los |las |un |una )?(.+)$/);
      if (m) q.texto = m[1];
    }
  }
  m = t.match(/\b(?:top|los|las|primeros|primeras) (\d{1,3})\b/); if (m) q.limite = Number(m[1]);
  return q;
}

/** Último día con venta o salida de cada producto (para «sin venderse en N días»). */
function iaUltimas() {
  if (IA.ultD === D) return IA.ult;
  var u = {};
  D.ventas.forEach(function (v) { var it = C.porId[v[2]]; if (it && (!u[it.p.id] || v[1] > u[it.p.id])) u[it.p.id] = v[1]; });
  D.movimientos.forEach(function (m) { if (m[2] !== 'Salida Venta') return; var it = C.porSku[m[3]]; if (it && (!u[it.p.id] || m[1].slice(0, 10) > u[it.p.id])) u[it.p.id] = m[1].slice(0, 10); });
  IA.ultD = D; IA.ult = u; return u;
}

/** Ejecuta la consulta sobre los datos del usuario. */
function iaEjecutar(q) {
  q = q || {}; var lim = Math.max(1, Math.min(200, Number(q.limite) || 200)), r = { q: q, filas: [], ids: [], total: 0 };
  var tx = iaNorm(q.texto), cat = q.categoria && iaNorm(q.categoria), lin = q.linea && iaNorm(q.linea);
  var pasaItem = function (it) {
    if (tx && iaNorm(it.p.sku + ' ' + it.p.nombre).indexOf(tx) === -1 && !tx.split(' ').filter(function (w) { return w.length > 3; }).every(function (w) { return iaNorm(it.p.nombre).indexOf(w) > -1; })) return false;
    if (cat && iaNorm(it.p.categoria) !== cat) return false;
    if (lin && iaNorm(it.p.linea) !== lin) return false;
    if (q.rotacion && it.rot !== q.rotacion) return false;
    if (q.alerta === 'riesgo' ? (it.alerta !== 'critico' && it.alerta !== 'precaucion') : q.alerta && it.alerta !== q.alerta) return false;
    if (q.stockMin != null && it.stock < q.stockMin) return false;
    if (q.stockMax != null && it.stock > q.stockMax) return false;
    if (q.sinVentasDias) { var ul = iaUltimas()[it.p.id]; if (ul && diasDesde(ul) < q.sinVentasDias) return false; }
    if (q.pasillo && !it.ubis.some(function (id) { return C.ubi[id].u.pasillo === q.pasillo; })) return false;
    return true;
  };
  if (q.tipo === 'pedidos') {
    var cli = iaNorm(q.cliente);
    var l = (D.pedidos || []).filter(function (p) {
      if (q.estado ? p.estado !== q.estado : p.estado === 'Anulado') return false;
      if (q.prioridad && p.prioridad !== q.prioridad) return false;
      if (cli && iaNorm(p.cliente).indexOf(cli) === -1) return false;
      if (tx && !p.lineas.some(function (x) { var it = C.porId[x[1]]; return it && iaNorm(it.p.sku + ' ' + it.p.nombre).indexOf(tx) > -1; })) return false;
      return true;
    }).sort(function (a, b) { return (b.prioridad === 'Urgente') - (a.prioridad === 'Urgente') || (a.fecha < b.fecha ? -1 : 1); });
    r.total = Math.min(l.length, lim); r.cols = ['Pedido', 'Cliente', 'Prioridad', 'Uds', 'Estado'];
    r.filas = l.slice(0, lim).map(function (p) { return [p.id, p.cliente, p.prioridad, num(unidadesPedido(p)), p.estado]; });
    r.pedidos = true;
  } else if (q.tipo === 'lotes') {
    var L = (D.lotes || []).filter(function (x) { return x.estado === 'Abierto'; });
    r.total = L.length; r.cols = ['Lote', 'Pedidos', 'Paradas', 'Recorrido'];
    r.filas = L.map(function (x) { return [x.id, x.pedidos.length, x.ruta.length, metros(x.metros)]; }); r.lotes = true;
  } else if (q.tipo === 'posiciones') {
    var U = D.ubicaciones.filter(function (u) {
      var x = C.ubi[u.id];
      if (q.ocupacion === 'libres' && x.it) return false;
      if (q.ocupacion === 'ocupadas' && !x.it) return false;
      if (q.pasillo && u.pasillo !== q.pasillo) return false;
      if ((tx || cat || lin || q.rotacion || q.alerta || q.sinVentasDias) && (!x.it || !pasaItem(x.it))) return false;
      return true;
    });
    r.total = U.length; r.cols = ['Posición', 'Producto', 'Uds'];
    r.filas = U.slice(0, lim).map(function (u) { var x = C.ubi[u.id]; return [u.pos, x.it ? x.it.p.nombre : 'Libre', x.it ? num(x.stock) : '—']; });
    r.ids = U.map(function (u) { return u.id; });
  } else if (q.tipo === 'resumen') {
    var crit = C.items.filter(function (it) { return it.alerta === 'critico'; }).length, ocup = D.ubicaciones.filter(function (u) { return u.sku; }).length;
    r.cols = ['Indicador', 'Valor'];
    r.filas = [['Productos en catálogo', num(D.productos.length)], ['Unidades en stock', num(C.items.reduce(function (s, it) { return s + Math.max(0, it.stock); }, 0))],
      ['Valor del inventario', euros(C.items.reduce(function (s, it) { return s + it.valor; }, 0))], ['Quiebres críticos', num(crit)],
      ['Ocupación de bodega', pct(ocup / Math.max(1, D.ubicaciones.length) * 100)], ['Pedidos pendientes', num(pedidosDe('Pendiente').length)]];
    r.total = r.filas.length;
  } else {
    var I = C.items.filter(pasaItem), ul = iaUltimas(), o = q.orden;
    I.sort(function (a, b) {
      return o === 'stock_desc' ? b.stock - a.stock : o === 'stock_asc' ? a.stock - b.stock : o === 'ventas_desc' ? b.v90 - a.v90 : o === 'ventas_asc' ? a.v90 - b.v90 :
        o === 'valor_desc' ? b.valor - a.valor : q.alerta ? (a.dias == null ? 1e9 : a.dias) - (b.dias == null ? 1e9 : b.dias) : q.sinVentasDias ? String(ul[a.p.id] || '').localeCompare(String(ul[b.p.id] || '')) : a.p.nombre.localeCompare(b.p.nombre);
    });
    r.total = Math.min(I.length, lim);
    r.cols = ['Producto', 'Stock', q.sinVentasDias ? 'Última venta' : 'Días de stock', 'Posiciones'];
    r.filas = I.slice(0, lim).map(function (it) {
      var pos = it.ubis.map(function (id) { return C.ubi[id].u.pos; });
      return [it.p.nombre + ' · ' + it.p.sku, num(it.stock), q.sinVentasDias ? (ul[it.p.id] ? fecha(ul[it.p.id]) : 'Sin ventas') : it.dias == null ? '—' : num(it.dias), pos.length ? pos.slice(0, 3).join(', ') + (pos.length > 3 ? ' +' + (pos.length - 3) : '') : 'Sin ubicar'];
    });
    I.slice(0, lim).forEach(function (it) { r.ids = r.ids.concat(it.ubis.filter(function (id) { return !q.pasillo || C.ubi[id].u.pasillo === q.pasillo; })); });
  }
  return r;
}

function iaTextoResultado(r) {
  var q = r.q, n = r.total;
  if (q.tipo === 'resumen') return 'Este es el estado general de la bodega:';
  if (!n) return q.texto ? 'No encontré «' + q.texto + '» en tu catálogo. Revisa el nombre o el SKU, o prueba con una de las sugerencias.' :
    q.tipo === 'pedidos' ? 'Ahora mismo no hay pedidos que cumplan esa condición.' : q.tipo === 'lotes' ? 'No hay lotes de picking en curso. Puedes proponerlos en Pedidos › Picking y rutas.' :
    'Ahora mismo no hay resultados para esa condición. Prueba con otras palabras o con una de las sugerencias.';
  var que = q.tipo === 'pedidos' ? (n === 1 ? 'pedido' : 'pedidos') : q.tipo === 'lotes' ? (n === 1 ? 'lote en curso' : 'lotes en curso') : q.tipo === 'posiciones' ? (n === 1 ? 'posición' : 'posiciones') : (n === 1 ? 'producto' : 'productos');
  return (q.limite && n <= q.limite ? 'Estos son los ' + num(n) + ' ' : 'Encontré ' + num(n) + ' ') + que + (r.ids.length && q.tipo !== 'posiciones' ? ' en ' + num(r.ids.length) + ' posiciones de la bodega' : '') + '.';
}

/* ---------- Interfaz ---------- */
function iaPintar() {
  var p = $('ia-panel'); if (!p) return;
  document.body.classList.toggle('ia-abierto', IA.abierto);
  $('ia-modo').textContent = IA.modo === 'ia' ? 'IA · Claude' : IA.modo === 'basico' ? 'Modo básico' : 'IA';
  $('ia-modo').className = 'ia-modo' + (IA.modo === 'basico' ? ' basico' : '');
  var h = IA.mensajes.length ? '' : '<div class="ia-hola"><div class="ia-logo">✦</div><b>Pregúntale a tu bodega</b><p>Escribe como hablarías con tu jefe de almacén. Los resultados se pueden ver resaltados en la bodega 3D.</p></div>';
  h += IA.mensajes.map(function (m, i) {
    if (m.de === 'yo') return '<div class="ia-msg yo">' + esc(m.texto) + '</div>';
    var r = m.r, t = '<div class="ia-msg flux"><p>' + esc(m.texto) + '</p>';
    if (r && r.filas.length) {
      t += '<div class="ia-tabla"><table><tr>' + r.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>' +
        r.filas.slice(0, 8).map(function (f) { return '<tr>' + f.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' +
        (r.filas.length > 8 ? '<div class="ia-mas">y ' + num(r.total - 8) + ' más</div>' : '');
    }
    if (r) {
      t += '<div class="ia-acc">';
      if (r.ids.length && tiene('posiciones')) t += '<button class="btn mini primario" data-accion="iaVer3D" data-id="' + i + '">Ver en la bodega 3D · ' + num(r.ids.length) + '</button>';
      if (r.pedidos && r.total) t += '<button class="btn mini" data-accion="iaVerPedidos" data-id="' + i + '">Abrir pedidos</button>';
      if (r.lotes && r.total) t += '<button class="btn mini" data-accion="todos3d">Ver rutas en 3D</button>';
      t += '</div>';
    }
    return t + (m.modo ? '<div class="ia-fuente">' + (m.modo === 'ia' ? 'Interpretado con IA' : 'Interpretado en modo básico') + '</div>' : '') + '</div>';
  }).join('');
  if (IA.ocupado) h += '<div class="ia-msg flux ia-pensando"><i></i><i></i><i></i></div>';
  $('ia-mensajes').innerHTML = h;
  $('ia-sugerencias').className = IA.mensajes.length ? 'compacto' : '';
  $('ia-sugerencias').innerHTML = IA_SUGERENCIAS.map(function (s) { return '<button type="button" class="ia-sug" data-ia="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
  var c = $('ia-mensajes'); c.scrollTop = c.scrollHeight;
}

function iaPreguntar(texto) {
  texto = String(texto || '').trim(); if (!texto || IA.ocupado || !D) return;
  IA.mensajes.push({ de: 'yo', texto: texto }); IA.ocupado = true; iaPintar();
  var listo = false, responder = function (q, modo) {
    if (listo) return; listo = true; IA.ocupado = false; IA.modo = modo;
    var r = iaEjecutar(q), intro = q && q.respuesta ? String(q.respuesta).trim() : '';
    IA.mensajes.push({ de: 'flux', texto: (intro ? intro.replace(/\s*$/, '') + ' ' : '') + iaTextoResultado(r), r: r, modo: modo });
    iaPintar();
  };
  // Si la IA no responde en 9 s (o no está configurada), contesta el intérprete local
  var reloj = setTimeout(function () { responder(iaLocal(texto), 'basico'); }, 9000);
  try {
    google.script.run.withSuccessHandler(function (res) {
      clearTimeout(reloj);
      if (res && res.ok && res.consulta && res.consulta.tipo) responder(res.consulta, 'ia'); else responder(iaLocal(texto), 'basico');
    }).withFailureHandler(function () { clearTimeout(reloj); responder(iaLocal(texto), 'basico'); }).asistente({ pregunta: texto, contexto: iaContexto() });
  } catch (e) { clearTimeout(reloj); responder(iaLocal(texto), 'basico'); }
}

ACCIONES.abrirAsistente = function () { IA.abierto = true; iaPintar(); setTimeout(function () { var i = $('ia-texto'); if (i) i.focus(); }, 250); };
ACCIONES.cerrarAsistente = function () { IA.abierto = false; iaPintar(); };
ACCIONES.iaVer3D = function (i) {
  var m = IA.mensajes[Number(i)]; if (!m || !m.r || !m.r.ids.length) return;
  var mapa = {}; m.r.ids.forEach(function (id) { mapa[id] = 1; });
  ESTADO.resaltar = mapa; ESTADO.resaltarTxt = IA.mensajes[Number(i) - 1] ? IA.mensajes[Number(i) - 1].texto : '';
  ESTADO.filtro = { categoria: '', rotacion: '', disp: '', pasillo: '' }; ESTADO.pasillo = '';
  IA.abierto = false; iaPintar();
  mostrar('posiciones'); BODEGA.actualizar(); pintar();
  // Encuadra la zona resaltada
  var xs = [], zs = []; m.r.ids.forEach(function (id) { var u = C.ubi[id] && C.ubi[id].u; if (u) { xs.push(Number(u.x)); zs.push(Number(u.y)); } });
  if (xs.length && BODEGA.fijarVista) {
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), z0 = Math.min.apply(null, zs), z1 = Math.max.apply(null, zs), ext = Math.max(x1 - x0, (z1 - z0) * 1.3);
    BODEGA.fijarVista({ tx: (x0 + x1) / 2, ty: 1.6, tz: (z0 + z1) / 2, radio: Math.max(12, ext * 1.1 + 9), theta: 0.45, phi: 0.95 });
  }
  avisar('Resaltadas ' + num(m.r.ids.length) + ' posiciones · «Quitar filtros» vuelve a mostrar toda la bodega.');
};
ACCIONES.iaVerPedidos = function (i) {
  var m = IA.mensajes[Number(i)]; IA.abierto = false; iaPintar(); mostrar('pedidos');
  var q = m && m.r && m.r.q; if (q && $('pe-estado')) { $('pe-estado').value = q.estado || 'activos'; $('pe-buscar').value = q.cliente || q.texto || ''; pintar(); }
};

function enlazarAsistente() {
  $('ia-form').addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); var i = $('ia-texto'); iaPreguntar(i.value); i.value = ''; }, true);
  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('[data-ia]'); if (s) { iaPreguntar(s.getAttribute('data-ia')); return; }
    if (IA.abierto && e.target.id === 'ia-fondo') ACCIONES.cerrarAsistente();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && IA.abierto) ACCIONES.cerrarAsistente();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); IA.abierto ? ACCIONES.cerrarAsistente() : ACCIONES.abrirAsistente(); }
  });
  iaPintar();
}
