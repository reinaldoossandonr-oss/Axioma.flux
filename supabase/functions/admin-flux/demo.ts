// Port fiel de generarDemo_() del Codigo.gs: datos ficticios de ferretería, siempre iguales y relativos a hoy.
// Las fechas se manejan como días UTC (sin hora) para no depender de la zona del servidor.

type Cfg = { peso90: number; pesoAA: number; iva: number; contado: string[]; listas: Record<string, string[]> };

const DIA = 864e5;
const fechaUTC = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const masDias = (f: Date, n: number) => fechaUTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate() + n);
export const iso = (f: Date) => f.toISOString().slice(0, 10);

export function generarDemo(hoy: Date, ubicacionesIds: string[], cfg: Cfg) {
  let semilla = 20261;
  const azar = () => {                                         // Generador determinista (mulberry32)
    semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entre = (a: number, b: number) => a + Math.floor(azar() * (b - a + 1));
  const elegir = <T>(lista: T[]) => lista[Math.floor(azar() * lista.length)];
  const num = (n: number, largo: number) => ('0000' + n).slice(-largo);
  const L = cfg.listas;
  const CATEGORIA = L.CATEGORIA, LINEA = L.LINEA, INTERES = L.INTERES, CANAL_LEAD = L.CANAL_LEAD, TIPO_CONTACTO = L.TIPO_CONTACTO, ETAPA = L.ETAPA;
  const P = 'DEMO-';
  const DEMO_EJECUTIVOS = ['Carla Mendoza', 'Iván Robles', 'Sofía Paredes', 'Hugo Navarro'];

  const CATALOGO: [string, [string, number, number][]][] = [
    ['HE', [['Taladro percutor 800 W', 89.9, 14], ['Amoladora angular 115 mm', 64.5, 12], ['Atornillador inalámbrico 18 V', 119, 16], ['Sierra circular 1400 W', 129, 6], ['Lijadora orbital 300 W', 58.9, 7], ['Martillo demoledor 1500 W', 289, 2]]],
    ['HM', [['Juego de llaves combinadas 12 pzs', 34.9, 18], ['Martillo carpintero 500 g', 14.5, 26], ['Destornilladores set 8 pzs', 19.9, 30], ['Alicate universal 8"', 12.9, 24], ['Flexómetro 5 m', 6.9, 45], ['Nivel de aluminio 60 cm', 16.5, 11]]],
    ['FT', [['Tornillo rosca madera 4×40 (caja 500)', 9.8, 60], ['Taco nylon 8 mm (caja 100)', 5.4, 75], ['Tornillo autoperforante 8×1" (caja 500)', 11.9, 48], ['Perno hexagonal M10 (caja 50)', 13.5, 22], ['Clavo corriente 2½" (kg)', 3.2, 90], ['Anclaje químico 300 ml', 17.9, 9]]],
    ['PA', [['Pintura látex blanco 15 L', 48.9, 20], ['Esmalte sintético negro 4 L', 29.9, 9], ['Silicona neutra transparente 280 ml', 4.9, 85], ['Adhesivo de montaje 370 g', 6.5, 52], ['Rodillo antigota 22 cm', 7.9, 34], ['Barniz marino 1 L', 15.9, 4]]],
    ['EI', [['Cable eléctrico 2,5 mm² (rollo 100 m)', 54.9, 13], ['Foco LED 50 W exterior', 22.9, 19], ['Interruptor automático 16 A', 7.4, 40], ['Regleta 6 tomas con interruptor', 11.9, 28], ['Tubo LED T8 18 W', 5.9, 55], ['Caja de registro estanca', 3.9, 30]]],
    ['JE', [['Manguera reforzada 25 m', 24.9, 15], ['Cortacésped eléctrico 1200 W', 139, 4], ['Tijera de podar bypass', 13.9, 17], ['Carretilla de obra 90 L', 59.9, 6], ['Aspersor oscilante', 12.5, 10], ['Abono universal 5 kg', 9.9, 21]]],
  ];
  const COBERTURA_FINAL = [9, 42, 24, 70, 13, 380, 55, 27, 5, 95, 36, 150, 19, 62, 240, 44, 11, 80];
  const PROVEEDORES = ['Suministros Ibéricos S.L.', 'Ferroglobal Distribución', 'Tornillería Levante', 'Pinturas Sierra S.A.', 'Electro Norte S.L.', 'Verde & Jardín Import'];
  const CLIENTES = ['Construcciones Albor S.L.', 'Reformas Mediterráneo', 'Bricolaje El Pino', 'Instalaciones Duero', 'Ferretería La Llave', 'Grupo Obras Castellana'];
  const RESPONSABLES = ['Marta Giménez', 'Óscar Prieto', 'Lucía Ferrer', 'Daniel Román'];

  type Prod = [string, string, string, string, string, number, number];
  const productos: Prod[] = [], ventas: any[] = [], movimientos: any[] = [], compras: any[] = [], credito: any[] = [];
  const info: any[] = [];
  CATALOGO.forEach((grupo, c) => {
    grupo[1].forEach((p) => {
      const n = productos.length + 1;
      const costo = Math.round(p[1] * (0.52 + azar() * 0.2) * 100) / 100;
      const linea = p[1] > 100 ? (azar() < 0.7 ? 'Profesional' : 'Industrial') : (c === 2 ? elegir(['Profesional', 'Industrial']) : elegir(LINEA));
      const prod: Prod = [P + 'P' + num(n, 3), grupo[0] + '-' + (1000 + n), p[0], CATEGORIA[c] || CATEGORIA[0], linea, p[1], costo];
      productos.push(prod);
      info.push({ prod, base: p[2], cat: c, dias: COBERTURA_FINAL[(n - 1) % COBERTURA_FINAL.length] });
    });
  });

  // Posiciones de la bodega: 2 por producto (3 a uno de cada tres), al azar
  const ubis = ubicacionesIds.slice();
  for (let i = ubis.length - 1; i > 0; i--) { const k = Math.floor(azar() * (i + 1)); const t = ubis[i]; ubis[i] = ubis[k]; ubis[k] = t; }
  const asignacion: Record<string, string> = {};
  let libre = 0;
  info.forEach((p, i) => {
    p.ubis = [];
    const cuantas = i % 3 === 0 ? 3 : 2;
    for (let k = 0; k < cuantas && libre < ubis.length - 12; k++) { asignacion[ubis[libre]] = p.prod[1]; p.ubis.push(ubis[libre]); libre++; }
  });

  const SEMANAS = 66;
  info.forEach((p, i) => {
    const salidas: any[] = [];
    const fase = azar() * 6.28, lento = p.dias > 200;
    for (let s = SEMANAS; s >= 0; s--) {
      if (azar() < (lento ? 0.45 : 0.06)) continue;
      const fecha = masDias(hoy, -(s * 7 + entre(0, 6)));
      if (fecha > hoy) continue;
      const estacion = 1 + 0.28 * Math.sin(s / 52 * 6.28 + fase);
      const tendencia = (i % 4 === 0 ? 0.7 : i % 4 === 1 ? 1.25 : 1) > 1 ? 1 + 0.3 * (1 - s / SEMANAS) : (i % 4 === 0 ? 1.25 - 0.4 * (1 - s / SEMANAS) : 1);
      const cantidad = Math.max(1, Math.round(p.base * (lento ? 0.35 : 1) * estacion * tendencia * (0.7 + azar() * 0.6)));
      const canal = azar() < 0.34 ? 'Distribuidores' : azar() < 0.5 ? 'Tienda' : azar() < 0.65 ? 'Online' : 'Venta directa';
      salidas.push({ fecha, cantidad, tipo: 'Salida Venta', canal });
    }
    for (let k = entre(0, 3); k > 0; k--) {
      salidas.push({ fecha: masDias(hoy, -entre(3, 360)), cantidad: Math.max(1, Math.round(p.base * (0.1 + azar() * 0.35))), tipo: 'Merma / Daño' });
    }
    salidas.sort((a, b) => a.fecha - b.fecha);

    let v90 = 0, vaa = 0;
    salidas.forEach((x) => {
      if (x.tipo !== 'Salida Venta') return;
      const d = Math.round((+hoy - x.fecha) / DIA);
      if (d < 90) v90 += x.cantidad;
      if (d >= 365 && d < 455) vaa += x.cantidad;
    });
    const ritmo = vaa > 0 ? (cfg.peso90 * v90 + cfg.pesoAA * vaa) / 100 / 90 : v90 / 90;
    const stockFinal = Math.max(lento ? p.base * 14 : 2, Math.round(ritmo * p.dias));

    const minimo = Math.max(2, Math.round(p.base * 0.8)), tope = stockFinal + p.base * entre(5, 8);
    const ingresos: any[] = [];
    let s = stockFinal;
    for (let k = salidas.length - 1; k >= 0; k--) {
      s += salidas[k].cantidad;
      if (s > tope && k > 0) { ingresos.push({ fecha: masDias(salidas[k].fecha, -1), cantidad: s - minimo }); s = minimo; }
    }
    ingresos.push({ fecha: masDias(salidas.length ? salidas[0].fecha : hoy, -3), cantidad: s });

    const principal = p.ubis[0] || '';
    ingresos.forEach((x) => {
      movimientos.push([x.fecha, 'Ingreso Existencia', p.prod[1], x.cantidad, '', elegir(p.ubis) || '', elegir(RESPONSABLES), entre(7, 12)]);
      compras.push({ fecha: x.fecha, monto: x.cantidad * p.prod[6], proveedor: PROVEEDORES[p.cat] });
    });
    salidas.forEach((x) => {
      movimientos.push([x.fecha, x.tipo, p.prod[1], x.cantidad, elegir(p.ubis) || principal, '', elegir(RESPONSABLES), entre(13, 18)]);
      if (x.tipo !== 'Salida Venta') return;
      ventas.push([x.fecha, p.prod[0], x.cantidad, x.canal]);
      if (cfg.contado.indexOf(x.canal) === -1) credito.push({ fecha: x.fecha, monto: x.cantidad * p.prod[5], cliente: CLIENTES[(i + x.fecha.getUTCDate()) % CLIENTES.length] });
    });
    if (p.ubis.length > 1 && i % 5 === 0) {
      movimientos.push([masDias(hoy, -entre(2, 40)), 'Transferencia', p.prod[1], Math.max(1, Math.round(p.base / 2)), p.ubis[0], p.ubis[1], elegir(RESPONSABLES), entre(9, 17)]);
    }
  });

  ventas.sort((a, b) => a[0] - b[0]);
  const filasVentas = ventas.map((v, i) => ({ id: P + 'V' + num(i + 1, 4), fecha: iso(v[0]), producto_id: v[1], cantidad: v[2], canal: v[3] }));
  movimientos.sort((a, b) => a[0] - b[0] || a[7] - b[7]);
  const filasMov = movimientos.map((m, i) => ({
    id: P + 'M' + num(i + 1, 4), fecha_hora: iso(m[0]) + ' ' + num(m[7], 2) + ':' + num((i * 7) % 60, 2) + ':00',
    tipo: m[1], sku: m[2], cantidad: m[3], origen: m[4], destino: m[5], responsable: m[6],
  }));

  const cuentas: any[] = [], pagosDe: any[] = [];
  const agrupar = (lista: any[], clave: string, tipo: string, plazo: number[]) => {
    const grupos: Record<string, any> = {};
    lista.forEach((x) => {
      const d = Math.round((+hoy - x.fecha) / DIA);
      if (d > 250) return;
      const k = x[clave] + '|' + Math.floor(d / 15);
      if (!grupos[k]) grupos[k] = { nombre: x[clave], fecha: x.fecha, monto: 0 };
      grupos[k].monto += x.monto;
      if (x.fecha > grupos[k].fecha) grupos[k].fecha = x.fecha;
    });
    Object.keys(grupos).forEach((k) => {
      const g = grupos[k], vence = masDias(g.fecha, elegir(plazo)), neto = Math.round(g.monto * 100) / 100;
      const total = Math.round(neto * (100 + cfg.iva)) / 100, atraso = Math.round((+hoy - +vence) / DIA);
      const r = azar();
      let pagado = 0, cuando: Date | null = null;
      if (atraso > 25 || (atraso > 0 && r < 0.6)) { pagado = total; cuando = masDias(vence, entre(-6, Math.min(12, atraso))); }
      else if (atraso <= 0 && r < (tipo === 'Pago Proveedor' ? 0.4 : 0.1)) { pagado = total; cuando = masDias(hoy, -entre(0, 8)); }
      else if (r > 0.86) { pagado = Math.round(total * 0.4 * 100) / 100; cuando = masDias(hoy, -entre(1, 12)); }
      if (cuando && cuando < g.fecha) cuando = g.fecha;
      if (cuando && cuando > hoy) cuando = hoy;
      cuentas.push({ tipo, emision: g.fecha, vence, neto, contraparte: g.nombre, iva: cfg.iva, pagado, cuando });
    });
  };
  agrupar(credito, 'cliente', 'Cobro Cliente', [30, 30, 45, 60]);
  agrupar(compras, 'proveedor', 'Pago Proveedor', [30, 45, 60]);
  cuentas.sort((a, b) => a.emision - b.emision);
  let nEmitida = 0, nRecibida = 0;
  const filasCuentas = cuentas.map((c, i) => {
    const id = P + 'T' + num(i + 1, 3), emitida = c.tipo === 'Cobro Cliente';
    const numero = emitida ? 'F' + c.emision.getUTCFullYear() + '-' + num(++nEmitida, 4) : 'PR-' + num(4200 + (++nRecibida) * 7, 5);
    if (c.pagado) pagosDe.push([id, c.cuando, c.pagado, elegir(emitida ? ['Transferencia', 'Transferencia', 'Confirming', 'Domiciliación'] : ['Transferencia', 'Domiciliación'])]);
    return { id, tipo: c.tipo, emision: iso(c.emision), vence: iso(c.vence), neto: c.neto, contraparte: c.contraparte, numero, iva: c.iva };
  });
  pagosDe.sort((a, b) => a[1] - b[1]);
  const filasPagos = pagosDe.map((p, i) => ({ id: P + 'C' + num(i + 1, 3), cuenta_id: p[0], fecha: iso(p[1]), monto: p[2], metodo: p[3] }));

  const EMPRESAS = ['Construcciones Albor', 'Reformas Mediterráneo', 'Bricolaje El Pino', 'Instalaciones Duero', 'Ferretería La Llave', 'Grupo Obras Castellana', 'Talleres Montaña', 'Electricidad Ribera', 'Jardines del Sur', 'Mantenimientos Atlas', 'Carpintería Roble', 'Fontanería Levante', 'Pinturas Aurora', 'Montajes Ebro', 'Suministros Navales Cies', 'Cubiertas Tajo', 'Climatización Polar', 'Cerrajería Segura', 'Obras Públicas Teide', 'Hotel Bahía Azul', 'Residencial Los Olmos', 'Agroservicios Vega', 'Industrias Metálicas Forja', 'Logística Punto Norte', 'Comunidad Parque Real', 'Reparaciones Exprés 24', 'Vidrios y Aluminios Sol', 'Piscinas Costa Clara', 'Cooperativa San Isidro', 'Estudio Arq. Línea Recta'];
  const NOMBRES = ['Javier Ortega', 'Nuria Campos', 'Andrés Molina', 'Beatriz Soler', 'Raúl Gil', 'Elena Vidal', 'Tomás Herrero', 'Irene Pastor', 'Sergio Lozano', 'Patricia Rey'];
  const NOTAS = ['Compra hoy a un competidor; pide mejor plazo de entrega.', 'Quiere tarifa por volumen y entrega semanal.', 'Necesita crédito a 60 días.', 'Interesado en fijaciones y herramienta eléctrica.', 'Pide muestra y catálogo actualizado.', 'Abre obra nueva el mes próximo.', 'Compara precios con dos proveedores.', 'Solicita reparto en obra antes de las 8:00.'];
  const RESUMENES = ['Primera llamada: se presenta la empresa y el catálogo.', 'Se envía tarifa y condiciones de entrega.', 'Reunión para revisar volúmenes mensuales.', 'Pide ajustar el precio de fijaciones.', 'Se envía propuesta formal por email.', 'Seguimiento: revisando la propuesta con compras.', 'Visita a sus instalaciones.', 'Confirma interés; falta aprobar el crédito.'];
  const leads: any[] = [], bitacora: any[] = [];
  const PESOS = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5];
  for (let i = 0; i < 64; i++) {
    const antig = entre(1, 120), ingreso = masDias(hoy, -antig);
    const etapa = antig < 10 ? elegir([0, 0, 1]) : antig < 30 ? elegir([0, 1, 1, 2, 2, 3]) : elegir(PESOS.slice(antig > 60 ? 6 : 3));
    const ejecutivo = DEMO_EJECUTIVOS[(i * 7 + (i % 3)) % DEMO_EJECUTIVOS.length];
    const monto = Math.round(entre(12, 140) * (i % 9 === 0 ? 2 : 1)) * 100;
    const cerrado = etapa >= 4, cierre = cerrado ? masDias(ingreso, Math.min(antig, entre(12, 45))) : null;
    const id = P + 'L' + num(i + 1, 3), empresa = EMPRESAS[i % EMPRESAS.length] + (i >= EMPRESAS.length ? ' ' + ['Norte', 'Sur', 'II'][Math.floor(i / EMPRESAS.length) % 3] : '') + ' S.L.';
    leads.push({ id, fecha: ingreso, cliente: empresa, contacto: elegir(NOMBRES), telefono: '6' + entre(10000000, 99999999), interes: elegir(INTERES),
      etapa: ETAPA[etapa], ejecutivo, monto, canal: elegir(CANAL_LEAD), cierre, notas: elegir(NOTAS) });
    const hasta = cerrado ? Math.round((+hoy - +cierre!) / DIA) : (i % 4 === 0 ? Math.min(antig, entre(9, 20)) : entre(0, Math.min(antig, 6)));
    const n = etapa === 0 ? (i % 2) : Math.min(etapa, 4) + (i % 2);
    for (let k = 0; k < n; k++) {
      const dia = Math.round(antig - (antig - hasta) * (k + 1) / n);
      bitacora.push([id, masDias(hoy, -dia), elegir(TIPO_CONTACTO), RESUMENES[Math.min(RESUMENES.length - 1, k * 2 + (i % 2))], ejecutivo]);
    }
  }
  leads.sort((a, b) => a.fecha - b.fecha);
  const filasLeads = leads.map((l) => ({ ...l, fecha: iso(l.fecha), cierre: l.cierre ? iso(l.cierre) : null }));
  bitacora.sort((a, b) => a[1] - b[1]);
  const filasBitacora = bitacora.map((b, i) => ({ id: P + 'B' + num(i + 1, 3), lead_id: b[0], fecha: iso(b[1]), tipo: b[2], resumen: b[3], ejecutivo: b[4] }));
  const metas: any[] = [];
  for (let m = 3; m >= -1; m--) {
    DEMO_EJECUTIVOS.forEach((e, k) => {
      metas.push({ id: P + 'O' + num(metas.length + 1, 3), mes: iso(fechaUTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - m, 1)), ejecutivo: e, meta: [16000, 14000, 12000, 9000][k] });
    });
  }

  const FIJOS: [string, string, number, number][] = [['Arriendo de bodega', 'Inmobiliaria Logística Sur', 5200, 0], ['Personal de bodega', 'Nóminas operación', 9800, 0.04],
    ['Transporte y fletes', 'Transportes Rápidos del Este', 3100, 0.3], ['Seguros', 'Mutua Empresarial', 640, 0],
    ['Energía y suministros', 'Energía Clara', 980, 0.25], ['Embalaje y consumibles', 'Embalajes Roca', 620, 0.35]];
  const gastos: any[] = [];
  for (let m = 14; m >= 0; m--) {
    const mes = fechaUTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - m, 1);
    FIJOS.forEach((g, k) => {
      const fecha = fechaUTC(mes.getUTCFullYear(), mes.getUTCMonth(), [1, 28, 15, 5, 12, 20][k]);
      if (fecha > hoy) return;
      gastos.push([g[0], g[1], Math.round(g[2] * (1 + (azar() - 0.5) * 2 * g[3])), fecha]);
    });
    if (m % 3 === 1) {
      const fecha = fechaUTC(mes.getUTCFullYear(), mes.getUTCMonth(), 18);
      if (fecha <= hoy) gastos.push(['Mantenimiento de equipos', 'Carretillas Hispania', entre(450, 1400), fecha]);
    }
  }
  gastos.sort((a, b) => a[3] - b[3]);
  const filasGastos = gastos.map((g, i) => ({ id: P + 'G' + num(i + 1, 3), categoria: g[0], proveedor: g[1], monto: g[2], fecha: iso(g[3]) }));

  return {
    productos: productos.map((p) => ({ id: p[0], sku: p[1], nombre: p[2], categoria: p[3], linea: p[4], precio: p[5], costo: p[6] })),
    ventas: filasVentas, movimientos: filasMov, cuentas: filasCuentas, pagos: filasPagos, gastos: filasGastos,
    leads: filasLeads, bitacora: filasBitacora, metas, asignacion,
  };
}
