// Axioma Flux · PDF de la orden de compra (A4) que se adjunta al correo.
import { PDFDocument, PDFFont, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export interface DatosPdf {
  id: string; fecha: string; entrega: string; empresa: string; proveedor: string; contacto: string; para: string;
  mensaje: string; firma: string; total: number;
  lineas: { sku: string; nombre: string; cantidad: number; costo: number }[];
  dinero: (n: number) => string; fecha_larga: (iso: string) => string;
}

const TINTA = rgb(0.043, 0.075, 0.141), SUAVE = rgb(0.353, 0.416, 0.51), LINEA = rgb(0.89, 0.914, 0.945), FONDO = rgb(0.969, 0.976, 0.988), AZUL = rgb(0.039, 0.576, 0.839);

// Las fuentes estándar del PDF solo admiten WinAnsi: se sustituyen los signos tipográficos que no caben
const CAMBIOS: Record<string, string> = { "−": "-", "–": "-", "—": "-", "″": "\"", "′": "'", "“": "\"", "”": "\"", "‘": "'", "’": "'", "…": "...", "\u00a0": " ", "\u202f": " ", "→": "->", "✦": "*" };
function limpio(f: PDFFont, t: string) {
  let r = "";
  for (const ch of String(t ?? "")) {
    const c = CAMBIOS[ch] ?? ch;
    try { f.widthOfTextAtSize(c, 10); r += c; } catch { r += "?"; }
  }
  return r;
}
function partir(f: PDFFont, t: string, tam: number, ancho: number) {
  const out: string[] = [];
  for (const crudo of String(t ?? "").split(/\r?\n/)) {
    const parrafo = limpio(f, crudo);
    let linea = "";
    for (const pal of parrafo.split(" ")) {
      const prueba = linea ? linea + " " + pal : pal;
      if (f.widthOfTextAtSize(prueba, tam) <= ancho) linea = prueba;
      else { if (linea) out.push(linea); linea = pal; }
    }
    out.push(linea);
  }
  return out;
}

export async function pdfOrden(d: DatosPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Orden de compra " + d.id); doc.setAuthor(d.empresa); doc.setCreator("Axioma Flux");
  const n = await doc.embedFont(StandardFonts.Helvetica), b = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 48, ancho = W - 2 * M;
  let pag = doc.addPage([W, H]), y = H - M;
  const txt = (t: string, x: number, yy: number, tam = 10, f = n, color = TINTA) => pag.drawText(limpio(f, t), { x, y: yy, size: tam, font: f, color });
  const der = (t: string, xd: number, yy: number, tam = 10, f = n, color = TINTA) => { const s = limpio(f, t); pag.drawText(s, { x: xd - f.widthOfTextAtSize(s, tam), y: yy, size: tam, font: f, color }); };

  // Cabecera: empresa y número a la izquierda, proveedor a la derecha
  pag.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: AZUL });
  txt(d.empresa, M, y - 4, 11, b, SUAVE);
  txt("Orden de compra", M, y - 30, 22, b);
  txt(d.id, M, y - 50, 13, n, AZUL);
  txt("Fecha: " + d.fecha_larga(d.fecha), M, y - 70, 9.5, n, SUAVE);
  if (d.entrega) txt("Entrega solicitada: " + d.fecha_larga(d.entrega), M, y - 84, 9.5, n, SUAVE);
  const xb = W - M - 210;
  pag.drawRectangle({ x: xb, y: y - 92, width: 210, height: 84, color: FONDO, borderColor: LINEA, borderWidth: 1 });
  txt("PROVEEDOR", xb + 12, y - 24, 8, b, SUAVE);
  partir(b, d.proveedor, 11, 186).slice(0, 2).forEach((l, i) => txt(l, xb + 12, y - 40 - i * 13, 11, b));
  if (d.contacto) txt("A la atención de " + d.contacto, xb + 12, y - 68, 9, n, SUAVE);
  txt(d.para, xb + 12, y - 81, 9, n, SUAVE);
  y -= 118;

  // Mensaje
  if (d.mensaje) {
    for (const l of partir(n, d.mensaje, 10, ancho)) { txt(l, M, y, 10); y -= 14; }
    y -= 10;
  }

  // Tabla
  const col = { sku: M + 8, prod: M + 88, uds: M + ancho - 190, precio: M + ancho - 100, imp: M + ancho - 8 };
  const cabecera = () => {
    pag.drawRectangle({ x: M, y: y - 8, width: ancho, height: 24, color: TINTA });
    txt("SKU", col.sku, y, 9, b, rgb(1, 1, 1)); txt("Producto", col.prod, y, 9, b, rgb(1, 1, 1));
    der("Uds.", col.uds, y, 9, b, rgb(1, 1, 1)); der("Precio", col.precio, y, 9, b, rgb(1, 1, 1)); der("Importe", col.imp, y, 9, b, rgb(1, 1, 1));
    y -= 26;
  };
  cabecera();
  d.lineas.forEach((l, i) => {
    const nombre = partir(n, l.nombre, 9.5, col.uds - 40 - col.prod), alto = Math.max(1, nombre.length) * 12 + 10;
    if (y - alto < M + 90) { pag = doc.addPage([W, H]); y = H - M; cabecera(); }
    if (i % 2) pag.drawRectangle({ x: M, y: y - alto + 14, width: ancho, height: alto, color: FONDO });
    txt(l.sku, col.sku, y, 9, n, SUAVE);
    nombre.forEach((t, k) => txt(t, col.prod, y - k * 12, 9.5));
    der(String(l.cantidad), col.uds, y, 9.5, b);
    der(d.dinero(l.costo), col.precio, y, 9.5, n, SUAVE);
    der(d.dinero(l.cantidad * l.costo), col.imp, y, 9.5);
    y -= alto;
    pag.drawLine({ start: { x: M, y: y + 14 }, end: { x: M + ancho, y: y + 14 }, thickness: 0.6, color: LINEA });
  });
  y -= 8;
  der("Total (sin IVA)", col.precio, y, 11, b);
  der(d.dinero(d.total), col.imp, y, 13, b);
  y -= 40;

  // Firma
  if (y < M + 60) { pag = doc.addPage([W, H]); y = H - M; }
  for (const l of partir(n, d.firma, 9.5, ancho)) { txt(l, M, y, 9.5, n, SUAVE); y -= 13; }

  // Pie con número de página
  const pags = doc.getPages();
  pags.forEach((p, i) => {
    const t = limpio(n, "Orden " + d.id + " · página " + (i + 1) + " de " + pags.length + " · generada con Axioma Flux");
    p.drawText(t, { x: (W - n.widthOfTextAtSize(t, 8)) / 2, y: 24, size: 8, font: n, color: SUAVE });
  });
  return await doc.save();
}
