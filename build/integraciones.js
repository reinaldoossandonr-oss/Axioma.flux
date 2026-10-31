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
