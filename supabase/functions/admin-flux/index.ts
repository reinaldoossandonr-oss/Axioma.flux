// Axioma Flux · funciones que necesitan la llave de servicio:
// alta de empresas (superadmin), alta de usuarios y contraseñas (superadmin o admin de la empresa) y datos demo.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { generarDemo } from "./demo.ts";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const error = (mensaje: string, status = 200) => resp({ ok: false, mensaje }, status);

const ROLES = ["admin", "operador", "viewer"];
const PLANES = ["free", "pro", "enterprise"];
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return error("Método no permitido", 405);

  const auth = req.headers.get("Authorization") ?? "";
  const comoUsuario = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  const { data: quien } = await comoUsuario.auth.getUser();
  if (!quien?.user) return error("Sesión no válida", 401);
  const yo = quien.user.id;

  const [{ data: esSuper }, { data: miPerfil }] = await Promise.all([
    comoUsuario.rpc("es_superadmin"),
    admin.from("perfiles_usuarios").select("empresa_id, rol, activo").eq("user_id", yo).maybeSingle(),
  ]);
  const soyAdminDe = (empresaId: string) => !!miPerfil && miPerfil.activo && miPerfil.rol === "admin" && miPerfil.empresa_id === empresaId;

  let d: any;
  try { d = await req.json(); } catch { return error("Solicitud no válida", 400); }

  try {
    switch (d.accion) {
      // ---------- Superadmin: empresa nueva + su primer administrador ----------
      case "crear_empresa": {
        if (!esSuper) return error("Solo el superadmin puede crear empresas.", 403);
        const nombre = String(d.nombre ?? "").trim();
        const plan = PLANES.includes(d.plan) ? d.plan : "free";
        const a = d.admin ?? {};
        const email = String(a.email ?? "").trim().toLowerCase();
        if (!nombre) return error("Indica el nombre de la empresa.");
        if (!emailValido(email)) return error("Indica un email válido para el administrador.");
        if (String(a.password ?? "").length < 8) return error("La contraseña debe tener al menos 8 caracteres.");

        const { data: emp, error: e1 } = await admin.from("empresas")
          .insert({ nombre, plan, ruc_nit: String(d.ruc ?? "").trim() || null, ajustes: d.ajustes ?? {} }).select("id").single();
        if (e1) return error("No se pudo crear la empresa: " + e1.message);

        const r = await crearUsuario(admin, emp.id, { nombre: a.nombre || "Administrador", email, password: a.password, rol: "admin" });
        if (!r.ok) { await admin.from("empresas").delete().eq("id", emp.id); return resp(r); }
        await admin.rpc("inicializar_empresa", { p_empresa: emp.id });
        return resp({ ok: true, mensaje: "Empresa creada con su administrador.", empresa_id: emp.id });
      }

      // ---------- Usuario nuevo en una empresa ----------
      case "crear_usuario": {
        const empresaId = esSuper && d.empresa_id ? d.empresa_id : miPerfil?.empresa_id;
        if (!empresaId || !(esSuper || soyAdminDe(empresaId))) return error("Solo un administrador puede crear usuarios.", 403);
        return resp(await crearUsuario(admin, empresaId, d));
      }

      // ---------- Cambiar la contraseña de un usuario de la empresa ----------
      case "cambiar_password": {
        const { data: obj } = await admin.from("perfiles_usuarios").select("empresa_id").eq("user_id", d.user_id).maybeSingle();
        if (!obj || !(esSuper || soyAdminDe(obj.empresa_id))) return error("No puedes cambiar la contraseña de ese usuario.", 403);
        if (String(d.password ?? "").length < 8) return error("La contraseña debe tener al menos 8 caracteres.");
        const { error: e } = await admin.auth.admin.updateUserById(d.user_id, { password: d.password });
        return e ? error("No se pudo cambiar: " + e.message) : resp({ ok: true, mensaje: "Contraseña actualizada." });
      }

      // ---------- Superadmin: cargar datos de ejemplo ----------
      case "cargar_demo": {
        if (!esSuper) return error("Solo el superadmin puede cargar datos de ejemplo.", 403);
        return resp(await cargarDemo(admin, d.empresa_id));
      }

      default:
        return error("Acción desconocida.", 400);
    }
  } catch (e) {
    return error("Error inesperado: " + (e instanceof Error ? e.message : String(e)), 500);
  }
});

async function crearUsuario(admin: any, empresaId: string, u: any) {
  const email = String(u.email ?? "").trim().toLowerCase();
  const nombre = String(u.nombre ?? "").trim();
  const rol = ROLES.includes(u.rol) ? u.rol : "operador";
  if (!nombre) return { ok: false, mensaje: "Indica el nombre del usuario." };
  if (!emailValido(email)) return { ok: false, mensaje: "Indica un email válido." };
  if (String(u.password ?? "").length < 8) return { ok: false, mensaje: "La contraseña debe tener al menos 8 caracteres." };

  const { data, error } = await admin.auth.admin.createUser({
    email, password: u.password, email_confirm: true, user_metadata: { nombre, empresa_id: empresaId },
  });
  if (error) {
    const yaExiste = /already|registered|exists/i.test(error.message);
    return { ok: false, mensaje: yaExiste ? "Ya existe un usuario con ese email." : "No se pudo crear el usuario: " + error.message };
  }
  const { error: e2 } = await admin.from("perfiles_usuarios").insert({ user_id: data.user.id, empresa_id: empresaId, rol, nombre, email });
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, mensaje: "No se pudo crear el perfil: " + e2.message };
  }
  return { ok: true, mensaje: "Usuario creado.", user_id: data.user.id };
}

async function cargarDemo(admin: any, empresaId: string) {
  if (!empresaId) return { ok: false, mensaje: "Falta la empresa." };
  const { data: ya } = await admin.from("productos").select("id").eq("empresa_id", empresaId).eq("demo", true).limit(1);
  if (ya?.length) return { ok: false, mensaje: "Esta empresa ya tiene datos de ejemplo. Bórralos antes de volver a cargarlos." };

  await admin.rpc("inicializar_empresa", { p_empresa: empresaId });
  const { data: aj } = await admin.rpc("ajustes_empresa", { p_empresa: empresaId });
  const zona = aj?.zona_horaria || "Europe/Madrid";
  const hoyTxt = new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const hoy = new Date(hoyTxt + "T00:00:00Z");

  const { data: ubis } = await admin.from("ubicaciones").select("id").eq("empresa_id", empresaId).is("sku", null).order("id");
  const DEF = (await admin.rpc("ajustes_por_defecto")).data;
  const listas = { ...DEF.listas };
  for (const k of Object.keys(listas)) if (Array.isArray(aj?.listas?.[k]) && aj.listas[k].length >= (k === "CATEGORIA" ? 6 : 1)) listas[k] = aj.listas[k];

  const demo = generarDemo(hoy, (ubis ?? []).map((u: any) => u.id), {
    peso90: Number(aj?.peso90 ?? 70), pesoAA: Number(aj?.pesoAA ?? 30), iva: Number(aj?.iva ?? 21),
    contado: Array.isArray(aj?.contado) ? aj.contado : ["Tienda", "Online"], listas,
  });

  const conEmpresa = (filas: any[]) => filas.map((f) => ({ ...f, empresa_id: empresaId, demo: true }));
  const insertar = async (tabla: string, filas: any[]) => {
    for (let i = 0; i < filas.length; i += 1000) {
      const { error } = await admin.from(tabla).insert(conEmpresa(filas.slice(i, i + 1000)));
      if (error) throw new Error(tabla + ": " + error.message);
    }
    return filas.length;
  };

  const informe: Record<string, number> = {};
  try {
    informe.productos = await insertar("productos", demo.productos);
    let n = 0;
    for (const [ubi, sku] of Object.entries(demo.asignacion)) {
      const { error } = await admin.from("ubicaciones").update({ sku }).eq("empresa_id", empresaId).eq("id", ubi).is("sku", null);
      if (!error) n++;
    }
    informe.posiciones = n;
    informe.ventas = await insertar("ventas", demo.ventas);
    informe.movimientos = await insertar("movimientos", demo.movimientos);
    informe.facturas = await insertar("cuentas", demo.cuentas);
    informe.pagos = await insertar("pagos", demo.pagos);
    informe.gastos = await insertar("gastos", demo.gastos);
    informe.prospectos = await insertar("leads", demo.leads);
    informe.contactos = await insertar("bitacora", demo.bitacora);
    informe.metas = await insertar("metas", demo.metas);
  } catch (e) {
    await admin.rpc("sa_borrar_demo", { p_id: empresaId });
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, mensaje: /duplicate|unique/i.test(msg) ? "Algún SKU de ejemplo ya existe en la empresa (" + msg + ")." : "No se pudieron cargar: " + msg };
  }
  return { ok: true, mensaje: "Datos de ejemplo cargados.", informe };
}
