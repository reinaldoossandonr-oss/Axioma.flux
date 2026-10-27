/**
 * AXIOMA · BODEGA & DISTRIBUCIÓN
 * Comercial, Inventario, Posiciones (bodega 3D) y Finanzas sobre Google Sheets.
 *
 * CÓMO SE USA
 *  1. Pega este archivo como Codigo.gs y el panel como App.html (Extensiones > Apps Script).
 *  2. Ejecuta crearTodo() una vez: crea las pestañas, formatos, validaciones, fórmulas,
 *     las ubicaciones de la bodega y (si está vacío) los datos de ejemplo.
 *  3. Recarga la hoja: aparece el menú "Bodega" > Abrir panel.
 */

/* ===================== PASO 0 · CONFIGURACIÓN ===================== */
const CONFIG = {
  TITULO: 'Axioma · Bodega & Distribución',
  FORMATO_MONEDA: '#,##0.00 "€"',
  FORMATO_FECHA: 'dd/mm/yyyy',
  FORMATO_FECHAHORA: 'dd/mm/yyyy hh:mm',
  FORMATO_MES: 'mm/yyyy',
  FORMATO_HORA: 'hh:mm',
  FORMATO_ENTERO: '#,##0',
  FORMATO_NUMERO: '#,##0.00',
  FORMATO_PORCENTAJE: '0.0%',
  COLOR_CABECERA: '#0B1324',
  COLOR_TEXTO_CABECERA: '#FFFFFF',
  COLOR_CALCULADO: '#F3F4F6',
  ROJO: '#FECACA', AMARILLO: '#FEF3C7', VERDE: '#BBF7D0',

  // --- Predicción de quiebre ---
  PESO_ULTIMOS_90: 70,          // % de peso de la venta de los últimos 90 días en el ritmo diario
  PESO_ANO_ANTERIOR: 30,        // % de peso del mismo periodo del año anterior (deben sumar 100)
  DIAS_CRITICO: 15,             // Menos días de stock: 🔴 Crítico
  DIAS_PRECAUCION: 30,          // Menos días de stock: 🟡 Precaución
  // --- Inventario óptimo ---
  COBERTURA_POR_DEFECTO: 30,    // Días de cobertura si la categoría no tiene un valor definido
  // --- Rotación (según los días que tardaría en venderse el stock actual) ---
  ROTACION_ALTA_DIAS: 45,       // Hasta estos días: rotación Alta
  ROTACION_MEDIA_DIAS: 120,     // Hasta estos días: Media. Por encima (o sin ventas): Baja
  // --- Finanzas ---
  IVA_PCT: 21,                  // IVA por defecto de las facturas (%)
  CANALES_CONTADO: ['Tienda', 'Online'],  // Canales que cobran al momento: entran al flujo de caja el día de la venta
  MESES_FLUJO_PASADOS: 6,       // Meses reales que muestra el flujo de caja mensual
  MESES_FLUJO_FUTUROS: 3,       // Meses previstos (según el vencimiento de las facturas pendientes)
  SALDO_INICIAL_CAJA: 30000,    // Caja al empezar el primer mes que muestra el flujo
  // --- Comercial ---
  DIAS_LEAD_SIN_CONTACTO: 7,    // Más días sin contacto con un prospecto abierto: alerta
  // --- Bodega que crea crearTodo() si el maestro está vacío ---
  BODEGA: { PASILLOS: ['A', 'B', 'C', 'D'], RACKS: 6, NIVELES: 4, ANCHO: 1.45, ALTO: 1.5, SEPARACION: 3.6 },
  CARGAR_EJEMPLO_AL_CREAR: true,
};

const HOJA = {
  CAT: '[COM] Catálogo & Líneas de Producto',
  VEN: '[COM] Historial de Ventas & Pedidos',
  UBI: '[LOG] Maestro de Bodega & Ubicaciones',
  MOV: '[LOG] Movimientos de Inventario',
  STK: '[LOG] Control de Stock & Predicción de Quiebre',
  COB: '[LOG] Cobertura por Categoría',
  CXC: '[FIN] Cuentas por Cobrar & Pagar',
  PAG: '[FIN] Registro de Cobros & Pagos',
  LEA: '[COM] Prospectos & Embudo de Ventas',
  BIT: '[COM] Bitácora de Contactos',
  MET: '[COM] Metas por Ejecutivo',
  GAS: '[FIN] Gastos Operativos & Costos de Bodegaje',
};

const LISTAS = {
  CATEGORIA: ['Herramientas eléctricas', 'Herramientas manuales', 'Fijaciones y tornillería', 'Pinturas y adhesivos', 'Electricidad e iluminación', 'Jardín y exterior'],
  LINEA: ['Profesional', 'Hogar', 'Industrial'],
  CANAL: ['Tienda', 'Online', 'Distribuidores', 'Venta directa'],
  TIPO_MOV: ['Ingreso Existencia', 'Salida Venta', 'Merma / Daño', 'Transferencia'],
  TIPO_CUENTA: ['Cobro Cliente', 'Pago Proveedor'],
  ESTADO_CUENTA: ['Pendiente', 'Parcial', 'Pagado'],              // Lo calcula la hoja con los cobros y pagos registrados
  METODO_PAGO: ['Transferencia', 'Domiciliación', 'Tarjeta', 'Confirming', 'Efectivo'],
  ETAPA: ['1. Prospecto', '2. Contactado', '3. Propuesta enviada', '4. Negociación', '5. Ganado', '6. Perdido'],
  INTERES: ['Suministro recurrente', 'Pedido puntual / proyecto', 'Distribución mayorista', 'Almacenaje y bodegaje', 'Venta online B2B'],
  CANAL_LEAD: ['Referido', 'Web / formulario', 'Llamada en frío', 'Feria o evento', 'LinkedIn', 'Visita comercial'],
  TIPO_CONTACTO: ['Llamada', 'Email', 'Reunión', 'WhatsApp', 'Visita'],
  GASTO: ['Arriendo de bodega', 'Personal de bodega', 'Transporte y fletes', 'Seguros', 'Energía y suministros', 'Mantenimiento de equipos', 'Embalaje y consumibles', 'Otros'],
};

/* ===================== PASO 1 · TABLAS ===================== */
const P90 = CONFIG.PESO_ULTIMOS_90, PAA = CONFIG.PESO_ANO_ANTERIOR;
const PESTANAS = [
  { nombre: HOJA.CAT, columnas: [
    { nombre: 'ID_Producto', tipo: 'texto', ancho: 120 },
    { nombre: 'SKU', tipo: 'texto', ancho: 110 },
    { nombre: 'Nombre_Producto', tipo: 'texto', ancho: 280 },
    { nombre: 'Categoria', tipo: 'texto', ancho: 200, lista: LISTAS.CATEGORIA, flexible: true },
    { nombre: 'Linea_Negocio', tipo: 'texto', ancho: 130, lista: LISTAS.LINEA, flexible: true },
    { nombre: 'Precio_Venta', tipo: 'moneda', ancho: 120 },
    { nombre: 'Costo_Unitario_Estandar', tipo: 'moneda', ancho: 170 },
  ] },
  { nombre: HOJA.VEN, columnas: [
    { nombre: 'ID_Venta', tipo: 'texto', ancho: 130 },
    { nombre: 'Fecha', tipo: 'fecha', ancho: 110 },
    { nombre: 'ID_Producto', tipo: 'texto', ancho: 120, listaDe: { hoja: HOJA.CAT, columna: 1 } },
    { nombre: 'Cantidad_Vendida', tipo: 'entero', ancho: 140 },
    { nombre: 'Canal_Venta', tipo: 'texto', ancho: 130, lista: LISTAS.CANAL },
    { nombre: 'Margen_Unitario', tipo: 'moneda', ancho: 130,
      formula: '=ARRAYFORMULA(IF(C2:C="";;IFERROR(VLOOKUP(C2:C;' + ref_(HOJA.CAT, 'A2:G') + ';6;FALSE)-VLOOKUP(C2:C;' + ref_(HOJA.CAT, 'A2:G') + ';7;FALSE))))' },
  ] },
  { nombre: HOJA.LEA, columnas: [
    { nombre: 'ID_Lead', tipo: 'texto', ancho: 130 },
    { nombre: 'Fecha_Ingreso', tipo: 'fecha', ancho: 120 },
    { nombre: 'Empresa', tipo: 'texto', ancho: 230 },
    { nombre: 'Contacto', tipo: 'texto', ancho: 170 },
    { nombre: 'Telefono_Email', tipo: 'texto', ancho: 200 },
    { nombre: 'Interes', tipo: 'texto', ancho: 200, lista: LISTAS.INTERES, flexible: true },
    { nombre: 'Etapa', tipo: 'texto', ancho: 170, lista: LISTAS.ETAPA },
    { nombre: 'Ejecutivo', tipo: 'texto', ancho: 160 },
    { nombre: 'Monto_Estimado', tipo: 'moneda', ancho: 140 },
    { nombre: 'Canal_Captacion', tipo: 'texto', ancho: 150, lista: LISTAS.CANAL_LEAD, flexible: true },
    { nombre: 'Fecha_Cierre', tipo: 'fecha', ancho: 120 },
    { nombre: 'Notas', tipo: 'texto', ancho: 280 },
    { nombre: 'Dias_Sin_Contacto', tipo: 'entero', ancho: 150,
      formula: '=MAP(A2:A;B2:B;G2:G;LAMBDA(id;f;e;IF(id="";;IF(LEFT(e;1)>"4";;TODAY()-MAX(f;MAXIFS(' + ref_(HOJA.BIT, 'C2:C') + ';' + ref_(HOJA.BIT, 'B2:B') + ';id))))))' },
  ] },
  { nombre: HOJA.BIT, columnas: [
    { nombre: 'ID_Contacto', tipo: 'texto', ancho: 130 },
    { nombre: 'ID_Lead', tipo: 'texto', ancho: 130, listaDe: { hoja: HOJA.LEA, columna: 1 }, flexible: true },
    { nombre: 'Fecha', tipo: 'fecha', ancho: 110 },
    { nombre: 'Tipo_Contacto', tipo: 'texto', ancho: 130, lista: LISTAS.TIPO_CONTACTO, flexible: true },
    { nombre: 'Resumen', tipo: 'texto', ancho: 380 },
    { nombre: 'Ejecutivo', tipo: 'texto', ancho: 160 },
  ] },
  { nombre: HOJA.MET, columnas: [
    { nombre: 'ID_Meta', tipo: 'texto', ancho: 130 },
    { nombre: 'Mes', tipo: 'mes', ancho: 100 },
    { nombre: 'Ejecutivo', tipo: 'texto', ancho: 170 },
    { nombre: 'Meta_Ventas', tipo: 'moneda', ancho: 140 },
  ] },
  { nombre: HOJA.UBI, columnas: [
    { nombre: 'ID_Ubicacion', tipo: 'texto', ancho: 120 },
    { nombre: 'Pasillo', tipo: 'texto', ancho: 80 },
    { nombre: 'Rack', tipo: 'entero', ancho: 70 },
    { nombre: 'Nivel', tipo: 'entero', ancho: 70 },
    { nombre: 'Posicion_ID', tipo: 'texto', ancho: 110 },
    { nombre: 'Coordenada_X', tipo: 'numero', ancho: 115 },
    { nombre: 'Coordenada_Y', tipo: 'numero', ancho: 115 },
    { nombre: 'Coordenada_Z', tipo: 'numero', ancho: 115 },
    { nombre: 'Estado_Disponibilidad', tipo: 'general', ancho: 160,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IF(J2:J="";"Libre";"Ocupado")))' },
    // flexible: si el catálogo se acaba de cargar, una validación estricta rechazaba la asignación
    { nombre: 'SKU_Asignado', tipo: 'texto', ancho: 120, listaDe: { hoja: HOJA.CAT, columna: 2 }, flexible: true },
  ] },
  { nombre: HOJA.MOV, columnas: [
    { nombre: 'ID_Movimiento', tipo: 'texto', ancho: 140 },
    { nombre: 'Fecha_Hora', tipo: 'fechahora', ancho: 150 },
    { nombre: 'Tipo_Movimiento', tipo: 'texto', ancho: 160, lista: LISTAS.TIPO_MOV },
    { nombre: 'SKU', tipo: 'texto', ancho: 110, listaDe: { hoja: HOJA.CAT, columna: 2 } },
    { nombre: 'Cantidad', tipo: 'entero', ancho: 100 },
    { nombre: 'ID_Ubicacion_Origen', tipo: 'texto', ancho: 160, listaDe: { hoja: HOJA.UBI, columna: 1 } },
    { nombre: 'ID_Ubicacion_Destino', tipo: 'texto', ancho: 160, listaDe: { hoja: HOJA.UBI, columna: 1 } },
    { nombre: 'Responsable', tipo: 'texto', ancho: 160 },
  ] },
  // Tabla calculada entera: una fila por SKU del catálogo. No se escribe en ella.
  { nombre: HOJA.STK, calculada: true, columnas: [
    { nombre: 'SKU', tipo: 'general', ancho: 110,
      formula: '=ARRAYFORMULA(IF(' + ref_(HOJA.CAT, 'B2:B') + '="";;' + ref_(HOJA.CAT, 'B2:B') + '))' },
    { nombre: 'Stock_Actual', tipo: 'entero', ancho: 110,
      formula: '=MAP(A2:A;LAMBDA(s;IF(s="";;SUMIFS(' + ref_(HOJA.MOV, 'E2:E') + ';' + ref_(HOJA.MOV, 'D2:D') + ';s;' + ref_(HOJA.MOV, 'C2:C') + ';"Ingreso Existencia")' +
        '-SUMIFS(' + ref_(HOJA.MOV, 'E2:E') + ';' + ref_(HOJA.MOV, 'D2:D') + ';s;' + ref_(HOJA.MOV, 'C2:C') + ';"Salida Venta")' +
        '-SUMIFS(' + ref_(HOJA.MOV, 'E2:E') + ';' + ref_(HOJA.MOV, 'D2:D') + ';s;' + ref_(HOJA.MOV, 'C2:C') + ';"Merma / Daño"))))' },
    { nombre: 'Venta_Ultimos_90_Dias', tipo: 'entero', ancho: 170,
      formula: '=MAP(A2:A;LAMBDA(s;IF(s="";;SUMIFS(' + ref_(HOJA.VEN, 'D2:D') + ';' + ref_(HOJA.VEN, 'C2:C') + ';IFERROR(INDEX(' + ref_(HOJA.CAT, 'A2:A') + ';MATCH(s;' + ref_(HOJA.CAT, 'B2:B') + ';0));"-");' +
        ref_(HOJA.VEN, 'B2:B') + ';">"&TODAY()-90;' + ref_(HOJA.VEN, 'B2:B') + ';"<="&TODAY()))))' },
    { nombre: 'Venta_Mismo_Periodo_Ano_Anterior', tipo: 'entero', ancho: 230,
      formula: '=MAP(A2:A;LAMBDA(s;IF(s="";;SUMIFS(' + ref_(HOJA.VEN, 'D2:D') + ';' + ref_(HOJA.VEN, 'C2:C') + ';IFERROR(INDEX(' + ref_(HOJA.CAT, 'A2:A') + ';MATCH(s;' + ref_(HOJA.CAT, 'B2:B') + ';0));"-");' +
        ref_(HOJA.VEN, 'B2:B') + ';">"&TODAY()-455;' + ref_(HOJA.VEN, 'B2:B') + ';"<="&TODAY()-365))))' },
    { nombre: 'Ritmo_Venta_Diario_Ponderado', tipo: 'numero', ancho: 210,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IF(D2:D>0;(' + P90 + '*C2:C+' + PAA + '*D2:D)/100/90;C2:C/90)))' },
    { nombre: 'Dias_Stock_Restantes', tipo: 'entero', ancho: 160,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IF(E2:E=0;;ROUND(B2:B/E2:E))))' },
    { nombre: 'Alerta_Quiebre', tipo: 'general', ancho: 150,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IF(E2:E=0;"⚪ Sin ventas";IF(F2:F<' + CONFIG.DIAS_CRITICO + ';"🔴 Crítico";IF(F2:F<' + CONFIG.DIAS_PRECAUCION + ';"🟡 Precaución";"🟢 Seguro")))))' },
    { nombre: 'Categoria', tipo: 'general', ancho: 200,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IFERROR(VLOOKUP(A2:A;' + ref_(HOJA.CAT, 'B2:D') + ';3;FALSE))))' },
    { nombre: 'Dias_Cobertura_Objetivo', tipo: 'entero', ancho: 180,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IFERROR(VLOOKUP(H2:H;' + ref_(HOJA.COB, 'A2:B') + ';2;FALSE);' + CONFIG.COBERTURA_POR_DEFECTO + ')))' },
    { nombre: 'Inventario_Optimo', tipo: 'entero', ancho: 150,
      formula: '=ARRAYFORMULA(IF(A2:A="";;ROUNDUP(E2:E*I2:I;0)))' },
    { nombre: 'Unidades_a_Reponer', tipo: 'entero', ancho: 160,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IF(J2:J>B2:B;J2:J-B2:B;0)))' },
  ] },
  { nombre: HOJA.COB, columnas: [
    { nombre: 'Categoria', tipo: 'texto', ancho: 220 },
    { nombre: 'Dias_Cobertura', tipo: 'entero', ancho: 140 },
  ] },
  { nombre: HOJA.CXC, columnas: [
    { nombre: 'ID_Transaccion', tipo: 'texto', ancho: 140 },
    { nombre: 'Tipo', tipo: 'texto', ancho: 140, lista: LISTAS.TIPO_CUENTA },
    { nombre: 'Fecha_Emision', tipo: 'fecha', ancho: 120 },
    { nombre: 'Fecha_Vencimiento', tipo: 'fecha', ancho: 140 },
    { nombre: 'Monto_Neto', tipo: 'moneda', ancho: 130 },
    { nombre: 'Estado', tipo: 'general', ancho: 110,
      formula: '=ARRAYFORMULA(IF(A2:A="";;IF(ROUND((J2:J-K2:K)*100)<=0;"Pagado";IF(K2:K>0;"Parcial";"Pendiente"))))' },
    { nombre: 'Contraparte', tipo: 'texto', ancho: 220 },
    { nombre: 'N_Factura', tipo: 'texto', ancho: 130 },
    { nombre: 'IVA_Pct', tipo: 'entero', ancho: 90 },
    { nombre: 'Total_Factura', tipo: 'moneda', ancho: 140,
      formula: '=ARRAYFORMULA(IF(A2:A="";;ROUND(E2:E*(100+I2:I)/100;2)))' },
    { nombre: 'Monto_Pagado', tipo: 'moneda', ancho: 140,
      formula: '=ARRAYFORMULA(IF(A2:A="";;SUMIF(' + ref_(HOJA.PAG, 'B2:B') + ';A2:A;' + ref_(HOJA.PAG, 'D2:D') + ')))' },
    { nombre: 'Saldo_Pendiente', tipo: 'moneda', ancho: 150,
      formula: '=ARRAYFORMULA(IF(A2:A="";;J2:J-K2:K))' },
  ] },
  { nombre: HOJA.PAG, columnas: [
    { nombre: 'ID_Pago', tipo: 'texto', ancho: 130 },
    { nombre: 'ID_Transaccion', tipo: 'texto', ancho: 140, listaDe: { hoja: HOJA.CXC, columna: 1 }, flexible: true },
    { nombre: 'Fecha', tipo: 'fecha', ancho: 110 },
    { nombre: 'Monto', tipo: 'moneda', ancho: 130 },
    { nombre: 'Metodo', tipo: 'texto', ancho: 140, lista: LISTAS.METODO_PAGO, flexible: true },
  ] },
  { nombre: HOJA.GAS, columnas: [
    { nombre: 'ID_Gasto', tipo: 'texto', ancho: 130 },
    { nombre: 'Categoria', tipo: 'texto', ancho: 200, lista: LISTAS.GASTO, flexible: true },
    { nombre: 'Proveedor', tipo: 'texto', ancho: 220 },
    { nombre: 'Monto', tipo: 'moneda', ancho: 120 },
    { nombre: 'Fecha', tipo: 'fecha', ancho: 110 },
  ] },
];

/* ===================== PASO 2 · CREACIÓN ===================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bodega')
    .addItem('Abrir panel', 'abrirApp')
    .addSeparator()
    .addItem('Crear / reparar todo', 'crearTodo')
    .addItem('Cargar datos de ejemplo', 'cargarDatosDemo')
    .addItem('Borrar datos de ejemplo', 'borrarDatosDemo')
    .addSeparator()
    .addItem('Conectar formulario de prospectos', 'conectarFormulario')
    .addItem('Importar respuestas del formulario', 'importarRespuestasFormulario')
    .addItem('Desconectar formulario', 'desconectarFormulario')
    .addSeparator()
    .addItem('Abrir el panel al entrar', 'activarAperturaAutomatica')
    .addItem('No abrir el panel al entrar', 'desactivarAperturaAutomatica')
    .addToUi();
}

function crearTodo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PESTANAS.forEach(function (p) { obtenerOCrearHoja_(ss, p.nombre); });
  PESTANAS.forEach(function (p) {
    const hoja = ss.getSheetByName(p.nombre);
    escribirEncabezados_(hoja, p.columnas);
    aplicarFormatos_(hoja, p.columnas);
    aplicarValidaciones_(hoja, p.columnas);
    aplicarFormulas_(hoja, p.columnas);
  });
  aplicarSemaforos_(ss);
  const nuevas = crearUbicaciones_(ss);
  crearCoberturas_(ss);
  SpreadsheetApp.flush();
  let ejemplo = '';
  if (CONFIG.CARGAR_EJEMPLO_AL_CREAR && tablasVacias_(ss)) {
    ejemplo = '\n\nDatos de ejemplo cargados:\n' + resumenDemo_(escribirDatosDemo_(ss)) +
      '\nPara quitarlos: Bodega > Borrar datos de ejemplo.';
  }
  try {
    SpreadsheetApp.getUi().alert('Listo', 'Se han creado las ' + PESTANAS.length + ' tablas' +
      (nuevas ? ' y ' + nuevas + ' ubicaciones de bodega' : '') + '.' + ejemplo +
      '\n\nRecarga la hoja para ver el menú "Bodega".', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* Ejecutado desde el editor sin la hoja abierta */ }
}

/** Están vacías las tablas de operación (no cuentan ubicaciones ni coberturas, que son de estructura). */
function tablasVacias_(ss) {
  return [HOJA.CAT, HOJA.VEN, HOJA.MOV, HOJA.CXC, HOJA.GAS, HOJA.LEA, HOJA.PAG].every(function (n) {
    const hoja = ss.getSheetByName(n);
    return !hoja || rangoDatos_(hoja, 1).getValues().every(function (f) { return f[0] === ''; });
  });
}

/** Colores de la alerta de quiebre y de las unidades a reponer en la hoja de control. */
function aplicarSemaforos_(ss) {
  const hoja = ss.getSheetByName(HOJA.STK), alerta = rangoDatos_(hoja, 7), reponer = rangoDatos_(hoja, 11);
  const regla = function (texto, color) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextContains(texto).setBackground(color).setRanges([alerta]).build();
  };
  hoja.setConditionalFormatRules([
    regla('Crítico', CONFIG.ROJO), regla('Precaución', CONFIG.AMARILLO), regla('Seguro', CONFIG.VERDE),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground(CONFIG.AMARILLO).setRanges([reponer]).build(),
  ]);
}

/** Crea las ubicaciones de la bodega (pasillo × rack × nivel) si el maestro está vacío. */
function crearUbicaciones_(ss) {
  const hoja = ss.getSheetByName(HOJA.UBI);
  if (leerFilas_(hoja, 1).length) return 0;
  const filas = generarUbicaciones_();
  ajustarFilas_(hoja, filas.length);
  hoja.getRange(2, 1, filas.length, 8).setValues(filas);
  return filas.length;
}

function generarUbicaciones_() {
  const b = CONFIG.BODEGA, filas = [];
  const dos = function (n) { return ('0' + n).slice(-2); };
  b.PASILLOS.forEach(function (pasillo, i) {
    for (let r = 1; r <= b.RACKS; r++) {
      for (let n = 1; n <= b.NIVELES; n++) {
        filas.push(['UB-' + pasillo + dos(r) + '-' + n, pasillo, r, n, pasillo + '-' + dos(r) + '-N' + n,
          Math.round((r - 1) * b.ANCHO * 100) / 100, Math.round(i * b.SEPARACION * 100) / 100, Math.round((n - 1) * b.ALTO * 100) / 100]);
      }
    }
  });
  return filas;
}

/** Días de cobertura por categoría: crea la lista inicial si la pestaña está vacía. */
function crearCoberturas_(ss) {
  const hoja = ss.getSheetByName(HOJA.COB);
  if (leerFilas_(hoja, 1).length) return;
  const dias = [30, 45, 60, 30, 40, 25];
  const filas = LISTAS.CATEGORIA.map(function (c, i) { return [c, dias[i] || CONFIG.COBERTURA_POR_DEFECTO]; });
  hoja.getRange(2, 1, filas.length, 2).setValues(filas);
}

/** Garantiza que la hoja tiene al menos n filas de datos. */
function ajustarFilas_(hoja, n) {
  const faltan = n + 1 - hoja.getMaxRows();
  if (faltan > 0) hoja.insertRowsAfter(hoja.getMaxRows(), faltan + 20);
}

/* ===================== PASO 3 · UTILIDADES ===================== */
/** Referencia a un rango de otra pestaña, con el nombre entre comillas: 'Hoja'!A2:A */
function ref_(hoja, rango) {
  return "'" + hoja + "'!" + rango;
}

function obtenerOCrearHoja_(ss, nombre) {
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre, ss.getNumSheets());
}

function escribirEncabezados_(hoja, columnas) {
  const nombres = columnas.map(function (c) { return c.nombre; });
  const faltan = nombres.length - hoja.getMaxColumns();
  if (faltan > 0) hoja.insertColumnsAfter(hoja.getMaxColumns(), faltan);
  hoja.getRange(1, 1, 1, nombres.length)
    .setValues([nombres])
    .setFontWeight('bold')
    .setFontColor(CONFIG.COLOR_TEXTO_CABECERA)
    .setBackground(CONFIG.COLOR_CABECERA)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  hoja.setFrozenRows(1);
  hoja.setRowHeight(1, 32);
  columnas.forEach(function (c, i) { hoja.setColumnWidth(i + 1, c.ancho); });
  const sobrantes = hoja.getMaxColumns() - nombres.length;
  if (sobrantes > 0) hoja.deleteColumns(nombres.length + 1, sobrantes);
}

function aplicarFormatos_(hoja, columnas) {
  const formatos = {
    texto: '@', general: 'General', numero: CONFIG.FORMATO_NUMERO, porcentaje: CONFIG.FORMATO_PORCENTAJE,
    fecha: CONFIG.FORMATO_FECHA, fechahora: CONFIG.FORMATO_FECHAHORA, mes: CONFIG.FORMATO_MES,
    moneda: CONFIG.FORMATO_MONEDA, entero: CONFIG.FORMATO_ENTERO, hora: CONFIG.FORMATO_HORA,
  };
  columnas.forEach(function (c, i) { rangoDatos_(hoja, i + 1).setNumberFormat(formatos[c.tipo]); });
}

function aplicarValidaciones_(hoja, columnas) {
  columnas.forEach(function (c, i) {
    let regla = null;
    if (c.lista) {
      regla = SpreadsheetApp.newDataValidation()
        .requireValueInList(c.lista, true)
        .setAllowInvalid(!!c.flexible)
        .setHelpText('Elige un valor de la lista: ' + c.lista.join(', '))
        .build();
    } else if (c.listaDe) {
      const origen = hoja.getParent().getSheetByName(c.listaDe.hoja);
      regla = SpreadsheetApp.newDataValidation()
        .requireValueInRange(rangoDatos_(origen, c.listaDe.columna), true)
        .setAllowInvalid(!!c.flexible)
        .setHelpText('Elige un valor existente en "' + c.listaDe.hoja + '".')
        .build();
    } else if ((c.tipo === 'fecha' || c.tipo === 'fechahora') && !c.formula) {
      regla = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false)
        .setHelpText('Introduce una fecha válida.').build();
    }
    // Sin regla propia se limpia: una columna recién insertada hereda la de su vecina
    if (regla) rangoDatos_(hoja, i + 1).setDataValidation(regla);
    else rangoDatos_(hoja, i + 1).clearDataValidations();
  });
}

/** Una fórmula en la fila 2 calcula toda la columna; se sombrea y protege con aviso. */
function aplicarFormulas_(hoja, columnas) {
  columnas.forEach(function (c, i) {
    if (!c.formula) return;
    const col = i + 1;
    const rango = rangoDatos_(hoja, col);
    rango.clearContent();                                    // Si antes era una columna manual, sus valores bloquearían la fórmula
    hoja.getRange(2, col).setFormula(c.formula);
    rango.setBackground(CONFIG.COLOR_CALCULADO);
    const yaProtegida = hoja.getProtections(SpreadsheetApp.ProtectionType.RANGE)
      .some(function (p) { return p.getRange().getA1Notation() === rango.getA1Notation(); });
    if (!yaProtegida) rango.protect().setDescription('Columna calculada: ' + c.nombre).setWarningOnly(true);
  });
}

function rangoDatos_(hoja, columna) {
  return hoja.getRange(2, columna, hoja.getMaxRows() - 1, 1);
}

/** Filas con ID de una tabla (desde la fila 2), con las primeras nCols columnas. */
function leerFilas_(tabla, nCols) {
  const n = tabla.getLastRow() - 1;
  if (n < 1) return [];
  return tabla.getRange(2, 1, n, nCols).getValues().filter(function (f) { return f[0] !== ''; });
}

function primeraFilaLibre_(tabla) {
  const ids = rangoDatos_(tabla, 1).getValues();
  let ultima = 1;
  for (let i = 0; i < ids.length; i++) { if (ids[i][0] !== '') ultima = i + 2; }
  if (ultima === tabla.getMaxRows()) tabla.insertRowsAfter(ultima, 200);
  return ultima + 1;
}

function filaLibreCon_(tabla, n) {
  const fila = primeraFilaLibre_(tabla);
  const faltan = fila + n - 1 - tabla.getMaxRows();
  if (faltan > 0) tabla.insertRowsAfter(tabla.getMaxRows(), faltan + 50);
  return fila;
}

/** Siguiente ID correlativo del año en curso: VEN-2026-0001... */
function siguienteId_(tabla, prefijo) {
  const base = prefijo + '-' + new Date().getFullYear() + '-';
  let max = 0;
  rangoDatos_(tabla, 1).getValues().forEach(function (f) {
    const id = String(f[0]);
    if (id.indexOf(base) === 0) max = Math.max(max, parseInt(id.slice(base.length), 10) || 0);
  });
  return base + ('0000' + (max + 1)).slice(-4);
}

function hoy_() {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
}

function masDias_(f, n) {
  return new Date(f.getFullYear(), f.getMonth(), f.getDate() + n);
}

/** Elimina las filas cuyo ID empieza por "DEMO-", de abajo arriba y por bloques contiguos. */
function borrarFilasDemo_(hoja) {
  const ids = rangoDatos_(hoja, 1).getValues();
  let fin = -1;
  for (let i = ids.length - 1; i >= -1; i--) {
    const esDemo = i >= 0 && String(ids[i][0]).indexOf(DEMO.PREFIJO) === 0;
    if (esDemo && fin === -1) fin = i;
    if (!esDemo && fin !== -1) {
      // Una hoja no puede quedarse sin filas de datos: si tocaría borrarlas todas, deja una vacía
      if (fin - i >= hoja.getMaxRows() - 1) hoja.insertRowsAfter(hoja.getMaxRows(), 1);
      hoja.deleteRows(i + 3, fin - i); fin = -1;
    }
  }
}

/** Escribe filas al final de una tabla, solo en los bloques de columnas manuales indicados. */
function escribirBloques_(hoja, filas, bloques) {
  if (!filas.length) return;
  const fila = filaLibreCon_(hoja, filas.length);
  bloques.forEach(function (b) {
    hoja.getRange(fila, b[0], filas.length, b[1]).setValues(filas.map(function (f) { return f.slice(b[0] - 1, b[0] - 1 + b[1]); }));
  });
}

/** Ejecuta una escritura en exclusiva: evita IDs duplicados si guardan dos a la vez. */
function conBloqueo_(fn) {
  const bloqueo = LockService.getDocumentLock();
  try { bloqueo.waitLock(10000); } catch (err) { return error_('La hoja está ocupada. Inténtalo de nuevo en unos segundos.'); }
  try { return fn(); } finally { bloqueo.releaseLock(); }
}

function error_(mensaje) {
  return { ok: false, mensaje: mensaje };
}

/** Convierte 'aaaa-mm-dd' (formato del panel) en fecha. Devuelve null si está vacío. */
function parsearFecha_(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Fecha -> 'aaaa-mm-dd' (o 'aaaa-mm-dd hh:mm' con hora) para enviarla al panel. */
function iso_(f, conHora) {
  if (!(f instanceof Date)) return '';
  const d = function (n) { return ('0' + n).slice(-2); };
  const s = f.getFullYear() + '-' + d(f.getMonth() + 1) + '-' + d(f.getDate());
  return conHora ? s + ' ' + d(f.getHours()) + ':' + d(f.getMinutes()) : s;
}

function abrirApp() {
  const html = crearPagina_('dialogo').setWidth(1280).setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, CONFIG.TITULO);
}

/** APLICACIÓN WEB: Implementar > Nueva implementación > Aplicación web. */
function doGet() {
  return crearPagina_('web').setTitle(CONFIG.TITULO).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function crearPagina_(modo) {
  const plantilla = HtmlService.createTemplateFromFile('App');
  plantilla.modo = modo;
  return plantilla.evaluate();
}

function activarAperturaAutomatica() {
  desactivarAperturaAutomatica(true);
  ScriptApp.newTrigger('abrirAlEntrar').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onOpen().create();
  SpreadsheetApp.getActiveSpreadsheet().toast('El panel se abrirá solo al entrar en la hoja.', 'Bodega', 5);
}

function desactivarAperturaAutomatica(silencioso) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'abrirAlEntrar') ScriptApp.deleteTrigger(t);
  });
  if (silencioso !== true) SpreadsheetApp.getActiveSpreadsheet().toast('Apertura automática desactivada.', 'Bodega', 5);
}

function abrirAlEntrar() {
  abrirApp();
}

/* ===================== PASO 4 · ID AUTOMÁTICO AL ESCRIBIR A MANO ===================== */
function reglasId_() {
  const r = {};
  r[HOJA.CAT] = { prefijo: 'PRO' };
  r[HOJA.VEN] = { prefijo: 'VEN', fecha: 2 };
  r[HOJA.MOV] = { prefijo: 'MOV', fecha: 2, ahora: true };
  r[HOJA.CXC] = { prefijo: 'TRX', fecha: 3 };
  r[HOJA.PAG] = { prefijo: 'PAG', fecha: 3 };
  r[HOJA.LEA] = { prefijo: 'LEA', fecha: 2, estado: [7, LISTAS.ETAPA[0]] };
  r[HOJA.BIT] = { prefijo: 'CON', fecha: 3 };
  r[HOJA.MET] = { prefijo: 'MET' };
  r[HOJA.GAS] = { prefijo: 'GAS', fecha: 5 };
  return r;
}

function onEdit(e) {
  if (!e || !e.range) return;
  const hoja = e.range.getSheet(), regla = reglasId_()[hoja.getName()];
  const fila = e.range.getRow();
  if (!regla || fila < 2 || e.range.getNumRows() > 1 || e.range.getColumn() === 1) return;
  if (String(e.range.getValue()) === '' || hoja.getRange(fila, 1).getValue() !== '') return;
  if (regla.fecha && hoja.getRange(fila, regla.fecha).getValue() === '') hoja.getRange(fila, regla.fecha).setValue(regla.ahora ? new Date() : hoy_());
  if (regla.estado && hoja.getRange(fila, regla.estado[0]).getValue() === '') hoja.getRange(fila, regla.estado[0]).setValue(regla.estado[1]);
  hoja.getRange(fila, 1).setValue(siguienteId_(hoja, regla.prefijo));
}

/* ===================== PASO 5 · DATOS DE EJEMPLO ===================== */
const DEMO = { PREFIJO: 'DEMO-' };
const DEMO_EJECUTIVOS = ['Carla Mendoza', 'Iván Robles', 'Sofía Paredes', 'Hugo Navarro'];

function cargarDatosDemo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const informe = conBloqueo_(function () { return escribirDatosDemo_(ss); });
  SpreadsheetApp.getUi().alert('Datos de ejemplo', informe.ok === false ? informe.mensaje : resumenDemo_(informe), SpreadsheetApp.getUi().ButtonSet.OK);
}

function resumenDemo_(informe) {
  return informe.map(function (i) { return '· ' + i.tabla + ': ' + i.resultado; }).join('\n');
}

/** Carga tabla a tabla; si una falla lo anota y sigue. Se puede repetir: completa lo que falte. */
function escribirDatosDemo_(ss) {
  const d = generarDemo_(hoy_()), informe = [];
  const cargar = function (nombre, filas, bloques) {
    try {
      const hoja = ss.getSheetByName(nombre);
      if (!hoja) { informe.push({ tabla: nombre, resultado: 'falta la pestaña (ejecuta Crear / reparar todo)' }); return; }
      const ya = rangoDatos_(hoja, 1).getValues().some(function (f) { return String(f[0]).indexOf(DEMO.PREFIJO) === 0; });
      if (ya) { informe.push({ tabla: nombre, resultado: 'ya tenía datos de ejemplo' }); return; }
      escribirBloques_(hoja, filas, bloques);
      SpreadsheetApp.flush();
      informe.push({ tabla: nombre, resultado: filas.length + ' filas' });
    } catch (e) {
      informe.push({ tabla: nombre, resultado: 'ERROR: ' + e.message });
    }
  };
  cargar(HOJA.CAT, d.productos, [[1, 7]]);
  // Asignación de productos a posiciones: solo en posiciones libres del maestro
  try {
    const hoja = ss.getSheetByName(HOJA.UBI), filas = leerFilas_(hoja, 10);
    let n = 0;
    const col = hoja.getRange(2, 10, Math.max(filas.length, 1), 1), actuales = col.getValues();
    filas.forEach(function (f, i) {
      if (actuales[i][0] === '' && d.asignacion[f[0]]) { actuales[i][0] = d.asignacion[f[0]]; n++; }
    });
    if (filas.length) col.setValues(actuales);
    informe.push({ tabla: HOJA.UBI, resultado: n + ' posiciones ocupadas' });
  } catch (e) {
    informe.push({ tabla: HOJA.UBI, resultado: 'ERROR: ' + e.message });
  }
  cargar(HOJA.GAS, d.gastos, [[1, 5]]);
  cargar(HOJA.CXC, d.cuentas, [[1, 5], [7, 3]]);
  cargar(HOJA.PAG, d.pagos, [[1, 5]]);
  cargar(HOJA.LEA, d.leads, [[1, 12]]);
  cargar(HOJA.BIT, d.bitacora, [[1, 6]]);
  cargar(HOJA.MET, d.metas, [[1, 4]]);
  cargar(HOJA.VEN, d.ventas, [[1, 5]]);
  cargar(HOJA.MOV, d.movimientos, [[1, 8]]);
  return informe;
}

function borrarDatosDemo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  conBloqueo_(function () {
    // Libera las posiciones que tenían productos de ejemplo
    const skus = {};
    leerFilas_(ss.getSheetByName(HOJA.CAT), 2).forEach(function (f) { if (String(f[0]).indexOf(DEMO.PREFIJO) === 0) skus[f[1]] = true; });
    const ubi = ss.getSheetByName(HOJA.UBI), n = ubi.getLastRow() - 1;
    if (n > 0) {
      const col = ubi.getRange(2, 10, n, 1);
      col.setValues(col.getValues().map(function (f) { return [skus[f[0]] ? '' : f[0]]; }));
    }
    [HOJA.MOV, HOJA.VEN, HOJA.PAG, HOJA.CXC, HOJA.GAS, HOJA.BIT, HOJA.LEA, HOJA.MET, HOJA.CAT].forEach(function (nombre) { borrarFilasDemo_(ss.getSheetByName(nombre)); });
  });
  ss.toast('Datos de ejemplo eliminados.', 'Bodega', 5);
}

/**
 * Genera los datos ficticios (ferretería y herramientas), siempre iguales y relativos a hoy.
 * El stock final de cada producto se fija a propósito para que haya de todo:
 * quiebres críticos, precaución, stock sano y stock inmovilizado de baja rotación.
 */
function generarDemo_(hoy) {
  let semilla = 20261;
  const azar = function () {                                   // Generador determinista (mulberry32)
    semilla |= 0; semilla = semilla + 0x6D2B79F5 | 0;
    let t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const entre = function (a, b) { return a + Math.floor(azar() * (b - a + 1)); };
  const elegir = function (lista) { return lista[Math.floor(azar() * lista.length)]; };
  const num = function (n, largo) { return ('0000' + n).slice(-largo); };

  // [nombre, precio de venta, unidades por semana] por categoría
  const CATALOGO = [
    ['HE', [['Taladro percutor 800 W', 89.9, 14], ['Amoladora angular 115 mm', 64.5, 12], ['Atornillador inalámbrico 18 V', 119, 16], ['Sierra circular 1400 W', 129, 6], ['Lijadora orbital 300 W', 58.9, 7], ['Martillo demoledor 1500 W', 289, 2]]],
    ['HM', [['Juego de llaves combinadas 12 pzs', 34.9, 18], ['Martillo carpintero 500 g', 14.5, 26], ['Destornilladores set 8 pzs', 19.9, 30], ['Alicate universal 8"', 12.9, 24], ['Flexómetro 5 m', 6.9, 45], ['Nivel de aluminio 60 cm', 16.5, 11]]],
    ['FT', [['Tornillo rosca madera 4×40 (caja 500)', 9.8, 60], ['Taco nylon 8 mm (caja 100)', 5.4, 75], ['Tornillo autoperforante 8×1" (caja 500)', 11.9, 48], ['Perno hexagonal M10 (caja 50)', 13.5, 22], ['Clavo corriente 2½" (kg)', 3.2, 90], ['Anclaje químico 300 ml', 17.9, 9]]],
    ['PA', [['Pintura látex blanco 15 L', 48.9, 20], ['Esmalte sintético negro 4 L', 29.9, 9], ['Silicona neutra transparente 280 ml', 4.9, 85], ['Adhesivo de montaje 370 g', 6.5, 52], ['Rodillo antigota 22 cm', 7.9, 34], ['Barniz marino 1 L', 15.9, 4]]],
    ['EI', [['Cable eléctrico 2,5 mm² (rollo 100 m)', 54.9, 13], ['Foco LED 50 W exterior', 22.9, 19], ['Interruptor automático 16 A', 7.4, 40], ['Regleta 6 tomas con interruptor', 11.9, 28], ['Tubo LED T8 18 W', 5.9, 55], ['Caja de registro estanca', 3.9, 30]]],
    ['JE', [['Manguera reforzada 25 m', 24.9, 15], ['Cortacésped eléctrico 1200 W', 139, 4], ['Tijera de podar bypass', 13.9, 17], ['Carretilla de obra 90 L', 59.9, 6], ['Aspersor oscilante', 12.5, 10], ['Abono universal 5 kg', 9.9, 21]]],
  ];
  // Días de stock que queda al final para cada producto (se recorre en orden)
  const COBERTURA_FINAL = [9, 42, 24, 70, 13, 380, 55, 27, 5, 95, 36, 150, 19, 62, 240, 44, 11, 80];
  const PROVEEDORES = ['Suministros Ibéricos S.L.', 'Ferroglobal Distribución', 'Tornillería Levante', 'Pinturas Sierra S.A.', 'Electro Norte S.L.', 'Verde & Jardín Import'];
  const CLIENTES = ['Construcciones Albor S.L.', 'Reformas Mediterráneo', 'Bricolaje El Pino', 'Instalaciones Duero', 'Ferretería La Llave', 'Grupo Obras Castellana'];
  const RESPONSABLES = ['Marta Giménez', 'Óscar Prieto', 'Lucía Ferrer', 'Daniel Román'];

  const productos = [], ventas = [], movimientos = [], compras = [], credito = [];
  const info = [];
  CATALOGO.forEach(function (grupo, c) {
    grupo[1].forEach(function (p, j) {
      const n = productos.length + 1;
      const costo = Math.round(p[1] * (0.52 + azar() * 0.2) * 100) / 100;
      const linea = p[1] > 100 ? (azar() < 0.7 ? 'Profesional' : 'Industrial') : (c === 2 ? elegir(['Profesional', 'Industrial']) : elegir(LISTAS.LINEA));
      const prod = [DEMO.PREFIJO + 'P' + num(n, 3), grupo[0] + '-' + (1000 + n), p[0], LISTAS.CATEGORIA[c], linea, p[1], costo];
      productos.push(prod);
      info.push({ prod: prod, base: p[2], cat: c, dias: COBERTURA_FINAL[(n - 1) % COBERTURA_FINAL.length] });
    });
  });

  // Posiciones de la bodega: 2 por producto (3 a uno de cada tres), al azar
  const ubis = generarUbicaciones_().map(function (u) { return u[0]; });
  for (let i = ubis.length - 1; i > 0; i--) { const k = Math.floor(azar() * (i + 1)); const t = ubis[i]; ubis[i] = ubis[k]; ubis[k] = t; }
  const asignacion = {};
  let libre = 0;
  info.forEach(function (p, i) {
    p.ubis = [];
    const cuantas = i % 3 === 0 ? 3 : 2;
    for (let k = 0; k < cuantas && libre < ubis.length - 12; k++) { asignacion[ubis[libre]] = p.prod[1]; p.ubis.push(ubis[libre]); libre++; }
  });

  const SEMANAS = 66;                                         // Algo más de 15 meses: cubre el mismo periodo del año anterior
  info.forEach(function (p, i) {
    const salidas = [];                                       // {fecha, cantidad, tipo}
    const fase = azar() * 6.28, lento = p.dias > 200;
    for (let s = SEMANAS; s >= 0; s--) {
      if (azar() < (lento ? 0.45 : 0.06)) continue;
      const fecha = masDias_(hoy, -(s * 7 + entre(0, 6)));
      if (fecha > hoy) continue;
      const estacion = 1 + 0.28 * Math.sin(s / 52 * 6.28 + fase);
      const tendencia = (i % 4 === 0 ? 0.7 : i % 4 === 1 ? 1.25 : 1) > 1 ? 1 + 0.3 * (1 - s / SEMANAS) : (i % 4 === 0 ? 1.25 - 0.4 * (1 - s / SEMANAS) : 1);
      const cantidad = Math.max(1, Math.round(p.base * (lento ? 0.35 : 1) * estacion * tendencia * (0.7 + azar() * 0.6)));
      const canal = azar() < 0.34 ? 'Distribuidores' : azar() < 0.5 ? 'Tienda' : azar() < 0.65 ? 'Online' : 'Venta directa';
      salidas.push({ fecha: fecha, cantidad: cantidad, tipo: 'Salida Venta', canal: canal });
    }
    for (let k = entre(0, 3); k > 0; k--) {
      salidas.push({ fecha: masDias_(hoy, -entre(3, 360)), cantidad: Math.max(1, Math.round(p.base * (0.1 + azar() * 0.35))), tipo: 'Merma / Daño' });
    }
    salidas.sort(function (a, b) { return a.fecha - b.fecha; });

    // Ritmo ponderado con la misma regla que la hoja, para fijar el stock final deseado
    let v90 = 0, vaa = 0;
    salidas.forEach(function (x) {
      if (x.tipo !== 'Salida Venta') return;
      const d = Math.round((hoy - x.fecha) / 864e5);
      if (d < 90) v90 += x.cantidad;
      if (d >= 365 && d < 455) vaa += x.cantidad;
    });
    const ritmo = vaa > 0 ? (CONFIG.PESO_ULTIMOS_90 * v90 + CONFIG.PESO_ANO_ANTERIOR * vaa) / 100 / 90 : v90 / 90;
    const stockFinal = Math.max(lento ? p.base * 14 : 2, Math.round(ritmo * p.dias));

    // Se reconstruye hacia atrás: así el stock nunca queda negativo y acaba donde queremos
    const minimo = Math.max(2, Math.round(p.base * 0.8)), tope = stockFinal + p.base * entre(5, 8);
    const ingresos = [];
    let s = stockFinal;
    for (let k = salidas.length - 1; k >= 0; k--) {
      s += salidas[k].cantidad;
      if (s > tope && k > 0) { ingresos.push({ fecha: masDias_(salidas[k].fecha, -1), cantidad: s - minimo }); s = minimo; }
    }
    ingresos.push({ fecha: masDias_(salidas.length ? salidas[0].fecha : hoy, -3), cantidad: s });

    const principal = p.ubis[0] || '';
    ingresos.forEach(function (x) {
      movimientos.push([x.fecha, 'Ingreso Existencia', p.prod[1], x.cantidad, '', elegir(p.ubis) || '', elegir(RESPONSABLES), entre(7, 12)]);
      compras.push({ fecha: x.fecha, monto: x.cantidad * p.prod[6], proveedor: PROVEEDORES[p.cat] });
    });
    salidas.forEach(function (x) {
      movimientos.push([x.fecha, x.tipo, p.prod[1], x.cantidad, elegir(p.ubis) || principal, '', elegir(RESPONSABLES), entre(13, 18)]);
      if (x.tipo !== 'Salida Venta') return;
      ventas.push([x.fecha, p.prod[0], x.cantidad, x.canal]);
      if (CONFIG.CANALES_CONTADO.indexOf(x.canal) === -1) credito.push({ fecha: x.fecha, monto: x.cantidad * p.prod[5], cliente: CLIENTES[(i + x.fecha.getDate()) % CLIENTES.length] });
    });
    if (p.ubis.length > 1 && i % 5 === 0) {
      movimientos.push([masDias_(hoy, -entre(2, 40)), 'Transferencia', p.prod[1], Math.max(1, Math.round(p.base / 2)), p.ubis[0], p.ubis[1], elegir(RESPONSABLES), entre(9, 17)]);
    }
  });

  ventas.sort(function (a, b) { return a[0] - b[0]; });
  const filasVentas = ventas.map(function (v, i) { return [DEMO.PREFIJO + 'V' + num(i + 1, 4)].concat(v); });
  movimientos.sort(function (a, b) { return a[0] - b[0] || a[7] - b[7]; });
  const filasMov = movimientos.map(function (m, i) {
    const f = new Date(m[0].getFullYear(), m[0].getMonth(), m[0].getDate(), m[7], (i * 7) % 60);
    return [DEMO.PREFIJO + 'M' + num(i + 1, 4), f, m[1], m[2], m[3], m[4], m[5], m[6]];
  });

  // Facturas: ventas a crédito (canales que no son de contado) y compras, agrupadas por quincena y contraparte
  const cuentas = [], pagosDe = [];
  const agrupar = function (lista, clave, tipo, plazo) {
    const grupos = {};
    lista.forEach(function (x) {
      const d = Math.round((hoy - x.fecha) / 864e5);
      if (d > 250) return;
      const k = x[clave] + '|' + Math.floor(d / 15);
      if (!grupos[k]) grupos[k] = { nombre: x[clave], fecha: x.fecha, monto: 0 };
      grupos[k].monto += x.monto;
      if (x.fecha > grupos[k].fecha) grupos[k].fecha = x.fecha;
    });
    Object.keys(grupos).forEach(function (k) {
      const g = grupos[k], vence = masDias_(g.fecha, elegir(plazo)), neto = Math.round(g.monto * 100) / 100;
      const total = Math.round(neto * (100 + CONFIG.IVA_PCT)) / 100, atraso = Math.round((hoy - vence) / 864e5);
      // Lo vencido hace tiempo está pagado; lo reciente, casi siempre pendiente (queda algo vencido y algún pago parcial)
      const r = azar();
      let pagado = 0, cuando = null;
      if (atraso > 25 || (atraso > 0 && r < 0.6)) { pagado = total; cuando = masDias_(vence, entre(-6, Math.min(12, atraso))); }
      else if (atraso <= 0 && r < (tipo === 'Pago Proveedor' ? 0.4 : 0.1)) { pagado = total; cuando = masDias_(hoy, -entre(0, 8)); }
      else if (r > 0.86) { pagado = Math.round(total * 0.4 * 100) / 100; cuando = masDias_(hoy, -entre(1, 12)); }
      if (cuando && cuando < g.fecha) cuando = g.fecha;
      if (cuando && cuando > hoy) cuando = hoy;
      cuentas.push({ fila: [tipo, g.fecha, vence, neto, '', g.nombre, '', CONFIG.IVA_PCT], pagado: pagado, cuando: cuando });
    });
  };
  agrupar(credito, 'cliente', 'Cobro Cliente', [30, 30, 45, 60]);
  agrupar(compras, 'proveedor', 'Pago Proveedor', [30, 45, 60]);
  cuentas.sort(function (a, b) { return a.fila[1] - b.fila[1]; });
  let nEmitida = 0, nRecibida = 0;
  const filasCuentas = cuentas.map(function (c, i) {
    const id = DEMO.PREFIJO + 'T' + num(i + 1, 3), emitida = c.fila[0] === 'Cobro Cliente';
    c.fila[6] = emitida ? 'F' + c.fila[1].getFullYear() + '-' + num(++nEmitida, 4) : 'PR-' + num(4200 + (++nRecibida) * 7, 5);
    if (c.pagado) pagosDe.push([id, c.cuando, c.pagado, elegir(emitida ? ['Transferencia', 'Transferencia', 'Confirming', 'Domiciliación'] : ['Transferencia', 'Domiciliación'])]);
    return [id].concat(c.fila);
  });
  pagosDe.sort(function (a, b) { return a[1] - b[1]; });
  const filasPagos = pagosDe.map(function (p, i) { return [DEMO.PREFIJO + 'C' + num(i + 1, 3)].concat(p); });

  // Embudo comercial: prospectos de logística, bitácora de contactos y metas por ejecutivo
  const EMPRESAS = ['Construcciones Albor', 'Reformas Mediterráneo', 'Bricolaje El Pino', 'Instalaciones Duero', 'Ferretería La Llave', 'Grupo Obras Castellana', 'Talleres Montaña', 'Electricidad Ribera', 'Jardines del Sur', 'Mantenimientos Atlas', 'Carpintería Roble', 'Fontanería Levante', 'Pinturas Aurora', 'Montajes Ebro', 'Suministros Navales Cies', 'Cubiertas Tajo', 'Climatización Polar', 'Cerrajería Segura', 'Obras Públicas Teide', 'Hotel Bahía Azul', 'Residencial Los Olmos', 'Agroservicios Vega', 'Industrias Metálicas Forja', 'Logística Punto Norte', 'Comunidad Parque Real', 'Reparaciones Exprés 24', 'Vidrios y Aluminios Sol', 'Piscinas Costa Clara', 'Cooperativa San Isidro', 'Estudio Arq. Línea Recta'];
  const NOMBRES = ['Javier Ortega', 'Nuria Campos', 'Andrés Molina', 'Beatriz Soler', 'Raúl Gil', 'Elena Vidal', 'Tomás Herrero', 'Irene Pastor', 'Sergio Lozano', 'Patricia Rey'];
  const NOTAS = ['Compra hoy a un competidor; pide mejor plazo de entrega.', 'Quiere tarifa por volumen y entrega semanal.', 'Necesita crédito a 60 días.', 'Interesado en fijaciones y herramienta eléctrica.', 'Pide muestra y catálogo actualizado.', 'Abre obra nueva el mes próximo.', 'Compara precios con dos proveedores.', 'Solicita reparto en obra antes de las 8:00.'];
  const RESUMENES = ['Primera llamada: se presenta la empresa y el catálogo.', 'Se envía tarifa y condiciones de entrega.', 'Reunión para revisar volúmenes mensuales.', 'Pide ajustar el precio de fijaciones.', 'Se envía propuesta formal por email.', 'Seguimiento: revisando la propuesta con compras.', 'Visita a sus instalaciones.', 'Confirma interés; falta aprobar el crédito.'];
  const leads = [], bitacora = [], ejecutivoDe = {};
  const PESOS = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5];        // Etapa (índice) según lo avanzado
  for (let i = 0; i < 64; i++) {
    const antig = entre(1, 120), ingreso = masDias_(hoy, -antig);
    // Los prospectos recientes están en etapas tempranas; los antiguos, casi todos cerrados
    let etapa = antig < 10 ? elegir([0, 0, 1]) : antig < 30 ? elegir([0, 1, 1, 2, 2, 3]) : elegir(PESOS.slice(antig > 60 ? 6 : 3));
    const ejecutivo = DEMO_EJECUTIVOS[(i * 7 + (i % 3)) % DEMO_EJECUTIVOS.length];
    const monto = Math.round(entre(12, 140) * (i % 9 === 0 ? 2 : 1)) * 100;
    const cerrado = etapa >= 4, cierre = cerrado ? masDias_(ingreso, Math.min(antig, entre(12, 45))) : '';
    const id = DEMO.PREFIJO + 'L' + num(i + 1, 3), empresa = EMPRESAS[i % EMPRESAS.length] + (i >= EMPRESAS.length ? ' ' + ['Norte', 'Sur', 'II'][Math.floor(i / EMPRESAS.length) % 3] : '') + ' S.L.';
    leads.push([id, ingreso, empresa, elegir(NOMBRES), '6' + entre(10000000, 99999999), elegir(LISTAS.INTERES), LISTAS.ETAPA[etapa], ejecutivo, monto, elegir(LISTAS.CANAL_LEAD), cierre, elegir(NOTAS)]);
    // Contactos: tantos como etapas recorridas; algunos prospectos abiertos quedan sin seguimiento reciente
    const hasta = cerrado ? Math.round((hoy - cierre) / 864e5) : (i % 4 === 0 ? Math.min(antig, entre(9, 20)) : entre(0, Math.min(antig, 6)));
    const n = etapa === 0 ? (i % 2) : Math.min(etapa, 4) + (i % 2);
    for (let k = 0; k < n; k++) {
      const dia = Math.round(antig - (antig - hasta) * (k + 1) / n);
      bitacora.push([id, masDias_(hoy, -dia), elegir(LISTAS.TIPO_CONTACTO), RESUMENES[Math.min(RESUMENES.length - 1, k * 2 + (i % 2))], ejecutivo]);
    }
  }
  leads.sort(function (a, b) { return a[1] - b[1]; });
  bitacora.sort(function (a, b) { return a[1] - b[1]; });
  const filasBitacora = bitacora.map(function (b, i) { return [DEMO.PREFIJO + 'B' + num(i + 1, 3)].concat(b); });
  const metas = [];
  for (let m = 3; m >= -1; m--) {
    DEMO_EJECUTIVOS.forEach(function (e, k) { metas.push([DEMO.PREFIJO + 'O' + num(metas.length + 1, 3), new Date(hoy.getFullYear(), hoy.getMonth() - m, 1), e, [16000, 14000, 12000, 9000][k]]); });
  }

  // Gastos operativos: 14 meses
  const FIJOS = [['Arriendo de bodega', 'Inmobiliaria Logística Sur', 5200, 0], ['Personal de bodega', 'Nóminas operación', 9800, 0.04],
    ['Transporte y fletes', 'Transportes Rápidos del Este', 3100, 0.3], ['Seguros', 'Mutua Empresarial', 640, 0],
    ['Energía y suministros', 'Energía Clara', 980, 0.25], ['Embalaje y consumibles', 'Embalajes Roca', 620, 0.35]];
  const gastos = [];
  for (let m = 14; m >= 0; m--) {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() - m, 1);
    FIJOS.forEach(function (g, k) {
      const fecha = new Date(mes.getFullYear(), mes.getMonth(), [1, 28, 15, 5, 12, 20][k]);
      if (fecha > hoy) return;
      gastos.push([g[0], g[1], Math.round(g[2] * (1 + (azar() - 0.5) * 2 * g[3])), fecha]);
    });
    if (m % 3 === 1) {
      const fecha = new Date(mes.getFullYear(), mes.getMonth(), 18);
      if (fecha <= hoy) gastos.push(['Mantenimiento de equipos', 'Carretillas Hispania', entre(450, 1400), fecha]);
    }
  }
  gastos.sort(function (a, b) { return a[3] - b[3]; });
  const filasGastos = gastos.map(function (g, i) { return [DEMO.PREFIJO + 'G' + num(i + 1, 3)].concat(g); });

  return { productos: productos, ventas: filasVentas, movimientos: filasMov, cuentas: filasCuentas, pagos: filasPagos, gastos: filasGastos, leads: leads, bitacora: filasBitacora, metas: metas, asignacion: asignacion };
}

/* ===================== PASO 5b · FORMULARIO DE CAPTACIÓN (Google Forms "Distribuidores") ===================== */
const FORM_LEADS = {
  // Título de cada pregunta del formulario. No importan mayúsculas ni espacios sobrantes.
  // Si cambias la redacción de una pregunta en el formulario, añade el título nuevo a su lista.
  PREGUNTAS: {
    empresa:    ['Nombre de tu empresa'],
    contacto:   ['Nombre y Apellido', 'Nombre y apellidos'],
    telefono:   ['Teléfono'],
    email:      ['Email', 'Correo electrónico'],
    interes:    ['¿Qué tipo de compra necesitas?'],
    categorias: ['¿Qué categorías de producto te interesan?'],
    volumen:    ['¿Cuál es tu volumen de compra mensual aproximado?'],
    canal:      ['¿Cómo nos conociste?'],
    // Preguntas opcionales: si las añades al formulario, sus respuestas van a Notas
    frecuencia: ['¿Con qué frecuencia necesitas reposición?'],
    plazo:      ['¿Cuándo necesitas el primer pedido?'],
    entrega:    ['¿Dónde necesitas la entrega?'],
    pago:       ['¿Qué forma de pago prefieres?'],
    comentario: ['¿Algo más que debamos saber?'],
  },
  // Volumen de compra mensual -> Monto_Estimado (€). Se reconoce por el inicio de la respuesta.
  VOLUMEN: [['menos de 1', 500], ['1.000', 3000], ['5.000', 10000], ['15.000', 30000], ['más de 50', 60000]],
  EJECUTIVO: 'Sin asignar',                 // A quién se asignan los prospectos del formulario
  MARCA: '[Formulario web]',                // Inicio de las Notas: así se distinguen los prospectos que llegaron por la encuesta
};

/** Menú: conecta el formulario. Activa el alta automática e importa las respuestas ya recibidas. */
function conectarFormulario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), ui = SpreadsheetApp.getUi();
  if (!ss.getSheetByName(HOJA.LEA)) { ui.alert('Antes hay que crear las tablas: Bodega > Crear / reparar todo.'); return; }
  asegurarActivadorFormulario_(ss);
  const r = importarPendientes_(ss);
  ui.alert('Formulario conectado', (r.error ? 'Aviso: ' + r.error + '\n\n' : r.creados + ' respuesta(s) ya recibida(s) pasada(s) al embudo de ventas.\n\n') +
    'A partir de ahora cada respuesta nueva creará un prospecto automáticamente en "1. Prospecto".', ui.ButtonSet.OK);
}

function asegurarActivadorFormulario_(ss) {
  const existe = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'alRecibirLead'; });
  if (!existe) ScriptApp.newTrigger('alRecibirLead').forSpreadsheet(ss).onFormSubmit().create();
}

/** Menú: deja de crear prospectos desde el formulario (las respuestas se siguen guardando en su pestaña). */
function desconectarFormulario() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'alRecibirLead') ScriptApp.deleteTrigger(t); });
  SpreadsheetApp.getUi().alert('Formulario desconectado.');
}

/** Lo ejecuta el activador con cada respuesta nueva. */
function alRecibirLead(e) {
  const bloqueo = LockService.getDocumentLock();
  bloqueo.waitLock(20000);
  try {
    SpreadsheetApp.flush();
    const r = importarPendientes_(SpreadsheetApp.getActiveSpreadsheet());
    if (r.error) console.error('Formulario de prospectos: ' + r.error);
  } finally {
    bloqueo.releaseLock();
  }
}

/** Menú: pasa al embudo las respuestas que aún no son prospectos. No duplica. */
function importarRespuestasFormulario() {
  const ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActiveSpreadsheet();
  asegurarActivadorFormulario_(ss);
  const r = importarPendientes_(ss);
  if (r.error) { ui.alert(r.error); return; }
  ui.alert('Importación terminada', r.creados + ' prospecto(s) nuevo(s) en el embudo.' +
    (r.repetidos ? '\n' + r.repetidos + ' respuesta(s) ya estaban y no se han duplicado.' : ''), ui.ButtonSet.OK);
}

function limpiarTexto_(t) {
  return String(t === null || t === undefined ? '' : t).replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Lee la pestaña de respuestas vinculada y crea los prospectos que aún no están
 * (se reconocen por empresa + teléfono/email + fecha). Devuelve { creados, repetidos } o { error }.
 */
function importarPendientes_(ss) {
  const tabla = ss.getSheetByName(HOJA.LEA);
  if (!tabla) return { error: 'Falta crear las tablas: Bodega > Crear / reparar todo.' };
  const vinculadas = ss.getSheets().filter(function (h) { return h.getFormUrl(); });
  if (!vinculadas.length) {
    return { error: 'Esta hoja no tiene ningún formulario vinculado. En el formulario: Respuestas > Vincular con Hojas de cálculo > Seleccionar una hoja existente.' };
  }
  // Si hay varias pestañas de respuestas, se usa la que tiene más preguntas de este formulario
  const P = FORM_LEADS.PREGUNTAS;
  let datos = null, columna = null, nombreHoja = '', mejor = -1;
  vinculadas.forEach(function (h) {
    const d = h.getDataRange().getValues(), cabecera = d[0].map(limpiarTexto_), c = {};
    Object.keys(P).forEach(function (clave) {
      c[clave] = -1;
      P[clave].forEach(function (titulo) { if (c[clave] === -1) c[clave] = cabecera.indexOf(limpiarTexto_(titulo)); });
    });
    const n = Object.keys(c).filter(function (k) { return c[k] > -1; }).length;
    if (n > mejor) { mejor = n; datos = d; columna = c; nombreHoja = h.getName(); }
  });
  if (columna.empresa === -1 && columna.contacto === -1) {
    return { error: 'No encuentro las preguntas "' + P.empresa[0] + '" ni "' + P.contacto[0] + '" en la pestaña "' + nombreHoja + '". Revisa los títulos en FORM_LEADS.' };
  }

  const zona = ss.getSpreadsheetTimeZone();
  const dia = function (f) { return f instanceof Date ? Utilities.formatDate(f, zona, 'yyyy-MM-dd') : ''; };
  const firma = function (empresa, contacto, fecha) { return [limpiarTexto_(empresa), limpiarTexto_(contacto), fecha].join('|'); };
  const existentes = {};
  leerFilas_(tabla, 5).forEach(function (f) { existentes[firma(f[2], f[4], dia(f[1]))] = true; });

  let creados = 0, repetidos = 0;
  for (let i = 1; i < datos.length; i++) {
    const r = {};
    Object.keys(P).forEach(function (clave) { r[clave] = columna[clave] === -1 ? '' : String(datos[i][columna[clave]]).trim(); });
    if (!r.empresa && !r.contacto && !r.telefono && !r.email) continue;            // Fila vacía
    const marca = datos[i][0], fecha = marca instanceof Date ? new Date(marca.getFullYear(), marca.getMonth(), marca.getDate()) : hoy_();
    const telefonoEmail = [r.telefono, r.email].filter(function (x) { return x; }).join(' · ');
    const empresa = r.empresa || r.contacto || telefonoEmail;
    const clave = firma(empresa, telefonoEmail, dia(fecha));
    if (existentes[clave]) { repetidos++; continue; }
    crearLeadDeFormulario_(tabla, r, empresa, telefonoEmail, fecha);
    existentes[clave] = true; creados++;
  }
  return { creados: creados, repetidos: repetidos };
}

/** Escribe una respuesta como prospecto nuevo en "1. Prospecto". */
function crearLeadDeFormulario_(tabla, r, empresa, telefonoEmail, fecha) {
  // Tipo de compra: si marcó varias, la primera va a Interes y el resto a Notas
  const tipos = r.interes.split(/,\s*/).filter(function (x) { return x; });
  const interes = tipos[0] || '';
  let monto = 0;
  const vol = limpiarTexto_(r.volumen);
  FORM_LEADS.VOLUMEN.forEach(function (v) { if (vol.indexOf(v[0]) === 0) monto = v[1]; });
  const notas = [FORM_LEADS.MARCA,
    tipos.length > 1 ? 'También: ' + tipos.slice(1).join(', ') : '',
    r.categorias ? 'Categorías: ' + r.categorias : '',
    r.volumen ? 'Volumen mensual: ' + r.volumen : '',
    r.frecuencia ? 'Reposición: ' + r.frecuencia : '',
    r.plazo ? 'Primer pedido: ' + r.plazo : '',
    r.entrega ? 'Entrega: ' + r.entrega : '',
    r.pago ? 'Pago: ' + r.pago : '',
    r.comentario].filter(function (x) { return x; }).join(' · ');
  const id = siguienteId_(tabla, 'LEA'), fila = primeraFilaLibre_(tabla);
  // Primero los datos (B-L) y al final el ID: si algo falla, no queda una fila a medias con ID
  tabla.getRange(fila, 2, 1, 11).setValues([[fecha, empresa, r.contacto, telefonoEmail, interes, LISTAS.ETAPA[0],
    FORM_LEADS.EJECUTIVO, monto, r.canal, '', notas]]);
  tabla.getRange(fila, 1).setValue(id);
  return id;
}

/* ===================== PASO 6 · DATOS PARA EL PANEL ===================== */
function obtenerDatosIniciales() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = PESTANAS.map(function (p) { return p.nombre; });
  const existe = hojas.every(function (n) { return !!ss.getSheetByName(n); });
  const base = {
    hoy: iso_(hoy_()), existe: existe, hojas: hojas, listas: LISTAS,
    urls: hojas.map(function (n) { const h = ss.getSheetByName(n); return h ? ss.getUrl() + '#gid=' + h.getSheetId() : ''; }),
    config: { peso90: CONFIG.PESO_ULTIMOS_90, pesoAA: CONFIG.PESO_ANO_ANTERIOR, critico: CONFIG.DIAS_CRITICO, precaucion: CONFIG.DIAS_PRECAUCION,
      cobertura: CONFIG.COBERTURA_POR_DEFECTO, rotAlta: CONFIG.ROTACION_ALTA_DIAS, rotMedia: CONFIG.ROTACION_MEDIA_DIAS,
      saldo: CONFIG.SALDO_INICIAL_CAJA, iva: CONFIG.IVA_PCT, contado: CONFIG.CANALES_CONTADO,
      mesesPasados: CONFIG.MESES_FLUJO_PASADOS, mesesFuturos: CONFIG.MESES_FLUJO_FUTUROS, diasLead: CONFIG.DIAS_LEAD_SIN_CONTACTO },
    productos: [], ventas: [], ubicaciones: [], movimientos: [], cobertura: [], cuentas: [], pagos: [], gastos: [], leads: [], bitacora: [], metas: [],
  };
  if (!existe) return base;
  const leer = function (nombre, n) { return leerFilas_(ss.getSheetByName(nombre), n); };
  base.productos = leer(HOJA.CAT, 7).map(function (f) {
    return { id: String(f[0]), sku: String(f[1]), nombre: String(f[2]), categoria: String(f[3]), linea: String(f[4]), precio: Number(f[5]) || 0, costo: Number(f[6]) || 0 };
  });
  // Tablas grandes: se envían como listas para que el panel abra rápido
  base.ventas = leer(HOJA.VEN, 5).map(function (f) { return [String(f[0]), iso_(f[1]), String(f[2]), Number(f[3]) || 0, String(f[4])]; });
  base.movimientos = leer(HOJA.MOV, 8).map(function (f) {
    return [String(f[0]), iso_(f[1], true), String(f[2]), String(f[3]), Number(f[4]) || 0, String(f[5]), String(f[6]), String(f[7])];
  });
  base.ubicaciones = leer(HOJA.UBI, 10).map(function (f) {
    return { id: String(f[0]), pasillo: String(f[1]), rack: Number(f[2]) || 0, nivel: Number(f[3]) || 0, pos: String(f[4]),
      x: Number(f[5]) || 0, y: Number(f[6]) || 0, z: Number(f[7]) || 0, sku: String(f[9]) };
  });
  base.cobertura = leer(HOJA.COB, 2).map(function (f) { return { categoria: String(f[0]), dias: Number(f[1]) || 0 }; });
  base.cuentas = leer(HOJA.CXC, 9).map(function (f) {
    return { id: String(f[0]), tipo: String(f[1]), emision: iso_(f[2]), vence: iso_(f[3]), neto: Number(f[4]) || 0, contraparte: String(f[6]), numero: String(f[7]), iva: Number(f[8]) || 0 };
  });
  base.pagos = leer(HOJA.PAG, 5).map(function (f) { return { id: String(f[0]), cuenta: String(f[1]), fecha: iso_(f[2]), monto: Number(f[3]) || 0, metodo: String(f[4]) }; });
  base.leads = leer(HOJA.LEA, 12).map(function (f) {
    return { id: String(f[0]), fecha: iso_(f[1]), empresa: String(f[2]), contacto: String(f[3]), telefono: String(f[4]), interes: String(f[5]), etapa: String(f[6]),
      ejecutivo: String(f[7]), monto: Number(f[8]) || 0, canal: String(f[9]), cierre: iso_(f[10]), notas: String(f[11]) };
  });
  base.bitacora = leer(HOJA.BIT, 6).map(function (f) { return { id: String(f[0]), lead: String(f[1]), fecha: iso_(f[2]), tipo: String(f[3]), resumen: String(f[4]), ejecutivo: String(f[5]) }; });
  base.metas = leer(HOJA.MET, 4).map(function (f) { return { id: String(f[0]), mes: iso_(f[1]).slice(0, 7), ejecutivo: String(f[2]), meta: Number(f[3]) || 0 }; });
  base.gastos = leer(HOJA.GAS, 5).map(function (f) {
    return { id: String(f[0]), categoria: String(f[1]), proveedor: String(f[2]), monto: Number(f[3]) || 0, fecha: iso_(f[4]) };
  });
  return base;
}

/** Escribe una fila nueva: primero las columnas manuales y al final el ID. */
function escribirFila_(hoja, id, valores) {
  const fila = primeraFilaLibre_(hoja);
  hoja.getRange(fila, 2, 1, valores.length).setValues([valores]);
  hoja.getRange(fila, 1).setValue(id);
  return fila;
}

/** Asigna (o libera, con sku vacío) el producto de una ubicación. Devuelve false si no existe. */
function asignarUbicacion_(ss, idUbicacion, sku) {
  if (!idUbicacion) return false;
  const hoja = ss.getSheetByName(HOJA.UBI), ids = rangoDatos_(hoja, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === idUbicacion) { hoja.getRange(i + 2, 10).setValue(sku); return true; }
  }
  return false;
}

/** Primera ubicación que tiene asignado el SKU. */
function ubicacionDe_(ss, sku) {
  const filas = leerFilas_(ss.getSheetByName(HOJA.UBI), 10);
  for (let i = 0; i < filas.length; i++) { if (String(filas[i][9]) === sku) return String(filas[i][0]); }
  return '';
}

/**
 * Guarda un registro desde el panel.
 * d.tipo: producto | venta | movimiento | factura | pago | gasto | lead | contacto | meta
 */
function guardarRegistro(d) {
  return conBloqueo_(function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const texto = function (v) { return String(v == null ? '' : v).trim(); };
    const numero = function (v) { return Number(String(v).replace(',', '.')) || 0; };
    let id = '';

    if (d.tipo === 'producto') {
      const hoja = ss.getSheetByName(HOJA.CAT), sku = texto(d.sku).toUpperCase();
      if (!sku || !texto(d.nombre)) return error_('Indica el SKU y el nombre del producto.');
      if (leerFilas_(hoja, 2).some(function (f) { return String(f[1]).toUpperCase() === sku; })) return error_('Ya existe un producto con el SKU ' + sku + '.');
      if (numero(d.precio) <= 0) return error_('Indica el precio de venta.');
      id = siguienteId_(hoja, 'PRO');
      escribirFila_(hoja, id, [sku, texto(d.nombre), texto(d.categoria), texto(d.linea), numero(d.precio), numero(d.costo)]);

    } else if (d.tipo === 'venta') {
      const prod = leerFilas_(ss.getSheetByName(HOJA.CAT), 2).filter(function (f) { return String(f[0]) === texto(d.producto); })[0];
      const cantidad = Math.round(numero(d.cantidad)), fecha = parsearFecha_(d.fecha) || hoy_();
      if (!prod) return error_('Elige un producto del catálogo.');
      if (cantidad <= 0) return error_('La cantidad debe ser mayor que cero.');
      const hoja = ss.getSheetByName(HOJA.VEN);
      id = siguienteId_(hoja, 'VEN');
      escribirFila_(hoja, id, [fecha, String(prod[0]), cantidad, texto(d.canal)]);
      // La venta descuenta el inventario con su movimiento de salida
      const mov = ss.getSheetByName(HOJA.MOV), ahora = new Date();
      const cuando = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), ahora.getHours(), ahora.getMinutes());
      escribirFila_(mov, siguienteId_(mov, 'MOV'), [cuando, 'Salida Venta', String(prod[1]), cantidad, ubicacionDe_(ss, String(prod[1])), '', texto(d.responsable) || 'Venta ' + id]);

    } else if (d.tipo === 'movimiento') {
      const cantidad = Math.round(numero(d.cantidad)), sku = texto(d.sku), tipo = texto(d.tipoMov);
      const origen = texto(d.origen), destino = texto(d.destino);
      if (LISTAS.TIPO_MOV.indexOf(tipo) === -1) return error_('Elige el tipo de movimiento.');
      if (!sku) return error_('Elige el producto.');
      if (cantidad <= 0) return error_('La cantidad debe ser mayor que cero.');
      if (tipo === 'Transferencia' && (!origen || !destino || origen === destino)) return error_('Una transferencia necesita una ubicación de origen y otra de destino distintas.');
      const hoja = ss.getSheetByName(HOJA.MOV);
      id = siguienteId_(hoja, 'MOV');
      escribirFila_(hoja, id, [new Date(), tipo, sku, cantidad, tipo === 'Ingreso Existencia' ? '' : origen, tipo === 'Ingreso Existencia' || tipo === 'Transferencia' ? destino : '', texto(d.responsable)]);
      // El maestro de bodega sigue al movimiento: el destino queda con el producto
      if ((tipo === 'Ingreso Existencia' || tipo === 'Transferencia') && destino) asignarUbicacion_(ss, destino, sku);
      if (tipo === 'Transferencia' && d.liberarOrigen) asignarUbicacion_(ss, origen, '');

    } else if (d.tipo === 'factura') {
      const emision = parsearFecha_(d.emision) || hoy_(), vence = parsearFecha_(d.vence);
      if (LISTAS.TIPO_CUENTA.indexOf(texto(d.tipoCuenta)) === -1) return error_('Elige si es una factura emitida a un cliente o recibida de un proveedor.');
      if (!vence) return error_('Indica la fecha de vencimiento.');
      if (numero(d.monto) <= 0) return error_('Indica el monto neto.');
      const hoja = ss.getSheetByName(HOJA.CXC);
      id = siguienteId_(hoja, 'TRX');
      const fila = primeraFilaLibre_(hoja), iva = d.iva === '' || d.iva == null ? CONFIG.IVA_PCT : numero(d.iva);
      hoja.getRange(fila, 2, 1, 4).setValues([[texto(d.tipoCuenta), emision, vence, numero(d.monto)]]);
      hoja.getRange(fila, 7, 1, 3).setValues([[texto(d.contraparte), texto(d.numero), iva]]);
      hoja.getRange(fila, 1).setValue(id);

    } else if (d.tipo === 'pago') {
      // Cobro de una factura emitida o pago de una recibida (admite pagos parciales)
      const cuenta = leerFilas_(ss.getSheetByName(HOJA.CXC), 9).filter(function (f) { return String(f[0]) === texto(d.cuenta); })[0];
      if (!cuenta) return error_('Elige la factura.');
      const total = Math.round((Number(cuenta[4]) || 0) * (100 + (Number(cuenta[8]) || 0))) / 100;
      const hoja = ss.getSheetByName(HOJA.PAG);
      const ya = leerFilas_(hoja, 4).reduce(function (s, f) { return s + (String(f[1]) === String(cuenta[0]) ? Number(f[3]) || 0 : 0); }, 0);
      const saldo = Math.round((total - ya) * 100) / 100, monto = d.monto === '' || d.monto == null ? saldo : Math.round(numero(d.monto) * 100) / 100;
      if (saldo <= 0) return error_('Esa factura ya está pagada.');
      if (monto <= 0) return error_('Indica el monto.');
      if (monto > saldo + 0.005) return error_('El monto supera el saldo pendiente de la factura.');
      id = siguienteId_(hoja, 'PAG');
      escribirFila_(hoja, id, [String(cuenta[0]), parsearFecha_(d.fecha) || hoy_(), monto, texto(d.metodo)]);

    } else if (d.tipo === 'lead') {
      if (!texto(d.empresa)) return error_('Indica la empresa.');
      const hoja = ss.getSheetByName(HOJA.LEA), etapa = LISTAS.ETAPA.indexOf(texto(d.etapa)) > -1 ? texto(d.etapa) : LISTAS.ETAPA[0];
      id = siguienteId_(hoja, 'LEA');
      escribirFila_(hoja, id, [parsearFecha_(d.fecha) || hoy_(), texto(d.empresa), texto(d.contacto), texto(d.telefono), texto(d.interes), etapa,
        texto(d.ejecutivo), numero(d.montoEstimado), texto(d.canalLead), LISTAS.ETAPA.indexOf(etapa) >= 4 ? hoy_() : '', texto(d.notas)]);

    } else if (d.tipo === 'contacto') {
      if (!texto(d.lead)) return error_('Elige el prospecto.');
      if (!texto(d.resumen)) return error_('Escribe un resumen del contacto.');
      const hoja = ss.getSheetByName(HOJA.BIT);
      id = siguienteId_(hoja, 'CON');
      escribirFila_(hoja, id, [texto(d.lead), parsearFecha_(d.fecha) || hoy_(), texto(d.tipoContacto), texto(d.resumen), texto(d.ejecutivo)]);

    } else if (d.tipo === 'meta') {
      const mes = /^(\d{4})-(\d{2})$/.exec(texto(d.mes));
      if (!mes) return error_('Indica el mes.');
      if (!texto(d.ejecutivo)) return error_('Indica el ejecutivo.');
      if (numero(d.meta) <= 0) return error_('Indica la meta de ventas.');
      const hoja = ss.getSheetByName(HOJA.MET), fecha = new Date(Number(mes[1]), Number(mes[2]) - 1, 1);
      // Si ya existe la meta de ese ejecutivo y mes, se actualiza
      const filas = rangoDatos_(hoja, 1).getValues(), datos = hoja.getRange(2, 2, filas.length, 2).getValues();
      let fila = -1;
      for (let i = 0; i < filas.length; i++) {
        if (filas[i][0] !== '' && String(datos[i][1]) === texto(d.ejecutivo) && iso_(datos[i][0]).slice(0, 7) === texto(d.mes)) { fila = i + 2; break; }
      }
      if (fila > -1) { hoja.getRange(fila, 4).setValue(numero(d.meta)); id = String(filas[fila - 2][0]); }
      else { id = siguienteId_(hoja, 'MET'); escribirFila_(hoja, id, [fecha, texto(d.ejecutivo), numero(d.meta)]); }

    } else if (d.tipo === 'gasto') {
      if (numero(d.monto) <= 0) return error_('Indica el monto.');
      const hoja = ss.getSheetByName(HOJA.GAS);
      id = siguienteId_(hoja, 'GAS');
      escribirFila_(hoja, id, [texto(d.categoriaGasto), texto(d.proveedor), numero(d.monto), parsearFecha_(d.fecha) || hoy_()]);

    } else {
      return error_('Tipo de registro desconocido.');
    }
    return { ok: true, mensaje: 'Guardado.', id: id };
  });
}

/**
 * Cambios rápidos desde el panel.
 * {tipo:'lead', id, valor: etapa} · {tipo:'ubicacion', id, valor: SKU o ''}
 */
function cambiarEstado(d) {
  return conBloqueo_(function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (d.tipo === 'ubicacion') {
      return asignarUbicacion_(ss, String(d.id), String(d.valor || '')) ? { ok: true, mensaje: 'Guardado.' } : error_('No se encuentra la ubicación.');
    }
    if (d.tipo === 'lead') {
      if (LISTAS.ETAPA.indexOf(d.valor) === -1) return error_('Etapa no válida.');
      const hoja = ss.getSheetByName(HOJA.LEA), ids = rangoDatos_(hoja, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(d.id)) {
          hoja.getRange(i + 2, 7).setValue(d.valor);
          hoja.getRange(i + 2, 11).setValue(LISTAS.ETAPA.indexOf(d.valor) >= 4 ? hoy_() : '');   // Fecha de cierre al ganar o perder
          return { ok: true, mensaje: 'Guardado.' };
        }
      }
      return error_('No se encuentra el prospecto.');
    }
    return error_('Cambio desconocido.');
  });
}

/** Guarda los días de cobertura por categoría: lista de {categoria, dias}. */
function guardarCobertura(lista) {
  return conBloqueo_(function () {
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA.COB);
    const limpia = (lista || []).map(function (x) { return [String(x.categoria || '').trim(), Math.round(Number(x.dias))]; })
      .filter(function (x) { return x[0]; });
    if (limpia.some(function (x) { return !(x[1] >= 0 && x[1] <= 720); })) return error_('Los días de cobertura deben estar entre 0 y 720.');
    const actuales = rangoDatos_(hoja, 1).getValues();
    limpia.forEach(function (x) {
      let fila = -1;
      for (let i = 0; i < actuales.length; i++) { if (String(actuales[i][0]) === x[0]) { fila = i + 2; break; } }
      if (fila === -1) { fila = primeraFilaLibre_(hoja); hoja.getRange(fila, 1).setValue(x[0]); actuales[fila - 2] = [x[0]]; }
      hoja.getRange(fila, 2).setValue(x[1]);
    });
    return { ok: true, mensaje: 'Cobertura guardada.' };
  });
}