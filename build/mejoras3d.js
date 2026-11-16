  /* ===================== MEJORAS 16/11/2026 (bodega 3D) =====================
     · Suelo de hormigón pulido con juntas, árido y huellas de rodadura.
     · Señalética pintada: letras de pasillo, STOP, flechas de sentido, límite de velocidad,
       aviso de carretillas, andén peatonal con pasos de cebra y zona de despacho.
     · Contorno de la posición bajo el ratón (la ficha la pinta fichaHover, fuera del motor).
     · Ruta destacada: cinta luminosa con flechas que avanzan, haces de luz en cada parada,
       paradas que se marcan al pasar la carretilla y cámara que puede seguirla.              */

  function texSuelo(base, opc) {
    opc = opc || {};
    return lienzo(1024, function (g, n) {
      var R = function () { return Math.random(); };
      g.fillStyle = base; g.fillRect(0, 0, n, n);
      for (var i = 0; i < 70; i++) {                                      // nubes de tono del pulido
        var x = R() * n, y = R() * n, r = 50 + R() * 260, gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, i % 3 ? 'rgba(255,255,255,' + (0.04 + R() * 0.06) + ')' : 'rgba(0,0,0,' + (0.05 + R() * 0.07) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ruido(g, n, 46000, '0,0,0', 0.09); ruido(g, n, 30000, '255,255,255', 0.07);
      for (i = 0; i < 2600; i++) {                                         // árido visto
        var s = 0.6 + R() * 2.2; g.fillStyle = 'rgba(' + (R() < 0.55 ? '28,30,34' : '232,234,238') + ',' + (0.12 + R() * 0.22) + ')';
        g.fillRect(R() * n, R() * n, s, s);
      }
      if (!opc.limpio) {
        g.lineCap = 'round';                                               // huellas de rodadura de carretillas
        for (i = 0; i < 9; i++) {
          var x0 = 80 + R() * (n - 160), y0 = 80 + R() * (n - 160), dx = (R() - 0.5) * 700, dy = (R() - 0.5) * 700;
          g.strokeStyle = 'rgba(18,20,24,' + (0.035 + R() * 0.05) + ')'; g.lineWidth = 9 + R() * 8;
          [-11, 11].forEach(function (o) { g.beginPath(); g.moveTo(x0 + o, y0); g.quadraticCurveTo(x0 + dx * 0.5 + o, y0 + dy * 0.2, Math.max(20, Math.min(n - 20, x0 + dx)), Math.max(20, Math.min(n - 20, y0 + dy))); g.stroke(); });
        }
        for (i = 0; i < 6; i++) {                                          // manchas de aceite y desgaste
          var mx = R() * n, my = R() * n, mr = 14 + R() * 46, mg = g.createRadialGradient(mx, my, 0, mx, my, mr);
          mg.addColorStop(0, 'rgba(20,22,26,' + (0.08 + R() * 0.08) + ')'); mg.addColorStop(1, 'rgba(20,22,26,0)'); g.fillStyle = mg; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
        }
      }
      g.strokeStyle = 'rgba(20,22,26,.18)'; g.lineWidth = 1;                // microfisuras
      for (i = 0; i < 5; i++) { g.beginPath(); var a = R() * n, b = R() * n; g.moveTo(a, b); for (var j = 0; j < 7; j++) { a += (R() - 0.5) * 60; b += R() * 40; g.lineTo(a, b); } g.stroke(); }
      g.strokeStyle = 'rgba(18,20,24,.62)'; g.lineWidth = 3.2;              // juntas de corte de la losa
      g.beginPath(); g.moveTo(0, 1.6); g.lineTo(n, 1.6); g.moveTo(1.6, 0); g.lineTo(1.6, n); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 4.6); g.lineTo(n, 4.6); g.moveTo(4.6, 0); g.lineTo(4.6, n); g.stroke();
    });
  }

  /* ---------- señalética pintada en el suelo ---------- */
  var _senal = {}, _matPint = {};
  function decal(clave, w, h, pintar) {
    if (_senal[clave]) return _senal[clave];
    var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); pintar(g, w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; t.userData.compartida = true; return (_senal[clave] = t);
  }
  function caminoR(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  var FUENTE = '800 {s}px Inter, "Segoe UI", Arial, sans-serif';
  function fuente(s) { return FUENTE.replace('{s}', s); }
  /** Pintura del suelo: recibe luz y sombras como el hormigón; giro orienta la parte de arriba del dibujo. */
  function pintura(tex, x, z, ancho, largo, giro, capa) {
    capa = capa || 0;
    var m = _matPint[tex.uuid] || (_matPint[tex.uuid] = new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.5, metalness: 0.05,
      polygonOffset: true, polygonOffsetFactor: -2 - capa, polygonOffsetUnits: -2 - capa }));
    var geo = new T.PlaneGeometry(ancho, largo); geo.rotateX(-Math.PI / 2); if (giro) geo.rotateY(giro);
    var me = new T.Mesh(geo, m); me.position.set(x, 0.017 + capa * 0.002, z); me.receiveShadow = true; me.renderOrder = 1; grupo.add(me); return me;
  }
  var AMARILLO = '#F2B705';
  function texLetra(txt) {
    return decal('letra:' + txt, 512, 288, function (g, w, h) {
      g.fillStyle = 'rgba(12,16,24,.30)'; caminoR(g, 12, 12, w - 24, h - 24, 34); g.fill();
      g.lineWidth = 16; g.strokeStyle = AMARILLO; caminoR(g, 12, 12, w - 24, h - 24, 34); g.stroke();
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var s = txt.length > 5 ? 150 : 190; g.font = fuente(s); while (g.measureText(txt).width > w - 70) { s -= 10; g.font = fuente(s); }
      g.fillText(txt, w / 2, h / 2 + 8);
    });
  }
  function texStop() {
    return decal('stop', 512, 168, function (g, w, h) {
      g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(0, h - 34, w, 34);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fuente(104); g.fillText('STOP', w / 2, (h - 34) / 2 + 6);
    });
  }
  function texFlecha() {
    return decal('flecha', 160, 320, function (g, w, h) {
      g.fillStyle = 'rgba(255,255,255,.93)';
      g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 6, 120); g.lineTo(w * 0.66, 120); g.lineTo(w * 0.66, h - 8); g.lineTo(w * 0.34, h - 8); g.lineTo(w * 0.34, 120); g.lineTo(6, 120); g.closePath(); g.fill();
    });
  }
  function texVelocidad() {
    return decal('vel', 256, 256, function (g, w) {
      g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.arc(w / 2, w / 2, 118, 0, Math.PI * 2); g.fill();
      g.lineWidth = 26; g.strokeStyle = '#D92D20'; g.beginPath(); g.arc(w / 2, w / 2, 104, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#111827'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fuente(108); g.fillText('10', w / 2, w / 2 - 6);
      g.font = fuente(30); g.fillText('km/h', w / 2, w / 2 + 62);
    });
  }
  function texAviso() {
    return decal('aviso', 300, 270, function (g, w, h) {
      g.fillStyle = AMARILLO; g.strokeStyle = '#111827'; g.lineWidth = 16; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w - 14, h - 14); g.lineTo(14, h - 14); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#111827'; var x = w / 2 - 52, y = 120;                 // carretilla
      g.fillRect(x, y + 34, 70, 34); g.fillRect(x + 6, y + 6, 8, 30); g.fillRect(x + 6, y + 4, 44, 6); g.fillRect(x + 42, y + 6, 6, 30);
      g.fillRect(x + 78, y - 10, 8, 82); g.fillRect(x + 78, y + 64, 40, 7);
      g.beginPath(); g.arc(x + 16, y + 76, 13, 0, Math.PI * 2); g.arc(x + 60, y + 76, 13, 0, Math.PI * 2); g.fill();
    });
  }
  function texAnden() {
    return decal('anden', 64, 64, function (g, w, h) {
      g.fillStyle = 'rgba(46,158,91,.88)'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    });
  }
  function texPeaton() {
    return decal('peaton', 256, 256, function (g, w) {
      g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.arc(128, 44, 24, 0, Math.PI * 2); g.fill();
      g.lineWidth = 30; g.beginPath(); g.moveTo(124, 82); g.lineTo(116, 150); g.stroke();
      g.lineWidth = 22; g.beginPath(); g.moveTo(116, 150); g.lineTo(88, 200); g.lineTo(70, 236); g.moveTo(116, 150); g.lineTo(146, 192); g.lineTo(150, 238);
      g.moveTo(122, 96); g.lineTo(90, 128); g.lineTo(76, 162); g.moveTo(124, 96); g.lineTo(160, 120); g.lineTo(184, 150); g.stroke();
    });
  }
  function texCebra() {
    return decal('cebra', 256, 512, function (g, w, h) {
      g.fillStyle = 'rgba(255,255,255,.92)'; for (var i = 0; i < 7; i++) g.fillRect(0, 8 + i * 72, w, 38);
    });
  }
  function texDespacho() {
    return decal('despacho', 640, 480, function (g, w, h) {
      var b = 54; g.save(); g.beginPath(); g.rect(0, 0, w, h); g.rect(b, b, w - 2 * b, h - 2 * b); g.clip('evenodd');
      g.fillStyle = AMARILLO; g.fillRect(0, 0, w, h); g.fillStyle = '#111827';
      for (var x = -h; x < w + h; x += 56) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 28, 0); g.lineTo(x + 28 - h, h); g.lineTo(x - h, h); g.closePath(); g.fill(); }
      g.restore(); g.fillStyle = 'rgba(255,255,255,.95)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fuente(84); g.fillText('DESPACHO', w / 2, h / 2 - 20);
      g.font = fuente(40); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('ZONA DE CARGA', w / 2, h / 2 + 56);
    });
  }
  function texDiscontinua() {
    var t = decal('discont', 64, 256, function (g, w, h) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 0, w, h * 0.55); });
    t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function senaletica(W, Dp) {
    var G = geometriaBodega(); if (!G || !G.corr || G.corr.length < 2 || !G.ys.length) return;
    var ys = G.ys, nC = G.corr.length, z0 = G.corr[0].y, z1 = G.corr[nC - 1].y;
    // Letras de pasillo a la entrada de cada corredor y STOP para quien sale al pasillo principal
    G.corr.forEach(function (cr, k) {
      var letras = unicos(ys.filter(function (y) { return (G.acceso[y] || []).indexOf(k) > -1; }).map(function (y) { return G.fila[y]; }));
      if (!letras.length) return;
      var t = texLetra(letras.join(' · '));
      G.tramos.forEach(function (tr) {
        [[tr[0], -1], [tr[1], 1]].forEach(function (e) {
          var xb = e[0], s = e[1];
          pintura(t, xb + s * 1.05, cr.y, 1.75, 0.98, s < 0 ? -Math.PI / 2 : Math.PI / 2, 1);
          pintura(texStop(), xb - s * 0.62, cr.y, 1.75, 0.58, s < 0 ? Math.PI / 2 : -Math.PI / 2, 1);
        });
      });
    });
    // Pasillos principales: línea central, flechas de sentido, velocidad máxima y aviso de carretillas
    var disc = texDiscontinua();
    G.cruces.forEach(function (cx) {
      var largo = Math.max(1, z1 - z0), geo = new T.PlaneGeometry(0.12, largo), uv = geo.attributes.uv;
      for (var i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * largo / 2);
      var m = _matPint.disc || (_matPint.disc = new T.MeshStandardMaterial({ map: disc, transparent: true, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      geo.rotateX(-Math.PI / 2); var me = new T.Mesh(geo, m); me.position.set(cx, 0.018, (z0 + z1) / 2); me.receiveShadow = true; grupo.add(me);
      ys.forEach(function (y, k) {
        if (k === 1) pintura(texVelocidad(), cx, y, 1.25, 1.25, 0, 2);
        else if (k === ys.length - 2 && k > 1) pintura(texAviso(), cx, y, 1.35, 1.2, 0, 2);
        else if (k % 2 === 0) { pintura(texFlecha(), cx - 0.8, y, 0.62, 1.25, Math.PI, 2); pintura(texFlecha(), cx + 0.8, y, 0.62, 1.25, 0, 2); }
      });
    });
    // Andén peatonal junto a la pared, con pictogramas y pasos de cebra hasta los racks
    var zw = ys[0] - 4.45, xa = G.minX - W / 2 - 6.2, xb2 = G.maxX + W / 2 + 5.8;
    pintura(texAnden(), (xa + xb2) / 2, zw, xb2 - xa, 1.05, 0, 0);
    for (var xp = xa + 2.5; xp < xb2 - 1; xp += 7) pintura(texPeaton(), xp, zw, 0.82, 0.82, 0, 1);
    var zc0 = zw + 0.55, zc1 = ys[0] - Dp / 2 - 0.2;
    if (zc1 - zc0 > 0.8) G.tramos.forEach(function (tr) { pintura(texCebra(), (tr[0] + tr[1]) / 2, (zc0 + zc1) / 2, 2.3, zc1 - zc0, 0, 1); });
    // Zona de despacho rayada
    pintura(texDespacho(), G.deposito.x, z0, 3.3, 2.5, 0, 0);
  }

  /* ---------- contorno de la posición bajo el ratón ---------- */
  var marcoH = null;
  function resaltarHover(id) {
    if (!grupo) return;
    if (!marcoH || marcoH.parent !== grupo) {
      marcoH = new T.LineSegments(new T.EdgesGeometry(caj(dim.w * 0.98, dim.h * 0.92, dim.d + 0.08)), new T.LineBasicMaterial({ color: 0xffffff, toneMapped: false, depthTest: false, transparent: true, opacity: 0.9 }));
      marcoH.renderOrder = 6; marcoH.visible = false; grupo.add(marcoH);
    }
    var x = id ? C.ubi[id] : null, ver = !!x && id !== ESTADO.sel;
    if (ver) marcoH.position.set(x.u.x, x.u.z + dim.h * 0.45, x.u.y);
    if (ver || marcoH.visible) { marcoH.visible = ver; sucio = true; }
  }

  /* ---------- ruta destacada ---------- */
  var _texRuta = {};
  function texCompartida(clave, w, h, pintar, repetir) {
    if (_texRuta[clave]) return _texRuta[clave];
    var c = document.createElement('canvas'); c.width = w; c.height = h; pintar(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.userData.compartida = true; if (repetir) t.wrapS = t.wrapT = T.RepeatWrapping;
    return (_texRuta[clave] = t);
  }
  /** Flechas blancas que avanzan a lo largo de la cinta (se repiten cada 0,95 m). */
  function texChevron() {
    return texCompartida('chev', 256, 128, function (g, w, h) {
      g.fillStyle = 'rgba(255,255,255,.96)';
      g.beginPath(); g.moveTo(58, 14); g.lineTo(122, 14); g.lineTo(190, 64); g.lineTo(122, 114); g.lineTo(58, 114); g.lineTo(126, 64); g.closePath(); g.fill();
    }, true);
  }
  /** Degradado transversal para el halo de la cinta. */
  function texHalo() {
    return texCompartida('halo', 8, 128, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
  /** Haz de luz vertical: intenso abajo, se desvanece hacia arriba y hacia los bordes. */
  function texHaz() {
    return texCompartida('haz', 128, 256, function (g, w, h) {
      var gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gx; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      var gy = g.createLinearGradient(0, h, 0, 0); gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(0.75, 'rgba(0,0,0,.35)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gy; g.fillRect(0, 0, w, h);
    });
  }
  function plano(padre, ancho, alto, material, x, y, z, ang, repU) {
    var geo = new T.PlaneGeometry(ancho, alto);
    if (repU) { var uv = geo.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * repU); }
    geo.rotateX(-Math.PI / 2); geo.rotateY(ang || 0);
    var m = new T.Mesh(geo, material); m.position.set(x, y, z); m.renderOrder = 3; padre.add(m); return m;
  }
  function enTramo(t, x, z) {
    var e = 0.06;
    if (Math.abs(t.a[1] - t.b[1]) < e) return Math.abs(z - t.a[1]) < e && x >= Math.min(t.a[0], t.b[0]) - e && x <= Math.max(t.a[0], t.b[0]) + e;
    return Math.abs(x - t.a[0]) < e && z >= Math.min(t.a[1], t.b[1]) - e && z <= Math.max(t.a[1], t.b[1]) + e;
  }
  /* ---------- ruta con estela de luz (cinta curva con bordes brillantes, ramales y anillos en cada parada) ---------- */
  var texDeRuta = [], cintasAnim = [];
  /** Recorrido suave: esquinas redondeadas y puntos cada 0,4 m, con la distancia acumulada. */
  function caminoSuave(P, radio) {
    var out = [], add = function (x, z) { var l = out[out.length - 1]; if (!l || Math.abs(l[0] - x) + Math.abs(l[1] - z) > 1e-4) out.push([x, z]); };
    var recta = function (a, b) { var L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.4)); for (var k = 1; k <= n; k++) add(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n); };
    var Q = []; P.forEach(function (p) { var l = Q[Q.length - 1]; if (!l || Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) > 0.01) Q.push([p[0], p[1]]); });
    if (Q.length < 2) return { p: Q, s: [0], L: 0 };
    add(Q[0][0], Q[0][1]); var desde = Q[0];
    for (var i = 1; i < Q.length - 1; i++) {
      var A = Q[i - 1], B = Q[i], C = Q[i + 1], l1 = Math.hypot(B[0] - A[0], B[1] - A[1]), l2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
      var r = Math.min(radio, l1 / 2, l2 / 2), u1 = [(B[0] - A[0]) / l1, (B[1] - A[1]) / l1], u2 = [(C[0] - B[0]) / l2, (C[1] - B[1]) / l2];
      var e = [B[0] - u1[0] * r, B[1] - u1[1] * r], f = [B[0] + u2[0] * r, B[1] + u2[1] * r];
      recta(desde, e);
      for (var k = 1; k <= 10; k++) { var t = k / 10, m = 1 - t; add(m * m * e[0] + 2 * m * t * B[0] + t * t * f[0], m * m * e[1] + 2 * m * t * B[1] + t * t * f[1]); }
      desde = f;
    }
    recta(desde, Q[Q.length - 1]);
    var S = [0]; for (var q = 1; q < out.length; q++) S.push(S[q - 1] + Math.hypot(out[q][0] - out[q - 1][0], out[q][1] - out[q - 1][1]));
    return { p: out, s: S, L: S[S.length - 1] };
  }
  function puntoEn(C, d) {
    var lo = 0, hi = C.s.length - 1; d = Math.max(0, Math.min(C.L, d));
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (C.s[m] <= d) lo = m; else hi = m; }
    var a = C.p[lo], b = C.p[hi] || a, seg = (C.s[hi] - C.s[lo]) || 1, f = (d - C.s[lo]) / seg;
    return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[0] - a[0], b[1] - a[1]) };
  }
  /** Malla de cinta sobre el suelo a lo largo de un camino (u = metros / periodo, v = de borde a borde). */
  function cintaGeo(C, ancho, desp, periodo) {
    var n = C.p.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
    for (var i = 0; i < n; i++) {
      var a = C.p[Math.max(0, i - 1)], b = C.p[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      var cx = C.p[i][0] + nx * desp, cz = C.p[i][1] + nz * desp;
      pos.set([cx + nx * ancho / 2, 0, cz + nz * ancho / 2, cx - nx * ancho / 2, 0, cz - nz * ancho / 2], i * 6);
      uv.set([C.s[i] / periodo, 1, C.s[i] / periodo, 0], i * 4);
      if (i < n - 1) { var k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
  /** Textura de la estela: bordes blancos brillantes, interior translúcido del color del lote y trazos que avanzan. */
  function texEstela(color) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 128; var g = c.getContext('2d'), col = new T.Color(color), rgb = Math.round(col.r * 255) + ',' + Math.round(col.g * 255) + ',' + Math.round(col.b * 255);
    var gv = g.createLinearGradient(0, 0, 0, 128);
    gv.addColorStop(0, 'rgba(255,255,255,1)'); gv.addColorStop(0.09, 'rgba(255,255,255,.95)'); gv.addColorStop(0.16, 'rgba(' + rgb + ',.55)'); gv.addColorStop(0.5, 'rgba(' + rgb + ',.32)');
    gv.addColorStop(0.84, 'rgba(' + rgb + ',.55)'); gv.addColorStop(0.91, 'rgba(255,255,255,.95)'); gv.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gv; g.fillRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(255,255,255,.85)';                                  // trazos centrales (dan la sensación de flujo)
    g.beginPath(); g.moveTo(40, 44); g.lineTo(110, 44); g.lineTo(150, 64); g.lineTo(110, 84); g.lineTo(40, 84); g.lineTo(80, 64); g.closePath(); g.fill();
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = T.RepeatWrapping; t.anisotropy = 8; texDeRuta.push(t); return t;
  }
  function cinta(padre, C, ancho, desp, y, color, orden) {
    var mHalo = new T.MeshBasicMaterial({ map: texHalo(), color: new T.Color(color), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, side: T.DoubleSide });
    var halo = new T.Mesh(cintaGeo(C, ancho * 3.2, desp, 1), mHalo); halo.position.y = y; halo.renderOrder = orden; padre.add(halo);
    var tx = texEstela(color); cintasAnim.push(tx);
    var cuerpo = new T.Mesh(cintaGeo(C, ancho, desp, 1.1), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
    cuerpo.position.y = y + 0.004; cuerpo.renderOrder = orden + 1; padre.add(cuerpo);
  }
  /** Caja de cristal con aristas luminosas en la posición que debe buscar el preparador. */
  function cajaObjetivo(padre, s, color) {
    var g = new T.Group(); g.position.set(s.x, s.z + dim.h * 0.45, s.y); padre.add(g);
    var geo = caj(dim.w * 1.0, dim.h * 0.94, dim.d + 0.16);
    var vidrio = new T.Mesh(geo, new T.MeshBasicMaterial({ color: new T.Color(color).lerp(new T.Color('#ffffff'), 0.45), transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }));
    vidrio.renderOrder = 8; g.add(vidrio);
    var aristas = new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 1 }));
    aristas.renderOrder = 9; g.add(aristas);
    var brillo = new T.LineSegments(new T.EdgesGeometry(caj(dim.w * 1.06, dim.h * 1.0, dim.d + 0.24)), new T.LineBasicMaterial({ color: new T.Color(color), toneMapped: false, transparent: true, opacity: 0.7 }));
    brillo.renderOrder = 9; g.add(brillo);
    return { g: g, vidrio: vidrio, aristas: aristas, brillo: brillo };
  }
  function dibujarRuta() {
    if (rutaG) { escena.remove(rutaG); rutaG.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); rutaG = null; }
    texDeRuta.forEach(function (t) { t.dispose(); }); texDeRuta = []; cintasAnim = [];
    rutaAnim = null; sucio = true;
    var L = (ESTADO.rutas || []).filter(function (R) { return R && R.puntos && R.puntos.length > 1; }); if (!L.length) return;
    rutaG = new T.Group(); escena.add(rutaG);
    var bolas = [], kE = Math.max(1, Math.min(1.9, radioBase / 35));
    L.forEach(function (R, ri) {
      var y0 = 0.05 + ri * 0.006, desp = (ri - (L.length - 1) / 2) * 0.6, C = caminoSuave(R.puntos, 1.6);
      cinta(rutaG, C, 0.62, desp, y0, R.color, 3);
      var paradas = [], dMin = 0;
      R.paradas.forEach(function (s, k) {
        // distancia de la parada sobre el recorrido (la más cercana, después de la parada anterior)
        var mejor = Infinity, dPar = dMin;
        for (var i = 0; i < C.p.length; i++) { if (C.s[i] < dMin - 0.01) continue; var dd = Math.abs(C.p[i][0] - s.x) + Math.abs(C.p[i][1] - s.cy); if (dd < mejor - 1e-6) { mejor = dd; dPar = C.s[i]; } if (mejor < 0.05) break; }
        dMin = dPar;
        var color = s.color || R.color, sig = s.cy > s.y ? 1 : -1, zf = s.y + sig * (dim.d / 2 + 0.55);
        // ramal curvo desde la ruta hasta el anillo frente a la posición
        var P0 = puntoEn(C, Math.max(0, dPar - 1.4)), ram = caminoSuave([[P0.x, P0.z], [s.x, s.cy], [s.x, zf]], 1.0);
        if (ram.L > 0.3) cinta(rutaG, ram, 0.36, 0, y0 + 0.008, color, 5);
        var anillo = plano(rutaG, 1.5, 1.5, new T.MeshBasicMaterial({ color: new T.Color(color).lerp(new T.Color('#ffffff'), 0.35), transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, map: texAnillo() }), s.x, y0 + 0.02, zf, 0);
        anillo.renderOrder = 7;
        var hz = s.z + dim.h * 0.95 + 0.9;
        var haz = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, hz, 28, 1, true), new T.MeshBasicMaterial({ map: texHaz(), color: new T.Color(color), transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
        haz.position.set(s.x, hz / 2 + 0.02, zf); haz.renderOrder = 4; rutaG.add(haz);
        var obj = s.marca ? null : cajaObjetivo(rutaG, s, color);
        if (s.marca) marcaPosicion(s);
        var tex = texParada(s.num || String(k + 1), color, s.l1 || (s.uds + ' uds · ' + s.sku), corto(s.l2 != null ? s.l2 : s.nombre, 24));
        var texOk = texParada('✓', '#16A34A', s.l1 || (s.uds + ' uds · ' + s.sku), s.marca ? 'Hecho' : 'Recogido');
        texDeRuta.push(tex, texOk);
        var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false }));
        sp.scale.set(2.3 * kE, 0.575 * kE, 1); sp.position.set(s.x, s.z + dim.h + 0.35 + 0.3 * kE + (s.dy || 0) * kE, s.y); sp.renderOrder = 20 + ri; rutaG.add(sp);
        paradas.push({ d: dPar, anillo: anillo, haz: haz, obj: obj, sp: sp, tex: tex, texOk: texOk, hecho: false, flash: 0, k: k, col: new T.Color(color) });
      });
      var bola = carretillaRuta(R.color, kE);
      var aro = new T.Mesh(new T.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: texAnillo(), color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
      aro.position.y = 0.03; aro.renderOrder = 6; bola.add(aro);
      rutaG.add(bola); bolas.push({ bola: bola, C: C, desp: desp, total: C.L, ang: null, paradas: paradas });
    });
    var R0 = L[0];
    var dep = plano(rutaG, 2.8, 2.8, new T.MeshBasicMaterial({ map: texAnillo(), color: 0x22c55e, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }), R0.deposito.x, 0.06, R0.deposito.y, 0);
    var tDep = texEtiqueta('DESPACHO', '#16A34A', 380); texDeRuta.push(tDep);
    var spd = new T.Sprite(new T.SpriteMaterial({ map: tDep, depthTest: false, toneMapped: false }));
    spd.scale.set(3.0, 1.0, 1); spd.position.set(R0.deposito.x, 1.7, R0.deposito.y); spd.renderOrder = 30; rutaG.add(spd);

    var t0 = performance.now(), ultimo = 0, lentos = 0, verde = new T.Color('#22C55E');
    var poner = function (q, d) {
      var p = puntoEn(q.C, d), nx = Math.cos(p.ang), nz = -Math.sin(p.ang);
      q.bola.position.set(p.x + nx * q.desp, 0, p.z + nz * q.desp);
      if (q.ang == null || d === 0) q.ang = p.ang; else q.ang += Math.atan2(Math.sin(p.ang - q.ang), Math.cos(p.ang - q.ang)) * 0.35;
      q.bola.rotation.y = q.ang;
    };
    var marcar = function (p, hecho) {
      if (p.hecho === hecho) return; p.hecho = hecho;
      p.sp.material.map = hecho ? p.texOk : p.tex; p.sp.material.needsUpdate = true; p.flash = hecho ? 1 : 0;
      var c = hecho ? verde : p.col;
      p.haz.material.color.copy(c); p.anillo.material.color.copy(c).lerp(new T.Color('#ffffff'), 0.35);
      if (p.obj) { p.obj.brillo.material.color.copy(c); p.obj.vidrio.material.color.copy(c).lerp(new T.Color('#ffffff'), 0.45); }
    };
    bolas.forEach(function (q) { poner(q, 0); });
    rutaAnim = function (ahora) {
      if (ESTADO.vista !== 'posiciones') return;
      if (ultimo && ahora - ultimo < 33) return;
      if (ultimo && ahora - ultimo > 150) lentos++;
      var dt = ultimo ? Math.min(0.2, (ahora - ultimo) / 1000) : 0; ultimo = ahora;
      if (lentos > 6) { bolas.forEach(function (q) { poner(q, 0); q.paradas.forEach(function (p) { marcar(p, false); }); }); rutaAnim = null; sucio = true; return; }
      cintasAnim.forEach(function (t) { t.offset.x -= dt * 1.0; });          // la estela fluye en el sentido de la ruta
      var seg = (ahora - t0) / 1000;
      bolas.forEach(function (q, qi) {
        var vel = Math.max(3, q.total / 16), ciclo = q.total / vel + 1.8, d = Math.min(q.total, (seg % ciclo) * vel);
        poner(q, d);
        q.paradas.forEach(function (p) {
          marcar(p, d >= p.d - 0.05);
          var pulso = 1 + 0.18 * Math.sin(seg * 4.2 - p.k * 0.6) + p.flash * 0.8;
          p.anillo.scale.set(pulso, 1, pulso);
          p.haz.material.opacity = Math.min(1, 0.65 + 0.15 * Math.sin(seg * 3 - p.k * 0.6) + p.flash * 0.3);
          if (p.obj) { var o = 0.16 + 0.1 * (0.5 + 0.5 * Math.sin(seg * 3.4 - p.k * 0.6)) + p.flash * 0.3; p.obj.vidrio.material.opacity = o; p.obj.brillo.material.opacity = 0.5 + o; }
          if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 1.6);
        });
        if (qi === 0 && ESTADO.seguir) {                                   // cámara detrás de la carretilla
          var b = q.bola.position, th = q.ang + Math.PI, dth = Math.atan2(Math.sin(th - orb.theta), Math.cos(th - orb.theta));
          orb.tx += (b.x - orb.tx) * 0.16; orb.tz += (b.z - orb.tz) * 0.16; orb.ty += (1.4 - orb.ty) * 0.1;
          orb.theta += dth * 0.07; orb.radio += (10.5 - orb.radio) * 0.06; orb.phi += (1.08 - orb.phi) * 0.06; anim = null;
        }
      });
      sucio = true;
    };
  }
  function texAnillo() {
    return texCompartida('anillo', 128, 128, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,1)'); gr.addColorStop(0.62, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
  }

  /* ===================== ACABADO PREMIUM 16/11/2026 =====================
     · Vista «Real»: cajas de cartón kraft y blancas, con el estado en la etiqueta de la viga.
     · Palés con pequeñas variaciones (tamaño y giro) para un aspecto natural.
     · Sombras de contacto bajo racks y palés de suelo.
     · Haces de luz bajo las luminarias en el tema oscuro.
     · Inercia al girar la cámara y vuelo de entrada al abrir la bodega.                 */
  var KRAFT = ['#C99A63', '#BD8B55', '#D3A873', '#B07E4B', '#E6E1D6', '#C49460', '#EFEBE2'];
  function tonoReal(x, i) { var h = (i * 2654435761) >>> 0; return KRAFT[h % KRAFT.length]; }
  function ruido01(i, k) { var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }
  /** Coloca la carga de un palé con un ligero desorden (no hay dos palés idénticos). */
  function ponerCarga(o, i, px, py, pz, h) {
    o.position.set(px + (ruido01(i, 1) - 0.5) * 0.05, py, pz + (ruido01(i, 2) - 0.5) * 0.05);
    o.scale.set(0.93 + ruido01(i, 3) * 0.07, h, 0.92 + ruido01(i, 4) * 0.08);
    o.rotation.set(0, (ruido01(i, 5) - 0.5) * 0.07, 0); o.updateMatrix(); cargas.setMatrixAt(i, o.matrix);
  }
  function texSombra() {
    return decal('sombra', 128, 128, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.5);
      gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(0.6, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
  /** Sombras suaves de contacto bajo cada tramo de rack (dan peso y profundidad a la escena). */
  function sombrasContacto(U, W, Dp) {
    var filas = {}; U.forEach(function (u) { (filas[u.y] = filas[u.y] || []).push(Number(u.x)); });
    var m = new T.MeshBasicMaterial({ map: texSombra(), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    Object.keys(filas).forEach(function (zy) {
      var xs = unicos(filas[zy].map(String)).map(Number).sort(function (a, b) { return a - b; }), ini = xs[0];
      var tramo = function (a, b) { var g = new T.PlaneGeometry(b - a + W + 1.1, Dp + 1.3); g.rotateX(-Math.PI / 2); var me = new T.Mesh(g, m); me.position.set((a + b) / 2, 0.012, Number(zy)); me.renderOrder = 0; grupo.add(me); };
      for (var i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > W * 1.5) { tramo(ini, xs[i - 1]); ini = xs[i]; }
      tramo(ini, xs[xs.length - 1]);
    });
  }
  /** Haces de luz bajo las luminarias (solo en el tema oscuro, donde se aprecian). */
  var hacesLuz = null;
  function texCono() {
    return texCompartida('cono', 64, 256, function (g, w, h) {
      var gy = g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(255,255,255,.9)'); gy.addColorStop(0.5, 'rgba(255,255,255,.3)'); gy.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gy; g.fillRect(0, 0, w, h);
    });
  }
  function crearHaces() {
    hacesLuz = new T.Group(); grupo.add(hacesLuz);
    var mat = new T.MeshBasicMaterial({ map: texCono(), color: 0xfff1d6, transparent: true, opacity: 0.075, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false });
    var pos = new T.Vector3(), caja3 = new T.Box3();
    grupo.updateMatrixWorld(true);
    grupo.traverse(function (o) {
      if (!o.isMesh || o.material !== M.lampara || !o.geometry) return;
      caja3.setFromObject(o); var tam = caja3.getSize(new T.Vector3()); caja3.getCenter(pos);
      var largo = Math.max(tam.x, tam.z), alto = Math.max(3, pos.y - 0.2), n = Math.max(1, Math.round(largo / 7)), enX = tam.x >= tam.z;
      for (var k = 0; k < n; k++) {
        var f = n === 1 ? 0 : (k / (n - 1) - 0.5) * (largo - 4), cono = new T.Mesh(new T.CylinderGeometry(0.35, 3.4, alto, 24, 1, true), mat);
        cono.position.set(pos.x + (enX ? f : 0), alto / 2, pos.z + (enX ? 0 : f)); cono.renderOrder = 10; cono.raycast = function () {}; hacesLuz.add(cono);
      }
    });
    hacesLuz.visible = !document.body.classList.contains('claro');
  }
  /** Inercia: la cámara sigue girando un instante al soltar el ratón. */
  var iner = { th: 0, ph: 0, on: false };
  function inercia() {
    if (!iner.on) return;
    orb.theta += iner.th; orb.phi = Math.max(0.2, Math.min(1.52, orb.phi + iner.ph));
    iner.th *= 0.9; iner.ph *= 0.9; if (Math.abs(iner.th) + Math.abs(iner.ph) < 2e-4) iner.on = false;
    sucio = true;
  }
  /** Vuelo de entrada: la cámara llega desde lo alto hasta la vista general. */
  function vueloInicial() {
    var fin = {}; for (var k in orb) fin[k] = orb[k];
    var ini = { tx: fin.tx, ty: fin.ty, tz: fin.tz, radio: fin.radio * 1.9, theta: fin.theta - 1.1, phi: 0.38 }, t0 = performance.now();
    for (var k2 in ini) orb[k2] = ini[k2];
    anim = function (ahora) { var p = Math.min(1, (ahora - t0) / 1900), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; for (var k3 in fin) orb[k3] = ini[k3] + (fin[k3] - ini[k3]) * e; if (p >= 1) anim = null; sucio = true; };
  }
