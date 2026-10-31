  /* ===================== ESTILOS DE NAVE (uno por empresa: Ajustes › Empresa › Bodega) ===================== */
  function estiloActual() { var b = D && D.config && D.config.bodega; return ESTILOS3D[b && b.estilo] ? b.estilo : 'clasico'; }

  // Textura de caja clara: se tiñe con el color de cada posición (rotación, quiebre, categoría…)
  function texCajaClara(tipo) {
    return lienzo(512, function (g, n) {
      var m = n / 2;
      g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, n, n);
      if (tipo === 'cubeta') {                                           // Cubeta plástica con nervios
        for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
          var x = i * m, y = j * m;
          g.fillStyle = 'rgba(0,0,0,.10)'; for (var k = 1; k < 6; k++) g.fillRect(x + k * m / 6 - 3, y + m * 0.12, 6, m * 0.76);
          g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + m * 0.06, y + m * 0.06, m * 0.88, m * 0.05);
          g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + m * 0.36, y + m * 0.2, m * 0.28, m * 0.1);     // Asa
          g.fillStyle = '#ffffff'; g.fillRect(x + m * 0.3, y + m * 0.62, m * 0.4, m * 0.18);
          g.fillStyle = '#222'; for (var b = 0; b < 12; b++) g.fillRect(x + m * 0.33 + b * m * 0.028, y + m * 0.66, (b % 3 ? 2 : 4), m * 0.1);
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, m - 4, m - 4);
        }
        return;
      }
      ruido(g, n, 4000, '0,0,0', 0.06);
      for (var p = 0; p < 2; p++) for (var q = 0; q < 2; q++) {           // 4 cajas por cara, con cinta y etiqueta
        var xx = p * m, yy = q * m;
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(xx, yy + m * 0.44, m, m * 0.12);
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(xx, yy + m * 0.56, m, 3);
        g.fillStyle = '#ffffff'; g.fillRect(xx + m * 0.12, yy + m * 0.66, m * 0.36, m * 0.22);
        g.fillStyle = '#1b1b1b'; for (var c = 0; c < 14; c++) g.fillRect(xx + m * 0.15 + c * m * 0.021, yy + m * 0.7, (c % 3 ? 1.5 : 3), m * 0.1);
        g.strokeStyle = 'rgba(0,0,0,.38)'; g.lineWidth = 4; g.strokeRect(xx + 1, yy + 1, m - 2, m - 2);
      }
    });
  }
  function texPlano(fondo, lineas, rx, ry, ruidoAlfa) {
    return lienzo(512, function (g, n) {
      g.fillStyle = fondo; g.fillRect(0, 0, n, n);
      ruido(g, n, 9000, '0,0,0', ruidoAlfa || 0.06); ruido(g, n, 6000, '255,255,255', (ruidoAlfa || 0.06) * 0.8);
      if (lineas) { g.strokeStyle = lineas; g.lineWidth = 2; g.strokeRect(1, 1, n - 2, n - 2); }
    }, rx || 6, ry || 6);
  }
  function texPanelClaro(base, banda) {
    return lienzo(256, function (g, n) {
      g.fillStyle = base; g.fillRect(0, 0, n, n);
      for (var x = 0; x < n; x += 32) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x, 0, 2, n); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 2, 0, 1, n); }
      if (banda) { g.fillStyle = banda; g.fillRect(0, n * 0.9, n, n * 0.1); }
      ruido(g, n, 800, '0,0,0', 0.05);
    }, 14, 1);
  }
  function texCartel(texto, fondo, color, ancho) {
    var t = lienzo(256, function (g, n) {
      g.fillStyle = fondo; g.fillRect(0, 0, n, n);
      g.fillStyle = color; g.font = 'bold ' + (ancho || 120) + 'px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, n / 2, n / 2 + 6);
    });
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
  }
  function mat(o) { var m = new T.MeshStandardMaterial(o); if (m.envMapIntensity === 1) m.envMapIntensity = 0.7; return m; }
  function luzTecho(c, color, intensidad) {
    // Luminarias lineales LED colgadas en filas
    var g = c.altoG;
    for (var i = 0; i < 4; i++) {
      var zl = c.minZ - 1.5 + (c.maxZ - c.minZ + 3) * i / 3;
      malla(caj(c.largo - 6, 0.08, 0.22), M.lampara, c.centro.x, c.techo - 1.4, zl, g, false);
      malla(caj(c.largo - 6, 0.04, 0.3), M.acero, c.centro.x, c.techo - 1.33, zl, g, false);
      if (i % 2 === 0) { var p = new T.PointLight(color, intensidad, 30, 1.5); p.position.set(c.centro.x, c.techo - 2, zl); grupo.add(p); }
    }
  }
  function paredes(c, matPared, zocalo) {
    conRelieve(matPared, 2.4, 0.9);
    malla(caj(c.largo, c.techo, 0.3), matPared, c.centro.x, c.techo / 2, c.zPared, c.pared1);
    malla(caj(0.3, c.techo, c.fondo), matPared, c.xPared, c.techo / 2, c.centro.z, c.pared2);
    if (zocalo) {
      malla(caj(c.largo, 0.5, 0.36), zocalo, c.centro.x, 0.25, c.zPared + 0.05, c.pared1);
      malla(caj(0.36, 0.5, c.fondo), zocalo, c.xPared + 0.05, 0.25, c.centro.z, c.pared2);
    }
  }
  function piso(c, material, rep) {
    conRelieve(material, 1.6, 0.5);
    var p = malla(new T.PlaneGeometry(c.largo + 30, c.fondo + 30), material, c.centro.x, 0, c.centro.z, grupo); p.rotation.x = -Math.PI / 2; p.castShadow = false;
    material.map.repeat.set((c.largo + 30) / (rep || 6), (c.fondo + 30) / (rep || 6));
  }
  function franja(x, z, ancho, largo, material, giro) {
    var f = malla(new T.PlaneGeometry(ancho, largo), material, x, 0.014, z, grupo, false); f.rotation.x = -Math.PI / 2; if (giro) f.rotation.z = giro; f.receiveShadow = true; return f;
  }
  function paleMixto(x, z, colores, alto) {
    malla(caj(1.2, 0.14, 1.0), M.madera, x, 0.07, z, grupo);
    var k = 0;
    for (var a = 0; a < (alto || 2); a++) for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      var m2 = mat({ map: M.cajaTex, color: colores[k++ % colores.length], roughness: 0.8 });
      malla(caj(0.56, 0.42, 0.46), m2, x - 0.29 + i * 0.58, 0.36 + a * 0.43, z - 0.24 + j * 0.48, grupo);
    }
  }

  var ESTILOS3D = {
    clasico: { nombre: 'Almacén pequeño', caja: 'carton', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0xe9b400, fondo: null },

    /* 1 · Centro de distribución regional (cross-docking): nave clara, andenes con portones numerados y zonas de preparación */
    regional: { nombre: 'Centro regional · cross-docking', caja: 'carton', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0x2e7d32,
      nave: function (c) {
        paredes(c, mat({ map: texPanelClaro('#dfe3e8', '#2e7d32'), roughness: 0.75, metalness: 0.15 }), mat({ color: 0x2e7d32, roughness: 0.6 }));
        piso(c, mat({ map: texPlano('#b9bcc1', 'rgba(0,0,0,.18)', 0, 0, 0.05), roughness: 0.45, metalness: 0.1 }), 5);
        // Andenes en la pared del fondo: portones numerados, sellos, topes y semáforos
        var nAnd = Math.max(3, Math.min(18, Math.floor(c.largo / 4.6))), sep = (c.largo - 6) / nAnd;
        for (var i = 0; i < nAnd; i++) {
          var xa = c.centro.x - (c.largo - 6) / 2 + sep * (i + 0.5);
          malla(new T.PlaneGeometry(3.0, 3.4), mat({ map: texPorton(), roughness: 0.6, metalness: 0.5 }), xa, 1.85, c.zPared + 0.17, c.pared1, false);
          malla(caj(3.6, 0.35, 0.4), M.goma, xa, 3.7, c.zPared + 0.3, c.pared1);
          [-1, 1].forEach(function (l) { malla(caj(0.3, 3.6, 0.4), M.goma, xa + l * 1.65, 1.8, c.zPared + 0.3, c.pared1); malla(caj(0.25, 0.35, 0.3), M.amarillo, xa + l * 1.2, 0.5, c.zPared + 0.35, c.pared1); });
          malla(caj(0.7, 0.7, 0.04), new T.MeshBasicMaterial({ map: texCartel('M' + (i + 1), '#0B4F8A', '#fff', 130), toneMapped: false }), xa, 4.45, c.zPared + 0.2, c.pared1, false);
          malla(new T.SphereGeometry(0.11, 12, 8), new T.MeshBasicMaterial({ color: i % 3 ? 0x22c55e : 0xef4444, toneMapped: false }), xa + 1.95, 2.6, c.zPared + 0.25, c.pared1, false);
          var fz = franja(xa, c.minZ - 2.6, 2.6, 3.0, M.verdeSuelo);                        // Zona de preparación pintada
          if (i % 2 === 0) paleMixto(xa - 0.6, c.minZ - 2.6, [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047], i % 4 ? 1 : 2);
        }
        // Zona central de cross-docking: carriles de consolidación con palés en tránsito
        (c.cortes || []).forEach(function (h) {
          var xm = (h[0] + h[1]) / 2, an = h[1] - h[0] - 2;
          franja(xm, c.centro.z, an, c.maxZ - c.minZ + 2, M.verdeSuelo);
          for (var z = c.minZ + 1; z < c.maxZ - 1; z += 2.6) for (var q = -1; q <= 1; q += 2) paleMixto(xm + q * an * 0.25, z, [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa], ((z * 7 + q) % 3 + 3) % 2 + 1);
          carretilla(xm, c.maxZ + 1, 0.4);
        });
        // Pasillo peatonal verde y carretillas
        franja(c.centro.x, c.maxZ + 3.2, c.largo - 4, 0.9, M.verdeSuelo);
        carretilla(c.maxX + c.W / 2 + 3, c.maxZ + 1.5, -0.9);
        luzTecho(c, 0xeaf2ff, 0.55);
      } },

    /* 2 · Centro de frío: cámara frigorífica, paneles blancos, cortina de lamas, evaporadores y -18 °C */
    frio: { nombre: 'Centro de frío · cámara −18 °C', caja: 'cubeta', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0x1e88e5, fondo: 0xcfe0f2,
      nave: function (c) {
        paredes(c, mat({ map: texPanelClaro('#f4f7fa', '#1565c0'), roughness: 0.55, metalness: 0.1 }), mat({ color: 0x1565c0, roughness: 0.5 }));
        piso(c, mat({ map: texPlano('#c9d3de', null, 0, 0, 0.035), roughness: 0.25, metalness: 0.15 }), 8);
        // Puerta frigorífica con cortina de lamas translúcidas
        var xp = c.maxX + c.W / 2 + 3.2;
        malla(caj(3.6, 4.0, 0.2), mat({ color: 0xe8edf2, roughness: 0.4, metalness: 0.3 }), xp, 2.0, c.zPared + 0.12, c.pared1);
        var lama = new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0.1 });
        for (var k = 0; k < 14; k++) malla(caj(0.2, 3.7, 0.02), lama, xp - 1.5 + k * 0.23, 1.95, c.zPared + 0.3 + (k % 2) * 0.02, c.pared1, false);
        // Evaporadores en la pared lateral
        for (var e = 0; e < 3; e++) {
          var ze = c.minZ + (c.maxZ - c.minZ) * (e + 0.5) / 3, gE = new T.Group(); gE.position.set(c.xPared + 0.7, c.techo - 2.2, ze); c.pared2.add(gE);
          malla(caj(1.1, 1.1, 3.2), mat({ color: 0xf0f3f6, roughness: 0.35, metalness: 0.4 }), 0, 0, 0, gE);
          for (var v = 0; v < 3; v++) { var a = malla(new T.CircleGeometry(0.42, 24), mat({ color: 0x29323d, roughness: 0.6 }), 0.56, 0, -1.05 + v * 1.05, gE, false); a.rotation.y = Math.PI / 2; }
        }
        // Pantalla de temperatura
        malla(caj(1.6, 0.8, 0.05), new T.MeshBasicMaterial({ map: texCartel('−18 °C', '#0b1324', '#38bdf8', 64), toneMapped: false }), c.centro.x, c.techo - 2.6, c.zPared + 0.2, c.pared1, false);
        franja(c.centro.x, c.maxZ + 3.2, c.largo - 4, 0.12, M.lineaAzul);
        franja(c.centro.x, c.maxZ + 4.2, c.largo - 4, 0.12, M.lineaAzul);
        luzTecho(c, 0xdff0ff, 0.6);
      } },

    /* 3 · Hub de e-commerce (fulfillment): nave oscura, racks amarillos, cinta transportadora, mesas de empaque y robots */
    ecommerce: { nombre: 'Hub e-commerce · fulfillment', caja: 'cubeta', pilar: 0x1c4f9c, viga: 0xf0661a, linea: 0xf2b705, fondo: null,
      nave: function (c) {
        paredes(c, mat({ map: texPanelClaro('#e6e9ee', '#f2b705'), roughness: 0.7, metalness: 0.2 }), M.amarillo);
        piso(c, mat({ map: texPlano('#5b6470', null, 0, 0, 0.05), roughness: 0.3, metalness: 0.2 }), 6);
        // Cinta transportadora de rodillos a lo largo del frente de los racks
        var zc = c.maxZ + 3.0, x0 = c.minX - c.W / 2 - 1, x1 = c.maxX + c.W / 2 + 1, lon = x1 - x0, xm = (x0 + x1) / 2;
        malla(caj(lon, 0.08, 0.9), M.acero, xm, 0.9, zc, grupo);
        malla(caj(lon, 0.04, 0.8), mat({ color: 0x15171b, roughness: 0.9 }), xm, 0.95, zc, grupo);
        [-1, 1].forEach(function (l) { malla(caj(lon, 0.18, 0.05), M.amarillo, xm, 0.98, zc + l * 0.47, grupo); });
        for (var x = x0 + 0.6; x < x1; x += 2.2) [-1, 1].forEach(function (l) { malla(caj(0.08, 0.9, 0.08), M.acero, x, 0.45, zc + l * 0.38, grupo); });
        var colores = [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa];
        for (var b = 0; b < Math.floor(lon / 1.6); b++) malla(caj(0.5, 0.3, 0.4), mat({ map: M.cubetaTex, color: colores[b % colores.length], roughness: 0.5 }), x0 + 0.8 + b * 1.6, 1.12, zc, grupo);
        (c.cortes || []).forEach(function (h) {
          var xm2 = (h[0] + h[1]) / 2, lz = c.maxZ - c.minZ + 4, zm = (c.minZ + c.maxZ) / 2;
          malla(caj(0.9, 0.08, lz), M.acero, xm2, 0.9, zm, grupo); malla(caj(0.8, 0.04, lz), mat({ color: 0x15171b, roughness: 0.9 }), xm2, 0.95, zm, grupo);
          [-1, 1].forEach(function (l) { malla(caj(0.05, 0.18, lz), M.amarillo, xm2 + l * 0.47, 0.98, zm, grupo); });
          for (var z2 = c.minZ - 1; z2 < c.maxZ + 2; z2 += 2.2) [-1, 1].forEach(function (l) { malla(caj(0.08, 0.9, 0.08), M.acero, xm2 + l * 0.38, 0.45, z2, grupo); });
          for (var q2 = 0; q2 < Math.floor(lz / 1.6); q2++) malla(caj(0.4, 0.3, 0.5), mat({ map: M.cubetaTex, color: [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa][q2 % 5], roughness: 0.5 }), xm2, 1.12, c.minZ - 1 + q2 * 1.6, grupo);
          [[xm2 - 2.5, c.centro.z - 3], [xm2 + 2.5, c.centro.z + 4]].forEach(function (p) {
            malla(caj(0.9, 0.3, 0.7), mat({ color: 0xff6d00, roughness: 0.5 }), p[0], 0.18, p[1], grupo);
            malla(caj(0.2, 0.05, 0.2), new T.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false }), p[0], 0.36, p[1], grupo, false);
          });
        });
        // Mesas de empaque con pantalla
        for (var m = 0; m < 3; m++) {
          var xe = x0 + lon * (m + 0.5) / 3, ze = zc + 2.2;
          malla(caj(2.0, 0.08, 0.9), mat({ color: 0xd9d4c7, roughness: 0.7 }), xe, 0.92, ze, grupo);
          [-0.9, 0.9].forEach(function (l) { malla(caj(0.06, 0.9, 0.8), M.acero, xe + l, 0.45, ze, grupo); });
          malla(caj(0.55, 0.36, 0.04), new T.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false }), xe, 1.45, ze + 0.3, grupo, false);
          malla(caj(0.05, 0.4, 0.05), M.acero, xe, 1.15, ze + 0.32, grupo);
        }
        // Robots móviles (AMR) en el piso
        [[c.minX + 1, c.minZ - 2.4], [c.centro.x, c.minZ - 3.2], [c.maxX - 1, zc - 1.6]].forEach(function (p, i) {
          malla(caj(0.9, 0.3, 0.7), mat({ color: 0xff6d00, roughness: 0.5 }), p[0], 0.18, p[1], grupo);
          malla(caj(0.2, 0.05, 0.2), new T.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false }), p[0], 0.36, p[1], grupo, false);
        });
        franja(xm, c.minZ - 2.8, lon, 0.1, M.amarillo); franja(xm, zc - 1.0, lon, 0.1, M.amarillo);
        luzTecho(c, 0xfff3e0, 0.55);
      } }
  };

  /** Colores más marcados para las cajas en 3D (mismo tono que la leyenda, más saturado). */
  function tonoCaja(hex, i) {
    var col = new T.Color(hex), hsl = {}; col.getHSL(hsl);
    var var_ = ((i * 37) % 9 - 4) / 100;                                  // ligera variación entre cajas
    col.setHSL(hsl.h, Math.min(1, hsl.s * 1.4 + 0.15), Math.max(0.22, Math.min(0.42, hsl.l * 0.72 + var_)));
    return col;
  }

  /* ===================== RACKS (genérico e instanciado) =====================
     Soporta: bloques separados por cortes (pasillos transversales), racks dobles espalda con espalda
     y alturas distintas por bloque. Todo con InstancedMesh para naves de miles de posiciones. */
  var _rotulos = {};
  function rotuloMat(letra) { return _rotulos[letra] || (_rotulos[letra] = new T.MeshBasicMaterial({ map: texRotulo(letra), toneMapped: false })); }
  function instanciar(geo, material, lista, sombra) {
    if (!lista.length) return;
    var m = new T.InstancedMesh(geo, material, lista.length), o = new T.Object3D();
    lista.forEach(function (p, i) { o.position.set(p[0], p[1], p[2]); o.scale.set(p[3], p[4], p[5]); o.rotation.set(p[6] || 0, 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = m.receiveShadow = sombra !== false; m.frustumCulled = false; grupo.add(m); return m;
  }
  /** Huecos en X (cortes entre bloques) para que cada estilo decore esas zonas. */
  function cortesX(U, W) {
    var xs = unicos(U.map(function (u) { return String(u.x); })).map(Number).sort(function (a, b) { return a - b; }), r = [];
    for (var i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > W * 1.5) r.push([xs[i - 1] + W / 2, xs[i] - W / 2]);
    return r;
  }
  function construirRacks(U, W, H, Dp) {
    var pil = {}, pies = [], trav = [], diag = [], guardas = [], vigas = [], rejillas = [], lineas = [], filas = {};
    U.forEach(function (u) { (filas[u.y] = filas[u.y] || []).push(u); });
    var ys = Object.keys(filas).map(Number).sort(function (a, b) { return a - b; });
    ys.forEach(function (zc, iy) {
      var fila = filas[zc], xs = unicos(fila.map(function (u) { return String(u.x); })).map(Number).sort(function (a, b) { return a - b; });
      var segs = [], seg = [xs[0]];
      for (var i = 1; i < xs.length; i++) { if (xs[i] - xs[i - 1] > W * 1.5) { segs.push(seg); seg = [xs[i]]; } else seg.push(xs[i]); }
      segs.push(seg);
      var vecinoAntes = iy > 0 && zc - ys[iy - 1] < Dp + 0.8, vecinoDespues = iy < ys.length - 1 && ys[iy + 1] - zc < Dp + 0.8;
      segs.forEach(function (sx) {
        var en = fila.filter(function (u) { return u.x >= sx[0] - 0.01 && u.x <= sx[sx.length - 1] + 0.01; });
        var zs = unicos(en.map(function (u) { return String(u.z); })).map(Number).sort(function (a, b) { return a - b; });
        var x0 = sx[0] - W / 2, x1 = sx[sx.length - 1] + W / 2, hTot = zs[zs.length - 1] + H * 0.92, lon = x1 - x0, xm = (x0 + x1) / 2;
        var postes = []; for (var k = 0; k < sx.length; k += 2) postes.push(sx[k] - W / 2); postes.push(x1);
        postes.forEach(function (xp) {
          var hk = hTot.toFixed(2); pil[hk] = pil[hk] || [];
          [-1, 1].forEach(function (l) { pil[hk].push([xp, hTot / 2, zc + l * Dp / 2, 1, hTot, 1]); pies.push([xp, 0.01, zc + l * Dp / 2, 1, 1, 1]); });
          // Marco: travesaños horizontales y diagonales en zigzag (galvanizados, como en un rack real)
          var paso = 1.1, ang = Math.atan2(paso, Dp - 0.06), largoD = Math.sqrt(paso * paso + (Dp - 0.06) * (Dp - 0.06)), k2 = 0;
          for (var yt = 0.15; yt < hTot - 0.1; yt += paso) {
            trav.push([xp, yt, zc, 1, 1, Dp - 0.06]);
            if (yt + paso < hTot) { diag.push([xp, yt + paso / 2, zc, 1, 1, largoD, k2 % 2 ? ang : -ang]); k2++; }
          }
        });
        zs.forEach(function (z) {
          if (z < 0.2) return;
          [-1, 1].forEach(function (l) { vigas.push([xm, z - 0.055, zc + l * (Dp / 2 + 0.02), lon, 1, 1]); });
          rejillas.push([xm, z + 0.005, zc, lon - 0.1, 1, Dp - 0.06]);
        });
        // Protectores amarillos de cabecera en los extremos del rack
        [x0 - 0.16, x1 + 0.16].forEach(function (xg) { guardas.push([xg, 0.22, zc, 1, 1, Dp + 0.24]); });
        var mr = rotuloMat(en[0].pasillo);
        [x0 - 0.05, x1 + 0.05].forEach(function (xr) {
          malla(caj(0.04, 0.72, 0.72), [mr, mr, M.acero, M.acero, M.acero, M.acero], xr, hTot + 0.52, zc, grupo, false);
          malla(caj(0.04, 0.2, 0.04), M.acero, xr, hTot + 0.08, zc, grupo, false);
        });
        if (!vecinoAntes) lineas.push([xm, 0.012, zc - (Dp / 2 + 0.32), lon + 1.2, 1, 1]);
        if (!vecinoDespues) lineas.push([xm, 0.012, zc + (Dp / 2 + 0.32), lon + 1.2, 1, 1]);
      });
    });
    Object.keys(pil).forEach(function (hk) { instanciar(caj(0.1, 1, 0.075), materialMontante(Number(hk)), pil[hk]); });
    instanciar(caj(0.16, 0.02, 0.16), M.acero, pies);
    instanciar(caj(0.035, 0.035, 1), M.galvanizado, trav);
    instanciar(caj(0.03, 0.03, 1), M.galvanizado, diag);
    instanciar(caj(0.14, 0.44, 1), M.amarillo, guardas);
    instanciar(caj(1, 0.11, 0.05), M.viga, vigas);
    instanciar(caj(1, 0.015, 1), M.rejilla, rejillas, false);
    instanciar(caj(1, 0.004, 0.09), M.lineaRack, lineas, false);
  }

  /** Genera las posiciones de una nave según su trazado (misma fórmula que la base de datos). */
  function generarUbicaciones(b) {
    var r = [], dos = function (n) { return ('0' + n).slice(-2); }, bloques = Math.max(1, b.bloques || 1), porBloque = Math.ceil(b.racks / bloques);
    (b.pasillos || []).forEach(function (p, i) {
      var y = b.dobles ? Math.floor(i / 2) * b.separacion + (i % 2) * 1.35 : i * b.separacion;
      for (var k = 1; k <= b.racks; k++) {
        var bl = Math.floor((k - 1) / porBloque), niv = (b.nivelesBloque && b.nivelesBloque[bl]) || b.niveles;
        for (var n = 1; n <= niv; n++) r.push({ id: 'UB-' + p + dos(k) + '-' + n, pasillo: p, rack: k, nivel: n, pos: p + '-' + dos(k) + '-N' + n,
          x: Math.round(((k - 1) * b.ancho + bl * (b.corte || 0)) * 100) / 100, y: Math.round(y * 100) / 100, z: Math.round((n - 1) * b.alto * 100) / 100, sku: '' });
      }
    });
    return r;
  }

  /* ===================== TEXTURAS PREMIUM =====================
     Relieve (normal map) calculado desde cada textura, reflejos de entorno (PMREM) y acabados
     de metal con laca. Las cajas conservan su color sólido. */
  function relieve(tex, fuerza) {
    var src = tex.image, w = src.width, h = src.height, g = src.getContext('2d'), d = g.getImageData(0, 0, w, h).data;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var gc = c.getContext('2d'), out = gc.createImageData(w, h), o = out.data, f = fuerza || 2;
    var lum = function (x, y) { x = (x + w) % w; y = (y + h) % h; var k = (y * w + x) * 4; return (d[k] * 0.299 + d[k + 1] * 0.587 + d[k + 2] * 0.114) / 255; };
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var dx = (lum(x - 1, y) - lum(x + 1, y)) * f, dy = (lum(x, y - 1) - lum(x, y + 1)) * f, l = Math.sqrt(dx * dx + dy * dy + 1), k = (y * w + x) * 4;
      o[k] = (dx / l * 0.5 + 0.5) * 255; o[k + 1] = (dy / l * 0.5 + 0.5) * 255; o[k + 2] = (1 / l * 0.5 + 0.5) * 255; o[k + 3] = 255;
    }
    gc.putImageData(out, 0, 0);
    var t = new T.CanvasTexture(c); t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.repeat.copy(tex.repeat); t.anisotropy = 8; return t;
  }
  function conRelieve(material, fuerza, escala) {
    if (!material.map || material.normalMap) return material;
    material.normalMap = relieve(material.map, fuerza); material.normalScale = new T.Vector2(escala || 0.8, escala || 0.8);
    material.normalMap.repeat = material.map.repeat; material.needsUpdate = true; return material;
  }
  function entornoPremium() {
    // Nave virtual para los reflejos: degradado de techo a piso con filas de luminarias
    var pm = new T.PMREMGenerator(render), s = new T.Scene();
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
    var g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#f4f7fb'); gr.addColorStop(0.45, '#c9d1dc'); gr.addColorStop(0.55, '#6d7480'); gr.addColorStop(1, '#2a2e35');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    var tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding;
    s.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.MeshBasicMaterial({ map: tex, side: T.BackSide })));
    for (var i = -2; i <= 2; i++) { var p = new T.Mesh(new T.PlaneGeometry(60, 2.2), new T.MeshBasicMaterial({ color: 0xffffff })); p.position.set(0, 18, i * 9); p.rotation.x = Math.PI / 2; s.add(p); }
    escena.environment = pm.fromScene(s, 0.035).texture; pm.dispose();
  }
  function rejillaAlambre() {
    // Malla de alambre real (transparente entre alambres) para los entrepaños
    var t = lienzo(256, function (g, n) {
      g.fillStyle = '#000'; g.fillRect(0, 0, n, n); g.fillStyle = '#fff';
      for (var k = 0; k < n; k += 32) { g.fillRect(k, 0, 5, n); g.fillRect(0, k, n, 3); }
    }, 1, 1);
    t.encoding = T.LinearEncoding; return t;
  }
  function materialesPremium() {
    entornoPremium();
    render.toneMappingExposure = 1.04;
    var laca = function (color) { return new T.MeshPhysicalMaterial({ color: color, roughness: 0.34, metalness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.9 }); };
    M.pilar = laca(0x1c4f9c); M.viga = laca(0xf0661a);
    M.pilar.envMapIntensity = 0.35; M.pilar.metalness = 0.15; M.pilar.clearcoat = 0.35;
    M.viga.envMapIntensity = 0.3; M.viga.metalness = 0.1; M.viga.clearcoat = 0.3; M.viga.roughness = 0.4;
    M.viga.map = texViga(); M.viga.normalMap = relieve(M.viga.map, 3); M.viga.normalMap.repeat = M.viga.map.repeat;
    M.galvanizado = new T.MeshStandardMaterial({ color: 0xd3d8de, roughness: 0.32, metalness: 0.85, envMapIntensity: 1.0 });
    M.pared = new T.MeshStandardMaterial({ map: texPanelClaro('#e3e7ec', '#1c4f9c'), roughness: 0.7, metalness: 0.2 });
    M.acero = new T.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.0 });
    M.amarillo = new T.MeshPhysicalMaterial({ color: 0xe9b400, roughness: 0.45, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    var malla_ = rejillaAlambre();
    M.rejilla = new T.MeshStandardMaterial({ color: 0xaab3c0, roughness: 0.35, metalness: 0.85, alphaMap: malla_, transparent: false, alphaTest: 0.5, side: T.DoubleSide });
    M.rejilla.alphaMap.repeat.set(6, 3);
    conRelieve(M.madera, 3.2, 0.9); M.madera.roughness = 0.78;
    conRelieve(M.piso, 1.6, 0.55); M.piso.roughness = 0.38; M.piso.metalness = 0.05; M.piso.envMapIntensity = 0.75;
    conRelieve(M.pared, 2.4, 0.9); M.pared.envMapIntensity = 0.6;
    M.cajaCarton.normalMap = relieve(M.cajaTex, 1.2); M.cajaCarton.normalScale = new T.Vector2(0.35, 0.35);
    M.cajaCubeta.normalMap = relieve(M.cubetaTex, 2.0); M.cajaCubeta.normalScale = new T.Vector2(0.6, 0.6);
    M.cajaCubeta.envMapIntensity = 0.25; M.cajaCarton.envMapIntensity = 0.15;
  }

  /* ===================== RACK REALISTA (montante azul perforado, viga naranja, marco galvanizado) ===================== */
  var _montantes = {};
  function texMontante() {
    // Cara del montante: pintura azul con perforaciones en dos columnas (ranuras tipo lágrima)
    return lienzo(128, function (g, n) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n);
      ruido(g, n, 600, '0,0,0', 0.05);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, n * 0.08, n); g.fillRect(n * 0.92, 0, n * 0.08, n);       // pliegues laterales
      for (var y = 10; y < n; y += 64) [0.32, 0.68].forEach(function (cx) {
        g.fillStyle = '#0b1220'; g.beginPath(); g.ellipse(n * cx, y + 8, n * 0.035, 7, 0, 0, Math.PI * 2); g.fill();
        g.fillRect(n * cx - n * 0.016, y + 13, n * 0.032, 9);
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(n * cx - n * 0.04, y + 25, n * 0.08, 1);
      });
    }, 1, 1);
  }
  function materialMontante(alto) {
    var k = alto.toFixed(1);
    if (_montantes[k]) return _montantes[k];
    if (!M._texMontante) { M._texMontante = texMontante(); M._normMontante = relieve(M._texMontante, 4); }
    var map = M._texMontante.clone(), nor = M._normMontante.clone();
    map.needsUpdate = nor.needsUpdate = true; map.repeat.set(1, alto * 9); nor.repeat.set(1, alto * 9);
    var m = new T.MeshPhysicalMaterial({ color: M.pilar.color.getHex(), map: map, normalMap: nor, normalScale: new T.Vector2(0.7, 0.7),
      roughness: 0.42, metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.35 });
    return (_montantes[k] = m);
  }
  function texViga() {
    // Viga tipo escalón: cara frontal pintada con canto superior y sombra del escalón
    return lienzo(128, function (g, n) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); ruido(g, n, 500, '0,0,0', 0.05);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, n, n * 0.14);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, n * 0.14, n, n * 0.05);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, n * 0.9, n, n * 0.1);
    }, 6, 1);
  }
