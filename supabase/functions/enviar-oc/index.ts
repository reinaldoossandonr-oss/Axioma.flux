// Axioma Flux · envía una orden de compra al proveedor por correo, con el SMTP del dominio de Axioma.
// Lee la orden con la sesión del usuario (la RLS garantiza que es de su empresa) y la marca como «Enviada».
//
// Secretos (Supabase › Edge Functions › Secrets):
//   SMTP_HOST   p. ej. mail.tudominio.com
//   SMTP_PORT   465 (SSL). Supabase bloquea las salidas por los puertos 25 y 587.
//   SMTP_USER   usuario del buzón, p. ej. compras@tudominio.com
//   SMTP_PASS   contraseña del buzón
//   SMTP_FROM   remitente, p. ej. compras@tudominio.com (si falta se usa SMTP_USER)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const error = (mensaje: string, status = 200) => resp({ ok: false, mensaje }, status);
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function dinero(n: number, moneda: string, dec: number) {
  const s = Math.abs(n).toFixed(dec).split(".");
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "−" : "") + s.join(",") + " " + moneda;
}
function fechaLarga(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return d + " de " + meses[m - 1] + " de " + a;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return error("Método no permitido", 405);

  const auth = req.headers.get("Authorization") ?? "";
  const db = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: quien } = await db.auth.getUser();
  if (!quien?.user) return error("Sesión no válida", 401);

  let d: any;
  try { d = await req.json(); } catch { return error("Solicitud no válida", 400); }
  const id = String(d?.id ?? "").trim();
  if (!id) return error("Falta la orden de compra.");

  const { data: puede } = await db.rpc("tiene_rol", { rol_requerido: "operador" });
  if (!puede) return error("Tu usuario es de solo lectura.");

  const HOST = Deno.env.get("SMTP_HOST"), USER = Deno.env.get("SMTP_USER"), PASS = Deno.env.get("SMTP_PASS");
  const PORT = Number(Deno.env.get("SMTP_PORT") || 465);
  const FROM = Deno.env.get("SMTP_FROM") || USER || "";
  if (!HOST || !USER || !PASS) {
    return error("El envío de correos aún no está configurado. Faltan los datos SMTP en Supabase (SMTP_HOST, SMTP_USER, SMTP_PASS).");
  }

  // Orden, líneas, proveedor, empresa y usuario (todo con la sesión del usuario: la RLS filtra por empresa)
  const { data: oc } = await db.from("ordenes_compra").select("*").eq("id", id).maybeSingle();
  if (!oc) return error("No se encontró la orden " + id + ".");
  if (oc.estado === "Anulada" || oc.estado === "Recibida") return error("La orden está " + oc.estado.toLowerCase() + ": no se puede enviar.");
  const [{ data: lineas }, { data: prov }, { data: emp }, { data: yo }] = await Promise.all([
    db.from("orden_compra_lineas").select("*").eq("orden_id", id).order("linea"),
    db.from("proveedores").select("*").eq("id", oc.proveedor_id).maybeSingle(),
    db.from("empresas").select("nombre, ajustes").eq("id", oc.empresa_id).maybeSingle(),
    db.from("perfiles_usuarios").select("nombre, email").eq("user_id", quien.user.id).maybeSingle(),
  ]);
  const para = String(oc.email_para || prov?.email || "").trim().toLowerCase();
  if (!emailValido(para)) return error("El proveedor no tiene un email válido. Añádelo en Inventario › Compras.");
  if (!lineas?.length) return error("La orden no tiene líneas.");

  const aj = (emp?.ajustes ?? {}) as Record<string, unknown>;
  const moneda = String(aj.moneda ?? "€"), dec = Number(aj.decimales) === 0 ? 0 : 2;
  const empresa = emp?.nombre ?? "Axioma Flux";
  const firma = (yo?.nombre ? yo.nombre + "\n" : "") + empresa + (yo?.email ? "\n" + yo.email : "");
  const asunto = (oc.asunto || "Orden de compra " + oc.id + " · " + empresa).slice(0, 200);
  const mensaje = String(oc.mensaje || "Hola,\n\nOs enviamos la orden de compra " + oc.id + ". Por favor, confirmad la recepción y la fecha de entrega.\n\nGracias.");

  // Texto plano
  const filasTxt = lineas.map((l: any) => `· ${l.sku}  ${l.nombre}  ×${l.cantidad}  ${dinero(l.cantidad * Number(l.costo), moneda, dec)}`).join("\n");
  const texto = `${mensaje}\n\nOrden de compra ${oc.id} · ${fechaLarga(oc.fecha)}\n` +
    (oc.entrega ? `Entrega solicitada: ${fechaLarga(oc.entrega)}\n` : "") +
    `\n${filasTxt}\n\nTotal (sin IVA): ${dinero(Number(oc.total), moneda, dec)}\n\n--\n${firma}`;

  // HTML: tabla sobria, legible en cualquier cliente de correo
  const filas = lineas.map((l: any, i: number) => `<tr style="background:${i % 2 ? "#F7F9FC" : "#FFFFFF"}">
      <td style="padding:9px 12px;border-bottom:1px solid #E3E9F1;font-family:monospace;font-size:13px;color:#5A6A82">${esc(l.sku)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E3E9F1">${esc(l.nombre)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E3E9F1;text-align:right"><b>${l.cantidad}</b></td>
      <td style="padding:9px 12px;border-bottom:1px solid #E3E9F1;text-align:right;color:#5A6A82">${esc(dinero(Number(l.costo), moneda, dec))}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E3E9F1;text-align:right">${esc(dinero(l.cantidad * Number(l.costo), moneda, dec))}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#F5F8FC;font-family:Arial,Helvetica,sans-serif;color:#0B1324">
  <div style="max-width:680px;margin:0 auto;padding:28px 18px">
    <div style="background:#FFFFFF;border:1px solid #E3E9F1;border-radius:12px;padding:26px">
      <div style="font-size:14px;line-height:1.6;white-space:pre-line">${esc(mensaje)}</div>
      <div style="margin:24px 0 10px;padding-top:18px;border-top:1px solid #E3E9F1">
        <div style="font-size:19px;font-weight:bold">Orden de compra ${esc(oc.id)}</div>
        <div style="font-size:13px;color:#5A6A82;margin-top:4px">${esc(empresa)} · ${esc(fechaLarga(oc.fecha))}${oc.entrega ? " · entrega solicitada el " + esc(fechaLarga(oc.entrega)) : ""}</div>
      </div>
      <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
        <tr style="background:#0B1324;color:#FFFFFF;font-size:12px">
          <th style="padding:9px 12px;text-align:left">SKU</th><th style="padding:9px 12px;text-align:left">Producto</th>
          <th style="padding:9px 12px;text-align:right">Uds.</th><th style="padding:9px 12px;text-align:right">Precio</th><th style="padding:9px 12px;text-align:right">Importe</th></tr>
        ${filas}
        <tr><td colspan="4" style="padding:12px;text-align:right;font-weight:bold">Total (sin IVA)</td>
          <td style="padding:12px;text-align:right;font-weight:bold;font-size:16px">${esc(dinero(Number(oc.total), moneda, dec))}</td></tr>
      </table>
      <div style="margin-top:24px;font-size:13px;color:#5A6A82;white-space:pre-line">${esc(firma)}</div>
    </div>
    <div style="font-size:11px;color:#8FA0BC;text-align:center;margin-top:14px">Enviado con Axioma Flux</div>
  </div></body></html>`;

  const cliente = new SMTPClient({ connection: { hostname: HOST, port: PORT, tls: PORT === 465, auth: { username: USER, password: PASS } } });
  try {
    await cliente.send({
      from: `${empresa.replace(/[<>"]/g, "")} <${FROM}>`,
      to: para,
      replyTo: yo?.email && emailValido(yo.email) ? yo.email : undefined,
      subject: asunto,
      content: texto,
      html,
    });
    await cliente.close();
  } catch (e) {
    try { await cliente.close(); } catch { /* conexión ya cerrada */ }
    const motivo = String((e as Error)?.message ?? e).slice(0, 300);
    await db.from("ordenes_compra").update({ error_envio: motivo }).eq("id", id);
    return error("No se pudo enviar el correo: " + motivo);
  }

  await db.from("ordenes_compra").update({ estado: "Enviada", enviada: new Date().toISOString(), email_para: para, error_envio: "" }).eq("id", id);
  return resp({ ok: true, mensaje: `Orden ${oc.id} enviada a ${para}.` });
});
