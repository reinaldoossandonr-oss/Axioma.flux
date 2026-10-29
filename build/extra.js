/* ===================== SAAS: MÓDULOS, ROLES Y AJUSTES (Axioma Flux) ===================== */
var SECCIONES_BASE = JSON.parse(JSON.stringify(SECCIONES));
var MODULOS = { inventario: 'Inventario', posiciones: 'Posiciones', comercial: 'Comercial', finanzas: 'Finanzas' };
var PLANES = [['free', 'Básico', ['inventario']], ['pro', 'Profesional', ['inventario', 'posiciones', 'comercial']], ['enterprise', 'Empresa', ['inventario', 'posiciones', 'comercial', 'finanzas']]];
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
  SECCIONES.comercial.tabs = SECCIONES_BASE.comercial.tabs.filter(function (t) { return tiene('comercial') || (t[0] !== 'embudo' && t[0] !== 'equipo'); });
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
