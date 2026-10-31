"""Convierte el App.html de Apps Script en el panel de Axioma Flux (Next.js + Supabase).

Genera:
  frontend/src/app/app/panel.css      estilos originales + reglas de módulos/roles/ajustes
  frontend/src/app/app/markup.ts      HTML del cuerpo (sin portada ni scripts)
  frontend/src/app/portada.css        estilos de la portada (ruta /)
  frontend/src/app/marca.ts           símbolo SVG del logo
  frontend/public/panel/panel.js      JavaScript original + capa SaaS
Cada reemplazo debe aparecer exactamente las veces indicadas; si no, el script se detiene.
"""
import json, re, sys, pathlib

ORIGEN = pathlib.Path(sys.argv[1])
EXTRA = pathlib.Path(sys.argv[2])
FRONT = pathlib.Path(sys.argv[3])
html = ORIGEN.read_text(encoding="utf-8")


def cambiar(texto, viejo, nuevo, veces=1):
    n = texto.count(viejo)
    if n != veces:
        sys.exit(f"ERROR: se esperaban {veces} apariciones y hay {n}:\n{viejo[:160]}")
    return texto.replace(viejo, nuevo)


css = html.split("<style>", 1)[1].split("</style>", 1)[0]
cuerpo = html.split('<body class="claro" data-modo="<?= modo ?>">', 1)[1].split("<script", 1)[0]
js = html.split("<script>\n/* ===================== ESTADO", 1)[1].rsplit("</script>", 1)[0]
js = "/* ===================== ESTADO" + js

# ---------------- Logo (symbol) ----------------
svg_defs = re.search(r'<svg width="0" height="0".*?</svg>', cuerpo, re.S).group(0)

# ---------------- Portada (va a la ruta /) ----------------
portada_css = "\n".join(l for l in css.splitlines() if l.startswith(("#portada", ".p-", "@media(max-width:760px){.p-capa")))
portada_html = re.search(r'<div id="portada".*?\n</div>\n', cuerpo, re.S).group(0)
cuerpo = cambiar(cuerpo, portada_html, "")

# ---------------- Marcado del panel ----------------
cuerpo = cambiar(cuerpo, '<div id="cargando" style="display:none">', '<div id="cargando">')
cuerpo = cambiar(cuerpo, "Cargando la bodega…", "Cargando…")
cuerpo = cambiar(cuerpo, '<button data-vista="posiciones">', '<button data-vista="posiciones" data-modulo="posiciones">')
cuerpo = cambiar(cuerpo, '<button data-vista="finanzas">', '<button data-vista="finanzas" data-modulo="finanzas">')
cuerpo = cambiar(cuerpo, '    <div class="hueco"></div>\n',
    '    <div class="hueco"></div>\n'
    '    <button data-vista="cuenta"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>Ajustes</button>\n')
cuerpo = cambiar(cuerpo, '<div class="menu">', '<button class="btn btn-tema" id="btn-tema" data-accion="tema" title="Cambiar a modo oscuro" aria-label="Cambiar entre modo claro y oscuro">'
    '<svg class="ico-luna" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>'
    '<svg class="ico-sol" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg></button>\n      <div class="menu">')
cuerpo = cambiar(cuerpo, "      </div>\n    </header>", '      </div>\n      <div class="quien" id="quien"></div>\n    </header>')
for v in ["f-lead", "f-contacto", "f-meta"]:
    cuerpo = cambiar(cuerpo, f'<button data-vista="{v}">', f'<button data-vista="{v}" data-modulo="comercial">')
cuerpo = cambiar(cuerpo, "<small>Finanzas</small>", '<small data-modulo="finanzas">Finanzas</small>')
for v in ["f-factura", "f-pago", "f-gasto"]:
    cuerpo = cambiar(cuerpo, f'<button data-vista="{v}">', f'<button data-vista="{v}" data-modulo="finanzas">')
# Inicio: la tarjeta de facturas depende de Finanzas y la fila comercial de Comercial
cuerpo = cambiar(cuerpo, '<div class="rejilla" style="--c:3">\n          <div class="t"><h3>Quiebres que vienen</h3><div class="sub">Productos con menos días de stock</div>',
                 '<div class="rejilla" style="--c:3" data-ajustar>\n          <div class="t"><h3>Quiebres que vienen</h3><div class="sub">Productos con menos días de stock</div>')
cuerpo = cambiar(cuerpo, '<div class="t"><h3>Facturas por vencer</h3>', '<div class="t" data-modulo="finanzas"><h3>Facturas por vencer</h3>')
cuerpo = cambiar(cuerpo, '<div class="rejilla" style="--c:3">\n          <div class="t"><h3>Embudo comercial</h3>',
                 '<div class="rejilla" style="--c:3" data-modulo="comercial">\n          <div class="t"><h3>Embudo comercial</h3>')

VISTAS_NUEVAS = '''
      <!-- AJUSTES (SaaS) -->
      <section class="vista" id="v-cuenta">
        <div class="rejilla" style="--c:2">
          <div class="t"><h3>Tu cuenta</h3><div class="sub">Usuario, empresa y plan</div><div id="cu-datos"></div>
            <div class="pie-form"><button class="btn" data-accion="salir">Cerrar sesión</button></div></div>
          <form class="t" data-propio="password" novalidate><h3>Cambiar contraseña</h3><div class="sub">Mínimo 8 caracteres.</div>
            <div class="campos"><div class="campo"><label for="cu-p1">Nueva contraseña *</label><input type="password" id="cu-p1" autocomplete="new-password"></div>
            <div class="campo"><label for="cu-p2">Repite la contraseña *</label><input type="password" id="cu-p2" autocomplete="new-password"></div></div>
            <div class="pie-form"><button class="btn primario" type="submit">Cambiar contraseña</button></div></form>
        </div>
      </section>
      <section class="vista" id="v-empresa">
        <form id="form-empresa" data-propio="empresa" novalidate>
          <div class="rejilla" style="--c:3">
            <div class="t"><h3>Plan</h3><div class="sub">Lo que incluye tu suscripción</div><div id="em-plan"></div></div>
            <div class="t" style="grid-column:span 2"><h3>Empresa</h3><div class="sub">Nombre, moneda, zona horaria e impuestos</div><div id="em-general"></div></div>
          </div>
          <div class="rejilla" style="--c:3">
            <div class="t"><h3>Inventario y comercial</h3><div class="sub">Umbrales de quiebre, rotación y seguimiento</div><div id="em-inventario"></div></div>
            <div class="t"><h3>Finanzas</h3><div class="sub">Flujo de caja</div><div id="em-finanzas"></div></div>
            <div class="t"><h3>Bodega</h3><div class="sub">Tamaño del maestro de ubicaciones</div><div id="em-bodega"></div></div>
          </div>
          <div class="t" style="margin-bottom:14px"><h3>Listas desplegables</h3><div class="sub">Las opciones que aparecen en los formularios. Las etapas del embudo y los tipos de movimiento son fijos.</div><div id="em-listas"></div></div>
          <div class="pie-form"><button class="btn primario" type="submit">Guardar ajustes</button><button class="btn" type="button" data-vista="empresa">Deshacer cambios</button></div>
        </form>
      </section>
      <section class="vista" id="v-usuarios">
        <div class="filtros"><span class="cuenta" id="us-cuenta"></span></div>
        <div class="rejilla" style="--c:3">
          <div class="t" style="grid-column:span 2"><h3>Usuarios de la empresa</h3><div class="sub">Cada usuario solo ve los datos de esta empresa</div><div class="tabla-caja"><table id="us-tabla"></table></div></div>
          <div>
            <form class="t" data-propio="usuario" novalidate style="margin-bottom:14px"><h3>Nuevo usuario</h3><div class="sub">Comparte con la persona su contraseña inicial; podrá cambiarla en Ajustes › Mi cuenta.</div>
              <div class="campos" style="grid-template-columns:1fr">
                <div class="campo"><label for="nu-nombre">Nombre *</label><input id="nu-nombre"></div>
                <div class="campo"><label for="nu-email">Email *</label><input id="nu-email" type="email" autocomplete="off"></div>
                <div class="campo"><label for="nu-pass">Contraseña inicial *</label><input id="nu-pass" type="text" autocomplete="off"></div>
                <div class="campo"><label for="nu-rol">Rol</label><select id="nu-rol"><option value="operador">Operador</option><option value="viewer">Solo lectura</option><option value="admin">Administrador</option></select></div>
              </div><div class="pie-form"><button class="btn primario" type="submit">Crear usuario</button></div></form>
            <div class="t"><h3>Qué puede hacer cada rol</h3>
              <div class="dato" style="border-top:0"><span>Administrador</span><b>Todo, más ajustes y usuarios</b></div>
              <div class="dato"><span>Operador</span><b>Registrar y editar datos</b></div>
              <div class="dato"><span>Solo lectura</span><b>Ver paneles e informes</b></div></div>
          </div>
        </div>
      </section>
      <section class="vista" id="v-integraciones">
        <div class="t int-cab"><div><h3>Integraciones</h3><div class="sub">Conecta Flux con tu ERP o WMS. Hoy entra todo lo que tu sistema exporte en CSV o Excel; los conectores directos llegan por fases.</div></div>
          <div class="int-con" id="in-conectores"></div></div>
        <div class="rejilla" style="--c:3">
          <div class="t" id="in-fuentes"></div>
          <div class="t" id="in-importar" style="grid-column:span 2"></div>
        </div>
        <div class="t" id="in-equivalencias" style="margin-bottom:14px"></div>
        <div class="t"><h3>Historial de sincronizaciones</h3><div class="sub">Las últimas 40 importaciones de la empresa: qué entró, qué falló y cuándo</div><div class="tabla-caja" style="max-height:380px"><table id="in-historial"></table></div></div>
      </section>
      <section class="vista" id="v-admin">
        <div class="rejilla kpis" id="ad-kpis"></div>
        <div class="t" style="margin-bottom:14px"><h3>Empresas clientes</h3><div class="sub">Plan, módulos y estado de cada empresa. Los datos de cada una están aislados por seguridad a nivel de fila.</div><div class="tabla-caja" style="max-height:420px"><table id="ad-tabla"></table></div></div>
        <div class="rejilla" style="--c:2">
          <div class="t" id="ad-detalle"></div>
          <form class="t" data-propio="empresaNueva" novalidate style="align-self:start"><h3>Nueva empresa</h3><div class="sub">Se crea con su primer administrador, la bodega y las coberturas iniciales.</div>
            <div class="campos">
              <div class="campo"><label for="ne-nombre">Nombre de la empresa *</label><input id="ne-nombre"></div>
              <div class="campo"><label for="ne-ruc">RUT / NIF</label><input id="ne-ruc"></div>
              <div class="campo"><label for="ne-plan">Plan</label><select id="ne-plan"><option value="free">Básico · Inventario</option><option value="pro" selected>Profesional · + Posiciones y Comercial</option><option value="enterprise">Empresa · todos los módulos</option></select></div>
              <div class="campo"><label for="ne-admin">Nombre del administrador</label><input id="ne-admin"></div>
              <div class="campo"><label for="ne-email">Email del administrador *</label><input id="ne-email" type="email" autocomplete="off"></div>
              <div class="campo"><label for="ne-pass">Contraseña inicial *</label><input id="ne-pass" type="text" autocomplete="off"></div>
            </div><div class="pie-form"><button class="btn primario" type="submit">Crear empresa</button></div></form>
        </div>
      </section>
'''
cuerpo = cambiar(cuerpo, '<div class="seg" id="b-pasillos"></div>', '<div class="filtro3d" id="b-filtros"></div><div class="filtro3d" id="b-rutas-sel"></div>')
cuerpo = cambiar(cuerpo, '<div class="leyenda" id="u-leyenda"></div>', '<div class="filtro3d" id="u-filtros"></div><div class="leyenda" id="u-leyenda"></div>')
cuerpo = cambiar(cuerpo, '      <div id="formularios"></div>', VISTAS_NUEVAS + '      <div id="formularios"></div>')

# ---------------- CSS ----------------
css_panel = "\n".join(l for l in css.splitlines() if not l.startswith(("#portada", ".p-", "@media(max-width:760px){.p-capa")))
css_panel += '''
/* ---- Axioma Flux · SaaS ---- */
.quien{display:flex;flex-direction:column;align-items:flex-end;line-height:1.25;max-width:230px;flex:none}
.quien b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}
.quien small{color:var(--suave);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}
.casillas{display:flex;flex-wrap:wrap;gap:8px 18px;padding-top:4px}
.casillas label{display:flex;gap:7px;align-items:center;font-size:13px;color:var(--texto);font-weight:500}
.casillas input{width:auto!important;margin:0}
.filtro3d{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.filtro3d .sel{padding:6px 9px;font-size:12.5px;font-weight:600;box-shadow:0 1px 2px rgba(15,27,45,.08)}
.filtro3d .sel.activo{border-color:var(--azul);color:var(--azul);background:rgba(14,165,240,.08)}
.celda.oculta{visibility:hidden}
.campo textarea{font:inherit;color:inherit;resize:vertical;min-height:120px}
#form-empresa .campos{grid-template-columns:repeat(2,minmax(0,1fr))}
#em-listas .campos{grid-template-columns:repeat(4,minmax(0,1fr))}
#cargando-txt{text-align:center;max-width:420px}
body:not(.m-comercial) [data-modulo~="comercial"],body:not(.m-finanzas) [data-modulo~="finanzas"],body:not(.m-posiciones) [data-modulo~="posiciones"]{display:none!important}
body.solo-lectura .menu,body.solo-lectura #formularios,body.solo-lectura [data-vista^="f-"],body.solo-lectura .lead .l4,
body.solo-lectura [data-accion="liquidar"],body.solo-lectura [data-accion="abonar"],body.solo-lectura #b-panel .pie-form,body.solo-lectura #b-panel .campo,
body.solo-lectura #r-guardar,body.solo-lectura #r-deshacer{display:none!important}
.btn-tema{width:38px;height:38px;padding:0;display:grid;place-items:center;flex:none;margin-left:auto}
.btn-tema svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
body.claro .btn-tema .ico-sol,body:not(.claro) .btn-tema .ico-luna{display:none}
.int-cab{margin-bottom:14px}
.int-con{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:4px}
.int-con .c{border:1px solid var(--linea);border-radius:11px;padding:10px 12px;background:var(--tarjeta2);display:flex;flex-direction:column;align-items:flex-start}
.int-con .c b{font-size:13px}.int-con .c p{margin:4px 0 8px;font-size:12px;color:var(--suave);line-height:1.35;flex:1}
.int-fuente{flex-wrap:wrap}.int-fuente.sel .x b{color:var(--azul)}
.int-acc{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}
.btn.peligro{border-color:var(--rojo);color:var(--rojo)}
.int-fila{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.int-fila>label{font-size:12px;font-weight:600;color:var(--suave)}
.int-ent{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.int-ent button{text-align:left;border:1px solid var(--linea);background:var(--tarjeta);border-radius:10px;padding:9px 11px;cursor:pointer;color:var(--texto);font:inherit}
.int-ent button:hover{border-color:var(--azul)}
.int-ent button.activo{border-color:var(--azul);box-shadow:0 0 0 2px rgba(14,165,240,.2);background:rgba(14,165,240,.06)}
.int-ent button b{display:block;font-size:13px}.int-ent button span{font-size:11.5px;color:var(--suave)}
.int-zona{display:block;border:1.5px dashed var(--linea);border-radius:12px;padding:18px;text-align:center;color:var(--suave);cursor:pointer;margin:14px 0;font-size:13px;line-height:1.6;transition:border-color .15s,background .15s}
.int-zona:hover,.int-zona.sobre{border-color:var(--azul);background:rgba(14,165,240,.06)}
.int-zona b{color:var(--texto)}.int-zona span{font-size:12px}
.int-mapa{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 14px;margin:0 0 16px}
.int-mapa label{display:block;font-size:12px;font-weight:600;color:var(--suave);margin-bottom:4px}
.int-mapa select{width:100%}
.int-barra{height:9px;border-radius:6px;background:var(--tarjeta2);border:1px solid var(--linea);overflow:hidden;margin:10px 0 6px}
.int-barra i{display:block;height:100%;background:var(--azul);transition:width .3s}
.int-res{border-top:1px solid var(--linea);margin-top:6px;padding-top:12px}
td.mal{color:var(--rojo);font-weight:600;background:rgba(248,113,113,.08)}
@media(max-width:1100px){.int-con{grid-template-columns:repeat(2,minmax(0,1fr))}.int-ent,.int-mapa{grid-template-columns:repeat(2,minmax(0,1fr))}#in-importar{grid-column:auto!important}}
@media(max-width:760px){.int-con,.int-ent,.int-mapa{grid-template-columns:1fr}}
@media(max-width:1100px){.quien{display:none}#em-listas .campos{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){#form-empresa .campos,#em-listas .campos{grid-template-columns:1fr}}
'''

# ---------------- JavaScript ----------------
js = cambiar(js, "function euros(n) { return (n < 0 ? '−' : '') + miles(n) + ' €'; }",
             "function euros(n) { return (n < 0 ? '−' : '') + miles(n) + ' ' + moneda(); }")
js = cambiar(js, "function euros2(n) { var a = Math.abs(n)", "function euros2(n) { if (!decimales()) return euros(n); var a = Math.abs(n)")
js = cambiar(js, "+ ',' + ('0' + c).slice(-2) + ' €'; }", "+ ',' + ('0' + c).slice(-2) + ' ' + moneda(); }")
js = cambiar(js, "(€)'", "({m})'", 7)
js = cambiar(js, "  finanzas: { titulo: 'Finanzas', tabs: [['finanzas', 'Dashboard'], ['flujo', 'Flujo de caja'], ['cuentas', 'Facturas'], ['pagos', 'Cobros y pagos'], ['gastos', 'Gastos']] }\n};",
             "  finanzas: { titulo: 'Finanzas', tabs: [['finanzas', 'Dashboard'], ['flujo', 'Flujo de caja'], ['cuentas', 'Facturas'], ['pagos', 'Cobros y pagos'], ['gastos', 'Gastos']] },\n"
             "  cuenta: { titulo: 'Ajustes', tabs: [['cuenta', 'Mi cuenta'], ['empresa', 'Empresa'], ['usuarios', 'Usuarios'], ['integraciones', 'Integraciones'], ['admin', 'Superadmin']] }\n};")
js = cambiar(js, "  if (!document.getElementById('v-' + vista)) vista = 'inicio';",
             "  if (!document.getElementById('v-' + vista) || (D && !permitida(vista))) vista = 'inicio';")
js = cambiar(js, "  $('i-aviso').innerHTML = !D.existe ? '<div class=\"aviso-demo\">Aún no existen las tablas. En la hoja, ejecuta <b>Bodega &gt; Crear / reparar todo</b>.</div>' :\n"
                 "    !D.productos.length ? '<div class=\"aviso-demo\">El catálogo está vacío. Añade productos con <b>+ Nuevo</b> o carga los datos de ejemplo desde el menú <b>Bodega</b> de la hoja.</div>' : '';",
             "  $('i-aviso').innerHTML = !D.productos.length ? '<div class=\"aviso-demo\">El catálogo está vacío. Añade productos con <b>+ Nuevo</b>' +\n"
             "    (D.superadmin ? ' o carga los datos de ejemplo desde <b>Ajustes › Superadmin</b>.' : '.') + '</div>' : '';")
js = cambiar(js, "    kpi('Ocupación de bodega', total ? pct(ocupadas / total * 100) : '—', ocupadas + ' de ' + total + ' posiciones');",
             "    (tiene('posiciones') ? kpi('Ocupación de bodega', total ? pct(ocupadas / total * 100) : '—', ocupadas + ' de ' + total + ' posiciones') : '');")
js = cambiar(js, "    return '<section class=\"vista\" id=\"v-f-' + k + '\"><form class=\"t form\" id=\"form-' + k + '\" data-tipo=\"' + k + '\" novalidate><h3 style=\"font-size:17px\">' + f.titulo + '</h3><div class=\"sub\">' + (f.nota || 'Los campos con * son obligatorios.') + '</div><div class=\"campos\">' +\n      f.campos.map(function (c) {\n        var id = 'x-' + k + '-' + c.id;",
             "    return '<section class=\"vista\" id=\"v-f-' + k + '\"><form class=\"t form\" id=\"form-' + k + '\" data-tipo=\"' + k + '\" novalidate><h3 style=\"font-size:17px\">' + f.titulo + '</h3><div class=\"sub\">' + (f.nota || 'Los campos con * son obligatorios.') + '</div><div class=\"campos\">' +\n      f.campos.map(function (c) {\n        var id = 'x-' + k + '-' + c.id; c = Object.assign({}, c, { etq: c.etq.replace('{m}', moneda()) });")
js = cambiar(js, "function enviar(form) {\n", "function enviar(form) {\n  if (form.hasAttribute('data-propio')) { PROPIOS[form.getAttribute('data-propio')](form); return; }\n")
js = cambiar(js, "  $('p-entrar').addEventListener('click', entrar);\n  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !portada.classList.contains('fuera')) entrar(); });",
             "  if (portada) $('p-entrar').addEventListener('click', entrar);\n  document.addEventListener('keydown', function (e) { if (portada && e.key === 'Enter' && !portada.classList.contains('fuera')) entrar(); });")
js = cambiar(js, "  google.script.run.withSuccessHandler(function (d) {\n    D = d;\n",
             "  google.script.run.withSuccessHandler(function (d) {\n    if (d && d.ok === false) { mostrarSinEmpresa(d); return; }\n    D = d;\n    aplicarModulos(); crearFormularios(); CTX.usuarios = null; CTX.empresas = null;\n")
js = cambiar(js, "/* ===================== ARRANQUE ===================== */",
             EXTRA.read_text(encoding="utf-8") + "\n" + EXTRA.with_name("integraciones.js").read_text(encoding="utf-8") + "\n/* ===================== ARRANQUE ===================== */")
js = cambiar(js, "  enlazar();\n", "  enlazar(); enlazarSaas(); enlazarIntegraciones();\n")
# Ajustes de stock que llegan de las integraciones (WMS / SAP)
js = cambiar(js, "    if (m[2] === 'Ingreso Existencia') it.stock += m[4];\n    else if (m[2] === 'Salida Venta' || m[2] === 'Merma / Daño') it.stock -= m[4];",
                 "    if (m[2] === 'Ingreso Existencia' || m[2] === 'Ajuste Entrada') it.stock += m[4];\n    else if (m[2] === 'Salida Venta' || m[2] === 'Merma / Daño' || m[2] === 'Ajuste Salida') it.stock -= m[4];")
js = cambiar(js, "'Transferencia': 'gris' };", "'Transferencia': 'gris', 'Ajuste Entrada': 'ambar', 'Ajuste Salida': 'ambar' };")
js = cambiar(js, "(m[2] === 'Ingreso Existencia' ? '+' : m[2] === 'Transferencia' ? '' : '−')", "(m[2] === 'Ingreso Existencia' || m[2] === 'Ajuste Entrada' ? '+' : m[2] === 'Transferencia' ? '' : '−')")
js = cambiar(js, "guardar('m-tipo', opciones(D.listas.TIPO_MOV, 'Todos los tipos'));", "guardar('m-tipo', opciones(D.listas.TIPO_MOV.concat(['Ajuste Entrada', 'Ajuste Salida']), 'Todos los tipos'));")

# ---------------- Bodega 3D: estilos de nave por empresa y cajas de color ----------------
ESTILOS = pathlib.Path(__file__).with_name("estilos3d.js")
js = cambiar(js, "  function iniciar() {\n    caja = $('lienzo');", ESTILOS.read_text(encoding="utf-8") + "\n  function iniciar() {\n    caja = $('lienzo');")
js = cambiar(js, "    escena.add(new T.HemisphereLight(0xcfe0ff, 0x30333a, 0.5));",
    "    M.cajaTex = texCajaClara('carton'); M.cubetaTex = texCajaClara('cubeta');\n"
    "    M.cajaCarton = new T.MeshStandardMaterial({ map: M.cajaTex, roughness: 0.82 });\n"
    "    M.cajaCubeta = new T.MeshStandardMaterial({ map: M.cubetaTex, roughness: 0.42, metalness: 0.05 });\n"
    "    M.verdeSuelo = new T.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6, transparent: true, opacity: 0.8 });\n"
    "    M.lineaAzul = new T.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.6 });\n"
    "    M.lineaRack = new T.MeshStandardMaterial({ color: 0xe9b400, roughness: 0.7 });\n"
    "    materialesPremium();\n"
    "    escena.add(new T.HemisphereLight(0xcfe0ff, 0x30333a, 0.5));")
js = cambiar(js, "    // Nave: piso, paredes, portón, cerchas y lámparas\n",
    "    var E = ESTILOS3D[estiloActual()];\n"
    "    M.pilar.color.setHex(E.pilar); M.viga.color.setHex(E.viga); M.lineaRack.color.setHex(E.linea);\n"
    "    if (E.fondo) { escena.background.setHex(E.fondo); escena.fog.color.setHex(E.fondo); } else tema();\n"
    "    if (E.nave) {\n"
    "      var zPared = minZ - 5.5, xPared = minX - W / 2 - 7;\n"
    "      var pared1 = new T.Group(), pared2 = new T.Group(), altoG = new T.Group(); grupo.add(pared1); grupo.add(pared2); grupo.add(altoG);\n"
    "      grupo.userData.ocultar = { pared1: pared1, pared2: pared2, alto: altoG, z: zPared, x: xPared, y: techo - 1.6 };\n"
    "      E.nave({ minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ, W: W, H: H, Dp: Dp, techo: techo, largo: largo, fondo: fondo,\n"
    "        zPared: zPared, xPared: xPared, pared1: pared1, pared2: pared2, altoG: altoG, centro: centro });\n"
    "    } else {\n"
    "    // Nave: piso, paredes, portón, cerchas y lámparas\n")
js = cambiar(js, "    sol.position.set(centro.x + 9, techo + 9, centro.z + 12);", "    }\n    sol.position.set(centro.x + 9, techo + 9, centro.z + 12);")
js = cambiar(js, "var ln = malla(new T.PlaneGeometry(lon + 1.2, 0.09), M.amarillo,", "var ln = malla(new T.PlaneGeometry(lon + 1.2, 0.09), M.lineaRack,")
js = re.sub(r"    // Racks: un bastidor por pasillo\n.*?\n    // Posiciones: palé", "    construirRacks(U, W, H, Dp);\n\n    // Posiciones: palé", js, count=1, flags=re.S)
assert "construirRacks(U, W, H, Dp);" in js
js = cambiar(js, "dim.d = Math.min(1.15, paso(U.map(function (u) { return u.y; }), 3.6) * 0.45);",
                 "dim.d = Math.min(1.15, Math.max(1.0, paso(U.map(function (u) { return u.y; }), 3.6) * 0.45));")
js = cambiar(js, "    var largo = maxX - minX + W + 16, fondo = maxZ - minZ + 18;\n",
                 "    var largo = maxX - minX + W + 16, fondo = maxZ - minZ + 18;\n    escena.fog.near = Math.max(34, radioBase * 1.4); escena.fog.far = Math.max(80, radioBase * 3.4); camara.far = Math.max(200, radioBase * 6); camara.updateProjectionMatrix();\n")
js = cambiar(js, "zPared: zPared, xPared: xPared, pared1: pared1, pared2: pared2, altoG: altoG, centro: centro });",
                 "zPared: zPared, xPared: xPared, pared1: pared1, pared2: pared2, altoG: altoG, centro: centro, cortes: cortesX(U, W) });")
js = cambiar(js, "Math.min(70, ", "Math.min(180, ", 2)
# Filtros que esconden posiciones
cuerpo_f = None
js = cambiar(js, "      var x = C.ubi[u.id], hay = !!x.it, y = u.z + (u.z < 0.2 ? 0 : 0.012);",
                 "      var x = C.ubi[u.id], hay = !!x.it, y = u.z + (u.z < 0.2 ? 0 : 0.012), pasa = pasaFiltro(x);")
js = cambiar(js, "      if (hay) {\n        poner(t.tablas", "      if (hay && pasa) {\n        poner(t.tablas")
js = cambiar(js, "      poner(etiquetas, i, u.x, u.z < 0.2 ? 0.05 : u.z - 0.055, u.y + Dp / 2 + (u.z < 0.2 ? 0.2 : 0.055));\n      poner(huecos, i, u.x, u.z + dim.h * 0.45, u.y);",
                 "      if (pasa) {\n        poner(etiquetas, i, u.x, u.z < 0.2 ? 0.05 : u.z - 0.055, u.y + Dp / 2 + (u.z < 0.2 ? 0.2 : 0.055));\n        poner(huecos, i, u.x, u.z + dim.h * 0.45, u.y);\n      } else { etiquetas.setMatrixAt(i, cero); huecos.setMatrixAt(i, cero); }")
js = cambiar(js, "var x = C.ubi[u.id], k = m === 'disponibilidad'", "var x = C.ubi[u.id]; if (!pasaFiltro(x)) return; var k = m === 'disponibilidad'")
js = re.sub(r"  \$\('b-pasillos'\)\.innerHTML = .*?\n  marcarSegmento\('b-pasillos', 'data-pasillo', ESTADO\.pasillo\);", "  pintarFiltros();", js, count=1, flags=re.S)
assert "  pintarFiltros();" in js
js = cambiar(js, "  marcarSegmento('u-color', 'data-color', ESTADO.color);", "  marcarSegmento('u-color', 'data-color', ESTADO.color);\n  pintarFiltros();")
js = cambiar(js, "  $('u-mapa').innerHTML = pasillos.map(", "  $('u-mapa').innerHTML = resumenFiltro() + pasillos.filter(function (p) { return !ESTADO.filtro.pasillo || p === ESTADO.filtro.pasillo; }).map(")
js = cambiar(js, "h += '<div class=\"celda' + (x.it ? '' : ' libre')", "h += '<div class=\"celda' + (x.it ? '' : ' libre') + (pasaFiltro(x) ? '' : ' oculta')")
js = cambiar(js, "  $('b-panel').innerHTML = h;", "  $('b-panel').innerHTML = resumenFiltro() + h;")
js = cambiar(js, "    tema: tema, actualizar: actualizar,", "    fijarVista: function (o) { for (var k in o) orb[k] = o[k]; anim = null; sucio = true; },\n    tema: tema, actualizar: actualizar,")
js = cambiar(js, "cargas = inst(caj(1.08, 1, 0.94), M.carton, n);", "cargas = inst(caj(1.08, 1, 0.94), E.caja === 'cubeta' ? M.cajaCubeta : M.cajaCarton, n);")
js = cambiar(js, "        var gris = 0.82 + ((i * 37) % 17) / 100; cargas.setColorAt(i, col.setRGB(gris, gris, gris));",
                 "        cargas.setColorAt(i, col.setRGB(1, 1, 1));")
js = cambiar(js, "      var x = C.ubi[u.id]; col.set(colorUbi(x));\n      etiquetas.setColorAt(i, col); bandas.setColorAt(i, col);\n    });\n    etiquetas.instanceColor.needsUpdate = true; bandas.instanceColor.needsUpdate = true;",
                 "      var x = C.ubi[u.id]; col.set(colorUbi(x));\n      etiquetas.setColorAt(i, col);\n"
                 "      var tono = x.it ? tonoCaja(colorUbi(x), i) : new T.Color(1, 1, 1);\n"
                 "      cargas.setColorAt(i, tono); bandas.setColorAt(i, tono.clone().multiplyScalar(0.55));\n    });\n"
                 "    etiquetas.instanceColor.needsUpdate = true; bandas.instanceColor.needsUpdate = true; cargas.instanceColor.needsUpdate = true;")

# ---------------- Pedidos y despachos · picking con rutas (30/10/2026) ----------------
# Riel: Inventario, Posiciones, Pedidos y, solo con el módulo CRM, el embudo comercial
cuerpo = cambiar(cuerpo, '    <button data-vista="comercial"><svg viewBox="0 0 24 24"><path d="M3 20h18M6 16v-5M11 16V7M16 16v-8M21 16V4"/></svg>Comercial</button>\n', '')
_pos = re.search(r'    <button data-vista="posiciones" data-modulo="posiciones">.*?</button>\n', cuerpo).group(0)
cuerpo = cambiar(cuerpo, _pos, _pos +
    '    <button data-vista="pedidos"><svg viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 9h4.5l3.5 3.5V16h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></svg>Pedidos<span class="insignia" id="ins-pedidos"></span></button>\n'
    '    <button data-vista="embudo" data-modulo="comercial"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 010 6M18 14c2 .6 3.5 2.6 3.5 6"/></svg>CRM</button>\n')
cuerpo = cambiar(cuerpo,
    '          <small>Comercial</small>\n'
    '          <button data-vista="f-lead" data-modulo="comercial">Prospecto</button>\n'
    '          <button data-vista="f-contacto" data-modulo="comercial">Contacto con un prospecto</button>\n'
    '          <button data-vista="f-meta" data-modulo="comercial">Meta de un ejecutivo</button>\n'
    '          <button data-vista="f-venta">Venta</button>\n'
    '          <button data-vista="f-producto">Producto</button>\n'
    '          <small>Inventario</small>\n'
    '          <button data-vista="f-movimiento">Movimiento de inventario</button>\n',
    '          <small>Pedidos y despachos</small>\n'
    '          <button data-accion="nuevoPedido">Pedido de cliente</button>\n'
    '          <button data-vista="f-venta">Venta directa</button>\n'
    '          <small>Inventario</small>\n'
    '          <button data-vista="f-producto">Producto</button>\n'
    '          <button data-vista="f-movimiento">Movimiento de inventario</button>\n'
    '          <small data-modulo="comercial">CRM comercial</small>\n'
    '          <button data-vista="f-lead" data-modulo="comercial">Prospecto</button>\n'
    '          <button data-vista="f-contacto" data-modulo="comercial">Contacto con un prospecto</button>\n'
    '          <button data-vista="f-meta" data-modulo="comercial">Meta de un ejecutivo</button>\n')
cuerpo = cambiar(cuerpo, '<option value="pro" selected>Profesional · + Posiciones y Comercial</option><option value="enterprise">Empresa · todos los módulos</option>',
                 '<option value="pro" selected>Profesional · + Bodega 3D y picking</option><option value="enterprise">Empresa · + CRM y Finanzas</option>')
cuerpo = cambiar(cuerpo, '<div id="b-etiqueta"></div>', '<div id="b-etiqueta"></div>\n            <div id="b-ruta" style="display:none"></div>')
VISTAS_PEDIDOS = '''
      <!-- PEDIDOS Y DESPACHOS -->
      <section class="vista" id="v-pedidos">
        <div class="rejilla kpis" id="pe-kpis" style="--c:4"></div>
        <form class="t" id="pe-form" data-propio="pedido" novalidate style="display:none"></form>
        <div class="filtros"><input type="search" id="pe-buscar" placeholder="Buscar pedido, cliente o producto…"><select class="sel" id="pe-estado"><option value="activos">Pendientes y en preparación</option><option value="">Todos los estados</option><option>Pendiente</option><option>En preparación</option><option>Despachado</option><option>Anulado</option></select>
          <button class="btn primario escribe" type="button" data-accion="nuevoPedido">+ Pedido</button><button class="btn escribe" type="button" data-accion="demoPedidos" id="pe-demo" title="Crea 24 pedidos pendientes con productos ubicados (solo administradores)">Pedidos de ejemplo</button><span class="cuenta" id="pe-cuenta"></span></div>
        <div class="t"><div class="tabla-caja" style="max-height:620px"><table id="pe-tabla"></table></div></div>
      </section>
      <section class="vista" id="v-picking">
        <div class="rejilla kpis" id="pk-kpis" style="--c:4"></div>
        <div class="rejilla" style="--c:3">
          <div class="t" id="pk-generar" style="grid-column:span 2;align-self:start"></div>
          <div class="t" id="pk-abiertos" style="align-self:start"></div>
        </div>
        <div class="t" id="pk-detalle" style="display:none"></div>
        <div class="t"><h3>Historial de lotes</h3><div class="sub">Lotes despachados o cancelados en los últimos 60 días: recorrido real frente a preparar pedido a pedido</div><div class="tabla-caja" style="max-height:360px"><table id="pk-historial"></table></div></div>
      </section>
'''
cuerpo = cambiar(cuerpo, '      <!-- AJUSTES (SaaS) -->', VISTAS_PEDIDOS + '      <!-- AJUSTES (SaaS) -->')

css_panel += '''
/* ---- Pedidos y despachos · picking ---- */
body.solo-lectura .escribe{display:none!important}
.enlace{background:none;border:0;padding:0;color:var(--azul);font:inherit;font-weight:600;cursor:pointer;text-align:left}
.enlace:hover{text-decoration:underline}
#pe-form{margin-bottom:14px}
.pe-lineas{margin:14px 0 10px;display:flex;flex-direction:column;gap:7px}
.pe-cab,.pe-linea{display:grid;grid-template-columns:minmax(0,1fr) 110px 250px 34px;gap:8px;align-items:center}
.pe-cab span{font-size:11px;font-weight:600;color:var(--suave);text-transform:uppercase;letter-spacing:.04em}
.pe-linea input{width:100%;background:var(--fondo);border:1px solid var(--linea);border-radius:9px;padding:8px 10px;color:var(--texto);font:inherit}
.pe-linea input:focus,.pk-param input:focus{outline:2px solid var(--azul);outline-offset:1px}
.pe-stock{font-size:12.5px}
.pk-param{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin:6px 0 12px}
.pk-param label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--suave)}
.pk-param input{background:var(--fondo);border:1px solid var(--linea);border-radius:9px;padding:8px 10px;color:var(--texto);font:inherit;width:170px}
.pk-param input[type=number]{width:110px}
.pk-total{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:16px;align-items:center;border:1px solid var(--linea);background:var(--tarjeta2);border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:13px}
.pk-barras{display:flex;flex-direction:column;gap:6px}
.pk-barras div{display:grid;grid-template-columns:118px minmax(0,1fr) auto;gap:8px;align-items:center;font-size:12px;color:var(--suave)}
.pk-barras i{display:block;height:10px;border-radius:6px;background:var(--pista2)}
.pk-barras .opt i{background:var(--azul)}
.pk-barras b{color:var(--texto);font-size:12.5px;white-space:nowrap}
.pk-ahorro{font-size:24px;font-weight:800;color:var(--verde);line-height:1;text-align:center}
.pk-ahorro small{display:block;font-size:11px;font-weight:600;color:var(--suave);margin-top:3px}
.pk-props{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.pk-prop,.pk-lote{border:1px solid var(--linea);border-radius:12px;padding:11px 12px;background:var(--tarjeta);display:flex;flex-direction:column;gap:8px}
.pk-lote{margin-top:10px}
.pk-prop.sel,.pk-lote.sel{border-color:var(--azul);box-shadow:0 0 0 2px rgba(14,165,240,.2)}
.pk-prop-cab{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13.5px}
.pk-prop-cab .tenue{font-size:12px;text-align:right}
.pk-chips{display:flex;flex-wrap:wrap;gap:5px}
.pk-ped{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;border:1px solid var(--linea);border-radius:999px;padding:2px 8px 2px 3px;background:var(--tarjeta2)}
.pk-ped i,.pk-rep i,.pk-cajas i{font-style:normal;display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--azul);color:#fff;font-size:10.5px;font-weight:800;flex:none}
.pk-ped.urg{border-color:var(--rojo)}.pk-ped.urg i{background:var(--rojo)}
.pk-cifras{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12.5px;color:var(--suave)}
.pk-cifras b{color:var(--texto)}.pk-cifras .bien{font-weight:700}
.pk-acc{display:flex;gap:6px;flex-wrap:wrap}
#pk-detalle{margin-bottom:14px}
.pk-det-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.pk-det-cab h3{display:flex;align-items:center;gap:8px}
.pk-det{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;margin-top:12px}
.pk-plano{border:1px solid var(--linea);border-radius:12px;background:var(--sobre);padding:10px;display:flex;flex-direction:column;gap:8px;align-self:start}
.pk-mapa{width:100%;height:auto;max-height:470px;display:block}
.pk-mapa .rk{fill:var(--pista2)}
.pk-mapa .fl{fill:var(--suave);font-weight:700}
.pk-mapa .ruta{fill:none;stroke:var(--azul);stroke-width:3.2;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.pk-mapa .esp{stroke:#F97316;stroke-width:1.6;vector-effect:non-scaling-stroke}
.pk-mapa .par{fill:#F97316;stroke:#fff;stroke-width:1.2;vector-effect:non-scaling-stroke}
.pk-mapa .par-t{fill:#fff;font-weight:800;pointer-events:none}
.pk-mapa .dep{fill:var(--verde)}
.pk-mapa .dep-t{fill:#fff;font-weight:800}
.pk-lista-cab{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13.5px}
.pk-lista tr.hecho td{opacity:.45}.pk-lista tr.hecho td:first-child{opacity:1}
.pk-lista input[type=checkbox]{width:17px;height:17px;accent-color:var(--azul)}
.pk-num{display:inline-grid;place-items:center;min-width:22px;height:22px;border-radius:50%;background:#F97316;color:#fff;font-weight:800;font-size:11.5px}
.pk-rep{display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:12.5px;margin-right:6px;white-space:nowrap}
.pk-cajas{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12px;color:var(--suave)}
.pk-cajas span{display:inline-flex;align-items:center;gap:5px}
#b-ruta{position:absolute;left:12px;bottom:46px;z-index:5;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--sobre2);border:1px solid var(--azul);border-radius:12px;padding:8px 10px;box-shadow:var(--sombra);font-size:12.5px;max-width:calc(100% - 24px)}
#b-ruta span{color:var(--suave)}#b-ruta em{font-style:normal;color:var(--verde);font-weight:700}
.pk-color{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:baseline;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
#b-ruta .pk-leyenda{display:inline-flex;gap:10px;flex-wrap:wrap}#b-ruta .pk-leyenda span{color:var(--texto);font-weight:600}
#b-rutas.activo{border-color:var(--azul);color:var(--azul)}
@media(max-width:1100px){.pk-det{grid-template-columns:1fr}.pk-total{grid-template-columns:1fr auto}.pk-barras{grid-column:1/-1}}
@media(max-width:760px){.pe-cab{display:none}.pe-linea{grid-template-columns:minmax(0,1fr) 80px 34px}.pe-stock{grid-column:1/-1}.pk-barras div{grid-template-columns:96px minmax(0,1fr)}.pk-barras b{grid-column:2}#b-ruta{bottom:12px}}
'''

# Secciones: Pedidos y despachos (con ventas y análisis), Catálogo dentro de Inventario, CRM aparte
js = cambiar(js,
    "  comercial: { titulo: 'Comercial', tabs: [['comercial', 'Dashboard'], ['embudo', 'Embudo de ventas'], ['equipo', 'Equipo comercial'], ['ventas', 'Ventas'], ['catalogo', 'Catálogo']] },\n"
    "  inventario: { titulo: 'Inventario', tabs: [['inventario', 'Dashboard'], ['stock', 'Stock y quiebres'], ['reposicion', 'Reposición'], ['movimientos', 'Movimientos']] },\n"
    "  posiciones: { titulo: 'Posiciones', tabs: [['posiciones', 'Bodega 3D'], ['ubicaciones', 'Mapa de ubicaciones']] },\n",
    "  inventario: { titulo: 'Inventario', tabs: [['inventario', 'Dashboard'], ['catalogo', 'Catálogo'], ['stock', 'Stock y quiebres'], ['reposicion', 'Reposición'], ['movimientos', 'Movimientos']] },\n"
    "  posiciones: { titulo: 'Posiciones', tabs: [['posiciones', 'Bodega 3D'], ['ubicaciones', 'Mapa de ubicaciones']] },\n"
    "  pedidos: { titulo: 'Pedidos y despachos', tabs: [['pedidos', 'Pedidos'], ['picking', 'Picking y rutas'], ['ventas', 'Ventas'], ['comercial', 'Análisis de ventas']] },\n"
    "  embudo: { titulo: 'CRM comercial', tabs: [['embudo', 'Embudo de ventas'], ['equipo', 'Equipo comercial']] },\n")
js = cambiar(js, "var FORM_SECCION = { 'f-venta': 'comercial', 'f-producto': 'comercial', 'f-lead': 'comercial', 'f-contacto': 'comercial', 'f-meta': 'comercial',",
                 "var FORM_SECCION = { 'f-venta': 'pedidos', 'f-producto': 'inventario', 'f-lead': 'embudo', 'f-contacto': 'embudo', 'f-meta': 'embudo',")
PEDIDOS = pathlib.Path(__file__).with_name("pedidos.js")
js = cambiar(js, "\n/* ===================== ARRANQUE ===================== */", "\n" + PEDIDOS.read_text(encoding="utf-8") + "\n/* ===================== ARRANQUE ===================== */")
js = cambiar(js, "  enlazar(); enlazarSaas(); enlazarIntegraciones();\n", "  enlazar(); enlazarSaas(); enlazarIntegraciones(); enlazarPedidos();\n")

# Bodega 3D: ruta de picking (cinta azul por los pasillos, paradas numeradas, despacho y un punto que la recorre)
RUTA3D = r'''
  var rutaG = null, rutaAnim = null;
  function caminoRedondo(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function texEtiqueta(txt, fondo, ancho) {
    var c = document.createElement('canvas'), w = ancho || 128; c.width = w; c.height = 128; var g = c.getContext('2d');
    g.fillStyle = fondo; g.strokeStyle = '#ffffff'; g.lineWidth = 9;
    if (ancho) caminoRedondo(g, 6, 6, w - 12, 116, 34); else { g.beginPath(); g.arc(64, 64, 55, 0, Math.PI * 2); }
    g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '800 ' + (ancho ? 52 : String(txt).length > 2 ? 44 : 60) + 'px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, 67);
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  /** Etiqueta de parada: número en el color del lote + unidades, SKU y producto. */
  function texParada(n, color, l1, l2) {
    var c = document.createElement('canvas'); c.width = 600; c.height = 150; var g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.97)'; g.strokeStyle = color; g.lineWidth = 8; caminoRedondo(g, 6, 6, 588, 138, 62); g.fill(); g.stroke();
    g.fillStyle = color; g.beginPath(); g.arc(75, 75, 56, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + (String(n).length > 2 ? 44 : 58) + 'px Inter, system-ui, sans-serif'; g.fillText(n, 75, 79);
    g.textAlign = 'left'; g.fillStyle = '#0B1324'; g.font = '800 46px Inter, system-ui, sans-serif'; g.fillText(l1, 150, 56);
    g.fillStyle = '#475569'; g.font = '600 35px Inter, system-ui, sans-serif'; g.fillText(l2, 150, 108);
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function corto(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function dibujarRuta() {
    if (rutaG) { escena.remove(rutaG); rutaG.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); rutaG = null; }
    rutaAnim = null; sucio = true;
    var L = (ESTADO.rutas || []).filter(function (R) { return R && R.puntos && R.puntos.length > 1; }); if (!L.length) return;
    rutaG = new T.Group(); escena.add(rutaG);
    var bolas = [], kE = Math.max(1, Math.min(1.9, radioBase / 35));   // en naves grandes las etiquetas crecen para leerse
    L.forEach(function (R, ri) {
      var col = new T.Color(R.color), mat = new T.MeshBasicMaterial({ color: col, toneMapped: false });
      var off = (ri - (L.length - 1) / 2) * 0.24, P = R.puntos, tramos = [], total = 0;   // rutas paralelas un poco separadas
      for (var i = 0; i < P.length - 1; i++) {
        var a = P[i], b = P[i + 1], dx = Math.abs(b[0] - a[0]), dz = Math.abs(b[1] - a[1]), Lg = dx + dz; if (Lg < 0.01) continue;
        var m = new T.Mesh(new T.BoxGeometry(dx + 0.26, 0.04, dz + 0.26), mat);
        m.position.set((a[0] + b[0]) / 2 + (dz > dx ? off : 0), 0.05 + ri * 0.003, (a[1] + b[1]) / 2 + (dx >= dz ? off : 0)); rutaG.add(m);
        tramos.push({ a: a, b: b, L: Lg, ini: total }); total += Lg;
      }
      R.paradas.forEach(function (s, k) {
        var disco = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.08, 24), mat); disco.position.set(s.x, 0.08, s.cy); rutaG.add(disco);
        var lado = Math.abs(s.y - s.cy); if (lado > 0.05) { var en = new T.Mesh(new T.BoxGeometry(0.08, 0.05, lado), mat); en.position.set(s.x, 0.07, (s.y + s.cy) / 2); rutaG.add(en); }
        var sp = new T.Sprite(new T.SpriteMaterial({ map: texParada(String(k + 1), R.color, s.uds + ' uds · ' + s.sku, corto(s.nombre, 24)), depthTest: false, toneMapped: false }));
        sp.scale.set(2.3 * kE, 0.575 * kE, 1); sp.position.set(s.x, s.z + dim.h + 0.35 + 0.3 * kE, s.y); sp.renderOrder = 20 + ri; rutaG.add(sp);
      });
      var bola = new T.Mesh(new T.SphereGeometry(0.3, 18, 12), new T.MeshBasicMaterial({ color: col.clone().lerp(new T.Color(1, 1, 1), 0.55), toneMapped: false }));
      rutaG.add(bola); bolas.push({ bola: bola, tramos: tramos, total: total });
    });
    var R0 = L[0];
    var dep = new T.Mesh(new T.BoxGeometry(2.6, 0.1, 1.7), new T.MeshBasicMaterial({ color: 0x16a34a, toneMapped: false })); dep.position.set(R0.deposito.x, 0.06, R0.deposito.y); rutaG.add(dep);
    var spd = new T.Sprite(new T.SpriteMaterial({ map: texEtiqueta('DESPACHO', '#16A34A', 380), depthTest: false, toneMapped: false }));
    spd.scale.set(3.0, 1.0, 1); spd.position.set(R0.deposito.x, 1.7, R0.deposito.y); spd.renderOrder = 30; rutaG.add(spd);
    // Un punto por ruta la recorre dos veces y se detiene en el despacho (máx. 30 fps; se apaga si el equipo va lento)
    var t0 = performance.now(), ultimo = 0, lentos = 0;
    var poner = function (q, d) {
      var t = q.tramos[0]; for (var j = 0; j < q.tramos.length; j++) if (d >= q.tramos[j].ini) t = q.tramos[j];
      var f = Math.min(1, (d - t.ini) / t.L); q.bola.position.set(t.a[0] + (t.b[0] - t.a[0]) * f, 0.4, t.a[1] + (t.b[1] - t.a[1]) * f);
    };
    bolas.forEach(function (q) { if (q.tramos.length) poner(q, 0); });
    rutaAnim = function (ahora) {
      if (ESTADO.vista !== 'posiciones') return;
      if (ultimo && ahora - ultimo < 33) return;
      if (ultimo && ahora - ultimo > 150) lentos++;
      ultimo = ahora;
      var seg = (ahora - t0) / 1000, vivas = 0;
      bolas.forEach(function (q) {
        if (!q.tramos.length) return;
        var d = seg * Math.max(3, q.total / 16);
        if (d >= q.total * 2 || lentos > 4) { poner(q, 0); return; }
        poner(q, d % q.total); vivas++;
      });
      sucio = true;
      if (!vivas) rutaAnim = null;
    };
  }
  function verRuta() {
    var L = ESTADO.rutas || []; if (!L.length) return;
    // Encuadra la zona que recorren las rutas (en naves grandes no hace falta ver toda la bodega)
    var bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    L.forEach(function (R) {
      R.puntos.concat(R.paradas.map(function (s) { return [s.x, s.y]; })).concat([[R.deposito.x, R.deposito.y]]).forEach(function (q) {
        bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); bz0 = Math.min(bz0, q[1]); bz1 = Math.max(bz1, q[1]); });
    });
    var ext = Math.max(bx1 - bx0, (bz1 - bz0) * 1.25);
    var fin = { tx: (bx0 + bx1) / 2, ty: 0.5, tz: (bz0 + bz1) / 2, radio: Math.min(radioBase * 1.02, Math.max(14, ext * 1.05 + 8)) * Math.max(1, Math.min(1.9, 1.35 / (camara.aspect || 1.35))), theta: 0.2, phi: 0.7 };
    var ini = {}, t0 = performance.now(); for (var k in fin) ini[k] = orb[k];
    anim = function (ahora) { var p = Math.min(1, (ahora - t0) / 700), e = 1 - Math.pow(1 - p, 3); for (var k2 in fin) orb[k2] = ini[k2] + (fin[k2] - ini[k2]) * e; if (p >= 1) anim = null; sucio = true; };
  }
'''
js = cambiar(js, "  var construida = false, pendiente = true;\n  return {", RUTA3D + "\n  var construida = false, pendiente = true;\n  return {")
js = cambiar(js, "    tema: tema, actualizar: actualizar,", "    ruta: function (enfocar) { if (listo) { dibujarRuta(); if (enfocar !== false) verRuta(); } },\n    tema: tema, actualizar: actualizar,")
js = cambiar(js, "    requestAnimationFrame(ciclo);\n    if (anim) anim(ahora);\n", "    requestAnimationFrame(ciclo);\n    if (anim) anim(ahora);\n    if (rutaAnim) rutaAnim(ahora);\n")


# ---------------- Efectos premium y Asistente Flux (31/10/2026) ----------------
_aqui = pathlib.Path(__file__).parent
css_panel += _aqui.joinpath("efectos.css").read_text(encoding="utf-8") + _aqui.joinpath("asistente.css").read_text(encoding="utf-8")
cuerpo = cambiar(cuerpo, '<button class="btn btn-tema" id="btn-tema"',
    '<button class="btn btn-ia" data-accion="abrirAsistente" title="Asistente Flux (Ctrl + K)" aria-label="Abrir el asistente"><span class="ia-chispa">✦</span><span class="ia-largo">Pregúntale a Flux</span><kbd>Ctrl K</kbd></button><button class="btn btn-tema" id="btn-tema"')
ASISTENTE_HTML = '''<div id="ia-fondo"></div>
<aside id="ia-panel" role="dialog" aria-label="Asistente Flux">
  <div class="ia-cab"><div class="ia-logo" style="width:34px;height:34px;border-radius:11px;font-size:16px;margin:0;animation:none">✦</div><h3>Asistente Flux</h3><span class="ia-modo" id="ia-modo">IA</span><button class="btn mini" data-accion="cerrarAsistente" aria-label="Cerrar el asistente">✕</button></div>
  <div id="ia-mensajes"></div>
  <div id="ia-sugerencias"></div>
  <form id="ia-form" autocomplete="off"><input id="ia-texto" placeholder="Pregunta sobre tu bodega, stock o pedidos…" aria-label="Pregunta para el asistente" maxlength="400"><button class="btn primario" type="submit">Preguntar</button></form>
</aside>
'''
cuerpo = cambiar(cuerpo, '<div id="aviso"></div>', ASISTENTE_HTML + '<div id="aviso"></div>')
js = cambiar(js, "\n/* ===================== ARRANQUE ===================== */",
    "\n" + _aqui.joinpath("efectos.js").read_text(encoding="utf-8") + "\n" + _aqui.joinpath("asistente.js").read_text(encoding="utf-8") + "\n/* ===================== ARRANQUE ===================== */")
js = cambiar(js, "  enlazar(); enlazarSaas(); enlazarIntegraciones(); enlazarPedidos();\n", "  enlazar(); enlazarSaas(); enlazarIntegraciones(); enlazarPedidos(); enlazarAsistente();\n")
js = cambiar(js, "    $('cargando').style.display = 'none';\n", "    ocultarCargando();\n")


# ---------------- Inicio con operación de bodega · Optimizar espacio (31/10/2026) ----------------
cuerpo = cambiar(cuerpo, '<div class="rejilla kpis" id="i-kpis" style="--c:5"></div>',
    '<div class="rejilla kpis" id="i-kpis" style="--c:5"></div>\n'
    '        <div class="i-seccion"><h2>Operación de bodega y picking</h2><div class="pk-acc"><button class="btn mini" data-vista="pedidos">Pedidos</button><button class="btn mini" data-vista="picking" data-modulo="posiciones">Picking y rutas</button></div></div>\n'
    '        <div class="rejilla kpis" id="i-op-kpis" style="--c:5"></div>\n'
    '        <div class="rejilla" style="--c:3" data-ajustar>\n'
    '          <div class="t" data-modulo="posiciones"><h3>Lotes en curso</h3><div class="sub">Avance de cada carro según su lista de picking</div><div id="i-lotes"></div></div>\n'
    '          <div class="t"><h3>Pedidos por preparar</h3><div class="sub">Urgentes primero</div><div id="i-pedidos"></div></div>\n'
    '          <div class="t" data-modulo="posiciones"><h3>Ocupación por pasillo</h3><div class="sub">Posiciones ocupadas sobre el total</div><div id="i-pasillos" style="max-height:300px;overflow:auto"></div></div>\n'
    '        </div>\n'
    '        <div class="i-seccion"><h2>Inventario</h2></div>')
cuerpo = cambiar(cuerpo, '      <!-- AJUSTES (SaaS) -->', """      <section class="vista" id="v-optimizar">
        <div class="rejilla kpis" id="op-kpis" style="--c:4"></div>
        <div class="rejilla" style="--c:3">
          <div class="t" id="op-sugerencias" style="grid-column:span 2;align-self:start"></div>
          <div class="t" id="op-zonas" style="align-self:start"></div>
        </div>
      </section>
      <!-- AJUSTES (SaaS) -->""")
js = cambiar(js, "  posiciones: { titulo: 'Posiciones', tabs: [['posiciones', 'Bodega 3D'], ['ubicaciones', 'Mapa de ubicaciones']] },\n",
                 "  posiciones: { titulo: 'Posiciones', tabs: [['posiciones', 'Bodega 3D'], ['ubicaciones', 'Mapa de ubicaciones'], ['optimizar', 'Optimizar espacio ✦']] },\n")
js = cambiar(js, "\n/* ===================== ARRANQUE ===================== */", "\n" + _aqui.joinpath("optimizar.js").read_text(encoding="utf-8") + "\n/* ===================== ARRANQUE ===================== */")
css_panel += """
/* ---- Inicio: secciones · Optimizar espacio ---- */
.i-seccion{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 10px}
.i-seccion h2{margin:0;font-size:12.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--suave);font-weight:700}
.i-lote{padding:9px 0;border-top:1px solid var(--linea)}.i-lote:first-child{border-top:0;padding-top:2px}
.op-lista{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.op-sug{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid var(--linea);border-radius:12px;padding:11px 12px;background:var(--tarjeta);transition:transform .22s var(--fx),box-shadow .22s,border-color .22s}
.op-sug:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(15,27,45,.12)}
.op-sug.sel{border-color:var(--verde);box-shadow:0 0 0 2px rgba(74,222,128,.25)}
.op-num{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#fff;background:linear-gradient(135deg,#10B981,#0EA5F0)}
.op-cuerpo{display:flex;flex-direction:column;gap:8px;min-width:0}
.op-paso{font-size:13px;line-height:1.4}
.op-tag{display:inline-block;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:2px 7px;border-radius:999px;margin-right:6px}
.op-tag.verde{background:rgba(16,185,129,.14);color:#059669}.op-tag.ambar{background:rgba(245,158,11,.16);color:#B45309}
.op-desde{font-size:12.5px;margin-top:3px;font-weight:600}.op-desde i{font-style:normal;color:var(--azul);font-weight:800;margin:0 4px}
.op-ahorro{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.op-ahorro b{font-size:18px;color:var(--verde)}.op-ahorro small{font-size:11px;color:var(--suave);margin-bottom:6px}
@media(max-width:760px){.op-sug{grid-template-columns:30px minmax(0,1fr)}.op-ahorro{grid-column:1/-1;align-items:flex-start;text-align:left}}
"""

# ---------------- Escritura ----------------
app = FRONT / "src/app/app"
app.mkdir(parents=True, exist_ok=True)
(FRONT / "public/panel").mkdir(parents=True, exist_ok=True)
(app / "panel.css").write_text(css_panel.strip() + "\n", encoding="utf-8")
(app / "markup.ts").write_text("// Generado desde App.html (Apps Script) por build/transformar.py\n"
                                "export const MARKUP = " + json.dumps(cuerpo.strip(), ensure_ascii=False) + "\n", encoding="utf-8")
(FRONT / "src/app/marca.ts").write_text("// Símbolo SVG del logo Axioma (se usa con <use href=\"#logo-axioma\">)\n"
                                        "export const LOGO_SVG = " + json.dumps(svg_defs, ensure_ascii=False) + "\n", encoding="utf-8")
(FRONT / "src/app/portada.css").write_text("html,body{height:100%;margin:0}\nbody{font:14px/1.45 Inter,system-ui,sans-serif;background:#070D1A;overflow:hidden}\n"
                                           + portada_css + "\n", encoding="utf-8")
(FRONT / "public/panel/panel.js").write_text("/* Axioma Flux · panel (portado desde App.html de Apps Script). Generado por build/transformar.py */\n" + js, encoding="utf-8")
print("OK", {k: len(v) for k, v in {"css": css_panel, "markup": cuerpo, "js": js, "portada": portada_html}.items()})
print("PORTADA_HTML_START")
print(portada_html)
