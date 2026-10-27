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
.campo textarea{font:inherit;color:inherit;resize:vertical;min-height:120px}
#form-empresa .campos{grid-template-columns:repeat(2,minmax(0,1fr))}
#em-listas .campos{grid-template-columns:repeat(4,minmax(0,1fr))}
#cargando-txt{text-align:center;max-width:420px}
body:not(.m-comercial) [data-modulo~="comercial"],body:not(.m-finanzas) [data-modulo~="finanzas"],body:not(.m-posiciones) [data-modulo~="posiciones"]{display:none!important}
body.solo-lectura .menu,body.solo-lectura #formularios,body.solo-lectura [data-vista^="f-"],body.solo-lectura .lead .l4,
body.solo-lectura [data-accion="liquidar"],body.solo-lectura [data-accion="abonar"],body.solo-lectura #b-panel .pie-form,body.solo-lectura #b-panel .campo,
body.solo-lectura #r-guardar,body.solo-lectura #r-deshacer{display:none!important}
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
             "  cuenta: { titulo: 'Ajustes', tabs: [['cuenta', 'Mi cuenta'], ['empresa', 'Empresa'], ['usuarios', 'Usuarios'], ['admin', 'Superadmin']] }\n};")
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
             EXTRA.read_text(encoding="utf-8") + "\n/* ===================== ARRANQUE ===================== */")
js = cambiar(js, "  enlazar();\n", "  enlazar(); enlazarSaas();\n")

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
