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
cuerpo = cambiar(cuerpo, '<div class="seg" id="b-pasillos"></div>', '<div class="filtro3d" id="b-filtros"></div>')
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
