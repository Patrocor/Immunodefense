(function () {
  "use strict";

  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");

  // -------- AUDIO (Web Audio API, all synthesized) -----------------------
  var audio = {
    ctx: null,
    master: null,
    musicBus: null,
    musicNodes: null,
    musicChordIdx: 0,
    musicTimer: null,
    musicMode: "idle",
    muted: false,
    initialized: false
  };
  try {
    audio.muted = (typeof localStorage !== "undefined" &&
      localStorage.getItem("immunodefense_muted") === "1");
  } catch (e) {}

  function initAudio() {
    if (audio.initialized) return;
    audio.initialized = true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { audio.ctx = null; return; }
    try {
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      startMusic("ambient");
    } catch (e) {
      audio.ctx = null;
    }
  }
  function ensureAudio() {
    if (!audio.initialized) initAudio();
    if (audio.ctx && audio.ctx.state === "suspended") {
      try { audio.ctx.resume(); } catch (e) {}
    }
  }
  function setMuted(m) {
    audio.muted = m;
    try { localStorage.setItem("immunodefense_muted", m ? "1" : "0"); } catch (e) {}
    if (audio.master && audio.ctx) {
      var t = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(t);
      audio.master.gain.linearRampToValueAtTime(m ? 0 : 0.5, t + 0.1);
    }
  }

  function makeOsc(type, freq, t0, attack, hold, release, gain, dest) {
    var ctxA = audio.ctx;
    var o = ctxA.createOscillator();
    var g = ctxA.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.setValueAtTime(gain, t0 + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
    o.connect(g);
    g.connect(dest || audio.master);
    o.start(t0);
    o.stop(t0 + attack + hold + release + 0.05);
    return { o: o, g: g };
  }

  function makeNoise(t0, duration, gain, dest) {
    var ctxA = audio.ctx;
    var len = Math.max(1, Math.floor(ctxA.sampleRate * duration));
    var buf = ctxA.createBuffer(1, len, ctxA.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctxA.createBufferSource();
    src.buffer = buf;
    var g = ctxA.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(dest || audio.master);
    src.start(t0);
    return src;
  }

  function sfx(name) {
    if (!audio.ctx || audio.muted) return;
    var ctxA = audio.ctx;
    var t = ctxA.currentTime;
    if (name === "macroAttack") {
      // Heavy thump
      var n1 = makeOsc("sine", 90, t, 0.005, 0.02, 0.08, 0.55);
      n1.o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
      makeNoise(t, 0.04, 0.10);
    } else if (name === "linfBAttack") {
      // Pew sweep
      var p = makeOsc("square", 880, t, 0.005, 0.01, 0.07, 0.18);
      p.o.frequency.exponentialRampToValueAtTime(440, t + 0.08);
    } else if (name === "linfTAttack") {
      // Sawtooth zap with vibrato
      var z = makeOsc("sawtooth", 200, t, 0.01, 0.05, 0.15, 0.20);
      var lfo = ctxA.createOscillator();
      var lfoG = ctxA.createGain();
      lfo.frequency.value = 22;
      lfoG.gain.value = 30;
      lfo.connect(lfoG);
      lfoG.connect(z.o.frequency);
      lfo.start(t);
      lfo.stop(t + 0.25);
    } else if (name === "enemyDie") {
      var d = makeOsc("sine", 600, t, 0.003, 0.02, 0.13, 0.30);
      d.o.frequency.exponentialRampToValueAtTime(180, t + 0.15);
      makeNoise(t, 0.05, 0.18);
    } else if (name === "playerHurt") {
      makeOsc("sine", 220, t, 0.005, 0.05, 0.08, 0.4);
      makeOsc("sine", 220, t + 0.13, 0.005, 0.05, 0.08, 0.35);
    } else if (name === "place") {
      makeOsc("sine", 523.25, t, 0.005, 0.04, 0.08, 0.30);
      makeOsc("sine", 659.25, t + 0.10, 0.005, 0.05, 0.10, 0.30);
    } else if (name === "sell") {
      var s = makeOsc("triangle", 700, t, 0.005, 0.02, 0.12, 0.25);
      s.o.frequency.exponentialRampToValueAtTime(280, t + 0.13);
    } else if (name === "upgrade") {
      makeOsc("sine", 523.25, t, 0.005, 0.03, 0.06, 0.30);
      makeOsc("sine", 659.25, t + 0.07, 0.005, 0.03, 0.06, 0.30);
      makeOsc("sine", 783.99, t + 0.14, 0.005, 0.04, 0.10, 0.32);
    } else if (name === "tick") {
      makeOsc("sine", 1000, t, 0.001, 0.005, 0.025, 0.18);
    } else if (name === "wave") {
      makeOsc("sine", 440, t, 0.01, 0.05, 0.40, 0.30);
      makeOsc("sine", 660, t + 0.04, 0.01, 0.05, 0.36, 0.18);
    } else if (name === "victory") {
      var notes = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < notes.length; i++) {
        makeOsc("sine", notes[i], t + i * 0.1, 0.005, 0.05, 0.20, 0.30);
      }
    } else if (name === "defeat") {
      var dd = makeOsc("sine", 440, t, 0.02, 0.10, 0.90, 0.35);
      dd.o.frequency.exponentialRampToValueAtTime(220, t + 1.0);
      var dh = makeOsc("sine", 220, t + 0.05, 0.02, 0.10, 0.90, 0.20);
      dh.o.frequency.exponentialRampToValueAtTime(110, t + 1.0);
    }
  }

  function startMusic(mode) {
    if (!audio.ctx) return;
    stopMusic();
    audio.musicMode = mode;
    var ctxA = audio.ctx;
    var bus = ctxA.createGain();
    bus.gain.value = mode === "victory" ? 0.10 : 0.08;
    bus.connect(audio.master);
    audio.musicBus = bus;
    var filter = ctxA.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 0.7;
    filter.connect(bus);

    function voice(freq, type, gain, detune) {
      var o = ctxA.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      if (detune) o.detune.value = detune;
      var g = ctxA.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(filter);
      o.start();
      return { o: o, g: g };
    }
    // Drone roots (Hz). Ambient minor for game, warm major for victory.
    var roots = mode === "victory"
      ? [130.81, 164.81, 196.00, 246.94] // C-E-G-B
      : [110.00, 82.41, 87.31, 130.81];   // A-E-F-C (minor feel)
    audio.musicNodes = {
      bass: voice(roots[0], "sine", 0.65, 0),
      harm: voice(roots[0] * 3, "sine", 0.22, 6),
      pad:  voice(roots[0] * 2, "triangle", 0.10, -4),
      filter: filter
    };
    audio.musicChordIdx = 0;
    var len = mode === "victory" ? 6 : 5;
    audio.musicTimer = setInterval(function () {
      if (!audio.ctx || audio.muted) return;
      audio.musicChordIdx = (audio.musicChordIdx + 1) % roots.length;
      var tt = audio.ctx.currentTime;
      var r = roots[audio.musicChordIdx];
      var n = audio.musicNodes;
      n.bass.o.frequency.linearRampToValueAtTime(r, tt + 0.5);
      n.harm.o.frequency.linearRampToValueAtTime(r * 3, tt + 0.5);
      n.pad.o.frequency.linearRampToValueAtTime(r * 2, tt + 0.6);
      n.filter.frequency.cancelScheduledValues(tt);
      n.filter.frequency.setValueAtTime(n.filter.frequency.value, tt);
      n.filter.frequency.linearRampToValueAtTime(380 + Math.random() * 700, tt + len * 0.6);
    }, len * 1000);
  }
  function stopMusic() {
    if (audio.musicTimer) { clearInterval(audio.musicTimer); audio.musicTimer = null; }
    if (audio.musicNodes && audio.ctx) {
      var t = audio.ctx.currentTime;
      var keys = ["bass", "harm", "pad"];
      for (var i = 0; i < keys.length; i++) {
        var n = audio.musicNodes[keys[i]];
        if (n) {
          try {
            n.g.gain.cancelScheduledValues(t);
            n.g.gain.linearRampToValueAtTime(0.0001, t + 0.4);
            n.o.stop(t + 0.6);
          } catch (e) {}
        }
      }
    }
    audio.musicNodes = null;
    audio.musicBus = null;
  }

  // -------- LAYOUT (recomputed on resize) --------------------------------
  var VW = 0, VH = 0, dpr = 1;
  var safeTop = 0, safeBottom = 0, safeLeft = 0, safeRight = 0;
  var HUD_H = 64, PANEL_H = 150;
  var SIDE_W = 100;       // dock lateral derecho (incluye safeRight)
  var SIDE_INNER = 100;   // ancho útil del dock (sin safeRight)
  var FIELD_TOP = 0, FIELD_BOTTOM = 0, FIELD_LEFT = 0, FIELD_RIGHT = 0;
  var FIELD_W = 0, FIELD_H = 0;
  var U = 1; // pixel scale unit (smaller of field width/height vs design 500)
  var isPortrait = false;

  function readSafeAreas() {
    var probe = document.getElementById("__safe_probe");
    if (!probe) return;
    var cs = getComputedStyle(probe);
    safeTop = parseFloat(cs.paddingTop) || 0;
    safeBottom = parseFloat(cs.paddingBottom) || 0;
    safeLeft = parseFloat(cs.paddingLeft) || 0;
    safeRight = parseFloat(cs.paddingRight) || 0;
  }

  function resize() {
    var oldPathTotal = PATH.total || 0;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    // Posicionamos y dimensionamos el canvas vía visualViewport en cada
    // resize: top/left absolutos, width/height del viewport visual. Cubre
    // iOS Chrome (que ignora position:fixed durante transiciones de la URL
    // bar) y iOS Safari por igual.
    var vv = window.visualViewport;
    if (vv) {
      VW = vv.width;
      VH = vv.height;
      canvas.style.left = vv.offsetLeft + "px";
      canvas.style.top  = vv.offsetTop  + "px";
    } else {
      VW = window.innerWidth;
      VH = window.innerHeight;
      canvas.style.left = "0px";
      canvas.style.top  = "0px";
    }
    canvas.style.width  = VW + "px";
    canvas.style.height = VH + "px";
    isPortrait = VH > VW;
    canvas.width  = Math.max(1, Math.floor(VW * dpr));
    canvas.height = Math.max(1, Math.floor(VH * dpr));
    readSafeAreas();
    layout();
    rebuildPath();
    // Reproject world objects so a rotation doesn't strand towers / enemies.
    if (typeof state !== "undefined" && state) {
      for (var i = 0; i < state.towers.length; i++) {
        var t = state.towers[i];
        if (typeof t.nx === "number") {
          t.x = FIELD_LEFT + t.nx * FIELD_W;
          t.y = FIELD_TOP + t.ny * FIELD_H;
        }
      }
      if (oldPathTotal > 0 && PATH.total > 0) {
        var ratio = PATH.total / oldPathTotal;
        for (var j = 0; j < state.enemies.length; j++) {
          var e = state.enemies[j];
          e.progress *= ratio;
          var p = pathPos(e.progress);
          e.x = p.x;
          e.y = p.y;
        }
      }
      // Projectiles aimed at obsolete coords; safest to drop them.
      state.projectiles = [];
    }
  }

  function layout() {
    // HUD un poco más alto para que el banner OLEADA y la barra viral no se
    // pisen verticalmente (antes 48-72, ahora 72-92 = ~25% más alto).
    var hudBase = Math.max(72, Math.min(92, VH * 0.095));
    // Dock lateral derecho: las cartas viven en una columna a la derecha para
    // que el campo use TODO el alto. Portrait: dock angosto (~27% del ancho);
    // landscape: dock fijo cómodo. Incluye safeRight para no quedar bajo el
    // notch/esquina redondeada del lado derecho.
    // Dock más compacto (cartas y cajones aún más chicos: -10% adicional).
    SIDE_INNER = isPortrait
      ? Math.round(Math.max(72, Math.min(91, VW * 0.212)))
      : Math.round(Math.max(85, Math.min(118, VW * 0.125)));
    SIDE_W = SIDE_INNER + safeRight;
    HUD_H = Math.round(hudBase + safeTop);
    PANEL_H = 0;  // legacy: ya no hay franja inferior
    FIELD_TOP = HUD_H;
    FIELD_BOTTOM = VH - safeBottom;
    FIELD_LEFT = safeLeft;
    FIELD_RIGHT = VW - SIDE_W;
    FIELD_W = FIELD_RIGHT - FIELD_LEFT;
    FIELD_H = FIELD_BOTTOM - FIELD_TOP;
    U = Math.max(0.4, Math.min(FIELD_W, FIELD_H) / 500);
    layoutUI();
    layoutDrip();
    layoutMed();
  }

  // -------- LYMPHATIC DRIP (periodic ATP source) -------------------------
  var DRIP = { x: 0, y: 0, w: 0, h: 0, mouthY: 0 };
  // En diseminación se enciende una segunda mitocondria al otro lado.
  var DRIP_R = { x: 0, y: 0, w: 0, h: 0, mouthY: 0, active: false };
  var DRIP_INTERVAL = 8.0;
  var DRIP_REWARD = 25;
  var DRIP_WINDOW = 3.0;

  // -------- COMBAT: gérmenes atacan torres --------------------------------
  // Sin recuperación: el daño es permanente; a 0 de vida la torre muere.
  var ATTACK_RADIUS_BASE = 40;  // px diseño base del aura/"radar"
  var ATTACK_MULT = 1.15;       // +15% al daño de todos los gérmenes
  // -------- MEDICAMENTO (poder activo cargable) ---------------------------
  var MED_MAX = 100;
  var MED_BLOCKS = 4;                 // 4 bloques de llenado (25 c/u)
  var MED_PER_TOWER_DEATH = 25;       // sanguíneo: 1 bloque por célula caída
  // Tópico (1 bloque): se llena al matar gérmenes; lanza ácido al camino.
  var TOPICAL_MAX = 100;
  var TOPICAL_PER_KILL = 9;
  var TOPICAL_PER_BOSS = 30;
  var ACID_DURATION = 5;              // s de ácido en el camino
  var ACID_DPS_FRAC = 0.10;           // 10% de maxHp por segundo
  // Ordenados por nivel: bloque 1 = MED_POWERS[0] (más leve) ... bloque 4 =
  // MED_POWERS[3] = antibiótico (máximo poder). Tocas con N bloques llenos y
  // se activa el poder de nivel N.
  var MED_POWERS = [
    { id: "ralentizador", name: "Gas ralentizador", short: "Ralentiza", color: "#5B8DEF", desc: "Velocidad ×0.4 ~6s" },
    { id: "paralizante", name: "Gas paralizante", short: "Paraliza", color: "#3FC8E0", desc: "Los detiene ~4s" },
    { id: "disolvente",  name: "Disolvente de escudos", short: "Disuelve", color: "#E055C8", desc: "Rompe sus escudos" },
    { id: "antibiotico", name: "Antibiótico", short: "Antibiótico", color: "#F5C518", desc: "Daño en área (máximo)" }
  ];
  // Radio del aura de daño por germen: escala con su ataque, así los gérmenes
  // más peligrosos (S. aureus, Pseudomonas, jefes) tienen MAYOR rango y se
  // distinguen de los débiles. En px diseño; multiplicar por U al usar.
  function enemyAuraRadiusPx(def) {
    // Rango = (base + 2*ataque) con +20% y otro +15% acumulado (1.2*1.15=1.38).
    // Halo de daño UNIFORME para todos los gérmenes (basado en el clásico más
    // amenazante, attack=12 → ~88 px diseño). Legibilidad y equilibrio claro.
    var r = (ATTACK_RADIUS_BASE + 24) * 1.38 * U;
    // Nivel puente: todo al 72%, incluido el aura de daño.
    if (typeof state !== "undefined" && state && state.dissemination) r *= 0.72;
    return r;
  }

  function layoutDrip() {
    if (typeof state !== "undefined" && state && state.dissemination) {
      // Dos mitocondrias laterales (en los márgenes, fuera del rect de carriles).
      DRIP.x = FIELD_LEFT + FIELD_W * 0.065;
      DRIP.y = FIELD_TOP + FIELD_H * 0.50;
      DRIP.w = 32 * U;
      DRIP.h = 22 * U;
      DRIP.mouthY = DRIP.y + DRIP.h * 0.85;
      DRIP_R.x = FIELD_LEFT + FIELD_W * 0.935;
      DRIP_R.y = FIELD_TOP + FIELD_H * 0.50;
      DRIP_R.w = 32 * U;
      DRIP_R.h = 22 * U;
      DRIP_R.mouthY = DRIP_R.y + DRIP_R.h * 0.85;
      DRIP_R.active = true;
      // Megacariocito: estructura productora de plaquetas, lateral izquierdo bajo.
      if (state.megakaryocyte) {
        state.megakaryocyte.x = FIELD_LEFT + FIELD_W * 0.06;
        state.megakaryocyte.y = FIELD_TOP + FIELD_H * 0.85;
      }
    } else {
      // Fase 1: una sola mitocondria a la derecha del campo.
      DRIP.x = FIELD_LEFT + FIELD_W * 0.84;
      DRIP.y = FIELD_TOP + FIELD_H * 0.17;
      DRIP.w = 44 * U;
      DRIP.h = 27 * U;
      DRIP.mouthY = DRIP.y + DRIP.h * 0.85;
      DRIP_R.active = false;
    }
  }

  // -------- PATH (1 entrada arriba -> espiral orgánica -> vaso abajo) -----
  // Una sola herida arriba-centro. Al superar el 40% de infestación NO se abre
  // otra entrada: en su lugar se acelera el ingreso y aumenta la cantidad de
  // gérmenes (ver infestSurge / startNextWave).
  var WOUND_POS_PORTRAIT = [
    { x: 0.50, y: 0.10 }
  ];
  var WOUND_POS_LANDSCAPE = [
    { x: 0.50, y: 0.10 }
  ];
  var CONFLUENCE_POS = { x: 0.50, y: 0.16 };
  var VESSEL_POS = { x: 0.50, y: 0.88 };   // vaso al fondo (zona circulatoria)
  // El germen recorre casi todo el camino antes de ser absorbido por el vaso.
  // (Antes 0.88: con la serpentina nueva, más larga, eso lo hacía entrar
  // saltándose ~12-15% del recorrido.) 0.97 deja solo un breve floreo final.
  var TORRENT_ABSORB_TRIGGER = 0.97;

  // Legacy single-path arrays (no longer rendered, kept to avoid undefined refs).
  var PATH_LANDSCAPE_BASE = [];
  var PATH_PORTRAIT_BASE = [];
  var PATH_LANDSCAPE = PATH_LANDSCAPE_BASE;
  var PATH_PORTRAIT = PATH_PORTRAIT_BASE;

  var PATH = {
    branches: [],          // 3 branch sub-paths (one per wound)
    main: null,            // shared trunk from confluence to vessel
    confluence: null,      // pixel point where branches merge
    wounds: [],            // 3 wound centers in pixels
    exit: null,            // vessel center in pixels
    totalForBranch: [0, 0, 0], // branch.length + main.length per branch
    absorbStartForBranch: [0, 0, 0],
    orientation: null,
    // Legacy aliases (default to wound 1 / main):
    beziers: [],
    total: 0,
    entry: null,
    absorbStart: 0
  };

  function bezierPoint(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return {
      x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
    };
  }

  // Build cubic Beziers from anchor points. PATH_GEOMETRIC=true -> segmentos
  // RECTOS (esquinas marcadas en ángulo); si no, Catmull-Rom suavizado.
  var PATH_GEOMETRIC = false;   // curvas suaves (orgánicas), no ángulos rígidos
  function buildBezierPath(anchors) {
    var n = anchors.length;
    var beziers = [];
    var total = 0;
    var STEPS = 30;
    for (var s = 0; s < n - 1; s++) {
      var p0 = anchors[s];
      var p3 = anchors[s + 1];
      var c1, c2;
      if (PATH_GEOMETRIC) {
        // Bézier degenerado = recta entre anclas (esquinas vivas).
        c1 = { x: p0.x + (p3.x - p0.x) / 3, y: p0.y + (p3.y - p0.y) / 3 };
        c2 = { x: p0.x + (p3.x - p0.x) * 2 / 3, y: p0.y + (p3.y - p0.y) * 2 / 3 };
      } else {
        var pm1 = s > 0 ? anchors[s - 1] : { x: 2 * p0.x - p3.x, y: 2 * p0.y - p3.y };
        var p4  = s < n - 2 ? anchors[s + 2] : { x: 2 * p3.x - p0.x, y: 2 * p3.y - p0.y };
        c1 = { x: p0.x + (p3.x - pm1.x) / 6, y: p0.y + (p3.y - pm1.y) / 6 };
        c2 = { x: p3.x - (p4.x - p0.x) / 6, y: p3.y - (p4.y - p0.y) / 6 };
      }
      var samples = [];
      var lastX = p0.x, lastY = p0.y;
      var d = 0;
      samples.push({ x: lastX, y: lastY, d: 0 });
      for (var k = 1; k <= STEPS; k++) {
        var pt = bezierPoint(p0, c1, c2, p3, k / STEPS);
        d += Math.hypot(pt.x - lastX, pt.y - lastY);
        samples.push({ x: pt.x, y: pt.y, d: d });
        lastX = pt.x; lastY = pt.y;
      }
      beziers.push({ p0: p0, c1: c1, c2: c2, p3: p3, samples: samples, length: d, startD: total });
      total += d;
    }
    return { beziers: beziers, length: total, anchors: anchors };
  }

  function rebuildPath() {
    if (typeof state !== "undefined" && state && state.dissemination) {
      rebuildDisseminationPath();
      return;
    }
    PATH.orientation = isPortrait ? "portrait" : "landscape";
    var woundsNorm = isPortrait ? WOUND_POS_PORTRAIT : WOUND_POS_LANDSCAPE;
    function toPx(p) {
      return { x: FIELD_LEFT + p.x * FIELD_W, y: FIELD_TOP + p.y * FIELD_H };
    }
    var confluencePx = toPx(CONFLUENCE_POS);
    var vesselPx = toPx(VESSEL_POS);
    PATH.confluence = confluencePx;
    PATH.exit = vesselPx;
    // Wounds in pixels with phase offsets so palpitation doesn't sync.
    PATH.wounds = [];
    var secondOpen = (typeof state !== "undefined" && state && state.secondEntryOpen);
    for (var w = 0; w < woundsNorm.length; w++) {
      var wp = toPx(woundsNorm[w]);
      PATH.wounds.push({ x: wp.x, y: wp.y, phase: w * 0.4, active: (w === 0) || secondOpen });
    }
    // Una rama por herida (ahora 1). Con confluencia = herida, la rama es
    // degenerada (longitud ~0): el recorrido real es la espiral del main.
    PATH.branches = [];
    for (var i = 0; i < PATH.wounds.length; i++) {
      var anchors = [
        { x: PATH.wounds[i].x, y: PATH.wounds[i].y },
        { x: (PATH.wounds[i].x + confluencePx.x) / 2,
          y: (PATH.wounds[i].y + confluencePx.y) / 2 },
        { x: confluencePx.x, y: confluencePx.y }
      ];
      PATH.branches.push(buildBezierPath(anchors));
    }
    // Espiral rectangular (ángulos rectos) desde la entrada hacia el vaso al
    // centro. Brazos a 0.14/0.86 (externos), 0.30/0.70 (medios), 0.46 (interno);
    // los huecos (~0.16-0.18) dejan corredores para colocar torres.
    // Serpentina orgánica: 1 entrada arriba que baja en 3 barridos
    // horizontales hasta el vaso al fondo. Curvas suaves (PATH_GEOMETRIC=false).
    var L = 0.16, R = 0.84;
    var mainAnchorsNorm = [
      { x: CONFLUENCE_POS.x, y: CONFLUENCE_POS.y }, // 0.50,0.16 entrada (arriba)
      { x: L, y: 0.26 },                             // baja a la izquierda
      { x: R, y: 0.30 },                             // ── barrido 1 (izq→der)
      { x: R, y: 0.46 },                             // baja por la derecha
      { x: L, y: 0.50 },                             // ── barrido 2 (der→izq)
      { x: L, y: 0.66 },                             // baja por la izquierda
      { x: R, y: 0.70 },                             // ── barrido 3 (izq→der)
      { x: VESSEL_POS.x, y: VESSEL_POS.y }           // 0.50,0.88 vaso (fondo)
    ];
    var mainAnchorsPx = mainAnchorsNorm.map(toPx);
    PATH.main = buildBezierPath(mainAnchorsPx);
    // Per-branch totals and absorb thresholds.
    PATH.totalForBranch = [];
    PATH.absorbStartForBranch = [];
    for (var b = 0; b < PATH.wounds.length; b++) {
      var t = PATH.branches[b].length + PATH.main.length;
      PATH.totalForBranch.push(t);
      PATH.absorbStartForBranch.push(t * TORRENT_ABSORB_TRIGGER);
    }
    // Legacy aliases for code that still uses single-path semantics.
    PATH.beziers = PATH.main.beziers;
    PATH.total = PATH.totalForBranch[0];
    PATH.entry = PATH.wounds[1];     // middle wound as default entry
    PATH.absorbStart = PATH.absorbStartForBranch[0];
    if (state) generateTissue();
  }

  // ============ PATH DEL NIVEL PUENTE (5 carriles VERTICALES) ============
  // Cada carril es vertical: spawn arriba (la barrera rota), puerta de órgano
  // abajo. Campo al 80%: 15% de margen lateral (deja sitio para las dos
  // mitocondrias) y 12% arriba/abajo. Sin tronco compartido.
  function rebuildDisseminationPath() {
    PATH.orientation = isPortrait ? "portrait" : "landscape";
    // 5 columnas equiespaciadas en el 70% central del campo (15%..85%).
    var laneXs = [0.20, 0.35, 0.50, 0.65, 0.80];
    var entryYn = 0.12;   // arriba (grieta de barrera rota)
    var exitYn = 0.88;    // abajo (puerta de órgano)
    PATH.wounds = [];
    PATH.branches = [];
    PATH.totalForBranch = [];
    PATH.absorbStartForBranch = [];
    PATH.organDoors = [];
    PATH.laneXs = laneXs;
    PATH.entryYn = entryYn;
    PATH.exitYn = exitYn;
    for (var i = 0; i < 5; i++) {
      var xPx = FIELD_LEFT + laneXs[i] * FIELD_W;
      var entry = { x: xPx, y: FIELD_TOP + entryYn * FIELD_H };
      var exit = { x: xPx, y: FIELD_TOP + exitYn * FIELD_H };
      PATH.wounds.push({ x: entry.x, y: entry.y, phase: i * 0.4, active: true });
      PATH.organDoors.push({ x: exit.x, y: exit.y, organ: DISSEMINATION_ORGANS[i], laneX: xPx });
      // 3 anchors para una Bezier vertical suave (entry → medio → exit).
      var mid = { x: xPx, y: (entry.y + exit.y) / 2 };
      PATH.branches.push(buildBezierPath([entry, mid, exit]));
      var t = PATH.branches[i].length;
      PATH.totalForBranch.push(t);
      PATH.absorbStartForBranch.push(t * 0.98);
    }
    PATH.main = { length: 0, beziers: [] };
    PATH.confluence = null;
    // PATH.exit apunta al centro inferior del campo (referencia para fx).
    PATH.exit = { x: FIELD_LEFT + 0.5 * FIELD_W, y: FIELD_TOP + exitYn * FIELD_H };
    PATH.beziers = [];
    PATH.total = PATH.totalForBranch[0];
    PATH.entry = PATH.wounds[2];     // sangre como referencia (centro)
    PATH.absorbStart = PATH.absorbStartForBranch[0];
    if (state) generateTissue();
  }
  // ============ FIN PATH NIVEL PUENTE ============

  // Sample a point on a beziers array at distance `progress` (0..length).
  function sampleBeziers(beziers, progress) {
    if (!beziers.length) return { x: 0, y: 0, angle: 0 };
    if (progress <= 0) {
      var f = beziers[0];
      return { x: f.p0.x, y: f.p0.y, angle: 0 };
    }
    var last = beziers[beziers.length - 1];
    if (progress >= last.startD + last.length) {
      return { x: last.p3.x, y: last.p3.y, angle: 0 };
    }
    for (var i = 0; i < beziers.length; i++) {
      var seg = beziers[i];
      if (progress <= seg.startD + seg.length) {
        var localD = progress - seg.startD;
        var samples = seg.samples;
        for (var j = 1; j < samples.length; j++) {
          if (samples[j].d >= localD) {
            var prev = samples[j - 1];
            var curr = samples[j];
            var span = curr.d - prev.d;
            var t = span > 0 ? (localD - prev.d) / span : 0;
            return {
              x: prev.x + (curr.x - prev.x) * t,
              y: prev.y + (curr.y - prev.y) * t,
              angle: Math.atan2(curr.y - prev.y, curr.x - prev.x)
            };
          }
        }
      }
    }
    var Lf = beziers[beziers.length - 1];
    return { x: Lf.p3.x, y: Lf.p3.y, angle: 0 };
  }

  function pathPos(progress, heridaIdx) {
    heridaIdx = heridaIdx | 0;
    var maxIdx = (PATH.branches.length || 1) - 1;
    if (heridaIdx < 0 || heridaIdx > maxIdx) heridaIdx = 0;
    if (!PATH.branches.length) return { x: 0, y: 0, angle: 0 };
    var branch = PATH.branches[heridaIdx];
    if (progress <= branch.length) {
      return sampleBeziers(branch.beziers, progress);
    }
    // En diseminación PATH.main está vacío: nos quedamos al final de la rama.
    if (!PATH.main || !PATH.main.beziers || !PATH.main.beziers.length) {
      return sampleBeziers(branch.beziers, branch.length);
    }
    var mainProgress = progress - branch.length;
    return sampleBeziers(PATH.main.beziers, mainProgress);
  }

  function distPointToPath(x, y) {
    var best = Infinity;
    function checkBeziers(beziers) {
      for (var i = 0; i < beziers.length; i++) {
        var samples = beziers[i].samples;
        for (var j = 0; j < samples.length - 1; j++) {
          var a = samples[j], b = samples[j + 1];
          var dx = b.x - a.x, dy = b.y - a.y;
          var len2 = dx * dx + dy * dy;
          var d;
          if (len2 < 1e-6) d = Math.hypot(x - a.x, y - a.y);
          else {
            var t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
            if (t < 0) t = 0; else if (t > 1) t = 1;
            d = Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
          }
          if (d < best) best = d;
        }
      }
    }
    if (PATH.branches) {
      for (var b = 0; b < PATH.branches.length; b++) checkBeziers(PATH.branches[b].beziers);
    }
    if (PATH.main) checkBeziers(PATH.main.beziers);
    return best;
  }

  // -------- TISSUE CACHE (deterministic, regenerated only on path rebuild) --
  function generateTissue() {
    var rng = (function () {
      var s = 9283 + (PATH.orientation === "portrait" ? 17 : 31) +
              Math.round(FIELD_W) * 13 + Math.round(FIELD_H) * 7;
      return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    })();
    function distToPath(x, y) { return distPointToPath(x, y); }
    function isFar(x, y) {
      // Avoid skin/circulatory zones, drip area, wound, vessel.
      // Keep tissue out of exterior(0-7%), skin(7-15%), and circulatory(85-100%).
      if (y < FIELD_TOP + FIELD_H * 0.16 + 4) return false;
      if (y > FIELD_BOTTOM - FIELD_H * 0.16 - 4) return false;
      if (PATH.entry && Math.hypot(x - PATH.entry.x, y - PATH.entry.y) < 60 * U) return false;
      if (PATH.exit && Math.hypot(x - PATH.exit.x, y - PATH.exit.y) < 60 * U) return false;
      return true;
    }
    var tissue = { platelets: [], fibrin: [], fibroblasts: [], collagen: [], epithelials: [] };
    var attempts = 0;
    // Platelets: near path (within 80px, but not on it)
    while (tissue.platelets.length < 22 && attempts < 600) {
      attempts++;
      var x = FIELD_LEFT + rng() * FIELD_W;
      var y = FIELD_TOP + rng() * FIELD_H;
      if (!isFar(x, y)) continue;
      var d = distToPath(x, y);
      if (d < 32 * U || d > 80 * U) continue;
      tissue.platelets.push({
        x: x, y: y,
        size: (4 + rng() * 2) * U,
        rot: rng() * Math.PI,
        phase: rng() * Math.PI * 2,
        reactiveTimer: 0
      });
    }
    // Fibrin: near path
    attempts = 0;
    while (tissue.fibrin.length < 12 && attempts < 600) {
      attempts++;
      var fx = FIELD_LEFT + rng() * FIELD_W;
      var fy = FIELD_TOP + rng() * FIELD_H;
      if (!isFar(fx, fy)) continue;
      var fd = distToPath(fx, fy);
      if (fd < 32 * U || fd > 80 * U) continue;
      var fang = rng() * Math.PI * 2;
      var flen = (15 + rng() * 10) * U;
      tissue.fibrin.push({
        x: fx, y: fy,
        endX: fx + Math.cos(fang) * flen,
        endY: fy + Math.sin(fang) * flen,
        ctrlOff: (rng() - 0.5) * 6 * U,
        reactiveTimer: 0
      });
    }
    // Fibroblasts: far from path (>80px)
    attempts = 0;
    while (tissue.fibroblasts.length < 8 && attempts < 600) {
      attempts++;
      var bx = FIELD_LEFT + rng() * FIELD_W;
      var by = FIELD_TOP + rng() * FIELD_H;
      if (!isFar(bx, by)) continue;
      var bd = distToPath(bx, by);
      if (bd <= 80 * U) continue;
      tissue.fibroblasts.push({
        x: bx, y: by,
        rx: (8 + rng() * 6) * U,
        ry: (4 + rng() * 3) * U,
        rot: rng() * Math.PI,
        phase: rng() * Math.PI * 2
      });
    }
    // Collagen: far, long thin lines
    attempts = 0;
    while (tissue.collagen.length < 12 && attempts < 600) {
      attempts++;
      var cx = FIELD_LEFT + rng() * FIELD_W;
      var cy = FIELD_TOP + rng() * FIELD_H;
      if (!isFar(cx, cy)) continue;
      var cd = distToPath(cx, cy);
      if (cd <= 70 * U) continue;
      var cang = rng() * Math.PI * 2;
      var clen = (20 + rng() * 14) * U;
      tissue.collagen.push({
        x: cx, y: cy,
        endX: cx + Math.cos(cang) * clen,
        endY: cy + Math.sin(cang) * clen
      });
    }
    // Epithelials (small clusters of 3-5 polygons)
    attempts = 0;
    while (tissue.epithelials.length < 4 && attempts < 200) {
      attempts++;
      var ex = FIELD_LEFT + rng() * FIELD_W;
      var ey = FIELD_TOP + rng() * FIELD_H;
      if (!isFar(ex, ey)) continue;
      if (distToPath(ex, ey) <= 90 * U) continue;
      tissue.epithelials.push({
        x: ex, y: ey,
        size: (8 + rng() * 4) * U,
        rot: rng() * Math.PI,
        sides: 5 + Math.floor(rng() * 2)
      });
    }
    state.tissue = tissue;
  }



  // -------- DEFINITIONS ---------------------------------------------------
  // Distances/speeds in design pixels; multiplied by U at use.
  var TOWER_DEFS = {
    neutrofilo: {
      id: "neutrofilo",
      name: "Neutrofilo",
      color: "#B79CE0",
      colorDark: "#7E5FB0",
      cost: 55,
      desc: "Cuerpo a cuerpo",
      levels: [
        { range:  90, damage: 25, fireRate: 1.0, projectileSpeed:   0, splash:  0, hp: 120 },
        { range: 100, damage: 45, fireRate: 1.2, projectileSpeed:   0, splash:  0, hp: 160 },
        { range: 110, damage: 75, fireRate: 1.4, projectileSpeed:   0, splash:  0, hp: 210 }
      ],
      upgradeCost: [60, 110]
    },
    linfocitoB: {
      id: "linfocitoB",
      name: "Linfocito B",
      color: "#50C878",
      colorDark: "#2c8049",
      cost: 83,
      desc: "Ametralladora de anticuerpos",
      machineGun: true,
      levels: [
        { range: 180, damage: 2, fireRate: 12, projectileSpeed: 460, splash: 0, hp: 70 },
        { range: 210, damage: 3, fireRate: 16, projectileSpeed: 500, splash: 0, hp: 90 },
        { range: 240, damage: 4, fireRate: 20, projectileSpeed: 540, splash: 0, hp: 120 }
      ],
      upgradeCost: [85, 140]
    },
    linfocitoT: {
      id: "linfocitoT",
      name: "Linfocito T",
      color: "#9370DB",
      colorDark: "#5d44a0",
      cost: 121,
      desc: "Citotoxico (area)",
      levels: [
        { range: 110, damage:  40, fireRate: 0.7, projectileSpeed: 320, splash: 55, hp: 90 },
        { range: 125, damage:  65, fireRate: 0.85, projectileSpeed: 360, splash: 65, hp: 120 },
        { range: 140, damage: 100, fireRate: 1.0, projectileSpeed: 400, splash: 75, hp: 150 }
      ],
      upgradeCost: [120, 200]
    },
    langerhans: {
      id: "langerhans", name: "Cel. de Langerhans", shortName: "Langerhans",
      color: "#3FC1C9", colorDark: "#26797f", cost: 70, desc: "Marca antigeno (+dano)",
      support: "mark",
      levels: [
        { range: 120, damage: 0, fireRate: 1.0, projectileSpeed: 0, splash: 0, hp: 90,  markBonus: 0.35, markDur: 3.0 },
        { range: 140, damage: 0, fireRate: 1.0, projectileSpeed: 0, splash: 0, hp: 115, markBonus: 0.45, markDur: 3.0 },
        { range: 160, damage: 0, fireRate: 1.0, projectileSpeed: 0, splash: 0, hp: 145, markBonus: 0.55, markDur: 3.5 }
      ],
      upgradeCost: [75, 130]
    },
    nk: {
      id: "nk", name: "Celula NK", shortName: "NK",
      color: "#E84393", colorDark: "#a82d6a", cost: 95, desc: "Antiviral, rompe escudos",
      bonusVs: { kind: "virus", mult: 2.3 }, breakShield: true,
      levels: [
        { range: 170, damage: 22, fireRate: 1.2, projectileSpeed: 430, splash: 0, hp: 95 },
        { range: 195, damage: 34, fireRate: 1.4, projectileSpeed: 470, splash: 0, hp: 120 },
        { range: 220, damage: 52, fireRate: 1.7, projectileSpeed: 510, splash: 0, hp: 150 }
      ],
      upgradeCost: [100, 165]
    },
    eosinofilo: {
      id: "eosinofilo", name: "Eosinofilo", shortName: "Eosinofilo",
      color: "#F2774E", colorDark: "#a8401f", cost: 88, desc: "Antiparasito (granulos)",
      bonusVs: { kind: "parasito", mult: 2.6 },
      levels: [
        { range: 150, damage: 28, fireRate: 1.0, projectileSpeed: 380, splash: 30, hp: 90 },
        { range: 170, damage: 42, fireRate: 1.2, projectileSpeed: 420, splash: 35, hp: 115 },
        { range: 190, damage: 62, fireRate: 1.4, projectileSpeed: 460, splash: 42, hp: 145 }
      ],
      upgradeCost: [95, 150]
    },
    mastocito: {
      id: "mastocito", name: "Mastocito", shortName: "Mastocito",
      color: "#4F8FE0", colorDark: "#2c5da0", cost: 75, desc: "Histamina (ralentiza)",
      support: "slow",
      persistAcrossPhases: true,  // tank/soporte tisular: una vez desbloqueado, queda
      levels: [
        { range: 110, damage: 0, fireRate: 1.0, projectileSpeed: 0, splash: 0, hp: 95,  slowDur: 1.2, dotPerSec: 4 },
        { range: 130, damage: 0, fireRate: 1.0, projectileSpeed: 0, splash: 0, hp: 120, slowDur: 1.2, dotPerSec: 6 },
        { range: 150, damage: 0, fireRate: 1.0, projectileSpeed: 0, splash: 0, hp: 150, slowDur: 1.4, dotPerSec: 9 }
      ],
      upgradeCost: [80, 135]
    },
    complemento: {
      id: "complemento", name: "Cañón del Complemento", shortName: "Cañón MAC",
      color: "#FFD24A", colorDark: "#b8860b", cost: 5, currency: "complement",
      desc: "MAC manual: ácido que ignora escudos",
      persistAcrossPhases: true,  // soporte tanque: persiste entre fases
      ignoreShield: true,
      manualFire: true,             // el jugador apunta y dispara
      immuneToAura: true,           // el aura de contacto no le hace daño
      lifetimeDecay: 2.5,           // HP perdidos por segundo (se consume solo)
      // El "tiro" es una mancha de ácido en el campo: fireRate como cadencia mínima
      // entre tiros manuales; splash define el radio del charco; damage es el DoT/s.
      levels: [
        { range: 400, damage: 28, fireRate: 0.7, projectileSpeed: 0, splash: 42, hp: 100, acidDur: 4.0, travelTime: 1.1 },
        { range: 460, damage: 40, fireRate: 0.9, projectileSpeed: 0, splash: 50, hp: 130, acidDur: 4.5, travelTime: 1.0 },
        { range: 520, damage: 56, fireRate: 1.1, projectileSpeed: 0, splash: 58, hp: 160, acidDur: 5.0, travelTime: 0.95 }
      ],
      upgradeCost: [120, 200]
    },
    plaqueta: {
      id: "plaqueta", name: "Malla de fibrina", shortName: "Fibrina",
      color: "#E8A020", colorDark: "#8A5010", cost: 30,
      desc: "Panal hemostático: barrera larga que obstruye el carril",
      disseminationOnly: true,
      obstructs: true,
      obstructRX: 52, obstructRY: 18,   // elipse de obstrucción (forma larga)
      slowOnHit: { dur: 2.0, mult: 0.40 },
      levels: [
        { range:  90, damage: 1, fireRate: 1.0, projectileSpeed: 300, splash: 0, hp: 200 },
        { range: 100, damage: 2, fireRate: 1.2, projectileSpeed: 340, splash: 0, hp: 300 },
        { range: 110, damage: 3, fireRate: 1.4, projectileSpeed: 380, splash: 0, hp: 420 }
      ],
      upgradeCost: [40, 65]
    }
  };
  var MAC_COST = 5;   // fragmentos de complemento para ensamblar el cañón
  var TOWER_LIST = ["neutrofilo", "linfocitoB", "linfocitoT", "langerhans", "nk", "eosinofilo", "mastocito", "complemento", "plaqueta"];
  // Cartilla por grupos desplegables (categorías de defensa).
  var TOWER_GROUPS = [
    { id: "linea",         label: "Primera línea", towers: ["neutrofilo"] },
    { id: "distancia",     label: "A distancia",   towers: ["linfocitoB", "linfocitoT"] },
    { id: "especialistas", label: "Especialistas", towers: ["nk", "eosinofilo"] },
    { id: "soporte",       label: "Soporte",       towers: ["langerhans", "mastocito"] },
    { id: "sangre",        label: "Sangre",        towers: ["plaqueta"] },
    { id: "especial",      label: "Especial (MAC)", towers: ["complemento"] }
  ];

  // BASE_SPEED in design px/s; multiplied by U each frame for actual movement.
  var BASE_SPEED = 60;
  var ENEMY_DEFS = {
    // ---- Patógenos cutáneos (Fase 1) -------------------------------------
    saureus: {
      id: "saureus", name: "Staphylococcus aureus", baseKind: "bacteria",
      color: "#F9A825", colorDark: "#9c6e0a", radius: 27,
      speedMult: 0.7, hp: 525, reward: 18, viralAdd: 8, attack: 12, power: { type: "burst", range: 135, cooldown: 4, dmg: 13, slowFire: 3 }, isBoss: false,
      shield: { type: "capsula", maxHP: 5, regenRate: 0, regenDelay: 0, doubleRing: true },
      tooltip: "Bacteria con cápsula y capacidad de formar biofilm protector. Causa infecciones cutáneas, neumonía y septicemia. Algunas cepas (MRSA) son resistentes a antibióticos."
    },
    influenza: {
      id: "influenza", name: "Virus Influenza", baseKind: "virus",
      color: "#66BB6A", colorDark: "#357a32", radius: 9,
      speedMult: 1.5, hp: 150, reward: 10, viralAdd: 6, isBoss: false,
      shield: null,
      tooltip: "Virus de RNA muy rápido y mutable. Sin defensas estructurales fuertes. Causa la gripe estacional. Su mutabilidad le permite evadir la inmunidad previa."
    },
    vih: {
      id: "vih", name: "Virus VIH", baseKind: "virus",
      color: "#7B1FA2", colorDark: "#3e0e54", radius: 11,
      speedMult: 1.0, hp: 270, reward: 20, viralAdd: 8, isBoss: false,
      shield: { type: "spike", maxHP: 4, regenRate: 4 / 12, regenDelay: 0, requiresT: true },
      tooltip: "Retrovirus con envoltura de proteínas spike (gp120/gp41). Solo los Linfocitos T citotóxicos pueden eliminarlo eficazmente. Ataca al sistema inmune y causa el SIDA."
    },
    candida: {
      id: "candida", name: "Candida albicans", baseKind: "hongo",
      color: "#EC407A", colorDark: "#7a1d3e", radius: 27,
      speedMult: 0.9, hp: 375, reward: 15, viralAdd: 8, attack: 6, power: { type: "catapult", range: 150, cooldown: 5, dmg: 32 }, isBoss: false,
      shield: { type: "wall", maxHP: 4, regenRate: 0, regenDelay: 0 },
      tooltip: "Hongo levadura con pared celular de quitina y β-glucanos. Causa candidiasis. Su pared rígida lo protege parcialmente del ataque inmune."
    },
    dermatofito: {
      id: "dermatofito", name: "Trichophyton rubrum", shortName: "Dermatofito", baseKind: "hongo",
      color: "#9CA85A", colorDark: "#5E6A2C", radius: 23,
      speedMult: 0.85, hp: 320, reward: 14, viralAdd: 7, attack: 5, isBoss: false,
      shield: { type: "wall", maxHP: 2, regenRate: 0, regenDelay: 0 },
      spore: { interval: 3.2, childHpFrac: 0.2, childSpeedMult: 1.9, maxChildren: 5 },
      tooltip: "Hongo dermatofito de la tiña (pie de atleta y tiña corporal o 'ringworm'). Mientras avanza suelta esporas hijas que corren más rápido."
    },
    // ---- Patógenos cutáneos (Fase 1 = infección de piel) ---------------
    sepidermidis: {
      id: "sepidermidis", name: "Staphylococcus epidermidis", baseKind: "bacteria",
      color: "#90A4AE", colorDark: "#546E7A", radius: 27,
      speedMult: 1.3, hp: 120, reward: 6, viralAdd: 4, attack: 3, isBoss: false,
      shield: null,
      tentacles: { range: 70, dmg: 7, interval: 1.8, pulses: 3, pulseGap: 0.22 },
      tooltip: "Coco gram positivo de la flora normal de la piel. Rápido y débil... pero cuando pasa pegado a una torre saca SEUDÓPODOS y le mete puñetazos. Forma biofilm sobre catéteres y prótesis."
    },
    hsv: {
      id: "hsv", name: "Herpes simplex (HSV)", baseKind: "virus",
      color: "#9575CD", colorDark: "#4527A0", radius: 26,
      speedMult: 1.55, hp: 130, reward: 9, viralAdd: 6, attack: 4, isBoss: false,
      shield: null,
      tooltip: "Virus con envoltura que causa vesículas dolorosas en piel y mucosas (herpes labial/genital). Muy rápido y queda latente en los nervios para reactivarse. Poca vida, pero difícil de atrapar."
    },
    cacnes: {
      id: "cacnes", name: "Cutibacterium acnes", baseKind: "bacteria",
      color: "#C9A66B", colorDark: "#7a5c33", colorLight: "#E8D2A8", radius: 20,
      speedMult: 0.7, hp: 280, reward: 12, viralAdd: 6, attack: 4, isBoss: false,
      shield: { type: "wall", maxHP: 2, regenRate: 0, regenDelay: 0 },
      tooltip: "Bacilo anaerobio del folículo piloso, responsable del acné. Lento y resistente; su biofilm en el poro lo protege parcialmente del ataque inmune."
    },
    pseudomonas: {
      id: "pseudomonas", name: "Pseudomonas aeruginosa", baseKind: "bacteria",
      color: "#26A69A", colorDark: "#00695C", colorLight: "#80DEEA", radius: 20,
      speedMult: 1.0, hp: 360, reward: 16, viralAdd: 7, attack: 10, power: { type: "spray", range: 115, cooldown: 5, stun: 2.4, dmg: 16 }, isBoss: false,
      shield: { type: "wall", maxHP: 3, regenRate: 3 / 12, regenDelay: 8 },
      seekers: { interval: 7.5, hp: 8, speed: 75, dmg: 22 },   // esporas buscadoras de torres disparadoras (cañón MAC, NK, linfocito B/T, eosinófilo)
      tooltip: "Bacilo gram negativo de heridas húmedas. Además de su spray paralizante, suelta esporas que vuelan hacia las torres disparadoras (cañón MAC, Linfocito B/T, NK, Eosinófilo) para destruirlas. Piocianina y biofilm resistente."
    },
    // ---- Lote 2: gérmenes de piel con poderes propios ------------------
    sarna: {
      id: "sarna", name: "Sarcoptes scabiei", shortName: "Ácaro sarna", baseKind: "parasito",
      color: "#8a5a2b", colorDark: "#4d3014", colorLight: "#c79a5e", radius: 24,
      speedMult: 1.0, hp: 220, reward: 13, viralAdd: 7, attack: 6, isBoss: false,
      shield: null,
      burrow: { interval: 5.0, duration: 1.5, speedMult: 1.9, surfaceJump: 90 },
      spore: { interval: 4.5, childHpFrac: 0.2, childSpeedMult: 1.6, maxChildren: 3 },
      tooltip: "Ácaro que excava galerías en la piel (escabiosis). Se entierra para esquivar el ataque y reaparece adelante; va dejando larvas. El Eosinófilo lo destroza y la Cel. de Langerhans lo delata cuando se esconde."
    },
    hpv: {
      id: "hpv", name: "Virus del papiloma (HPV)", shortName: "HPV", baseKind: "virus",
      color: "#8a9a5e", colorDark: "#4f5a2c", colorLight: "#c2cf90", radius: 25,
      speedMult: 0.6, hp: 360, reward: 15, viralAdd: 8, attack: 6, isBoss: false,
      shield: { type: "wall", maxHP: 4, regenRate: 4 / 9, regenDelay: 3 },
      tooltip: "Virus de las verrugas. Su coraza de queratina se regenera y amortigua los golpes, así que es muy duro y lento. La Célula NK le rompe el escudo y le hace daño extra."
    },
    molluscum: {
      id: "molluscum", name: "Molluscum contagiosum", shortName: "Molluscum", baseKind: "virus",
      color: "#e8d6c0", colorDark: "#b89a78", colorLight: "#fbf2e6", radius: 24,
      speedMult: 1.0, hp: 170, reward: 11, viralAdd: 6, attack: 4, isBoss: false,
      shield: null,
      spore: { interval: 3.5, childHpFrac: 0.4, childSpeedMult: 1.0, maxChildren: 3 },
      deathSplit: { count: 2, hpFrac: 0.35 },
      tooltip: "Poxvirus muy contagioso, típico en niños: pápulas cerosas con un hoyuelo central. Suelta 'perlas' que germinan en nuevos molluscum y, al morir, se divide en dos. La Célula NK es la indicada."
    },
    malassezia: {
      id: "malassezia", name: "Malassezia", shortName: "Malassezia", baseKind: "hongo",
      color: "#d8c060", colorDark: "#8a7320", colorLight: "#f0e29a", radius: 24,
      speedMult: 0.85, hp: 240, reward: 12, viralAdd: 7, attack: 5, isBoss: false,
      shield: null,
      greaseAura: { range: 95, slowFire: 1.5 },
      tooltip: "Levadura grasa de la piel (pitiriasis versicolor y caspa). Suelta una película aceitosa que 'engrasa' a las torres cercanas y les baja la cadencia de disparo. Cae con daño bruto o antiséptico."
    },
    // ---- Bosses --------------------------------------------------------
    bossPyogenes: {
      id: "bossPyogenes", name: "Streptococcus pyogenes", baseKind: "bacteria",
      color: "#C62828", colorDark: "#5a0d0d", radius: 32,
      speedMult: 0.8, hp: 1050, reward: 50, viralAdd: 15, attack: 25, power: { type: "burst", range: 165, cooldown: 3, dmg: 24, slowFire: 3 }, isBoss: true,
      shield: { type: "capsula", maxHP: 6, regenRate: 6 / 8, regenDelay: 0 },
      tooltip: "La 'bacteria carnívora'. Causa fascitis necrotizante y faringitis severa. Su cápsula y exotoxinas la hacen muy peligrosa."
    },
    bossMRSA: {
      id: "bossMRSA", name: "MRSA", baseKind: "bacteria",
      color: "#424242", colorDark: "#1a1a1a", radius: 38,
      speedMult: 0.6, hp: 2700, reward: 150, viralAdd: 35, attack: 35, power: { type: "spray", range: 165, cooldown: 3, stun: 3, dmg: 28 }, isBoss: true,
      shield: { type: "capsula", maxHP: 10, regenRate: 2 / 6, regenDelay: 0, doubleRing: true, mrsaHalo: true },
      tooltip: "Staphylococcus aureus multi-resistente a antibióticos. Una de las amenazas microbiológicas más serias del siglo XXI. Combina cápsula, biofilm y resistencia genética. Su erradicación requiere arsenal completo del sistema inmune."
    },
    bossPseudomonas: {
      id: "bossPseudomonas", name: "Pseudomonas aeruginosa", baseKind: "bacteria",
      color: "#00ACC1", colorDark: "#00606e", colorLight: "#4DD0E1", radius: 30,
      speedMult: 0.9, hp: 1400, reward: 65, viralAdd: 18, attack: 22, power: { type: "devour", range: 130, cooldown: 11, pull: 1.5 }, isBoss: true,
      shield: { type: "wall", maxHP: 6, regenRate: 6 / 8, regenDelay: 0 },
      tooltip: "Pseudomonas invasiva: ectima gangrenoso. Coloniza heridas y quemaduras extensas, destruye el tejido y resiste muchos antibióticos. Su biofilm se regenera con rapidez."
    },
    bossClostridium: {
      id: "bossClostridium", name: "Clostridium perfringens", baseKind: "bacteria",
      color: "#546E7A", colorDark: "#263238", radius: 32,
      speedMult: 0.55, hp: 1650, reward: 80, viralAdd: 22, attack: 28, power: { type: "devour", range: 120, cooldown: 13, pull: 1.8 }, isBoss: true,
      shield: { type: "wall", maxHP: 5, regenRate: 0, regenDelay: 0 },
      tooltip: "Bacilo anaerobio de la gangrena gaseosa. Sus toxinas necrosan músculo y piel produciendo gas en los tejidos. Avanza lento e implacable; emergencia quirúrgica."
    },
    // ---- Legacy aliases (some old code still references these by name) --
    bacteria: {
      id: "bacteria", name: "Bacteria", baseKind: "bacteria",
      color: "#E74C3C", colorDark: "#922a1f", radius: 14, speedMult: 0.6,
      hp: 200, reward: 10, viralAdd: 5, isBoss: false, shield: null
    },
    virus: {
      id: "virus", name: "Virus", baseKind: "virus",
      color: "#8E44AD", colorDark: "#5a2c70", radius: 9, speedMult: 1.5,
      hp: 80, reward: 5, viralAdd: 6, isBoss: false, shield: null
    },
    hongo: {
      id: "hongo", name: "Hongo", baseKind: "hongo",
      color: "#E91E63", colorDark: "#8c1240", radius: 12, speedMult: 1.0,
      hp: 140, reward: 15, viralAdd: 8, isBoss: false, shield: null
    },
    boss: {
      id: "boss", name: "Boss", baseKind: "bacteria",
      color: "#E74C3C", colorDark: "#5a1010", radius: 42, speedMult: 0.4,
      hp: 2000, reward: 100, viralAdd: 20, isBoss: true, shield: null
    },
    bossBacteria:  { id: "bossBacteria",  name: "Mega Bacteria",      baseKind: "bacteria",  color: "#8B0000", colorDark: "#3d0a0a", radius: 35, speedMult: 0.40, hp:  600, reward:  50, viralAdd: 15, isBoss: true, shield: null },
    bossVirus:     { id: "bossVirus",     name: "Virus Mutado",        baseKind: "virus",     color: "#6A1B9A", colorDark: "#3a0f5b", radius: 22, speedMult: 1.20, hp:  700, reward:  60, viralAdd: 18, isBoss: true, shield: null },
    bossHongo:     { id: "bossHongo",     name: "Hongo Invasivo",      baseKind: "hongo",     color: "#C2185B", colorDark: "#6a0d33", radius: 33, speedMult: 0.90, hp:  850, reward:  80, viralAdd: 22, isBoss: true, shield: null },
    bossPrimordial:{ id: "bossPrimordial",name: "Patogeno Primordial", baseKind: "primordial",color: "#2A2424", colorDark: "#0a0606", radius: 45, speedMult: 0.50, hp: 1500, reward: 150, viralAdd: 35, isBoss: true, shield: null }
  };

  // Wave 1: only bacteria. Wave 2: bacteria + virus. Wave 3+: all 3 types.
  // Wave 8: BOSS + escorts.
  var WAVES = [
    { groups: [
      { type: "bacteria", count: 8, interval: 1.4 }
    ], hpMult: 1.0 },
    { groups: [
      { type: "bacteria", count: 6, interval: 1.3 },
      { type: "virus",    count: 6, interval: 0.7 }
    ], hpMult: 1.0 },
    { groups: [
      { type: "bacteria", count: 5, interval: 1.3 },
      { type: "virus",    count: 6, interval: 0.6 },
      { type: "hongo",    count: 4, interval: 1.0 }
    ], hpMult: 1.05 },
    { groups: [
      { type: "virus",    count: 10, interval: 0.55 },
      { type: "hongo",    count:  6, interval: 0.9  },
      { type: "bacteria", count:  4, interval: 1.3  }
    ], hpMult: 1.10 },
    { groups: [
      { type: "hongo",    count: 10, interval: 0.85 },
      { type: "bacteria", count:  6, interval: 1.20 },
      { type: "virus",    count:  8, interval: 0.50 }
    ], hpMult: 1.15 },
    { groups: [
      { type: "bacteria", count:  8, interval: 1.10 },
      { type: "virus",    count: 12, interval: 0.45 },
      { type: "hongo",    count:  8, interval: 0.85 }
    ], hpMult: 1.25 },
    { groups: [
      { type: "hongo",    count: 14, interval: 0.7 },
      { type: "virus",    count: 14, interval: 0.4 },
      { type: "bacteria", count:  8, interval: 1.0 }
    ], hpMult: 1.35 },
    { groups: [
      { type: "bacteria", count:  6, interval: 1.0 },
      { type: "virus",    count: 10, interval: 0.5 },
      { type: "boss",     count:  1, interval: 0.0 },
      { type: "hongo",    count:  6, interval: 0.9 }
    ], hpMult: 1.5 }
  ];

  // -------- STATE ---------------------------------------------------------
  var state;
  // -------- PHASE 1 CONFIG ------------------------------------------------
  // Fase 1 de la experiencia: la invasión inevitable. Sin niveles, sin victoria.
  // El jugador retrasa el avance de la infestación hasta el 100%, momento en
  // el que se dispara la animación de envenenamiento cinematográfico.
  var INFESTACION_THRESHOLD = 100;
  var VIRAL_BY_TYPE = {
    bacteria: 5,
    virus: 6,
    hongo: 8,
    boss: 15,             // generic boss (fallback)
    bossBacteria: 15,
    bossVirus: 18,
    bossHongo: 22,
    bossPrimordial: 35
  };
  var BOSS_WAVES = { 3: "bossPyogenes", 7: "bossPseudomonas", 12: "bossClostridium", 18: "bossMRSA" };
  // Snowball multipliers as a function of infestation 0-100.
  function infestSpawnMult(inf) {
    // 0%->1.0  30%->1.3  60%->1.6  85%->1.85  100%->2.0
    if (inf <= 0) return 1.0;
    return 1.0 + Math.min(1.0, inf / 100);
  }
  function infestSpeedMult(inf) {
    // 0%->1.0  60%->1.20  85%->1.30  100%->1.35
    if (inf <= 0) return 1.0;
    return 1.0 + Math.min(0.35, (inf / 100) * 0.35);
  }
  function infestWaveGapMult(inf) {
    // 0%->1.0  30%->0.90  60%->0.70  85%->0.55  100%->0.50
    return Math.max(0.50, 1.0 - (inf / 100) * 0.50);
  }
  // Surge: al superar el 40% de infestación, sube de golpe la presión y sigue
  // creciendo. <40% -> 1.0; 40% -> 1.3; 100% -> 1.8. Se aplica a la cadencia
  // de aparición (ingreso más rápido) y a la cantidad de gérmenes por oleada.
  function infestSurge() {
    if (!state) return 1.0;
    var ratio = state.viralLoad / Math.max(1, state.viralThreshold);
    if (ratio < 0.40) return 1.0;
    return 1.3 + ((ratio - 0.40) / 0.60) * 0.5;
  }
  function getInitialAtp() { return 80; }
  function getInitialDripDelay() { return 6; }
  // ---- Wave roster (Sprint 6 explicit table per spec) -------------------
  // Each entry is an array of { type, count, interval }. After wave 18 we
  // fall back to a procedural mix so the game keeps escalating.
  // Fase 1 = infección de piel: solo gérmenes cutáneos. Jefes en 3/7/12/18.
  var WAVE_TABLE = {
    1:  [["sepidermidis",5,1.1]],
    2:  [["sepidermidis",5,1.0],["hsv",3,0.6]],
    3:  [["sepidermidis",5,1.0],["hsv",4,0.6],["bossPyogenes",1,0]],
    4:  [["sepidermidis",4,1.0],["hsv",4,0.6],["cacnes",2,1.0]],
    5:  [["sepidermidis",5,1.0],["hsv",5,0.55],["cacnes",3,1.0],["dermatofito",1,1.0]],
    6:  [["sepidermidis",4,1.0],["hsv",5,0.55],["cacnes",3,1.0],["candida",2,0.9],["hpv",2,1.0]],
    7:  [["sepidermidis",4,0.9],["hsv",5,0.55],["cacnes",3,1.0],["pseudomonas",2,0.9],["molluscum",2,0.9],["bossPseudomonas",1,0]],
    8:  [["sepidermidis",4,0.9],["hsv",6,0.5],["cacnes",3,1.0],["pseudomonas",3,0.9],["malassezia",2,0.9],["sarna",2,1.0]],
    9:  [["hsv",6,0.5],["cacnes",3,1.0],["pseudomonas",3,0.9],["candida",3,0.9],["saureus",2,1.0],["hpv",2,1.0]],
    10: [["hsv",6,0.5],["cacnes",3,1.0],["pseudomonas",4,0.9],["candida",3,0.9],["saureus",3,1.0],["molluscum",2,0.9]],
    11: [["sepidermidis",5,0.85],["hsv",6,0.5],["pseudomonas",4,0.9],["candida",3,0.9],["saureus",3,1.0],["malassezia",2,0.9]],
    12: [["hsv",6,0.5],["pseudomonas",4,0.9],["candida",4,0.9],["saureus",3,1.0],["sarna",2,1.0],["hpv",2,1.0],["bossClostridium",1,0]],
    13: [["hsv",7,0.5],["cacnes",4,0.95],["pseudomonas",5,0.9],["candida",4,0.9],["saureus",4,1.0],["dermatofito",2,1.0],["molluscum",2,0.9]],
    14: [["hsv",7,0.5],["cacnes",4,0.95],["pseudomonas",5,0.9],["candida",5,0.9],["saureus",4,1.0],["malassezia",2,0.9],["sarna",2,1.0]],
    15: [["sepidermidis",6,0.8],["hsv",7,0.5],["pseudomonas",5,0.9],["candida",5,0.9],["saureus",5,1.0],["hpv",2,1.0],["sarna",2,1.0]],
    16: [["hsv",8,0.45],["cacnes",5,0.9],["pseudomonas",6,0.85],["candida",5,0.9],["saureus",5,1.0],["dermatofito",2,1.0],["molluscum",2,0.9],["malassezia",2,0.9]],
    17: [["hsv",8,0.45],["cacnes",5,0.9],["pseudomonas",6,0.85],["candida",6,0.9],["saureus",6,1.0],["sarna",2,1.0],["molluscum",2,0.9],["hpv",2,1.0]],
    18: [["hsv",6,0.45],["pseudomonas",5,0.85],["candida",4,0.9],["saureus",8,1.0],["hpv",3,1.0],["bossMRSA",1,0]]
  };

  // ============ MÉDULA ÓSEA Y PICKUPS DE DESBLOQUEO ============
  // Cada cierto número de oleadas, la médula ósea emite un pickup flotante.
  // El jugador lo tappea y la torre correspondiente se desbloquea en el dock.
  // Schedule cada 2 olas en Fase 1. MAC sale 2do — el jugador ya cuenta con
  // él temprano. Las per-fase se pierden al cambiar de fase y se re-emiten;
  // las permanentes (Mastocito, MAC) si se desbloquean, quedan para siempre.
  var BASIC_TOWERS = ["neutrofilo", "linfocitoB", "linfocitoT"];
  var UNLOCK_SCHEDULE = {
    2:  "langerhans",   // per-fase
    4:  "complemento",  // permanente (MAC) — segundo pickup
    6:  "nk",           // per-fase
    8:  "eosinofilo",   // per-fase
    10: "mastocito"     // permanente
  };
  var PER_PHASE_TOWERS = ["langerhans", "nk", "eosinofilo"]; // re-emiten al cambiar fase
  var PERSISTENT_UNLOCKABLES = ["mastocito", "complemento"]; // si no llegó a unlocked, también re-aparece

  // === MEGACARIOCITO: produce plaquetas maduras periódicamente ===
  function updateMegakaryocyte(dt) {
    var mk = state.megakaryocyte;
    if (!mk || !state.dissemination) return;
    if (!state.plaquetaPickups) state.plaquetaPickups = [];
    if (state.plaquetaPickups.length >= mk.max) return; // pausa si lleno
    mk.maturing += dt / mk.period;
    if (mk.maturing >= 1) {
      mk.maturing = 0;
      // Posición orbital alrededor del megacariocito
      var n = state.plaquetaPickups.length;
      var angle = -Math.PI / 2 + (n - 1.5) * 0.55;
      var orbit = 36 * U;
      state.plaquetaPickups.push({
        x: mk.x + Math.cos(angle) * orbit,
        y: mk.y + Math.sin(angle) * orbit,
        baseX: mk.x + Math.cos(angle) * orbit,
        baseY: mk.y + Math.sin(angle) * orbit,
        phase: Math.random() * Math.PI * 2,
        bornAt: state.time
      });
      sfx("upgrade");
    }
    // Reorganiza orbitales para que se vean ordenados
    for (var i = 0; i < state.plaquetaPickups.length; i++) {
      var p = state.plaquetaPickups[i];
      var a = -Math.PI / 2 + (i - (state.plaquetaPickups.length - 1) / 2) * 0.55;
      var or = 36 * U;
      p.baseX = mk.x + Math.cos(a) * or;
      p.baseY = mk.y + Math.sin(a) * or;
      // Pequeño bobbing
      p.phase += dt * 1.5;
      p.x = p.baseX + Math.sin(p.phase) * 2 * U;
      p.y = p.baseY + Math.cos(p.phase * 0.8) * 2 * U;
    }
  }

  function tryTapPlaquetaPickup(x, y) {
    if (!state.plaquetaPickups) return false;
    var arr = state.plaquetaPickups;
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      var dx = x - p.x, dy = y - p.y;
      var R = 18 * U;
      if (dx * dx + dy * dy <= R * R) {
        // Entrar en modo colocar (consumirá una al colocar exitosamente)
        state.selectedToBuild = "plaqueta";
        state.selectedTower = null;
        sfx("tap");
        return true;
      }
    }
    return false;
  }

  function drawMegakaryocyte() {
    if (!state.megakaryocyte || !state.dissemination) return;
    var mk = state.megakaryocyte;
    ctx.save();
    ctx.translate(mk.x, mk.y);
    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.beginPath();
    ctx.ellipse(0, 18 * U, 28 * U, 9 * U, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cuerpo: célula grande con núcleo multilobulado (característica real)
    var R = 24 * U;
    var bodyGrad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    bodyGrad.addColorStop(0, "#FFE8D0");
    bodyGrad.addColorStop(0.6, "#E8B888");
    bodyGrad.addColorStop(1, "#8A5030");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5A3010";
    ctx.lineWidth = Math.max(1.2, 1.6 * U);
    ctx.stroke();
    // Núcleo multilobulado (4-5 lóbulos conectados)
    var lobes = 5;
    ctx.fillStyle = "#7A3050";
    ctx.strokeStyle = "#4A1830";
    ctx.lineWidth = Math.max(0.9, 1.2 * U);
    for (var l = 0; l < lobes; l++) {
      var la = (l / lobes) * Math.PI * 2 + state.time * 0.15;
      var lr = R * 0.32;
      var lx = Math.cos(la) * R * 0.38;
      var ly = Math.sin(la) * R * 0.38;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Anillo de maduración (progreso) — alrededor del cuerpo
    var prog = Math.min(1, state.megakaryocyte.maturing);
    var ringR = R + 5 * U;
    ctx.strokeStyle = "rgba(60, 30, 20, 0.45)";
    ctx.lineWidth = Math.max(2, 3 * U);
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
    if (state.plaquetaPickups && state.plaquetaPickups.length < state.megakaryocyte.max) {
      ctx.strokeStyle = "#E8A020";
      ctx.lineWidth = Math.max(2, 3 * U);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
    }
    // Etiqueta
    ctx.fillStyle = "rgba(60, 30, 20, 0.85)";
    ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("MEGACARIOCITO", 0, R + 14 * U);
    ctx.restore();
  }

  function drawPlaquetaPickups() {
    if (!state.plaquetaPickups || !state.dissemination) return;
    for (var i = 0; i < state.plaquetaPickups.length; i++) {
      var p = state.plaquetaPickups[i];
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 4 + i);
      ctx.save();
      ctx.translate(p.x, p.y);
      // Halo dorado pulsante (tappable)
      ctx.fillStyle = "rgba(232, 160, 32, " + (0.22 + pulse * 0.18) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, 22 * U, 0, Math.PI * 2);
      ctx.fill();
      // Mini malla de fibrina (3 hexágonos en triángulo)
      var hR = 5 * U;
      var hW = hR * Math.sqrt(3);
      var hH = hR * 1.5;
      var miniCells = [
        { x: -hW * 0.5, y: -hH * 0.25 },
        { x:  hW * 0.5, y: -hH * 0.25 },
        { x: 0,         y:  hH * 0.75 }
      ];
      for (var mc = 0; mc < miniCells.length; mc++) {
        var cell = miniCells[mc];
        var grd = ctx.createRadialGradient(cell.x - hR * 0.3, cell.y - hR * 0.3, hR * 0.15, cell.x, cell.y, hR);
        grd.addColorStop(0, "#FFEBB0");
        grd.addColorStop(0.55, "#E8A020");
        grd.addColorStop(1, "#8A5010");
        ctx.fillStyle = grd;
        ctx.beginPath();
        for (var hh = 0; hh < 6; hh++) {
          var ha = (Math.PI / 3) * hh + Math.PI / 6;
          var hx = cell.x + Math.cos(ha) * hR;
          var hy = cell.y + Math.sin(ha) * hR;
          if (hh === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#5A3408";
        ctx.lineWidth = Math.max(0.7, 0.9 * U);
        ctx.stroke();
      }
      // Badge "TAP" sutil cuando lleva tiempo madura
      if (state.time - p.bornAt > 0.6) {
        var blinkAlpha = 0.5 + 0.5 * Math.sin(state.time * 3 + i);
        ctx.fillStyle = "rgba(255, 230, 130, " + (0.45 + blinkAlpha * 0.35) + ")";
        ctx.font = "bold " + Math.floor(8 * U) + "px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("TAP", 0, gR * 3.2);
      }
      ctx.restore();
    }
  }

  function spawnUnlockPickup(typeId) {
    if (!state.medulaOsea) return;
    if (!state.unlockPickups) state.unlockPickups = [];
    // No spawn si ya está desbloqueada o ya hay un pickup pendiente.
    if (state.unlockedTowers && state.unlockedTowers.indexOf(typeId) !== -1) return;
    for (var i = 0; i < state.unlockPickups.length; i++) {
      if (state.unlockPickups[i].typeId === typeId) return;
    }
    state.unlockPickups.push({
      typeId: typeId,
      x: state.medulaOsea.x,
      y: state.medulaOsea.y,
      vx: (Math.random() - 0.5) * 8 * U,
      vy: -22 * U,
      age: 0,
      bornAt: state.time,
      collecting: false,
      collectT: 0
    });
    showMsg("¡Nueva defensa disponible!");
    sfx("upgrade");
  }

  function updateUnlockPickups(dt) {
    if (!state.unlockPickups) return;
    var arr = state.unlockPickups;
    for (var i = arr.length - 1; i >= 0; i--) {
      var p = arr[i];
      p.age += dt;
      if (p.collecting) {
        p.collectT += dt;
        if (p.collectT >= 0.5) {
          // Desbloquea
          if (state.unlockedTowers.indexOf(p.typeId) === -1) {
            state.unlockedTowers.push(p.typeId);
            // Asegurar que su grupo se abra para que se vea la nueva torre.
            for (var gi = 0; gi < TOWER_GROUPS.length; gi++) {
              if (TOWER_GROUPS[gi].towers.indexOf(p.typeId) !== -1) {
                state.openGroups[TOWER_GROUPS[gi].id] = true;
                break;
              }
            }
            layoutUI();
            var defNew = TOWER_DEFS[p.typeId];
            if (defNew) showMsg("¡" + defNew.name + " desbloqueado!");
            sfx("upgrade");
            // Abre el compendio enfocado en la nueva torre para que el
            // jugador conozca sus poderes/stats antes de seguir.
            openCompendium(p.typeId);
          }
          arr.splice(i, 1);
          continue;
        }
        continue;
      }
      // Física: flota arriba con leve oscilación, baja luego, se queda en el aire.
      p.vy *= (1 - 0.6 * dt);
      p.vy -= 4 * U * dt;  // ligera flotabilidad continua
      p.vx *= (1 - 0.8 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Clamp al campo
      if (p.x < FIELD_LEFT + 16 * U) { p.x = FIELD_LEFT + 16 * U; p.vx = Math.abs(p.vx); }
      if (p.x > FIELD_RIGHT - 16 * U) { p.x = FIELD_RIGHT - 16 * U; p.vx = -Math.abs(p.vx); }
      if (p.y < FIELD_TOP + 80 * U) { p.y = FIELD_TOP + 80 * U; p.vy = 0; }
    }
  }

  function tryTapUnlockPickup(x, y) {
    if (!state.unlockPickups) return false;
    var arr = state.unlockPickups;
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      if (p.collecting) continue;
      var dx = x - p.x, dy = y - p.y;
      var R = 22 * U;
      if (dx * dx + dy * dy <= R * R) {
        p.collecting = true;
        p.collectT = 0;
        return true;
      }
    }
    return false;
  }

  function drawMedulaOsea() {
    if (!state.medulaOsea) return;
    var m = state.medulaOsea;
    var s = U;
    ctx.save();
    ctx.translate(m.x, m.y);
    // Pulso suave si hay pickup esperando
    var pendingPulse = 0;
    if (state.unlockPickups && state.unlockPickups.length > 0) {
      pendingPulse = 0.5 + 0.5 * Math.sin(state.time * 3);
    }
    if (pendingPulse > 0) {
      ctx.fillStyle = "rgba(255, 210, 100, " + (0.15 + pendingPulse * 0.20) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, 40 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Forma de hueso
    ctx.fillStyle = "#e8d8a8";
    ctx.strokeStyle = "#8a6f3a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Bulbos extremos
    var bulbs = [[-28, -10], [-28, 10], [28, -10], [28, 10]];
    for (var b = 0; b < bulbs.length; b++) {
      ctx.beginPath();
      ctx.arc(bulbs[b][0] * s, bulbs[b][1] * s, 8 * s, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // Centro rosado (médula)
    ctx.fillStyle = "#c08080";
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Etiqueta
    ctx.fillStyle = "rgba(80, 50, 30, 0.8)";
    ctx.font = "bold " + Math.floor(9 * s) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("MÉDULA", 0, 20 * s);
    ctx.restore();
  }

  function drawUnlockPickups() {
    if (!state.unlockPickups) return;
    var arr = state.unlockPickups;
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      var def = TOWER_DEFS[p.typeId];
      if (!def) continue;
      var scale = 1;
      var alpha = 1;
      if (p.collecting) {
        var t = p.collectT / 0.5;
        scale = 1 + t * 1.5;
        alpha = 1 - t;
      }
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 4 + i);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;
      ctx.scale(scale, scale);
      // Halo pulsante
      ctx.fillStyle = "rgba(255, 210, 100, " + (0.20 + pulse * 0.30) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, 26 * U, 0, Math.PI * 2);
      ctx.fill();
      // Cápsula amarilla
      ctx.fillStyle = "#f5d76e";
      ctx.strokeStyle = "#8a6020";
      ctx.lineWidth = 2;
      ctx.fillRect(-18 * U, -18 * U, 36 * U, 36 * U);
      ctx.strokeRect(-18 * U, -18 * U, 36 * U, 36 * U);
      // Sprite de la torre dentro
      drawCardIcon(p.typeId, 0, 0, 11 * U, true);
      // "+" arriba
      ctx.fillStyle = "#ffd24a";
      ctx.font = "bold " + Math.floor(11 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", 0, -26 * U);
      ctx.restore();
      // Texto debajo: nombre de la torre
      if (!p.collecting) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.font = "bold " + Math.floor(10 * U) + "px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        var nameTxt = def.shortName || def.name;
        var pad = 4 * U;
        var tw = ctx.measureText(nameTxt).width;
        ctx.fillRect(p.x - tw / 2 - pad, p.y + 24 * U, tw + pad * 2, 16 * U);
        ctx.fillStyle = "#fff";
        ctx.fillText(nameTxt, p.x, p.y + 26 * U);
        ctx.restore();
      }
    }
  }
  // ============ FIN MÉDULA ÓSEA ============

  // ============ COMPENDIO DE UNIDADES ============
  // Datos de fuerza/debilidad por unidad (defensas) y por germen.
  // Esquema por torre: strong/weak (prosa), synergyWith (la potencian),
  // potentiates (a quiénes potencia), bestIn (medios), affinity (lineaje).
  var TOWER_LORE = {
    neutrofilo: {
      strong: "Bacterias sin escudo, infiltraciones leves",
      weak: "Virus rápidos, bacterias con cápsula gruesa",
      synergyWith: ["linfocitoB"],
      potentiates: [],
      bestIn: ["piel"],
      affinity: "Granulocito · Mieloide"
    },
    linfocitoB: {
      strong: "Bacterias extracelulares con cápsula",
      weak: "Virus intracelulares, daño en área no especializado",
      synergyWith: ["langerhans"],
      potentiates: ["neutrofilo", "complemento", "macrofagoLibre"],
      bestIn: ["sangre"],
      affinity: "Linfoide · Humoral"
    },
    linfocitoT: {
      strong: "Virus con escudo spike, células infectadas",
      weak: "Hongos, bacterias agrupadas",
      synergyWith: ["langerhans"],
      potentiates: ["mastocito"],
      bestIn: ["tejido"],
      affinity: "Linfoide · Celular"
    },
    langerhans: {
      strong: "Marca al enemigo: las otras torres lo dañan más",
      weak: "No hace daño propio, depende del resto del equipo",
      synergyWith: ["nk", "eosinofilo"],
      potentiates: ["neutrofilo", "linfocitoB", "linfocitoT", "nk", "eosinofilo", "mastocito", "complemento", "macrofagoLibre"],
      bestIn: ["piel", "mucosa"],
      affinity: "Dendrítica · Mieloide"
    },
    nk: {
      strong: "Virus, células sospechosas (rompe escudos)",
      weak: "Bacterias con biofilm muy denso",
      synergyWith: ["langerhans"],
      potentiates: ["linfocitoT"],
      bestIn: ["sangre", "tejido"],
      affinity: "Linfoide innata"
    },
    eosinofilo: {
      strong: "Hongos, parásitos, infestaciones grandes",
      weak: "Virus pequeños y rápidos",
      synergyWith: ["mastocito"],
      potentiates: [],
      bestIn: ["piel"],
      affinity: "Granulocito · Mieloide"
    },
    mastocito: {
      strong: "Ralentiza ENJAMBRES: el equipo dispara más",
      weak: "No mata por sí mismo (es soporte)",
      synergyWith: ["eosinofilo"],
      potentiates: ["neutrofilo", "linfocitoB", "linfocitoT", "nk", "eosinofilo", "complemento", "macrofagoLibre"],
      bestIn: ["tejido", "mucosa"],
      affinity: "Tisular · Mieloide"
    },
    complemento: {
      strong: "Cualquier escudo (ignora cápsula/spike/pared)",
      weak: "Virus (no tienen membrana lipídica plasmática)",
      synergyWith: ["linfocitoB"],
      potentiates: [],
      bestIn: ["sangre"],
      affinity: "Sistema complemento · Proteína"
    },
    macrofagoLibre: {
      strong: "Gérmenes lentos / parados / heridos, residuos",
      weak: "Gérmenes muy rápidos",
      synergyWith: ["mastocito", "langerhans"],
      potentiates: [],
      bestIn: ["tejido"],
      affinity: "Monocito · Mieloide"
    },
    plaqueta: {
      strong: "Panal hemostático: barrera larga que obstruye el carril",
      weak: "Daño mínimo — necesita acompañantes que rematen",
      synergyWith: ["complemento", "neutrofilo"],
      potentiates: ["complemento", "neutrofilo"],
      bestIn: ["sangre"],
      affinity: "Fibrina · Coagulación"
    }
  };
  var ENEMY_LORE = {
    saureus:        { strong: "Defensas directas (su cápsula amarilla resiste)",
                      weak:   "Linfocito B (anticuerpos), MAC (ácido)" },
    influenza:      { strong: "Esquivar trampas lentas — es rápido",
                      weak:   "NK (rompe envoltura viral), Linfocito B" },
    hsv:            { strong: "Spike azul: rechaza casi todo el daño",
                      weak:   "Linfocito T citotóxico (lo atraviesa)" },
    candida:        { strong: "Pared blanca: resiste anticuerpos",
                      weak:   "Eosinófilo (gránulos antifúngicos), MAC" },
    pseudomonas:    { strong: "Biofilm protector, suelta esporas buscadoras",
                      weak:   "MAC (ácido lo derrite), Mastocito (ralentiza)" },
    hpv:            { strong: "Esquivo y duradero",
                      weak:   "Linfocito T (oncovirus)" },
    molluscum:      { strong: "Lento pero resistente; transmite",
                      weak:   "Linfocito T, Langerhans (lo marca)" },
    sarna:          { strong: "Se entierra: invisible hasta ser marcada",
                      weak:   "Langerhans (la revela), Eosinófilo" },
    malassezia:     { strong: "Película aceitosa: ralentiza torres cercanas",
                      weak:   "Antiséptico, Eosinófilo" },
    cacnes:         { strong: "Coco común, rápido en piel grasa",
                      weak:   "Neutrófilo, Linfocito B" },
    sepidermidis:   { strong: "Forma biofilm, parte de la flora",
                      weak:   "MAC, Neutrófilo agresivo" },
    bossMRSA:       { strong: "Resistente a antibióticos clásicos",
                      weak:   "Linfocito B + MAC combinados" },
    bossPyogenes:   { strong: "Fagolítico, dispara enzimas",
                      weak:   "Linfocito B + ataques rápidos" },
    bossPseudomonas:{ strong: "Spawn de esporas + biofilm grueso",
                      weak:   "MAC sostenido, Mastocito para frenar" },
    bossClostridium:{ strong: "Toxinas paralizantes",
                      weak:   "MAC, Linfocito T citotóxico" }
  };

  // Macrófago Libre — entrada virtual del compendio para el guardián autónomo
  // (no se coloca como torre, aparece solo cada cierto tiempo a apoyar).
  var MACROFAGO_LIBRE_DEF = {
    id: "macrofagoLibre",
    name: "Macrófago Libre",
    shortName: "Macrofago",
    color: "#E8923A",
    colorDark: "#A8581A",
    cost: 0,
    free: true,
    desc: "Patrulla autónoma — engulle gérmenes lentos/parados",
    levels: [{ damage: 30, range: 30, fireRate: 1.25, hp: 80 }]
  };

  function openCompendium(typeId, tabOverride) {
    state.compendiumOpen = true;
    state.compendiumFocus = typeId || null;
    state.compendiumSelected = typeId || null;
    state.compendiumScroll = 0;
    // Tab por defecto: si el typeId es de germen, ir a "germs", si no "cells".
    if (tabOverride) {
      state.compendiumTab = tabOverride;
    } else if (typeId && ENEMY_DEFS[typeId]) {
      state.compendiumTab = "germs";
    } else {
      state.compendiumTab = state.compendiumTab || "cells";
    }
  }
  function closeCompendium() {
    state.compendiumOpen = false;
    state.compendiumFocus = null;
  }
  function compendiumCells() {
    // Torres desbloqueadas + Macrófago Libre (siempre visible, es parte
    // del lore base del jugador).
    var arr = (state.unlockedTowers || []).slice();
    arr.push("macrofagoLibre");
    return arr;
  }
  function compendiumGerms() {
    // Solo los gérmenes ya vistos (mismo criterio que el sistema de vistos).
    var seen = state.vistos || {};
    var out = [];
    for (var k in seen) {
      if (seen[k] && ENEMY_DEFS[k]) out.push(k);
    }
    return out;
  }
  function compendiumGetDef(typeId) {
    if (typeId === "macrofagoLibre") return MACROFAGO_LIBRE_DEF;
    return TOWER_DEFS[typeId] || ENEMY_DEFS[typeId] || null;
  }
  function compendiumGetLore(typeId) {
    return TOWER_LORE[typeId] || ENEMY_LORE[typeId] || null;
  }
  function compendiumNamesOf(idList) {
    // Mapea ["langerhans", "linfocitoB"] → "Langerhans, Linfocito B".
    if (!idList || idList.length === 0) return "";
    var out = [];
    for (var i = 0; i < idList.length; i++) {
      var d = compendiumGetDef(idList[i]);
      if (d) out.push(d.shortName || d.name);
    }
    return out.join(", ");
  }
  // Etiquetas legibles de los medios.
  var MEDIUM_LABELS = {
    piel: "Piel", sangre: "Sangre", tejido: "Tejido", mucosa: "Mucosa"
  };
  function compendiumMediumLabels(arr) {
    if (!arr || arr.length === 0) return "";
    return arr.map(function (m) { return MEDIUM_LABELS[m] || m; }).join(" · ");
  }

  function drawCompendiumButton() {
    var b = UI.compendiumBtn;
    if (!b) return;
    var pulse = state.compendiumFocus ? (0.5 + 0.5 * Math.sin(state.time * 4)) : 0;
    ctx.save();
    ctx.fillStyle = pulse ? "rgba(255, 210, 74, " + (0.55 + pulse * 0.30) + ")" : "#33212e";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = pulse ? "#5a3a08" : "#ffd24a";
    ctx.font = "bold " + Math.max(11, Math.min(13, b.h * 0.36)) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📖 Compendio", b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }

  function drawCompendium() {
    if (!state.compendiumOpen) return;
    ctx.save();
    // Backdrop
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(0, 0, VW, VH);
    // Modal
    var modalW = Math.min(VW - 24, 500);
    var modalH = Math.min(VH - 40, 640);
    var modalX = (VW - modalW) / 2;
    var modalY = (VH - modalH) / 2;
    UI.compendiumModal = { x: modalX, y: modalY, w: modalW, h: modalH };
    ctx.fillStyle = "#241620";
    ctx.fillRect(modalX, modalY, modalW, modalH);

    // Header
    var headerH = 40;
    ctx.fillStyle = "#33212e";
    ctx.fillRect(modalX, modalY, modalW, headerH);
    ctx.fillStyle = "#ffd24a";
    ctx.font = "bold 15px Fredoka, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("📖 Compendio", modalX + 12, modalY + headerH / 2);
    // Close
    var closeSize = 30;
    UI.compendiumCloseBtn = {
      x: modalX + modalW - closeSize - 5,
      y: modalY + (headerH - closeSize) / 2,
      w: closeSize, h: closeSize
    };
    ctx.fillStyle = "#7a3a3a";
    ctx.fillRect(UI.compendiumCloseBtn.x, UI.compendiumCloseBtn.y, closeSize, closeSize);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Fredoka, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("✕", UI.compendiumCloseBtn.x + closeSize / 2, UI.compendiumCloseBtn.y + closeSize / 2 + 1);

    // Tabs
    var tabH = 36;
    var tabY = modalY + headerH;
    var tabs = [
      { key: "cells", label: "Células", count: compendiumCells().length },
      { key: "germs", label: "Gérmenes", count: compendiumGerms().length }
    ];
    UI.compendiumTabs = [];
    for (var ti = 0; ti < tabs.length; ti++) {
      var tw = modalW / tabs.length;
      var tx = modalX + ti * tw;
      var active = (state.compendiumTab === tabs[ti].key);
      UI.compendiumTabs.push({ key: tabs[ti].key, x: tx, y: tabY, w: tw, h: tabH });
      ctx.fillStyle = active ? "#241620" : "#1a1018";
      ctx.fillRect(tx, tabY, tw, tabH);
      if (active) {
        ctx.fillStyle = "#ffd24a";
        ctx.fillRect(tx, tabY + tabH - 3, tw, 3);
      }
      ctx.fillStyle = active ? "#fff" : "rgba(255,255,255,0.55)";
      ctx.font = "bold 13px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(tabs[ti].label + " (" + tabs[ti].count + ")", tx + tw / 2, tabY + tabH / 2);
    }

    // Grid de tarjetas estilo álbum: ícono arriba + nombre abajo.
    var ids = (state.compendiumTab === "germs") ? compendiumGerms() : compendiumCells();
    var gridY = tabY + tabH + 8;
    var detailH = Math.round(modalH * 0.40);
    var gridH = modalH - (gridY - modalY) - detailH - 6;
    var gridX = modalX + 8;
    var gridW = modalW - 16;

    // 4 columnas (antes 3) — tarjetas más chicas para que entren más
    // elementos a medida que el álbum crece por fases.
    var cols = 4;
    var gridGap = 6;
    var cardW = (gridW - (cols - 1) * gridGap) / cols;
    var cardH = cardW + 12;   // alto = ancho + espacio para el nombre
    var iconR = cardW * 0.34;
    UI.compendiumCards = [];

    ctx.save();
    ctx.beginPath();
    ctx.rect(gridX, gridY, gridW, gridH);
    ctx.clip();

    var rows = Math.ceil(ids.length / cols);
    var totalGridH = rows * cardH + Math.max(0, rows - 1) * gridGap;
    var maxScroll = Math.max(0, totalGridH - gridH);
    var scroll = state.compendiumScroll || 0;
    if (scroll > maxScroll) scroll = maxScroll;
    if (scroll < 0) scroll = 0;
    state.compendiumScroll = scroll;

    for (var i = 0; i < ids.length; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var cx = gridX + col * (cardW + gridGap);
      var cy = gridY + row * (cardH + gridGap) - scroll;
      if (cy + cardH < gridY || cy > gridY + gridH) continue;
      var typeId = ids[i];
      var def = compendiumGetDef(typeId);
      if (!def) continue;
      var selected = (typeId === state.compendiumSelected);
      UI.compendiumCards.push({ typeId: typeId, x: cx, y: cy, w: cardW, h: cardH });
      // Fondo
      ctx.fillStyle = selected ? colorAlpha(def.color || "#888", 0.30) : "#1f1219";
      ctx.fillRect(cx, cy, cardW, cardH);
      if (selected) {
        ctx.strokeStyle = def.color || "#888";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cardW, cardH);
      }
      // Ícono / sprite
      var iconCx = cx + cardW / 2;
      var iconCy = cy + cardW * 0.50;
      var isGerm = !!ENEMY_DEFS[typeId];
      if (isGerm) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx + 4, cy + 4, cardW - 8, cardW - 8);
        ctx.clip();
        drawTooltipSprite(def, iconCx, iconCy, iconR);
        ctx.restore();
      } else if (typeId === "macrofagoLibre") {
        // Sprite simplificado del macrófago libre.
        ctx.save();
        ctx.translate(iconCx, iconCy);
        ctx.fillStyle = def.color;
        ctx.strokeStyle = def.colorDark;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, iconR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Bumps (clipeados)
        ctx.beginPath(); ctx.arc(0, 0, iconR, 0, Math.PI * 2); ctx.clip();
        for (var bb = 0; bb < 5; bb++) {
          var ba = bb * Math.PI * 2 / 5;
          ctx.beginPath();
          ctx.arc(Math.cos(ba) * iconR * 0.85, Math.sin(ba) * iconR * 0.85, iconR * 0.30, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // Ojos pequeños
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(iconCx - iconR * 0.25, iconCy - iconR * 0.05, iconR * 0.16, 0, Math.PI * 2);
        ctx.arc(iconCx + iconR * 0.25, iconCy - iconR * 0.05, iconR * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1a22";
        ctx.beginPath(); ctx.arc(iconCx - iconR * 0.25, iconCy - iconR * 0.05, iconR * 0.09, 0, Math.PI * 2);
        ctx.arc(iconCx + iconR * 0.25, iconCy - iconR * 0.05, iconR * 0.09, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawCardIcon(typeId, iconCx, iconCy, iconR, true);
      }
      // Nombre abajo, dentro de la tarjeta (más chico con 4 cols).
      ctx.fillStyle = def.color || "#fff";
      ctx.font = "bold " + Math.max(8, Math.min(11, cardW * 0.14)) + "px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var name = def.shortName || def.name;
      while (ctx.measureText(name).width > cardW - 6 && name.length > 4) {
        name = name.slice(0, -2);
      }
      ctx.fillText(name, cx + cardW / 2, cy + cardH - 10);
    }
    ctx.restore();

    // Detail panel
    var detailY = modalY + modalH - detailH - 10;
    var detailX = modalX + 10;
    var detailW = modalW - 20;
    ctx.fillStyle = "#1a1018";
    ctx.fillRect(detailX, detailY, detailW, detailH);
    ctx.fillStyle = "#33212e";
    ctx.fillRect(detailX, detailY, detailW, 2);

    var sel = state.compendiumSelected;
    if (!sel) {
      // Mensaje placeholder
      ctx.fillStyle = "rgba(255,255,255,0.50)";
      ctx.font = "italic 12px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Tocá una tarjeta arriba para ver detalles", detailX + detailW / 2, detailY + detailH / 2);
    } else {
      var def2 = compendiumGetDef(sel);
      var lore = compendiumGetLore(sel);
      var isGerm = !!ENEMY_DEFS[sel];
      // Nombre + sprite
      ctx.fillStyle = def2.color || "#fff";
      ctx.font = "bold 16px Fredoka, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(def2.name || sel, detailX + 60, detailY + 10);
      // Sprite icon
      if (isGerm) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(detailX + 8, detailY + 8, 44, 44);
        ctx.clip();
        drawTooltipSprite(def2, detailX + 30, detailY + 30, 14);
        ctx.restore();
      } else if (sel === "macrofagoLibre") {
        ctx.fillStyle = def2.color;
        ctx.beginPath();
        ctx.arc(detailX + 30, detailY + 30, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = def2.colorDark; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Fredoka, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("M", detailX + 30, detailY + 31);
      } else {
        drawCardIcon(sel, detailX + 30, detailY + 30, 16, true);
      }
      // Costo + stats
      var lvl2 = (def2.levels && def2.levels[0]) || {};
      var line2 = "";
      if (def2.free) {
        line2 = "Gratis (autónomo)";
      } else if (def2.cost != null) {
        line2 = (def2.currency === "complement" ? "🧬 C3b: " : "⚡ ATP: ") + def2.cost;
      }
      ctx.fillStyle = (def2.currency === "complement") ? "#7CFC9E" : "#f5d76e";
      ctx.font = "bold 11px Fredoka, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(line2, detailX + 60, detailY + 32);
      // Stats / hp / vel
      var sparts = [];
      if (isGerm) {
        if (def2.hp != null) sparts.push("HP " + def2.hp);
        if (def2.speedMult != null) sparts.push("Vel ×" + def2.speedMult.toFixed(1));
        if (def2.reward != null) sparts.push("+" + def2.reward + " ATP");
        if (def2.attack != null) sparts.push("Atq " + def2.attack);
        if (def2.shield) sparts.push("Escudo " + def2.shield.type + " (" + def2.shield.maxHP + ")");
      } else {
        if (lvl2.damage != null && lvl2.damage > 0) sparts.push("Daño " + lvl2.damage);
        if (lvl2.range != null && lvl2.range > 0) sparts.push("Alc " + Math.round(lvl2.range));
        if (lvl2.fireRate != null) sparts.push((lvl2.fireRate).toFixed(1) + "/s");
        if (lvl2.splash != null && lvl2.splash > 0) sparts.push("AOE " + Math.round(lvl2.splash));
        if (lvl2.hp != null && lvl2.hp > 0) sparts.push("HP " + lvl2.hp);
      }
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "10px Fredoka, sans-serif";
      var sLines = wrapText(sparts.join("  ·  "), detailW - 16, 10);
      for (var sli = 0; sli < Math.min(2, sLines.length); sli++) {
        ctx.fillText(sLines[sli], detailX + 10, detailY + 60 + sli * 14);
      }

      // Descripción
      var descY = detailY + 92;
      if (def2.desc || def2.tooltip) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "11px Fredoka, sans-serif";
        var descTxt = def2.tooltip || def2.desc || "";
        var descLines = wrapText(descTxt, detailW - 16, 11);
        for (var dli = 0; dli < Math.min(3, descLines.length); dli++) {
          ctx.fillText(descLines[dli], detailX + 10, descY + dli * 14);
        }
        descY += Math.min(3, descLines.length) * 14 + 6;
      }

      // Strong / Weak / Sinergias / Potencia / Mejor medio / Afinidad
      if (lore) {
        var labelW = 78;        // ancho reservado para la etiqueta
        var lineH = 13;         // alto de línea compacto
        function drawLoreRow(emoji, label, labelColor, valueText) {
          if (!valueText) return;
          ctx.fillStyle = labelColor;
          ctx.font = "bold 10px Fredoka, sans-serif";
          ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText(emoji + " " + label, detailX + 10, descY);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = "10px Fredoka, sans-serif";
          var vw = wrapText(valueText, detailW - labelW - 8, 10);
          var n = Math.min(2, vw.length);
          for (var vi = 0; vi < n; vi++) {
            ctx.fillText(vw[vi], detailX + labelW, descY + vi * lineH);
          }
          descY += Math.max(lineH, n * lineH) + 2;
        }
        drawLoreRow("⚔", "Fuerte:", "#5ad15a", lore.strong);
        drawLoreRow("🛡", "Débil:",  "#d9534f", lore.weak);
        drawLoreRow("⚡", "Sinergia:", "#ffd24a", compendiumNamesOf(lore.synergyWith));
        drawLoreRow("✨", "Potencia:", "#b6ff3a", compendiumNamesOf(lore.potentiates));
        drawLoreRow("🌍", "Mejor en:", "#8ec5d0", compendiumMediumLabels(lore.bestIn));
        drawLoreRow("🧬", "Afinidad:", "#c0a0e0", lore.affinity);
      }
    }

    ctx.restore();
  }
  // ============ FIN COMPENDIO ============

  // ============ PATTERNS BIOLÓGICOS POR ÓRGANO ============
  // Cacheados en OffscreenCanvas para reutilizar en barrera + puerta.
  // Generados lazy la primera vez que se piden.
  var ORGAN_PATTERN_CACHE = {};
  var TISSUE_LABEL = {
    corazon:      "pericardio",
    pulmon:       "pleura",
    sangre:       "endotelio vascular",
    hueso:        "periostio",
    articulacion: "cápsula sinovial"
  };

  function createPatternCanvas(w, h) {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  function paintCorazonPattern(pctx) {
    // Miocardio: fondo rojo oscuro + líneas paralelas claras (fibras estriadas).
    pctx.fillStyle = "#7a2543"; pctx.fillRect(0, 0, 64, 64);
    pctx.strokeStyle = "rgba(255,180,170,0.30)"; pctx.lineWidth = 0.8;
    pctx.save();
    pctx.rotate(0.35); // ~20° en radianes
    for (var y = -10; y < 80; y += 4) {
      pctx.beginPath(); pctx.moveTo(-10, y); pctx.lineTo(80, y); pctx.stroke();
    }
    pctx.restore();
  }

  function paintPulmonPattern(pctx) {
    // Alvéolos: rosado oscuro + burbujas claras dispersas.
    pctx.fillStyle = "#a36272"; pctx.fillRect(0, 0, 64, 64);
    pctx.fillStyle = "rgba(255,210,220,0.50)";
    var spots = [[8,8,4],[26,18,5],[44,10,3.5],[58,28,4],[14,32,3],[36,40,5],[52,50,4],[10,54,3.5],[26,56,3],[42,58,4]];
    for (var i = 0; i < spots.length; i++) {
      pctx.beginPath(); pctx.arc(spots[i][0], spots[i][1], spots[i][2], 0, Math.PI*2); pctx.fill();
    }
  }

  function paintSangrePattern(pctx) {
    // Eritrocitos bicóncavos.
    pctx.fillStyle = "#7a1a1f"; pctx.fillRect(0, 0, 64, 64);
    var cells = [[10,10],[34,8],[52,18],[18,28],[42,32],[58,42],[12,46],[32,50],[50,58]];
    for (var i = 0; i < cells.length; i++) {
      var cx = cells[i][0], cy = cells[i][1];
      pctx.fillStyle = "#c02a30";
      pctx.beginPath(); pctx.ellipse(cx, cy, 4, 3, 0, 0, Math.PI*2); pctx.fill();
      pctx.fillStyle = "#5a0d10";
      pctx.beginPath(); pctx.ellipse(cx, cy, 1.6, 1.2, 0, 0, Math.PI*2); pctx.fill();
    }
  }

  function paintHuesoPattern(pctx) {
    // Trabéculas: marrón claro + red de líneas blancas.
    pctx.fillStyle = "#8a7548"; pctx.fillRect(0, 0, 64, 64);
    pctx.strokeStyle = "rgba(245,230,180,0.55)"; pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.moveTo(0, 0); pctx.lineTo(64, 64);
    pctx.moveTo(64, 0); pctx.lineTo(0, 64);
    pctx.moveTo(32, 0); pctx.lineTo(32, 64);
    pctx.moveTo(0, 32); pctx.lineTo(64, 32);
    pctx.stroke();
    pctx.fillStyle = "rgba(20,10,4,0.5)";
    pctx.beginPath(); pctx.arc(32, 32, 1.8, 0, Math.PI*2); pctx.fill();
  }

  function paintArticulacionPattern(pctx) {
    // Cartílago hialino: azul-verde liso con líneas onduladas finas.
    pctx.fillStyle = "#4c7f8a"; pctx.fillRect(0, 0, 64, 64);
    pctx.strokeStyle = "rgba(220,240,250,0.30)"; pctx.lineWidth = 1;
    for (var y = 4; y < 64; y += 16) {
      pctx.beginPath();
      pctx.moveTo(0, y);
      for (var x = 4; x <= 64; x += 8) {
        pctx.quadraticCurveTo(x - 4, y - 4, x, y);
      }
      pctx.stroke();
    }
  }

  function getOrganPattern(organId) {
    if (ORGAN_PATTERN_CACHE[organId]) return ORGAN_PATTERN_CACHE[organId];
    var canvas = createPatternCanvas(64, 64);
    var pctx = canvas.getContext("2d");
    switch (organId) {
      case "corazon":      paintCorazonPattern(pctx);      break;
      case "pulmon":       paintPulmonPattern(pctx);       break;
      case "sangre":       paintSangrePattern(pctx);       break;
      case "hueso":        paintHuesoPattern(pctx);        break;
      case "articulacion": paintArticulacionPattern(pctx); break;
      default: pctx.fillStyle = "#444"; pctx.fillRect(0, 0, 64, 64);
    }
    var pat = ctx.createPattern(canvas, "repeat");
    ORGAN_PATTERN_CACHE[organId] = pat;
    return pat;
  }

  function organIdSeed(id) {
    var s = 0;
    for (var i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(s);
  }
  // ============ FIN PATTERNS BIOLÓGICOS ============

  // ============ SISTEMA DE ANTÍGENOS ============
  // Cada germen muerto en diseminación suelta 1 antígeno tappeable.
  // El jugador los recoge para gastarlos en Respuestas Inmunes.

  var ANTIGEN_TTL = 10.0;
  var ANTIGEN_RADIUS = 9.6;  // multiplicado por U (20% más que el tamaño original)

  function spawnAntigenDrop(x, y) {
    if (!state.dissemination) return;
    if (!state.antigens) state.antigens = { count: 0, drops: [] };
    state.antigens.drops.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 24 * U,
      vy: -36 * U,
      age: 0,
      ttl: ANTIGEN_TTL,
      collecting: false,
      collectT: 0
    });
  }

  function updateAntigenDrops(dt) {
    if (!state.antigens) return;
    var drops = state.antigens.drops;
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.age += dt;

      if (d.collecting) {
        d.collectT += dt;
        var t = Math.min(1, d.collectT / 0.4);
        d.x += (FIELD_LEFT + 30 * U - d.x) * t * 0.25;
        d.y += (FIELD_TOP + 30 * U - d.y) * t * 0.25;
        if (d.collectT >= 0.4) {
          state.antigens.count += 1;
          drops.splice(i, 1);
        }
        continue;
      }

      // Flotan hacia arriba: ligera aceleración ascendente continua + fricción.
      d.vy -= 8 * U * dt;
      d.vy *= (1 - 0.4 * dt);
      d.vx *= (1 - 1.2 * dt);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      // Clamp suave si llegan al borde superior (poco probable antes del TTL).
      if (d.y < FIELD_TOP + 4 * U) {
        d.y = FIELD_TOP + 4 * U;
        d.vy = 0;
      }

      if (d.age >= d.ttl) {
        d.collecting = true;
        d.collectT = 0;
      }
    }
  }

  function drawAntigenDrops() {
    if (!state.antigens) return;
    var drops = state.antigens.drops;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 6 + i);
      ctx.save();
      ctx.fillStyle = "rgba(255, 210, 74, " + (0.25 + pulse * 0.20) + ")";
      ctx.beginPath();
      ctx.arc(d.x, d.y, ANTIGEN_RADIUS * U * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd24a";
      ctx.strokeStyle = "#8a6020";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, ANTIGEN_RADIUS * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a3a08";
      ctx.font = "bold " + Math.floor(11 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", d.x, d.y);
      ctx.restore();
    }
  }

  function drawAntigenHud() {
    if (!state.dissemination || !state.antigens) return;
    // Layout VERTICAL: columna en la esquina superior izquierda con el
    // ícono arriba, el número grande en el medio, y la etiqueta abajo.
    var w = 44 * U, h = 78 * U;
    var x = FIELD_LEFT + 8 * U;
    var y = FIELD_TOP + 60 * U;
    ctx.save();
    // Contenedor
    ctx.fillStyle = "rgba(30, 15, 20, 0.85)";
    ctx.strokeStyle = "#ffd24a";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    // Ícono "★" arriba con halo sutil
    ctx.fillStyle = "rgba(255, 210, 74, 0.30)";
    ctx.beginPath(); ctx.arc(x + w / 2, y + 14 * U, 11 * U, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd24a";
    ctx.font = "bold " + Math.floor(15 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("★", x + w / 2, y + 14 * U);
    // Número de antígenos en el medio (grande)
    ctx.fillStyle = "#ffd24a";
    ctx.font = "bold " + Math.floor(20 * U) + "px Fredoka, sans-serif";
    ctx.fillText(state.antigens.count, x + w / 2, y + 38 * U);
    // Etiqueta vertical pequeña abajo
    ctx.fillStyle = "rgba(255, 210, 74, 0.85)";
    ctx.font = "bold " + Math.floor(8 * U) + "px Fredoka, sans-serif";
    ctx.fillText("ANTÍ-", x + w / 2, y + 58 * U);
    ctx.fillText("GENOS", x + w / 2, y + 68 * U);
    ctx.restore();
  }

  function tryTapAntigen(x, y) {
    if (!state.antigens) return false;
    var drops = state.antigens.drops;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.collecting) continue;
      var dx = x - d.x, dy = y - d.y;
      if (dx*dx + dy*dy <= (ANTIGEN_RADIUS * U * 1.8) * (ANTIGEN_RADIUS * U * 1.8)) {
        d.collecting = true;
        d.collectT = 0;
        return true;
      }
    }
    return false;
  }
  // ============ FIN ANTÍGENOS ============

  // ============ RESPUESTAS INMUNES (panel inferior nuevo) ============
  var RESPONSE_DEFS = {
    dendritica: { cost: 4, color: "#a872d8", label: "Dendrítica",  icon: "▼T", auto: true  },
    netosis:    { cost: 3, color: "#f0a050", label: "NETosis",     icon: "◈",  auto: false },
    plaquetas:  { cost: 5, color: "#e8a020", label: "Plaquetas",   icon: "●●", auto: false }
  };
  var RESPONSE_ORDER = ["dendritica", "netosis", "plaquetas"];

  function drawImmuneResponsePanel() {
    if (!state.dissemination || !UI.responsePanel) return;
    var rp = UI.responsePanel;
    var cardH = rp.cardH;
    var gap = rp.gap;
    var pad = rp.pad;
    var cardW = rp.w - 2 * pad;
    var cardX = rp.x + pad;
    ctx.save();
    // Contenedor plano sin borde.
    ctx.fillStyle = "rgba(30, 15, 20, 0.85)";
    ctx.fillRect(rp.x, rp.y, rp.w, rp.h);

    UI.responseCards = [];
    for (var i = 0; i < RESPONSE_ORDER.length; i++) {
      var key = RESPONSE_ORDER[i];
      var def = RESPONSE_DEFS[key];
      var cy = rp.y + pad + i * (cardH + gap);
      var cx = cardX;
      var canAfford = (state.antigens && state.antigens.count >= def.cost);
      var armed = (state.armedResponse === key);

      UI.responseCards.push({ key: key, x: cx, y: cy, w: cardW, h: cardH });

      ctx.globalAlpha = canAfford ? 1 : 0.4;
      ctx.fillStyle = armed ? colorAlpha(def.color, 0.30) : "rgba(20, 10, 14, 0.85)";
      ctx.fillRect(cx, cy, cardW, cardH);
      // Borde solo si está armada (feedback). Sin borde en estado normal.
      if (armed) {
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cardW, cardH);
      }

      // Ícono como glifo de texto (sin círculo de fondo que se lea como "globo
      // de diálogo"). Se queda dentro del rectángulo limpio.
      var textX = cx + 10 * U;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      // Línea superior: ícono + label en el color del poder
      ctx.fillStyle = def.color;
      ctx.font = "bold " + Math.floor(13 * U) + "px Fredoka, sans-serif";
      ctx.fillText(def.icon + "  " + def.label, textX, cy + cardH * 0.35);
      // Línea inferior: costo en antígenos
      ctx.fillStyle = "#ffd24a";
      ctx.font = "bold " + Math.floor(12 * U) + "px Fredoka, sans-serif";
      ctx.fillText("★ " + def.cost, textX, cy + cardH * 0.72);

      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // ============ FIN RESPUESTAS (sub-task 5.1) ============

  function spawnDendriticStain() {
    if (!state.dendriticStains) state.dendriticStains = [];
    // Centroide aproximado de los gérmenes vivos para que la mancha caiga
    // donde está la presión inmune; si no hay, centro del campo.
    var cx = FIELD_LEFT + FIELD_W * 0.5, cy = FIELD_TOP + FIELD_H * 0.5, n = 0;
    for (var ei = 0; ei < state.enemies.length; ei++) {
      var en = state.enemies[ei];
      if (en.dead) continue;
      if (n === 0) { cx = en.x; cy = en.y; }
      else { cx = (cx * n + en.x) / (n + 1); cy = (cy * n + en.y) / (n + 1); }
      n++;
    }
    // Generar polígono irregular (mancha orgánica).
    var nVerts = 18;
    var baseR = 60 * U;
    var seed = Math.random() * 1000;
    var pts = [];
    for (var i = 0; i < nVerts; i++) {
      var ang = (i / nVerts) * Math.PI * 2;
      var rr = baseR * (0.75 + 0.32 * Math.sin(ang * 3 + seed) + 0.15 * Math.sin(ang * 5 - seed * 0.7));
      pts.push({ a: ang, r: rr });
    }
    state.dendriticStains.push({
      x: cx, y: cy,
      pts: pts,
      baseR: baseR,
      ttl: 16.0,
      age: 0,
      dmgInterval: 1.0,
      lastTick: 0,
      damagePerTick: 6
    });
  }

  function updateDendriticStains(dt) {
    if (!state.dendriticStains) return;
    for (var i = state.dendriticStains.length - 1; i >= 0; i--) {
      var s = state.dendriticStains[i];
      s.age += dt;
      // Tick de daño cada 1s a todos los gérmenes dentro del radio efectivo.
      if (s.age - s.lastTick >= s.dmgInterval) {
        s.lastTick = s.age;
        for (var ei = 0; ei < state.enemies.length; ei++) {
          var en = state.enemies[ei];
          if (en.dead) continue;
          var dx = en.x - s.x, dy = en.y - s.y;
          if (dx * dx + dy * dy <= s.baseR * s.baseR) {
            en.hp = (en.hp || 1) - s.damagePerTick;
            if (en.hp <= 0 && !en.dead) {
              if (!en.antigenSpawned) {
                spawnAntigenDrop(en.x, en.y);
                en.antigenSpawned = true;
              }
              en.dead = true;
            }
          }
        }
      }
      if (s.age >= s.ttl) state.dendriticStains.splice(i, 1);
    }
  }

  function drawDendriticStains() {
    if (!state.dendriticStains) return;
    for (var i = 0; i < state.dendriticStains.length; i++) {
      var s = state.dendriticStains[i];
      var fadeIn = Math.min(1, s.age / 0.4);
      var fadeOut = s.age > s.ttl - 1 ? Math.max(0, 1 - (s.age - (s.ttl - 1))) : 1;
      var alpha = fadeIn * fadeOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Halo radial púrpura
      var grd = ctx.createRadialGradient(s.x, s.y, s.baseR * 0.25, s.x, s.y, s.baseR * 1.15);
      grd.addColorStop(0, "rgba(168, 114, 216, 0.50)");
      grd.addColorStop(0.65, "rgba(168, 114, 216, 0.22)");
      grd.addColorStop(1, "rgba(168, 114, 216, 0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.baseR * 1.15, 0, Math.PI * 2);
      ctx.fill();
      // Mancha irregular (polígono con wobble)
      ctx.fillStyle = "rgba(157, 92, 208, 0.55)";
      ctx.strokeStyle = "rgba(106, 56, 168, 0.90)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var p = 0; p < s.pts.length; p++) {
        var pt = s.pts[p];
        var wob = 1 + 0.07 * Math.sin(p * 0.7 + s.age * 1.5);
        var rr = pt.r * wob;
        var px = s.x + Math.cos(pt.a) * rr;
        var py = s.y + Math.sin(pt.a) * rr;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Pulso de daño visible al tick (~150ms post-tick)
      var sinceTick = s.age - s.lastTick;
      if (sinceTick < 0.18) {
        var k = 1 - sinceTick / 0.18;
        ctx.strokeStyle = "rgba(220, 180, 255, " + (k * 0.7) + ")";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.baseR * (0.85 + (1 - k) * 0.25), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function spawnNet(laneX, laneY) {
    state.nets.push({
      x: laneX, y: laneY,
      radius: 42 * U,
      ttl: 8.0,
      age: 0,
      damagePerSec: 4,
      lastDmgTick: 0
    });
  }

  function updateNets(dt) {
    if (!state.nets) return;
    for (var i = state.nets.length - 1; i >= 0; i--) {
      var n = state.nets[i];
      n.age += dt;
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.dead) continue;
        var dx = en.x - n.x, dy = en.y - n.y;
        if (dx*dx + dy*dy <= n.radius * n.radius) {
          en.nettedUntil = state.time + 0.2;
          en.hp = (en.hp || 1) - n.damagePerSec * dt;
          if (en.hp <= 0 && !en.dead) {
            if (!en.antigenSpawned) {
              spawnAntigenDrop(en.x, en.y);
              en.antigenSpawned = true;
            }
            en.dead = true;
          }
        }
      }
      if (n.age >= n.ttl) state.nets.splice(i, 1);
    }
  }

  function drawNets() {
    if (!state.nets) return;
    for (var i = 0; i < state.nets.length; i++) {
      var n = state.nets[i];
      var fadeIn = Math.min(1, n.age / 0.3);
      var fadeOut = n.age > n.ttl - 1 ? Math.max(0, 1 - (n.age - (n.ttl - 1))) : 1;
      var alpha = fadeIn * fadeOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(255, 220, 180, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.stroke();
      for (var li = 0; li < 8; li++) {
        var a = (li / 8) * Math.PI * 2 + n.age * 0.5;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n.x + Math.cos(a) * n.radius, n.y + Math.sin(a) * n.radius);
        ctx.stroke();
      }
      ctx.beginPath();
      for (var t = 0; t <= Math.PI * 2; t += 0.2) {
        var r = n.radius * 0.5 * (1 + 0.4 * Math.sin(t * 4));
        var x = n.x + Math.cos(t) * r, y = n.y + Math.sin(t) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function spawnThrombus(laneX, laneY) {
    state.thrombi.push({
      x: laneX, y: laneY,
      radius: 46 * U,
      ttl: 18.0,
      age: 0,
      damagePerSec: 8
    });
  }

  function updateThrombi(dt) {
    if (!state.thrombi) return;
    for (var i = state.thrombi.length - 1; i >= 0; i--) {
      var th = state.thrombi[i];
      th.age += dt;
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.dead) continue;
        var dx = en.x - th.x, dy = en.y - th.y;
        if (dx*dx + dy*dy <= th.radius * th.radius) {
          en.thrombusUntil = state.time + 0.2;
          en.hp = (en.hp || 1) - th.damagePerSec * dt;
          if (en.hp <= 0 && !en.dead) {
            if (!en.antigenSpawned) {
              spawnAntigenDrop(en.x, en.y);
              en.antigenSpawned = true;
            }
            en.dead = true;
          }
        }
      }
      if (th.age >= th.ttl) state.thrombi.splice(i, 1);
    }
  }

  function drawThrombi() {
    if (!state.thrombi) return;
    for (var i = 0; i < state.thrombi.length; i++) {
      var th = state.thrombi[i];
      var fadeIn = Math.min(1, th.age / 0.3);
      var fadeOut = th.age > th.ttl - 1 ? Math.max(0, 1 - (th.age - (th.ttl - 1))) : 1;
      var alpha = fadeIn * fadeOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      ctx.strokeStyle = "rgba(232, 160, 32, " + (0.6 + pulse * 0.3) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(th.x, th.y, th.radius + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(160, 32, 48, 0.65)";
      ctx.beginPath();
      ctx.ellipse(th.x, th.y, th.radius * 0.6, th.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      var plats = [[-15,-8],[12,-12],[18,6],[-8,12],[-22,4]];
      ctx.fillStyle = "#e8a020";
      ctx.strokeStyle = "#8a5010";
      ctx.lineWidth = 1;
      for (var pi = 0; pi < plats.length; pi++) {
        ctx.beginPath();
        ctx.arc(th.x + plats[pi][0] * U, th.y + plats[pi][1] * U, 4 * U, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function hasResponseInLane(lane, type) {
    var arr = (type === "net") ? state.nets : state.thrombi;
    if (!arr || !PATH.organDoors || !PATH.organDoors[lane]) return false;
    var laneX = PATH.organDoors[lane].x;
    for (var i = 0; i < arr.length; i++) {
      if (Math.abs(arr[i].x - laneX) < (FIELD_W / 5) * 0.45) return true;
    }
    return false;
  }

  function hasResponseInLaneAny(lane) {
    return hasResponseInLane(lane, "net") || hasResponseInLane(lane, "thrombus");
  }

  function laneAt(x) {
    var rel = (x - FIELD_LEFT) / FIELD_W;
    var idx = Math.floor(rel * 5);
    return Math.max(0, Math.min(4, idx));
  }

  // ============ NIVEL PUENTE: DISEMINACIÓN ============
  // 5 carriles paralelos estilo PvZ. Tras vencer al boss MRSA (ola 18), la
  // infección rompió la barrera cutánea y busca órgano blanco. El jugador
  // defiende; el primer germen que cruza una puerta define el escenario de
  // Fase 2. Diseñado para que el ATP/slots NO alcancen los 5 carriles.
  var DISSEMINATION_ORGANS = [
    { id: "corazon",      label: "CORAZÓN",      scenario: "Endocarditis",       color: "#c1416a", tint: "rgba(193, 65, 106, 0.10)" },
    { id: "pulmon",       label: "PULMÓN",       scenario: "Émbolos sépticos",   color: "#e8a3b3", tint: "rgba(232, 163, 179, 0.10)" },
    { id: "sangre",       label: "SANGRE",       scenario: "Sepsis",             color: "#b8232a", tint: "rgba(184, 35, 42, 0.10)" },
    { id: "hueso",        label: "HUESO",        scenario: "Osteomielitis",      color: "#d8c89a", tint: "rgba(216, 200, 154, 0.10)" },
    { id: "articulacion", label: "ARTICULACIÓN", scenario: "Artritis séptica",   color: "#8ec5d0", tint: "rgba(142, 197, 208, 0.10)" }
  ];

  // 3 oleadas in crescendo. La curva es gradual: la primera deja margen
  // para construir defensa; la última es avalancha. Velocidad ya está al
  // 50% (ver pxSpeed en updateEnemies).
  var DISSEMINATION_WAVE_TABLE = [
    // Wave 1: presentación tranquila — pocos gérmenes, mucha separación,
    // para que el jugador construya su defensa y entienda los carriles.
    [["saureus",2,2.20],["pseudomonas",1,2.40],["candida",1,2.20]],
    // Wave 2: presión media — más volumen, primer boss MRSA al final.
    [["saureus",4,1.50],["pseudomonas",2,1.70],["candida",2,1.60],["bossMRSA",1,0]],
    // Wave 3: avalancha — bosses dobles, intervalos cortos, aglomeración
    // sostenida para defender los 5 carriles a la vez.
    [["saureus",10,0.90],["pseudomonas",5,1.10],["candida",4,1.20],["bossMRSA",2,3.0],["bossPyogenes",1,4.0]]
  ];

  // Pesos de afinidad germen → carril [corazón, pulmón, sangre, hueso, articulación].
  // Refleja la clínica: S. aureus → corazón/hueso/articulación; pyogenes → pulmón/sangre; etc.
  var GERM_AFFINITY = {
    saureus:         [3, 2, 2, 3, 3],
    bossMRSA:        [3, 2, 3, 2, 2],
    pyogenes:        [1, 3, 3, 1, 1],
    bossPyogenes:    [1, 3, 3, 1, 1],
    pseudomonas:     [1, 3, 2, 2, 1],
    bossPseudomonas: [1, 3, 2, 2, 1],
    sepidermidis:    [3, 1, 1, 1, 1],
    candida:         [2, 2, 2, 1, 1]
  };
  function pickDisseminationLane(typeId) {
    var weights = GERM_AFFINITY[typeId] || [1, 1, 1, 1, 1];
    var total = 0;
    for (var i = 0; i < weights.length; i++) total += weights[i];
    var r = Math.random() * total;
    for (var j = 0; j < weights.length; j++) {
      r -= weights[j];
      if (r <= 0) return j;
    }
    return 0;
  }
  // ============ FIN NIVEL PUENTE ============

  function getWaveDef(waveNum) {
    var diffHp = 1 + (waveNum - 1) * 0.05;
    var diffSpeed = 1 + (waveNum - 1) * 0.04;
    var entry = WAVE_TABLE[waveNum];
    if (!entry) {
      // Post-table: scale up the tier 17 mix and rotate boss types every 6 waves.
      var base17 = WAVE_TABLE[17];
      entry = base17.map(function (g) { return [g[0], g[1] + Math.floor((waveNum - 17) / 2), g[2]]; });
      var bossPool = ["bossPyogenes", "bossPseudomonas", "bossClostridium", "bossMRSA"];
      if (waveNum % 6 === 0) {
        entry = entry.concat([[bossPool[(waveNum / 6) % bossPool.length], 1, 0]]);
      }
    }
    var groups = entry.map(function (g) { return { type: g[0], count: g[1], interval: g[2] }; });
    var bossKey = null;
    for (var i = 0; i < groups.length; i++) {
      var d = ENEMY_DEFS[groups[i].type];
      if (d && d.isBoss) { bossKey = groups[i].type; break; }
    }
    return {
      groups: groups,
      hpMult: diffHp,
      speedMult: diffSpeed,
      isBossWave: !!bossKey,
      bossKey: bossKey
    };
  }

  var META = {
    totalPathogensDefeated: 0,
    totalPathogensInfiltrated: 0,
    wavesReached: 1
  };
  function loadMeta() {
    try {
      var raw = localStorage.getItem("immunodefense_meta");
      if (raw) {
        var p = JSON.parse(raw);
        META.totalPathogensDefeated = parseInt(p.totalPathogensDefeated) || 0;
        META.totalPathogensInfiltrated = parseInt(p.totalPathogensInfiltrated) || 0;
        META.wavesReached = Math.max(1, parseInt(p.wavesReached) || 1);
      }
    } catch (e) {}
  }
  function saveMeta() {
    try {
      localStorage.setItem("immunodefense_meta", JSON.stringify(META));
    } catch (e) {}
  }
  loadMeta();

  function newState() {
    return {
      atp: getInitialAtp(),
      // Kept-named legacy fields drive the same code paths.
      currentLevel: 1,
      viralLoad: 0,
      viralThreshold: INFESTACION_THRESHOLD,
      pathogensReached: 0,
      pathogensDefeated: 0,
      waveIdx: 0,
      waveActive: false,
      pendingSpawns: [],
      spawnElapsed: 0,
      towers: [],
      enemies: [],
      germShots: [],
      guardians: [],
      guardianTimer: 28,
      slicks: [],                       // charcos aceitosos de Malassezia
      complement: 0,                    // fragmentos de complemento recogidos
      fragments: [],                    // fragmentos C3b flotando en el campo
      cannonShots: [],                  // disparos del cañón MAC (en vuelo, arco)
      acidSplats: [],                   // charcos de ácido del cañón MAC
      seekers: [],                      // esporas buscadoras (Pseudomonas)
      necroticPatches: [],              // parches necróticos de bossPyogenes
      medCharge: 0,
      medApplying: false,
      topicalCharge: 0,
      acidTimer: 0,
      gasFx: null,
      secondEntryOpen: false,
      surgeAnnounced: false,
      projectiles: [],
      effects: [],
      damageNumbers: [],
      goldParticles: [],
      ambient: [],
      circulatory: [],
      selectedToBuild: null,
      openGroups: { linea: true, distancia: true }, // grupos abiertos por defecto
      unlockedTowers: ["neutrofilo", "linfocitoB", "linfocitoT"], // resto se desbloquea con pickups
      unlockPickups: [],                // píldoras flotantes en el campo
      medulaOsea: null,                 // posición de la médula ósea (se setea en layoutUI)
      unlockScheduleNotified: {},       // qué waves ya emitieron su pickup
      compendiumOpen: false,            // overlay del compendio
      compendiumFocus: null,            // typeId destacado (al desbloquear)
      compendiumScroll: 0,              // scroll vertical en el modal
      selectedTower: null,
      pointer: { x: 0, y: 0, isOver: false },
      lastPlaceFailedAt: -10,
      msg: "",
      msgTimer: 0,
      gameOver: false,
      victory: false,
      time: 0,
      confirmRestart: false,
      shakeTimer: 0,
      shakeMag: 0,
      waveBannerTimer: 0,
      waveBannerText: "",
      rangeHint: null,
      kills: 0,
      endRevealTimer: 0,
      endMusicSwitched: false,
      drip: {
        nextDropAt: getInitialDripDelay(),
        drop: null
      },
      lymph: {
        nextDropAt: getInitialDripDelay(),
        drop: null
      },
      vesselFlashTimer: 0,
      vesselSwallow: 0,
      woundFlashTimer: 0,
      levelTransition: false,
      finalScreen: false,
      transitionTimer: 0,
      // Nivel puente "Diseminación" (5 carriles, post ola 18).
      dissemination: false,
      disseminationWaveIdx: 0,         // 0..2 dentro del puente
      disseminationOver: null,         // { germ, organ } cuando un órgano llena
      disseminationIntroTimer: 0,      // banner de entrada al puente
      disseminationOrganLoad: [0,0,0,0,0],   // 0..10 por órgano (cada germen +1)
      disseminationFlash: [0,0,0,0,0],       // brillo de impacto al recibir germen
      disseminationBarrierHP:     [0, 0, 0, 0, 0],
      disseminationBarrierMax:    [0, 0, 0, 0, 0],
      disseminationBarrierBroken: [false, false, false, false, false],
      disseminationBarrierBreakAt: 0,
      disseminationBarrierBreakLane: -1,
      tissue: null,
      mitosis: null,
      nextMitosisAt: 12,
      patrol: [],
      restos: [],
      collectors: [],
      barricada: null,
      nextBarricadaAt: 10 + Math.random() * 6,
      // Sprint 5 fields:
      nextWaveAt: 5,                    // countdown to first wave
      waveCountdownActive: true,        // showing "PRÓXIMA OLEADA EN Ns"
      nextIntermediateAt: 4 + Math.random() * 3,  // intermediate stragglers
      cinematicEnd: null,               // when infestacion >= 100, becomes object
      pathInflammation: [],             // marks where enemies recently passed
      bossActive: null,                 // ref to current boss enemy (if alive)
      showTitle: true,                  // pantalla de título del juego
      showIntro: true,                  // cómic introductorio (tras el título)
      introScene: 0,
      introT: 0,
      panelScroll: 0,                   // horizontal scroll offset (Sprint 8B-3B)
      panelDragPending: null,           // tap-vs-drag tracker
      inflammation: null,                // active inflammation pulse
      nextInflammationAt: 8,             // first inflammation pulse
      activeTooltip: null,               // {defId, timer, isFirst}
      tooltipPauseSpawn: 0,              // seconds during which spawn shifts pause
      mrsaIntro: null,                   // {t, duration} during MRSA boss spawn
      vistos: null,                      // populated below from localStorage
      antigens: { count: 0, drops: [] },
      nets: [],
      thrombi: [],
      dendriticStains: [],
      armedResponse: null
    };
  }
  // ---- Pathogen "vistos" persistence (Sprint 6 tooltips) ----------------
  // _v3: nuevo bump de versión para limpiar colecciones residuales de
  // sesiones previas. El sistema actual solo suma a vistos cuando el
  // jugador TOQUEA un germen brillante; el álbum debe arrancar vacío.
  var VISTOS_KEY = "immunodefense_pathogens_seen_v3";
  function loadVistos() {
    var s = {};
    try {
      var raw = localStorage.getItem(VISTOS_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) for (var i = 0; i < arr.length; i++) s[arr[i]] = true;
      }
      // Limpia entradas viejas para no dejar basura en localStorage.
      try { localStorage.removeItem("immunodefense_pathogens_seen"); } catch (e2) {}
      try { localStorage.removeItem("immunodefense_pathogens_seen_v2"); } catch (e3) {}
    } catch (e) {}
    return s;
  }
  function saveVistos(map) {
    try {
      var arr = [];
      for (var k in map) if (map[k]) arr.push(k);
      localStorage.setItem(VISTOS_KEY, JSON.stringify(arr));
    } catch (e) {}
  }
  var firstTooltipShownThisSession = false;

  state = newState();
  state.vistos = loadVistos();
  // Dev hook: permite inspeccionar y mutar state desde DevTools en producción.
  // Es inofensivo — el código del juego ya es público (GitHub Pages + Vercel).
  window.__game = { get state() { return state; } };

  // Per-wave difficulty (replaces getDifficulty(level)). Speed also receives
  // an additional snowball multiplier from infestation in updateEnemies.
  function getDifficulty() {
    var w = Math.max(0, (state.waveIdx | 0) - 1);
    return { speed: 1.0 + w * 0.04, hp: 1.0 + w * 0.05 };
  }

  var MAX_EFFECTS = 80;
  var MAX_DAMAGE_NUMBERS = 20;
  function pushEffect(ef) {
    if (state.effects.length >= MAX_EFFECTS) state.effects.shift();
    state.effects.push(ef);
  }
  function pushDamageNumber(x, y, text, color) {
    if (state.damageNumbers.length >= MAX_DAMAGE_NUMBERS) state.damageNumbers.shift();
    state.damageNumbers.push({
      x: x, y: y, startY: y,
      text: text,
      color: color || "#FFD93D",
      life: 0.6, max: 0.6
    });
  }
  function setRangeHint(x, y, range, color, source) {
    state.rangeHint = {
      x: x, y: y, range: range,
      color: color || "rgba(255,255,255,1)",
      source: source || "build",
      time: state.time
    };
  }
  function clearRangeHint() { state.rangeHint = null; }

  // -------- UI RECTS (recomputed in layoutUI) ----------------------------
  var UI = {};
  function layoutUI() {
    var topY = safeTop + 8;
    var hudInner = HUD_H - safeTop - 16;
    var btnH = Math.min(40, Math.max(32, hudInner));
    var rightX = VW - safeRight - 8;

    UI.restartBtn = { x: rightX - btnH, y: topY, w: btnH, h: btnH };
    UI.muteBtn = { x: UI.restartBtn.x - btnH - 4, y: topY, w: btnH, h: btnH };
    // Next-wave button width: portrait keeps it tight so stats fit beside it.
    var nwMaxByStats = isPortrait
      ? VW - safeLeft - safeRight - btnH * 2 - 28 - 165
      : VW * 0.4;
    var nwW = Math.min(220, Math.max(110, nwMaxByStats));
    UI.nextWaveBtn = { x: UI.muteBtn.x - nwW - 8, y: topY, w: nwW, h: btnH };

    // Dock lateral derecho. UI.cards guarda posiciones en CONTENT-SPACE
    // vertical (contentY); el render aplica scroll vertical y clipping, y el
    // hit-test traduce con panelScroll. Con 3 cartas que caben, maxScroll=0.
    var dockLeft = FIELD_RIGHT;
    var dockPad = 8;
    var contentX = dockLeft + dockPad;
    var contentRight = VW - safeRight - dockPad;
    var contentW = Math.max(60, contentRight - contentX);
    var dockTop = FIELD_TOP + dockPad;
    var dockBottom = VH - safeBottom - dockPad;

    var cardGap = 8;
    var cardCount = TOWER_LIST.length;   // ahora 7 torres: cartilla desplegable
    var cardW = contentW;
    var dockH = dockBottom - dockTop;

    // Zona info/acciones anclada al fondo: tamaño por contenido (stats + 2
    // botones), nunca más de ~52% del dock para que las cartas tengan lugar.
    var btnH = Math.round(Math.max(32, Math.min(42, contentW * 0.36)));
    var infoH = Math.min(96 + btnH * 2, Math.round(dockH * 0.52));
    var infoY = dockBottom - infoH;

    // Panel de Respuestas Inmunes (solo en diseminación): 3 cartas verticales
    // en la parte BAJA del dock derecho, debajo del strip de torres y arriba del
    // bloque info/botones. Se calcula primero para reservarle espacio al strip.
    UI.responsePanel = null;
    var responsesReservedH = 0;
    if (state && state.dissemination) {
      var rpCardH = Math.round(40 * U);
      var rpGap = Math.round(6 * U);
      var rpPad = Math.round(6 * U);
      var rpInnerH = 3 * rpCardH + 2 * rpGap;
      var rpH = rpInnerH + 2 * rpPad;
      responsesReservedH = rpH + dockPad;
      UI.responsePanel = {
        x: contentX,
        y: infoY - dockPad - rpH,
        w: contentW,
        h: rpH,
        cardH: rpCardH,
        gap: rpGap,
        pad: rpPad
      };
    }

    // Botón "Compendio" arriba del dock — abre el overlay informativo.
    var compBtnH = Math.round(Math.max(28, Math.min(36, contentW * 0.34)));
    UI.compendiumBtn = { x: contentX, y: dockTop, w: contentW, h: compBtnH };

    // Cartilla por GRUPOS DESPLEGABLES: cada categoría (cabecera) se abre/cierra
    // de forma independiente. Sin abrir, solo se ven las cabeceras (no satura).
    var stripTop = dockTop + compBtnH + 6;
    var stripRegionH = Math.max(0, (infoY - dockPad - responsesReservedH) - stripTop);
    var headerH = 28, groupSpacing = 6;
    // Cartas compactas horizontales (ícono pequeño a la izquierda + texto a
    // la derecha). Antes eran tall cards con avatar circular arriba que daban
    // efecto "globo de diálogo" (cabeza redonda + cuerpo cuadrado).
    var cardH = Math.round(Math.max(48, Math.min(64, contentW * 0.42)));
    var openMap = (state && state.openGroups) ? state.openGroups : { linea: true };
    UI.cards = [];
    UI.groupHeaders = [];
    var cyc = 0;
    // Filtra solo torres desbloqueadas (las nuevas se añaden via pickups
    // de la médula ósea durante el juego). Las marcadas como
    // disseminationOnly NO aparecen en Fase 1 aunque estén en unlockedTowers.
    var unlocked = (state && state.unlockedTowers) || ["neutrofilo", "linfocitoB", "linfocitoT"];
    var inDiss = !!(state && state.dissemination);
    function isUnlocked(typeId) {
      if (unlocked.indexOf(typeId) === -1) return false;
      var d = TOWER_DEFS[typeId];
      if (d && d.disseminationOnly && !inDiss) return false;
      return true;
    }
    for (var gi = 0; gi < TOWER_GROUPS.length; gi++) {
      var grp = TOWER_GROUPS[gi];
      // Filtrar el grupo a las torres desbloqueadas. Si ninguna está
      // desbloqueada, saltamos el grupo entero (no aparece su header).
      var visibleTowers = grp.towers.filter(isUnlocked);
      if (visibleTowers.length === 0) continue;
      var gopen = !!openMap[grp.id];
      UI.groupHeaders.push({ id: grp.id, label: grp.label, open: gopen,
        count: visibleTowers.length, x: contentX, w: contentW, h: headerH, contentY: cyc });
      cyc += headerH;
      if (gopen) {
        cyc += cardGap;
        for (var ti = 0; ti < visibleTowers.length; ti++) {
          UI.cards.push({ typeId: visibleTowers[ti], x: contentX, w: cardW, h: cardH, contentY: cyc });
          cyc += cardH;
          if (ti < visibleTowers.length - 1) cyc += cardGap;
        }
      }
      cyc += groupSpacing;
    }
    var contentH = cyc;

    UI.cardStrip = {
      x: contentX, y: stripTop, w: cardW,
      h: Math.min(stripRegionH, contentH),
      contentH: contentH
    };

    UI.infoX = contentX;
    UI.infoY = infoY;
    UI.infoW = contentW;
    UI.infoH = infoH;

    // Botones apilados verticalmente, ancho completo del dock, al fondo.
    UI.upgradeBtn = { x: contentX, y: dockBottom - btnH, w: contentW, h: btnH };
    UI.sellBtn = { x: contentX, y: dockBottom - btnH * 2 - 8, w: contentW, h: btnH };
    var dsz = 22;
    UI.deselectBtn = { x: contentRight - dsz, y: infoY, w: dsz, h: dsz };

    // Clamp scroll vertical a los límites de contenido.
    var maxScroll = Math.max(0, UI.cardStrip.contentH - UI.cardStrip.h);
    if (state && typeof state.panelScroll === "number") {
      state.panelScroll = Math.max(0, Math.min(maxScroll, state.panelScroll));
    }

    var modalW = Math.min(340, VW - 32);
    var modalH = 180;
    UI.modal = { x: (VW - modalW) / 2, y: (VH - modalH) / 2, w: modalW, h: modalH };
    var btnsW = (modalW - 48) / 2;
    UI.modalYes = { x: UI.modal.x + 16, y: UI.modal.y + modalH - 56, w: btnsW, h: 40 };
    UI.modalNo  = { x: UI.modalYes.x + btnsW + 16, y: UI.modalYes.y, w: btnsW, h: 40 };

    UI.endRestartBtn = { x: VW / 2 - 90, y: VH / 2 + 30, w: 180, h: 50 };

    // Médula ósea: fija en la izquierda del campo, en zona hipodermis.
    // Lejos del path de los gérmenes para no interferir con la colocación.
    if (state) {
      state.medulaOsea = {
        x: FIELD_LEFT + Math.min(60 * U, FIELD_W * 0.10),
        y: FIELD_TOP + FIELD_H * 0.70
      };
    }
  }

  // -------- WAVES / SPAWN -------------------------------------------------
  function startNextWave() {
    if (state.waveActive || state.cinematicEnd || state.confirmRestart || state.showIntro) return;
    if (state.dissemination) { startNextDisseminationWave(); return; }
    state.waveIdx += 1;
    META.wavesReached = Math.max(META.wavesReached, state.waveIdx);
    saveMeta();
    // Schedule de desbloqueos: si esta ola corresponde a una torre nueva,
    // la médula ósea emite el pickup correspondiente.
    var unlockType = UNLOCK_SCHEDULE[state.waveIdx];
    if (unlockType && !state.unlockScheduleNotified[state.waveIdx]) {
      state.unlockScheduleNotified[state.waveIdx] = true;
      spawnUnlockPickup(unlockType);
    }
    var wave = getWaveDef(state.waveIdx);
    state.currentWaveDef = wave;
    state.waveActive = true;
    state.waveCountdownActive = false;
    state.spawnElapsed = 0;
    state.pendingSpawns = [];
    var t = 0;
    var surge = infestSurge();
    // Surge acelera la cadencia y multiplica la cantidad de gérmenes (>40%).
    var spawnMult = infestSpawnMult(state.viralLoad) * surge;
    for (var i = 0; i < wave.groups.length; i++) {
      var g = wave.groups[i];
      // Los jefes NO se multiplican; los regulares sí cargan más con el surge.
      var def0 = ENEMY_DEFS[g.type];
      var count = (def0 && def0.isBoss) ? g.count : Math.round(g.count * surge);
      for (var k = 0; k < count; k++) {
        state.pendingSpawns.push({ type: g.type, time: t, hpMult: wave.hpMult });
        // Jittered spawn cadence (0.5-1.3s base) divided by infestation rate.
        t += (0.5 + Math.random() * 0.8) / spawnMult;
      }
      t += 0.6 / spawnMult;
    }
    // Sin anuncio central del número de oleada — el HUD ya informa cuando
    // se viene una oleada con el contador "PRÓXIMA OLEADA EN Ns".
    state.waveBannerText = "";
    state.waveBannerTimer = 0;
    sfx("wave");
  }

  // ============ NIVEL PUENTE: TRANSICIÓN Y SCHEDULER ============
  // Al cerrar la ola 18 (boss MRSA), saltamos al campo de 5 carriles.
  // Reset con ATP base: no se heredan torres ni ATP de Fase 1.
  function enterDissemination() {
    state.dissemination = true;
    state.disseminationWaveIdx = 0;
    state.disseminationOver = null;
    state.disseminationIntroTimer = 4.0;
    state.disseminationOrganLoad = [0, 0, 0, 0, 0];
    state.disseminationFlash = [0, 0, 0, 0, 0];
    // HP biológico por órgano (orden = DISSEMINATION_ORGANS):
    // [corazón=pericardio, pulmón=pleura, sangre=endotelio, hueso=periostio, articulación=cápsula sinovial]
    state.disseminationBarrierMax    = [12, 8, 6, 10, 7];
    state.disseminationBarrierHP     = [12, 8, 6, 10, 7];
    state.disseminationBarrierBroken = [false, false, false, false, false];
    state.disseminationBarrierBreakAt = 0;
    state.disseminationBarrierBreakLane = -1;
    state.antigens = { count: 0, drops: [] };
    state.nets = [];
    state.thrombi = [];
    state.dendriticStains = [];
    state.necroticPatches = [];
    state.megakaryocyte = {
      x: 0, y: 0,
      maturing: 0.5,    // arranca medio cargado
      period: 14.0,     // 14s entre plaquetas maduras
      max: 4
    };
    state.plaquetaPickups = [];
    state.armedResponse = null;
    state.medCharge = 0;
    state.topicalCharge = 0;
    // Primer macrófago autónomo aparece pronto (no esperamos los 28s estándar).
    state.guardianTimer = 8;
    // Filtrar desbloqueos: conservamos básicas + las que tengan
    // persistAcrossPhases. Las per-fase se pierden y se re-emiten via médula.
    if (state.unlockedTowers) {
      state.unlockedTowers = state.unlockedTowers.filter(function (t) {
        if (BASIC_TOWERS.indexOf(t) !== -1) return true;
        var defT = TOWER_DEFS[t];
        return !!(defT && defT.persistAcrossPhases);
      });
    } else {
      state.unlockedTowers = BASIC_TOWERS.slice();
    }
    // Auto-unlock de torres disseminationOnly (Plaqueta) — no requieren
    // pickup, son específicas del torrente.
    if (state.unlockedTowers.indexOf("plaqueta") === -1) {
      state.unlockedTowers.push("plaqueta");
    }
    // Garantiza que el grupo "Sangre" se abra al entrar al puente — antes
    // openGroups podía no tener la key 'sangre' y la plaqueta quedaba bajo
    // un header colapsado. Resetea openGroups para destacar lo relevante.
    state.openGroups = { linea: true, distancia: true, sangre: true };
    state.unlockScheduleNotified = {};
    state.unlockPickups = [];
    // Cola de pickups que la médula va a emitir en la nueva fase:
    //  1) Per-fase: SIEMPRE se re-emiten (Langerhans, NK, Eosinófilo).
    //  2) Permanentes: solo si NO se desbloquearon en Fase 1 (Mastocito, MAC).
    state.pendingPhaseUnlocks = [];
    var firstUnlockAt = state.time + 6;
    var nUnlocked = 0;
    for (var ppi = 0; ppi < PER_PHASE_TOWERS.length; ppi++) {
      var ppType = PER_PHASE_TOWERS[ppi];
      if (state.unlockedTowers.indexOf(ppType) === -1) {
        state.pendingPhaseUnlocks.push({ typeId: ppType, spawnAt: firstUnlockAt + nUnlocked * 10 });
        nUnlocked++;
      }
    }
    for (var psi = 0; psi < PERSISTENT_UNLOCKABLES.length; psi++) {
      var psType = PERSISTENT_UNLOCKABLES[psi];
      if (state.unlockedTowers.indexOf(psType) === -1) {
        state.pendingPhaseUnlocks.push({ typeId: psType, spawnAt: firstUnlockAt + nUnlocked * 10 });
        nUnlocked++;
      }
    }
    // Recalcular layout completo: el navegador móvil puede haber mostrado/
    // ocultado la barra de URL durante la transición, dejando FIELD_W/FIELD_H
    // desincronizados. resize() vuelve a leer window.innerWidth/Height y
    // recalcula todas las dimensiones derivadas (UI + DRIPs + medicamento).
    resize();
    // Limpieza del campo de Fase 1.
    state.enemies.length = 0;
    state.towers.length = 0;
    state.guardians.length = 0;
    state.germShots.length = 0;
    state.projectiles.length = 0;
    state.effects.length = 0;
    state.fragments.length = 0;
    state.cannonShots.length = 0;
    state.acidSplats.length = 0;
    state.seekers.length = 0;
    state.slicks.length = 0;
    state.restos.length = 0;
    state.collectors.length = 0;
    state.pathInflammation.length = 0;
    state.barricada = null;
    state.bossActive = null;
    state.cinematicEnd = null;
    state.selectedToBuild = null;
    state.selectedTower = null;
    // Reset progresión.
    state.atp = 180;
    state.viralLoad = 0;
    state.viralThreshold = INFESTACION_THRESHOLD;
    state.pathogensReached = 0;
    state.waveIdx = 0;
    state.waveActive = false;
    state.pendingSpawns = [];
    state.spawnElapsed = 0;
    state.nextWaveAt = 10;   // tiempo para que el jugador asimile el campo
    state.waveCountdownActive = true;
    state.surgeAnnounced = false;
    // Reconstruir PATH con 5 carriles + reposicionar mitocondrias laterales.
    rebuildPath();
    layoutDrip();
    // Limpiar drops viejas para que se reposicionen.
    if (state.lymph) state.lymph.drop = null;
    if (state.lymphR) state.lymphR.drop = null;
    // El banner clásico lo reemplaza la cinemática de entrada
    // (drawDisseminationIntro). Sin showMsg, sin waveBannerTimer.
    state.waveBannerText = "";
    state.waveBannerTimer = 0;
    sfx("wave");
  }

  function startNextDisseminationWave() {
    if (state.disseminationOver) return;
    if (state.disseminationWaveIdx >= DISSEMINATION_WAVE_TABLE.length) {
      // Edge case: el jugador defendió las 3 olas sin perder ninguno (balance debería evitarlo).
      // Repetimos la última ola en bucle con más HP hasta que algo caiga.
      var lastIdx = DISSEMINATION_WAVE_TABLE.length - 1;
      var lastDef = DISSEMINATION_WAVE_TABLE[lastIdx];
      state.waveActive = true;
      state.pendingSpawns = [];
      state.spawnElapsed = 0;
      var tEx = 0;
      for (var ge = 0; ge < lastDef.length; ge++) {
        var grpE = lastDef[ge];
        for (var ke = 0; ke < grpE[1]; ke++) {
          state.pendingSpawns.push({ type: grpE[0], time: tEx, hpMult: 1.5 });
          tEx += grpE[2];
        }
      }
      state.waveBannerText = "DISEMINACIÓN — PRESIÓN MÁXIMA";
      state.waveBannerTimer = 2.2;
      return;
    }
    var idx = state.disseminationWaveIdx++;
    // Regenerar +1 HP en barreras NO rotas antes de empezar la oleada.
    if (state.disseminationBarrierHP) {
      for (var brI = 0; brI < state.disseminationBarrierHP.length; brI++) {
        if (!state.disseminationBarrierBroken[brI]) {
          state.disseminationBarrierHP[brI] = Math.min(
            state.disseminationBarrierMax[brI],
            state.disseminationBarrierHP[brI] + 1
          );
        }
      }
    }
    var groups = DISSEMINATION_WAVE_TABLE[idx];
    state.waveActive = true;
    state.waveCountdownActive = false;
    // Sincronizar waveIdx para que el HUD muestre "Oleada 1/2/3" correctamente.
    state.waveIdx = idx + 1;
    state.pendingSpawns = [];
    state.spawnElapsed = 0;
    // HP reducido en diseminación (gérmenes "frescos" tras romper la barrera,
    // más vulnerables al ataque inmune): 60% base, escala leve por oleada.
    var hpMult = 0.55 + idx * 0.10;   // 0.55 / 0.65 / 0.75
    var t = 0;
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      for (var k = 0; k < grp[1]; k++) {
        state.pendingSpawns.push({ type: grp[0], time: t, hpMult: hpMult });
        // Jitter de cadencia.
        t += grp[2] * (0.85 + Math.random() * 0.30);
      }
      t += 0.6;
    }
    state.waveBannerText = "";
    state.waveBannerTimer = 0;
    sfx("wave");
  }
  // ============ FIN NIVEL PUENTE: TRANSICIÓN ============

  function spawnEnemy(typeId, hpMult) {
    var def = ENEMY_DEFS[typeId];
    if (!def) return;
    var diff = getDifficulty();
    // Buff global de HP: +5% para gérmenes regulares, +10% para bosses.
    var globalHpBuff = def.isBoss ? 1.10 : 1.05;
    var hp = def.hp * hpMult * diff.hp * globalHpBuff;
    if (def.isBoss) state.bossActive = null;  // reset; will be set after push
    var heridaIdx;
    if (state.dissemination) {
      // En el nivel puente: elegir carril por afinidad clínica del germen.
      heridaIdx = pickDisseminationLane(typeId);
    } else {
      // Fase 1: herida ACTIVA al azar (la 2ª recién cuenta tras abrirse).
      var activeIdx = [];
      for (var wi = 0; wi < PATH.wounds.length; wi++) if (PATH.wounds[wi].active) activeIdx.push(wi);
      if (!activeIdx.length) activeIdx = [0];
      heridaIdx = activeIdx[Math.floor(Math.random() * activeIdx.length)];
    }
    var wound = PATH.wounds[heridaIdx] || { x: VW * 0.5, y: FIELD_TOP + 20 * U };
    var outX, outY;
    if (state.dissemination) {
      // En el puente: el germen aparece a la DERECHA de la grieta, en su carril.
      outX = wound.x + (20 + Math.random() * 40) * U;
      outY = wound.y + (Math.random() - 0.5) * 12 * U;
    } else {
      // Fase 1: el germen "cae" desde la piel sobre la herida.
      outX = wound.x + (Math.random() - 0.5) * 80 * U;
      var skinTop = FIELD_TOP + FIELD_H * 0.07;
      outY = FIELD_TOP + Math.random() * (skinTop - FIELD_TOP) * 0.8 + 4 * U;
    }
    // En diseminación los gérmenes ya están dentro: spawn directo a "walking"
    // sobre el carril, sin la animación de caer desde la piel.
    var initState = state.dissemination ? "walking" : "outside";
    var initOutsideTimer = state.dissemination ? 0 : (1.0 + Math.random() * 1.0);
    state.enemies.push({
      def: def,
      hp: hp,
      maxHp: hp,
      speedMultLevel: diff.speed,
      heridaIdx: heridaIdx,
      state: initState,
      outsideTimer: initOutsideTimer,
      progress: 0,
      powerCd: def.power ? (def.power.cooldown * (0.5 + Math.random() * 0.6)) : 0,
      powerCharge: 0,
      powerTarget: null,
      devourTarget: null,
      swallowAnim: 0,
      mawOpen: 0,
      speedBoost: 1,
      radiusScale: state.dissemination ? 0.72 : 1,
      noSpore: false,
      childCount: 0,
      childTimer: def.spore ? def.spore.interval * (0.5 + Math.random() * 0.5) : 0,
      burrowTimer: def.burrow ? def.burrow.interval * (0.6 + Math.random() * 0.6) : 0,
      burrowed: false, surfaceTimer: 0, revealed: false,
      seekerCd: def.seekers ? def.seekers.interval * (0.5 + Math.random() * 0.6) : 0,
      tentTimer: def.tentacles ? def.tentacles.interval * (0.4 + Math.random() * 0.6) : 0,
      tentTarget: null, tentPulsesLeft: 0, tentPulseT: 0, tentPunchT: 0,
      x: outX, y: outY,
      vx: (Math.random() - 0.5) * 16 * U,
      vy: 0,
      fallRot: Math.random() * Math.PI * 2,
      fallRotSpd: (Math.random() - 0.5) * 6,
      enteringTimer: 0,
      wobble: Math.random() * Math.PI * 2,
      hitFlash: 0,
      hurtTimer: 0,
      dyingTimer: 0,
      dying: false,
      enraged: false,
      sporeTimer: Math.random() * 1.5,
      blinkTimer: 0,
      nextBlink: state.time + 2 + Math.random() * 3,
      absorbing: false,
      absorbScale: 1,
      absorbAlpha: 1,
      absorbStartX: 0, absorbStartY: 0,
      absorbTargetX: 0, absorbTargetY: 0,
      absorbStartTime: 0,
      absorbedRot: 0,
      shieldHP: def.shield ? def.shield.maxHP : 0,
      shieldRegenTimer: 0,
      shieldRegenAccum: 0,
      shieldShatterTimer: 0,
      shieldHitTimer: 0,
      tooltipShown: false,
      dead: false
    });
    // Trigger MRSA cinematic banner the moment the boss is queued up.
    if (typeId === "bossMRSA" && !state.mrsaIntro) {
      state.mrsaIntro = { t: 0, duration: 2.5 };
    }
  }

  // Esporas hijas del dermatofito: nacen en el camino (en la posición de la
  // madre), más rápidas, con 20% de la vida de la madre y sin replicarse.
  function spawnSpore(m) {
    var sp = m.def.spore || {};
    var chp = Math.max(1, Math.round(m.maxHp * (sp.childHpFrac || 0.2)));
    state.enemies.push({
      def: m.def, hp: chp, maxHp: chp,
      speedMultLevel: m.speedMultLevel, heridaIdx: m.heridaIdx,
      state: "walking", outsideTimer: 0,
      progress: Math.max(0, m.progress - 5 * U),
      powerCd: 0, powerCharge: 0, powerTarget: null, devourTarget: null,
      swallowAnim: 0, mawOpen: 0,
      speedBoost: (sp.childSpeedMult || 1.9), radiusScale: 0.6,
      noSpore: true, noSplit: true, childCount: 0, childTimer: 0,
      burrowTimer: 0, burrowed: false, surfaceTimer: 0, revealed: false,
      x: m.x, y: m.y, vx: 0, vy: 0, fallRot: 0, fallRotSpd: 0, enteringTimer: 0,
      wobble: Math.random() * Math.PI * 2, hitFlash: 0, hurtTimer: 0, dyingTimer: 0,
      dying: false, enraged: false, sporeTimer: Math.random(),
      blinkTimer: 0, nextBlink: state.time + 2 + Math.random() * 3,
      absorbing: false, absorbScale: 1, absorbAlpha: 1,
      absorbStartX: 0, absorbStartY: 0, absorbTargetX: 0, absorbTargetY: 0,
      absorbStartTime: 0, absorbedRot: 0,
      shieldHP: 0, shieldRegenTimer: 0, shieldRegenAccum: 0,
      shieldShatterTimer: 0, shieldHitTimer: 0,
      tooltipShown: true, dead: false
    });
    // Puff de esporas al nacer.
    for (var s = 0; s < 4; s++) {
      var a = Math.random() * Math.PI * 2, spd = (15 + Math.random() * 20) * U;
      pushEffect({ kind: "particle", x: m.x, y: m.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.4, max: 0.5, color: m.def.color });
    }
  }

  function updateWave(dt) {
    if (!state.waveActive) return;
    // Sprint 8A: tooltip ya no pausa spawn; el juego sigue corriendo.
    state.spawnElapsed += dt;
    while (state.pendingSpawns.length && state.pendingSpawns[0].time <= state.spawnElapsed) {
      var s = state.pendingSpawns[0];
      // Single-file enforcement: if any live enemy is still very close to entry, hold.
      var def = ENEMY_DEFS[s.type];
      if (!def) { state.pendingSpawns.shift(); continue; }
      // En diseminación hay 5 carriles paralelos: no aplica single-file global.
      if (!state.dissemination) {
        var minSep = (def.radius + 10) * 2 * U;
        var minProgress = Infinity;
        for (var i = 0; i < state.enemies.length; i++) {
          if (state.enemies[i].progress < minProgress) minProgress = state.enemies[i].progress;
        }
        if (state.enemies.length > 0 && minProgress < minSep) break;
      }
      state.pendingSpawns.shift();
      spawnEnemy(s.type, s.hpMult);
    }
    // Wave is over once both spawns and live enemies are gone.
    var bossAlive = false;
    for (var bi = 0; bi < state.enemies.length; bi++) {
      if (state.enemies[bi].def && state.enemies[bi].def.isBoss && !state.enemies[bi].dead) {
        bossAlive = true; break;
      }
    }
    if (!state.pendingSpawns.length && !state.enemies.length && !bossAlive) {
      state.waveActive = false;
      var bonus = 12 + state.waveIdx * 2;
      state.atp += bonus;
      // Transición a NIVEL PUENTE: al cerrar la ola 18 (boss MRSA) en Fase 1.
      if (!state.dissemination && state.waveIdx === 18) {
        enterDissemination();
        return;
      }
      // Auto-schedule next wave: base gap shrinks with wave, infestation
      // multiplier shrinks gap further (snowball).
      // En diseminación: pausa larga entre olas (~14-18s) para construir defensa.
      var gapBase = state.dissemination
        ? (state.disseminationWaveIdx === 1 ? 18 : 14)
        : Math.max(2.5, 7.5 - state.waveIdx * 0.4);
      state.nextWaveAt = state.dissemination ? gapBase : (gapBase * infestWaveGapMult(state.viralLoad));
      state.waveCountdownActive = true;
      showMsg("Contenida (+" + bonus + " ATP)");
    }
  }

  // Al superar el 40% de infestación, la infección se acelera (más gérmenes y
  // más rápido). Solo anuncia una vez; el efecto lo aplica infestSurge().
  function updateInfestationSurge() {
    if (state.surgeAnnounced) return;
    if (state.viralLoad / Math.max(1, state.viralThreshold) < 0.40) return;
    state.surgeAnnounced = true;
    triggerShake(0.35, 5);
    sfx("playerHurt");
    showMsg("¡La infección se acelera!");
  }

  // Auto-spawn ticker — every frame outside an active wave, drain countdown.
  function updateWaveScheduler(dt) {
    updateInfestationSurge();
    if (state.cinematicEnd || state.confirmRestart || state.showIntro) return;
    if (state.waveActive) return;
    if (state.nextWaveAt > 0) {
      state.nextWaveAt -= dt;
      if (state.nextWaveAt <= 0) {
        state.nextWaveAt = 0;
        startNextWave();
      }
    }
    updateIntermediateSpawns(dt);
  }

  // Sprint 7: intermediate stragglers spawn every 4-7s during the wave gap
  // so dead air between oleadas keeps slight tension. Only regular pathogens
  // — never a boss.
  // Fase 1 piel: solo gérmenes cutáneos (todos con ataque/radar).
  var INTERMEDIATE_POOL_BY_WAVE = [
    null,                                          // wave 0 (pre-first), no spawns
    ["sepidermidis"],                              // wave 1
    ["sepidermidis", "hsv"],                       // wave 2
    ["sepidermidis", "hsv"],                        // wave 3
    ["sepidermidis", "hsv", "cacnes"],             // 4
    ["sepidermidis", "hsv", "cacnes"],             // 5
    ["sepidermidis", "hsv", "cacnes", "candida"],  // 6
    ["hsv", "cacnes", "candida", "pseudomonas"],   // 7
    ["hsv", "cacnes", "candida", "pseudomonas"],   // 8
    ["hsv", "candida", "pseudomonas", "saureus"]   // 9
  ];
  var INTERMEDIATE_POOL_LATE = ["sepidermidis", "hsv", "cacnes", "candida", "pseudomonas", "saureus", "hpv", "molluscum", "malassezia", "sarna"];
  function pickIntermediateType() {
    var w = Math.max(0, state.waveIdx | 0);
    var pool = w < INTERMEDIATE_POOL_BY_WAVE.length
      ? INTERMEDIATE_POOL_BY_WAVE[w]
      : INTERMEDIATE_POOL_LATE;
    if (!pool || !pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function updateIntermediateSpawns(dt) {
    if (state.dissemination) return;        // nivel puente: solo waves explícitas
    if (state.waveIdx < 1) return;          // no stragglers before wave 1 actually starts
    state.nextIntermediateAt -= dt;
    if (state.nextIntermediateAt > 0) return;
    state.nextIntermediateAt = 4 + Math.random() * 3;
    var t = pickIntermediateType();
    if (t) spawnEnemy(t, 1.0);
  }

  // -------- ENEMIES -------------------------------------------------------
  function updateEnemies(dt) {
    // Charcos aceitosos (Malassezia): se desvanecen con el tiempo.
    if (state.slicks && state.slicks.length) {
      for (var si = state.slicks.length - 1; si >= 0; si--) {
        state.slicks[si].life -= dt;
        if (state.slicks[si].life <= 0) state.slicks.splice(si, 1);
      }
    }
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.dead) continue;
      // Blink ticks for everyone, even dying.
      if (e.blinkTimer > 0) e.blinkTimer -= dt;
      else if (state.time >= e.nextBlink) {
        e.blinkTimer = 0.10;
        e.nextBlink = state.time + 2.5 + Math.random() * 3;
      }
      if (e.hurtTimer > 0) e.hurtTimer -= dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.shieldHitTimer > 0) e.shieldHitTimer -= dt;
      if (e.shieldShatterTimer > 0) e.shieldShatterTimer -= dt;
      // Shield regeneration (off-screen tick) — HPV furioso ya no regenera.
      if (e.def.shield && !e.noShieldRegen && e.shieldHP < e.def.shield.maxHP) {
        if (e.shieldRegenTimer > 0) {
          e.shieldRegenTimer -= dt;
        } else if (e.def.shield.regenRate > 0) {
          e.shieldRegenAccum = (e.shieldRegenAccum || 0) + dt * e.def.shield.regenRate;
          while (e.shieldRegenAccum >= 1 && e.shieldHP < e.def.shield.maxHP) {
            e.shieldHP += 1;
            e.shieldRegenAccum -= 1;
          }
        }
      }
      // Sprint 8A: lateral tooltip — first encounter goes to a queue. The
      // El glow del enemigo (drawEnemy) y el aviso "Toca al nuevo enemigo"
      // (chequeado reactivamente en render) ya cubren el caso. Mantengo
      // e.tooltipShown como flag por compatibilidad con código legado.
      if (!e.tooltipShown && e.state === "walking"
          && !state.vistos[e.def.id] && !state.showIntro && !state.cinematicEnd) {
        e.tooltipShown = true;
      }
      if (e.dying) {
        e.dyingTimer -= dt;
        if (e.dyingTimer <= 0) {
          if (state.dissemination && !e.antigenSpawned) {
            spawnAntigenDrop(e.x, e.y);
            e.antigenSpawned = true;
          }
          e.dead = true;
          spawnEffect("death", e.x, e.y, e.def.color);
          sfx("enemyDie");
          state.kills += 1;
          dropResto(e.x, e.y);
        }
        continue;
      }
      // OUTSIDE: hover in exterior zone above the skin briefly with chaotic jitter.
      if (e.state === "outside") {
        e.outsideTimer -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= 0.92;
        e.vy *= 0.92;
        // Random nudge so the germ wobbles in place.
        e.vx += (Math.random() - 0.5) * 80 * U * dt;
        e.vy += (Math.random() - 0.5) * 50 * U * dt;
        e.fallRot += e.fallRotSpd * dt;
        if (e.outsideTimer <= 0) {
          e.state = "falling";
          // Aim falling velocity toward the assigned wound.
          var wd = PATH.wounds[e.heridaIdx] || PATH.wounds[0];
          if (wd) {
            e.vx = (wd.x - e.x) * 0.6;
            e.vy = (wd.y - e.y) * 0.5 + 30 * U;
          }
        }
        continue;
      }
      // FALLING: chaotic descent toward the wound funnel.
      if (e.state === "falling") {
        var wd2 = PATH.wounds[e.heridaIdx] || PATH.wounds[0] || PATH.entry;
        if (!wd2) { e.state = "walking"; e.progress = 0; continue; }
        var tx = wd2.x, ty = wd2.y;
        var ddx = tx - e.x, ddy = ty - e.y;
        var d = Math.hypot(ddx, ddy) || 0.0001;
        var pull = 480 * U; // gravity-like acceleration toward funnel
        e.vx += (ddx / d) * pull * dt;
        e.vy += (ddy / d) * pull * dt;
        // Damping to keep speeds bounded.
        e.vx *= 0.985;
        e.vy *= 0.985;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.fallRot += e.fallRotSpd * dt;
        if (d < 22 * U) {
          e.state = "entering";
          e.enteringTimer = 0.20;
          e.x = tx; e.y = ty;
          e.vx = 0; e.vy = 0;
          state.woundFlashTimer = 0.30;
          // Wound pulse particle ring
          for (var pj = 0; pj < 8; pj++) {
            var pa = pj * Math.PI / 4;
            pushEffect({
              kind: "particle",
              x: tx, y: ty,
              vx: Math.cos(pa) * 60 * U,
              vy: Math.sin(pa) * 60 * U,
              life: 0.4, max: 0.5,
              color: "rgba(178, 34, 34, 0.7)"
            });
          }
        }
        continue;
      }
      // ENTERING: brief funnel-in animation.
      if (e.state === "entering") {
        e.enteringTimer -= dt;
        if (e.enteringTimer <= 0) {
          e.state = "walking";
          e.progress = 0;
        }
        continue;
      }
      // ABSORBING: explicit easeInQuad lerp from snapshot start -> vessel center.
      if (e.absorbing) {
        var elapsed = state.time - e.absorbStartTime;
        var t01 = Math.min(1, elapsed / 0.40);
        var et = t01 * t01;  // easeInQuad per spec
        e.x = e.absorbStartX + (e.absorbTargetX - e.absorbStartX) * et;
        e.y = e.absorbStartY + (e.absorbTargetY - e.absorbStartY) * et;
        e.absorbScale = Math.max(0, 1 - t01);
        e.absorbAlpha = Math.max(0, 1 - t01);
        e.absorbedRot += dt * 6;  // spin during suction (per spec ~6 rad/s)
        if (t01 >= 1) {
          if (state.dissemination && !e.antigenSpawned) {
            spawnAntigenDrop(e.x, e.y);
            e.antigenSpawned = true;
          }
          e.dead = true;
          state.vesselFlashTimer = Math.max(state.vesselFlashTimer, 0.20);
          state.vesselSwallow = 0.20;
        }
        continue;
      }
      // Boss enraged check
      if (e.def.isBoss && !e.enraged && e.hp / e.maxHp < 0.5) {
        e.enraged = true;
      }
      // BOSS TOXIN PULSE: cada 12s emite una onda púrpura que ralentiza la
      // cadencia (50%) de todas las torres en rango durante 4s. Primer pulso
      // 5s después de aparecer, para que el jugador no sea aplastado al spawn.
      if (e.def.isBoss) {
        if (e.toxinNextAt == null) e.toxinNextAt = state.time + 5;
        if (state.time >= e.toxinNextAt) {
          e.toxinNextAt = state.time + 12;
          var pulseR = (80 + (e.enraged ? 30 : 0)) * U;
          pushEffect({
            kind: "toxinPulse", x: e.x, y: e.y, r: pulseR,
            life: 0.7, max: 0.7, color: "#9430b8"
          });
          for (var bi = 0; bi < state.towers.length; bi++) {
            var bt = state.towers[bi];
            if (bt.devouredBy) continue;
            var bdx = bt.x - e.x, bdy = bt.y - e.y;
            if (bdx * bdx + bdy * bdy <= pulseR * pulseR) {
              bt.slowFireTimer = Math.max(bt.slowFireTimer || 0, 4.0);
            }
          }
          triggerShake(0.10, 3);
          sfx("playerHurt");
        }
      }
      // bossMRSA — COAGULASA: regenera escudo completo cada 12s.
      if (e.def.id === "bossMRSA" && e.def.shield) {
        if (e.coagulasaNextAt == null) e.coagulasaNextAt = state.time + 6;
        if (state.time >= e.coagulasaNextAt && e.shieldHP < e.def.shield.maxHP) {
          e.shieldHP = e.def.shield.maxHP;
          e.shieldHitTimer = 0.3;
          e.coagulasaNextAt = state.time + 12;
          pushEffect({ kind: "shock", x: e.x, y: e.y, r: e.def.radius * U * 2.0, life: 0.5, max: 0.5, color: "#ffd24a" });
          pushDamageNumber(e.x, e.y - e.def.radius * U - 6, "COAGULASA", "#ffd24a");
        }
      }
      // bossPyogenes — RASTRO NECRÓTICO: cada 2.5s deja un parche que daña
      // a las células del jugador que lo tocan.
      if (e.def.id === "bossPyogenes") {
        if (e.necroticNextAt == null) e.necroticNextAt = state.time + 1.5;
        if (state.time >= e.necroticNextAt && !e.dying) {
          e.necroticNextAt = state.time + 2.5;
          if (!state.necroticPatches) state.necroticPatches = [];
          state.necroticPatches.push({
            x: e.x, y: e.y, r: e.def.radius * U * 1.6,
            ttl: 8.0, age: 0, dmgPerSec: 3
          });
        }
      }
      var pxSpeed = e.def.speedMult * (e.speedMultLevel || 1) * BASE_SPEED * U *
                    infestSpeedMult(state.viralLoad);
      // Nivel puente: gérmenes a 0.35× la velocidad original (50% × 70%
      // adicional) para dar tiempo holgado de defender.
      if (state.dissemination) pxSpeed *= 0.35;
      if (state.dissemination && e.nettedUntil && state.time < e.nettedUntil) {
        pxSpeed = 0;
      }
      if (state.dissemination && e.thrombusUntil && state.time < e.thrombusUntil) {
        pxSpeed = 0;
      }
      // Fibrina: si el germen entra en su elipse de obstrucción, se detiene
      // y aplica daño de contacto recíproco (mínimo al germen, mayor a la
      // malla — su HP alta lo soporta).
      if (state.dissemination) {
        for (var pli = 0; pli < state.towers.length; pli++) {
          var ptw = state.towers[pli];
          if (!ptw.def.obstructs || ptw.hp <= 0) continue;
          var oRX = (ptw.def.obstructRX || 22) * U;
          var oRY = (ptw.def.obstructRY || 22) * U;
          var ddx = (ptw.x - e.x) / oRX;
          var ddy = (ptw.y - e.y) / oRY;
          if (ddx * ddx + ddy * ddy <= 1) {
            pxSpeed = 0;
            e.hp -= 0.6 * dt;
            ptw.hp -= 4 * dt;
            ptw.dmgAccum = (ptw.dmgAccum || 0) + 4 * dt;
            ptw.hitFlash = 0.10;
            break;
          }
        }
      }
      // Medicamento: paralización / ralentización.
      if (e.stunTimer > 0) e.stunTimer -= dt;
      if (e.slowTimer > 0) e.slowTimer -= dt;
      if (e.markTimer > 0) { e.markTimer -= dt; if (e.markTimer <= 0) e.revealed = false; }
      // Sarna: madriguera (se entierra, intocable salvo si está marcada).
      var burrowFactor = 1;
      if (e.def.burrow && (e.state === "walking")) {
        if (e.burrowed) {
          e.surfaceTimer -= dt;
          burrowFactor = e.def.burrow.speedMult || 1.9;
          if (e.surfaceTimer <= 0) {
            e.burrowed = false;
            e.burrowTimer = e.def.burrow.interval;
            e.progress += (e.def.burrow.surfaceJump || 0) * U;  // salta adelante (esquiva torres)
            for (var dp = 0; dp < 7; dp++) { var da = Math.random() * Math.PI * 2, dsp = (20 + Math.random() * 30) * U; pushEffect({ kind: "particle", x: e.x, y: e.y, vx: Math.cos(da) * dsp, vy: Math.sin(da) * dsp - 6 * U, life: 0.4, max: 0.5, color: e.def.colorDark }); }
          }
        } else {
          e.burrowTimer -= dt;
          if (e.burrowTimer <= 0) {
            e.burrowed = true; e.surfaceTimer = e.def.burrow.duration;
            for (var dp2 = 0; dp2 < 7; dp2++) { var da2 = Math.random() * Math.PI * 2, dsp2 = (20 + Math.random() * 30) * U; pushEffect({ kind: "particle", x: e.x, y: e.y, vx: Math.cos(da2) * dsp2, vy: Math.sin(da2) * dsp2 - 6 * U, life: 0.4, max: 0.5, color: e.def.colorDark }); }
          }
        }
      }
      var medFactor = e.stunTimer > 0 ? 0 : (e.slowTimer > 0 ? 0.4 : 1);
      // BLOCKED by a coagulation barricade: stop advancing along the path.
      // Position still resolves via pathPos at the held progress so the
      // sprite stays put on the path with a small shake jitter.
      // HPV furioso: +50% velocidad. Charco de Malassezia: +30% al pasar.
      var enrageMult = (e.enraged && e.def.id === "hpv") ? 1.5 : 1;
      var slickFactor = 1;
      if (state.slicks && state.slicks.length) {
        for (var sli = 0; sli < state.slicks.length; sli++) {
          var sk = state.slicks[sli];
          if (Math.hypot(e.x - sk.x, e.y - sk.y) < sk.r) { slickFactor = 1.3; break; }
        }
      }
      if (e.state !== "blocked" && !e.devourTarget && !e.beingEngulfed) {
        e.progress += pxSpeed * medFactor * (e.speedBoost || 1) * burrowFactor * enrageMult * slickFactor * dt;
      }
      // Dermatofito: suelta esporas hijas mientras avanza.
      if (e.def.spore && !e.noSpore && e.state === "walking" &&
          (e.childCount || 0) < (e.def.spore.maxChildren || 5)) {
        e.childTimer -= dt;
        if (e.childTimer <= 0) {
          e.childTimer = e.def.spore.interval;
          e.childCount = (e.childCount || 0) + 1;
          spawnSpore(e);
        }
      }
      // S. epidermidis (y cualquier germen con def.tentacles): al pasar cerca
      // de una torre saca SEUDÓPODOS y le mete una ráfaga de puñetazos.
      if (e.tentPunchT > 0) e.tentPunchT -= dt;
      if (e.def.tentacles && e.state === "walking") {
        var tcfg = e.def.tentacles;
        if (e.tentTarget && e.tentPulsesLeft > 0) {
          var stillValid = state.towers.indexOf(e.tentTarget) !== -1 && e.tentTarget.hp > 0 &&
            Math.hypot(e.tentTarget.x - e.x, e.tentTarget.y - e.y) < tcfg.range * U * 1.6;
          if (!stillValid) { e.tentTarget = null; e.tentPulsesLeft = 0; e.tentTimer = tcfg.interval * 0.5; }
          else {
            e.tentPulseT -= dt;
            if (e.tentPulseT <= 0) {
              e.tentTarget.hp -= tcfg.dmg;
              e.tentTarget.hitFlash = 0.20;
              e.tentTarget.dmgAccum = (e.tentTarget.dmgAccum || 0) + tcfg.dmg;
              e.tentPunchT = 0.20;
              pushEffect({ kind: "particle", x: e.tentTarget.x, y: e.tentTarget.y, vx: (Math.random() - 0.5) * 40 * U, vy: -(20 + Math.random() * 25) * U, life: 0.30, max: 0.40, color: "#ffd24a" });
              e.tentPulsesLeft -= 1;
              e.tentPulseT = tcfg.pulseGap;
              if (e.tentPulsesLeft <= 0) { e.tentTimer = tcfg.interval; e.tentTarget = null; }
            }
          }
        } else {
          e.tentTimer = (e.tentTimer || 0) - dt;
          if (e.tentTimer <= 0) {
            var nearestTT = null, ntdd = Infinity;
            for (var tti = 0; tti < state.towers.length; tti++) {
              var ttw = state.towers[tti]; if (ttw.devouredBy) continue;
              var ttd = Math.hypot(ttw.x - e.x, ttw.y - e.y);
              if (ttd < tcfg.range * U && ttd < ntdd) { ntdd = ttd; nearestTT = ttw; }
            }
            if (nearestTT) { e.tentTarget = nearestTT; e.tentPulsesLeft = tcfg.pulses; e.tentPulseT = tcfg.pulseGap * 0.4; }
            else { e.tentTimer = 0.6; }
          }
        }
      }
      // Pseudomonas: esporas buscadoras de torres disparadoras (cañón MAC,
      // Linfocito B/T, NK, Eosinófilo). Vuelan hacia su objetivo y le pegan.
      if (e.def.seekers && e.state === "walking") {
        e.seekerCd -= dt;
        if (e.seekerCd <= 0) {
          var sh = pickShooterTower(e.x, e.y);
          if (sh) { spawnSeeker(e, sh); e.seekerCd = e.def.seekers.interval; }
          else { e.seekerCd = 2.0; }   // sin objetivos: reintenta en 2s
        }
      }
      e.wobble += dt * 6;
      // Sprint 7: walking enemies leave inflammation marks every 0.5s.
      if (e.state === "walking") {
        e.inflammationTimer = (e.inflammationTimer || 0) - dt;
        if (e.inflammationTimer <= 0) {
          e.inflammationTimer = 0.5;
          pushPathInflammation(e.x, e.y);
        }
      }
      if (e.sporeTimer !== undefined) {
        e.sporeTimer -= dt;
        if (e.def.id === "hongo" && e.sporeTimer <= 0) {
          e.sporeTimer = 0.6 + Math.random() * 0.6;
          var sang = Math.random() * Math.PI * 2;
          pushEffect({
            kind: "particle",
            x: e.x, y: e.y,
            vx: Math.cos(sang) * 12 * U,
            vy: Math.sin(sang) * 12 * U - 6 * U,
            life: 0.6, max: 0.8,
            color: "rgba(233, 30, 99, 0.55)"
          });
        }
      }
      // Trigger absorbing at TORRENT_ABSORB_TRIGGER (88%) of THIS enemy's
      // total route (branch + main). Capture the position at trigger so the
      // animation lerps explicitly to the vessel center and never visually
      // overshoots the torrent sprite.
      var hi = e.heridaIdx | 0;
      var totalForThis = PATH.totalForBranch[hi] || PATH.total;
      var absorbThreshold = PATH.absorbStartForBranch[hi] != null
        ? PATH.absorbStartForBranch[hi]
        : totalForThis * TORRENT_ABSORB_TRIGGER;
      if (e.progress >= absorbThreshold && !e.absorbing) {
        // NIVEL PUENTE: cada germen que cruza una puerta llena +10% el
        // medidor del órgano. Al llegar a 10/10 (100%), ese órgano cae y
        // se define el escenario de Fase 2.
        if (state.dissemination) {
          if (!state.disseminationOrganLoad) state.disseminationOrganLoad = [0, 0, 0, 0, 0];
          if (!state.disseminationBarrierHP) state.disseminationBarrierHP = [0,0,0,0,0];
          if (!state.disseminationBarrierBroken) state.disseminationBarrierBroken = [false,false,false,false,false];
          var lane = hi;
          var organ = (PATH.organDoors && PATH.organDoors[lane])
            ? PATH.organDoors[lane].organ
            : DISSEMINATION_ORGANS[lane] || DISSEMINATION_ORGANS[0];
          if (!state.disseminationFlash) state.disseminationFlash = [0,0,0,0,0];

          if (!state.disseminationBarrierBroken[lane] && state.disseminationBarrierHP[lane] > 0) {
            // El germen es absorbido por la barrera: muere, barrera -1 HP.
            state.disseminationBarrierHP[lane] -= 1;
            state.disseminationFlash[lane] = 0.6;
            triggerShake(0.08, 2);
            spawnEffect("escape", e.x, e.y, organ.color);
            if (!e.antigenSpawned) {
              spawnAntigenDrop(e.x, e.y);
              e.antigenSpawned = true;
            }
            // ¿La barrera acaba de romperse?
            if (state.disseminationBarrierHP[lane] <= 0) {
              state.disseminationBarrierBroken[lane] = true;
              state.disseminationBarrierBreakAt = state.time;
              state.disseminationBarrierBreakLane = lane;
              triggerShake(0.35, 6);
              sfx("playerHurt");
            }
            e.dead = true;
            continue;
          }

          // Barrera rota: comportamiento original (suma al organ load).
          state.disseminationOrganLoad[lane] = (state.disseminationOrganLoad[lane] || 0) + 1;
          spawnEffect("escape", e.x, e.y, organ.color);
          state.disseminationFlash[lane] = 0.6;
          triggerShake(0.12, 3);
          if (audio && audio.ctx) sfx("playerHurt");
          if (state.disseminationOrganLoad[lane] >= 10 && !state.disseminationOver) {
            state.disseminationOver = { germ: e.def, organ: organ, t: 0 };
            triggerShake(0.5, 9);
            state.waveActive = false;
            state.pendingSpawns = [];
          }
          e.dead = true;
          continue;
        }
        e.absorbing = true;
        e.absorbStartTime = state.time;
        e.absorbStartX = e.x;
        e.absorbStartY = e.y;
        e.absorbTargetX = PATH.exit ? PATH.exit.x : e.x;
        e.absorbTargetY = PATH.exit ? PATH.exit.y : e.y;
        e.absorbedRot = 0;
        e.absorbScale = 1;
        e.absorbAlpha = 1;
        var viralAdd = (e.def.viralAdd != null ? e.def.viralAdd : (VIRAL_BY_TYPE[e.def.id] || 5));
        state.viralLoad = Math.min(state.viralThreshold, state.viralLoad + viralAdd);
        state.pathogensReached += 1;
        META.totalPathogensInfiltrated += 1;
        triggerShake(0.25, e.def.isBoss ? 7 : 4);
        state.vesselFlashTimer = 0.30;
        state.vesselSwallow = 0.20;
        spawnEffect("escape", PATH.exit ? PATH.exit.x : e.x, PATH.exit ? PATH.exit.y : e.y);
        sfx("playerHurt");
        spawnCirculatoryTracer(e.def);
        if (state.viralLoad >= state.viralThreshold) {
          triggerLevelEnd();
        }
        continue;
      } else {
        var p = pathPos(e.progress, hi);
        if (e.state === "blocked") {
          // Held in place by coagulation; small jitter shake.
          e.x = p.x + (Math.random() - 0.5) * 4 * U;
          e.y = p.y + (Math.random() - 0.5) * 4 * U;
        } else if (e.def.id === "virus") {
          var sx = Math.cos(p.angle), sy = Math.sin(p.angle);
          var nx = -sy, ny = sx;
          var off = Math.sin(e.wobble * 1.4) * 4 * U;
          e.x = p.x + nx * off;
          e.y = p.y + ny * off;
        } else {
          e.x = p.x;
          e.y = p.y;
        }
      }
      // Combate: gérmenes agresivos dañan torres dentro del aura al pasar
      // (sin detenerse). Solo en el camino y si no están siendo absorbidos.
      if (e.toxinTimer > 0) e.toxinTimer -= dt;
      if (e.def.attack > 0 && !e.absorbing &&
          (e.state === "walking" || e.state === "blocked")) {
        var aura = enemyAuraRadiusPx(e.def);
        var atkMult = (e.enraged && e.def.id === "hpv") ? 1.5 : 1;   // HPV furioso pega más
        for (var ti = 0; ti < state.towers.length; ti++) {
          var tw = state.towers[ti];
          if (tw.def.immuneToAura) continue;   // Cañón MAC: inmune al aura de contacto
          if (Math.hypot(tw.x - e.x, tw.y - e.y) < aura) {
            var admg = e.def.attack * ATTACK_MULT * atkMult * dt;
            tw.hp -= admg;
            tw.hitFlash = 0.16;
            tw.dmgAccum = (tw.dmgAccum || 0) + admg;
            e.toxinTimer = 0.22;
            e.toxinX = tw.x; e.toxinY = tw.y;
          }
        }
      }
      // Malassezia: película grasa — baja la cadencia de las torres cercanas
      // y deja charcos aceitosos que aceleran a los gérmenes que pasan.
      if (e.def.greaseAura && !e.absorbing && (e.state === "walking" || e.state === "blocked")) {
        var gr = e.def.greaseAura.range * U;
        for (var gti = 0; gti < state.towers.length; gti++) {
          var gtw = state.towers[gti];
          if (Math.hypot(gtw.x - e.x, gtw.y - e.y) < gr) {
            gtw.slowFireTimer = Math.max(gtw.slowFireTimer || 0, e.def.greaseAura.slowFire);
          }
        }
        e.slickTimer = (e.slickTimer || 0) - dt;
        if (e.slickTimer <= 0) {
          e.slickTimer = 0.8;
          state.slicks.push({ x: e.x, y: e.y, r: 22 * U, life: 3, max: 3 });
        }
      }
      // Tópico: ácido en el camino — DoT a todos los gérmenes mientras dura.
      if (state.acidTimer > 0 && !e.dying && !e.absorbing &&
          (e.state === "walking" || e.state === "blocked")) {
        e.hp -= e.maxHp * ACID_DPS_FRAC * dt;
        e.acidFlash = 0.25;
        if (e.hp <= 0 && !e.dying) {
          e.hp = 0; e.dying = true; e.dyingTimer = 0.30;
          state.atp += e.def.reward; state.pathogensDefeated += 1; META.totalPathogensDefeated += 1;
          pushEffect({ kind: "atpText", x: e.x, y: e.y - e.def.radius * U - 4, vy: -36 * U,
            text: "+" + e.def.reward + " ATP", life: 0.8, max: 0.8 });
        }
      }
      if (e.acidFlash > 0) e.acidFlash -= dt;
      if (e.swallowAnim > 0) e.swallowAnim -= dt;
      // Poder especial: spray/catapulta/dardo o devorar a una torre cercana.
      if (e.def.power && !e.dying && !e.absorbing &&
          (e.state === "walking" || e.state === "blocked")) {
        if (e.devourTarget) {
          updateDevour(e, dt);
        } else if (e.powerCharge > 0) {
          // Telégrafo: el germen "carga" antes de soltar el poder.
          e.powerCharge -= dt;
          if (e.powerCharge <= 0) {
            var pt = e.powerTarget;
            if (pt && state.towers.indexOf(pt) !== -1 && !pt.devouredBy) {
              fireGermPower(e, pt);
              e.powerCd = e.def.power.cooldown;
            } else {
              e.powerCd = 1.0;   // objetivo perdido: reintenta pronto
            }
            e.powerTarget = null;
          }
        } else {
          if (e.powerCd > 0) e.powerCd -= dt;
          if (e.powerCd <= 0 && state.towers.length) {
            var pr = e.def.power.range * U, tgt = null, bd = Infinity;
            for (var pi = 0; pi < state.towers.length; pi++) {
              var tw2 = state.towers[pi];
              if (tw2.devouredBy) continue;
              var dd2 = Math.hypot(tw2.x - e.x, tw2.y - e.y);
              if (dd2 < pr && dd2 < bd) { bd = dd2; tgt = tw2; }
            }
            if (tgt) { e.powerCharge = 0.55; e.powerTarget = tgt; }  // inicia carga
          }
        }
      }
    }
    state.enemies = state.enemies.filter(function (e) { return !e.dead; });
  }

  // -------- TOWERS --------------------------------------------------------
  // Coste en ATP o en fragmentos de complemento, según la torre.
  function towerAffordable(def) {
    // Plaqueta requiere una unidad madura del megacariocito (no usa ATP).
    if (def.id === "plaqueta") {
      return !!(state.plaquetaPickups && state.plaquetaPickups.length > 0);
    }
    return def.currency === "complement" ? (state.complement >= def.cost) : (state.atp >= def.cost);
  }
  function payTower(def) {
    if (def.id === "plaqueta") {
      if (state.plaquetaPickups && state.plaquetaPickups.length > 0) {
        state.plaquetaPickups.shift();
      }
      return;
    }
    if (def.currency === "complement") state.complement = Math.max(0, state.complement - def.cost);
    else state.atp -= def.cost;
  }

  function placeTower(x, y, typeId) {
    var def = TOWER_DEFS[typeId];
    state.towers.push({
      x: x, y: y,
      nx: FIELD_W > 0 ? (x - FIELD_LEFT) / FIELD_W : 0,
      ny: FIELD_H > 0 ? (y - FIELD_TOP) / FIELD_H : 0,
      def: def,
      level: 0,
      cooldown: 0,
      muzzleFlash: 0,
      attackAnim: 0,
      levelupAnim: 0,
      idlePhase: Math.random() * Math.PI * 2,
      blinkTimer: 0,
      nextBlink: state.time + 2 + Math.random() * 3,
      placedAt: state.time,
      maxHp: def.levels[0].hp,
      hp: def.levels[0].hp,
      hitFlash: 0,
      dmgAccum: 0,
      dmgNumTimer: 0,
      stunTimer: 0,
      slowFireTimer: 0,
      devouredBy: null
    });
    pushEffect({ kind: "place", x: x, y: y, life: 0.6, max: 0.6, color: def.color });
    pushEffect({ kind: "placeFlash", x: x, y: y, life: 0.25, max: 0.25 });
    sfx("place");
  }

  // ============ SINERGIAS POR PROXIMIDAD ============
  // Cada entrada: receptor → { sourceId: { damage|range|fireRate: multiplier }}.
  // Se activa cuando "source" está dentro del rango del receptor.
  var SYNERGY_BONUSES = {
    // Langerhans potencia a TODAS las torres de daño (su marca es universal).
    // Esto refleja la biología: la dendrítica presenta antígeno a todos.
    neutrofilo:  {
      linfocitoB: { damage:   1.20 }, // B opsoniza → neutrófilo fagocita +20%
      langerhans: { damage:   1.20 }  // marca presenta → +20% daño
    },
    linfocitoB:  {
      langerhans: { fireRate: 1.25 }  // presenta antígeno → B reconoce más rápido
    },
    linfocitoT:  {
      langerhans: { damage:   1.30 }  // T citotóxico aprovecha al máximo el antígeno
    },
    nk:          {
      langerhans: { range:    1.15 }  // NK extiende el reconocimiento
    },
    eosinofilo:  {
      mastocito:  { damage:   1.25 }, // histamina recluta granulocitos
      langerhans: { damage:   1.20 }  // también recibe el boost de la marca
    },
    mastocito:   {
      langerhans: { damage:   1.20 }  // su DoT también escala con la presentación
    },
    complemento: {
      linfocitoB: { damage:   1.20 }, // anticuerpos activan cascada → MAC +20%
      langerhans: { damage:   1.20 }  // marcado universal
    },
    plaqueta:    {
      langerhans: { damage:   1.20 }  // marcado universal
    }
  };

  // Langerhans solo presenta antígeno a MAX_LANGERHANS_TARGETS torres por
  // limite biológico de capacidad de presentación. Las 3 más cercanas dentro
  // del rango ganan el buff; el resto, aunque esté en rango, no.
  var MAX_LANGERHANS_TARGETS = 3;

  function computeSynergyBuffs() {
    // Pase 1: cada Langerhans elige hasta 3 receptores (los más cercanos
    // dentro del rango del receptor).
    for (var li = 0; li < state.towers.length; li++) {
      var lang = state.towers[li];
      if (lang.def.id !== "langerhans") continue;
      var cands = [];
      for (var lj = 0; lj < state.towers.length; lj++) {
        if (li === lj) continue;
        var rcv = state.towers[lj];
        var rconf = SYNERGY_BONUSES[rcv.def.id];
        if (!rconf || !rconf.langerhans) continue;
        var rRange = ((rcv.def.levels[rcv.level] || {}).range || 100) * U;
        var ldx = lang.x - rcv.x, ldy = lang.y - rcv.y;
        var d2 = ldx * ldx + ldy * ldy;
        if (d2 > rRange * rRange) continue;
        cands.push({ rcv: rcv, d2: d2 });
      }
      cands.sort(function (a, b) { return a.d2 - b.d2; });
      var picked = [];
      for (var lk = 0; lk < Math.min(MAX_LANGERHANS_TARGETS, cands.length); lk++) {
        picked.push(cands[lk].rcv);
      }
      lang.langerhansTargets = picked;
    }
    // Pase 2: aplica los buffs respetando el cap por Langerhans.
    for (var i = 0; i < state.towers.length; i++) {
      var t = state.towers[i];
      var conf = SYNERGY_BONUSES[t.def.id];
      if (!conf) { t.synBuff = null; t.synActiveFrom = null; continue; }
      var buff = { damage: 1, range: 1, fireRate: 1 };
      var sources = [];
      var rangePx = ((t.def.levels[t.level] || {}).range || 100) * U;
      for (var j = 0; j < state.towers.length; j++) {
        if (i === j) continue;
        var other = state.towers[j];
        var srcCfg = conf[other.def.id];
        if (!srcCfg) continue;
        if (other.def.id === "langerhans") {
          var picks = other.langerhansTargets || [];
          if (picks.indexOf(t) === -1) continue;
        }
        var dx = other.x - t.x, dy = other.y - t.y;
        if (dx * dx + dy * dy > rangePx * rangePx) continue;
        if (srcCfg.damage)   buff.damage   *= srcCfg.damage;
        if (srcCfg.range)    buff.range    *= srcCfg.range;
        if (srcCfg.fireRate) buff.fireRate *= srcCfg.fireRate;
        sources.push(other);
      }
      t.synBuff = (buff.damage !== 1 || buff.range !== 1 || buff.fireRate !== 1) ? buff : null;
      t.synActiveFrom = sources.length ? sources : null;
    }
  }

  function towerStats(t) {
    var base = t.def.levels[t.level];
    if (!t.synBuff) return base;
    // Devuelve una copia con multiplicadores aplicados.
    var out = {};
    for (var k in base) { if (base.hasOwnProperty(k)) out[k] = base[k]; }
    if (out.damage != null)   out.damage   = out.damage   * t.synBuff.damage;
    if (out.range != null)    out.range    = out.range    * t.synBuff.range;
    if (out.fireRate != null) out.fireRate = out.fireRate * t.synBuff.fireRate;
    return out;
  }

  function drawSynergyLines() {
    // Pase 1: recolectar torres únicas involucradas en cualquier sinergia
    // (para no duplicar halos cuando una misma torre tiene varios sinérgicos).
    var towersInSynergy = {}; // idx → tower
    var connections = [];
    for (var i = 0; i < state.towers.length; i++) {
      var t = state.towers[i];
      if (!t.synActiveFrom || t.synActiveFrom.length === 0) continue;
      towersInSynergy[i] = t;
      for (var j = 0; j < t.synActiveFrom.length; j++) {
        var s = t.synActiveFrom[j];
        var sIdx = state.towers.indexOf(s);
        if (sIdx !== -1) towersInSynergy[sIdx] = s;
        connections.push({ receiver: t, source: s });
      }
    }
    if (Object.keys(towersInSynergy).length === 0) return;

    var time = state.time;

    // Pase 2: halos radiales pulsantes alrededor de cada torre en sinergia.
    for (var id in towersInSynergy) {
      var tw = towersInSynergy[id];
      var hpulse = 0.5 + 0.5 * Math.sin(time * 2.5 + parseInt(id) * 0.7);
      var rH = (28 + hpulse * 8) * U;
      ctx.save();
      var halo = ctx.createRadialGradient(tw.x, tw.y, 4 * U, tw.x, tw.y, rH);
      halo.addColorStop(0, colorAlpha(tw.def.color, 0.55));
      halo.addColorStop(0.45, colorAlpha(tw.def.color, 0.28 + hpulse * 0.10));
      halo.addColorStop(1, colorAlpha(tw.def.color, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(tw.x, tw.y, rH, 0, Math.PI * 2);
      ctx.fill();
      // Anillo fino externo pulsante.
      ctx.strokeStyle = colorAlpha(tw.def.color, 0.45 + hpulse * 0.35);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tw.x, tw.y, rH * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Pase 3: cuerda de energía + partículas fluyentes entre las dos torres.
    for (var c = 0; c < connections.length; c++) {
      var conn = connections[c];
      var ta = conn.receiver, sb = conn.source;
      var dx = sb.x - ta.x, dy = sb.y - ta.y;
      var distC = Math.sqrt(dx * dx + dy * dy);
      if (distC < 2) continue;
      var pulseC = 0.5 + 0.5 * Math.sin(time * 2 + c * 0.5);
      ctx.save();
      // Glow grueso debajo (con shadowBlur)
      var grad = ctx.createLinearGradient(ta.x, ta.y, sb.x, sb.y);
      grad.addColorStop(0, colorAlpha(ta.def.color, 0.85));
      grad.addColorStop(0.5, "rgba(255,255,255," + (0.55 + pulseC * 0.25) + ")");
      grad.addColorStop(1, colorAlpha(sb.def.color, 0.85));
      ctx.strokeStyle = grad;
      ctx.lineWidth = (2.4 + pulseC * 1.4) * U * 0.5;
      ctx.lineCap = "round";
      ctx.shadowColor = colorAlpha(ta.def.color, 0.55);
      ctx.shadowBlur = 6 + pulseC * 4;
      ctx.beginPath();
      ctx.moveTo(ta.x, ta.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Partículas que fluyen del receptor al source (sentido del buff).
      var nP = 4;
      for (var p = 0; p < nP; p++) {
        var phase = (time * 0.45 + p / nP) % 1;
        var px = ta.x + dx * phase;
        var py = ta.y + dy * phase;
        var t01 = phase; // 0 → receptor, 1 → fuente
        var pcol;
        if (t01 < 0.4) pcol = ta.def.color;
        else if (t01 > 0.6) pcol = sb.def.color;
        else pcol = "#ffffff";
        var pr = (2.0 + (1 - Math.abs(t01 - 0.5) * 2) * 1.5) * U;
        ctx.fillStyle = colorAlpha(pcol, 0.85);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Pase 4: texto flotante "+X%" sobre cada receptor para que el buff
    // sea legible sin tener que abrir el compendio.
    for (var ri = 0; ri < state.towers.length; ri++) {
      var rt = state.towers[ri];
      if (!rt.synBuff) continue;
      var buffText = "";
      if (rt.synBuff.damage > 1.001) buffText = "+" + Math.round((rt.synBuff.damage - 1) * 100) + "% DAÑO";
      else if (rt.synBuff.fireRate > 1.001) buffText = "+" + Math.round((rt.synBuff.fireRate - 1) * 100) + "% CADENCIA";
      else if (rt.synBuff.range > 1.001) buffText = "+" + Math.round((rt.synBuff.range - 1) * 100) + "% ALCANCE";
      if (!buffText) continue;
      var tp = 0.5 + 0.5 * Math.sin(time * 3 + ri * 0.6);
      var tY = rt.y - 28 * U - tp * 3;
      ctx.save();
      ctx.font = "bold " + Math.floor(10 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Background pill
      var tw = ctx.measureText(buffText).width;
      ctx.fillStyle = "rgba(20, 10, 14, 0.85)";
      ctx.fillRect(rt.x - tw / 2 - 5, tY - 7, tw + 10, 14);
      ctx.fillStyle = colorAlpha(rt.def.color, 0.95);
      ctx.fillText(buffText, rt.x, tY);
      ctx.restore();
    }
  }
  // ============ FIN SINERGIAS ============

  function updateTowers(dt) {
    // Recalcula sinergias por proximidad al inicio del frame (O(n²)
    // pero con n<20 es trivial).
    computeSynergyBuffs();
    for (var i = 0; i < state.towers.length; i++) {
      var t = state.towers[i];
      // Blink ticks
      if (t.blinkTimer > 0) t.blinkTimer -= dt;
      else if (state.time >= t.nextBlink) {
        t.blinkTimer = 0.10;
        t.nextBlink = state.time + 2.5 + Math.random() * 3;
      }
      if (t.attackAnim > 0) t.attackAnim -= dt;
      if (t.levelupAnim > 0) t.levelupAnim -= dt;
      if (t.cooldown > 0) t.cooldown -= dt;
      if (t.muzzleFlash > 0) t.muzzleFlash -= dt;
      // Estreptolisina O: DoT activo mientras lisisTimer > 0.
      if ((t.lisisTimer || 0) > 0) {
        t.lisisTimer -= dt;
        var lisisDmg = (t.lisisDps || 0) * dt;
        if (lisisDmg > 0) {
          t.hp -= lisisDmg;
          t.dmgAccum = (t.dmgAccum || 0) + lisisDmg;
        }
      }
      if (t.hitFlash > 0) t.hitFlash -= dt;
      // Número de daño flotante: pop periódico del daño acumulado del aura.
      if ((t.dmgAccum || 0) > 0) {
        t.dmgNumTimer = (t.dmgNumTimer || 0) - dt;
        if (t.dmgNumTimer <= 0) {
          pushDamageNumber(t.x + (Math.random() - 0.5) * 10 * U, t.y - 24 * U,
            "-" + Math.max(1, Math.round(t.dmgAccum)), "#ff5252");
          t.dmgAccum = 0;
          t.dmgNumTimer = 0.4;
        }
      }
      // El cañón MAC se consume solo (vida que decae con el tiempo).
      if (t.def.lifetimeDecay) t.hp -= t.def.lifetimeDecay * dt;
      // Sin recuperación: a 0 de vida la torre muere y desaparece.
      if (t.hp <= 0) {
        for (var pk = 0; pk < 12; pk++) {
          var pa = Math.random() * Math.PI * 2, ps = (20 + Math.random() * 40) * U;
          pushEffect({ kind: "particle", x: t.x, y: t.y,
            vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps - 10 * U,
            life: 0.5, max: 0.6, color: t.def.color });
        }
        pushEffect({ kind: "placeFlash", x: t.x, y: t.y, life: 0.3, max: 0.3 });
        // La célula caída refuerza el medicamento sanguíneo (+1 bloque).
        state.medCharge = Math.min(MED_MAX, state.medCharge + MED_PER_TOWER_DEATH);
        showMsg(t.def.name + " cayó — el medicamento sanguíneo se refuerza");
        sfx("sell");
        if (state.selectedTower === t) { state.selectedTower = null; clearRangeHint(); }
        state.towers.splice(i, 1); i--;
        continue;
      }
      // Poderes de gérmenes: paralización (no dispara) y cadencia lenta.
      if (t.stunTimer > 0) t.stunTimer -= dt;
      if (t.slowFireTimer > 0) t.slowFireTimer -= dt;
      if (t.stunTimer > 0 || t.devouredBy) continue;   // paralizada / siendo devorada
      if (t.cooldown > 0) continue;
      var stats = towerStats(t);
      var rangePx = stats.range * U;
      // Cañón manual: no autoataca; el jugador apunta y dispara desde handleClick.
      if (t.def.manualFire) continue;
      // Torres de SOPORTE: aplican aura a todos los gérmenes en rango (sin
      // objetivo único). Langerhans marca (+daño y revela); Mastocito ralentiza.
      if (t.def.support) {
        var acted = false;
        for (var sj = 0; sj < state.enemies.length; sj++) {
          var se = state.enemies[sj];
          if (se.dead || se.dying || se.absorbing || se.state === "falling" || se.state === "entering") continue;
          if (Math.hypot(se.x - t.x, se.y - t.y) > rangePx) continue;
          acted = true;
          if (t.def.support === "mark") {
            // Si el germen no estaba marcado, lanzar un dardo visual desde la
            // Langerhans hacia el germen y dejarle un "splat" cian fijo.
            var wasMarked = (se.markTimer || 0) > 0;
            se.markTimer = stats.markDur; se.markBonus = stats.markBonus; se.revealed = true;
            if (!wasMarked) {
              // Posición del splat sobre el cuerpo del germen (ángulo + radio).
              se.markSplatAngle = Math.random() * Math.PI * 2;
              se.markSplatR = 0.45 + Math.random() * 0.30;
              pushEffect({
                kind: "markDart",
                x: t.x, y: t.y, tx: se.x, ty: se.y,
                travel: 0.35, life: 0.35, max: 0.35,
                color: t.def.color
              });
            }
          } else if (t.def.support === "slow") {
            se.slowTimer = Math.max(se.slowTimer || 0, stats.slowDur);
            if ((stats.dotPerSec || 0) > 0) damageEnemy(se, stats.dotPerSec * 0.4, t.def.id);
          }
        }
        if (acted) { t.attackAnim = 0.2; t.muzzleFlash = 0.06; }
        t.cooldown = 0.4;   // cadencia del tic de aura
        continue;
      }
      var target = null, bestProgress = -1;
      for (var j = 0; j < state.enemies.length; j++) {
        var e = state.enemies[j];
        if (e.dead || e.dying || e.absorbing || e.state === "falling" || e.state === "entering") continue;
        if (e.burrowed && !e.revealed) continue;   // sarna enterrada: intocable salvo si está marcada
        var d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d <= rangePx && e.progress > bestProgress) {
          bestProgress = e.progress;
          target = e;
        }
      }
      if (target) {
        fireTower(t, target);
        t.cooldown = (1 / stats.fireRate) * (t.slowFireTimer > 0 ? 2 : 1);
        t.muzzleFlash = 0.08;
        t.attackAnim = 0.20;
        if (t.def.id === "neutrofilo") sfx("macroAttack");
        else if (t.def.id === "linfocitoB") sfx("linfBAttack");
        else sfx("linfTAttack");
      }
    }
  }

  function fireTower(t, target) {
    var stats = towerStats(t);
    t.lastTargetX = target.x; t.lastTargetY = target.y;   // para apuntar el cañón
    var dmg = stats.damage;
    // Bonus de especialista: NK vs virus, Eosinófilo vs parásitos.
    if (t.def.bonusVs && target.def.baseKind === t.def.bonusVs.kind) dmg *= t.def.bonusVs.mult;
    if (stats.projectileSpeed === 0) {
      damageEnemy(target, dmg, t.def.id);
      pushEffect({ kind: "melee", x1: t.x, y1: t.y, x2: target.x, y2: target.y, life: 0.18, max: 0.18, color: t.def.color });
    } else {
      state.projectiles.push({
        x: t.x, y: t.y,
        target: target,
        damage: dmg,
        speedDesign: stats.projectileSpeed,
        splashDesign: stats.splash,
        color: t.def.color,
        towerId: t.def.id,
        attackerType: t.def.id,
        slowOnHit: t.def.slowOnHit || null,   // {dur, mult} — Plaqueta lo usa
        rot: 0,
        dead: false
      });
    }
  }

  // Al morir, el germen ESTALLA: daño leve (5-6) a personajes en un radio 15%
  // mayor que su radio de daño de tránsito.
  // Parches necróticos de S. pyogenes: gotas rojas en el path que dañan
  // células-guardian (Macrófago Libre, T temporales) al tocarlas.
  function updateNecroticPatches(dt) {
    if (!state.necroticPatches) return;
    var arr = state.necroticPatches;
    for (var i = arr.length - 1; i >= 0; i--) {
      var p = arr[i];
      p.age += dt;
      if (p.age >= p.ttl) { arr.splice(i, 1); continue; }
      // Daño a guardians y T temporales en el área.
      if (state.guardians) {
        for (var gi = 0; gi < state.guardians.length; gi++) {
          var g = state.guardians[gi];
          if (g.dead) continue;
          var dx = g.x - p.x, dy = g.y - p.y;
          if (dx * dx + dy * dy <= p.r * p.r) {
            g.hp -= p.dmgPerSec * dt;
            g.hitFlash = 0.10;
          }
        }
      }
    }
  }

  function drawNecroticPatches() {
    if (!state.necroticPatches) return;
    var arr = state.necroticPatches;
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      var fadeIn = Math.min(1, p.age / 0.4);
      var fadeOut = p.age > p.ttl - 1 ? Math.max(0, 1 - (p.age - (p.ttl - 1))) : 1;
      var alpha = fadeIn * fadeOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      var grd = ctx.createRadialGradient(p.x, p.y, p.r * 0.2, p.x, p.y, p.r);
      grd.addColorStop(0, "rgba(140, 20, 20, 0.85)");
      grd.addColorStop(0.6, "rgba(110, 10, 14, 0.50)");
      grd.addColorStop(1, "rgba(60, 4, 8, 0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      // Burbujas oscuras orgánicas
      var seed = (p.x * 13 + p.y) | 0;
      for (var bi = 0; bi < 5; bi++) {
        var ba = (bi / 5) * Math.PI * 2 + (seed % 7);
        var br = p.r * 0.55;
        var bx = p.x + Math.cos(ba) * br;
        var by = p.y + Math.sin(ba) * br;
        ctx.fillStyle = "rgba(50, 8, 10, " + (0.4 * alpha) + ")";
        ctx.beginPath();
        ctx.arc(bx, by, p.r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // S. epidermidis libera una "modulina" (PSM, real en su biofilm) al morir.
  // La toxina vuela hacia la torre POTENCIADORA más cercana (Langerhans o
  // Mastocito — las que dan buff al resto del equipo). Si no hay potenciadora
  // a tiro, no hace nada (es un castigo dirigido a los soportes).
  function releaseSepidermidisToxin(e) {
    if (!state.towers || state.towers.length === 0) return;
    var bestT = null, bestD = Infinity;
    var reach = 220 * U;
    for (var i = 0; i < state.towers.length; i++) {
      var t = state.towers[i];
      if (t.devouredBy) continue;
      // Buscar solo potenciadoras (Langerhans, Mastocito).
      if (t.def.id !== "langerhans" && t.def.id !== "mastocito") continue;
      var dx = t.x - e.x, dy = t.y - e.y;
      var d2 = dx * dx + dy * dy;
      if (d2 > reach * reach) continue;
      if (d2 < bestD) { bestD = d2; bestT = t; }
    }
    if (!bestT) return;
    var dmg = Math.max(2, Math.round(bestT.maxHp * 0.05));
    state.germShots.push({
      type: "modulin", x: e.x, y: e.y, tx: bestT.x, ty: bestT.y, target: bestT,
      color: "#c8e070", t: 0,
      dmg: dmg, stun: 0, slowFire: 0, dead: false
    });
  }

  function germExplode(e) {
    var r = enemyAuraRadiusPx(e.def) * 1.15;
    var dmg = 5 + Math.floor(Math.random() * 2);   // 5 ó 6
    for (var i = 0; i < state.towers.length; i++) {
      var t = state.towers[i];
      if (t.devouredBy) continue;
      if (Math.hypot(t.x - e.x, t.y - e.y) < r) {
        t.hp -= dmg; t.hitFlash = 0.16; t.dmgAccum = (t.dmgAccum || 0) + dmg;
      }
    }
    if (state.guardians) {
      for (var gi = 0; gi < state.guardians.length; gi++) {
        var g = state.guardians[gi];
        if (g.state === "fleeing") continue;
        if (Math.hypot(g.x - e.x, g.y - e.y) < r) { g.hp -= dmg; g.hitFlash = 0.16; }
      }
    }
    pushEffect({ kind: "shock", x: e.x, y: e.y, r: r, life: 0.4, max: 0.4, color: e.def.color });
    for (var p = 0; p < 8; p++) {
      var pa = Math.PI * 2 * p / 8, sp = (40 + Math.random() * 40) * U;
      pushEffect({ kind: "particle", x: e.x, y: e.y, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp, life: 0.35, max: 0.45, color: e.def.color });
    }
  }

  // Sprint 6: shielded damage. attackerType lets the VIH spike-shield enforce
  // the "only Linfocito T citotoxico can pierce" rule.
  function damageEnemy(e, amount, attackerType) {
    if (e.dead || e.dying) return;
    // Sarna enterrada: invulnerable salvo que esté marcada (Langerhans).
    if (e.burrowed && !e.revealed) return;
    var def = e.def;
    // Marca de Langerhans: amplifica TODO el daño recibido mientras dura.
    if ((e.markTimer || 0) > 0 && (e.markBonus || 0) > 0) amount *= (1 + e.markBonus);
    var bodyDamage = amount;
    var dmgLabel = "-" + Math.round(amount);
    var dmgColor = "#FFD93D";
    // El Complemento (MAC) y el antibiótico son químicos: ignoran el escudo.
    if (def.shield && e.shieldHP > 0 && attackerType !== "complemento") {
      var sd = def.shield;
      if (sd.requiresT && attackerType !== "linfocitoT") {
        // Spike-shield rebote: 5% damage to body, no shield decrement.
        bodyDamage = amount * 0.05;
        dmgLabel = "✕" + Math.max(1, Math.round(bodyDamage));
        dmgColor = "#888888";
      } else {
        // Capsula / wall / pierced spike: shield absorbs 70%, body 30%, -1 hit.
        // La Célula NK rompe escudos virales: pasa 60% al cuerpo y -2 al escudo.
        var pierce = (attackerType === "nk");
        bodyDamage = amount * (pierce ? 0.60 : 0.30);
        e.shieldHP = Math.max(0, e.shieldHP - (pierce ? 2 : 1));
        e.shieldRegenTimer = sd.regenDelay || 0;
        e.shieldRegenAccum = 0;
        e.shieldHitTimer = 0.20;
        if (e.shieldHP === 0) {
          e.shieldShatterTimer = 0.45;
          // HPV: al romper la queratina se ENFURECE (+vel/+daño) y no regenera.
          if (def.id === "hpv" && !e.enraged) {
            e.enraged = true; e.noShieldRegen = true;
            pushDamageNumber(e.x, e.y - def.radius * U - 4, "¡FURIA!", "#ff4d4d");
          }
          // Burst of capsule particles
          for (var sp = 0; sp < 10; sp++) {
            var sa = Math.random() * Math.PI * 2;
            pushEffect({
              kind: "particle",
              x: e.x, y: e.y,
              vx: Math.cos(sa) * 70 * U,
              vy: Math.sin(sa) * 70 * U,
              life: 0.4, max: 0.5,
              color: shieldGlowColor(sd.type)
            });
          }
        }
        dmgLabel = "-" + Math.round(bodyDamage) + " ◇";
        dmgColor = "#FFE680";
      }
    }
    e.hp -= bodyDamage;
    e.hitFlash = 0.18;
    e.hurtTimer = 0.15;
    pushDamageNumber(
      e.x + (Math.random() * 12 - 6) * U,
      e.y - e.def.radius * U - 2 * U,
      dmgLabel,
      dmgColor
    );
    if (e.hp <= 0) {
      e.hp = 0;
      e.dying = true;
      e.dyingTimer = 0.30;
      state.atp += def.reward;
      state.pathogensDefeated += 1;
      META.totalPathogensDefeated += 1;
      // Cada germen vencido carga el TÓPICO (ácido). El sanguíneo se carga con
      // la muerte de TUS células (ver updateTowers).
      if (!state.dissemination) {
        state.topicalCharge = Math.min(TOPICAL_MAX, state.topicalCharge + (def.isBoss ? TOPICAL_PER_BOSS : TOPICAL_PER_KILL));
      }
      // S. epidermidis al morir libera una "modulina" (PSM real de su biofilm)
      // que busca la torre potenciadora más cercana y le hace 5% maxHP de daño.
      if (def.id === "sepidermidis") releaseSepidermidisToxin(e);
      germExplode(e);   // estalla y daña a los personajes cercanos
      // Molluscum: al morir se DIVIDE en mini-molluscum (salvo que ya sea hijo).
      if (def.deathSplit && !e.noSplit && !e.absorbing) {
        for (var ds = 0; ds < (def.deathSplit.count || 2); ds++) {
          spawnSplit(e, def.deathSplit.hpFrac || 0.35);
        }
      }
      // Suelta un fragmento de complemento (C3b) que el jugador puede recoger.
      // Solo aparece cuando el jugador YA tiene MAC desbloqueado en su dock —
      // antes era frustrante acumular C3b sin tener torre para usarlo.
      var hasMac = state.unlockedTowers && state.unlockedTowers.indexOf("complemento") !== -1;
      if (hasMac && state.complement < MAC_COST && Math.random() < (def.isBoss ? 1 : 0.30)) {
        spawnFragment(e.x, e.y);
      }
      pushEffect({
        kind: "atpText",
        x: e.x, y: e.y - def.radius * U - 4,
        vy: -36 * U,
        text: "+" + def.reward + " ATP",
        life: 0.85, max: 0.85,
        color: "#f5d76e"
      });
    }
  }

  // Hijo de división por muerte (molluscum): nace en el sitio, sin volver a
  // dividirse ni soltar perlas, con una fracción de la vida y disperso un poco.
  function spawnSplit(m, hpFrac) {
    var chp = Math.max(1, Math.round(m.maxHp * hpFrac));
    var jitter = (Math.random() - 0.5) * 10 * U;
    state.enemies.push({
      def: m.def, hp: chp, maxHp: chp,
      speedMultLevel: m.speedMultLevel, heridaIdx: m.heridaIdx,
      state: "walking", outsideTimer: 0,
      progress: Math.max(0, m.progress - 4 * U + jitter),
      powerCd: 0, powerCharge: 0, powerTarget: null, devourTarget: null,
      swallowAnim: 0, mawOpen: 0, speedBoost: 1, radiusScale: 0.62,
      noSpore: true, noSplit: true, childCount: 0, childTimer: 0,
      burrowTimer: 0, burrowed: false, surfaceTimer: 0, revealed: false,
      x: m.x, y: m.y, vx: 0, vy: 0, fallRot: 0, fallRotSpd: 0, enteringTimer: 0,
      wobble: Math.random() * Math.PI * 2, hitFlash: 0, hurtTimer: 0, dyingTimer: 0,
      dying: false, enraged: false, sporeTimer: Math.random(),
      blinkTimer: 0, nextBlink: state.time + 2 + Math.random() * 3,
      absorbing: false, absorbScale: 1, absorbAlpha: 1,
      absorbStartX: 0, absorbStartY: 0, absorbTargetX: 0, absorbTargetY: 0,
      absorbStartTime: 0, absorbedRot: 0,
      shieldHP: 0, shieldRegenTimer: 0, shieldRegenAccum: 0,
      shieldShatterTimer: 0, shieldHitTimer: 0,
      tooltipShown: true, dead: false
    });
    for (var s = 0; s < 4; s++) { var a = Math.random() * Math.PI * 2, spd = (15 + Math.random() * 20) * U; pushEffect({ kind: "particle", x: m.x, y: m.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.3, max: 0.4, color: m.def.color }); }
  }

  function shieldGlowColor(type) {
    if (type === "spike") return "rgba(100, 181, 246, 0.85)";
    if (type === "wall")  return "rgba(197, 225, 165, 0.85)";
    return "rgba(255, 245, 157, 0.85)";  // capsula
  }

  // -------- MACRÓFAGO autónomo (ronda, muerde y FAGOCITA) -----------------
  var GUARDIAN_INTERVAL = 28;     // s entre apariciones
  var GUARDIAN_MAX = 2;           // vivos a la vez
  var GUARDIAN_HP = 80;
  var GUARDIAN_BITE_DMG = 30;
  var GUARDIAN_BITE_CD = 0.8;
  var GUARDIAN_BITE_RANGE = 30;   // px diseño (* U)
  var GUARDIAN_SPEED = 70;        // px diseño/s (* U)
  var GUARDIAN_CRIT = 0.30;       // se retira al 30% de vida
  var ENGULF_SEEK = 150;          // px diseño: detecta germen vulnerable
  var ENGULF_RANGE = 26;          // px diseño: distancia para empezar a engullir
  var ENGULF_TIME = 0.9;          // s que tarda la fagocitosis

  // Libera al germen que el macrófago estaba engullendo (al huir/morir): se
  // restaura su tamaño y vuelve a avanzar (evita que quede chico y atascado).
  function releaseEngulf(g) {
    var e = g.engulfTarget;
    if (e && !e.dead) { e.beingEngulfed = false; e.engulfScale = null; }
    g.engulfTarget = null; g.mouthOpen = 0;
  }

  // Fagocitosis: el macrófago se traga a un germen detenido/ralentizado.
  function updateGuardianEngulf(g, dt) {
    var e = g.engulfTarget;
    if (!e || e.dead || e.dying || state.enemies.indexOf(e) === -1) {
      if (e) e.beingEngulfed = false;
      g.engulfTarget = null; g.mouthOpen = 0; return;
    }
    g.engulfT += dt;
    var k = Math.min(1, g.engulfT / ENGULF_TIME);
    g.mouthOpen = Math.sin(Math.min(1, k * 1.2) * Math.PI * 0.5);  // abre rápido
    // El macrófago se posa sobre el germen; el germen se encoge hacia su boca.
    var mouthX = g.x, mouthY = g.y + 10 * U * g.scale;
    e.engulfScale = Math.max(0.05, 1 - k);
    // Bamboleo de "masticar" mientras succiona.
    e.x = g.engulfSx + (mouthX - g.engulfSx) * k + Math.sin(state.time * 30) * 2 * U * (1 - k);
    e.y = g.engulfSy + (mouthY - g.engulfSy) * k;
    // Partículas de succión del germen hacia la boca.
    if (Math.random() < 0.5) {
      pushEffect({ kind: "particle", x: e.x + (Math.random() - 0.5) * 10 * U, y: e.y,
        vx: (mouthX - e.x) * 2, vy: (mouthY - e.y) * 2 - 6 * U,
        life: 0.25, max: 0.3, color: e.def.color });
    }
    if (k >= 1) {
      // ¡Fagocitado! El germen desaparece dentro del macrófago.
      e.beingEngulfed = false;
      e.engulfScale = null;
      if (!e.dying) {
        if (state.dissemination && !e.antigenSpawned) {
          spawnAntigenDrop(e.x, e.y);
          e.antigenSpawned = true;
        }
        e.dead = true;
        state.atp += e.def.reward; state.pathogensDefeated += 1; META.totalPathogensDefeated += 1;
        pushEffect({ kind: "atpText", x: g.x, y: g.y - 22 * U, vy: -36 * U,
          text: "+" + e.def.reward + " ATP", life: 0.8, max: 0.8 });
      }
      for (var pk = 0; pk < 10; pk++) {
        var pa = Math.random() * Math.PI * 2, ps = (15 + Math.random() * 30) * U;
        pushEffect({ kind: "particle", x: g.x, y: g.y, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps - 8 * U, life: 0.4, max: 0.5, color: e.def.color });
      }
      g.swallow = 0.6; g.mouthOpen = 0; g.engulfTarget = null;
      pushDamageNumber(g.x, g.y - 24 * U, "¡ÑAM!", "#ffd24a");
      sfx("sell");
    }
  }

  function spawnGuardian() {
    // En Fase 1 necesitamos PATH.confluence para orientarse. En diseminación
    // el path son 5 carriles sin confluencia: igual entra de un costado y
    // patrulla buscando gérmenes vulnerables.
    if (!PATH.confluence && !state.dissemination) return;
    var fromLeft = Math.random() < 0.5;
    var x = fromLeft ? FIELD_LEFT - 20 * U : FIELD_RIGHT + 20 * U;
    var y = FIELD_TOP + FIELD_H * (0.35 + Math.random() * 0.4);
    state.guardians.push({
      x: x, y: y, vx: 0, vy: 0,
      hp: GUARDIAN_HP, maxHp: GUARDIAN_HP,
      state: "roaming", alpha: 1, scale: 1,
      biteCd: 0, wobble: Math.random() * Math.PI * 2,
      blinkTimer: 0, nextBlink: state.time + 2 + Math.random() * 3,
      tearTimer: 0, hitFlash: 0, attackAnim: 0,
      mouthOpen: 0, swallow: 0, engulfTarget: null, engulfT: 0,
      shape: Math.random() * Math.PI * 2
    });
    showMsg("¡Macrófago al rescate!");
  }

  function updateGuardians(dt) {
    // Aparición periódica (tras oleada 2).
    state.guardianTimer -= dt;
    if (state.guardianTimer <= 0) {
      state.guardianTimer = GUARDIAN_INTERVAL;
      // En diseminación, el macrófago de apoyo aparece desde la primera oleada
      // (la barrera ya cayó y el ataque es masivo). En Fase 1 sigue siendo
      // a partir de la oleada 2.
      var minWave = state.dissemination ? 1 : 2;
      if (state.waveIdx >= minWave && state.guardians.length < GUARDIAN_MAX) spawnGuardian();
    }
    var speed = GUARDIAN_SPEED * U;
    for (var i = 0; i < state.guardians.length; i++) {
      var g = state.guardians[i];
      if (g.kind === "dendriticT") {
        g.age += dt;
        if (g.age >= g.ttl) { g.dead = true; continue; }
        g.attackCd = Math.max(0, g.attackCd - dt);
        if (!g.target || g.target.dead) {
          var best = null, bestDist = Infinity;
          for (var ei = 0; ei < state.enemies.length; ei++) {
            var en = state.enemies[ei];
            if (en.dead) continue;
            var dx = en.x - g.x, dy = en.y - g.y;
            var d2 = dx*dx + dy*dy;
            if (d2 < bestDist) { bestDist = d2; best = en; }
          }
          g.target = best;
        }
        if (g.target) {
          var tdx = g.target.x - g.x, tdy = g.target.y - g.y;
          var td = Math.sqrt(tdx*tdx + tdy*tdy) || 1;
          if (td > 14 * U) {
            g.x += (tdx / td) * g.speed * dt;
            g.y += (tdy / td) * g.speed * dt;
          } else if (g.attackCd <= 0) {
            g.target.hp = (g.target.hp || 1) - g.damage;
            g.attackCd = g.attackInterval;
            if (g.target.hp <= 0) {
              if (!g.target.antigenSpawned) {
                spawnAntigenDrop(g.target.x, g.target.y);
                g.target.antigenSpawned = true;
              }
              g.target.dead = true;
            }
          }
        }
        continue;
      }
      g.wobble += dt * 5;
      if (g.biteCd > 0) g.biteCd -= dt;
      if (g.hitFlash > 0) g.hitFlash -= dt;
      if (g.attackAnim > 0) g.attackAnim -= dt;
      if (g.swallow > 0) g.swallow -= dt;
      if (g.blinkTimer > 0) g.blinkTimer -= dt;
      else if (state.time >= g.nextBlink) { g.blinkTimer = 0.1; g.nextBlink = state.time + 2 + Math.random() * 3; }

      if (g.state === "fleeing") {
        // Huye llorando hacia el borde y se desvanece.
        var fdx = g.targetX - g.x, fdy = g.targetY - g.y;
        var fd = Math.hypot(fdx, fdy) || 1;
        g.x += (fdx / fd) * speed * 1.8 * dt;
        g.y += (fdy / fd) * speed * 1.8 * dt;
        g.alpha -= dt / 2;
        g.scale = Math.max(0.4, g.scale - dt * 0.35);
        g.tearTimer -= dt;
        if (g.tearTimer <= 0) {
          g.tearTimer = 0.18;
          var tang = Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
          pushEffect({ kind: "particle", x: g.x, y: g.y + 4 * U,
            vx: Math.cos(tang) * 30 * U * (Math.random() < 0.5 ? -1 : 1),
            vy: -Math.abs(Math.sin(tang)) * 40 * U,
            life: 0.5, max: 0.6, color: "rgba(120, 200, 255, 0.9)" });
        }
        if (g.alpha <= 0) { g.dead = true; }
        continue;
      }

      // Roaming: recibe daño de gérmenes agresivos cercanos (misma aura).
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.dead || !en.def.attack) continue;
        if (en.state !== "walking" && en.state !== "blocked") continue;
        if (Math.hypot(en.x - g.x, en.y - g.y) < enemyAuraRadiusPx(en.def)) {
          g.hp -= en.def.attack * ATTACK_MULT * dt;
          g.hitFlash = 0.16;
        }
      }
      if (g.hp <= g.maxHp * GUARDIAN_CRIT) {
        // ¡Pánico! Se retira (llorando) al borde más cercano.
        g.state = "fleeing"; releaseEngulf(g);
        var leftDist = g.x - FIELD_LEFT, rightDist = FIELD_RIGHT - g.x;
        g.targetX = (leftDist < rightDist) ? FIELD_LEFT - 60 * U : FIELD_RIGHT + 60 * U;
        g.targetY = g.y - 30 * U;
        sfx("playerHurt");
        showMsg("¡El macrófago se retira!");
        continue;
      }

      // Fagocitosis en curso (engullendo un germen detenido).
      if (g.engulfTarget) { updateGuardianEngulf(g, dt); continue; }
      if (g.mouthOpen > 0) g.mouthOpen = Math.max(0, g.mouthOpen - dt * 3);

      // PRIORIDAD: germen VULNERABLE cercano (lento/paralizado/atascado) -> engullir.
      var vuln = null, vd = Infinity;
      for (var vi = 0; vi < state.enemies.length; vi++) {
        var ve = state.enemies[vi];
        if (ve.dead || ve.dying || ve.absorbing || ve.beingEngulfed) continue;
        if (ve.state !== "walking" && ve.state !== "blocked") continue;
        var vulnerable = (ve.slowTimer > 0) || (ve.stunTimer > 0) || (ve.state === "blocked");
        if (!vulnerable) continue;
        var vdd = Math.hypot(ve.x - g.x, ve.y - g.y);
        if (vdd < vd) { vd = vdd; vuln = ve; }
      }
      if (vuln && vd < ENGULF_SEEK * U) {
        if (vd > ENGULF_RANGE * U) {
          var vdx = vuln.x - g.x, vdy = vuln.y - g.y, vdl = Math.hypot(vdx, vdy) || 1;
          g.x += (vdx / vdl) * speed * 1.2 * dt;   // se lanza un poco más rápido
          g.y += (vdy / vdl) * speed * 1.2 * dt;
        } else {
          g.engulfTarget = vuln; vuln.beingEngulfed = true;
          g.engulfT = 0; g.engulfSx = vuln.x; g.engulfSy = vuln.y;
          sfx("macroAttack");
        }
        continue;
      }

      // Busca el germen "walking" más cercano y se acerca a morderlo.
      var target = null, bestD = Infinity;
      for (var ti = 0; ti < state.enemies.length; ti++) {
        var t = state.enemies[ti];
        if (t.dead || t.dying || t.absorbing || t.state !== "walking") continue;
        var d = Math.hypot(t.x - g.x, t.y - g.y);
        if (d < bestD) { bestD = d; target = t; }
      }
      if (target) {
        var biteR = GUARDIAN_BITE_RANGE * U;
        if (bestD > biteR) {
          var dx = target.x - g.x, dy = target.y - g.y, dd = Math.hypot(dx, dy) || 1;
          g.x += (dx / dd) * speed * dt;
          g.y += (dy / dd) * speed * dt;
        } else if (g.biteCd <= 0) {
          damageEnemy(target, GUARDIAN_BITE_DMG, "neutrofilo");
          g.biteCd = GUARDIAN_BITE_CD;
          g.attackAnim = 0.2;
          pushEffect({ kind: "melee", x1: g.x, y1: g.y, x2: target.x, y2: target.y, life: 0.18, max: 0.18, color: "#fff" });
        }
      } else {
        // Sin objetivo: deriva suave hacia el centro del campo.
        var cx = FIELD_LEFT + FIELD_W * 0.5, cy = FIELD_TOP + FIELD_H * 0.55;
        g.x += (cx - g.x) * 0.4 * dt;
        g.y += (cy - g.y) * 0.4 * dt;
      }
    }
    state.guardians = state.guardians.filter(function (g) { return !g.dead; });
    // Red de seguridad: germen marcado como engullido sin macrófago que lo
    // sostenga -> liberarlo (restaura tamaño y avance).
    for (var ri = 0; ri < state.enemies.length; ri++) {
      var re = state.enemies[ri];
      if (!re.beingEngulfed) continue;
      var held = false;
      for (var rg = 0; rg < state.guardians.length; rg++) {
        if (state.guardians[rg].engulfTarget === re) { held = true; break; }
      }
      if (!held) { re.beingEngulfed = false; re.engulfScale = null; }
    }
  }

  function drawGuardians() {
    if (!state.guardians) return;
    for (var i = 0; i < state.guardians.length; i++) drawGuardian(state.guardians[i]);
  }

  function drawGuardian(g) {
    if (g.kind === "dendriticT") {
      var alpha = g.age > g.ttl - 1 ? Math.max(0, 1 - (g.age - (g.ttl - 1))) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#d090e0";
      ctx.strokeStyle = "#5a2a85";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 10 * U, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("T", g.x, g.y);
      ctx.restore();
      return;
    }
    var fleeing = g.state === "fleeing";
    var maw = g.mouthOpen || 0;                 // 0..1 al engullir
    var swallow = g.swallow || 0;
    var R = 24 * U * g.scale * (1 + Math.sin(g.wobble) * 0.05);  // más grande
    var COL = "#E8923A", COLD = "#A8581A";       // ámbar macrófago
    var seed = g.shape || 0;
    ctx.save();
    ctx.globalAlpha = Math.max(0, g.alpha);
    drawShadow(g.x, g.y + 18 * U * g.scale, 18 * U * g.scale, 5 * U * g.scale);
    var gl = ctx.createRadialGradient(g.x, g.y, R * 0.4, g.x, g.y, R * 2.2);
    gl.addColorStop(0, "rgba(245, 180, 110, 0.30)");
    gl.addColorStop(1, "rgba(245, 180, 110, 0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(g.x, g.y, R * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.translate(g.x, g.y);
    // Gulp: squash-stretch al tragar (se ensancha y achata).
    if (swallow > 0) { var sw = swallow / 0.6; ctx.scale(1 + sw * 0.40, 1 - sw * 0.22); }
    // DEDOS DE GUANTE: seudópodos redondeados (con yema) que se estiran al
    // atacar/engullir, como una mano que agarra.
    var reach = (maw > 0.05 || g.attackAnim > 0) ? 1.45 : 1.0;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    var nF = 6, b0 = R * 0.58;
    for (var f = 0; f < nF; f++) {
      var fa = f / nF * Math.PI * 2 + seed * 0.5 + Math.sin(state.time * 1.6 + f) * 0.10;
      var fl = R * (0.50 + 0.55 * Math.abs(Math.sin(f * 2.1 + seed))) * reach;
      var bend = Math.sin(state.time * 3 + f * 1.5) * R * 0.16;
      var bx = Math.cos(fa) * b0, by = Math.sin(fa) * b0;
      var tx = Math.cos(fa) * (b0 + fl), ty = Math.sin(fa) * (b0 + fl);
      var nx = -Math.sin(fa), ny = Math.cos(fa);
      var mx = (bx + tx) / 2 + nx * bend, my = (by + ty) / 2 + ny * bend;
      ctx.strokeStyle = COLD; ctx.lineWidth = R * 0.50;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.strokeStyle = (g.hitFlash > 0) ? "#ffd0d0" : COL; ctx.lineWidth = R * 0.40;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.fillStyle = (g.hitFlash > 0) ? "#ffd0d0" : COL;
      ctx.strokeStyle = COLD; ctx.lineWidth = 1.3 * U;
      ctx.beginPath(); ctx.arc(tx, ty, R * 0.21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // Cuerpo central redondeado.
    var body = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R * 0.95);
    body.addColorStop(0, "#f7cf95");
    body.addColorStop(0.6, COL);
    body.addColorStop(1, COLD);
    ctx.fillStyle = g.hitFlash > 0 ? "#ffd0d0" : body;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.80, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLD; ctx.lineWidth = 1.6 * U; ctx.stroke();
    ctx.fillStyle = "rgba(150, 80, 30, 0.28)";
    ctx.beginPath(); ctx.ellipse(R * 0.16, R * 0.06, R * 0.28, R * 0.22, 0.4, 0, Math.PI * 2); ctx.fill();
    var eyeR = R * 0.20, gap = R * 0.30, faceY = -R * 0.12;
    if (maw > 0.05) {
      // ¡Fagocitando! Ojos apretados de esfuerzo + BOCA enorme abierta.
      drawFocusedEyes(0, faceY, eyeR, gap, R * 0.18, R * 0.06);
      ctx.fillStyle = "rgba(15, 25, 45, 0.92)";
      ctx.beginPath();
      ctx.ellipse(0, R * 0.28, R * (0.35 + 0.55 * maw), R * (0.25 + 0.6 * maw), 0, 0, Math.PI * 2);
      ctx.fill();
      // lengua/borde
      ctx.strokeStyle = "#ff9bb0"; ctx.lineWidth = 2 * U;
      ctx.beginPath(); ctx.ellipse(0, R * 0.28, R * (0.35 + 0.55 * maw), R * (0.25 + 0.6 * maw), 0, 0, Math.PI * 2); ctx.stroke();
    } else if (fleeing) {
      drawHurtEyes(0, faceY, eyeR, gap);
      drawAnimeMouth(0, R * 0.42, R * 0.5, R * 0.5, "open");
      ctx.fillStyle = "rgba(120, 200, 255, 0.9)";
      var ty = faceY + eyeR + (Math.sin(g.wobble * 2) * 0.5 + 0.5) * R * 0.3;
      ctx.beginPath(); ctx.arc(-gap, ty, R * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gap, ty, R * 0.12, 0, Math.PI * 2); ctx.fill();
    } else if (swallow > 0) {
      // Tragó: ojos felices + boca cerrada satisfecha.
      drawSparkleEyes(0, faceY, eyeR, gap);
      drawAnimeMouth(0, R * 0.34, R * 0.4, R * 0.18, "smile");
    } else if (g.blinkTimer > 0) {
      drawClosedEyes(0, faceY, eyeR, gap);
      drawAnimeMouth(0, R * 0.36, R * 0.42, R * 0.24, "smile");
    } else if (g.attackAnim > 0) {
      // ¡Mordisco! Ojos enfocados + boca que se abre y cierra (chomp).
      drawFocusedEyes(0, faceY, eyeR, gap, R * 0.14, R * 0.05);
      var chomp = Math.abs(Math.sin(g.attackAnim * 30));   // abre/cierra rápido
      drawAnimeMouth(0, R * 0.34, R * 0.52, R * (0.18 + 0.5 * chomp), "fanged");
    } else {
      drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, R * 0.12, R * 0.05, "fierce");
      drawAnimeMouth(0, R * 0.36, R * 0.42, R * 0.24, "serious");
    }
    ctx.restore();
    // Barra de vida si está dañado.
    if (g.hp < g.maxHp - 0.5 && g.alpha > 0.2) {
      var bw = 26 * U, bh = 4 * U, bx = g.x - bw / 2, by = g.y + 18 * U;
      var ratio = Math.max(0, Math.min(1, g.hp / g.maxHp));
      ctx.globalAlpha = g.alpha;
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = ratio > 0.5 ? "#5ad15a" : ratio > 0.3 ? "#e8c84a" : "#d9534f";
      ctx.fillRect(bx, by, bw * ratio, bh);
    }
    ctx.globalAlpha = 1;
  }

  // -------- MEDICAMENTO ---------------------------------------------------
  function layoutMed() {
    // Fila inferior con 3 indicadores HORIZONTALES alineados:
    //  [ antiséptico ] [ medicamento (4 bloques) ] [ C3b dots ]
    var rowH = Math.max(34, 38 * U);
    var rowY = FIELD_BOTTOM - rowH - 8 * U;
    var gap = 6 * U;
    var availableW = FIELD_W - 16 * U;
    // Proporciones equilibradas — antes el medvial dominaba (1.20×).
    // Ahora los tres están más balanceados y la fila se siente menos cargada.
    var totalRatio = 0.55 + 1.00 + 0.55;
    var unit = (availableW - gap * 2) / totalRatio;
    var topicalW = Math.round(unit * 0.55);
    var medW = Math.round(unit * 1.00);
    var c3bW = Math.round(unit * 0.55);

    var startX = FIELD_LEFT + 8 * U;
    UI.topicalVial = { x: startX, y: rowY, w: topicalW, h: rowH };
    UI.medVial = { x: startX + topicalW + gap, y: rowY, w: medW, h: rowH };
    UI.c3bMeter = { x: startX + topicalW + gap + medW + gap, y: rowY, w: c3bW, h: rowH };
  }

  // Bloques llenos (0..MED_BLOCKS) según la carga acumulada.
  function medFilledBlocks() {
    return Math.min(MED_BLOCKS, Math.floor(state.medCharge / (MED_MAX / MED_BLOCKS)));
  }

  // Activa el poder del nivel N (= bloques llenos). N=4 -> antibiótico máximo.
  function applyMedicationLevel(level) {
    if (level < 1) return;
    level = Math.min(MED_BLOCKS, level);
    applyMedication(MED_POWERS[level - 1].id);
  }

  function applyMedication(id) {
    var power = null;
    for (var p = 0; p < MED_POWERS.length; p++) if (MED_POWERS[p].id === id) power = MED_POWERS[p];
    state.medApplying = true;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.dead || e.dying || e.absorbing) continue;
      if (id === "antibiotico") {
        // MRSA es METICILINO-RESISTENTE: solo recibe el 50% del antibiótico.
        var antibioticMult = (e.def.id === "bossMRSA") ? 0.50 : 1.0;
        e.hp -= e.maxHp * 0.4 * antibioticMult;          // químico: ignora escudo
        e.hitFlash = 0.2; e.hurtTimer = 0.3;
        if (e.hp <= 0 && !e.dying) {
          e.hp = 0; e.dying = true; e.dyingTimer = 0.30;
          state.atp += e.def.reward; state.pathogensDefeated += 1; META.totalPathogensDefeated += 1;
          pushEffect({ kind: "atpText", x: e.x, y: e.y - e.def.radius * U - 4, vy: -36 * U,
            text: "+" + e.def.reward + " ATP", life: 0.8, max: 0.8 });
        }
      } else if (id === "paralizante") {
        e.stunTimer = 4;
      } else if (id === "ralentizador") {
        e.slowTimer = 6;
      } else if (id === "disolvente") {
        if (e.def.shield && e.shieldHP > 0) { e.shieldHP = 0; e.shieldShatterTimer = 0.4; }
      }
    }
    state.medApplying = false;
    state.gasFx = { color: power ? power.color : "#ffffff", life: 1.5, max: 1.5 };
    state.medCharge = 0;
    sfx("upgrade");
    showMsg(power ? ("¡" + power.name + "!") : "¡Medicamento!");
  }

  // Tópico: ácido en todo el camino (DoT fugaz) al estar lleno.
  function applyTopical() {
    state.acidTimer = ACID_DURATION;
    state.gasFx = { color: "#9be000", life: 1.0, max: 1.0 };
    state.topicalCharge = 0;
    sfx("upgrade");
    showMsg("¡Antiséptico sobre el camino!");
  }

  function updateMed(dt) {
    if (state.gasFx) { state.gasFx.life -= dt; if (state.gasFx.life <= 0) state.gasFx = null; }
    if (state.acidTimer > 0) state.acidTimer -= dt;
  }

  function drawMedVial() {
    var v = UI.medVial; if (!v) return;
    var perBlock = MED_MAX / MED_BLOCKS;
    var filled = medFilledBlocks();
    var segW = (v.w - 2) / MED_BLOCKS;
    ctx.save();
    if (filled >= 1) {
      var gp = 0.5 + 0.5 * Math.sin(state.time * 5);
      ctx.shadowColor = colorAlpha(MED_POWERS[filled - 1].color, 0.9);
      ctx.shadowBlur = 8 + 8 * gp;
    }
    ctx.fillStyle = "rgba(20,8,12,0.55)";
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.shadowBlur = 0;
    // 4 bloques de Nv1 a Nv4. Cada uno muestra su número siempre (faded si
    // está vacío, brillante si está lleno) para que se entienda el progreso.
    for (var i = 0; i < MED_BLOCKS; i++) {
      var segX = v.x + 1 + i * segW;
      var f = Math.max(0, Math.min(1, (state.medCharge - i * perBlock) / perBlock));
      var col = MED_POWERS[i].color;
      // Fondo tenue del color de este nivel (siempre visible, da pistas).
      ctx.fillStyle = colorAlpha(col, 0.10);
      ctx.fillRect(segX + 1, v.y + 2, segW - 2, v.h - 4);
      // Llenado real proporcional.
      if (f > 0) {
        ctx.fillStyle = colorAlpha(col, 0.40 + 0.55 * f);
        ctx.fillRect(segX + 1, v.y + 2, (segW - 2) * f, v.h - 4);
      }
      ctx.strokeStyle = (f >= 1) ? col : "rgba(255,255,255,0.25)";
      ctx.lineWidth = (f >= 1) ? 2 : 1;
      ctx.strokeRect(segX + 1, v.y + 1.5, segW - 2, v.h - 3);
      // Número de nivel (1..4) como pequeña etiqueta en la esquina sup-der,
      // discreto. Solo se vuelve prominente cuando el tier está lleno.
      var label = "" + (i + 1);
      ctx.font = "bold " + Math.max(8, Math.min(10, v.h * 0.26)) + "px Fredoka, sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillStyle = (f >= 1) ? "#fff" : "rgba(255,255,255,0.35)";
      ctx.fillText(label, segX + segW - 3, v.y + 3);
    }
    // Borde exterior fino para enmarcar todo el contenedor.
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1;
    ctx.strokeRect(v.x, v.y, v.w, v.h);
    // Watermark "ANTIBIÓTICO" — etiqueta tenue sobre el gauge para que el
    // jugador sepa de qué carga se trata. Se pone después del borde para
    // quedar por encima pero a baja opacidad (no compite con los números).
    ctx.font = "bold " + Math.max(10, Math.min(13, v.h * 0.38)) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillText("ANTIBIÓTICO", v.x + v.w / 2, v.y + v.h / 2);
    ctx.restore();
  }

  function drawTopical() {
    var v = UI.topicalVial; if (!v) return;
    var ratio = Math.max(0, Math.min(1, state.topicalCharge / TOPICAL_MAX));
    var ready = state.topicalCharge >= TOPICAL_MAX;
    ctx.save();
    // Fondo + fondo tenue del color del poder (igual estilo que medvial).
    ctx.fillStyle = "rgba(20,8,12,0.55)";
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.fillStyle = "rgba(143, 206, 46, 0.10)";
    ctx.fillRect(v.x + 1, v.y + 1, v.w - 2, v.h - 2);
    // Llenado HORIZONTAL.
    var lw = (v.w - 4) * ratio;
    ctx.fillStyle = ready ? "#b6ff3a" : "#8fce2e";
    ctx.fillRect(v.x + 2, v.y + 2, lw, v.h - 4);
    ctx.strokeStyle = ready ? "#b6ff3a" : "rgba(255,255,255,0.45)";
    ctx.lineWidth = ready ? 2 : 1;
    ctx.strokeRect(v.x, v.y, v.w, v.h);
    ctx.restore();
    // Texto centrado dentro del rect (igual tamaño y estilo que el resto).
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.max(10, Math.min(12, v.h * 0.32)) + "px Fredoka, sans-serif";
    ctx.fillStyle = ready
      ? "rgba(20,30,8," + (0.90 + 0.10 * (0.5 + 0.5 * Math.sin(state.time * 6))) + ")"
      : "rgba(255,255,255,0.85)";
    var lbl = ready ? "▸ Antiséptico" : "🧴 " + Math.round(ratio * 100) + "%";
    ctx.fillText(lbl, v.x + v.w / 2, v.y + v.h / 2);
    ctx.restore();
  }

  // -------- COMPLEMENTO (fragmentos C3b + cañón MAC) ---------------------
  // Fragmentos C3b: el doble de tamaño, flotan suave por la pantalla (sin
  // gravedad) y se desvanecen al final de su tiempo.
  function spawnFragment(x, y) {
    state.fragments.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 18 * U,
      vy: -(6 + Math.random() * 6) * U,
      life: 9.5, max: 9.5, phase: Math.random() * 6.28
    });
  }
  function updateFragments(dt) {
    if (!state.fragments) return;
    for (var i = state.fragments.length - 1; i >= 0; i--) {
      var f = state.fragments[i];
      f.life -= dt;
      // Sin gravedad: deriva con leve oscilación tipo "flotando".
      f.x += (f.vx + Math.sin(f.phase) * 6 * U) * dt;
      f.y += (f.vy + Math.cos(f.phase * 0.7) * 4 * U) * dt;
      f.vx *= 0.985; f.vy *= 0.985;
      f.phase += dt * 1.8;
      if (f.y < FIELD_TOP + 22 * U)    { f.y = FIELD_TOP + 22 * U;    f.vy *= -0.4; }
      if (f.y > FIELD_BOTTOM - 28 * U) { f.y = FIELD_BOTTOM - 28 * U; f.vy *= -0.4; }
      if (f.x < FIELD_LEFT + 22 * U)   { f.x = FIELD_LEFT + 22 * U;   f.vx *= -0.5; }
      if (f.x > FIELD_RIGHT - 22 * U)  { f.x = FIELD_RIGHT - 22 * U;  f.vx *= -0.5; }
      if (f.life <= 0) state.fragments.splice(i, 1);
    }
  }
  function drawFragments() {
    if (!state.fragments || !state.fragments.length) return;
    for (var i = 0; i < state.fragments.length; i++) {
      var f = state.fragments[i];
      var a = Math.min(1, f.life / 1.4);          // se desvanece al final
      var pulse = 0.75 + 0.25 * Math.sin(f.phase);
      var R = 18 * U;   // doble tamaño
      ctx.save();
      ctx.globalAlpha = a;
      var g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, R * 2.0 * pulse);
      g.addColorStop(0, "rgba(124,252,158,0.55)"); g.addColorStop(1, "rgba(124,252,158,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R * 2.0 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#aef7c4"; ctx.strokeStyle = "#3fa86a"; ctx.lineWidth = 2 * U;
      ctx.beginPath();
      for (var k = 0; k < 3; k++) { var ang = f.phase * 0.3 + k * 2.094 - Math.PI / 2; var px = f.x + Math.cos(ang) * R, py = f.y + Math.sin(ang) * R; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1f6b3a"; ctx.font = "bold " + Math.round(10 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("C3b", f.x, f.y + R + 8 * U);
      ctx.restore();
    }
  }

  // -------- CAÑÓN MAC: tiro manual (arco lento + charco de ácido) ---------
  function fireCannonAt(t, tx, ty) {
    var st = towerStats(t);
    state.cannonShots.push({
      sx: t.x, sy: t.y, tx: tx, ty: ty,
      t: 0, max: st.travelTime || 1.0,
      dmg: st.damage,
      splash: st.splash * U,
      dur: st.acidDur || 4.0
    });
    t.cooldown = 1 / st.fireRate;
    t.muzzleFlash = 0.18;
    t.attackAnim = 0.28;
    t.lastTargetX = tx; t.lastTargetY = ty;
    sfx("place");
  }
  function updateCannonShots(dt) {
    if (!state.cannonShots) return;
    for (var i = state.cannonShots.length - 1; i >= 0; i--) {
      var s = state.cannonShots[i];
      s.t += dt;
      if (s.t >= s.max) {
        state.acidSplats.push({ x: s.tx, y: s.ty, r: s.splash, dps: s.dmg, life: s.dur, max: s.dur });
        pushEffect({ kind: "shock", x: s.tx, y: s.ty, r: s.splash, life: 0.5, max: 0.5, color: "#9be000" });
        sfx("tick");
        state.cannonShots.splice(i, 1);
      }
    }
  }
  function drawCannonShots() {
    if (!state.cannonShots || !state.cannonShots.length) return;
    for (var i = 0; i < state.cannonShots.length; i++) {
      var s = state.cannonShots[i];
      var p = s.t / s.max;
      var x = s.sx + (s.tx - s.sx) * p;
      var y = s.sy + (s.ty - s.sy) * p - Math.sin(p * Math.PI) * 90 * U; // arco
      // Marcador del punto de caída (crece a medida que se acerca).
      var fadeIn = Math.min(1, s.t / (s.max * 0.5));
      ctx.fillStyle = "rgba(155,224,0," + (0.18 + 0.25 * fadeIn) + ")";
      ctx.beginPath(); ctx.ellipse(s.tx, s.ty, s.splash * fadeIn, s.splash * 0.35 * fadeIn, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(155,224,0," + (0.5 + 0.5 * fadeIn) + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.tx, s.ty, s.splash * fadeIn, 0, Math.PI * 2); ctx.stroke();
      // Sombra elíptica bajo la gota.
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(x, y + (s.sy + (s.ty - s.sy) * p) - y + 6 * U, 8 * U, 3 * U, 0, 0, Math.PI * 2); ctx.fill();
      // Gota de complemento (luminosa).
      var gg = ctx.createRadialGradient(x, y, 1, x, y, 16 * U);
      gg.addColorStop(0, "#FFFFE6"); gg.addColorStop(0.5, "#FFD24A"); gg.addColorStop(1, "rgba(184,134,11,0.3)");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(x, y, 13 * U, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 13 * U, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function updateAcidSplats(dt) {
    if (!state.acidSplats) return;
    for (var i = state.acidSplats.length - 1; i >= 0; i--) {
      var s = state.acidSplats[i];
      s.life -= dt;
      // DoT a los gérmenes dentro del charco (ignora escudos: complemento).
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.dead || en.dying || en.absorbing) continue;
        if (en.state !== "walking" && en.state !== "blocked") continue;
        if (Math.hypot(en.x - s.x, en.y - s.y) < s.r) {
          damageEnemy(en, s.dps * dt, "complemento");
        }
      }
      if (s.life <= 0) state.acidSplats.splice(i, 1);
    }
  }
  function drawAcidSplats() {
    if (!state.acidSplats || !state.acidSplats.length) return;
    ctx.save();
    for (var i = 0; i < state.acidSplats.length; i++) {
      var s = state.acidSplats[i];
      var a = Math.min(1, s.life / 1.2);
      var pulse = 0.85 + 0.15 * Math.sin(state.time * 6 + i);
      var g = ctx.createRadialGradient(s.x, s.y, s.r * 0.1, s.x, s.y, s.r);
      g.addColorStop(0, "rgba(210,255,90," + (0.55 * a) + ")");
      g.addColorStop(0.65, "rgba(155,224,0," + (0.40 * a) + ")");
      g.addColorStop(1, "rgba(120,160,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(155,224,0," + (0.7 * a) + ")"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.stroke();
      for (var b = 0; b < 5; b++) {
        var ba = (state.time * 1.8 + i + b * 1.3) % (Math.PI * 2);
        var br = s.r * (0.25 + 0.5 * ((b % 3) / 2));
        ctx.fillStyle = "rgba(220,255,150," + (0.55 * a) + ")";
        ctx.beginPath(); ctx.arc(s.x + Math.cos(ba) * br, s.y + Math.sin(ba) * br, 2.4 * U, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // -------- ESPORAS BUSCADORAS DE PSEUDOMONAS -----------------------------
  // Una torre cuenta como "disparadora" si dispara proyectiles (linfocitos,
  // NK, Eosinófilo) o si es manual (Cañón MAC).
  function isShooterTower(t) {
    if (!t.def) return false;
    if (t.def.manualFire) return true;
    if (t.def.support) return false;
    var lvl = t.def.levels && t.def.levels[t.level || 0];
    return !!(lvl && lvl.projectileSpeed > 0);
  }
  function pickShooterTower(x, y) {
    var best = null, bd = Infinity;
    for (var i = 0; i < state.towers.length; i++) {
      var t = state.towers[i];
      if (!isShooterTower(t)) continue;
      if (t.devouredBy) continue;
      var d = Math.hypot(t.x - x, t.y - y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  function spawnSeeker(e, target) {
    var sp = e.def.seekers;
    state.seekers.push({
      x: e.x, y: e.y, vx: 0, vy: 0,
      hp: sp.hp, maxHp: sp.hp, dmg: sp.dmg, speed: sp.speed,
      target: target, phase: Math.random() * 6.28, life: 12, max: 12
    });
    pushEffect({ kind: "particle", x: e.x, y: e.y, vx: 0, vy: -16 * U, life: 0.4, max: 0.5, color: e.def.colorDark });
  }
  function updateSeekers(dt) {
    if (!state.seekers) return;
    for (var i = state.seekers.length - 1; i >= 0; i--) {
      var s = state.seekers[i];
      s.life -= dt; s.phase += dt * 4;
      // Si el objetivo ya no existe, busca otro o se autodestruye.
      if (!s.target || state.towers.indexOf(s.target) === -1 || s.target.hp <= 0) {
        s.target = pickShooterTower(s.x, s.y);
        if (!s.target) { s.life -= 0.3; }
      }
      if (s.target) {
        var dx = s.target.x - s.x, dy = s.target.y - s.y, dd = Math.hypot(dx, dy) || 1;
        var spd = s.speed * U;
        s.vx = (dx / dd) * spd + Math.sin(s.phase) * 6 * U;
        s.vy = (dy / dd) * spd + Math.cos(s.phase * 0.7) * 6 * U;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (dd < 16 * U) {
          // Impacto: daña a la torre.
          s.target.hp -= s.dmg;
          s.target.hitFlash = 0.20;
          s.target.dmgAccum = (s.target.dmgAccum || 0) + s.dmg;
          pushEffect({ kind: "shock", x: s.x, y: s.y, r: 14 * U, life: 0.3, max: 0.3, color: "#80DEEA" });
          for (var pk = 0; pk < 6; pk++) { var pa = Math.random() * Math.PI * 2, ps = (15 + Math.random() * 25) * U; pushEffect({ kind: "particle", x: s.x, y: s.y, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps, life: 0.3, max: 0.4, color: "#26A69A" }); }
          state.seekers.splice(i, 1);
          continue;
        }
      } else {
        // Sin objetivo: deriva suave hacia el centro del campo.
        s.x += Math.sin(s.phase) * 8 * U * dt;
        s.y += Math.cos(s.phase * 0.6) * 8 * U * dt;
      }
      if (s.life <= 0) state.seekers.splice(i, 1);
    }
  }
  function drawSeekers() {
    if (!state.seekers || !state.seekers.length) return;
    for (var i = 0; i < state.seekers.length; i++) {
      var s = state.seekers[i];
      var R = 8 * U;
      // halo turquesa amenazante
      var g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, R * 2.2);
      g.addColorStop(0, "rgba(38,166,154,0.6)"); g.addColorStop(1, "rgba(38,166,154,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R * 2.2, 0, Math.PI * 2); ctx.fill();
      // cuerpo de la espora con flagelos
      ctx.strokeStyle = "#00695C"; ctx.lineWidth = 1.5 * U;
      ctx.beginPath();
      for (var k = 0; k < 6; k++) { var ka = k * Math.PI / 3 + s.phase * 0.3; ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(ka) * R * 1.4, s.y + Math.sin(ka) * R * 1.4); }
      ctx.stroke();
      ctx.fillStyle = "#26A69A"; ctx.strokeStyle = "#00695C"; ctx.lineWidth = 1.4 * U;
      ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // ojito malvado central
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a22"; ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.22, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawComplementMeter() {
    var n = state.complement || 0;
    if (n <= 0 && (!state.fragments || !state.fragments.length)) return;
    // Usa UI.c3bMeter (fila inferior, a la derecha del medvial). Si no existe,
    // fallback al sitio anterior para no romper layouts antiguos.
    var v = UI.c3bMeter;
    if (!v) {
      v = { x: FIELD_LEFT + 6, y: (UI.topicalVial ? UI.topicalVial.y + UI.topicalVial.h + 6 : FIELD_TOP + 6), w: 100, h: 22 };
    }
    var ready = n >= MAC_COST;
    ctx.save();
    // Fondo (mismo tono base que medvial/topical, con tinte verde sutil del color del poder).
    ctx.fillStyle = "rgba(20,8,12,0.55)";
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.fillStyle = "rgba(124,252,158,0.10)";
    ctx.fillRect(v.x + 1, v.y + 1, v.w - 2, v.h - 2);
    ctx.strokeStyle = ready ? "rgba(124,252,158,0.95)" : "rgba(255,255,255,0.45)";
    ctx.lineWidth = ready ? 2 : 1;
    ctx.strokeRect(v.x, v.y, v.w, v.h);
    // Label "C3b"
    ctx.font = "bold " + Math.max(10, Math.min(12, v.h * 0.32)) + "px Fredoka, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#aef7c4";
    var label = ready ? "▸ C3b" : "C3b";
    var pad = 7;
    ctx.fillText(label, v.x + pad, v.y + v.h / 2);
    var lw = ctx.measureText(label).width;
    // Dots a la derecha del label, calculados para NUNCA salirse del rect.
    var dotsStart = v.x + pad + lw + 6;
    var dotsEnd = v.x + v.w - pad;
    var dotsArea = Math.max(20, dotsEnd - dotsStart);
    // Mínimo 1.5px de gap entre dots; el radio se calcula al revés para que
    // todo entre en dotsArea (con un poco de aire al final).
    var minGap = 1.5;
    var maxRByArea = (dotsArea - (MAC_COST - 1) * minGap) / (MAC_COST * 2);
    var dotR = Math.max(2.5, Math.min(4.5, maxRByArea));
    var totalDotsW = MAC_COST * (dotR * 2);
    var gapDots = Math.max(minGap, (dotsArea - totalDotsW) / Math.max(1, MAC_COST - 1));
    for (var i = 0; i < MAC_COST; i++) {
      var cx = dotsStart + dotR + i * (dotR * 2 + gapDots);
      ctx.beginPath();
      ctx.arc(cx, v.y + v.h / 2, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i < n ? "#7CFC9E" : "rgba(255,255,255,0.20)";
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSlicks() {
    if (!state.slicks || !state.slicks.length) return;
    ctx.save();
    for (var i = 0; i < state.slicks.length; i++) {
      var sk = state.slicks[i];
      var a = Math.min(1, sk.life / sk.max);
      var g = ctx.createRadialGradient(sk.x, sk.y, sk.r * 0.2, sk.x, sk.y, sk.r);
      g.addColorStop(0, "rgba(216,192,96," + (0.30 * a) + ")");
      g.addColorStop(0.7, "rgba(160,130,40," + (0.20 * a) + ")");
      g.addColorStop(1, "rgba(160,130,40,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(sk.x, sk.y, sk.r, sk.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      // brillo aceitoso
      ctx.fillStyle = "rgba(255,255,255," + (0.18 * a) + ")";
      ctx.beginPath(); ctx.ellipse(sk.x - sk.r * 0.25, sk.y - sk.r * 0.12, sk.r * 0.3, sk.r * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawAcid() {
    if (state.acidTimer <= 0) return;
    var pulse = 0.5 + 0.5 * Math.sin(state.time * 8);
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.06 * pulse;
    ctx.fillStyle = "#9be000";
    ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_W, FIELD_BOTTOM - FIELD_TOP);
    ctx.restore();
  }

  function drawGas() {
    if (!state.gasFx) return;
    var fr = state.gasFx.life / state.gasFx.max;     // 1 -> 0
    var grow = 1 - fr;                                // 0 -> 1
    var alpha = Math.sin(Math.min(1, fr) * Math.PI) * 0.45;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = state.gasFx.color;
    for (var i = 0; i < 16; i++) {
      var fx = FIELD_LEFT + ((i * 53) % 100) / 100 * FIELD_W;
      var fy = FIELD_TOP + ((i * 89) % 100) / 100 * (FIELD_BOTTOM - FIELD_TOP);
      var r = (24 + 40 * grow + (i % 4) * 7) * U;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // -------- PODERES DE GÉRMENES (ataques especiales a torres) -------------
  function fireGermPower(e, tw) {
    var p = e.def.power;
    if (p.type === "devour") {
      e.devourTarget = tw; tw.devouredBy = e;
      e.devourT = 0; e.devourStartX = tw.x; e.devourStartY = tw.y;
      showMsg("¡" + (e.def.shortName || e.def.name) + " atrapó una célula!");
      sfx("playerHurt");
    } else {
      // Poderes extra de bosses:
      // - bossPyogenes: el burst aplica ESTREPTOLISINA O — DoT 4/s × 6s.
      // - bossMRSA:    el spray aplica PVL — daño extra a fagocitos cercanos.
      var extraDot = 0, extraDotDur = 0;
      var extraPvlRange = 0;
      if (e.def.id === "bossPyogenes" && p.type === "burst") {
        extraDot = 4; extraDotDur = 6;
      }
      if (e.def.id === "bossMRSA" && p.type === "spray") {
        extraPvlRange = 90 * U;
      }
      state.germShots.push({
        type: p.type, x: e.x, y: e.y, tx: tw.x, ty: tw.y, target: tw,
        color: e.def.color, t: 0,
        dmg: p.dmg || 0, stun: p.stun || 0, slowFire: p.slowFire || 0, dead: false,
        extraDot: extraDot, extraDotDur: extraDotDur,
        pvlRange: extraPvlRange
      });
    }
  }

  function updateDevour(e, dt) {
    var tw = e.devourTarget;
    if (!tw || state.towers.indexOf(tw) === -1) { e.devourTarget = null; return; }
    var pull = e.def.power.pull || 1.5;
    e.devourT += dt;
    var k = Math.min(1, e.devourT / pull);
    var ke = k * k * (3 - 2 * k);          // suaviza el tirón (smoothstep)
    tw.x = e.devourStartX + (e.x - e.devourStartX) * ke;
    tw.y = e.devourStartY + (e.y - e.devourStartY) * ke;
    tw.devourScale = 1 - ke * 0.7;          // se encoge al ser tragada
    tw.devourShake = 2 + k * 5;             // forcejea cada vez más
    e.mawOpen = k;                          // la "fauce" se abre con el tirón
    if (k >= 1) {
      // ¡Mordisco! Tragado: el germen se hincha y estalla en partículas.
      e.swallowAnim = 0.45;
      e.mawOpen = 0;
      state.medCharge = Math.min(MED_MAX, state.medCharge + MED_PER_TOWER_DEATH);
      pushEffect({ kind: "placeFlash", x: e.x, y: e.y, life: 0.3, max: 0.3 });
      for (var pk = 0; pk < 16; pk++) {
        var pa = Math.random() * Math.PI * 2, ps = (30 + Math.random() * 55) * U;
        pushEffect({ kind: "particle", x: tw.x, y: tw.y, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps - 10 * U, life: 0.5, max: 0.7, color: tw.def.color });
      }
      triggerShake(0.25, 5);
      showMsg("¡" + (e.def.shortName || e.def.name) + " devoró una célula!");
      sfx("sell");
      if (state.selectedTower === tw) { state.selectedTower = null; clearRangeHint(); }
      var idx = state.towers.indexOf(tw); if (idx >= 0) state.towers.splice(idx, 1);
      e.devourTarget = null;
    }
  }

  function shotDur(type) {
    if (type === "burst") return 0.4;
    if (type === "catapult") return 0.9;
    if (type === "modulin") return 0.8;   // serpenteo visible
    return 0.6;
  }

  function updateGermShots(dt) {
    for (var i = 0; i < state.germShots.length; i++) {
      var s = state.germShots[i];
      s.t += dt;
      if (s.t >= shotDur(s.type)) {
        var tw = s.target;
        if (tw && state.towers.indexOf(tw) !== -1 && !tw.devouredBy) {
          if (s.dmg) { tw.hp -= s.dmg; tw.hitFlash = 0.22; tw.dmgAccum = (tw.dmgAccum || 0) + s.dmg; }
          if (s.stun) tw.stunTimer = Math.max(tw.stunTimer || 0, s.stun);
          if (s.slowFire) tw.slowFireTimer = Math.max(tw.slowFireTimer || 0, s.slowFire);
          // Estreptolisina O de pyogenes: DoT mientras dura.
          if (s.extraDot && s.extraDotDur) {
            tw.lisisTimer = Math.max(tw.lisisTimer || 0, s.extraDotDur);
            tw.lisisDps = Math.max(tw.lisisDps || 0, s.extraDot);
          }
          // PVL del MRSA: golpea adicional a fagocitos en el área (Neutrofilo)
          // y al Macrófago Libre. Daño masivo, 25% del maxHp.
          if (s.pvlRange) {
            for (var pi = 0; pi < state.towers.length; pi++) {
              var pt = state.towers[pi];
              if (pt.def.id !== "neutrofilo") continue;
              var dxP = pt.x - tw.x, dyP = pt.y - tw.y;
              if (dxP * dxP + dyP * dyP <= s.pvlRange * s.pvlRange) {
                var pvlDmg = Math.round(pt.maxHp * 0.25);
                pt.hp -= pvlDmg; pt.hitFlash = 0.30;
                pt.dmgAccum = (pt.dmgAccum || 0) + pvlDmg;
                pushDamageNumber(pt.x, pt.y - 24 * U, "PVL -" + pvlDmg, "#ff5252");
              }
            }
            // También daña al Macrófago Libre cercano.
            if (state.guardians) {
              for (var gi = 0; gi < state.guardians.length; gi++) {
                var g = state.guardians[gi];
                if (g.kind === "dendriticT") continue;
                var dxG = g.x - tw.x, dyG = g.y - tw.y;
                if (dxG * dxG + dyG * dyG <= s.pvlRange * s.pvlRange) {
                  g.hp -= 20; g.hitFlash = 0.25;
                }
              }
            }
          }
          // Impacto bien visible: anillo + salpicaduras del color del germen.
          pushEffect({ kind: "placeFlash", x: tw.x, y: tw.y, life: 0.25, max: 0.25 });
          for (var ip = 0; ip < 8; ip++) {
            var ia = Math.PI * 2 * ip / 8, isp = (40 + Math.random() * 40) * U;
            pushEffect({ kind: "particle", x: tw.x, y: tw.y,
              vx: Math.cos(ia) * isp, vy: Math.sin(ia) * isp,
              life: 0.4, max: 0.5, color: s.color });
          }
        }
        s.dead = true;
      }
    }
    state.germShots = state.germShots.filter(function (s) { return !s.dead; });
  }

  function drawGermShots() {
    for (var i = 0; i < state.germShots.length; i++) {
      var s = state.germShots[i];
      var k = Math.min(1, s.t / shotDur(s.type));
      var x = s.x + (s.tx - s.x) * k, y = s.y + (s.ty - s.y) * k;
      ctx.save();
      if (s.type === "catapult") {
        // Bola de esporas grande con sombra, trail y arco amplio.
        var ay = y - Math.sin(k * Math.PI) * 60 * U;
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath(); ctx.ellipse(x, y, 8 * U, 3 * U, 0, 0, Math.PI * 2); ctx.fill();
        for (var tr = 1; tr <= 3; tr++) {
          var kt = Math.max(0, k - tr * 0.06);
          var trx = s.x + (s.tx - s.x) * kt, tryy = (s.y + (s.ty - s.y) * kt) - Math.sin(kt * Math.PI) * 60 * U;
          ctx.fillStyle = colorAlpha(s.color, 0.18 / tr);
          ctx.beginPath(); ctx.arc(trx, tryy, 9 * U, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowColor = colorAlpha(s.color, 0.9); ctx.shadowBlur = 10;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(x, ay, 10 * U, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5 * U; ctx.stroke();
      } else if (s.type === "burst") {
        // Dardo brillante con estela.
        var k0 = Math.max(0, k - 0.3);
        var x0 = s.x + (s.tx - s.x) * k0, y0 = s.y + (s.ty - s.y) * k0;
        ctx.strokeStyle = colorAlpha(s.color, 0.5); ctx.lineWidth = 5 * U; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        ctx.shadowColor = colorAlpha(s.color, 0.9); ctx.shadowBlur = 8;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x, y, 5 * U, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(x, y, 3 * U, 0, Math.PI * 2); ctx.fill();
      } else if (s.type === "modulin") {
        // PSM de S. epidermidis: blob verde-amarillo serpenteante que
        // busca la potenciadora. Trail orgánico con wobble.
        var k0 = Math.max(0, k - 0.25);
        var wobX = Math.sin(state.time * 8 + k * 6) * 6 * U;
        var wx = s.x + (s.tx - s.x) * k + wobX * (1 - k);
        var wy = s.y + (s.ty - s.y) * k;
        // Trail
        ctx.strokeStyle = colorAlpha(s.color, 0.45);
        ctx.lineWidth = 3 * U;
        ctx.beginPath();
        var x0 = s.x + (s.tx - s.x) * k0;
        var y0 = s.y + (s.ty - s.y) * k0;
        ctx.moveTo(x0, y0); ctx.lineTo(wx, wy);
        ctx.stroke();
        // Cabeza
        ctx.shadowColor = s.color; ctx.shadowBlur = 8;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(wx, wy, 5 * U, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#f0ffd0";
        ctx.beginPath(); ctx.arc(wx, wy, 2.5 * U, 0, Math.PI * 2); ctx.fill();
      } else { // spray: nube de gas que se expande hacia la torre
        var puffs = 5;
        for (var d = 0; d < puffs; d++) {
          var dk = Math.min(1, k * (0.5 + d * 0.13));
          var px = s.x + (s.tx - s.x) * dk;
          var py = s.y + (s.ty - s.y) * dk;
          var pr = (5 + d * 2.5 + 6 * k) * U;            // crece hacia el objetivo
          var pa = colorAlpha(s.color, (0.45 - d * 0.06) * (1 - k * 0.5));
          ctx.fillStyle = pa;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // -------- PROJECTILES ---------------------------------------------------
  function updateProjectiles(dt) {
    for (var i = 0; i < state.projectiles.length; i++) {
      var p = state.projectiles[i];
      if (p.dead) continue;
      if (!p.target || p.target.dead || p.target.dying || p.target.absorbing) { p.dead = true; continue; }
      var dx = p.target.x - p.x, dy = p.target.y - p.y;
      var d = Math.hypot(dx, dy);
      var step = p.speedDesign * U * dt;
      if (d <= step + 4) {
        var splashPx = p.splashDesign * U;
        if (splashPx > 0) {
          for (var j = 0; j < state.enemies.length; j++) {
            var e = state.enemies[j];
            if (e.dead || e.dying || e.absorbing || e.state === "falling" || e.state === "entering") continue;
            if (Math.hypot(e.x - p.target.x, e.y - p.target.y) <= splashPx) {
              damageEnemy(e, p.damage, p.attackerType);
            }
          }
          pushEffect({ kind: "explosion", x: p.target.x, y: p.target.y, r: 0, max: splashPx, life: 0.4, color: p.color });
        } else {
          damageEnemy(p.target, p.damage, p.attackerType);
          // Aplica el efecto adicional de ralentización (Plaqueta).
          if (p.slowOnHit && p.target && !p.target.dead) {
            p.target.slowTimer = Math.max(p.target.slowTimer || 0, p.slowOnHit.dur);
          }
          pushEffect({ kind: "hit", x: p.target.x, y: p.target.y, life: 0.2, max: 0.2, color: p.color });
        }
        p.dead = true;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    state.projectiles = state.projectiles.filter(function (p) { return !p.dead; });
  }

  // -------- EFFECTS -------------------------------------------------------
  function spawnEffect(kind, x, y, color) {
    if (kind === "death") {
      for (var i = 0; i < 6; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = (40 + Math.random() * 60) * U;
        pushEffect({
          kind: "particle",
          x: x, y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.4 + Math.random() * 0.2,
          max: 0.6,
          color: color || "#fff"
        });
      }
    } else if (kind === "escape") {
      pushEffect({ kind: "escape", x: x, y: y, life: 0.6, max: 0.6 });
    }
  }

  function spawnConfetti() {
    var colors = ["#f5d76e", "#5cb85c", "#4a90e2", "#e74c3c", "#9370db", "#fff"];
    for (var i = 0; i < 60; i++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      var spd = (180 + Math.random() * 220) * U;
      pushEffect({
        kind: "confetti",
        x: VW / 2 + (Math.random() - 0.5) * VW * 0.6,
        y: VH / 2 + 40,
        vx: Math.cos(ang) * spd * (Math.random() - 0.5) * 2,
        vy: Math.sin(ang) * spd,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 8,
        size: (3 + Math.random() * 4) * U,
        life: 1.6 + Math.random() * 0.8,
        max: 2.4,
        color: colors[(Math.random() * colors.length) | 0]
      });
    }
  }

  function triggerShake(time, mag) {
    if (time > state.shakeTimer) state.shakeTimer = time;
    if (mag > state.shakeMag) state.shakeMag = mag;
  }

  function spawnCirculatoryTracer(def) {
    // Visual reinforcement that the absorbed pathogen entered the bloodstream.
    state.circulatory.push({
      x: PATH.exit ? PATH.exit.x : FIELD_LEFT + FIELD_W * 0.5,
      y: PATH.exit ? PATH.exit.y + 12 * U : FIELD_BOTTOM - 20 * U,
      vx: (Math.random() - 0.5) * 30 * U,
      vy: 18 * U,
      life: 0.5, max: 0.5,
      color: def.color || "#c54040",
      r: (def.radius || 14) * U * 0.5
    });
  }

  // Cinematic end trigger when infestation reaches 100. Sets up a 7s timeline
  // played in updateCinematic + drawn in drawCinematicEnd.
  function triggerCinematicEnd() {
    if (state.cinematicEnd || state.dissemination) return;
    // El "100% de infección" en Fase 1 ya no es un final: es el PORTAL al
    // nivel puente. Inicia primero una transición de fundido (~1.4s) y
    // recién después llama enterDissemination — evita el corte abrupto.
    if (!state.phaseTransition) {
      state.phaseTransition = {
        t: 0,
        duration: 1.4,
        target: "dissemination"
      };
      sfx("playerHurt");
      triggerShake(0.5, 6);
    }
  }
  // Backward-compat shim: old code may still call triggerLevelEnd().
  function triggerLevelEnd() { triggerCinematicEnd(); }

  function restartFromLevel1() {
    state = newState();
    state.vistos = loadVistos();  // sin esto state.vistos quedaba null y el glow check crasheaba
    state.showIntro = false;       // restart skips the intro
    rebuildPath();
    layoutDrip();
  }

  function updateEffects(dt) {
    for (var i = 0; i < state.effects.length; i++) {
      var ef = state.effects[i];
      ef.life -= dt;
      if (ef.kind === "particle") {
        ef.x += ef.vx * dt;
        ef.y += ef.vy * dt;
        ef.vx *= 0.92;
        ef.vy *= 0.92;
      } else if (ef.kind === "explosion") {
        ef.r = ef.max * (1 - ef.life / 0.4);
      } else if (ef.kind === "dmgText" || ef.kind === "atpText") {
        ef.y += ef.vy * dt;
        ef.vy *= 0.94;
      } else if (ef.kind === "confetti") {
        ef.x += ef.vx * dt;
        ef.y += ef.vy * dt;
        ef.vy += 380 * U * dt;
        ef.vx *= 0.99;
        ef.rot += ef.rotSpd * dt;
      }
    }
    state.effects = state.effects.filter(function (e) { return e.life > 0; });
    // Damage numbers (separate cap=20)
    for (var dn = 0; dn < state.damageNumbers.length; dn++) {
      var d = state.damageNumbers[dn];
      d.life -= dt;
      d.y = d.startY - 30 * (1 - d.life / d.max) * U;
    }
    state.damageNumbers = state.damageNumbers.filter(function (d) { return d.life > 0; });
    // Gold particles (victory ambience)
    for (var gp = 0; gp < state.goldParticles.length; gp++) {
      var p = state.goldParticles[gp];
      p.life -= dt;
      p.y -= p.vy * dt;
      p.x += Math.sin(state.time * 1.5 + p.phase) * 12 * dt;
    }
    state.goldParticles = state.goldParticles.filter(function (p) { return p.life > 0; });
    if (state.victory) {
      while (state.goldParticles.length < 14) {
        state.goldParticles.push({
          x: Math.random() * VW,
          y: VH * 0.6 + Math.random() * VH * 0.4,
          vy: 18 + Math.random() * 22,
          life: 4 + Math.random() * 3,
          max: 6,
          size: (2 + Math.random() * 3) * U,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.4 + Math.random() * 0.4
        });
      }
    }
    if (state.shakeTimer > 0) state.shakeTimer -= dt;
    if (state.waveBannerTimer > 0) state.waveBannerTimer -= dt;
    if (state.vesselFlashTimer > 0) state.vesselFlashTimer -= dt;
    if (state.vesselSwallow > 0) state.vesselSwallow -= dt;
    if (state.woundFlashTimer > 0) state.woundFlashTimer -= dt;
    if (state.levelTransition && state.transitionTimer < 1) state.transitionTimer += dt;
    // Circulatory tracers (ambient drift)
    for (var ci = 0; ci < state.circulatory.length; ci++) {
      var c = state.circulatory[ci];
      c.life -= dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy *= 0.96;
    }
    state.circulatory = state.circulatory.filter(function (c) { return c.life > 0; });
    if (state.endRevealTimer < 0.5 && (state.victory || state.gameOver)) {
      state.endRevealTimer += dt;
    }
    // Switch music to victory mode once
    if (state.victory && !state.endMusicSwitched) {
      state.endMusicSwitched = true;
      if (audio.ctx) startMusic("victory");
    }
    updateDrip(dt);
    updateAmbient(dt);
    updateTooltip(dt);
    updateMrsaIntro(dt);
    updatePathInflammation(dt);
    updatePanelMomentum(dt);
  }

  // Sprint 8B-Polish-3B-fix: inertial decay del scroll del panel después
  // de un flick. Detiene cuando |v| < 5 o al llegar a un borde.
  function updatePanelMomentum(dt) {
    if (!state.panelMomentum || !UI.cardStrip) return;
    var maxScroll = Math.max(0, UI.cardStrip.contentH - UI.cardStrip.h);
    state.panelScroll = (state.panelScroll || 0) + state.panelMomentum * dt;
    if (state.panelScroll <= 0) {
      state.panelScroll = 0;
      state.panelMomentum = 0;
      return;
    }
    if (state.panelScroll >= maxScroll) {
      state.panelScroll = maxScroll;
      state.panelMomentum = 0;
      return;
    }
    state.panelMomentum *= Math.pow(0.1, dt);  // ~96% retained per 16ms
    if (Math.abs(state.panelMomentum) < 5) state.panelMomentum = 0;
  }

  // Sprint 8A: tooltips lateral con cola. Si no hay activo y hay pendientes,
  // se promueve el primero de la cola con animación de entrada.
  function updateTooltip(dt) {
    if (!state.activeTooltip && state.tooltipQueue && state.tooltipQueue.length > 0) {
      var defId = state.tooltipQueue.shift();
      state.activeTooltip = {
        defId: defId,
        timer: 3.0,        // 3s exact auto-close
        max: 3.0,
        elapsed: 0,
        closing: false,
        closeProgress: 0,  // 0->1 over 0.4s when closing
        isFirst: !firstTooltipShownThisSession
      };
      firstTooltipShownThisSession = true;
      return;
    }
    if (!state.activeTooltip) return;
    var tt = state.activeTooltip;
    tt.elapsed += dt;
    if (!tt.closing) {
      tt.timer -= dt;
      if (tt.timer <= 0) tt.closing = true;
    } else {
      tt.closeProgress += dt / 0.4;
      if (tt.closeProgress >= 1) state.activeTooltip = null;
    }
  }

  function updateMrsaIntro(dt) {
    if (!state.mrsaIntro) return;
    state.mrsaIntro.t += dt;
    if (state.mrsaIntro.t >= state.mrsaIntro.duration) state.mrsaIntro = null;
  }

  // -------- LYMPHATIC DRIP UPDATE / DRAW --------------------------------
  // Sprint 7: slower, larger, oscillating drop so players can actually grab it.
  function updateDripSlot(slot, drip, dt) {
    if (!slot.drop) {
      if (slot.nextDropAt === undefined) slot.nextDropAt = 6;
      slot.nextDropAt -= dt;
      if (slot.nextDropAt <= 0) {
        slot.drop = {
          x: drip.x,
          baseX: drip.x,
          y: drip.mouthY,
          vy: 8 * U,
          ay: 18 * U,
          life: 5.5,
          max: 5.5,
          phase: Math.random() * Math.PI * 2,
          collected: false,
          collectAnim: 0
        };
        slot.nextDropAt = DRIP_INTERVAL;
      }
    } else {
      var d = slot.drop;
      if (d.collected) {
        d.collectAnim += dt;
        if (d.collectAnim >= 0.30) slot.drop = null;
        return;
      }
      d.life -= dt;
      d.vy += d.ay * dt;
      d.vy = Math.min(d.vy, 38 * U);
      d.y += d.vy * dt;
      d.x = d.baseX + Math.sin(state.time * Math.PI + d.phase) * 15 * U;
      if (d.life <= 0) slot.drop = null;
    }
  }
  function updateDrip(dt) {
    if (state.gameOver || state.victory || state.confirmRestart || state.levelTransition) return;
    if (!state.lymph) state.lymph = { drop: null, nextDropAt: 6 };
    updateDripSlot(state.lymph, DRIP, dt);
    if (DRIP_R && DRIP_R.active) {
      if (!state.lymphR) state.lymphR = { drop: null, nextDropAt: 7 };
      updateDripSlot(state.lymphR, DRIP_R, dt);
    }
  }

  function tryClickDripSlot(x, y, slot) {
    var d = slot && slot.drop;
    if (!d || d.collected) return false;
    if (Math.hypot(x - d.x, y - d.y) <= 36 * U) {
      state.atp += DRIP_REWARD;
      pushEffect({
        kind: "atpText",
        x: d.x, y: d.y - 6 * U,
        vy: -36 * U,
        text: "+" + DRIP_REWARD + " ATP",
        life: 0.85, max: 0.85,
        color: "#FFD93D"
      });
      for (var i = 0; i < 10; i++) {
        var a = Math.random() * Math.PI * 2;
        var sp = (40 + Math.random() * 50) * U;
        pushEffect({
          kind: "particle",
          x: d.x, y: d.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.2,
          max: 0.6,
          color: "#FFD93D"
        });
      }
      sfx("upgrade");
      d.collected = true;
      d.collectAnim = 0;
      return true;
    }
    return false;
  }
  function tryClickDrip(x, y) {
    if (tryClickDripSlot(x, y, state.lymph)) return true;
    if (DRIP_R && DRIP_R.active && tryClickDripSlot(x, y, state.lymphR)) return true;
    return false;
  }

  // Bean-shaped lymph node (replaces the rectangular tube).
  // MITOCONDRIA — productora real de ATP en la célula. Óvalo con doble membrana
  // y crestas (folded inner membrane). Las gotas amarillas que suelta son ATP.
  function drawLymphNode() {
    drawMitochondriaAt(DRIP);
    if (DRIP_R && DRIP_R.active) drawMitochondriaAt(DRIP_R);
  }
  function drawMitochondriaAt(drip) {
    var cx = drip.x, cy = drip.y;
    var rx = drip.w, ry = drip.h;
    var pulse = 1 + Math.sin(state.time * (Math.PI * 2 / 1.8)) * 0.05;
    var rxp = rx * pulse, ryp = ry * pulse;
    ctx.save();
    // Brillo cálido (energía).
    var glow = ctx.createRadialGradient(cx, cy, rxp * 0.4, cx, cy, rxp * 1.7);
    glow.addColorStop(0, "rgba(255, 200, 100, 0.32)");
    glow.addColorStop(1, "rgba(255, 200, 100, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, rxp * 1.7, 0, Math.PI * 2); ctx.fill();
    // Membrana externa (óvalo).
    ctx.fillStyle = "#3a1a0a";
    ctx.beginPath(); ctx.ellipse(cx, cy, rxp, ryp, 0, 0, Math.PI * 2); ctx.fill();
    // Matriz (interior cálido).
    var grad = ctx.createRadialGradient(cx - rxp * 0.25, cy - ryp * 0.3, rxp * 0.15, cx, cy, rxp);
    grad.addColorStop(0, "#FFD08A");
    grad.addColorStop(0.6, "#E08A3A");
    grad.addColorStop(1, "#9a4a18");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(cx, cy, rxp * 0.93, ryp * 0.90, 0, 0, Math.PI * 2); ctx.fill();
    // Crestas (folded inner membrane): líneas onduladas atravesando.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rxp * 0.92, ryp * 0.89, 0, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = "rgba(120, 50, 20, 0.65)"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    var nCrest = 6, breath = Math.sin(state.time * 1.4) * 2 * U;
    for (var i = 0; i < nCrest; i++) {
      var py = cy - ryp * 0.75 + (i + 0.5) * (ryp * 1.5 / nCrest);
      ctx.beginPath();
      ctx.moveTo(cx - rxp * 1.05, py + breath * (i % 2 ? 1 : -1));
      ctx.bezierCurveTo(
        cx - rxp * 0.40, py + ryp * 0.20 + breath,
        cx + rxp * 0.40, py - ryp * 0.20 - breath,
        cx + rxp * 1.05, py + breath * (i % 2 ? -1 : 1)
      );
      ctx.stroke();
    }
    ctx.restore();
    // Doble membrana externa (línea + sombra interior).
    ctx.strokeStyle = "#5a2410"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(cx, cy, rxp, ryp, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255, 230, 180, 0.45)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rxp * 0.93, ryp * 0.90, 0, 0, Math.PI * 2); ctx.stroke();
    // Destellito superior (highlight de óvalo).
    ctx.fillStyle = "rgba(255, 255, 220, 0.30)";
    ctx.beginPath(); ctx.ellipse(cx - rxp * 0.10, cy - ryp * 0.50, rxp * 0.42, ryp * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    // Etiqueta.
    ctx.fillStyle = "rgba(70, 30, 10, 0.75)";
    ctx.font = "bold 10px Fredoka, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("MITOCONDRIA", cx, cy + ryp + 6);
    ctx.restore();
  }

  function drawLymphDrop() {
    drawDripFor(state.lymph && state.lymph.drop);
    if (DRIP_R && DRIP_R.active) drawDripFor(state.lymphR && state.lymphR.drop);
  }
  function drawDripFor(d) {
    if (!d) return;
    // Collection animation: 1.0 -> 1.5 -> 0 with white flash.
    if (d.collected) {
      var ct = d.collectAnim / 0.30;
      var cs = ct < 0.5 ? 1 + ct * 1.0 : 1.5 - (ct - 0.5) * 3.0;
      cs = Math.max(0, cs);
      var ca = Math.max(0, 1 - ct);
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.globalAlpha = ca;
      ctx.fillStyle = "rgba(255, 255, 255, " + ca + ")";
      ctx.beginPath();
      ctx.arc(0, 0, 14 * U * cs, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFEB3B";
      ctx.beginPath();
      ctx.arc(0, 0, 9 * U * cs, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    // Sprint 7: bigger drop (~18px diameter design), brighter gradient,
    // pulsating gold glow halo.
    var alpha = Math.max(0, Math.min(1, d.life / Math.min(d.max, 1.5)));
    if (d.life > 1.5) alpha = 1;
    var pulse = 0.85 + Math.sin(state.time * 5) * 0.18;
    var R = 9 * U;     // body radius (~18px diameter)
    var haloR = R * (2.0 + 0.3 * pulse);
    ctx.save();
    // Outer glow halo
    var halo = ctx.createRadialGradient(d.x, d.y, R * 0.6, d.x, d.y, haloR);
    halo.addColorStop(0, "rgba(255, 235, 59, " + (alpha * 0.55 * pulse) + ")");
    halo.addColorStop(0.6, "rgba(245, 127, 23, " + (alpha * 0.20) + ")");
    halo.addColorStop(1, "rgba(245, 127, 23, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(d.x, d.y, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(d.x, d.y);
    ctx.globalAlpha = alpha;
    // Drop body — radial gradient #FFEB3B center -> #F57F17 edge
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.15, 0, 0, R);
    grad.addColorStop(0, "#FFEB3B");
    grad.addColorStop(0.7, "#FBC02D");
    grad.addColorStop(1, "#F57F17");
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Teardrop shape, slightly larger than original
    ctx.moveTo(0, -R * 1.3);
    ctx.bezierCurveTo(R * 1.05, -R * 0.45, R * 1.05, R * 0.85, 0, R * 1.05);
    ctx.bezierCurveTo(-R * 1.05, R * 0.85, -R * 1.05, -R * 0.45, 0, -R * 1.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 100, 20, 0.8)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Inner highlight
    ctx.fillStyle = "rgba(255, 255, 240, 0.85)";
    ctx.beginPath();
    ctx.ellipse(-R * 0.30, -R * 0.50, R * 0.30, R * 0.50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Connective tissue render (cached).
  function drawTissue() {
    var T = state.tissue;
    if (!T) return;
    // Update reactivity: enemies near tissue elements set reactiveTimer.
    var enemies = state.enemies;
    var rThresh = 30 * U;
    for (var pi = 0; pi < T.platelets.length; pi++) {
      var p = T.platelets[pi];
      if (p.reactiveTimer > 0) p.reactiveTimer -= 0.016;
      for (var ei = 0; ei < enemies.length; ei++) {
        var en = enemies[ei];
        if (en.dead || en.absorbing || en.state === "falling") continue;
        if (Math.hypot(en.x - p.x, en.y - p.y) < rThresh) {
          p.reactiveTimer = 1.5;
          break;
        }
      }
    }
    for (var fi = 0; fi < T.fibrin.length; fi++) {
      var f = T.fibrin[fi];
      if (f.reactiveTimer > 0) f.reactiveTimer -= 0.016;
      for (var ei2 = 0; ei2 < enemies.length; ei2++) {
        var en2 = enemies[ei2];
        if (en2.dead || en2.absorbing || en2.state === "falling") continue;
        if (Math.hypot(en2.x - f.x, en2.y - f.y) < rThresh) {
          f.reactiveTimer = 1.5;
          break;
        }
      }
    }
    // Collagen (background, far)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1;
    for (var ci = 0; ci < T.collagen.length; ci++) {
      var c = T.collagen[ci];
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.endX, c.endY);
      ctx.stroke();
    }
    // Fibroblasts (oval cells with darker nucleus)
    for (var bi = 0; bi < T.fibroblasts.length; bi++) {
      var b = T.fibroblasts[bi];
      var pulse = 1 + Math.sin(state.time * 0.6 + b.phase) * 0.04;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = "rgba(232, 184, 148, 0.85)";
      ctx.beginPath();
      ctx.ellipse(0, 0, b.rx * pulse, b.ry * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(140, 90, 70, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Nucleus
      ctx.fillStyle = "rgba(110, 70, 50, 0.7)";
      ctx.beginPath();
      ctx.ellipse(0, 0, b.rx * 0.35, b.ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Epithelial clusters (small polygons)
    for (var ei3 = 0; ei3 < T.epithelials.length; ei3++) {
      var ep = T.epithelials[ei3];
      ctx.save();
      ctx.translate(ep.x, ep.y);
      ctx.rotate(ep.rot);
      ctx.fillStyle = "rgba(232, 184, 148, 0.55)";
      ctx.strokeStyle = "rgba(140, 90, 70, 0.45)";
      ctx.lineWidth = 1;
      for (var sx = -1; sx <= 1; sx++) {
        for (var sy = -1; sy <= 1; sy++) {
          if ((sx + sy) % 2 !== 0) continue;
          ctx.beginPath();
          for (var ss = 0; ss < ep.sides; ss++) {
            var sa = (ss / ep.sides) * Math.PI * 2;
            var spx = sx * ep.size * 1.2 + Math.cos(sa) * ep.size * 0.6;
            var spy = sy * ep.size * 1.2 + Math.sin(sa) * ep.size * 0.6;
            if (ss === 0) ctx.moveTo(spx, spy); else ctx.lineTo(spx, spy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // Fibrin (curved threads, near path)
    for (var fi2 = 0; fi2 < T.fibrin.length; fi2++) {
      var fb = T.fibrin[fi2];
      var react = fb.reactiveTimer > 0 ? Math.min(1, fb.reactiveTimer / 1.5) : 0;
      ctx.strokeStyle = react > 0
        ? "rgba(255, 215, 100, " + (0.6 + react * 0.4) + ")"
        : "rgba(244, 228, 188, 0.65)";
      ctx.lineWidth = 1 + react * 0.5;
      ctx.beginPath();
      var midX = (fb.x + fb.endX) / 2 + fb.ctrlOff;
      var midY = (fb.y + fb.endY) / 2 + fb.ctrlOff;
      ctx.moveTo(fb.x, fb.y);
      ctx.quadraticCurveTo(midX, midY, fb.endX, fb.endY);
      ctx.stroke();
    }
    // Platelets (small starburst shapes, near path, vibrate when reactive)
    for (var pi2 = 0; pi2 < T.platelets.length; pi2++) {
      var pl = T.platelets[pi2];
      var react2 = pl.reactiveTimer > 0 ? Math.min(1, pl.reactiveTimer / 1.5) : 0;
      var jitter = react2 > 0 ? (Math.random() - 0.5) * 1.5 : Math.sin(state.time * 4 + pl.phase) * 0.4;
      ctx.save();
      ctx.translate(pl.x + jitter * U, pl.y + jitter * U);
      ctx.rotate(pl.rot + state.time * 0.2);
      ctx.fillStyle = react2 > 0 ? "#FFFFFF" : "#C8A2C8";
      ctx.beginPath();
      var spikes = 6;
      for (var sp = 0; sp < spikes * 2; sp++) {
        var srad = (sp % 2 === 0) ? pl.size : pl.size * 0.5;
        var sang = (sp / (spikes * 2)) * Math.PI * 2;
        var ssx = Math.cos(sang) * srad;
        var ssy = Math.sin(sang) * srad;
        if (sp === 0) ctx.moveTo(ssx, ssy); else ctx.lineTo(ssx, ssy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = react2 > 0 ? "rgba(255, 220, 100, 0.8)" : "rgba(120, 70, 130, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // -------- AMBIENT BLOOD CELLS -----------------------------------------
  function ensureAmbient() {
    var target = Math.max(8, Math.min(20, Math.round(FIELD_W * FIELD_H / 22000)));
    while (state.ambient.length < target) {
      state.ambient.push({
        x: FIELD_LEFT + Math.random() * FIELD_W,
        y: FIELD_TOP + Math.random() * FIELD_H,
        r: (3 + Math.random() * 5) * U,
        vx: (Math.random() - 0.5) * 6 * U,
        vy: (Math.random() - 0.5) * 6 * U,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.10 + Math.random() * 0.10
      });
    }
    while (state.ambient.length > target) state.ambient.pop();
  }

  function updateAmbient(dt) {
    if (FIELD_W <= 0 || FIELD_H <= 0) return;
    ensureAmbient();
    for (var i = 0; i < state.ambient.length; i++) {
      var a = state.ambient[i];
      a.phase += dt * 0.6;
      a.x += a.vx * dt + Math.cos(a.phase) * 0.3;
      a.y += a.vy * dt + Math.sin(a.phase * 0.8) * 0.3;
      if (a.x < FIELD_LEFT - 10) a.x = FIELD_RIGHT + 10;
      else if (a.x > FIELD_RIGHT + 10) a.x = FIELD_LEFT - 10;
      if (a.y < FIELD_TOP - 10) a.y = FIELD_BOTTOM + 10;
      else if (a.y > FIELD_BOTTOM + 10) a.y = FIELD_TOP - 10;
    }
    updateInflammation(dt);
    updateMitosis(dt);
    updatePatrol(dt);
    updateRestos(dt);
    updateCollectors(dt);
    updateBarricada(dt);
  }

  // -------- BARRICADA (coagulation barricade on main path) -------------
  function spawnBarricada() {
    if (state.barricada) return;
    if (!PATH.main || !PATH.main.length) return;
    // Weighted progress on MAIN path (60% mid, 30% early, 10% late, max 0.95).
    var roll = Math.random();
    var fraction;
    if (roll < 0.6)      fraction = 0.30 + Math.random() * 0.40;     // mid
    else if (roll < 0.9) fraction = Math.random() * 0.30;             // early
    else                 fraction = 0.70 + Math.random() * 0.25;      // late capped at 0.95
    if (fraction > 0.95) fraction = 0.95;
    var progressPx = fraction * PATH.main.length;
    var p = sampleBeziers(PATH.main.beziers, progressPx);
    // Generate platelets clustered around the spawn point.
    var platelets = [];
    var n = 8 + Math.floor(Math.random() * 5); // 8-12
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = (3 + Math.random() * 9) * U;
      var dispAng = Math.random() * Math.PI * 2;
      var flightAng = Math.random() * Math.PI * 2;
      platelets.push({
        ox: Math.cos(ang) * rad,
        oy: Math.sin(ang) * rad,
        size: (2.4 + Math.random() * 1.5) * U,
        rot: Math.random() * Math.PI,
        vibPhase: Math.random() * Math.PI * 2,
        flightX: Math.cos(flightAng) * 30 * U,
        flightY: Math.sin(flightAng) * 30 * U,
        dispersalVx: Math.cos(dispAng) * 80 * U,
        dispersalVy: Math.sin(dispAng) * 80 * U
      });
    }
    var fibrins = [];
    var fn = 4 + Math.floor(Math.random() * 3); // 4-6
    for (var f = 0; f < fn; f++) {
      var fa1 = Math.random() * Math.PI * 2;
      var fa2 = fa1 + Math.PI + (Math.random() - 0.5) * 1.0;
      var r1 = (8 + Math.random() * 6) * U;
      var r2 = (8 + Math.random() * 6) * U;
      fibrins.push({
        ox1: Math.cos(fa1) * r1, oy1: Math.sin(fa1) * r1,
        ox2: Math.cos(fa2) * r2, oy2: Math.sin(fa2) * r2,
        ctrlOx: (Math.random() - 0.5) * 8 * U,
        ctrlOy: (Math.random() - 0.5) * 8 * U
      });
    }
    state.barricada = {
      x: p.x, y: p.y,
      age: 0,
      life: 4.0 + Math.random() * 2.0,   // 4-6s before dissolving
      formTime: 1.0,
      dissolveTime: 0.8,
      bstate: "forming",                 // forming -> active -> dissolving
      platelets: platelets,
      fibrins: fibrins,
      textTimer: 1.5
    };
    state.nextBarricadaAt = 12 + Math.random() * 6;
  }

  function updateBarricada(dt) {
    if (state.gameOver || state.victory || state.confirmRestart || state.levelTransition) return;
    if (!state.barricada) {
      state.nextBarricadaAt -= dt;
      if (state.nextBarricadaAt <= 0) spawnBarricada();
      return;
    }
    var b = state.barricada;
    b.age += dt;
    if (b.textTimer > 0) b.textTimer -= dt;
    if (b.bstate === "forming" && b.age >= b.formTime) b.bstate = "active";
    if (b.bstate !== "dissolving" && b.age >= b.life) {
      b.bstate = "dissolving";
    }
    if (b.bstate === "dissolving" && b.age >= b.life + b.dissolveTime) {
      // Unblock any blocked enemies still stuck here, then remove barricada.
      for (var u = 0; u < state.enemies.length; u++) {
        var eu = state.enemies[u];
        if (eu.state === "blocked") eu.state = "walking";
      }
      state.barricada = null;
      return;
    }
    // Apply blocking to walking enemies within the catch radius.
    var blockR = 22 * U;
    var blocking = b.bstate !== "dissolving";
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.dead || e.absorbing) continue;
      var d = Math.hypot(e.x - b.x, e.y - b.y);
      if (blocking && e.state === "walking" && d < blockR) {
        e.state = "blocked";
      } else if (!blocking && e.state === "blocked") {
        e.state = "walking";
      }
    }
  }

  function drawBarricada() {
    var b = state.barricada;
    if (!b) return;
    var tForm = Math.min(1, b.age / b.formTime);
    var tDissolve = b.bstate === "dissolving"
      ? Math.min(1, (b.age - b.life) / b.dissolveTime)
      : 0;
    ctx.save();
    ctx.translate(b.x, b.y);
    // Outer aura
    var auraAlpha = b.bstate === "active"
      ? 0.20 + 0.12 * Math.sin(b.age * 6)
      : (b.bstate === "forming" ? 0.06 + tForm * 0.18 : (1 - tDissolve) * 0.22);
    var auraR = 22 * U * (b.bstate === "forming" ? tForm : (b.bstate === "dissolving" ? 1 + tDissolve * 0.4 : 1));
    var aura = ctx.createRadialGradient(0, 0, auraR * 0.4, 0, 0, auraR);
    aura.addColorStop(0, "rgba(255, 235, 150, " + auraAlpha + ")");
    aura.addColorStop(1, "rgba(255, 235, 150, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();
    // Fibrin threads (drawn under platelets)
    var fibAlpha = b.bstate === "forming" ? tForm * 0.85
                 : b.bstate === "dissolving" ? (1 - tDissolve) * 0.9
                 : 0.7 + 0.3 * Math.sin(b.age * 4);
    ctx.strokeStyle = "rgba(244, 228, 188, " + fibAlpha + ")";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    var spread = b.bstate === "forming" ? tForm
               : b.bstate === "dissolving" ? (1 + tDissolve * 0.4)
               : 1;
    for (var f = 0; f < b.fibrins.length; f++) {
      var fb = b.fibrins[f];
      ctx.beginPath();
      ctx.moveTo(fb.ox1 * spread, fb.oy1 * spread);
      ctx.quadraticCurveTo(fb.ctrlOx, fb.ctrlOy, fb.ox2 * spread, fb.oy2 * spread);
      ctx.stroke();
    }
    // Platelets
    for (var i = 0; i < b.platelets.length; i++) {
      var pl = b.platelets[i];
      var px, py;
      if (b.bstate === "forming") {
        var fly = 1 - tForm;
        px = pl.ox + pl.flightX * fly;
        py = pl.oy + pl.flightY * fly;
      } else if (b.bstate === "dissolving") {
        px = pl.ox + pl.dispersalVx * tDissolve;
        py = pl.oy + pl.dispersalVy * tDissolve;
      } else {
        px = pl.ox + Math.sin(b.age * 8 + pl.vibPhase) * U;
        py = pl.oy + Math.cos(b.age * 8 + pl.vibPhase) * U;
      }
      var scale = b.bstate === "dissolving" ? Math.max(0, 1 - tDissolve)
                : (b.bstate === "forming" ? 0.4 + tForm * 0.6 : 1);
      if (scale <= 0) continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pl.rot + b.age * 0.4);
      ctx.fillStyle = "#C8A2C8";
      ctx.beginPath();
      var spikes = 6;
      for (var sp = 0; sp < spikes * 2; sp++) {
        var srad = (sp % 2 === 0) ? pl.size : pl.size * 0.5;
        var sang = (sp / (spikes * 2)) * Math.PI * 2;
        var ssx = Math.cos(sang) * srad * scale;
        var ssy = Math.sin(sang) * srad * scale;
        if (sp === 0) ctx.moveTo(ssx, ssy); else ctx.lineTo(ssx, ssy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 70, 130, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // Floating "TAPÓN DE FIBRINA" text on spawn.
    if (b.textTimer > 0) {
      var alpha = Math.min(1, b.textTimer / 0.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      var fs = Math.max(9, 10 * U);          // más pequeño
      ctx.font = "bold " + fs + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var label = "TAPÓN DE FIBRINA";
      var tw = ctx.measureText(label).width;
      // Clamp dentro del campo para que SIEMPRE se vea (aunque el tapón esté
      // pegado a un borde del camino).
      var margin = 6;
      var tx = Math.max(FIELD_LEFT + margin + tw / 2,
                Math.min(FIELD_RIGHT - margin - tw / 2, b.x));
      var ty = b.y - 30 * U - (1.5 - b.textTimer) * 14 * U;
      ty = Math.max(FIELD_TOP + 10 * U, ty);
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(60, 50, 0, 0.85)";
      ctx.strokeText(label, tx, ty);
      ctx.fillStyle = "#FFE680";
      ctx.fillText(label, tx, ty);
      ctx.restore();
    }
  }

  // -------- RESTOS (pathogen remnants) ---------------------------------
  var MAX_RESTOS = 15;
  var RESTO_LIFE = 8.0;
  function dropResto(x, y) {
    if (state.restos.length >= MAX_RESTOS) state.restos.shift();
    var dots = [];
    var n = 3 + Math.floor(Math.random() * 3); // 3-5 puntos
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = (1.5 + Math.random() * 5) * U;  // visible spread
      dots.push({
        ox: Math.cos(ang) * rad,
        oy: Math.sin(ang) * rad,
        r: (2.6 + Math.random() * 1.4) * U  // 2.6-4 px each, clearly visible
      });
    }
    state.restos.push({
      x: x, y: y,
      dots: dots,
      life: RESTO_LIFE, max: RESTO_LIFE,
      claimedBy: null
    });
  }
  function updateRestos(dt) {
    for (var i = 0; i < state.restos.length; i++) {
      var r = state.restos[i];
      r.life -= dt;
    }
    state.restos = state.restos.filter(function (r) { return r.life > 0; });
  }
  function drawRestos() {
    for (var i = 0; i < state.restos.length; i++) {
      var r = state.restos[i];
      // Fade alpha during last 1.5s
      var alpha = r.life > 1.5 ? 0.65 : (r.life / 1.5) * 0.65;
      // Soft halo
      ctx.fillStyle = "rgba(178, 34, 34, " + (alpha * 0.25) + ")";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 9 * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(178, 34, 34, " + alpha + ")";
      for (var d = 0; d < r.dots.length; d++) {
        var dot = r.dots[d];
        ctx.beginPath();
        ctx.arc(r.x + dot.ox, r.y + dot.oy, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // -------- COLLECTORS (cleanup cells) --------------------------------
  function ensureCollectors() {
    while (state.collectors.length < 2) {
      var x, y, ok = false;
      for (var attempt = 0; attempt < 40 && !ok; attempt++) {
        x = FIELD_LEFT + 40 + Math.random() * (FIELD_W - 80);
        y = FIELD_TOP + FIELD_H * 0.30 + Math.random() * FIELD_H * 0.50;
        if (distPointToPath(x, y) > 50 * U) ok = true;
      }
      if (!ok) {
        // Fallback: place dead-center if path is too dense.
        x = FIELD_LEFT + FIELD_W * 0.50;
        y = FIELD_TOP + FIELD_H * 0.55;
      }
      var ang = Math.random() * Math.PI * 2;
      state.collectors.push({
        x: x, y: y,
        vx: Math.cos(ang) * 30 * U,
        vy: Math.sin(ang) * 30 * U,
        wanderTimer: 0.5 + Math.random() * 1.0,  // first wander very soon
        idlePhase: Math.random() * Math.PI * 2,
        cstate: "IDLE",      // IDLE | COLLECTING | ABSORBING
        target: null,
        absorbTimer: 0
      });
    }
  }

  function updateCollectors(dt) {
    ensureCollectors();
    var SPEED_IDLE = 36 * U;        // ~0.4 * virus speed
    var SPEED_COLLECTING = 50 * U;  // ~0.5 * virus speed
    var DETECT_RADIUS = 240 * U;    // pickup detection radius
    var COLLECT_RADIUS = 10 * U;
    for (var i = 0; i < state.collectors.length; i++) {
      var c = state.collectors[i];
      c.idlePhase += dt;
      // ABSORBING animation lock — only animation runs.
      if (c.cstate === "ABSORBING") {
        c.absorbTimer -= dt;
        if (c.absorbTimer <= 0) {
          c.cstate = "IDLE";
          c.wanderTimer = 0; // resume wander immediately
        }
        continue;
      }
      // If we had a target but it disappeared, drop back to IDLE.
      if (c.target && state.restos.indexOf(c.target) < 0) {
        c.target = null;
        c.cstate = "IDLE";
        c.wanderTimer = 0;
      }
      // IDLE: search EVERY frame for the nearest unclaimed resto, no radius cap.
      if (c.cstate === "IDLE") {
        var nearest = null, nearestD = Infinity;
        for (var ri = 0; ri < state.restos.length; ri++) {
          var r = state.restos[ri];
          if (r.claimedBy) continue;
          var dd = Math.hypot(r.x - c.x, r.y - c.y);
          if (dd < nearestD) { nearestD = dd; nearest = r; }
        }
        if (nearest) {
          nearest.claimedBy = c;
          c.target = nearest;
          c.cstate = "COLLECTING";
        }
      }
      // COLLECTING: navigate straight toward target. Path clearance is
      // disabled while collecting so the cell can cross the path to reach
      // the resto.
      if (c.cstate === "COLLECTING" && c.target) {
        var tx = c.target.x, ty = c.target.y;
        var dx = tx - c.x, dy = ty - c.y;
        var d = Math.hypot(dx, dy) || 0.0001;
        if (d <= COLLECT_RADIUS) {
          // Reach! Absorb the resto.
          state.atp += 5;
          pushEffect({
            kind: "atpText",
            x: c.target.x, y: c.target.y - 8 * U,
            vy: -34 * U,
            text: "+5 ATP",
            life: 0.8, max: 0.8,
            color: "#50C878"
          });
          for (var sp = 0; sp < 8; sp++) {
            var sa = Math.random() * Math.PI * 2;
            pushEffect({
              kind: "particle",
              x: c.target.x, y: c.target.y,
              vx: Math.cos(sa) * 36 * U,
              vy: Math.sin(sa) * 36 * U,
              life: 0.35, max: 0.5,
              color: "rgba(255, 255, 255, 0.85)"
            });
          }
          state.restos = state.restos.filter(function (rr) { return rr !== c.target; });
          c.target = null;
          c.cstate = "ABSORBING";
          c.absorbTimer = 0.40;
          continue;
        }
        c.vx = (dx / d) * SPEED_COLLECTING;
        c.vy = (dy / d) * SPEED_COLLECTING;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      } else if (c.cstate === "IDLE") {
        // IDLE wander: pick new direction every 2-4s.
        c.wanderTimer -= dt;
        if (c.wanderTimer <= 0) {
          c.wanderTimer = 2 + Math.random() * 2;
          var ang2 = Math.random() * Math.PI * 2;
          c.vx = Math.cos(ang2) * SPEED_IDLE;
          c.vy = Math.sin(ang2) * SPEED_IDLE;
        }
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        // Path clearance ONLY in IDLE so wander doesn't sit on the path.
        var dpath = distPointToPath(c.x, c.y);
        if (dpath < 30 * U) {
          c.vx = -c.vx * 0.9;
          c.vy = -c.vy * 0.9;
          c.x += c.vx * dt * 1.5;
          c.y += c.vy * dt * 1.5;
          if (distPointToPath(c.x, c.y) < 28 * U) {
            c.x += (Math.random() - 0.5) * 30 * U;
            c.y += (Math.random() - 0.5) * 30 * U;
          }
        }
      }
      // Stay inside the body zone (15-85% of FIELD_H), with bouncing.
      var minY = FIELD_TOP + FIELD_H * 0.18;
      var maxY = FIELD_BOTTOM - FIELD_H * 0.16;
      if (c.x < FIELD_LEFT + 16) { c.x = FIELD_LEFT + 16; c.vx = Math.abs(c.vx); }
      if (c.x > FIELD_RIGHT - 16) { c.x = FIELD_RIGHT - 16; c.vx = -Math.abs(c.vx); }
      if (c.y < minY) { c.y = minY; c.vy = Math.abs(c.vy); }
      if (c.y > maxY) { c.y = maxY; c.vy = -Math.abs(c.vy); }
    }
  }
  function drawCollectors() {
    for (var i = 0; i < state.collectors.length; i++) {
      var c = state.collectors[i];
      var R = 12 * U;
      var pulse = 1 + Math.sin(c.idlePhase) * 0.04;
      // Absorbing pulse: 1.0 -> 1.2 -> 0.9 -> 1.0 over 0.4s
      if (c.absorbTimer > 0) {
        var t = 1 - c.absorbTimer / 0.4;
        var anim;
        if (t < 0.4) anim = 1 + (t / 0.4) * 0.2;       // grow to 1.2
        else if (t < 0.7) anim = 1.2 - ((t - 0.4) / 0.3) * 0.3;  // shrink to 0.9
        else anim = 0.9 + ((t - 0.7) / 0.3) * 0.1;     // back to 1.0
        pulse = anim;
      }
      drawShadow(c.x, c.y + R * 0.85, R * 0.85, R * 0.22);
      ctx.save();
      ctx.translate(c.x, c.y);
      // White flash during absorption
      if (c.absorbTimer > 0) {
        var flashT = c.absorbTimer / 0.4;
        ctx.shadowColor = "rgba(255, 255, 255, " + flashT + ")";
        ctx.shadowBlur = 14;
      }
      // Body
      ctx.fillStyle = "#FFF8DC";
      ctx.beginPath();
      ctx.arc(0, 0, R * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#D4C99A";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Lobed nucleus (4 lobes like clover)
      ctx.fillStyle = "#B0B0B0";
      for (var lb = 0; lb < 4; lb++) {
        var la = lb * Math.PI / 2 + 0.3;
        var lx = Math.cos(la) * R * 0.30;
        var ly = Math.sin(la) * R * 0.30;
        ctx.beginPath();
        ctx.arc(lx, ly, R * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center connector
      ctx.fillStyle = "#A0A0A0";
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // -------- EXTERIOR ENVIRONMENT (above skin) --------------------------
  function drawExteriorZone() {
    var h = FIELD_H * 0.07;
    var y = FIELD_TOP;
    // Sky-ish gradient
    var grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, "#87B5A0");
    grad.addColorStop(1, "#6B9E7A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, VW, h);
    // Deterministic grass/twigs/pollen positions per orientation.
    var seed = 5557 + (PATH.orientation === "portrait" ? 11 : 23);
    function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    // Pasto strokes
    ctx.strokeStyle = "rgba(90, 139, 79, 0.85)";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (var i = 0; i < 5; i++) {
      var gx = rng() * VW;
      var glen = (8 + rng() * 5) * U;
      ctx.beginPath();
      ctx.moveTo(gx, y + h);
      ctx.quadraticCurveTo(gx + (rng() - 0.5) * 4 * U, y + h - glen * 0.6,
                           gx + (rng() - 0.5) * 4 * U, y + h - glen);
      ctx.stroke();
    }
    // Twigs (branches)
    ctx.strokeStyle = "rgba(120, 80, 50, 0.7)";
    ctx.lineWidth = 1.4;
    for (var t = 0; t < 2; t++) {
      var tx = rng() * VW;
      var ty = y + h * 0.35 + rng() * h * 0.4;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 14 * U, ty - 4 * U);
      ctx.moveTo(tx + 6 * U, ty - 2 * U);
      ctx.lineTo(tx + 9 * U, ty - 6 * U);
      ctx.stroke();
    }
    // Floating pollen with slow vertical animation
    for (var p = 0; p < 4; p++) {
      var px = (p + 1) * VW / 5 + Math.sin(state.time * 0.3 + p) * 6;
      var py = y + h * 0.5 + Math.sin(state.time * 0.4 + p * 1.7) * h * 0.3;
      ctx.fillStyle = "rgba(255, 230, 150, 0.7)";
      ctx.beginPath();
      ctx.arc(px, py, 1.6 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bottom edge separator (subtle line)
    ctx.strokeStyle = "rgba(90, 139, 79, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + h);
    ctx.lineTo(VW, y + h);
    ctx.stroke();
  }

  // -------- INFLAMMATION PULSE -----------------------------------------
  function updateInflammation(dt) {
    if (state.inflammation) {
      state.inflammation.t += dt;
      if (state.inflammation.t >= state.inflammation.max) state.inflammation = null;
    } else {
      state.nextInflammationAt -= dt;
      if (state.nextInflammationAt <= 0) {
        state.nextInflammationAt = 8 + Math.random() * 2;
        // Center at middle of path roughly.
        var mid = pathPos(PATH.total * 0.5);
        state.inflammation = { x: mid.x, y: mid.y, t: 0, max: 2.5 };
      }
    }
  }
  function drawInflammation() {
    var inf = state.inflammation;
    if (!inf) return;
    var t = inf.t / inf.max;
    var maxR = Math.min(FIELD_W, FIELD_H) * 0.55;
    var r = maxR * t;
    var alpha = (1 - t) * 0.18;
    ctx.save();
    ctx.strokeStyle = "rgba(220, 100, 100, " + alpha + ")";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(inf.x, inf.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(220, 100, 100, " + (alpha * 0.3) + ")";
    ctx.beginPath();
    ctx.arc(inf.x, inf.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // -------- MITOSIS (cell division ambience) ---------------------------
  function spawnMitosisAt() {
    // Random spot far from path, lymph node, wound, vessel.
    for (var attempt = 0; attempt < 30; attempt++) {
      var x = FIELD_LEFT + 30 + Math.random() * (FIELD_W - 60);
      var y = FIELD_TOP + FIELD_H * 0.20 + Math.random() * FIELD_H * 0.55;
      if (distPointToPath(x, y) < 70 * U) continue;
      if (Math.hypot(x - DRIP.x, y - DRIP.y) < DRIP.w + 30 * U) continue;
      if (PATH.entry && Math.hypot(x - PATH.entry.x, y - PATH.entry.y) < 80 * U) continue;
      if (PATH.exit && Math.hypot(x - PATH.exit.x, y - PATH.exit.y) < 80 * U) continue;
      return { x: x, y: y, t: 0, max: 7.0 };  // 4s divide + 3s linger
    }
    return null;
  }
  function updateMitosis(dt) {
    if (state.mitosis) {
      state.mitosis.t += dt;
      if (state.mitosis.t >= state.mitosis.max) state.mitosis = null;
    } else {
      state.nextMitosisAt -= dt;
      if (state.nextMitosisAt <= 0) {
        state.nextMitosisAt = 15 + Math.random() * 5;
        state.mitosis = spawnMitosisAt();
      }
    }
  }
  function drawMitosis() {
    var m = state.mitosis;
    if (!m) return;
    var phase = m.t / m.max;          // 0..1 over 7s
    var divPhase = Math.min(1, m.t / 4.0);  // first 4s = mitosis itself
    var afterPhase = Math.max(0, (m.t - 4.0) / 3.0);  // 0..1 in last 3s
    var r = 9 * U;
    ctx.save();
    if (m.t < 4.0) {
      // Round -> elongate -> figure-eight -> divide
      var sep = divPhase * r * 1.6;  // separation between centers
      var elongate = 1 + divPhase * 0.3;
      ctx.fillStyle = "rgba(245, 220, 192, 0.85)";
      ctx.strokeStyle = "rgba(180, 140, 110, 0.7)";
      ctx.lineWidth = 1.2;
      // Two overlapping circles becoming separate.
      ctx.beginPath();
      ctx.arc(m.x - sep / 2, m.y, r * elongate, 0, Math.PI * 2);
      ctx.arc(m.x + sep / 2, m.y, r * elongate, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Nucleus pair
      ctx.fillStyle = "rgba(180, 140, 110, 0.5)";
      ctx.beginPath();
      ctx.arc(m.x - sep / 2, m.y, r * 0.4, 0, Math.PI * 2);
      ctx.arc(m.x + sep / 2, m.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Two daughter cells lingering and fading.
      var alpha = Math.max(0, 1 - afterPhase);
      ctx.globalAlpha = alpha;
      var sep = r * 1.6;
      ctx.fillStyle = "rgba(245, 220, 192, 0.85)";
      ctx.strokeStyle = "rgba(180, 140, 110, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(m.x - sep / 2, m.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(m.x + sep / 2, m.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(180, 140, 110, 0.5)";
      ctx.beginPath();
      ctx.arc(m.x - sep / 2, m.y, r * 0.4, 0, Math.PI * 2);
      ctx.arc(m.x + sep / 2, m.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // -------- PATROL MACROPHAGES (decorative) ---------------------------
  function ensurePatrol() {
    if (state.patrol.length >= 2) return;
    while (state.patrol.length < 2) {
      var x, y, ok = false;
      for (var attempt = 0; attempt < 20 && !ok; attempt++) {
        x = FIELD_LEFT + 40 + Math.random() * (FIELD_W - 80);
        y = FIELD_TOP + FIELD_H * 0.22 + Math.random() * FIELD_H * 0.50;
        if (distPointToPath(x, y) > 70 * U) ok = true;
      }
      if (!ok) return;
      state.patrol.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 30 * U,
        vy: (Math.random() - 0.5) * 30 * U,
        nextTurnAt: state.time + 2 + Math.random() * 3,
        scaredTimer: 0,
        idlePhase: Math.random() * Math.PI * 2
      });
    }
  }
  function updatePatrol(dt) {
    ensurePatrol();
    for (var i = 0; i < state.patrol.length; i++) {
      var m = state.patrol[i];
      // Check enemy proximity -> get scared and run away.
      var nearestEn = null, nearestD = Infinity;
      for (var ej = 0; ej < state.enemies.length; ej++) {
        var en = state.enemies[ej];
        if (en.dead || en.absorbing || en.state === "falling" || en.state === "entering") continue;
        var d = Math.hypot(en.x - m.x, en.y - m.y);
        if (d < nearestD) { nearestD = d; nearestEn = en; }
      }
      if (nearestEn && nearestD < 80 * U) {
        m.scaredTimer = 2.0;
        // Push away from enemy.
        var dx = m.x - nearestEn.x, dy = m.y - nearestEn.y;
        var dn = Math.hypot(dx, dy) || 1;
        m.vx = (dx / dn) * 50 * U;
        m.vy = (dy / dn) * 50 * U;
      } else if (m.scaredTimer > 0) {
        m.scaredTimer -= dt;
      } else if (state.time >= m.nextTurnAt) {
        m.nextTurnAt = state.time + 3 + Math.random() * 2;
        var ang = Math.random() * Math.PI * 2;
        var sp = (15 + Math.random() * 20) * U;
        m.vx = Math.cos(ang) * sp;
        m.vy = Math.sin(ang) * sp;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      // Avoid path
      var dpath = distPointToPath(m.x, m.y);
      if (dpath < 50 * U) {
        // bounce away from path direction
        m.vx = -m.vx;
        m.vy = -m.vy;
        m.x += m.vx * dt * 2;
        m.y += m.vy * dt * 2;
      }
      // Soft bounds
      var minY = FIELD_TOP + FIELD_H * 0.20;
      var maxY = FIELD_BOTTOM - FIELD_H * 0.16;
      if (m.x < FIELD_LEFT + 20) { m.x = FIELD_LEFT + 20; m.vx = Math.abs(m.vx); }
      if (m.x > FIELD_RIGHT - 20) { m.x = FIELD_RIGHT - 20; m.vx = -Math.abs(m.vx); }
      if (m.y < minY) { m.y = minY; m.vy = Math.abs(m.vy); }
      if (m.y > maxY) { m.y = maxY; m.vy = -Math.abs(m.vy); }
      m.idlePhase += dt * 1.2;
    }
  }
  function drawPatrol() {
    if (!state.patrol) return;
    for (var i = 0; i < state.patrol.length; i++) {
      var m = state.patrol[i];
      var R = 14 * U;
      var pulse = 1 + Math.sin(m.idlePhase) * 0.04;
      drawShadow(m.x, m.y + R * 0.85, R * 0.85, R * 0.22);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(m.x, m.y);
      // Pseudópodos
      ctx.fillStyle = "#4A90E2";
      for (var b = 0; b < 5; b++) {
        var ang = b * Math.PI * 2 / 5 + state.time * 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * R * 0.9, Math.sin(ang) * R * 0.9, R * 0.30, 0, Math.PI * 2);
        ctx.fill();
      }
      // Body
      var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R * pulse);
      grad.addColorStop(0, "#a7d0f6");
      grad.addColorStop(0.6, "#4A90E2");
      grad.addColorStop(1, "#2767a8");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, R * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2767a8";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Tiny eyes — scared if scared
      var eyeR = R * 0.16;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-R * 0.25, -R * 0.05, eyeR, 0, Math.PI * 2);
      ctx.arc( R * 0.25, -R * 0.05, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a22";
      var pupilOff = m.scaredTimer > 0 ? -eyeR * 0.3 : 0;
      ctx.beginPath();
      ctx.arc(-R * 0.25, -R * 0.05 + pupilOff, eyeR * 0.5, 0, Math.PI * 2);
      ctx.arc( R * 0.25, -R * 0.05 + pupilOff, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // -------- INPUT ---------------------------------------------------------
  function canvasPosFromEvent(evt) {
    var rect = canvas.getBoundingClientRect();
    var clientX = evt.clientX, clientY = evt.clientY;
    if (clientX === undefined && evt.touches && evt.touches[0]) {
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function inRect(x, y, r) {
    return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function handleClick(x, y) {
    // Pantalla de título: un clic en cualquier lado arranca el cómic.
    if (state.showTitle) {
      state.showTitle = false;
      state.introScene = 0; state.introT = 0;
      ensureAudio();
      return;
    }
    // Comic intro: "Saltar" cierra todo; un tap normal avanza de escena.
    if (state.showIntro) {
      if (UI.introSkip && inRect(x, y, UI.introSkip)) { state.showIntro = false; }
      else { introAdvance(); }
      return;
    }
    // Sprint 8A: tooltip lateral no se cierra por tap; auto-close 3s.
    // Los taps pasan a través al juego underneath.
    // Cinematic end overlay: only the Continue button responds (after T+7s).
    if (state.cinematicEnd) {
      if (state.cinematicEnd.buttonShown && UI.cinematicBtn && inRect(x, y, UI.cinematicBtn)) {
        showMsg("La Fase 2 esta en desarrollo. Reiniciando Fase 1...");
        restartFromLevel1();
      }
      return;
    }
    // Confirmation modal: only modal buttons respond.
    if (state.confirmRestart) {
      if (inRect(x, y, UI.modalYes)) {
        state = newState();
        state.vistos = loadVistos();  // mantener la colección al restart
        rebuildPath();
        layoutDrip();
      } else if (inRect(x, y, UI.modalNo)) {
        state.confirmRestart = false;
      }
      return;
    }
    // Compendio: si está abierto, interceptamos taps.
    if (state.compendiumOpen) {
      // Cerrar
      if (UI.compendiumCloseBtn && inRect(x, y, UI.compendiumCloseBtn)) {
        closeCompendium();
        return;
      }
      // Tabs
      if (UI.compendiumTabs) {
        for (var ti = 0; ti < UI.compendiumTabs.length; ti++) {
          var tab = UI.compendiumTabs[ti];
          if (inRect(x, y, tab)) {
            state.compendiumTab = tab.key;
            state.compendiumSelected = null;
            state.compendiumScroll = 0;
            return;
          }
        }
      }
      // Cards (tarjetas con nombre): seleccionar para detalle.
      if (UI.compendiumCards) {
        for (var ci = 0; ci < UI.compendiumCards.length; ci++) {
          var card = UI.compendiumCards[ci];
          if (inRect(x, y, card)) {
            state.compendiumSelected = card.typeId;
            return;
          }
        }
      }
      // Tap FUERA del modal cierra. Tap dentro del modal pero en vacío
      // (entre cards, área del detail) se consume sin cerrar — el usuario
      // estaba accidentalmente cerrando al tocar zonas neutras.
      if (UI.compendiumModal && !inRect(x, y, UI.compendiumModal)) {
        closeCompendium();
      }
      return;
    }
    // Botón "Compendio" arriba del dock — abre el overlay.
    if (UI.compendiumBtn && inRect(x, y, UI.compendiumBtn)) {
      openCompendium();
      return;
    }
    // End overlay (legacy victory screen no longer used; restart goes to level 1).
    if (state.gameOver || state.victory) {
      if (inRect(x, y, UI.endRestartBtn)) restartFromLevel1();
      return;
    }
    // Antígenos: tap sobre el drop lo recoge inmediatamente.
    if (state.dissemination && tryTapAntigen(x, y)) {
      sfx("upgrade");
      return;
    }
    // Pickup de desbloqueo de torre (cualquier fase): tap sobre la cápsula la consume.
    if (tryTapUnlockPickup(x, y)) {
      return;
    }
    // Plaqueta madura del megacariocito: tap entra en modo colocar.
    if (state.dissemination && tryTapPlaquetaPickup(x, y)) {
      return;
    }
    // Tap sobre un GERMEN con glow (no visto aún): abre el compendio y lo
    // marca como visto.
    for (var enei = 0; enei < state.enemies.length; enei++) {
      var enE = state.enemies[enei];
      if (enE.dead) continue;
      var defE = enE.def;
      if (!defE || !defE.id) continue;
      if (state.vistos[defE.id]) continue;
      var radE = defE.radius * U * (enE.radiusScale || 1);
      var dxE = x - enE.x, dyE = y - enE.y;
      // Hit radius generoso (1.4x) porque hay halo glow alrededor.
      if (dxE * dxE + dyE * dyE <= (radE * 1.4) * (radE * 1.4)) {
        state.vistos[defE.id] = true;
        saveVistos(state.vistos);
        // El aviso "Toca al nuevo enemigo" se chequea reactivamente en
        // render, así que se autocorrige cuando este tipo entra a vistos.
        openCompendium(defE.id, "germs");
        return;
      }
    }
    // Respuestas inmunes: tap sobre una carta del panel.
    if (state.dissemination && UI.responseCards) {
      for (var rci = 0; rci < UI.responseCards.length; rci++) {
        var rc = UI.responseCards[rci];
        if (x >= rc.x && x <= rc.x + rc.w &&
            y >= rc.y && y <= rc.y + rc.h) {
          var def = RESPONSE_DEFS[rc.key];
          if (state.antigens.count < def.cost) return;
          if (rc.key === "dendritica") {
            state.antigens.count -= def.cost;
            spawnDendriticStain();
            sfx("upgrade");
            return;
          } else {
            state.armedResponse = (state.armedResponse === rc.key) ? null : rc.key;
            return;
          }
        }
      }
    }
    // Respuesta armada: tap en un carril para colocar NET o Trombosis.
    if (state.armedResponse && state.dissemination) {
      var lane = laneAt(x);
      var type = state.armedResponse;
      var def2 = RESPONSE_DEFS[type];
      if (hasResponseInLaneAny(lane)) {
        showMsg("Ya hay un efecto en este carril");
        state.armedResponse = null;
        return;
      }
      if (state.antigens.count < def2.cost) {
        state.armedResponse = null;
        return;
      }
      var laneX = PATH.organDoors ? PATH.organDoors[lane].x : x;
      var laneY = y;
      state.antigens.count -= def2.cost;
      if (type === "netosis") spawnNet(laneX, laneY);
      else if (type === "plaquetas") spawnThrombus(laneX, laneY);
      state.armedResponse = null;
      sfx("upgrade");
      return;
    }
    // Recoger fragmentos de complemento (tap sobre un C3b flotante).
    if (state.fragments && state.fragments.length) {
      for (var fi = 0; fi < state.fragments.length; fi++) {
        var fr = state.fragments[fi];
        if (Math.hypot(x - fr.x, y - fr.y) < 36 * U) {
          state.complement = Math.min(MAC_COST, state.complement + 1);
          state.fragments.splice(fi, 1);
          sfx("tick");
          pushEffect({ kind: "atpText", x: fr.x, y: fr.y - 10 * U, vy: -32 * U, text: "+C3b", life: 0.7, max: 0.7, color: "#7CFC9E" });
          if (state.complement >= MAC_COST) showMsg("¡Complemento listo! Ensambla el Cañón MAC (grupo Especial).");
          return;
        }
      }
    }
    // Medicamento sanguíneo: tocar el vial activa el poder del nivel =
    // bloques llenos (1 = más leve ... 4 = antibiótico máximo).
    if (UI.medVial && inRect(x, y, UI.medVial)) {
      var lvl = medFilledBlocks();
      if (lvl >= 1) { applyMedicationLevel(lvl); return; }
    }
    // Tópico: tocar el bloque (lleno) lanza el ácido al camino.
    if (!state.dissemination && UI.topicalVial && inRect(x, y, UI.topicalVial)) {
      if (state.topicalCharge >= TOPICAL_MAX) { applyTopical(); return; }
    }
    // Lymphatic drip drop: highest priority so finger taps grant ATP.
    if (tryClickDrip(x, y)) return;
    // HUD
    if (y < FIELD_TOP) {
      if (inRect(x, y, UI.restartBtn)) {
        state.confirmRestart = true;
        sfx("tick");
        return;
      }
      if (inRect(x, y, UI.muteBtn)) {
        setMuted(!audio.muted);
        sfx("tick");
        return;
      }
      // Next-wave button removed in Sprint 5 (waves auto-spawn).
      return;
    }
    // Dock lateral derecho
    if (x >= FIELD_RIGHT) {
      // Cabeceras de grupo: abren/cierran su categoría (grupos desplegables).
      if (UI.groupHeaders) {
        for (var gh = 0; gh < UI.groupHeaders.length; gh++) {
          var H = UI.groupHeaders[gh];
          var hy = UI.cardStrip.y + H.contentY - (state.panelScroll || 0);
          if (hy + H.h < UI.cardStrip.y || hy > UI.cardStrip.y + UI.cardStrip.h) continue;
          if (inRect(x, y, { x: H.x, y: hy, w: H.w, h: H.h })) {
            state.openGroups = state.openGroups || {};
            state.openGroups[H.id] = !state.openGroups[H.id];
            state.panelScroll = 0;
            layoutUI();
            sfx("tick");
            return;
          }
        }
      }
      // Cards en content space vertical; convertir a viewport con scroll.
      for (var i = 0; i < UI.cards.length; i++) {
        var ccard = UI.cards[i];
        var viewRect = {
          x: ccard.x,
          y: UI.cardStrip.y + ccard.contentY - (state.panelScroll || 0),
          w: ccard.w, h: ccard.h
        };
        // Solo si la card está visible dentro del strip.
        if (viewRect.y + viewRect.h < UI.cardStrip.y) continue;
        if (viewRect.y > UI.cardStrip.y + UI.cardStrip.h) continue;
        if (inRect(x, y, viewRect)) {
          var typeId = ccard.typeId;
          if (towerAffordable(TOWER_DEFS[typeId])) {
            var prev = state.selectedToBuild;
            state.selectedToBuild = state.selectedToBuild === typeId ? null : typeId;
            state.selectedTower = null;
            sfx("tick");
            // Show range hint at center of field as initial preview.
            if (state.selectedToBuild) {
              var def = TOWER_DEFS[state.selectedToBuild];
              setRangeHint(
                FIELD_LEFT + FIELD_W * 0.5,
                FIELD_TOP + FIELD_H * 0.5,
                def.levels[0].range * U,
                def.color,
                "build"
              );
            } else {
              clearRangeHint();
            }
          } else {
            flashFail();
          }
          return;
        }
      }
      if (state.selectedTower) {
        if (inRect(x, y, UI.deselectBtn)) {
          state.selectedTower = null;
          clearRangeHint();
          sfx("tick");
          return;
        }
        if (inRect(x, y, UI.sellBtn)) { sellTower(state.selectedTower); clearRangeHint(); return; }
        if (state.selectedTower.level < 2 && inRect(x, y, UI.upgradeBtn)) {
          tryUpgrade(state.selectedTower);
          // refresh hint to show new range
          var stt = towerStats(state.selectedTower);
          setRangeHint(state.selectedTower.x, state.selectedTower.y, stt.range * U, state.selectedTower.def.color, "tower");
          return;
        }
      }
      return;
    }
    // Field
    if (state.selectedToBuild) {
      if (canPlaceTowerAt(x, y)) {
        var def = TOWER_DEFS[state.selectedToBuild];
        if (towerAffordable(def)) {
          payTower(def);
          placeTower(x, y, state.selectedToBuild);
          if (!towerAffordable(def)) {
            state.selectedToBuild = null;
            clearRangeHint();
          } else {
            // Keep build mode; update hint to last placed location
            setRangeHint(x, y, def.levels[0].range * U, def.color, "build");
          }
        }
      } else {
        // Update hint to current spot (red) and shake field border.
        setRangeHint(x, y, TOWER_DEFS[state.selectedToBuild].levels[0].range * U, "rgba(220,80,80,1)", "build");
        flashFail();
      }
      return;
    }
    // Cañón MAC: si está seleccionado, un tap en el campo (no sobre una torre)
    // dispara la mancha de ácido al punto elegido — manual.
    if (state.selectedTower && state.selectedTower.def.manualFire) {
      var onTower = null;
      for (var ct = 0; ct < state.towers.length; ct++) {
        var ctw = state.towers[ct];
        if (Math.hypot(ctw.x - x, ctw.y - y) <= 32 * U) { onTower = ctw; break; }
      }
      if (!onTower) {
        var cn = state.selectedTower, cst = towerStats(cn);
        if (Math.hypot(x - cn.x, y - cn.y) <= cst.range * U) {
          if (cn.cooldown > 0) { flashFail(); return; }
          fireCannonAt(cn, x, y);
          return;
        } else {
          flashFail(); return;
        }
      }
    }
    // Try to select an existing tower.
    var picked = null;
    for (var t = 0; t < state.towers.length; t++) {
      var tw = state.towers[t];
      if (Math.hypot(tw.x - x, tw.y - y) <= 32 * U) { picked = tw; break; }
    }
    state.selectedTower = picked;
    if (picked) {
      var ps = towerStats(picked);
      setRangeHint(picked.x, picked.y, ps.range * U, picked.def.color, "tower");
      sfx("tick");
    } else {
      clearRangeHint();
    }
  }

  function canPlaceTowerAt(x, y) {
    if (state.dissemination) return canPlaceTowerAtDissemination(x, y);
    var pad = 24 * U;
    // Restrict to body interior zone (15%-85% of field height).
    // Espiral usa casi todo el campo: permitir colocar en casi toda la altura.
    var bodyTop = FIELD_TOP + FIELD_H * 0.07;
    var bodyBottom = FIELD_BOTTOM - FIELD_H * 0.07;
    if (y < bodyTop + pad || y > bodyBottom - pad) return false;
    if (x < FIELD_LEFT + pad || x > FIELD_RIGHT - pad) return false;
    // Min distance to ANY path segment (branches + main).
    if (distPointToPath(x, y) < 30 * U) return false;
    for (var i = 0; i < state.towers.length; i++) {
      if (Math.hypot(state.towers[i].x - x, state.towers[i].y - y) < 38 * U) return false;
    }
    // Keep clear of lymph node bean.
    if (Math.abs(x - DRIP.x) < DRIP.w + 14 * U &&
        Math.abs(y - DRIP.y) < DRIP.h + 14 * U) return false;
    // Keep clear of all 3 wounds and the vessel.
    if (PATH.wounds) {
      for (var w = 0; w < PATH.wounds.length; w++) {
        if (Math.hypot(x - PATH.wounds[w].x, y - PATH.wounds[w].y) < 40 * U) return false;
      }
    }
    if (PATH.exit && Math.hypot(x - PATH.exit.x, y - PATH.exit.y) < 44 * U) return false;
    if (PATH.confluence && Math.hypot(x - PATH.confluence.x, y - PATH.confluence.y) < 36 * U) return false;
    return true;
  }

  // En el nivel puente: terreno libre. Solo se bloquean las mitocondrias,
  // las grietas de spawn arriba, las puertas de órgano abajo y las propias
  // torres. El path NO bloquea — el jugador puede colocar dentro de un carril.
  function canPlaceTowerAtDissemination(x, y) {
    var pad = 12 * U;
    if (y < FIELD_TOP + pad || y > FIELD_BOTTOM - pad) return false;
    if (x < FIELD_LEFT + pad || x > FIELD_RIGHT - pad) return false;
    for (var i = 0; i < state.towers.length; i++) {
      if (Math.hypot(state.towers[i].x - x, state.towers[i].y - y) < 28 * U) return false;
    }
    // Mitocondrias laterales.
    if (Math.abs(x - DRIP.x) < DRIP.w + 10 * U &&
        Math.abs(y - DRIP.y) < DRIP.h + 10 * U) return false;
    if (DRIP_R && DRIP_R.active &&
        Math.abs(x - DRIP_R.x) < DRIP_R.w + 10 * U &&
        Math.abs(y - DRIP_R.y) < DRIP_R.h + 10 * U) return false;
    // Megacariocito.
    if (state.megakaryocyte) {
      var dxMk = x - state.megakaryocyte.x, dyMk = y - state.megakaryocyte.y;
      if (dxMk * dxMk + dyMk * dyMk < (38 * U) * (38 * U)) return false;
    }
    // Grietas (spawn arriba).
    if (PATH.wounds) {
      for (var w = 0; w < PATH.wounds.length; w++) {
        if (Math.hypot(x - PATH.wounds[w].x, y - PATH.wounds[w].y) < 26 * U) return false;
      }
    }
    // Puertas de órgano (abajo).
    if (PATH.organDoors) {
      for (var d = 0; d < PATH.organDoors.length; d++) {
        if (Math.hypot(x - PATH.organDoors[d].x, y - PATH.organDoors[d].y) < 30 * U) return false;
      }
    }
    return true;
  }

  function tryUpgrade(t) {
    if (t.level >= 2) return;
    var cost = t.def.upgradeCost[t.level];
    if (state.atp < cost) { flashFail(); return; }
    state.atp -= cost;
    t.level += 1;
    t.levelupAnim = 0.5;
    // Mejorar sube la vida máxima y suma esa diferencia a la vida actual,
    // pero NO cura el daño ya recibido (sin recuperación).
    var newMax = t.def.levels[t.level].hp;
    t.hp += (newMax - t.maxHp);
    t.maxHp = newMax;
    sfx("upgrade");
    showMsg(t.def.name + " mejorado a Nv " + (t.level + 1));
  }

  function sellTower(t) {
    var refund = Math.floor(t.def.cost * 0.6);
    for (var i = 0; i < t.level; i++) refund += Math.floor(t.def.upgradeCost[i] * 0.5);
    state.atp += refund;
    state.towers = state.towers.filter(function (x) { return x !== t; });
    state.selectedTower = null;
    sfx("sell");
    showMsg("Vendido (+" + refund + " ATP)");
  }

  function flashFail() { state.lastPlaceFailedAt = state.time; }
  function showMsg(text) { state.msg = text; state.msgTimer = 1.6; }

  // Sprint 8B-Polish-3B: tap-vs-drag para el card-strip scrolleable.
  // Si el pointerdown cae dentro del strip, se difiere el handleClick a
  // pointerup para distinguir tap (totalDx <6) de drag (scroll).
  var TAP_DRAG_THRESHOLD = 6;
  function pointInCardStrip(x, y) {
    var s = UI.cardStrip;
    if (!s) return false;
    return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  }
  function onPointerDown(evt) {
    evt.preventDefault();
    ensureAudio();
    var p = canvasPosFromEvent(evt);
    state.pointer.x = p.x; state.pointer.y = p.y; state.pointer.isOver = true;
    // Cancelar momentum si seguía corriendo cuando el dedo vuelve a tocar.
    state.panelMomentum = 0;
    if (pointInCardStrip(p.x, p.y) && !state.showIntro && !state.cinematicEnd && !state.confirmRestart) {
      var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      state.panelDragPending = {
        startX: p.x, startY: p.y,
        startScroll: state.panelScroll || 0,
        lastY: p.y,
        lastT: now,
        velocity: 0,
        dragged: false
      };
      return;
    }
    handleClick(p.x, p.y);
  }
  function onPointerMove(evt) {
    var p = canvasPosFromEvent(evt);
    state.pointer.x = p.x; state.pointer.y = p.y; state.pointer.isOver = true;
    if (state.panelDragPending) {
      var dp = state.panelDragPending;
      var dy = p.y - dp.startY;
      if (!dp.dragged && Math.abs(dy) > TAP_DRAG_THRESHOLD) {
        dp.dragged = true;
      }
      if (dp.dragged && UI.cardStrip) {
        var maxScroll = Math.max(0, UI.cardStrip.contentH - UI.cardStrip.h);
        state.panelScroll = Math.max(0, Math.min(maxScroll, dp.startScroll - dy));
        // Track instantaneous velocity for release momentum (px/s).
        var nowM = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
        var deltaT = Math.max(1, nowM - dp.lastT);
        var moveDy = p.y - dp.lastY;
        var instantV = -moveDy / (deltaT / 1000);
        dp.velocity = dp.velocity * 0.7 + instantV * 0.3;  // smoothed
        dp.lastY = p.y;
        dp.lastT = nowM;
      }
      return;
    }
    // While building, follow finger/cursor with the range hint inside the field.
    if (state.selectedToBuild && p.y >= FIELD_TOP && p.y < FIELD_BOTTOM && p.x < FIELD_RIGHT) {
      var def = TOWER_DEFS[state.selectedToBuild];
      setRangeHint(p.x, p.y, def.levels[0].range * U, def.color, "build");
    }
  }
  function onPointerUp(evt) {
    if (state.panelDragPending) {
      var dp = state.panelDragPending;
      state.panelDragPending = null;
      if (!dp.dragged) {
        handleClick(dp.startX, dp.startY);
      } else if (Math.abs(dp.velocity) > 80) {
        // Inertial flick: arranca con la velocidad final del drag.
        state.panelMomentum = dp.velocity;
      }
    }
  }
  function onPointerLeave() {
    state.pointer.isOver = false;
    if (state.panelDragPending) state.panelDragPending = null;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  function selectBuildType(typeId) {
    state.selectedToBuild = typeId;
    state.selectedTower = null;
    var def = TOWER_DEFS[typeId];
    setRangeHint(
      FIELD_LEFT + FIELD_W * 0.5,
      FIELD_TOP + FIELD_H * 0.5,
      def.levels[0].range * U,
      def.color,
      "build"
    );
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      ensureAudio();
      if (state.showTitle) { state.showTitle = false; state.introScene = 0; state.introT = 0; return; }
      if (state.showIntro) { introAdvance(); return; }
      if (state.confirmRestart) { state.confirmRestart = false; return; }
      // Waves auto-spawn now; SPACE skips countdown if any.
      if (!state.waveActive && state.nextWaveAt > 0 && !state.cinematicEnd) {
        state.nextWaveAt = 0;
      }
    } else if (e.key === "Escape") {
      if (state.confirmRestart) state.confirmRestart = false;
      else { state.selectedToBuild = null; state.selectedTower = null; clearRangeHint(); }
    } else if (e.key === "1") { selectBuildType("neutrofilo");
    } else if (e.key === "2") { selectBuildType("linfocitoB");
    } else if (e.key === "3") { selectBuildType("linfocitoT");
    } else if (e.key === "m" || e.key === "M") {
      setMuted(!audio.muted);
    } else if (e.key === "r" || e.key === "R") {
      state.confirmRestart = true;
    } else if ((e.key === "B" || e.key === "b") && e.shiftKey) {
      // DEV cheat: salto directo al nivel puente "Diseminación" (test).
      if (!state.dissemination && !state.showTitle && !state.showIntro) {
        state.waveIdx = 18;
        enterDissemination();
      }
    }
  });

  // -------- RENDER --------------------------------------------------------
  function clearCanvas() {
    // Fondo oscuro siempre — evita que el canvas color se cuele por encima del
    // HUD si VH cambia (URL bar de Safari iOS).
    ctx.fillStyle = state.dissemination ? "#1a0e12" : "#f8e8e0";
    ctx.fillRect(0, 0, VW, VH);
    // Tissue speckles only over field area.
    ctx.fillStyle = "rgba(200, 140, 130, 0.18)";
    var seed = 13;
    var n = Math.max(40, Math.round(FIELD_W * FIELD_H / 7000));
    for (var i = 0; i < n; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      var x = FIELD_LEFT + (seed / 233280) * FIELD_W;
      seed = (seed * 9301 + 49297) % 233280;
      var y = FIELD_TOP + (seed / 233280) * FIELD_H;
      seed = (seed * 9301 + 49297) % 233280;
      var r = (1 + (seed / 233280) * 3) * U;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // -------- SKIN / CIRCULATORY AMBIENT BANDS ---------------------------
  // Fase 1 piel: bandas teñidas de dermis e hipodermis para que el campo se
  // lea como un corte de piel (epidermis -> dermis -> hipodermis -> vaso).
  function drawSkinLayers() {
    var x = FIELD_LEFT, w = FIELD_W;
    function band(y0, y1, top, bottom) {
      var ya = FIELD_TOP + FIELD_H * y0;
      var yb = FIELD_TOP + FIELD_H * y1;
      var g = ctx.createLinearGradient(0, ya, 0, yb);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(x, ya, w, yb - ya);
    }
    // Dermis: rosa cálido. Hipodermis: amarillo grasa pálido.
    // Latido sutil del entorno (~1 Hz), como un corazón lejano.
    var hb = 1 + 0.10 * Math.sin((state.time || 0) * 1.1);
    band(0.15, 0.52, "rgba(228,140,128," + (0.26 * hb).toFixed(3) + ")", "rgba(224,128,116," + (0.16 * hb).toFixed(3) + ")");
    band(0.52, 0.82, "rgba(245,222,138," + (0.30 * hb).toFixed(3) + ")", "rgba(240,206,120," + (0.18 * hb).toFixed(3) + ")");
    // Etiquetas tenues de capa en el margen izquierdo.
    ctx.save();
    ctx.fillStyle = "rgba(120, 70, 70, 0.30)";
    ctx.font = "bold " + Math.max(8, Math.min(11, FIELD_W * 0.026)) + "px Fredoka, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("EPIDERMIS", x + 6 * U, FIELD_TOP + FIELD_H * 0.11);
    ctx.fillText("DERMIS",    x + 6 * U, FIELD_TOP + FIELD_H * 0.33);
    ctx.fillText("HIPODERMIS", x + 6 * U, FIELD_TOP + FIELD_H * 0.67);
    ctx.restore();
  }

  function drawSkinZone() {
    // Skin band reduced per Sprint 4A: 7-15% of field height.
    var skinTop = FIELD_TOP + FIELD_H * 0.07;
    var h = FIELD_H * 0.08;  // 15% - 7% = 8% band
    var y = skinTop;
    var grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, "#F4D1A6");
    grad.addColorStop(1, "#E8B894");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, VW, h);
    // Pores (deterministic seeded)
    var seed = 41;
    for (var i = 0; i < 36; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      var px = (seed / 233280) * VW;
      seed = (seed * 9301 + 49297) % 233280;
      var py = y + (seed / 233280) * h;
      seed = (seed * 9301 + 49297) % 233280;
      var pr = (1 + (seed / 233280) * 2) * U;
      ctx.fillStyle = "rgba(168, 122, 92, 0.42)";
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hairs (curved short strokes, all roughly same direction)
    ctx.strokeStyle = "rgba(139, 111, 71, 0.65)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    for (var j = 0; j < 14; j++) {
      seed = (seed * 9301 + 49297) % 233280;
      var hx = (seed / 233280) * VW;
      seed = (seed * 9301 + 49297) % 233280;
      var hy = y + (seed / 233280) * h * 0.80;
      seed = (seed * 9301 + 49297) % 233280;
      var len = (8 + (seed / 233280) * 7) * U;
      seed = (seed * 9301 + 49297) % 233280;
      var ang = -Math.PI / 2 + ((seed / 233280) - 0.5) * 0.6;
      var dx = Math.cos(ang), dy = Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(
        hx + dx * len * 0.6 + 3 * U, hy + dy * len * 0.6 + 1 * U,
        hx + dx * len, hy + dy * len
      );
      ctx.stroke();
    }
    // Fine grain texture
    for (var t = 0; t < 90; t++) {
      seed = (seed * 9301 + 49297) % 233280;
      var tx = (seed / 233280) * VW;
      seed = (seed * 9301 + 49297) % 233280;
      var ty = y + (seed / 233280) * h;
      ctx.fillStyle = "rgba(120, 80, 60, 0.08)";
      ctx.fillRect(tx, ty, 1, 1);
    }
    // Organic torn edge connecting skin to wound area.
    var edgeSeed = 131;
    ctx.fillStyle = "#E8B894";
    ctx.beginPath();
    ctx.moveTo(0, y + h);
    for (var ex = 0; ex <= VW; ex += 6) {
      edgeSeed = (edgeSeed * 9301 + 49297) % 233280;
      var jitter = ((edgeSeed / 233280) - 0.5) * 10 * U;
      ctx.lineTo(ex, y + h + jitter);
    }
    ctx.lineTo(VW, y + h - 4);
    ctx.lineTo(0, y + h - 4);
    ctx.closePath();
    ctx.fill();
    // Edge shadow line
    ctx.strokeStyle = "rgba(120, 80, 60, 0.4)";
    ctx.lineWidth = 1.2;
    edgeSeed = 131;
    ctx.beginPath();
    for (var ex2 = 0; ex2 <= VW; ex2 += 6) {
      edgeSeed = (edgeSeed * 9301 + 49297) % 233280;
      var j2 = ((edgeSeed / 233280) - 0.5) * 10 * U;
      if (ex2 === 0) ctx.moveTo(ex2, y + h + j2);
      else ctx.lineTo(ex2, y + h + j2);
    }
    ctx.stroke();
  }

  function drawCirculatoryZone() {
    var h = FIELD_H * 0.14;
    var y = FIELD_BOTTOM - h;
    var grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, "#7a0606");
    grad.addColorStop(1, "#3a0000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, VW, h);
    // Top organic edge that visually continues from the vessel mouth.
    var edgeSeed = 211;
    ctx.fillStyle = "#7a0606";
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (var ex = 0; ex <= VW; ex += 6) {
      edgeSeed = (edgeSeed * 9301 + 49297) % 233280;
      var jitter = ((edgeSeed / 233280) - 0.5) * 8 * U;
      ctx.lineTo(ex, y + jitter);
    }
    ctx.lineTo(VW, y - 3);
    ctx.lineTo(0, y - 3);
    ctx.closePath();
    ctx.fill();
    // Ambient erythrocytes drifting
    for (var i = 0; i < 11; i++) {
      var phase = state.time * (0.25 + (i % 3) * 0.06) + i * 1.7;
      var bx = (phase * 12 + i * VW * 0.11) % (VW + 60) - 30;
      var by = y + 6 * U + ((i * 11) % Math.max(1, h - 14 * U)) + Math.sin(phase * 1.1) * 3 * U;
      ctx.fillStyle = "rgba(220, 20, 60, 0.72)";
      ctx.beginPath();
      ctx.ellipse(bx, by, 5 * U, 3 * U, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(150, 10, 30, 0.55)";
      ctx.beginPath();
      ctx.arc(bx, by, 1.4 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rising oxygen bubbles
    for (var b = 0; b < 4; b++) {
      var bt = (state.time * 0.35 + b * 0.27) % 1;
      var bbx = (b + 1) * VW / 5 + Math.sin(state.time * 0.6 + b) * 6;
      var bby = y + h - bt * h;
      ctx.fillStyle = "rgba(255, 210, 215, " + (0.2 + 0.2 * (1 - bt)) + ")";
      ctx.beginPath();
      ctx.arc(bbx, bby, 2 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // Subtle flow lines
    ctx.strokeStyle = "rgba(255, 80, 80, 0.10)";
    ctx.lineWidth = 1;
    for (var f = 0; f < 5; f++) {
      var fy = y + ((f + 0.5) / 5) * h;
      ctx.beginPath();
      ctx.moveTo(0, fy);
      for (var fx = 0; fx <= VW; fx += 12) {
        var off = Math.sin(fx * 0.02 + state.time * 0.4 + f) * 2.5;
        ctx.lineTo(fx, fy + off);
      }
      ctx.stroke();
    }
    // Tracers from recently absorbed enemies
    for (var c = 0; c < state.circulatory.length; c++) {
      var cv = state.circulatory[c];
      var alpha = Math.max(0, cv.life / cv.max);
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = cv.color;
      ctx.beginPath();
      ctx.arc(cv.x, Math.min(cv.y, y + h - 6), cv.r * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function strokeBeziers(beziers) {
    if (!beziers || !beziers.length) return;
    ctx.beginPath();
    var first = beziers[0];
    ctx.moveTo(first.p0.x, first.p0.y);
    for (var i = 0; i < beziers.length; i++) {
      var s = beziers[i];
      ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p3.x, s.p3.y);
    }
    ctx.stroke();
  }

  function strokeAllPaths() {
    if (PATH.branches) {
      for (var b = 0; b < PATH.branches.length; b++) strokeBeziers(PATH.branches[b].beziers);
    }
    if (PATH.main) strokeBeziers(PATH.main.beziers);
  }

  // Sprint 7: inflammation marks management.
  var MAX_PATH_INFLAMMATION = 30;
  function pushPathInflammation(x, y) {
    if (!state.pathInflammation) state.pathInflammation = [];
    if (state.pathInflammation.length >= MAX_PATH_INFLAMMATION) {
      state.pathInflammation.shift();
    }
    state.pathInflammation.push({ x: x, y: y, intensity: 1.0 });
  }
  function updatePathInflammation(dt) {
    if (!state.pathInflammation) return;
    for (var i = 0; i < state.pathInflammation.length; i++) {
      state.pathInflammation[i].intensity -= dt / 5;  // full decay in 5s
    }
    state.pathInflammation = state.pathInflammation.filter(function (m) {
      return m.intensity > 0;
    });
  }
  function drawPathInflammation() {
    var marks = state.pathInflammation;
    if (!marks || !marks.length) return;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      var R = 25 * U * m.intensity;
      var alpha = 0.40 * m.intensity;
      var grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, R);
      grad.addColorStop(0, "rgba(192, 57, 43, " + alpha + ")");
      grad.addColorStop(1, "rgba(192, 57, 43, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(m.x, m.y, R, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Local accumulation of inflammation around a sample point — used to tint
  // the path borders red where many marks overlap (>3 in 40px radius).
  function inflammationAccum(x, y, radius) {
    var marks = state.pathInflammation;
    if (!marks || !marks.length) return 0;
    var acc = 0;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (Math.hypot(m.x - x, m.y - y) <= radius) acc += m.intensity;
    }
    return acc;
  }

  // Tint the outer border slightly redder when many inflammation marks are
  // active. Linearly mixes #e8b8b0 toward #c0392b based on total intensity.
  function computeBorderTint() {
    var marks = state.pathInflammation;
    if (!marks || !marks.length) return "#e8b8b0";
    var sum = 0;
    for (var i = 0; i < marks.length; i++) sum += marks[i].intensity;
    var k = Math.min(1, sum / 12);  // saturate at sum=12
    var r = Math.round(0xe8 + (0xc0 - 0xe8) * k);
    var g = Math.round(0xb8 + (0x39 - 0xb8) * k);
    var b = Math.round(0xb0 + (0x2b - 0xb0) * k);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function drawPath() {
    // En diseminación dibujamos líneas finas y discretas (no la espiral rosada).
    if (state.dissemination) {
      drawDisseminationPathStroke();
      return;
    }
    // Inflammation halos under the path strokes.
    drawPathInflammation();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Outer (rosy) borders: tint redder when inflammation accumulates.
    ctx.strokeStyle = computeBorderTint();
    ctx.lineWidth = 38 * U; strokeAllPaths();
    ctx.strokeStyle = "#d8978b"; ctx.lineWidth = 30 * U; strokeAllPaths();
    ctx.strokeStyle = "#c47a6e"; ctx.lineWidth = 22 * U; strokeAllPaths();
    // Confluence "blob" — slightly larger pad where the 3 branches merge.
    if (PATH.confluence) {
      ctx.fillStyle = "#c47a6e";
      ctx.beginPath();
      ctx.arc(PATH.confluence.x, PATH.confluence.y, 18 * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d8978b";
      ctx.beginPath();
      ctx.arc(PATH.confluence.x, PATH.confluence.y, 13 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 2.4 * U;
    ctx.setLineDash([4 * U, 10 * U]);
    ctx.lineCap = "round";
    strokeAllPaths();
    ctx.setLineDash([]);
    ctx.lineCap = "butt";
  }
  // Legacy alias kept for any straggler refs.
  function strokePathLine() { strokeAllPaths(); }

  // Path del puente: trazo fino y semitransparente — solo guía visual.
  function drawDisseminationPathStroke() {
    if (!PATH.branches || !PATH.branches.length) return;
    ctx.save();
    ctx.lineCap = "round";
    // Banda gruesa muy translúcida (la "vena" del carril).
    ctx.strokeStyle = "rgba(180, 60, 70, 0.10)";
    ctx.lineWidth = 12 * U;
    for (var b = 0; b < PATH.branches.length; b++) strokeBeziers(PATH.branches[b].beziers);
    // Trazo central tenue (dashed) que indica recorrido.
    ctx.strokeStyle = "rgba(230, 200, 180, 0.30)";
    ctx.lineWidth = 1.4 * U;
    ctx.setLineDash([5 * U, 9 * U]);
    for (var b2 = 0; b2 < PATH.branches.length; b2++) strokeBeziers(PATH.branches[b2].beziers);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---- Herida (wound) at path entry ------------------------------------
  // Stable jitter: precompute once.
  var WOUND_JITTER = (function () {
    var arr = [];
    var seed = 9871;
    for (var i = 0; i < 16; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      arr.push((seed / 233280) - 0.5);
    }
    return arr;
  })();
  var WOUND_DROPLETS = [];

  function drawSingleWound(ex, ey, phaseOffset) {
    var baseR = 22 * U;
    var flash = state.woundFlashTimer > 0 ? state.woundFlashTimer / 0.25 : 0;
    var palpitate = Math.sin(state.time * 5.2 + phaseOffset);
    var pulse = 1 + palpitate * (0.04 + flash * 0.04);
    var outerR = baseR * (1.35 + flash * 0.18) * (1 + palpitate * 0.06);
    var inflGrad = ctx.createRadialGradient(ex, ey, baseR, ex, ey, outerR);
    inflGrad.addColorStop(0, "rgba(255, 107, 107, 0.55)");
    inflGrad.addColorStop(1, "rgba(255, 107, 107, 0)");
    ctx.fillStyle = inflGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    var pts = WOUND_JITTER.length;
    var R = baseR * pulse;
    for (var i = 0; i < pts; i++) {
      var a = i * Math.PI * 2 / pts;
      var j = WOUND_JITTER[i];
      var rr = R * (0.85 + j * 0.30);
      var px = ex + Math.cos(a) * rr;
      var py = ey + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    var grad = ctx.createRadialGradient(ex, ey, R * 0.10, ex, ey, R);
    grad.addColorStop(0, "#5a0d0d");
    grad.addColorStop(0.6, "#8B1A1A");
    grad.addColorStop(1, "#B22222");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(80, 10, 10, 0.55)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  function drawCrackingWound(x, y, p) {
    // Barrera intacta que se agrieta a medida que p (0->1) sube hacia el 40%.
    ctx.save();
    var R = 15 * U;
    ctx.fillStyle = "rgba(185, 125, 112, 0.55)";
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(150, 30, 30, " + (0.35 + 0.5 * p) + ")";
    ctx.lineWidth = (1 + 2 * p) * U;
    ctx.lineCap = "round";
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5 + 0.3;
      var len = R * (0.35 + 0.75 * p);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(205, 45, 45, " + (0.12 + 0.42 * p) + ")";
    ctx.beginPath(); ctx.arc(x, y, R * 0.4 * (0.5 + p), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawWound() {
    if (!PATH.wounds || !PATH.wounds.length) return;
    var crackP = Math.min(1, (state.viralLoad / Math.max(1, state.viralThreshold)) / 0.40);
    for (var w = 0; w < PATH.wounds.length; w++) {
      var wd = PATH.wounds[w];
      if (wd.active) drawSingleWound(wd.x, wd.y, wd.phase || 0);
      else drawCrackingWound(wd.x, wd.y, crackP);
    }
    // Occasional escaping droplet from a random ACTIVE wound.
    if (Math.random() < 0.05 && WOUND_DROPLETS.length < 8) {
      var actIdx = [];
      for (var ai = 0; ai < PATH.wounds.length; ai++) if (PATH.wounds[ai].active) actIdx.push(ai);
      var pickIdx = actIdx.length ? actIdx[Math.floor(Math.random() * actIdx.length)] : 0;
      var pick = PATH.wounds[pickIdx];
      var ang = Math.random() * Math.PI * 2;
      WOUND_DROPLETS.push({
        x: pick.x, y: pick.y,
        vx: Math.cos(ang) * (10 + Math.random() * 14) * U,
        vy: Math.sin(ang) * (10 + Math.random() * 14) * U - 4 * U,
        life: 0.6 + Math.random() * 0.3,
        max: 0.9,
        r: (1.4 + Math.random() * 1.4) * U
      });
    }
    for (var dpi = 0; dpi < WOUND_DROPLETS.length; dpi++) {
      var dp = WOUND_DROPLETS[dpi];
      dp.life -= 1 / 60;
      dp.x += dp.vx / 60;
      dp.y += dp.vy / 60;
      dp.vy += 30 * U / 60;
      ctx.fillStyle = "rgba(178, 34, 34, " + Math.max(0, dp.life / dp.max) + ")";
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI * 2);
      ctx.fill();
    }
    WOUND_DROPLETS = WOUND_DROPLETS.filter(function (d) { return d.life > 0; });
  }

  // ---- Vaso (blood vessel) at path exit -------------------------------
  var VESSEL_RBC = (function () {
    var arr = [];
    for (var i = 0; i < 6; i++) {
      arr.push({
        a: Math.random() * Math.PI * 2,
        r: 0.25 + Math.random() * 0.55,
        speed: 0.4 + Math.random() * 0.5,
        size: 0.7 + Math.random() * 0.5
      });
    }
    return arr;
  })();

  function drawVessel() {
    if (!PATH.exit) return;
    var vx = PATH.exit.x, vy = PATH.exit.y;
    var w = 36 * U, h = 30 * U;
    // ~60 BPM = 1 Hz
    var beat = Math.sin(state.time * Math.PI * 2 * 1.0);
    var flash = state.vesselFlashTimer > 0 ? state.vesselFlashTimer / 0.30 : 0;
    var swallow = state.vesselSwallow > 0 ? (state.vesselSwallow / 0.20) : 0;
    var pulse = 1 + Math.max(0, beat) * 0.04 + flash * 0.10 + swallow * 0.20;
    var W = w * pulse, H = h * pulse;
    if (flash > 0) {
      // Red glow when an enemy gets absorbed.
      var glowG = ctx.createRadialGradient(vx, vy, W, vx, vy, W * 1.6);
      glowG.addColorStop(0, "rgba(255, 50, 50, " + flash * 0.5 + ")");
      glowG.addColorStop(1, "rgba(255, 50, 50, 0)");
      ctx.fillStyle = glowG;
      ctx.beginPath();
      ctx.arc(vx, vy, W * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Outer wall (pink-red, brighter under flash)
    ctx.fillStyle = flash > 0 ? "#7a1a1a" : "#5a1010";
    ctx.beginPath();
    ctx.ellipse(vx, vy, W, H, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner mouth (deep)
    var W2 = W - 5 * U, H2 = H - 5 * U;
    var grad = ctx.createRadialGradient(vx, vy, W2 * 0.15, vx, vy, W2);
    grad.addColorStop(0, "#1a0306");
    grad.addColorStop(0.5, "#5d0808");
    grad.addColorStop(1, "#8B0000");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(vx, vy, W2, H2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Erythrocytes circulating inside
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(vx, vy, W2 - 1, H2 - 1, 0, 0, Math.PI * 2);
    ctx.clip();
    for (var i = 0; i < VESSEL_RBC.length; i++) {
      var rb = VESSEL_RBC[i];
      var ang = rb.a + state.time * rb.speed;
      var rx = vx + Math.cos(ang) * W2 * rb.r;
      var ry = vy + Math.sin(ang) * H2 * rb.r;
      ctx.fillStyle = "rgba(220, 20, 60, 0.85)";
      ctx.beginPath();
      ctx.ellipse(rx, ry, 3.4 * U * rb.size, 2.2 * U * rb.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(150, 10, 30, 0.6)";
      ctx.beginPath();
      ctx.arc(rx, ry, 1.0 * U * rb.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Rim highlight
    ctx.strokeStyle = "rgba(255, 200, 200, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(vx, vy, W * 0.96, H * 0.96, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Label
    ctx.fillStyle = "rgba(80, 16, 16, 0.65)";
    ctx.font = 'italic 11px Fredoka, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("TORRENTE", vx, vy + H + 4);
  }

  function pulseVesselFlash() {
    state.vesselFlashTimer = 0.3;
  }
  function pulseWoundFlash() {
    state.woundFlashTimer = 0.25;
  }

  function drawHexagon(cx, cy, r, fill, stroke, strokeW) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 3 * i - Math.PI / 2;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW || 2; ctx.stroke(); }
  }

  function drawRangeIndicator(x, y, rangePx) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, rangePx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7 * U, 6 * U]);
    ctx.beginPath();
    ctx.arc(x, y, rangePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(40, 40, 60, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, rangePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawShadow(x, y, rx, ry) {
    ctx.fillStyle = "rgba(60, 30, 20, 0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawClosedEyes(cx, cy, eyeR, gapX) {
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = Math.max(1.4, 1.6 * U);
    ctx.lineCap = "round";
    var lx = cx - gapX, rx = cx + gapX;
    ctx.beginPath();
    ctx.moveTo(lx - eyeR, cy);
    ctx.quadraticCurveTo(lx, cy + eyeR * 0.45, lx + eyeR, cy);
    ctx.moveTo(rx - eyeR, cy);
    ctx.quadraticCurveTo(rx, cy + eyeR * 0.45, rx + eyeR, cy);
    ctx.stroke();
  }

  function drawXEyes(cx, cy, eyeR, gapX, color) {
    ctx.strokeStyle = color || "#1a1a22";
    ctx.lineWidth = Math.max(1.6, 1.9 * U);
    ctx.lineCap = "round";
    var lx = cx - gapX, rx = cx + gapX;
    ctx.beginPath();
    ctx.moveTo(lx - eyeR * 0.85, cy - eyeR * 0.85);
    ctx.lineTo(lx + eyeR * 0.85, cy + eyeR * 0.85);
    ctx.moveTo(lx + eyeR * 0.85, cy - eyeR * 0.85);
    ctx.lineTo(lx - eyeR * 0.85, cy + eyeR * 0.85);
    ctx.moveTo(rx - eyeR * 0.85, cy - eyeR * 0.85);
    ctx.lineTo(rx + eyeR * 0.85, cy + eyeR * 0.85);
    ctx.moveTo(rx + eyeR * 0.85, cy - eyeR * 0.85);
    ctx.lineTo(rx - eyeR * 0.85, cy + eyeR * 0.85);
    ctx.stroke();
  }

  function drawSparkleEyes(cx, cy, eyeR, gapX) {
    var lx = cx - gapX, rx = cx + gapX;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(lx, cy, eyeR * 1.05, 0, Math.PI * 2);
    ctx.arc(rx, cy, eyeR * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a22";
    ctx.beginPath();
    ctx.arc(lx, cy, eyeR * 0.62, 0, Math.PI * 2);
    ctx.arc(rx, cy, eyeR * 0.62, 0, Math.PI * 2);
    ctx.fill();
    function star(sx, sy, r) {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        var rr = (i % 2) ? r * 0.4 : r;
        var px = sx + Math.cos(a) * rr;
        var py = sy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#fffacd";
    star(lx + eyeR * 0.20, cy - eyeR * 0.30, eyeR * 0.45);
    star(rx + eyeR * 0.20, cy - eyeR * 0.30, eyeR * 0.45);
  }

  function drawFocusedEyes(cx, cy, eyeR, gapX, browAngle, browLift) {
    // Narrowed/focused eyes for attacking state.
    var lx = cx - gapX, rx = cx + gapX;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(lx, cy, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(rx, cy, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = Math.max(0.8, 1 * U);
    ctx.beginPath();
    ctx.ellipse(lx, cy, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(rx, cy, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#1a1a22";
    ctx.beginPath();
    ctx.arc(lx, cy, eyeR * 0.50, 0, Math.PI * 2);
    ctx.arc(rx, cy, eyeR * 0.50, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = Math.max(1.4, 1.6 * U);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lx - eyeR * 0.9, cy - eyeR * 0.9 - browLift + browAngle);
    ctx.lineTo(lx + eyeR * 0.6, cy - eyeR * 0.9 - browLift - browAngle);
    ctx.moveTo(rx - eyeR * 0.6, cy - eyeR * 0.9 - browLift - browAngle);
    ctx.lineTo(rx + eyeR * 0.9, cy - eyeR * 0.9 - browLift + browAngle);
    ctx.stroke();
  }

  function drawHurtEyes(cx, cy, eyeR, gapX) {
    // Squinted "ouch" eyes
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = Math.max(1.4, 1.7 * U);
    ctx.lineCap = "round";
    var lx = cx - gapX, rx = cx + gapX;
    ctx.beginPath();
    ctx.moveTo(lx - eyeR * 0.9, cy - eyeR * 0.5);
    ctx.lineTo(lx + eyeR * 0.9, cy + eyeR * 0.4);
    ctx.moveTo(lx - eyeR * 0.9, cy + eyeR * 0.4);
    ctx.lineTo(lx + eyeR * 0.9, cy - eyeR * 0.5);
    ctx.moveTo(rx - eyeR * 0.9, cy - eyeR * 0.5);
    ctx.lineTo(rx + eyeR * 0.9, cy + eyeR * 0.4);
    ctx.moveTo(rx - eyeR * 0.9, cy + eyeR * 0.4);
    ctx.lineTo(rx + eyeR * 0.9, cy - eyeR * 0.5);
    ctx.stroke();
  }

  function drawAnimeEyes(cx, cy, eyeR, gapX, pupilOffsetX, pupilOffsetY, browAngle, browLift, mood) {
    // mood: "happy", "neutral", "fierce", "smug", "sleepy", "angry", "evil"
    var lx = cx - gapX, rx = cx + gapX;
    // White of eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(lx, cy, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
    ctx.ellipse(rx, cy, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = Math.max(0.8, 1 * U);
    ctx.beginPath();
    ctx.ellipse(lx, cy, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(rx, cy, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Pupils
    var pr = eyeR * 0.55;
    ctx.fillStyle = "#1a1a22";
    ctx.beginPath();
    ctx.arc(lx + pupilOffsetX, cy + pupilOffsetY, pr, 0, Math.PI * 2);
    ctx.arc(rx + pupilOffsetX, cy + pupilOffsetY, pr, 0, Math.PI * 2);
    ctx.fill();
    // Highlights
    ctx.fillStyle = "#ffffff";
    var hr = eyeR * 0.22;
    ctx.beginPath();
    ctx.arc(lx + pupilOffsetX - pr * 0.4, cy + pupilOffsetY - pr * 0.4, hr, 0, Math.PI * 2);
    ctx.arc(rx + pupilOffsetX - pr * 0.4, cy + pupilOffsetY - pr * 0.4, hr, 0, Math.PI * 2);
    ctx.fill();
    // Brows
    if (mood === "fierce" || mood === "angry" || mood === "evil") {
      ctx.strokeStyle = "#1a1a22";
      ctx.lineWidth = Math.max(1.4, 1.6 * U);
      ctx.lineCap = "round";
      // Cejas enojadas: extremo INTERNO hacia abajo (al centro), externo arriba.
      ctx.beginPath();
      ctx.moveTo(lx - eyeR * 0.9, cy - eyeR - browLift - (browAngle));
      ctx.lineTo(lx + eyeR * 0.6, cy - eyeR - browLift + (browAngle));
      ctx.moveTo(rx - eyeR * 0.6, cy - eyeR - browLift + (browAngle));
      ctx.lineTo(rx + eyeR * 0.9, cy - eyeR - browLift - (browAngle));
      ctx.stroke();
    }
  }

  function drawAnimeMouth(cx, cy, w, h, kind) {
    ctx.strokeStyle = "#1a1a22";
    ctx.fillStyle = "#1a1a22";
    ctx.lineWidth = Math.max(1.2, 1.4 * U);
    ctx.lineCap = "round";
    if (kind === "smile") {
      ctx.beginPath();
      ctx.arc(cx, cy - h * 0.3, w * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (kind === "neutral") {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.35, cy);
      ctx.lineTo(cx + w * 0.35, cy);
      ctx.stroke();
    } else if (kind === "serious") {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.3, cy + h * 0.2);
      ctx.quadraticCurveTo(cx, cy - h * 0.2, cx + w * 0.3, cy + h * 0.2);
      ctx.stroke();
    } else if (kind === "open") {
      // Engulfing macrofago
      ctx.fillStyle = "#3a1818";
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.5, h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "fanged") {
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.5, 0, Math.PI);
      ctx.fillStyle = "#3a1818";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      var th = h * 0.45;
      for (var ti = 0; ti < 3; ti++) {
        var tx = cx - w * 0.32 + ti * w * 0.32;
        ctx.beginPath();
        ctx.moveTo(tx - w * 0.07, cy);
        ctx.lineTo(tx, cy + th);
        ctx.lineTo(tx + w * 0.07, cy);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === "smirk") {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.4, cy);
      ctx.quadraticCurveTo(cx + w * 0.1, cy + h * 0.5, cx + w * 0.45, cy - h * 0.2);
      ctx.stroke();
    } else if (kind === "wicked") {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.45, cy - h * 0.1);
      ctx.quadraticCurveTo(cx, cy + h * 0.6, cx + w * 0.45, cy - h * 0.1);
      ctx.stroke();
    } else if (kind === "tiny") {
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.18, 0, Math.PI);
      ctx.stroke();
    }
  }

  function colorAlpha(hex, a) {
    var h = ("" + hex).replace("#", "");
    if (h.length < 6) return "rgba(255,255,255," + a + ")";
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function drawTower(t) {
    var disseminationScaled = !!state.dissemination;
    if (disseminationScaled) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(0.75, 0.75);
      ctx.translate(-t.x, -t.y);
    }
    var stats = towerStats(t);
    var idle = Math.sin(state.time * Math.PI + (t.idlePhase || 0));
    var pulse = 1 + idle * 0.025;
    var attacking = (t.attackAnim || 0) > 0;
    var levelup = (t.levelupAnim || 0) > 0;
    var blink = (t.blinkTimer || 0) > 0;
    // Serios por defecto; tristes solo cuando están por morir (vida crítica
    // o siendo devorados).
    var dyingLow = (t.hp / t.maxHp < 0.3) || !!t.devouredBy;
    var expression = levelup ? "levelup" : (dyingLow ? "dying" : (attacking ? "attacking" : "idle"));
    if (levelup) pulse *= 1.10;
    drawShadow(t.x, t.y + 18 * U, 19 * U, 6 * U);
    // Glow/aura pulsante (Parte A: más vivo) — resalta la célula sobre el tejido.
    var glowP = 0.5 + 0.5 * Math.sin(state.time * 2 + (t.idlePhase || 0));
    var glowR = 30 * U * pulse;
    var gg = ctx.createRadialGradient(t.x, t.y, glowR * 0.35, t.x, t.y, glowR);
    gg.addColorStop(0, colorAlpha(t.def.color, 0.20 + 0.10 * glowP));
    gg.addColorStop(1, colorAlpha(t.def.color, 0));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(t.x, t.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    if (t.muzzleFlash > 0) {
      ctx.fillStyle = "rgba(255, 245, 200, 0.45)";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 28 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sacudida al golpe; al ser devorada forcejea más fuerte y se encoge.
    var hf = (t.hitFlash || 0);
    var devouring = !!t.devouredBy;
    var shakeAmp = devouring ? (t.devourShake || 4) * U
                             : (hf > 0 ? (hf / 0.16) * 3 * U : 0);
    if (devouring && t.devourScale != null) pulse *= t.devourScale;
    ctx.save();
    if (shakeAmp > 0) {
      ctx.translate((Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp);
    }
    if (t.def.id === "neutrofilo") drawNeutrofilo(t, pulse, expression, blink);
    else if (t.def.id === "linfocitoB") drawLinfocitoB(t, pulse, expression, blink);
    else if (t.def.id === "linfocitoT") drawLinfocitoT(t, pulse, expression, blink);
    else if (t.def.id === "langerhans") drawLangerhans(t, pulse, expression, blink);
    else if (t.def.id === "nk") drawNK(t, pulse, expression, blink);
    else if (t.def.id === "eosinofilo") drawEosinofilo(t, pulse, expression, blink);
    else if (t.def.id === "mastocito") drawMastocito(t, pulse, expression, blink);
    else if (t.def.id === "complemento") drawComplementCannon(t, pulse, expression, blink);
    else if (t.def.id === "plaqueta") drawPlaqueta(t, pulse, expression, blink);
    else drawLinfocitoT(t, pulse, expression, blink);
    // Level-up sparkles
    if (levelup) {
      var lp = (t.levelupAnim / 0.5);
      for (var s = 0; s < 6; s++) {
        var sa = state.time * 4 + s * Math.PI / 3;
        var sr = (28 + (1 - lp) * 22) * U;
        ctx.fillStyle = "rgba(255, 230, 130, " + lp + ")";
        ctx.beginPath();
        ctx.arc(t.x + Math.cos(sa) * sr, t.y + Math.sin(sa) * sr, 2.4 * U, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Level pips above sprite
    ctx.fillStyle = t.def.colorDark;
    var pipsY = t.y - 22 * U;
    for (var i = 0; i <= t.level; i++) {
      ctx.beginPath();
      ctx.arc(t.x - 6 * U + i * 6 * U, pipsY, 2.2 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // --- Combate: destello de daño rojo al recibir golpe ---
    if (hf > 0) {
      ctx.fillStyle = "rgba(230, 40, 40, " + (0.55 * (hf / 0.16)) + ")";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 23 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // Barra de vida SIEMPRE visible (el daño es permanente y debe verse).
    var bw = 32 * U, bh = 5 * U;
    var bx = t.x - bw / 2, by = t.y + 23 * U;
    var ratio = Math.max(0, Math.min(1, t.hp / t.maxHp));
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(bx, by, bw, bh);
    var hpCol = ratio > 0.5 ? "#5ad15a" : ratio > 0.25 ? "#e8c84a" : "#d9534f";
    ctx.fillStyle = hpCol;
    ctx.fillRect(bx, by, bw * ratio, bh);
    // Estados por poderes de gérmenes: paralizada (amarillo) / cadencia lenta (azul).
    if ((t.stunTimer || 0) > 0) {
      var sp = 0.5 + 0.5 * Math.sin(state.time * 10);
      ctx.strokeStyle = "rgba(245, 215, 90, " + (0.5 + 0.4 * sp) + ")";
      ctx.lineWidth = 2 * U;
      ctx.beginPath(); ctx.arc(t.x, t.y, 22 * U, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(245,215,90,0.9)";
      ctx.font = "bold 11px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText("✦", t.x, t.y - 24 * U);
    } else if ((t.slowFireTimer || 0) > 0) {
      ctx.fillStyle = "rgba(90, 150, 240, 0.30)";
      ctx.beginPath(); ctx.arc(t.x, t.y, 20 * U, 0, Math.PI * 2); ctx.fill();
    }
    if (disseminationScaled) ctx.restore();
  }

  function drawNeutrofilo(t, pulse, expression, blink) {
    // Célula clara con núcleo multilobulado morado (neutrófilo) + carita.
    var x = t.x, y = t.y;
    var R = 19 * U * pulse;
    ctx.save();
    ctx.translate(x, y);
    var nbody = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.2, 0, 0, R);
    nbody.addColorStop(0, "#fffdf6");
    nbody.addColorStop(0.7, "#f3ecf9");
    nbody.addColorStop(1, "#d8c8ee");
    ctx.fillStyle = nbody;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = t.def.colorDark; ctx.lineWidth = Math.max(1.2, 1.5 * U); ctx.stroke();
    ctx.fillStyle = "rgba(126, 95, 176, 0.50)";
    for (var nl = 0; nl < 4; nl++) {
      var nla = nl * Math.PI * 2 / 4 + state.time * 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(nla) * R * 0.34, Math.sin(nla) * R * 0.34 + R * 0.08, R * 0.30, 0, Math.PI * 2);
      ctx.fill();
    }
    var neR = R * 0.20, ngap = R * 0.30, nfy = -R * 0.10;
    if (blink) drawClosedEyes(0, nfy, neR, ngap);
    else if (expression === "dying") drawHurtEyes(0, nfy, neR, ngap);
    else if (expression === "levelup") drawSparkleEyes(0, nfy, neR, ngap);
    else if (expression === "attacking") drawFocusedEyes(0, nfy, neR, ngap, R * 0.14, R * 0.05);
    else drawAnimeEyes(0, nfy, neR, ngap, 0, 0, R * 0.10, R * 0.08, "fierce");
    if (expression === "dying") drawAnimeMouth(0, R * 0.34, R * 0.42, R * 0.42, "open");
    else if (expression === "levelup") drawAnimeMouth(0, R * 0.30, R * 0.5, R * 0.30, "smile");
    else if (expression === "attacking") drawAnimeMouth(0, R * 0.30, R * 0.5, R * 0.5, "fanged");
    else drawAnimeMouth(0, R * 0.32, R * 0.38, R * 0.20, "serious");
    ctx.restore();
  }

  function drawMacrofago(t, pulse, expression, blink) {
    var x = t.x, y = t.y;
    var R = 20 * U * pulse;
    ctx.save();
    ctx.translate(x, y);
    // Pseudópodos: 6 small bumps
    ctx.fillStyle = t.def.color;
    var bumps = 6;
    for (var i = 0; i < bumps; i++) {
      var a = i * Math.PI * 2 / bumps + state.time * 0.5;
      var bx = Math.cos(a) * R * 0.95;
      var by = Math.sin(a) * R * 0.95;
      var br = R * (0.32 + Math.sin(state.time * 2 + i) * 0.05);
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    // Body gradient
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    grad.addColorStop(0, "#a7d0f6");
    grad.addColorStop(0.6, t.def.color);
    grad.addColorStop(1, t.def.colorDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.def.colorDark;
    ctx.lineWidth = Math.max(1.2, 1.5 * U);
    ctx.stroke();
    // Face — expression-aware
    var eyeR = R * 0.20;
    if (blink) {
      drawClosedEyes(0, -R * 0.10, eyeR, R * 0.30);
    } else if (expression === "levelup") {
      drawSparkleEyes(0, -R * 0.10, eyeR, R * 0.30);
    } else if (expression === "attacking") {
      drawFocusedEyes(0, -R * 0.10, eyeR, R * 0.30, R * 0.14, R * 0.05);
    } else {
      drawAnimeEyes(0, -R * 0.10, eyeR, R * 0.30, 0, 0, R * 0.10, R * 0.10, "fierce");
    }
    if (expression === "levelup") drawAnimeMouth(0, R * 0.30, R * 0.55, R * 0.30, "smile");
    else if (expression === "attacking") drawAnimeMouth(0, R * 0.30, R * 0.55, R * 0.55, "open");
    else drawAnimeMouth(0, R * 0.32, R * 0.40, R * 0.20, "serious");
    ctx.restore();
  }

  function drawLinfocitoB(t, pulse, expression, blink) {
    var x = t.x, y = t.y;
    var R = 18 * U * pulse;
    ctx.save();
    ctx.translate(x, y);
    // Antibodies "Y" rotating around
    var ab = 5;
    for (var i = 0; i < ab; i++) {
      var a = i * Math.PI * 2 / ab + state.time * 0.8;
      var ax = Math.cos(a) * (R + 8 * U);
      var ay = Math.sin(a) * (R + 8 * U);
      drawYShape(ax, ay, 5.5 * U, a + Math.PI / 2, "#fff7c4", t.def.colorDark);
    }
    // Body
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    grad.addColorStop(0, "#c5ecd1");
    grad.addColorStop(0.6, t.def.color);
    grad.addColorStop(1, t.def.colorDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.def.colorDark;
    ctx.lineWidth = Math.max(1.2, 1.5 * U);
    ctx.stroke();
    // Face — expression-aware
    var eyeR = R * 0.22;
    if (blink) drawClosedEyes(0, -R * 0.10, eyeR, R * 0.32);
    else if (expression === "dying") drawHurtEyes(0, -R * 0.10, eyeR, R * 0.32);
    else if (expression === "levelup") drawSparkleEyes(0, -R * 0.10, eyeR, R * 0.32);
    else if (expression === "attacking") drawFocusedEyes(0, -R * 0.10, eyeR, R * 0.32, R * 0.10, R * 0.04);
    else drawAnimeEyes(0, -R * 0.10, eyeR, R * 0.32, 0, 0, R * 0.10, R * 0.06, "fierce");
    if (expression === "dying") drawAnimeMouth(0, R * 0.32, R * 0.5, R * 0.45, "open");
    else if (expression === "levelup") drawAnimeMouth(0, R * 0.32, R * 0.55, R * 0.30, "smile");
    else drawAnimeMouth(0, R * 0.32, R * 0.42, R * 0.20, "serious");
    ctx.restore();
  }

  function drawYShape(cx, cy, size, rot, fill, stroke) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = Math.max(1.6, 2 * U);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, -size * 0.2);
    ctx.moveTo(0, -size * 0.2);
    ctx.lineTo(-size * 0.7, -size);
    ctx.moveTo(0, -size * 0.2);
    ctx.lineTo(size * 0.7, -size);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-size * 0.7, -size, size * 0.32, 0, Math.PI * 2);
    ctx.arc(size * 0.7, -size, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawLinfocitoT(t, pulse, expression, blink) {
    var x = t.x, y = t.y;
    var R = 19 * U * pulse;
    ctx.save();
    ctx.translate(x, y);
    // Body with internal granules
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    grad.addColorStop(0, "#d6c0f5");
    grad.addColorStop(0.6, t.def.color);
    grad.addColorStop(1, t.def.colorDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.def.colorDark;
    ctx.lineWidth = Math.max(1.2, 1.5 * U);
    ctx.stroke();
    // Granules pulsing
    var grans = 5;
    for (var i = 0; i < grans; i++) {
      var ga = (i * 1.7 + state.time * 0.4) % (Math.PI * 2);
      var gd = R * 0.55;
      var gx = Math.cos(ga) * gd;
      var gy = Math.sin(ga) * gd;
      var gp = 0.5 + 0.5 * Math.sin(state.time * 3 + i);
      ctx.fillStyle = "rgba(255, 240, 180, " + (0.4 + gp * 0.5) + ")";
      ctx.beginPath();
      ctx.arc(gx, gy, R * 0.10 * (0.7 + gp * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    // Face — sharper, colder; expression-aware
    var eyeR = R * 0.20;
    if (blink) drawClosedEyes(0, -R * 0.08, eyeR, R * 0.30);
    else if (expression === "dying") drawHurtEyes(0, -R * 0.08, eyeR, R * 0.30);
    else if (expression === "levelup") drawSparkleEyes(0, -R * 0.08, eyeR, R * 0.30);
    else if (expression === "attacking") drawFocusedEyes(0, -R * 0.08, eyeR, R * 0.30, R * 0.18, R * 0.08);
    else drawAnimeEyes(0, -R * 0.08, eyeR, R * 0.30, 0, 0, R * 0.14, R * 0.05, "fierce");
    if (expression === "dying") drawAnimeMouth(0, R * 0.32, R * 0.5, R * 0.42, "open");
    else if (expression === "levelup") drawAnimeMouth(0, R * 0.32, R * 0.45, R * 0.25, "smile");
    else if (expression === "attacking") drawAnimeMouth(0, R * 0.32, R * 0.50, R * 0.30, "fanged");
    else drawAnimeMouth(0, R * 0.32, R * 0.40, R * 0.20, "neutral");
    ctx.restore();
  }

  // Cara de torre (seria; triste al morir). mood/mouthKind dan personalidad propia.
  function towerFace(R, expression, blink, mood, mouthKind) {
    var eyeR = R * 0.21, ey = -R * 0.08, gap = R * 0.31;
    if (blink) drawClosedEyes(0, ey, eyeR, gap);
    else if (expression === "dying") drawHurtEyes(0, ey, eyeR, gap);
    else if (expression === "levelup") drawSparkleEyes(0, ey, eyeR, gap);
    else if (expression === "attacking") drawFocusedEyes(0, ey, eyeR, gap, R * 0.12, R * 0.05);
    else drawAnimeEyes(0, ey, eyeR, gap, 0, 0, R * 0.10, R * 0.05, mood || "fierce");
    if (expression === "dying") drawAnimeMouth(0, R * 0.32, R * 0.5, R * 0.42, "open");
    else if (expression === "levelup") drawAnimeMouth(0, R * 0.32, R * 0.45, R * 0.25, "smile");
    else drawAnimeMouth(0, R * 0.32, R * 0.40, R * 0.20, mouthKind || "serious");
  }
  function hexPath(R) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 - Math.PI / 2, px = Math.cos(a) * R, py = Math.sin(a) * R;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // LANGERHANS — silueta de ESTRELLA DENDRÍTICA (centinela amable que vigila).
  function drawLangerhans(t, pulse, expression, blink) {
    var R = 17 * U * pulse;
    ctx.save(); ctx.translate(t.x, t.y);
    ctx.strokeStyle = t.def.colorDark; ctx.lineWidth = Math.max(2, 3 * U); ctx.lineCap = "round"; ctx.lineJoin = "round";
    var dn = 9;
    for (var i = 0; i < dn; i++) {
      var a = i * Math.PI * 2 / dn + state.time * 0.3;
      var len = R * (1.35 + 0.16 * Math.sin(state.time * 2 + i));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.lineTo(Math.cos(a + 0.24) * (len - R * 0.24), Math.sin(a + 0.24) * (len - R * 0.24));
      ctx.stroke();
    }
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    grad.addColorStop(0, "#d6fbfd"); grad.addColorStop(0.6, t.def.color); grad.addColorStop(1, t.def.colorDark);
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = t.def.colorDark; ctx.lineWidth = Math.max(1.2, 1.5 * U); ctx.stroke();
    towerFace(R, expression, blink, "happy", "smile");   // centinela amable
    ctx.restore();
  }

  // NK — silueta HEXAGONAL BLINDADA con retícula de caza (cazadora antiviral).
  function drawNK(t, pulse, expression, blink) {
    var R = 18 * U * pulse;
    ctx.save(); ctx.translate(t.x, t.y);
    ctx.strokeStyle = colorAlpha(t.def.color, 0.5); ctx.lineWidth = Math.max(1, 1.4 * U);
    ctx.save(); ctx.rotate(state.time * 0.8);
    ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, Math.PI * 2); ctx.stroke();
    for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.1, Math.sin(a) * R * 1.1); ctx.lineTo(Math.cos(a) * R * 1.55, Math.sin(a) * R * 1.55); ctx.stroke(); }
    ctx.restore();
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    grad.addColorStop(0, "#ffd9ec"); grad.addColorStop(0.6, t.def.color); grad.addColorStop(1, t.def.colorDark);
    ctx.fillStyle = grad; hexPath(R * 1.04); ctx.fill();
    ctx.strokeStyle = t.def.colorDark; ctx.lineWidth = Math.max(1.4, 1.8 * U); hexPath(R * 1.04); ctx.stroke();
    ctx.strokeStyle = colorAlpha(t.def.colorDark, 0.5); ctx.lineWidth = 1; hexPath(R * 0.6); ctx.stroke();
    towerFace(R, expression, blink, "angry", "fanged");   // cazadora feroz
    ctx.restore();
  }

  // EOSINÓFILO — cuerpo BILOBULADO (cacahuate) repleto de gránulos rojos (agresivo).
  function drawEosinofilo(t, pulse, expression, blink) {
    var R = 15 * U * pulse, off = R * 0.55;
    ctx.save(); ctx.translate(t.x, t.y);
    function lobe(cxp) {
      var grad = ctx.createRadialGradient(cxp - R * 0.3, -R * 0.3, R * 0.2, cxp, 0, R);
      grad.addColorStop(0, "#ffe0cf"); grad.addColorStop(0.6, t.def.color); grad.addColorStop(1, t.def.colorDark);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cxp, 0, R, 0, Math.PI * 2); ctx.fill();
    }
    lobe(-off); lobe(off);
    ctx.strokeStyle = t.def.colorDark; ctx.lineWidth = Math.max(1.2, 1.5 * U);
    ctx.beginPath(); ctx.arc(-off, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(off, 0, R, 0, Math.PI * 2); ctx.stroke();
    for (var g = 0; g < 8; g++) { var ga = g * 0.8 + state.time * 0.2; var lx = (g % 2 ? off : -off); ctx.fillStyle = "rgba(225,90,50,0.85)"; ctx.beginPath(); ctx.arc(lx + Math.cos(ga) * R * 0.45, Math.sin(ga) * R * 0.45, R * 0.13, 0, Math.PI * 2); ctx.fill(); }
    towerFace(R * 1.15, expression, blink, "fierce", "fanged");
    ctx.restore();
  }

  // MASTOCITO — cuerpo GRUMOSO (borde con bultos) repleto de gránulos (alerta).
  function drawPlaqueta(t, pulse, expression, blink) {
    // MALLA DE FIBRINA: panal hexagonal largo — tanque obstructor.
    // Forma horizontal con 3 filas offset de hexágonos, ~3x tamaño anterior.
    ctx.save(); ctx.translate(t.x, t.y);

    var hexR = 8 * U * pulse;                  // radio de cada celda
    var hexW = hexR * Math.sqrt(3);            // ancho flat-top
    var hexH = hexR * 1.5;                     // paso vertical (flat-top stagger)
    // Layout: 3 filas, columnas 6/7/6 → forma larga
    var cols = [6, 7, 6];
    var rows = cols.length;
    var totalW = 7 * hexW;                     // ancho dominante
    var totalH = 3 * hexH + hexR * 0.5;

    // Sombra ancha bajo la malla
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.beginPath();
    ctx.ellipse(0, totalH * 0.40, totalW * 0.55, totalH * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Halo de obstrucción elíptico (área que bloquea)
    if (t.def.obstructs) {
      var bpulse = 0.5 + 0.5 * Math.sin(state.time * 2.5 + (t.idlePhase || 0));
      ctx.strokeStyle = "rgba(232, 160, 32, " + (0.22 + bpulse * 0.10) + ")";
      ctx.lineWidth = Math.max(1.0, 1.4 * U);
      ctx.beginPath();
      ctx.ellipse(0, 0, (t.def.obstructRX || 50) * U, (t.def.obstructRY || 18) * U, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Animación de "disparo": brillo pulsante en toda la malla
    var shootGlow = 0;
    if ((t.attackAnim || 0) > 0) {
      shootGlow = (t.attackAnim / 0.2);
    }

    // Helper hexágono flat-top (lado plano arriba)
    function drawHex(cx, cy, r, fillGrad, strokeColor, broken) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var ang = (Math.PI / 3) * i + Math.PI / 6;
        var x = cx + Math.cos(ang) * r;
        var y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (broken) {
        ctx.fillStyle = "rgba(20, 8, 4, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(70, 30, 10, 0.55)";
        ctx.lineWidth = Math.max(0.7, 0.9 * U);
        ctx.stroke();
        return;
      }
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(1.0, 1.3 * U);
      ctx.stroke();
      // Brillo interior superior izquierdo
      ctx.fillStyle = "rgba(255, 245, 200, 0.45)";
      ctx.beginPath();
      ctx.arc(cx - r * 0.30, cy - r * 0.30, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Construir lista de celdas con su posición y prioridad (afuera→adentro)
    // Para que al perder HP las celdas se rompan empezando por el borde.
    var cells = [];
    var startY = -totalH / 2 + hexR;
    for (var ri = 0; ri < rows; ri++) {
      var cy = startY + ri * hexH;
      var nCols = cols[ri];
      var rowStartX = -((nCols - 1) / 2) * hexW;
      // Filas impares offset horizontal a la izquierda (stagger)
      var rowOffset = (ri % 2 === 0) ? 0 : -hexW / 2;
      for (var ci = 0; ci < nCols; ci++) {
        var cx = rowStartX + ci * hexW + rowOffset;
        // Prioridad: alta = se rompe primero. Distancia al centro normalizada.
        var dCx = Math.abs(cx) / (totalW / 2);
        var dCy = Math.abs(cy) / (totalH / 2);
        var priority = dCx * 0.7 + dCy * 1.2;
        cells.push({ x: cx, y: cy, p: priority });
      }
    }
    // Orden ascendente por prioridad = mantenemos las centrales más tiempo
    cells.sort(function (a, b) { return a.p - b.p; });

    var hpFrac = (t.maxHp && t.hp > 0) ? Math.max(0, t.hp / t.maxHp) : 1;
    var totalCells = cells.length;
    var intactCount = Math.max(t.hp > 0 ? 1 : 0, Math.round(totalCells * hpFrac));

    // Gradiente compartido para celdas vivas (estilo cera)
    var cellFillBase = "#E8B040";
    var cellStroke = t.def.colorDark;
    for (var k = 0; k < totalCells; k++) {
      var cell = cells[k];
      var isIntact = k < intactCount;
      if (isIntact) {
        var fg = ctx.createRadialGradient(cell.x - hexR * 0.3, cell.y - hexR * 0.3, hexR * 0.15, cell.x, cell.y, hexR);
        var glow = 0.85 + shootGlow * 0.40;
        fg.addColorStop(0, "rgba(255, 235, 160, " + Math.min(1, glow) + ")");
        fg.addColorStop(0.55, t.def.color);
        fg.addColorStop(1, "#A06820");
        drawHex(cell.x, cell.y, hexR, fg, cellStroke, false);
      } else {
        drawHex(cell.x, cell.y, hexR, null, null, true);
      }
    }

    // Hebras de fibrina conectando vértices (líneas finas radiales)
    if (hpFrac > 0.2) {
      ctx.strokeStyle = "rgba(232, 160, 32, " + (0.35 * hpFrac) + ")";
      ctx.lineWidth = Math.max(0.6, 0.8 * U);
      for (var s = 0; s < 6; s++) {
        var ang = (Math.PI / 3) * s;
        var x0 = Math.cos(ang) * totalW * 0.50;
        var y0 = Math.sin(ang) * totalH * 0.55;
        var x1 = Math.cos(ang) * totalW * 0.58;
        var y1 = Math.sin(ang) * totalH * 0.65;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }

    // HP bar
    if (t.maxHp && t.hp < t.maxHp) {
      var hpW = totalW * 0.7;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(-hpW / 2, -totalH * 0.65, hpW, 3 * U);
      ctx.fillStyle = hpFrac > 0.5 ? "#7adb8a" : hpFrac > 0.25 ? "#e8c84a" : "#e85a4a";
      ctx.fillRect(-hpW / 2, -totalH * 0.65, hpW * hpFrac, 3 * U);
    }

    // Cara minúscula en la celda central
    ctx.save();
    ctx.translate(0, 0);
    towerFace(hexR * 0.75, expression, blink, "neutral", "neutral");
    ctx.restore();

    ctx.restore();
  }

  function drawMastocito(t, pulse, expression, blink) {
    var R = 18 * U * pulse;
    ctx.save(); ctx.translate(t.x, t.y);
    if ((t.attackAnim || 0) > 0) {
      var pp = 1 - (t.attackAnim / 0.2);
      ctx.strokeStyle = colorAlpha(t.def.color, 0.5 * (1 - pp)); ctx.lineWidth = 2 * U;
      ctx.beginPath(); ctx.arc(0, 0, R * (1.1 + pp * 0.8), 0, Math.PI * 2); ctx.stroke();
    }
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    grad.addColorStop(0, "#d6e6fb"); grad.addColorStop(0.6, t.def.color); grad.addColorStop(1, t.def.colorDark);
    ctx.fillStyle = grad;
    var bumps = 12; ctx.beginPath();
    for (var i = 0; i <= bumps; i++) {
      var a = i / bumps * Math.PI * 2, rr = R * (0.92 + ((i % 2) ? 0.13 : 0));
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = t.def.colorDark; ctx.lineWidth = Math.max(1.2, 1.5 * U); ctx.stroke();
    for (var g = 0; g < 12; g++) { var ga = g * 0.66; var gd = R * (0.28 + 0.42 * ((g % 4) / 3)); ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(Math.cos(ga) * gd, Math.sin(ga) * gd, R * 0.085, 0, Math.PI * 2); ctx.fill(); }
    towerFace(R, expression, blink, "neutral", "neutral");   // alerta/tranquilo
    ctx.restore();
  }

  // CAÑÓN DEL COMPLEMENTO (MAC) — BAZUCA militar con muzzle dorado del MAC.
  function drawComplementCannon(t, pulse, expression, blink) {
    var R = 19 * U * pulse, x = t.x, y = t.y;
    ctx.save(); ctx.translate(x, y);
    // Sombra bajo el arma.
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.beginPath(); ctx.ellipse(0, R * 0.55, R * 1.3, R * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // Orientación hacia el último objetivo (si no hay, hacia arriba).
    var ang = -Math.PI / 2;
    if (t.lastTargetX != null) ang = Math.atan2(t.lastTargetY - y, t.lastTargetX - x);
    ctx.rotate(ang);   // +x = "adelante" (hacia el objetivo)
    var L = R * 2.4, W = R * 0.9;
    // Tubo de la bazuca (rectángulo redondeado horizontal).
    var grad = ctx.createLinearGradient(0, -W * 0.6, 0, W * 0.6);
    grad.addColorStop(0, "#7e8a4a"); grad.addColorStop(0.45, "#5e6a2c"); grad.addColorStop(1, "#3d4520");
    ctx.fillStyle = grad;
    roundRect(-L * 0.50, -W * 0.6, L, W * 1.2, W * 0.42); ctx.fill();
    ctx.strokeStyle = "#3d4520"; ctx.lineWidth = 1.5; roundRect(-L * 0.50, -W * 0.6, L, W * 1.2, W * 0.42); ctx.stroke();
    // Anillos/segmentos a lo largo del tubo.
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.3;
    for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(L * 0.20 * i, -W * 0.6); ctx.lineTo(L * 0.20 * i, W * 0.6); ctx.stroke(); }
    // Cap trasero con orificios de ventilación (back-blast).
    ctx.fillStyle = "#2c3015";
    roundRect(-L * 0.55, -W * 0.7, L * 0.10, W * 1.4, 0); ctx.fill();
    ctx.fillStyle = "#0e1207";
    for (var v = 0; v < 3; v++) { ctx.beginPath(); ctx.arc(-L * 0.50, -W * 0.42 + v * W * 0.42, W * 0.12, 0, Math.PI * 2); ctx.fill(); }
    // Mira encima del tubo.
    ctx.fillStyle = "#1a1a22";
    roundRect(-W * 0.15, -W * 0.95, W * 0.30, W * 0.30, 0); ctx.fill();
    ctx.fillStyle = "#FFD24A"; ctx.fillRect(-W * 0.04, -W * 0.92, W * 0.08, W * 0.22);
    // Empuñadura bajo el tubo.
    ctx.fillStyle = "#3d4520";
    roundRect(-W * 0.22, W * 0.55, W * 0.44, W * 0.85, W * 0.16); ctx.fill();
    ctx.strokeStyle = "#1f2410"; ctx.lineWidth = 1.2; roundRect(-W * 0.22, W * 0.55, W * 0.44, W * 0.85, W * 0.16); ctx.stroke();
    // Anillo dorado del MAC en la boca (muzzle) y núcleo brillante latiendo.
    var glow = 0.55 + 0.45 * Math.sin(state.time * 4 + (t.idlePhase || 0));
    ctx.fillStyle = "#FFD24A"; ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(L * 0.52, 0, W * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    var gg = ctx.createRadialGradient(L * 0.52, 0, 1, L * 0.52, 0, W * 0.5);
    gg.addColorStop(0, "rgba(255,255,255," + (0.7 + 0.3 * glow) + ")"); gg.addColorStop(0.6, "#FFE27A"); gg.addColorStop(1, "rgba(184,134,11,0.3)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(L * 0.52, 0, W * 0.40, 0, Math.PI * 2); ctx.fill();
    // Muzzle flash al disparar.
    if ((t.muzzleFlash || 0) > 0) {
      var mf = t.muzzleFlash / 0.18;
      ctx.fillStyle = "rgba(255, 248, 200, " + (0.85 * mf) + ")";
      ctx.beginPath(); ctx.arc(L * 0.55 + W * 0.5 * (1 - mf), 0, W * (0.55 + 0.5 * mf), 0, Math.PI * 2); ctx.fill();
      for (var fr = 0; fr < 6; fr++) {
        var fa = (fr / 6) * Math.PI - Math.PI / 2;
        ctx.fillStyle = "rgba(255, 215, 90, " + (0.55 * mf) + ")";
        ctx.beginPath(); ctx.arc(L * 0.62 + Math.cos(fa) * W * 1.1, Math.sin(fa) * W * 0.55, W * 0.16, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // LATIGAZO POR ARRIBA: un tentáculo grueso sale del lomo del germen, se
  // alza como cola de escorpión y CAE de golpe sobre la CABEZA de la torre.
  function drawTentaclePunch(e, t) {
    var tcfg = e.def.tentacles || { pulseGap: 0.22 };
    var pulseT = Math.max(0, e.tentPulseT || 0);
    var punchActive = (e.tentPunchT || 0) > 0;
    var punch = punchActive ? (e.tentPunchT / 0.20) : 0;
    var wind = 1 - Math.min(1, pulseT / tcfg.pulseGap);
    var snap = wind * wind * wind;     // easing exponencial para el snap
    var ext = punchActive ? 1 : snap;  // 0 = cargado atrás-arriba, 1 = impacto en la cabeza
    if (ext < 0.06) ext = 0.06;
    var germR = (e.def.radius || 24) * U;
    var dx = t.x - e.x, dy = t.y - e.y, dist = Math.hypot(dx, dy) || 1;
    var nx = dx / dist, ny = dy / dist;
    // Base del tentáculo: lomo del germen.
    var baseX = e.x, baseY = e.y - germR * 0.85;
    // Posición CARGADA: alto y un poco hacia atrás (lejos de la torre).
    var cockX = e.x - nx * 22 * U, cockY = baseY - 65 * U;
    // Posición de IMPACTO: cabeza/parte superior de la torre.
    var headX = t.x, headY = t.y - 22 * U;
    // Latigazo final del tip: cuando golpea, vibra un poco hacia abajo.
    var jitter = punchActive ? (Math.random() - 0.5) * 6 * U * punch : 0;
    var tipX = cockX + (headX - cockX) * ext + jitter * 0.3;
    var tipY = cockY + (headY - cockY) * ext + jitter * 0.3 + (punchActive ? Math.sin(punch * Math.PI) * 4 * U : 0);
    // Bezier ARQUEADO: los puntos de control quedan MUY por encima de la línea
    // base-tip, así el brazo siempre pasa por arriba del germen y la torre.
    var arch = 72 * U;
    var c1x = baseX, c1y = baseY - arch;
    var c2x = tipX, c2y = tipY - arch;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // Sombra/contorno oscuro del tentáculo.
    var lw = (8 + 3 * ext) * U;
    ctx.strokeStyle = "#1f2a32"; ctx.lineWidth = lw + 2.8 * U;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tipX, tipY);
    ctx.stroke();
    // Cuerpo del tentáculo.
    ctx.strokeStyle = "#4a6271"; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tipX, tipY);
    ctx.stroke();
    // Brillo en la parte superior del arco (sensación de volumen).
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = lw * 0.35;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - 1);
    ctx.bezierCurveTo(c1x, c1y - 1, c2x, c2y - 1, tipX, tipY - 1);
    ctx.stroke();
    // Líneas de velocidad CAYENDO sobre el tip durante el snap.
    if (!punchActive && wind > 0.55) {
      var sw = (wind - 0.55) / 0.45;
      ctx.strokeStyle = "rgba(255,255,255," + (0.75 * sw) + ")"; ctx.lineWidth = 3;
      for (var sl = 0; sl < 4; sl++) {
        var ox = (sl - 1.5) * 5 * U;
        var oy = -(8 + sl * 8) * U;
        ctx.beginPath();
        ctx.moveTo(tipX + ox, tipY + oy);
        ctx.lineTo(tipX + ox + 2 * U, tipY + oy + 9 * U);
        ctx.stroke();
      }
    }
    // CABEZAL del látigo (esfera con espinas) en el extremo.
    var headR = (11 + 5 * ext) * U + punch * 5 * U;
    ctx.fillStyle = "rgba(0,0,0,0.40)";
    ctx.beginPath(); ctx.arc(tipX + 2 * U, tipY + 2 * U, headR, 0, Math.PI * 2); ctx.fill();
    var fg = ctx.createRadialGradient(tipX - headR * 0.35, tipY - headR * 0.35, 1, tipX, tipY, headR);
    fg.addColorStop(0, "#e6edf1"); fg.addColorStop(0.55, e.def.color); fg.addColorStop(1, e.def.colorDark);
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(tipX, tipY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = 2.4 * U;
    ctx.beginPath(); ctx.arc(tipX, tipY, headR, 0, Math.PI * 2); ctx.stroke();
    // Pinchos del cabezal (amenazante).
    ctx.fillStyle = e.def.colorDark;
    for (var sp = 0; sp < 5; sp++) {
      var spa = sp * (Math.PI * 2 / 5) + state.time * 0.4;
      var sx = tipX + Math.cos(spa) * headR * 0.95, sy = tipY + Math.sin(spa) * headR * 0.95;
      var sx2 = tipX + Math.cos(spa) * (headR + 5 * U), sy2 = tipY + Math.sin(spa) * (headR + 5 * U);
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(spa + Math.PI / 2) * 2.5 * U, sy + Math.sin(spa + Math.PI / 2) * 2.5 * U);
      ctx.lineTo(sx2, sy2);
      ctx.lineTo(sx + Math.cos(spa - Math.PI / 2) * 2.5 * U, sy + Math.sin(spa - Math.PI / 2) * 2.5 * U);
      ctx.closePath(); ctx.fill();
    }
    // Aro de tensión dorado justo antes de impactar.
    if (!punchActive && wind > 0.7) {
      var ta = (wind - 0.7) / 0.3;
      ctx.strokeStyle = "rgba(255,220,80," + (0.85 * ta) + ")"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tipX, tipY, headR + 6 * U, 0, Math.PI * 2); ctx.stroke();
    }
    // IMPACTO en la CABEZA de la torre.
    if (punchActive) {
      var ringR = (18 + (1 - punch) * 34) * U;
      ctx.strokeStyle = "rgba(255, 220, 100, " + (0.95 * punch) + ")"; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(headX, headY, ringR, 0, Math.PI * 2); ctx.stroke();
      // Rayos de impacto.
      ctx.strokeStyle = "rgba(255,210,80," + (0.9 * punch) + ")"; ctx.lineWidth = 3.5;
      for (var rl = 0; rl < 8; rl++) {
        var ra = rl * Math.PI / 4 + Math.PI / 8;
        var rL = (1 - punch) * 38 * U + 8 * U;
        ctx.beginPath();
        ctx.moveTo(headX + Math.cos(ra) * (headR * 1.15), headY + Math.sin(ra) * (headR * 1.15));
        ctx.lineTo(headX + Math.cos(ra) * (headR * 1.15 + rL), headY + Math.sin(ra) * (headR * 1.15 + rL));
        ctx.stroke();
      }
      // Estrellitas/onomatopeya ARRIBA de la torre.
      var sh = (Math.random() - 0.5) * 5 * U * punch;
      ctx.font = "900 " + Math.round((22 + 10 * punch) * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 5; ctx.strokeStyle = "#1a1a22";
      ctx.strokeText("¡ZAS!", headX + sh, headY - 32 * U);
      ctx.fillStyle = "#FFD24A";
      ctx.fillText("¡ZAS!", headX + sh, headY - 32 * U);
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    var def = e.def;
    var rad = def.radius * U * (e.radiusScale || 1);
    if (e.swallowAnim > 0) rad *= 1 + 0.35 * (e.swallowAnim / 0.45);   // se hincha al tragar
    if (e.engulfScale != null) rad *= e.engulfScale;                    // encogido al ser fagocitado
    // (Splat de Langerhans se dibuja DESPUÉS del cuerpo del germen — ver más abajo.)
    // Glow para gérmenes NO vistos aún: pulso amarillo invitando al tap
    // que abre el compendio. Se quita en cuanto state.vistos[id] se set.
    if (def && def.id && state.vistos && !state.vistos[def.id]) {
      var glowPulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      ctx.save();
      ctx.strokeStyle = "rgba(255, 210, 74, " + (0.55 + glowPulse * 0.40) + ")";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, rad + (6 + glowPulse * 4) * U, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 210, 74, " + (0.12 + glowPulse * 0.10) + ")";
      ctx.beginPath(); ctx.arc(e.x, e.y, rad + (10 + glowPulse * 4) * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Estado por medicamento: paralizado (escarcha cian) o lento (tinte azul).
    if (e.stunTimer > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(120, 220, 240, 0.85)";
      ctx.lineWidth = 2 * U;
      ctx.beginPath(); ctx.arc(e.x, e.y, rad + 5 * U, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(210, 245, 255, 0.9)";
      for (var sfk = 0; sfk < 3; sfk++) {
        var sa = state.time * 1.5 + sfk * 2.1;
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(sa) * (rad + 5 * U), e.y + Math.sin(sa) * (rad + 5 * U), 1.7 * U, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (e.slowTimer > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(90, 140, 240, 0.30)";
      ctx.beginPath(); ctx.arc(e.x, e.y, rad + 3 * U, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (e.acidFlash > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(155, 224, 0, 0.35)";
      ctx.beginPath(); ctx.arc(e.x, e.y, rad + 2 * U, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // "Radar" de daño: anillo del radio de aura alrededor de los gérmenes que
    // atacan mientras transitan, para que se vea su zona de daño.
    if (def.attack > 0 && !e.dying && !e.absorbing &&
        (e.state === "walking" || e.state === "blocked")) {
      var auraR = enemyAuraRadiusPx(def);
      var rp = 0.5 + 0.5 * Math.sin(state.time * 3.5 + (e.wobble || 0));
      // Color por peligrosidad: verde (leve) -> naranja -> rojo (alto/jefe).
      var dThreat = Math.min(1, def.attack / 30);
      var rR = Math.round(120 + 135 * dThreat);
      var rG = Math.round(220 - 150 * dThreat);
      var rB = 70;
      ctx.save();
      ctx.fillStyle = "rgba(" + rR + "," + rG + "," + rB + "," + (0.05 + 0.06 * rp) + ")";
      ctx.beginPath();
      ctx.arc(e.x, e.y, auraR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(" + rR + "," + rG + "," + rB + "," + (0.20 + 0.20 * rp) + ")";
      ctx.lineWidth = (1.2 + 1.2 * dThreat) * U;
      ctx.setLineDash([5 * U, 5 * U]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, auraR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    // Telégrafo de poder: el germen carga (brillo creciente) y apunta a la torre.
    if ((e.powerCharge || 0) > 0 && e.powerTarget) {
      var ch = 1 - e.powerCharge / 0.55;          // 0->1
      var pcol = def.color || "#fff";
      ctx.save();
      // línea de mira punteada hacia el objetivo
      ctx.strokeStyle = colorAlpha(pcol, 0.4 + 0.4 * ch);
      ctx.lineWidth = 1.5 * U;
      ctx.setLineDash([4 * U, 4 * U]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.powerTarget.x, e.powerTarget.y); ctx.stroke();
      ctx.setLineDash([]);
      // halo de carga creciente alrededor del germen
      var cr = rad + (3 + 8 * ch) * U;
      ctx.fillStyle = colorAlpha(pcol, 0.18 + 0.25 * ch);
      ctx.beginPath(); ctx.arc(e.x, e.y, cr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = colorAlpha(pcol, 0.6 + 0.3 * Math.sin(state.time * 20));
      ctx.lineWidth = 2 * U;
      ctx.beginPath(); ctx.arc(e.x, e.y, cr, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Devorar: seudópodo grueso (cónico) que agarra la torre + fauce abierta.
    if (e.devourTarget) {
      var tw = e.devourTarget;
      var dvx = tw.x - e.x, dvy = tw.y - e.y;
      var dl = Math.hypot(dvx, dvy) || 1;
      var nx = -dvy / dl, ny = dvx / dl;          // normal
      var segN = 8;
      ctx.save();
      // Pseudópodo relleno: ancho en el germen, fino en la torre, ondulante.
      ctx.fillStyle = colorAlpha(def.color || "#a33", 0.85);
      var top = [], bot = [];
      for (var dq = 0; dq <= segN; dq++) {
        var q = dq / segN;
        var wob = Math.sin(state.time * 12 + dq * 0.9) * 6 * U * Math.sin(q * Math.PI);
        var lx = e.x + dvx * q + nx * wob;
        var ly = e.y + dvy * q + ny * wob;
        var hw = (8 * (1 - q) + 2) * U;            // grosor decreciente
        top.push([lx + nx * hw, ly + ny * hw]);
        bot.push([lx - nx * hw, ly - ny * hw]);
      }
      ctx.beginPath();
      ctx.moveTo(top[0][0], top[0][1]);
      for (var ti2 = 1; ti2 < top.length; ti2++) ctx.lineTo(top[ti2][0], top[ti2][1]);
      for (var bi2 = bot.length - 1; bi2 >= 0; bi2--) ctx.lineTo(bot[bi2][0], bot[bi2][1]);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = colorAlpha(def.colorDark || "#700", 0.7);
      ctx.lineWidth = 1.5 * U; ctx.stroke();
      // Fauce: boca oscura en el germen que se abre con el tirón.
      var maw = (e.mawOpen || 0);
      if (maw > 0) {
        var mawAng = Math.atan2(dvy, dvx);
        ctx.fillStyle = "rgba(20,0,5,0.85)";
        ctx.beginPath();
        ctx.ellipse(e.x + Math.cos(mawAng) * rad * 0.4, e.y + Math.sin(mawAng) * rad * 0.4,
          rad * 0.7 * maw, rad * 0.5 * maw, mawAng, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Toxina: chorro verdoso del germen a la torre que está dañando (ataque).
    if ((e.toxinTimer || 0) > 0 && e.toxinX != null) {
      var ta = e.toxinTimer / 0.22;
      ctx.save();
      ctx.lineCap = "round";
      // Halo ancho tenue + núcleo brillante para que el ataque se note.
      ctx.strokeStyle = "rgba(120, 210, 70, " + (0.30 * ta) + ")";
      ctx.lineWidth = 6 * U;
      var mx = (e.x + e.toxinX) / 2 + (Math.random() - 0.5) * 8 * U;
      var my = (e.y + e.toxinY) / 2 + (Math.random() - 0.5) * 8 * U;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.quadraticCurveTo(mx, my, e.toxinX, e.toxinY);
      ctx.stroke();
      ctx.strokeStyle = "rgba(180, 240, 110, " + (0.85 * ta) + ")";
      ctx.lineWidth = 2.5 * U;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.quadraticCurveTo(mx, my, e.toxinX, e.toxinY);
      ctx.stroke();
      // Salpicaduras tóxicas en el punto de impacto.
      for (var sp = 0; sp < 3; sp++) {
        var spa = Math.random() * Math.PI * 2, spr = Math.random() * 7 * U;
        ctx.fillStyle = "rgba(150, 230, 90, " + (0.7 * ta) + ")";
        ctx.beginPath();
        ctx.arc(e.toxinX + Math.cos(spa) * spr, e.toxinY + Math.sin(spa) * spr, 2.2 * U, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    var expression = e.dying ? "dying"
      : e.hurtTimer > 0 ? "hurt"
      : (e.def.isBoss && e.enraged) ? "enraged"
      : "idle";
    var blink = (e.blinkTimer || 0) > 0 && expression === "idle";
    var dyingScale = e.dying ? Math.max(0.4, e.dyingTimer / 0.30) : 1;
    var absorbScale = e.absorbing ? (e.absorbScale != null ? e.absorbScale : 1) : 1;
    // Falling state: small entry scale to suggest "falling from above".
    var fallScale = (e.state === "falling") ? 0.85 : 1;
    var enteringScale = 1;
    if (e.state === "entering") {
      // Animate 0 -> 0.5 -> 1 over 0.2s
      var et = 1 - Math.max(0, e.enteringTimer / 0.20);
      enteringScale = 0.5 + 0.5 * Math.sin(et * Math.PI);
    }
    var scale = dyingScale * absorbScale * fallScale * enteringScale;
    var alpha = 1;
    if (e.absorbing) alpha *= e.absorbAlpha != null ? e.absorbAlpha : 1;
    if (e.state === "entering") alpha *= 0.5 + 0.5 * Math.sin((1 - e.enteringTimer / 0.20) * Math.PI);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (e.absorbing) {
      ctx.translate(e.x, e.y);
      ctx.rotate(e.absorbedRot || 0);
      ctx.translate(-e.x, -e.y);
    } else if (e.state === "falling") {
      ctx.translate(e.x, e.y);
      ctx.rotate(e.fallRot || 0);
      ctx.translate(-e.x, -e.y);
    }
    drawShadow(e.x, e.y + rad * 0.85, rad * 0.85 * scale, rad * 0.22 * scale);
    // Sprint 8C-1: dispatch por id real primero (los 6 patógenos
    // regulares con morfología microbiológica). Fallback al baseKind
    // antiguo para bosses y aliases legacy.
    var kind = def.baseKind || def.bossKind || def.id;
    if      (def.id === "saureus")      drawSaureus(e, rad * scale, expression, blink);
    else if (def.id === "influenza")    drawInfluenza(e, rad * scale, expression, blink);
    else if (def.id === "vih")          drawVih(e, rad * scale, expression, blink);
    else if (def.id === "candida")      drawCandida(e, rad * scale, expression, blink);
    else if (def.id === "dermatofito")  drawDermatofito(e, rad * scale, expression, blink);
    else if (def.id === "sarna")        drawSarna(e, rad * scale, expression, blink);
    else if (def.id === "hpv")          drawHPV(e, rad * scale, expression, blink);
    else if (def.id === "molluscum")    drawMolluscum(e, rad * scale, expression, blink);
    else if (def.id === "malassezia")   drawMalassezia(e, rad * scale, expression, blink);
    // Fase 1 piel: bacilos cutáneos reusan drawEcoli (recoloreado por def).
    else if (def.id === "cacnes")       drawEcoli(e, rad * scale, expression, blink);
    else if (def.id === "pseudomonas")  drawEcoli(e, rad * scale, expression, blink);
    else if (def.id === "bossPseudomonas") drawEcoli(e, rad * scale, expression, blink);
    // Sprint 8C-2: bosses con morfología real, antes del fallback genérico.
    else if (def.id === "bossPyogenes")      drawBossPyogenes(e, rad * scale, expression, blink);
    else if (def.id === "bossMRSA")          drawBossMRSA(e, rad * scale, expression, blink);
    else if (def.id === "bossClostridium")   drawBoss(e, rad * scale, expression, blink);
    else if (kind === "bacteria")       drawBacteria(e, rad * scale, expression, blink);
    else if (kind === "virus")          drawVirus(e, rad * scale, expression, blink);
    else if (kind === "hongo")          drawHongo(e, rad * scale, expression, blink);
    else if (kind === "primordial" || def.id === "boss") drawBoss(e, rad * scale, expression, blink);
    ctx.restore();
    // Splat de Langerhans: manchita cian SOBRE el cuerpo (después del
    // dispatch del sprite del germen). Antes se dibujaba al inicio y
    // el cuerpo del germen la tapaba.
    if ((e.markTimer || 0) > 0 && e.markSplatAngle != null) {
      var fade = Math.min(1, e.markTimer / 0.5);
      var sa = e.markSplatAngle;
      var sr = (e.markSplatR || 0.5) * rad;
      var sx = e.x + Math.cos(sa) * sr;
      var sy = e.y + Math.sin(sa) * sr;
      var ssize = rad * 0.42;       // más grande para que se note
      var bounce = 1 + 0.12 * Math.sin(state.time * 6);
      ctx.save();
      // Halo glow alrededor del splat para que destaque sobre cualquier color.
      var grd = ctx.createRadialGradient(sx, sy, ssize * 0.2, sx, sy, ssize * 1.6);
      grd.addColorStop(0, "rgba(63, 193, 201, " + (0.85 * fade) + ")");
      grd.addColorStop(0.6, "rgba(63, 193, 201, " + (0.35 * fade) + ")");
      grd.addColorStop(1, "rgba(63, 193, 201, 0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, ssize * 1.6, 0, Math.PI * 2);
      ctx.fill();
      // Mancha principal — más opaca y con borde marcado.
      ctx.fillStyle = "rgba(63, 193, 201, " + (0.95 * fade) + ")";
      ctx.beginPath();
      ctx.ellipse(sx, sy, ssize * bounce, ssize * 0.85, sa, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(30, 120, 130, " + (0.7 * fade) + ")";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Brillos blancos.
      ctx.fillStyle = "rgba(220, 250, 255, " + (0.8 * fade) + ")";
      ctx.beginPath();
      ctx.ellipse(sx - ssize * 0.35, sy - ssize * 0.20, ssize * 0.35, ssize * 0.25, sa, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + ssize * 0.45, sy + ssize * 0.30, ssize * 0.25, ssize * 0.18, sa, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Tentáculos/puñetazos (S. epidermidis): seudópodos que extienden hacia
    // la torre objetivo con puño que vibra al golpear.
    if (def.tentacles && e.tentTarget && state.towers.indexOf(e.tentTarget) !== -1) {
      drawTentaclePunch(e, e.tentTarget);
    }
    // Shield overlay (drawn on top of body but under HP bar).
    if (def.shield && (e.shieldHP > 0 || e.shieldShatterTimer > 0)) {
      drawShield(e, rad * scale);
    }
    if (e.dying || e.absorbing || e.state === "falling" || e.state === "entering") return;
    // HP bar
    var hpRatio = Math.max(0, e.hp / e.maxHp);
    var bw = Math.max(20 * U, rad * 2);
    var bh = 4 * Math.max(1, U * 0.9);
    var by = e.y - rad - 11 * U;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(e.x - bw / 2, by, bw, bh);
    ctx.fillStyle = hpRatio > 0.5 ? "#5cb85c" : hpRatio > 0.25 ? "#f0ad4e" : "#d9534f";
    ctx.fillRect(e.x - bw / 2, by, bw * hpRatio, bh);
  }

  function drawShield(e, rad) {
    var def = e.def;
    var sd = def.shield;
    if (!sd) return;
    var ratio = sd.maxHP > 0 ? Math.max(0, e.shieldHP) / sd.maxHP : 0;
    var shatter = e.shieldShatterTimer > 0 ? Math.min(1, e.shieldShatterTimer / 0.45) : 0;
    var hit = e.shieldHitTimer > 0 ? Math.min(1, e.shieldHitTimer / 0.20) : 0;
    var R = rad * 1.45;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (sd.type === "capsula") {
      // Yellow translucent ring with subtle pulse.
      var pulse = 1 + Math.sin(state.time * 4 + e.wobble) * 0.05;
      ctx.fillStyle = "rgba(255, 245, 157, " + (0.45 * ratio + hit * 0.4) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, R * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(214, 192, 80, " + (0.85 * ratio + hit * 0.4) + ")";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, R * pulse, 0, Math.PI * 2);
      ctx.stroke();
      // Double ring for biofilm cases (saureus / MRSA)
      if (sd.doubleRing) {
        ctx.strokeStyle = "rgba(214, 192, 80, " + (0.55 * ratio) + ")";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, R * pulse * 1.10, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Pulsating dark halo for MRSA
      if (sd.mrsaHalo) {
        var ph = 0.4 + 0.6 * Math.sin(state.time * 2);
        ctx.strokeStyle = "rgba(40, 40, 40, " + (0.55 * ph) + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, R * pulse * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (sd.type === "spike") {
      // Blue ring with radial spikes (representa proteínas spike del VIH).
      ctx.fillStyle = "rgba(100, 181, 246, " + (0.40 * ratio + hit * 0.4) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(60, 130, 200, " + (0.85 * ratio + hit * 0.4) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.stroke();
      // Radial spike lines (each indica un punto de hp del escudo)
      var spikes = 12;
      var visibleSpikes = Math.ceil(spikes * ratio);
      ctx.strokeStyle = "rgba(60, 130, 200, " + (0.9 * ratio) + ")";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      for (var s = 0; s < visibleSpikes; s++) {
        var a = (s / spikes) * Math.PI * 2 + state.time * 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.lineTo(Math.cos(a) * (R + 5 * U), Math.sin(a) * (R + 5 * U));
        ctx.stroke();
      }
      // Sparkle (pulse)
      var sparkle = 0.5 + 0.5 * Math.sin(state.time * 5);
      ctx.fillStyle = "rgba(180, 220, 255, " + (sparkle * 0.4 * ratio) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2);
      ctx.fill();
    } else if (sd.type === "wall") {
      // Thick green ring with granular texture (pared celular fúngica/cerosa).
      ctx.fillStyle = "rgba(197, 225, 165, " + (0.50 * ratio + hit * 0.4) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 160, 90, " + (0.85 * ratio + hit * 0.4) + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
      ctx.stroke();
      // Inner granules / waxy texture
      var granules = sd.waxy ? 14 : 10;
      ctx.fillStyle = "rgba(140, 175, 100, " + (0.7 * ratio) + ")";
      for (var g = 0; g < granules; g++) {
        var ga = (g / granules) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ga) * R * 0.92, Math.sin(ga) * R * 0.92, 1.4 * U, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Shatter flash
    if (shatter > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, " + (shatter * 0.85) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, R * (1 + (1 - shatter) * 0.4), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Tiny shield HP indicator below the body when shield exists and < max.
    if (e.shieldHP > 0 && e.shieldHP < sd.maxHP && !e.dying && !e.absorbing) {
      var bw = Math.max(18 * U, rad * 1.6);
      var bh = 2.4 * Math.max(1, U * 0.9);
      var by = e.y + rad * 1.05;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(e.x - bw / 2, by, bw, bh);
      ctx.fillStyle = sd.type === "spike" ? "#64B5F6" : sd.type === "wall" ? "#C5E1A5" : "#FFF59D";
      ctx.fillRect(e.x - bw / 2, by, bw * (e.shieldHP / sd.maxHP), bh);
    }
  }

  function drawBacteria(e, rad, expression, blink) {
    var hit = e.hitFlash > 0;
    var stretch = 1 + Math.sin(e.wobble * 1.6) * 0.10;
    var squeeze = 1 - Math.sin(e.wobble * 1.6) * 0.06;
    ctx.save();
    ctx.translate(e.x, e.y);
    // Bacilus shape (capsule)
    var rx = rad * 1.5 * stretch;
    var ry = rad * 0.85 * squeeze;
    // flagella
    ctx.strokeStyle = e.def.colorDark;
    ctx.lineWidth = Math.max(1.1, 1.3 * U);
    ctx.lineCap = "round";
    for (var f = 0; f < 3; f++) {
      var fa = (f - 1) * 0.4 + Math.sin(e.wobble * 2 + f) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-rx, fa * ry * 0.6);
      ctx.quadraticCurveTo(-rx - 6 * U, fa * ry * 0.6 + Math.sin(e.wobble * 4 + f) * 3 * U,
                            -rx - 12 * U, fa * ry * 0.5 + Math.cos(e.wobble * 4 + f) * 4 * U);
      ctx.stroke();
    }
    // Body
    var grad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, ry * 0.2, 0, 0, rx);
    grad.addColorStop(0, "#f7b5af");
    grad.addColorStop(0.6, e.def.color);
    grad.addColorStop(1, e.def.colorDark);
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = e.def.colorDark;
    ctx.lineWidth = Math.max(1.0, 1.2 * U);
    ctx.stroke();
    // Face — expression-aware
    var eyeR = ry * 0.30;
    if (expression === "dying") drawHurtEyes(rx * 0.10, -ry * 0.15, eyeR, rx * 0.28);
    else if (expression === "hurt") drawHurtEyes(rx * 0.10, -ry * 0.15, eyeR, rx * 0.28);
    else if (blink) drawClosedEyes(rx * 0.10, -ry * 0.15, eyeR, rx * 0.28);
    else drawAnimeEyes(rx * 0.10, -ry * 0.15, eyeR, rx * 0.28, 0, 0, ry * 0.18, ry * 0.10, "angry");
    if (expression === "dying") drawAnimeMouth(rx * 0.10, ry * 0.30, rx * 0.5, ry * 0.55, "open");
    else if (expression === "hurt") drawAnimeMouth(rx * 0.10, ry * 0.30, rx * 0.4, ry * 0.50, "open");
    else drawAnimeMouth(rx * 0.10, ry * 0.30, rx * 0.45, ry * 0.40, "fanged");
    ctx.restore();
  }

  function drawVirus(e, rad, expression, blink) {
    var hit = e.hitFlash > 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    var spinPhase = state.time * 1.5;
    // Spikes (8)
    ctx.strokeStyle = e.def.colorDark;
    ctx.fillStyle = e.def.colorDark;
    ctx.lineWidth = Math.max(1.2, 1.4 * U);
    var spikes = 8;
    for (var i = 0; i < spikes; i++) {
      var a = i * Math.PI * 2 / spikes + spinPhase * 0.3;
      var len = rad + (3 + Math.sin(spinPhase * 2 + i) * 1.2) * U;
      var sx = Math.cos(a) * len;
      var sy = Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rad * 0.85, Math.sin(a) * rad * 0.85);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // Capsid (hex-ish)
    var capR = rad * 1.05;
    ctx.beginPath();
    for (var k = 0; k < 6; k++) {
      var ka = k * Math.PI / 3 - Math.PI / 2;
      var kx = Math.cos(ka) * capR;
      var ky = Math.sin(ka) * capR;
      if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky);
    }
    ctx.closePath();
    var grad = ctx.createRadialGradient(-capR * 0.3, -capR * 0.3, capR * 0.2, 0, 0, capR);
    grad.addColorStop(0, "#c08bd9");
    grad.addColorStop(0.6, e.def.color);
    grad.addColorStop(1, e.def.colorDark);
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.fill();
    ctx.strokeStyle = e.def.colorDark;
    ctx.lineWidth = Math.max(1.0, 1.2 * U);
    ctx.stroke();
    // Face — wide eyes, smirk; expression-aware
    var eyeR = capR * 0.32;
    if (expression === "dying") drawHurtEyes(0, -capR * 0.15, eyeR, capR * 0.30);
    else if (expression === "hurt") drawHurtEyes(0, -capR * 0.15, eyeR, capR * 0.30);
    else if (blink) drawClosedEyes(0, -capR * 0.15, eyeR, capR * 0.30);
    else drawAnimeEyes(0, -capR * 0.15, eyeR, capR * 0.30, 0, 0, capR * 0.10, capR * 0.05, "evil");
    if (expression === "dying") drawAnimeMouth(0, capR * 0.30, capR * 0.55, capR * 0.45, "open");
    else if (expression === "hurt") drawAnimeMouth(0, capR * 0.30, capR * 0.45, capR * 0.40, "open");
    else drawAnimeMouth(0, capR * 0.30, capR * 0.55, capR * 0.30, "smirk");
    ctx.restore();
  }

  // Cara malvada genérica para gérmenes nuevos (triste solo al morir).
  function germFace(R, expression, blink, gap) {
    gap = gap || R * 0.30; var eyeR = R * 0.26, ey = -R * 0.08;
    if (expression === "dying" || expression === "hurt") drawHurtEyes(0, ey, eyeR, gap);
    else if (blink) drawClosedEyes(0, ey, eyeR, gap);
    else drawAnimeEyes(0, ey, eyeR, gap, 0, 0, R * 0.12, R * 0.04, "evil");
    if (expression === "dying" || expression === "hurt") drawAnimeMouth(0, R * 0.34, R * 0.5, R * 0.42, "open");
    else drawAnimeMouth(0, R * 0.34, R * 0.5, R * 0.28, "fanged");
  }

  // SARNA — ácaro ovalado segmentado con 8 patitas; se entierra (madriguera).
  function drawSarna(e, rad, expression, blink) {
    var R = rad, w = e.wobble || 0;
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.burrowed) {
      ctx.fillStyle = "rgba(90,60,30,0.55)";
      ctx.beginPath(); ctx.ellipse(0, R * 0.55, R * 1.15, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = e.revealed ? 0.6 : 0.22;
    }
    ctx.strokeStyle = e.def.colorDark; ctx.lineWidth = Math.max(1.4, 2 * U); ctx.lineCap = "round";
    for (var i = 0; i < 8; i++) {
      var side = (i < 4 ? -1 : 1), idx = i % 4, ly = (-0.45 + idx * 0.32) * R, bend = Math.sin(w * 2 + i) * 0.18;
      ctx.beginPath();
      ctx.moveTo(side * R * 0.7, ly);
      ctx.lineTo(side * R * 1.25, ly + R * 0.18 + bend * R);
      ctx.lineTo(side * R * 1.5, ly + R * 0.45 + bend * R);
      ctx.stroke();
    }
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R * 1.1);
    grad.addColorStop(0, e.def.colorLight || "#c79a5e"); grad.addColorStop(0.6, e.def.color); grad.addColorStop(1, e.def.colorDark);
    ctx.fillStyle = (e.hitFlash > 0) ? "#fff" : grad;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.95, R * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.def.colorDark; ctx.lineWidth = Math.max(1, 1.3 * U); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
    for (var s = 1; s <= 2; s++) { ctx.beginPath(); ctx.ellipse(0, R * 0.20 * s, R * 0.8, R * 0.26, 0, 0, Math.PI); ctx.stroke(); }
    germFace(R, expression, blink, R * 0.30);
    if (e.burrowed && e.revealed) { ctx.strokeStyle = "rgba(63,193,201,0.9)"; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  // HPV — cápside facetada (icosaedro) con bultos de queratina.
  function drawHPV(e, rad, expression, blink) {
    var R = rad, faces = 10;
    ctx.save(); ctx.translate(e.x, e.y);
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    grad.addColorStop(0, e.def.colorLight || "#c2cf90"); grad.addColorStop(0.6, e.def.color); grad.addColorStop(1, e.def.colorDark);
    ctx.fillStyle = (e.hitFlash > 0) ? "#fff" : grad;
    ctx.beginPath();
    for (var i = 0; i < faces; i++) { var a = i / faces * Math.PI * 2 - Math.PI / 2, rr = R * (0.92 + 0.1 * ((i % 2) ? 1 : 0)), px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = e.def.colorDark; ctx.lineWidth = Math.max(1.2, 1.6 * U); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
    for (var j = 0; j < faces; j++) { var a2 = j / faces * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a2) * R * 0.9, Math.sin(a2) * R * 0.9); ctx.stroke(); }
    for (var k = 0; k < 5; k++) { var ka = k * 1.3 + 0.4; ctx.fillStyle = "rgba(220,210,160,0.85)"; ctx.beginPath(); ctx.arc(Math.cos(ka) * R * 0.72, Math.sin(ka) * R * 0.72, R * 0.15, 0, Math.PI * 2); ctx.fill(); }
    germFace(R, expression, blink, R * 0.30);
    ctx.restore();
  }

  // MOLLUSCUM — cúpula nacarada cerosa con hoyuelo central umbilicado.
  function drawMolluscum(e, rad, expression, blink) {
    var R = rad;
    ctx.save(); ctx.translate(e.x, e.y);
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.2, 0, 0, R * 1.1);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.5, e.def.colorLight || "#fbf2e6"); grad.addColorStop(1, e.def.color);
    ctx.fillStyle = (e.hitFlash > 0) ? "#fff" : grad;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.def.colorDark; ctx.lineWidth = Math.max(1.2, 1.5 * U); ctx.stroke();
    // Hoyuelo central umbilicado (arriba para no chocar con la cara).
    ctx.fillStyle = "rgba(150,120,90,0.5)"; ctx.beginPath(); ctx.ellipse(0, -R * 0.55, R * 0.2, R * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(-R * 0.38, -R * 0.4, R * 0.2, R * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
    germFace(R, expression, blink, R * 0.30);
    ctx.restore();
  }

  // MALASSEZIA — racimo de levaduras redondas con brillo aceitoso y yemas.
  function drawMalassezia(e, rad, expression, blink) {
    var R = rad, w = e.wobble || 0;
    ctx.save(); ctx.translate(e.x, e.y);
    var ag = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.5);
    ag.addColorStop(0, "rgba(216,192,96,0.18)"); ag.addColorStop(1, "rgba(216,192,96,0)");
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill();
    function yeast(cxp, cyp, r) {
      var grad = ctx.createRadialGradient(cxp - r * 0.3, cyp - r * 0.3, r * 0.2, cxp, cyp, r);
      grad.addColorStop(0, "#fff7d6"); grad.addColorStop(0.5, e.def.color); grad.addColorStop(1, e.def.colorDark);
      ctx.fillStyle = (e.hitFlash > 0) ? "#fff" : grad;
      ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.def.colorDark; ctx.lineWidth = Math.max(1, 1.2 * U); ctx.stroke();
    }
    yeast(-R * 0.5, R * 0.45, R * 0.5);
    yeast(R * 0.55, R * 0.4, R * 0.42);
    yeast(R * 0.5, -R * 0.45, R * 0.36 + Math.sin(w) * 1 * U);
    yeast(0, 0, R * 0.85);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(-R * 0.3, -R * 0.35, R * 0.2, R * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
    germFace(R * 0.85, expression, blink, R * 0.26);
    ctx.restore();
  }

  function drawHongo(e, rad, expression, blink) {
    var hit = e.hitFlash > 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    // Hyphae roots dangling below
    ctx.strokeStyle = e.def.colorDark;
    ctx.lineWidth = Math.max(1.0, 1.2 * U);
    ctx.lineCap = "round";
    var phase = state.time * 1.6;
    for (var h = -2; h <= 2; h++) {
      var hx = h * rad * 0.35;
      ctx.beginPath();
      ctx.moveTo(hx, rad * 0.7);
      ctx.quadraticCurveTo(hx + Math.sin(phase + h) * 3 * U, rad + 5 * U,
                           hx + Math.sin(phase * 1.4 + h * 1.7) * 4 * U, rad + 12 * U);
      ctx.stroke();
    }
    // Capsule body (taller than wide)
    var bw = rad * 1.0, bh = rad * 1.25;
    var grad = ctx.createRadialGradient(-bw * 0.3, -bh * 0.3, bh * 0.2, 0, 0, bh);
    grad.addColorStop(0, "#f5a2c0");
    grad.addColorStop(0.6, e.def.color);
    grad.addColorStop(1, e.def.colorDark);
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = e.def.colorDark;
    ctx.lineWidth = Math.max(1.0, 1.2 * U);
    ctx.stroke();
    // Face — sleepy evil; expression-aware
    var eyeR = bw * 0.28;
    if (expression === "dying") drawHurtEyes(0, -bh * 0.10, eyeR, bw * 0.30);
    else if (expression === "hurt") drawHurtEyes(0, -bh * 0.10, eyeR, bw * 0.30);
    else if (blink) drawClosedEyes(0, -bh * 0.10, eyeR, bw * 0.30);
    else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(-bw * 0.30, -bh * 0.10, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse( bw * 0.30, -bh * 0.10, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = Math.max(0.8, 1 * U);
      ctx.beginPath();
      ctx.ellipse(-bw * 0.30, -bh * 0.10, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse( bw * 0.30, -bh * 0.10, eyeR, eyeR * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.arc(-bw * 0.30, -bh * 0.10 + eyeR * 0.10, eyeR * 0.40, 0, Math.PI * 2);
      ctx.arc( bw * 0.30, -bh * 0.10 + eyeR * 0.10, eyeR * 0.40, 0, Math.PI * 2);
      ctx.fill();
    }
    if (expression === "dying" || expression === "hurt") drawAnimeMouth(0, bh * 0.30, bw * 0.55, bh * 0.40, "open");
    else drawAnimeMouth(0, bh * 0.30, bw * 0.65, bh * 0.30, "wicked");
    ctx.restore();
  }

  function drawDermatofito(e, rad, expression, blink) {
    // Hongo filamentoso (dermatofito): cuerpo alto + hifas con esporas arriba.
    var hit = e.hitFlash > 0, t = state.time;
    var col = e.def.color, cold = e.def.colorDark;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.6 + (e.wobble || 0)) * 0.04;
    var bw = rad * 0.82 * breathe;
    var bh = rad * 1.30 * (2 - breathe);   // notablemente más alto que ancho
    // Hifas con esporas saliendo de la parte superior (tipo moho).
    var nH = 5;
    for (var h = 0; h < nH; h++) {
      var hx0 = ((h / (nH - 1)) - 0.5) * bw * 1.3;
      var ha = -Math.PI / 2 + (h - (nH - 1) / 2) * 0.30 + Math.sin(t * 2 + h) * 0.16;
      var len = bh * (0.55 + ((h * 7) % 4) / 4 * 0.45);
      var tx = hx0 + Math.cos(ha) * len, ty = -bh * 0.65 + Math.sin(ha) * len;
      var mx = hx0 + Math.cos(ha) * len * 0.5, my = -bh * 0.65 + Math.sin(ha) * len * 0.5 - 3 * U;
      ctx.strokeStyle = cold; ctx.lineWidth = Math.max(1, 1.5 * U); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(hx0, -bh * 0.65); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(tx, ty, 2.8 * U, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = cold; ctx.lineWidth = 1; ctx.stroke();
    }
    // Cuerpo (óvalo alto).
    var grad = ctx.createRadialGradient(-bw * 0.3, -bh * 0.3, bh * 0.2, 0, 0, bh);
    grad.addColorStop(0, "#dde6a6");
    grad.addColorStop(0.6, col);
    grad.addColorStop(1, cold);
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.beginPath(); ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cold; ctx.lineWidth = Math.max(1, 1.3 * U); ctx.stroke();
    // Septos (tabiques del hongo): líneas horizontales tenues.
    ctx.strokeStyle = "rgba(94, 106, 44, 0.40)"; ctx.lineWidth = 1;
    for (var sct = -1; sct <= 1; sct++) {
      ctx.beginPath(); ctx.moveTo(-bw * 0.7, sct * bh * 0.34); ctx.lineTo(bw * 0.7, sct * bh * 0.34); ctx.stroke();
    }
    // Cara malvada.
    var eyeR = bw * 0.34, faceY = -bh * 0.04, gap = bw * 0.33;
    if (expression === "dying" || expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, bh * 0.10, bh * 0.05, "evil");
    if (expression === "dying" || expression === "hurt") drawAnimeMouth(0, bh * 0.40, bw * 0.5, bh * 0.4, "open");
    else drawAnimeMouth(0, bh * 0.42, bw * 0.5, bh * 0.28, "fanged");
    ctx.restore();
  }

  // ---- Sprint 8C-1: morfologías microbiológicas reales ------------------
  // Cada uno mantiene la signatura (e, rad, expression, blink), respeta
  // hitFlash, y usa los helpers existentes para la cara kawaii.

  function drawEcoli(e, rad, expression, blink) {
    // Bacilo gram-negativo: cápsula horizontal alargada con flagelos peritricos.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.6 + e.wobble) * 0.04;
    var rx = rad * 1.45 * breathe;
    var ry = rad * 0.58 * (2 - breathe);
    // Paleta del def (recoloreo de bacilos reusados); verdes E.coli por default.
    var rodLight = e.def.colorLight || "#DCE89C";
    var rodMid   = e.def.color     || "#B8D050";
    var rodDark  = e.def.colorDark || "#6B8030";
    // Flagelos peritricos (6 saliendo en distintas direcciones, ondulando).
    ctx.strokeStyle = rodDark;
    ctx.lineWidth = Math.max(1.0, 1.5 * U);
    ctx.lineCap = "round";
    var flagN = 6;
    for (var f = 0; f < flagN; f++) {
      var fa = (f / flagN) * Math.PI * 2 + Math.sin(t * 0.8) * 0.1;
      var ox = Math.cos(fa) * rx * 0.92;
      var oy = Math.sin(fa) * ry * 0.92;
      var len = 13 * U;
      var dx = Math.cos(fa) * len;
      var dy = Math.sin(fa) * len;
      // Onda lateral (perpendicular)
      var perpX = -Math.sin(fa);
      var perpY = Math.cos(fa);
      var wave = Math.sin(t * 4 + f * 1.3 + e.wobble) * 3 * U;
      var c1x = ox + dx * 0.4 + perpX * wave;
      var c1y = oy + dy * 0.4 + perpY * wave;
      var c2x = ox + dx * 0.75 - perpX * wave;
      var c2y = oy + dy * 0.75 - perpY * wave;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ox + dx, oy + dy);
      ctx.stroke();
    }
    // Cuerpo (cápsula bacilar)
    var grad = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, ry * 0.2, 0, 0, rx);
    grad.addColorStop(0, rodLight);
    grad.addColorStop(0.55, rodMid);
    grad.addColorStop(1, rodDark);
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rodDark;
    ctx.lineWidth = Math.max(1.0, 1.3 * U);
    ctx.stroke();
    // Highlight arriba-izquierda
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.4, -ry * 0.45, rx * 0.35, ry * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Cara
    var eyeR = ry * 0.42;
    var faceY = -ry * 0.10;
    var gap = rx * 0.28;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap);
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, ry * 0.15, ry * 0.08, "angry");
    if (expression === "dying") drawAnimeMouth(0, ry * 0.45, rx * 0.40, ry * 0.45, "open");
    else if (expression === "hurt") drawAnimeMouth(0, ry * 0.45, rx * 0.32, ry * 0.40, "open");
    else drawAnimeMouth(0, ry * 0.45, rx * 0.34, ry * 0.30, "fanged");
    ctx.restore();
  }

  function drawSpneumoniae(e, rad, expression, blink) {
    // Diplococo encapsulado: 2 cocos pegados verticalmente con extremos lanceolados.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.6 + e.wobble) * 0.04;
    var coR = rad * 0.78 * breathe;
    var offY = coR * 0.85;
    function drawCocoLanceolado(cy, isTop) {
      // Coco con un extremo "afilado" hacia el polo externo (lanceolado).
      var grad = ctx.createRadialGradient(-coR * 0.35, cy - coR * 0.4, coR * 0.2, 0, cy, coR);
      grad.addColorStop(0, "#FFE57A");
      grad.addColorStop(0.55, "#F0D050");
      grad.addColorStop(1, "#C0A030");
      ctx.fillStyle = hit ? "#ffffff" : grad;
      ctx.beginPath();
      // Forma "lanza" usando bezier: lados curvos + punta afinada arriba/abajo.
      var tipY = isTop ? cy - coR * 1.15 : cy + coR * 1.15;
      var baseY = isTop ? cy + coR * 0.55 : cy - coR * 0.55;
      ctx.moveTo(-coR, cy);
      ctx.bezierCurveTo(-coR, isTop ? cy - coR * 0.7 : cy + coR * 0.7,
                        -coR * 0.5, tipY, 0, tipY);
      ctx.bezierCurveTo(coR * 0.5, tipY,
                        coR, isTop ? cy - coR * 0.7 : cy + coR * 0.7, coR, cy);
      ctx.bezierCurveTo(coR, baseY, -coR, baseY, -coR, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#C0A030";
      ctx.lineWidth = Math.max(1.0, 1.3 * U);
      ctx.stroke();
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.beginPath();
      ctx.ellipse(-coR * 0.35, cy - coR * 0.35, coR * 0.32, coR * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    drawCocoLanceolado(-offY, true);
    drawCocoLanceolado( offY, false);
    // UNA cara en el coco superior.
    var eyeR = coR * 0.30;
    var faceY = -offY - coR * 0.10;
    var gap = coR * 0.32;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap);
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, coR * 0.10, coR * 0.06, "angry");
    if (expression === "dying") drawAnimeMouth(0, -offY + coR * 0.30, coR * 0.55, coR * 0.45, "open");
    else if (expression === "hurt") drawAnimeMouth(0, -offY + coR * 0.30, coR * 0.45, coR * 0.40, "open");
    else drawAnimeMouth(0, -offY + coR * 0.30, coR * 0.50, coR * 0.30, "smirk");
    ctx.restore();
  }

  function drawSaureus(e, rad, expression, blink) {
    // Coco en racimo tipo uvas: 1 grande central + 5-6 más pequeños alrededor.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.5 + e.wobble) * 0.04;
    var bigR = rad * 0.70 * breathe;
    // Racimo irregular (offsets fijos para parecer "uvas" pero sin simetría).
    var cluster = [
      { x: -bigR * 0.95, y: -bigR * 0.45, r: bigR * 0.55 },
      { x:  bigR * 1.00, y: -bigR * 0.25, r: bigR * 0.50 },
      { x: -bigR * 0.55, y:  bigR * 0.95, r: bigR * 0.60 },
      { x:  bigR * 0.65, y:  bigR * 0.85, r: bigR * 0.52 },
      { x: -bigR * 1.10, y:  bigR * 0.40, r: bigR * 0.45 },
      { x:  bigR * 0.30, y: -bigR * 1.10, r: bigR * 0.48 }
    ];
    function drawCoco(cx, cy, r) {
      var grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r);
      grad.addColorStop(0, "#F4D77A");
      grad.addColorStop(0.55, "#DAA520");
      grad.addColorStop(1, "#8B6914");
      ctx.fillStyle = hit ? "#ffffff" : grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8B6914";
      ctx.lineWidth = Math.max(0.9, 1.2 * U);
      ctx.stroke();
      // Highlight blanco arriba-izquierda
      ctx.fillStyle = "rgba(255,255,255,0.40)";
      ctx.beginPath();
      ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.30, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pequeños primero (atrás), grande al frente.
    for (var i = 0; i < cluster.length; i++) drawCoco(cluster[i].x, cluster[i].y, cluster[i].r);
    drawCoco(0, 0, bigR);
    // Puntos verdes esparcidos (biofilm sutil dentro del cuerpo).
    ctx.fillStyle = "rgba(107, 142, 35, 0.55)";
    var dots = 5;
    for (var d = 0; d < dots; d++) {
      var da = d * 1.7 + e.wobble;
      var dr = bigR * 0.85;
      ctx.beginPath();
      ctx.arc(Math.cos(da) * dr * 0.6, Math.sin(da) * dr * 0.6, 1.4 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // UNA cara en el coco central grande.
    var eyeR = bigR * 0.30;
    var faceY = -bigR * 0.08;
    var gap = bigR * 0.32;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap);
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, bigR * 0.12, bigR * 0.06, "evil");
    if (expression === "dying") drawAnimeMouth(0, bigR * 0.32, bigR * 0.55, bigR * 0.45, "open");
    else if (expression === "hurt") drawAnimeMouth(0, bigR * 0.32, bigR * 0.45, bigR * 0.40, "open");
    else drawAnimeMouth(0, bigR * 0.32, bigR * 0.50, bigR * 0.28, "wicked");
    ctx.restore();
  }

  function drawInfluenza(e, rad, expression, blink) {
    // Cápside hexagonal regular con espículas HA/NA (cabeza tipo champiñón).
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var spin = t * 0.4;
    var breathe = 1 + Math.sin(t * 1.8 + e.wobble) * 0.04;
    var capR = rad * 1.05 * breathe;
    // Espículas HA/NA (9) - tallo + cabecita Y/T.
    var spikeN = 9;
    ctx.lineCap = "round";
    for (var s = 0; s < spikeN; s++) {
      var a = (s / spikeN) * Math.PI * 2 + spin;
      var pulse = 1 + Math.sin(t * 2 + s) * 0.05;
      var bx = Math.cos(a) * capR * 0.92;
      var by = Math.sin(a) * capR * 0.92;
      var len = 7 * U * pulse;
      var ex = Math.cos(a) * (capR + len);
      var ey = Math.sin(a) * (capR + len);
      ctx.strokeStyle = "#8A78B0";
      ctx.lineWidth = Math.max(1.0, 1.4 * U);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // Cabeza (champiñón / T)
      ctx.fillStyle = "#A89AC8";
      ctx.beginPath();
      ctx.arc(ex, ey, 2.2 * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#483B66";
      ctx.lineWidth = Math.max(0.6, 0.8 * U);
      ctx.stroke();
    }
    // Hexágono regular (cápside icosaédrica)
    ctx.beginPath();
    for (var k = 0; k < 6; k++) {
      var ka = k * Math.PI / 3 - Math.PI / 2;
      var kx = Math.cos(ka) * capR;
      var ky = Math.sin(ka) * capR;
      if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky);
    }
    ctx.closePath();
    var grad = ctx.createRadialGradient(-capR * 0.35, -capR * 0.35, capR * 0.2, 0, 0, capR);
    grad.addColorStop(0, "#8E7FB8");
    grad.addColorStop(0.55, "#6B5B95");
    grad.addColorStop(1, "#483B66");
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.fill();
    ctx.strokeStyle = "#483B66";
    ctx.lineWidth = Math.max(1.0, 1.3 * U);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(-capR * 0.35, -capR * 0.35, capR * 0.32, capR * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Cara
    var eyeR = capR * 0.30;
    var faceY = -capR * 0.12;
    var gap = capR * 0.30;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap);
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, capR * 0.10, capR * 0.05, "evil");
    if (expression === "dying") drawAnimeMouth(0, capR * 0.30, capR * 0.50, capR * 0.40, "open");
    else if (expression === "hurt") drawAnimeMouth(0, capR * 0.30, capR * 0.40, capR * 0.35, "open");
    else drawAnimeMouth(0, capR * 0.30, capR * 0.50, capR * 0.28, "smirk");
    ctx.restore();
  }

  function drawVih(e, rad, expression, blink) {
    // Cápside cónica truncada (trapecio invertido) + gp120 prominentes tipo champiñón.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.5 + e.wobble) * 0.04;
    var capR = rad * 0.95 * breathe;
    // Halo azul difuso
    var haloPulse = 0.5 + 0.5 * Math.sin(t * 2);
    var haloGrad = ctx.createRadialGradient(0, 0, capR * 0.7, 0, 0, capR * 1.6);
    haloGrad.addColorStop(0, "rgba(74, 144, 226, " + (0.18 + haloPulse * 0.10) + ")");
    haloGrad.addColorStop(1, "rgba(74, 144, 226, 0)");
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, capR * 1.6, 0, Math.PI * 2);
    ctx.fill();
    // Espículas gp120 (7) tipo champiñón: tallo delgado + cabeza redonda gorda.
    var spikeN = 7;
    var spin = t * 0.3;
    for (var s = 0; s < spikeN; s++) {
      var a = (s / spikeN) * Math.PI * 2 + spin;
      var bx = Math.cos(a) * capR * 0.95;
      var by = Math.sin(a) * capR * 0.95;
      var len = 8 * U;
      var midX = Math.cos(a) * (capR + len * 0.6);
      var midY = Math.sin(a) * (capR + len * 0.6);
      var headX = Math.cos(a) * (capR + len);
      var headY = Math.sin(a) * (capR + len);
      // Tallo
      ctx.strokeStyle = "#4A90E2";
      ctx.lineWidth = Math.max(1.1, 1.4 * U);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(midX, midY);
      ctx.stroke();
      // Cabeza redonda (gp120)
      ctx.fillStyle = "#4A90E2";
      ctx.beginPath();
      ctx.arc(headX, headY, 3.0 * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2868B0";
      ctx.lineWidth = Math.max(0.6, 0.8 * U);
      ctx.stroke();
      // Highlight blanco en la cabeza
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.arc(headX - 0.9 * U, headY - 0.9 * U, 1.1 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hexágono exterior (envoltura)
    ctx.beginPath();
    for (var k = 0; k < 6; k++) {
      var ka = k * Math.PI / 3 - Math.PI / 2;
      var kx = Math.cos(ka) * capR;
      var ky = Math.sin(ka) * capR;
      if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky);
    }
    ctx.closePath();
    var grad = ctx.createRadialGradient(-capR * 0.35, -capR * 0.35, capR * 0.2, 0, 0, capR);
    grad.addColorStop(0, "#9540C5");
    grad.addColorStop(0.55, "#6A1B9A");
    grad.addColorStop(1, "#4A1264");
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.fill();
    ctx.strokeStyle = "#4A1264";
    ctx.lineWidth = Math.max(1.0, 1.3 * U);
    ctx.stroke();
    // Cápside cónica truncada interior (trapecio invertido) en #4B0082.
    if (!hit) {
      ctx.fillStyle = "#4B0082";
      ctx.beginPath();
      ctx.moveTo(-capR * 0.50, -capR * 0.45);
      ctx.lineTo( capR * 0.50, -capR * 0.45);
      ctx.lineTo( capR * 0.30,  capR * 0.55);
      ctx.lineTo(-capR * 0.30,  capR * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = Math.max(0.8, 1 * U);
      ctx.stroke();
    }
    // Cara
    var eyeR = capR * 0.26;
    var faceY = -capR * 0.18;
    var gap = capR * 0.26;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap, "#ff5577");
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, capR * 0.10, capR * 0.06, "evil");
    if (expression === "dying") drawAnimeMouth(0, capR * 0.30, capR * 0.45, capR * 0.40, "open");
    else if (expression === "hurt") drawAnimeMouth(0, capR * 0.30, capR * 0.38, capR * 0.32, "open");
    else drawAnimeMouth(0, capR * 0.30, capR * 0.42, capR * 0.25, "smirk");
    ctx.restore();
  }

  function drawCandida(e, rad, expression, blink) {
    // Levadura ovalada vertical con pseudohifas serpenteantes segmentadas.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.5 + e.wobble) * 0.04;
    var bw = rad * 0.85 * breathe;
    var bh = rad * 1.20 * (2 - breathe);
    // Pseudohifas (3) saliendo desde la base — segmentadas como salchichas.
    var hyphae = [
      { angle:  Math.PI * 0.55, segs: 4 },
      { angle:  Math.PI * 0.40, segs: 3 },
      { angle:  Math.PI * 0.65, segs: 4 }
    ];
    for (var hi = 0; hi < hyphae.length; hi++) {
      var h = hyphae[hi];
      var ox = Math.cos(h.angle) * bw * 0.6;
      var oy = Math.sin(h.angle) * bh * 0.8;
      var dirX = Math.cos(h.angle);
      var dirY = Math.sin(h.angle);
      var perpX = -dirY;
      var perpY = dirX;
      var segLen = 6 * U;
      var segR = 3.2 * U;
      var px = ox, py = oy;
      for (var sg = 0; sg < h.segs; sg++) {
        var wave = Math.sin(t * 2.5 + hi * 1.7 + sg * 0.9 + e.wobble) * 2.5 * U;
        var nx = ox + dirX * segLen * (sg + 1) + perpX * wave;
        var ny = oy + dirY * segLen * (sg + 1) + perpY * wave;
        var midX = (px + nx) / 2;
        var midY = (py + ny) / 2;
        // Salchicha: óvalo orientado al segmento
        var ang = Math.atan2(ny - py, nx - px);
        var grad = ctx.createRadialGradient(midX - segR * 0.3, midY - segR * 0.3, segR * 0.2,
                                             midX, midY, segR);
        grad.addColorStop(0, "#D8EFA8");
        grad.addColorStop(0.6, "#C0E090");
        grad.addColorStop(1, "#6B8E47");
        ctx.fillStyle = hit ? "#ffffff" : grad;
        ctx.beginPath();
        ctx.ellipse(midX, midY, segLen * 0.55, segR, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6B8E47";
        ctx.lineWidth = Math.max(0.9, 1.1 * U);
        ctx.stroke();
        px = nx; py = ny;
      }
    }
    // Cuerpo (levadura ovalada vertical)
    var grad = ctx.createRadialGradient(-bw * 0.35, -bh * 0.40, bh * 0.2, 0, 0, bh);
    grad.addColorStop(0, "#D8EFA8");
    grad.addColorStop(0.55, "#A8D070");
    grad.addColorStop(1, "#6B8E47");
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6B8E47";
    ctx.lineWidth = Math.max(1.0, 1.3 * U);
    ctx.stroke();
    // Highlight arriba-izquierda
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.ellipse(-bw * 0.35, -bh * 0.40, bw * 0.32, bh * 0.20, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Cara
    var eyeR = bw * 0.28;
    var faceY = -bh * 0.10;
    var gap = bw * 0.32;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap);
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, bh * 0.08, bh * 0.06, "angry");
    if (expression === "dying") drawAnimeMouth(0, bh * 0.30, bw * 0.55, bh * 0.40, "open");
    else if (expression === "hurt") drawAnimeMouth(0, bh * 0.30, bw * 0.45, bh * 0.35, "open");
    else drawAnimeMouth(0, bh * 0.30, bw * 0.55, bh * 0.28, "wicked");
    ctx.restore();
  }

  // ---- Sprint 8C-2: morfologías microbiológicas reales para los 4 bosses ---

  function drawBossPyogenes(e, rad, expression, blink) {
    // Streptococcus pyogenes: cadena de cocos con proteína M, halo necrótico.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.7 + e.wobble) * 0.05;
    var n = 9;
    var coR = rad * 0.32 * breathe;
    var spacing = rad * 0.42;
    var chainHalfW = (n - 1) * spacing / 2;

    // Halo necrótico (rojo oscuro pulsante) — denota tejido muerto.
    if (!hit) {
      var necroPulse = 0.55 + 0.45 * Math.sin(t * 2.0);
      var auraR = rad * 1.45;
      var auraG = ctx.createRadialGradient(0, 0, rad * 0.6, 0, 0, auraR);
      auraG.addColorStop(0, "rgba(160, 20, 35, " + (0.28 * necroPulse) + ")");
      auraG.addColorStop(0.55, "rgba(100, 8, 20, " + (0.22 * necroPulse) + ")");
      auraG.addColorStop(1, "rgba(40, 4, 10, 0)");
      ctx.fillStyle = auraG;
      ctx.beginPath();
      ctx.ellipse(0, 0, auraR, auraR * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawCoco(cx, cy, r, isCenter) {
      var grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r);
      grad.addColorStop(0, "#FF7AAB");
      grad.addColorStop(0.50, "#D81B5E");
      grad.addColorStop(1, "#5D0024");
      ctx.fillStyle = hit ? "#ffffff" : grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Contorno oscuro fuerte (carnívora).
      ctx.strokeStyle = "#3A0014";
      ctx.lineWidth = Math.max(1.0, 1.6 * U);
      ctx.stroke();
      // Highlight
      ctx.fillStyle = "rgba(255,200,210,0.45)";
      ctx.beginPath();
      ctx.arc(cx - r * 0.38, cy - r * 0.38, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // Proteína M: 5 espigas amarillas radiando del coco.
      if (!hit) {
        var spikes = isCenter ? 7 : 5;
        ctx.strokeStyle = "rgba(255, 210, 74, 0.85)";
        ctx.lineWidth = Math.max(0.8, 1.0 * U);
        for (var sp = 0; sp < spikes; sp++) {
          var sa = (sp / spikes) * Math.PI * 2 + t * 0.4;
          var x0 = cx + Math.cos(sa) * r * 0.95;
          var y0 = cy + Math.sin(sa) * r * 0.95;
          var spikeLen = r * (0.30 + 0.05 * Math.sin(t * 3 + sp));
          var x1 = cx + Math.cos(sa) * (r + spikeLen);
          var y1 = cy + Math.sin(sa) * (r + spikeLen);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
    }

    var positions = [];
    for (var i = 0; i < n; i++) {
      var px = -chainHalfW + i * spacing;
      // Más sinuoso, como serpiente — mayor amplitud
      var py = Math.sin((i / (n - 1)) * Math.PI * 1.5 + t * 0.6) * rad * 0.14 - rad * 0.04;
      positions.push({ x: px, y: py });
    }
    // Línea uniendo cocos (cápsula compartida)
    if (!hit) {
      ctx.strokeStyle = "rgba(80, 0, 20, 0.55)";
      ctx.lineWidth = Math.max(2.0, 3.0 * U);
      ctx.beginPath();
      ctx.moveTo(positions[0].x, positions[0].y);
      for (var li = 1; li < positions.length; li++) {
        ctx.lineTo(positions[li].x, positions[li].y);
      }
      ctx.stroke();
    }
    var centerIdx = Math.floor(n / 2);
    for (var i = 0; i < n; i++) drawCoco(positions[i].x, positions[i].y, coR, i === centerIdx);

    // Cara en el coco central (más imponente, ojos malevolentes)
    var center = positions[centerIdx];
    ctx.save();
    ctx.translate(center.x, center.y);
    var eyeR = coR * 0.46;
    var faceY = -coR * 0.10;
    var gap = coR * 0.42;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap);
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, coR * 0.18, coR * 0.09, "evil");
    if (expression === "dying") drawAnimeMouth(0, coR * 0.45, coR * 0.70, coR * 0.55, "open");
    else if (expression === "hurt") drawAnimeMouth(0, coR * 0.45, coR * 0.60, coR * 0.45, "open");
    else drawAnimeMouth(0, coR * 0.45, coR * 0.75, coR * 0.45, "fanged");
    ctx.restore();
    ctx.restore();
  }

  function drawBossTuberculosis(e, rad, expression, blink) {
    // Mycobacterium tuberculosis: bacilo BAAR alargado, ratio 4:1.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.3 + e.wobble) * 0.03;
    var rx = rad * 1.55 * breathe;
    var ry = rad * 0.40 * (2 - breathe);
    // Halo cerosa difusa adicional (textura waxy radial)
    var waxPulse = 0.5 + 0.5 * Math.sin(t * 1.5);
    ctx.strokeStyle = "rgba(255, 243, 224, " + (0.20 + waxPulse * 0.10) + ")";
    ctx.lineWidth = Math.max(0.9, 1.1 * U);
    var waxRays = 14;
    for (var w = 0; w < waxRays; w++) {
      var wa = (w / waxRays) * Math.PI * 2;
      var ix = Math.cos(wa) * rx * 1.10;
      var iy = Math.sin(wa) * ry * 1.40;
      var ox = Math.cos(wa) * rx * 1.25;
      var oy = Math.sin(wa) * ry * 1.70;
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox, oy);
      ctx.stroke();
    }
    // Cuerpo bacilo
    var grad = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, ry * 0.2, 0, 0, rx);
    grad.addColorStop(0, "#FF7B6D");
    grad.addColorStop(0.55, "#E53935");
    grad.addColorStop(1, "#B71C1C");
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7F0000";
    ctx.lineWidth = Math.max(1.2, 1.5 * U);
    ctx.stroke();
    // Segmentaciones BAAR (3 líneas verticales sutiles, patrón en cuentas)
    if (!hit) {
      ctx.strokeStyle = "rgba(127, 0, 0, 0.45)";
      ctx.lineWidth = Math.max(0.8, 1.0 * U);
      var segs = 3;
      for (var s = 1; s <= segs; s++) {
        var sx = -rx + (rx * 2) * (s / (segs + 1));
        ctx.beginPath();
        ctx.moveTo(sx, -ry * 0.75);
        ctx.lineTo(sx,  ry * 0.75);
        ctx.stroke();
      }
    }
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.4, -ry * 0.5, rx * 0.35, ry * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Cara centrada
    var eyeR = ry * 0.55;
    var faceY = -ry * 0.05;
    var gap = rx * 0.22;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap, "#7d1818");
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, ry * 0.18, ry * 0.10, "fierce");
    if (expression === "dying") drawAnimeMouth(0, ry * 0.55, rx * 0.30, ry * 0.50, "open");
    else if (expression === "hurt") drawAnimeMouth(0, ry * 0.55, rx * 0.25, ry * 0.45, "open");
    else drawAnimeMouth(0, ry * 0.55, rx * 0.28, ry * 0.32, "fanged");
    ctx.restore();
  }

  function drawBossAspergillus(e, rad, expression, blink) {
    // Aspergillus fumigatus: conidióforo (tallo segmentado + cabeza con conidios).
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.3 + e.wobble) * 0.03;
    // ---- Tallo (hifa) abajo, segmentado ----
    var stalkW = rad * 0.40 * breathe;
    var stalkH = rad * 0.95;
    var stalkTopY = -rad * 0.10;
    var stalkBotY = stalkTopY + stalkH;
    var stalkSegs = 4;
    var sway = Math.sin(t * 1.2 + e.wobble) * rad * 0.05;
    for (var s = 0; s < stalkSegs; s++) {
      var sy0 = stalkTopY + (stalkH / stalkSegs) * s;
      var sy1 = stalkTopY + (stalkH / stalkSegs) * (s + 1);
      var midY = (sy0 + sy1) / 2;
      var swayThis = sway * (1 - s / stalkSegs);  // más sway abajo
      var sw = stalkW * (1 - s * 0.04);  // un poco más angosto arriba
      var grad = ctx.createRadialGradient(swayThis - sw * 0.3, midY - sw * 0.3, sw * 0.2, swayThis, midY, sw);
      grad.addColorStop(0, "#9CCC65");
      grad.addColorStop(0.6, "#689F38");
      grad.addColorStop(1, "#33691E");
      ctx.fillStyle = hit ? "#ffffff" : grad;
      ctx.beginPath();
      ctx.ellipse(swayThis, midY, sw, (sy1 - sy0) * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#33691E";
      ctx.lineWidth = Math.max(0.9, 1.2 * U);
      ctx.stroke();
    }
    // ---- Cabeza conidial arriba ----
    var headR = rad * 0.65 * breathe;
    var headY = stalkTopY - headR * 0.55;
    var hgrad = ctx.createRadialGradient(-headR * 0.35, headY - headR * 0.35, headR * 0.2,
                                          0, headY, headR);
    hgrad.addColorStop(0, "#DCEDC8");
    hgrad.addColorStop(0.6, "#A5D6A7");
    hgrad.addColorStop(1, "#5A8C5C");
    ctx.fillStyle = hit ? "#ffffff" : hgrad;
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#33691E";
    ctx.lineWidth = Math.max(1.0, 1.3 * U);
    ctx.stroke();
    // Conidios (puntos en la cabeza) - 18 esparcidos
    if (!hit) {
      ctx.fillStyle = "#2E7D32";
      var conidios = 18;
      for (var c = 0; c < conidios; c++) {
        var ca = c * 2.39996 + e.wobble * 0.2;
        var cr = headR * (0.20 + ((c * 7) % 13) / 13 * 0.65);
        var cx = Math.cos(ca) * cr;
        var cy = headY + Math.sin(ca) * cr;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5 * U, 0, Math.PI * 2);
        ctx.fill();
      }
      // Highlight de la cabeza
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.ellipse(-headR * 0.35, headY - headR * 0.35, headR * 0.32, headR * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // ---- Conidios desprendidos cayendo (3 esporas con ciclo de 6s) ----
    if (!hit) {
      var fall = 3;
      for (var fi = 0; fi < fall; fi++) {
        var phase = ((t + e.wobble * 0.5 + fi * 1.7) % 6) / 6;  // 0..1
        if (phase < 0.5) continue;  // cayendo en la mitad final del ciclo
        var fp = (phase - 0.5) * 2;  // 0..1 dentro del fall
        var alpha = 1 - fp;  // fade out
        var seedX = (Math.sin(fi * 7.3 + e.wobble) * 0.6) * headR * 0.7;
        var dx = seedX + Math.sin(t * 2 + fi) * rad * 0.08;
        var dy = headY + headR * 0.4 + fp * rad * 1.2;
        ctx.fillStyle = "rgba(46, 125, 50, " + (alpha * 0.85) + ")";
        ctx.beginPath();
        ctx.arc(dx, dy, 1.6 * U, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ---- Cara EN EL TALLO (no en la cabeza) ----
    var faceY = stalkTopY + stalkH * 0.45;
    var eyeR = stalkW * 0.45;
    var gap = stalkW * 0.50;
    if (expression === "dying") drawHurtEyes(sway * 0.5, faceY, eyeR, gap);
    else if (expression === "hurt") drawHurtEyes(sway * 0.5, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(sway * 0.5, faceY, eyeR, gap);
    else drawAnimeEyes(sway * 0.5, faceY, eyeR, gap, 0, 0, stalkW * 0.18, stalkW * 0.08, "evil");
    if (expression === "dying") drawAnimeMouth(sway * 0.5, faceY + stalkW * 0.65, stalkW * 0.85, stalkW * 0.55, "open");
    else if (expression === "hurt") drawAnimeMouth(sway * 0.5, faceY + stalkW * 0.65, stalkW * 0.70, stalkW * 0.45, "open");
    else drawAnimeMouth(sway * 0.5, faceY + stalkW * 0.65, stalkW * 0.85, stalkW * 0.40, "wicked");
    ctx.restore();
  }

  function drawBossMRSA(e, rad, expression, blink) {
    // MRSA: S. aureus multirresistente — racimo dorado denso + cápsula de fibrina
    // (coagulasa) + biofilm dome + aura roja palpitante.
    var hit = e.hitFlash > 0;
    var t = state.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    var breathe = 1 + Math.sin(t * 1.6 + e.wobble) * 0.05;
    var bigR = rad * 0.58 * breathe;
    var sd = e.def.shield;
    var shieldFrac = (sd && sd.maxHP) ? Math.max(0, e.shieldHP) / sd.maxHP : 1;

    // 1. Halo rojo palpitante (eritema/infección).
    var redPulse = 0.5 + 0.5 * Math.sin(t * 5.5);
    var redAlpha = (0.24 + redPulse * 0.20) * (0.4 + shieldFrac * 0.6);
    var haloR = rad * (1.70 + redPulse * 0.10);
    var haloGrad = ctx.createRadialGradient(0, 0, rad * 0.9, 0, 0, haloR);
    haloGrad.addColorStop(0, "rgba(220, 50, 50, " + redAlpha + ")");
    haloGrad.addColorStop(1, "rgba(220, 50, 50, 0)");
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();

    // 2. CÁPSULA DE FIBRINA (coagulasa) — hilos enmarañados rodeando el racimo.
    if (!hit && shieldFrac > 0.05) {
      ctx.strokeStyle = "rgba(245, 220, 160, " + (0.55 * shieldFrac) + ")";
      ctx.lineWidth = Math.max(0.9, 1.1 * U);
      var fibrinStrands = 22;
      for (var fs = 0; fs < fibrinStrands; fs++) {
        var a0 = (fs / fibrinStrands) * Math.PI * 2 + t * 0.1;
        var a1 = a0 + 0.7 + 0.3 * Math.sin(t * 0.4 + fs);
        var r0 = rad * 1.10;
        var r1 = rad * 1.42;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
        ctx.quadraticCurveTo(
          Math.cos((a0 + a1) / 2) * rad * 1.55,
          Math.sin((a0 + a1) / 2) * rad * 1.55,
          Math.cos(a1) * r1,
          Math.sin(a1) * r1
        );
        ctx.stroke();
      }
    }

    // 3. Borde de cápsula (anillo dorado-rojizo).
    ctx.strokeStyle = "rgba(220, 80, 60, " + (redAlpha * 1.4) + ")";
    ctx.lineWidth = Math.max(1.6, 2.2 * U);
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.42, 0, Math.PI * 2);
    ctx.stroke();

    // 4. BIOFILM DOME — gradiente translúcido dorado abovedando el racimo.
    if (!hit) {
      var domeGrad = ctx.createRadialGradient(-rad * 0.3, -rad * 0.4, rad * 0.2, 0, 0, rad * 1.30);
      domeGrad.addColorStop(0, "rgba(255, 224, 130, " + (0.35 * shieldFrac) + ")");
      domeGrad.addColorStop(0.55, "rgba(218, 165, 32, " + (0.18 * shieldFrac) + ")");
      domeGrad.addColorStop(1, "rgba(218, 165, 32, 0)");
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rad * 1.30, 0, Math.PI * 2);
      ctx.fill();
      // Puntos de biofilm dispersos.
      ctx.fillStyle = "rgba(240, 200, 80, " + (0.55 * shieldFrac) + ")";
      var biofilmDots = 16;
      for (var bd = 0; bd < biofilmDots; bd++) {
        var ba = (bd / biofilmDots) * Math.PI * 2 + t * 0.18;
        var br = rad * (1.10 + 0.10 * Math.sin(t * 1.3 + bd));
        ctx.beginPath();
        ctx.arc(Math.cos(ba) * br, Math.sin(ba) * br, 2.0 * U, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. RACIMO denso (9 cocos: 1 central grande + 8 periféricos solapados).
    var cluster = [
      { x: -bigR * 1.10, y: -bigR * 0.60, r: bigR * 0.62 },
      { x:  bigR * 1.15, y: -bigR * 0.35, r: bigR * 0.58 },
      { x: -bigR * 0.70, y:  bigR * 1.05, r: bigR * 0.66 },
      { x:  bigR * 0.80, y:  bigR * 1.00, r: bigR * 0.60 },
      { x: -bigR * 1.25, y:  bigR * 0.50, r: bigR * 0.52 },
      { x:  bigR * 0.40, y: -bigR * 1.20, r: bigR * 0.56 },
      { x: -bigR * 0.30, y: -bigR * 1.15, r: bigR * 0.50 },
      { x:  bigR * 1.05, y:  bigR * 0.65, r: bigR * 0.48 }
    ];
    function drawCoco(cx, cy, r) {
      var grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r);
      grad.addColorStop(0, "#FFE085");
      grad.addColorStop(0.50, "#E0A820");
      grad.addColorStop(1, "#5A3F08");
      ctx.fillStyle = hit ? "#ffffff" : grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3D2A05";
      ctx.lineWidth = Math.max(1.2, 1.5 * U);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,250,210,0.55)";
      ctx.beginPath();
      ctx.arc(cx - r * 0.36, cy - r * 0.36, r * 0.30, 0, Math.PI * 2);
      ctx.fill();
    }
    for (var i = 0; i < cluster.length; i++) drawCoco(cluster[i].x, cluster[i].y, cluster[i].r);
    drawCoco(0, 0, bigR);

    // 6. Cara hostil en el coco central.
    var eyeR = bigR * 0.34;
    var faceY = -bigR * 0.06;
    var gap = bigR * 0.36;
    if (expression === "dying") drawHurtEyes(0, faceY, eyeR, gap, "#7d1818");
    else if (expression === "hurt") drawHurtEyes(0, faceY, eyeR, gap);
    else if (blink) drawClosedEyes(0, faceY, eyeR, gap);
    else drawAnimeEyes(0, faceY, eyeR, gap, 0, 0, bigR * 0.17, bigR * 0.09, "evil");
    if (expression === "dying") drawAnimeMouth(0, bigR * 0.36, bigR * 0.65, bigR * 0.55, "open");
    else if (expression === "hurt") drawAnimeMouth(0, bigR * 0.36, bigR * 0.55, bigR * 0.45, "open");
    else drawAnimeMouth(0, bigR * 0.36, bigR * 0.62, bigR * 0.36, "fanged");
    ctx.restore();
  }

  function drawBoss(e, rad, expression, blink) {
    var hit = e.hitFlash > 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    // Pulsing red halo (intensifies when enraged)
    var enrageBoost = expression === "enraged" ? 1.8 : 1.0;
    var haloSpeed = expression === "enraged" ? 7 : 4;
    var halo = 0.5 + 0.5 * Math.sin(state.time * haloSpeed);
    ctx.fillStyle = "rgba(231, 76, 60, " + ((0.18 + halo * 0.12) * enrageBoost) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, rad * (1.55 + halo * 0.10) * (expression === "enraged" ? 1.10 : 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(231, 76, 60, " + ((0.5 + halo * 0.3) * enrageBoost) + ")";
    ctx.lineWidth = Math.max(2, 2.5 * U);
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.50, 0, Math.PI * 2);
    ctx.stroke();
    // Many flagella
    ctx.strokeStyle = e.def.colorDark;
    ctx.lineWidth = Math.max(1.8, 2 * U);
    ctx.lineCap = "round";
    for (var f = -3; f <= 3; f++) {
      var fa = f * 0.18 + Math.sin(e.wobble * 2 + f) * 0.2;
      ctx.beginPath();
      ctx.moveTo(-rad * 1.0, fa * rad * 0.5);
      ctx.quadraticCurveTo(-rad * 1.4, fa * rad * 0.5 + Math.sin(e.wobble * 4 + f) * 5 * U,
                            -rad * 1.8, fa * rad * 0.4 + Math.cos(e.wobble * 4 + f) * 7 * U);
      ctx.stroke();
    }
    // Body bacilus
    var rx = rad * 1.35, ry = rad * 0.95;
    var grad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, ry * 0.2, 0, 0, rx);
    grad.addColorStop(0, "#f08080");
    grad.addColorStop(0.5, e.def.color);
    grad.addColorStop(1, e.def.colorDark);
    ctx.fillStyle = hit ? "#ffffff" : grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a0a0a";
    ctx.lineWidth = Math.max(1.5, 2 * U);
    ctx.stroke();
    // Glowing red eyes — expression-aware
    var eyeR = ry * 0.32;
    if (expression === "dying") {
      drawHurtEyes(0, -ry * 0.18, eyeR, rx * 0.30, "#7d1818");
    } else if (expression === "hurt") {
      drawHurtEyes(0, -ry * 0.18, eyeR, rx * 0.30);
    } else {
      var glowMult = expression === "enraged" ? 1.4 : 1.0;
      ctx.fillStyle = "rgba(255, 80, 80, " + (0.5 * glowMult) + ")";
      ctx.beginPath();
      ctx.arc(-rx * 0.30, -ry * 0.18, eyeR * 1.6 * glowMult, 0, Math.PI * 2);
      ctx.arc( rx * 0.30, -ry * 0.18, eyeR * 1.6 * glowMult, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(-rx * 0.30, -ry * 0.18, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
      ctx.ellipse( rx * 0.30, -ry * 0.18, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = expression === "enraged" ? "#ff2424" : "#e74c3c";
      ctx.beginPath();
      ctx.arc(-rx * 0.30, -ry * 0.18, eyeR * 0.6, 0, Math.PI * 2);
      ctx.arc( rx * 0.30, -ry * 0.18, eyeR * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a0a0a";
      ctx.beginPath();
      ctx.arc(-rx * 0.30, -ry * 0.18, eyeR * 0.32, 0, Math.PI * 2);
      ctx.arc( rx * 0.30, -ry * 0.18, eyeR * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    // Brows
    ctx.strokeStyle = "#1a0a0a";
    ctx.lineWidth = Math.max(2, 2.5 * U);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-rx * 0.50, -ry * 0.50);
    ctx.lineTo(-rx * 0.10, -ry * 0.32);
    ctx.moveTo( rx * 0.50, -ry * 0.50);
    ctx.lineTo( rx * 0.10, -ry * 0.32);
    ctx.stroke();
    drawAnimeMouth(0, ry * 0.32, rx * 0.55, ry * 0.45, "fanged");
    ctx.restore();
  }

  function drawProjectile(p) {
    var ang = p.target ? Math.atan2(p.target.y - p.y, p.target.x - p.x) : 0;
    if (p.towerId === "linfocitoB") {
      // Anticuerpo mini-Y (ametralladora): cuerpo amarillo + halo tenue.
      ctx.fillStyle = "rgba(255, 247, 196, 0.55)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 5 * U, 0, Math.PI * 2); ctx.fill();
      drawYShape(p.x, p.y, 4 * U, ang + Math.PI / 2, "#fff7c4", "#2c8049");
    } else if (p.towerId === "linfocitoT") {
      // Citotoxina: ESTRELLA violeta de 5 puntas que gira, con glow morado.
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(state.time * 5 + ang);
      ctx.shadowColor = "rgba(147,112,219,0.85)"; ctx.shadowBlur = 12;
      ctx.fillStyle = "#d6c0f5"; ctx.strokeStyle = "#5d44a0"; ctx.lineWidth = 1.5;
      var Rs = 7 * U;
      ctx.beginPath();
      for (var s5 = 0; s5 < 10; s5++) {
        var sa = s5 * Math.PI / 5 - Math.PI / 2;
        var sr = (s5 % 2) ? Rs * 0.45 : Rs;
        var spx = Math.cos(sa) * sr, spyy = Math.sin(sa) * sr;
        if (s5 === 0) ctx.moveTo(spx, spyy); else ctx.lineTo(spx, spyy);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (p.towerId === "nk") {
      // Perforina: rayo blanco-rosa en zig-zag con punta brillante.
      var len = 22 * U;
      var bx = p.x - Math.cos(ang) * len, by = p.y - Math.sin(ang) * len;
      var perpA = ang + Math.PI / 2;
      var zig = Math.sin(state.time * 35 + p.x * 0.1) * 6 * U;
      var midX = (p.x + bx) / 2 + Math.cos(perpA) * zig;
      var midY = (p.y + by) / 2 + Math.sin(perpA) * zig;
      ctx.save();
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      // Aura ancha del rayo
      ctx.strokeStyle = "rgba(232,67,147,0.45)"; ctx.lineWidth = 6 * U;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(midX, midY); ctx.lineTo(p.x, p.y); ctx.stroke();
      // Núcleo del rayo (blanco brillante)
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2 * U;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(midX, midY); ctx.lineTo(p.x, p.y); ctx.stroke();
      // Punta
      ctx.shadowColor = "rgba(232,67,147,0.95)"; ctx.shadowBlur = 12;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p.x, p.y, 4 * U, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#E84393";
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * U, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (p.towerId === "eosinofilo") {
      // Racimo de gránulos rojo-naranja girando + estela.
      var tx = p.x - Math.cos(ang) * 12 * U, ty = p.y - Math.sin(ang) * 12 * U;
      ctx.strokeStyle = "rgba(242,119,78,0.55)"; ctx.lineWidth = 3 * U; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.save();
      ctx.shadowColor = "rgba(242,119,78,0.85)"; ctx.shadowBlur = 9;
      var rotG = state.time * 8;
      for (var g4 = 0; g4 < 5; g4++) {
        var ga = g4 * (Math.PI * 2 / 5) + rotG;
        var gd = 4.5 * U;
        var gxp = p.x + Math.cos(ga) * gd, gyp = p.y + Math.sin(ga) * gd;
        ctx.fillStyle = (g4 % 2) ? "#e15a32" : "#F2774E";
        ctx.beginPath(); ctx.arc(gxp, gyp, 2.8 * U, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "rgba(225,90,50,0.9)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 3 * U, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      // Genérico (cualquier futura torre con projectileSpeed).
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.splashDesign > 0 ? 6 : 4) * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawEffect(ef) {
    var alpha = Math.max(0, ef.life / ef.max);
    if (ef.kind === "toxinPulse") {
      // Anillo púrpura tóxico expandiéndose desde el boss.
      var t01 = 1 - (ef.life / ef.max);            // 0 → 1
      var rr = ef.r * (0.20 + 0.80 * t01);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = ef.color;
      ctx.lineWidth = 4 + 4 * (1 - t01);
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      // Halo interno
      var grd = ctx.createRadialGradient(ef.x, ef.y, rr * 0.5, ef.x, ef.y, rr);
      grd.addColorStop(0, "rgba(148, 48, 184, 0)");
      grd.addColorStop(0.8, "rgba(148, 48, 184, " + (0.30 * alpha) + ")");
      grd.addColorStop(1, "rgba(148, 48, 184, 0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (ef.kind === "markDart") {
      // Dardo cian de Langerhans que viaja hacia el germen y se "splatea".
      var t = 1 - (ef.life / ef.max);
      var px = ef.x + (ef.tx - ef.x) * t;
      var py = ef.y + (ef.ty - ef.y) * t;
      // Trail
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ef.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      var bx = ef.x + (ef.tx - ef.x) * Math.max(0, t - 0.15);
      var by = ef.y + (ef.ty - ef.y) * Math.max(0, t - 0.15);
      ctx.moveTo(bx, by);
      ctx.lineTo(px, py);
      ctx.stroke();
      // Cabeza del dardo (más grande al final, simula splat).
      var headR = (2 + t * 4) * U;
      ctx.fillStyle = ef.color;
      ctx.beginPath();
      ctx.arc(px, py, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      return;
    }
    if (ef.kind === "particle") {
      ctx.fillStyle = ef.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 3 * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "hit") {
      ctx.strokeStyle = ef.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, (8 + (1 - alpha) * 10) * U, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "explosion") {
      // Cytotoxic wave: violet gradient ring
      ctx.globalAlpha = alpha;
      var rg = ctx.createRadialGradient(ef.x, ef.y, ef.r * 0.4, ef.x, ef.y, ef.r);
      rg.addColorStop(0, "rgba(147, 112, 219, 0.55)");
      rg.addColorStop(0.7, "rgba(93, 68, 160, 0.30)");
      rg.addColorStop(1, "rgba(93, 68, 160, 0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(147, 112, 219, " + alpha + ")";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "melee") {
      // ZARPAZO/dentellada: 3 trazos paralelos (garra) + destello en el impacto.
      ctx.globalAlpha = alpha;
      var sdx = ef.x2 - ef.x1, sdy = ef.y2 - ef.y1, sd = Math.hypot(sdx, sdy) || 1;
      var sxN = sdx / sd, syN = sdy / sd;
      var spxN = -syN, spyN = sxN;
      ctx.lineCap = "round";
      // 3 garras paralelas, una más gruesa al centro.
      for (var sn = -1; sn <= 1; sn++) {
        var sof = sn * 5 * U;
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = (sn === 0 ? 3.5 : 2.5) * Math.max(1, U * 0.9);
        ctx.beginPath();
        ctx.moveTo(ef.x1 + spxN * sof, ef.y1 + spyN * sof);
        ctx.lineTo(ef.x2 + spxN * sof, ef.y2 + spyN * sof);
        ctx.stroke();
      }
      // Destello redondo al impactar (en el extremo).
      ctx.fillStyle = ef.color;
      ctx.globalAlpha = alpha * 0.55;
      ctx.beginPath();
      ctx.arc(ef.x2, ef.y2, (7 + (1 - alpha) * 7) * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "escape") {
      ctx.strokeStyle = "#d9534f";
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, (12 + (1 - alpha) * 18) * U, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "place") {
      var pt = 1 - ef.life / ef.max;
      ctx.strokeStyle = ef.color;
      ctx.globalAlpha = (1 - pt) * 0.85;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, (18 + pt * 36) * U, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = ef.color;
      ctx.globalAlpha = (1 - pt) * 0.30;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, (18 + pt * 18) * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "placeFlash") {
      var fa = ef.life / ef.max;
      ctx.fillStyle = "rgba(255, 255, 255, " + fa + ")";
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, (10 + (1 - fa) * 28) * U, 0, Math.PI * 2);
      ctx.fill();
    } else if (ef.kind === "shock") {
      // Anillo de choque de la explosión del germen.
      var sk = 1 - ef.life / ef.max;   // 0->1
      var sr = ef.r * (0.3 + 0.7 * sk);
      ctx.globalAlpha = (1 - sk) * 0.9;
      ctx.strokeStyle = ef.color || "#ff5b3a";
      ctx.lineWidth = (3 + 2 * (1 - sk)) * U;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, sr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = (1 - sk) * 0.25;
      ctx.fillStyle = ef.color || "#ff5b3a";
      ctx.beginPath(); ctx.arc(ef.x, ef.y, sr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "dmgText") {
      ctx.globalAlpha = alpha;
      var fs = Math.max(11, 13 * U);
      ctx.font = "bold " + fs + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(ef.text, ef.x, ef.y);
      ctx.fillStyle = ef.color;
      ctx.fillText(ef.text, ef.x, ef.y);
      ctx.globalAlpha = 1;
    } else if (ef.kind === "atpText") {
      ctx.globalAlpha = alpha;
      var fs2 = Math.max(12, 14 * U);
      ctx.font = "bold " + fs2 + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(60, 30, 0, 0.7)";
      ctx.strokeText(ef.text, ef.x, ef.y);
      ctx.fillStyle = ef.color;
      ctx.fillText(ef.text, ef.x, ef.y);
      ctx.globalAlpha = 1;
    } else if (ef.kind === "confetti") {
      ctx.save();
      ctx.translate(ef.x, ef.y);
      ctx.rotate(ef.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ef.color;
      ctx.fillRect(-ef.size, -ef.size * 0.4, ef.size * 2, ef.size * 0.8);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function drawCardIcon(typeId, cx, cy, R, enabled) {
    var def = TOWER_DEFS[typeId];
    ctx.save();
    ctx.translate(cx, cy);
    var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    var hot = enabled ? def.color : "#666";
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, hot);
    grad.addColorStop(1, def.colorDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.colorDark;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Clipea las decoraciones dentro del círculo del avatar para que las
    // cartas se vean como rectángulos limpios (sin anticuerpos/dendritas/bumps
    // sobresaliendo y dando efecto de "globo de diálogo").
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();
    if (typeId === "linfocitoB") {
      // 3 mini Y antibodies
      for (var i = 0; i < 3; i++) {
        var a = i * Math.PI * 2 / 3 - Math.PI / 2;
        drawMiniY(Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.2, R * 0.3, a + Math.PI / 2);
      }
    } else if (typeId === "linfocitoT") {
      // Granules
      for (var g = 0; g < 4; g++) {
        var ga = g * Math.PI * 0.5 + 0.4;
        ctx.fillStyle = "rgba(255, 240, 180, 0.85)";
        ctx.beginPath();
        ctx.arc(Math.cos(ga) * R * 0.5, Math.sin(ga) * R * 0.5, R * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (typeId === "neutrofilo") {
      // Igual que el sprite colocado: cuerpo claro + núcleo multilobulado morado.
      ctx.fillStyle = enabled ? "#f3ecf9" : "#cfc8d6";
      ctx.beginPath(); ctx.arc(0, 0, R * 0.96, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(126, 95, 176, 0.5)";
      for (var nl = 0; nl < 4; nl++) {
        var nla = nl * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(nla) * R * 0.34, Math.sin(nla) * R * 0.34 + R * 0.08, R * 0.30, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (typeId === "langerhans") {
      ctx.strokeStyle = def.colorDark; ctx.lineWidth = Math.max(1.5, R * 0.12); ctx.lineCap = "round";
      for (var d = 0; d < 8; d++) { var da = d * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(da) * R * 0.7, Math.sin(da) * R * 0.7); ctx.lineTo(Math.cos(da) * R * 1.3, Math.sin(da) * R * 1.3); ctx.stroke(); }
    } else if (typeId === "nk") {
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = Math.max(1, R * 0.09);
      ctx.beginPath();
      for (var h = 0; h < 6; h++) { var ha = h * Math.PI / 3 - Math.PI / 2, hx = Math.cos(ha) * R * 0.92, hy = Math.sin(ha) * R * 0.92; if (h === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy); }
      ctx.closePath(); ctx.stroke();
    } else if (typeId === "eosinofilo") {
      for (var ge = 0; ge < 5; ge++) { var gea = ge * 1.3; ctx.fillStyle = "rgba(225,90,50,0.9)"; ctx.beginPath(); ctx.arc(Math.cos(gea) * R * 0.5, Math.sin(gea) * R * 0.5, R * 0.16, 0, Math.PI * 2); ctx.fill(); }
    } else if (typeId === "mastocito") {
      for (var gm = 0; gm < 7; gm++) { var gma = gm * 0.9; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(Math.cos(gma) * R * 0.5, Math.sin(gma) * R * 0.5, R * 0.13, 0, Math.PI * 2); ctx.fill(); }
    } else if (typeId === "complemento") {
      ctx.strokeStyle = "#FFE27A"; ctx.lineWidth = Math.max(1.4, R * 0.12);
      ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, R * 0.28, 0, Math.PI * 2); ctx.fill();
    } else if (typeId === "plaqueta") {
      // Malla de fibrina: panal hexagonal pequeño (icono compendio).
      var hxR = R * 0.32;
      var hxW = hxR * Math.sqrt(3);
      var hxH = hxR * 1.5;
      // 2 filas de 3 hexágonos
      for (var pri = 0; pri < 2; pri++) {
        for (var pci = 0; pci < 3; pci++) {
          var ox = (pci - 1) * hxW + (pri % 2 === 1 ? -hxW / 2 : 0);
          var oy = (pri - 0.5) * hxH;
          var grd2 = ctx.createRadialGradient(ox - hxR * 0.3, oy - hxR * 0.3, hxR * 0.15, ox, oy, hxR);
          grd2.addColorStop(0, "#FFEBB0");
          grd2.addColorStop(0.55, "#E8A020");
          grd2.addColorStop(1, "#8A5010");
          ctx.fillStyle = grd2;
          ctx.beginPath();
          for (var hi = 0; hi < 6; hi++) {
            var ang = (Math.PI / 3) * hi + Math.PI / 6;
            var hxx = ox + Math.cos(ang) * hxR;
            var hxy = oy + Math.sin(ang) * hxR;
            if (hi === 0) ctx.moveTo(hxx, hxy);
            else ctx.lineTo(hxx, hxy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#5A3408";
          ctx.lineWidth = Math.max(0.8, 1.0 * U);
          ctx.stroke();
        }
      }
    } else {
      // Macrofago: small bumps
      for (var b = 0; b < 5; b++) {
        var ba = b * Math.PI * 2 / 5;
        ctx.fillStyle = hot;
        ctx.beginPath();
        ctx.arc(Math.cos(ba) * R * 0.95, Math.sin(ba) * R * 0.95, R * 0.30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = def.colorDark;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore(); // termina el clip del círculo
    // tiny eyes
    var eyeR = R * 0.16;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-R * 0.25, -R * 0.05, eyeR, 0, Math.PI * 2);
    ctx.arc( R * 0.25, -R * 0.05, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a22";
    ctx.beginPath();
    ctx.arc(-R * 0.25, -R * 0.05, eyeR * 0.55, 0, Math.PI * 2);
    ctx.arc( R * 0.25, -R * 0.05, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMiniY(cx, cy, size, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = "#2c8049";
    ctx.fillStyle = "#fff7c4";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, -size * 0.2);
    ctx.moveTo(0, -size * 0.2);
    ctx.lineTo(-size * 0.7, -size);
    ctx.moveTo(0, -size * 0.2);
    ctx.lineTo(size * 0.7, -size);
    ctx.stroke();
    ctx.restore();
  }

  function drawAmbient() {
    if (!state.ambient || !state.ambient.length) return;
    // Células de fondo: glóbulos rojos (discos bicóncavos) y algún glóbulo
    // blanco, derivando lento por el plasma. Vida de fondo, detrás del camino.
    for (var i = 0; i < state.ambient.length; i++) {
      var a = state.ambient[i];
      var fx = a.x + Math.sin(state.time * 0.22 + a.phase) * 14 * U;
      var fy = a.y + Math.cos(state.time * 0.18 + a.phase * 1.3) * 11 * U;
      var rr = a.r * 1.5;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(a.phase + state.time * 0.1);
      if (i % 5 === 0) {
        // Glóbulo blanco: pálido y lumpy con núcleo.
        ctx.fillStyle = "rgba(244, 240, 250, 0.42)";
        ctx.beginPath(); ctx.arc(0, 0, rr * 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(180, 160, 205, 0.35)";
        ctx.beginPath(); ctx.arc(rr * 0.25, 0, rr * 0.45, 0, Math.PI * 2); ctx.fill();
      } else {
        // Glóbulo rojo: disco con hundimiento central (bicóncavo).
        ctx.fillStyle = "rgba(198, 58, 58, 0.30)";
        ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(150, 28, 28, 0.28)";
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(120, 20, 20, 0.18)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Plasma fluyendo: blobs de luz que recorren el camino hacia el vaso (corriente).
  function drawPlasmaFlow() {
    if (!PATH.main || !PATH.main.length) return;
    var total = PATH.main.length, n = 10, speed = 85 * U;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var d = (state.time * speed + i * (total / n)) % total;
      var p = sampleBeziers(PATH.main.beziers, d);
      var tw = 0.5 + 0.5 * Math.sin(state.time * 2 + i * 1.3);
      ctx.fillStyle = "rgba(255, 244, 228, " + (0.08 + 0.12 * tw) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, (2.5 + tw * 2.5) * U, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Latido del organismo (~63 bpm) 0..1 con forma de pulso.
  function heartbeat() {
    return Math.pow(0.5 + 0.5 * Math.sin(state.time * (Math.PI * 2 / 0.95)), 6);
  }

  // Atmósfera: vignette + glow cálido + enrojecimiento por infestación.
  function drawAtmosphere() {
    var ft = FIELD_TOP, fh = FIELD_BOTTOM - FIELD_TOP;
    var cx = FIELD_LEFT + FIELD_W * 0.5, cy = ft + fh * 0.5;
    var beat = heartbeat();
    var vr = Math.min(1, state.viralLoad / Math.max(1, state.viralThreshold));
    var maxR = Math.max(FIELD_W, fh) * 0.72;
    ctx.save();
    // Vignette (bordes oscuros) con leve pulso.
    var vg = ctx.createRadialGradient(cx, cy, maxR * 0.55, cx, cy, maxR);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(18, 6, 10, " + (0.32 + beat * 0.05) + ")");
    ctx.fillStyle = vg;
    ctx.fillRect(FIELD_LEFT, ft, FIELD_W, fh);
    // Glow cálido central tenue.
    var wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.6);
    wg.addColorStop(0, "rgba(255, 222, 180, 0.06)");
    wg.addColorStop(1, "rgba(255, 222, 180, 0)");
    ctx.fillStyle = wg;
    ctx.fillRect(FIELD_LEFT, ft, FIELD_W, fh);
    // Organismo enfermándose: wash rojo que crece con la infestación + latido.
    if (vr > 0.04) {
      ctx.fillStyle = "rgba(168, 18, 18, " + (vr * 0.22 * (0.85 + beat * 0.18)) + ")";
      ctx.fillRect(FIELD_LEFT, ft, FIELD_W, fh);
    }
    ctx.restore();
  }

  function getViralColor(ratio) {
    if (ratio < 0.30) return "#2ECC71";
    if (ratio < 0.60) return "#F39C12";
    if (ratio < 0.85) return "#E67E22";
    return "#E74C3C";
  }
  function getViralLabel(ratio) {
    if (ratio < 0.30) return "ORGANISMO SALUDABLE";
    if (ratio < 0.60) return "INFLAMACIÓN AGUDA";
    if (ratio < 0.85) return "RESPUESTA SISTÉMICA";
    if (ratio < 1.00) return "FALLA INMINENTE";
    return "INFECCIÓN ESTABLECIDA";
  }

  function drawViralBar() {
    var pad = 10;
    var barW = VW - 2 * pad - safeLeft - safeRight;
    var barH = Math.max(10, Math.min(14, HUD_H * 0.16));
    var bx = safeLeft + pad;
    // Posiciona explícitamente DEBAJO del botón de oleada para garantizar gap.
    var byPref = FIELD_TOP - barH - 4;
    var byBelowBtn = (UI.nextWaveBtn ? UI.nextWaveBtn.y + UI.nextWaveBtn.h + 4 : byPref);
    var by = Math.max(byPref, byBelowBtn);
    var ratio = Math.min(1, state.viralLoad / Math.max(1, state.viralThreshold));
    var color = getViralColor(ratio);
    // Background track
    ctx.fillStyle = "rgba(20, 10, 14, 0.85)";
    roundRect(bx, by, barW, barH, barH / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    roundRect(bx, by, barW, barH, barH / 2);
    ctx.stroke();
    // Fill
    if (ratio > 0) {
      var innerW = (barW - 4) * ratio;
      ctx.fillStyle = color;
      roundRect(bx + 2, by + 2, Math.max(barH - 4, innerW), barH - 4, (barH - 4) / 2);
      ctx.fill();
    }
    // Inline text
    var label = getViralLabel(ratio) + "  " + Math.floor(state.viralLoad) + " / " + state.viralThreshold;
    ctx.font = "bold " + Math.max(10, Math.min(12, barH * 0.85)) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(label, bx + barW / 2 + 1, by + barH / 2 + 1);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, bx + barW / 2, by + barH / 2);
  }

  function drawHUD() {
    ctx.fillStyle = "#3a2530";
    ctx.fillRect(0, 0, VW, FIELD_TOP);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, FIELD_TOP - 2, VW, 2);
    // DEBUG temporal: overlay de dimensiones FIJADO AL TOPE del canvas en
    // coords del transform (siempre visible si el canvas en sí está visible).
    var dbgRect = canvas.getBoundingClientRect();
    var dbgLine = "VW=" + Math.round(VW) + " VH=" + Math.round(VH)
      + " rect=" + Math.round(dbgRect.width) + "x" + Math.round(dbgRect.height)
      + " FT=" + Math.round(FIELD_TOP) + " FB=" + Math.round(FIELD_BOTTOM)
      + " sT=" + Math.round(safeTop) + " sB=" + Math.round(safeBottom)
      + " t=" + Math.round(state.time);
    ctx.save();
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    var tw = ctx.measureText(dbgLine).width;
    // Banda magenta brillante para que destaque sin importar el color de fondo.
    ctx.fillStyle = "#ff00cc";
    ctx.fillRect(0, 0, tw + 8, 18);
    ctx.fillStyle = "#000000";
    ctx.fillText(dbgLine, 4, 3);
    ctx.restore();

    var leftX = safeLeft + 12;
    if (isPortrait) {
      // Stats en una línea con layout MEDIDO (sin offsets fijos) para que no
      // se solapen sin importar el ancho de la fuente o de los números.
      var midY = safeTop + (HUD_H - safeTop) / 2;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      var cx = leftX;
      ctx.font = "700 15px Fredoka, sans-serif";
      ctx.fillStyle = "#f5d76e";
      var atpStr = "⚡ " + state.atp;
      ctx.fillText(atpStr, cx, midY);
      cx += ctx.measureText(atpStr).width + 14;
      ctx.font = "600 12px Fredoka, sans-serif";
      ctx.fillStyle = "rgba(220, 200, 200, 0.9)";
      var phaseLabel = state.dissemination ? "DISEMINACIÓN" : "FASE 1";
      ctx.fillText(phaseLabel, cx, midY);
    } else {
      var statsY = safeTop + 8;
      var fontStat = Math.max(14, Math.min(20, VW * 0.018));
      var fontLabel = Math.max(10, Math.min(13, VW * 0.012));
      drawHudStat("⚡ ATP", state.atp, leftX, statsY, "#f5d76e", fontStat, fontLabel);
      drawHudStat("⊛ Acto", state.dissemination ? "II — Diseminación" : "I — Invasión",
        leftX + Math.min(160, VW * 0.22), statsY, "#d6c0a0", fontStat, fontLabel);
    }
    // Viral load bar — full width below HUD, inside field area.
    drawViralBar();

    // Status del HUD: solo informa "se viene una oleada" con el contador.
    // Sin número de oleada en curso ni de la oleada que se acerca.
    var statusText = null;
    if (state.cinematicEnd) statusText = "INFECCIÓN ESTABLECIDA";
    else if (state.waveActive) statusText = null;   // sin texto durante oleada
    else if (state.waveIdx === 0 && state.nextWaveAt > 0) {
      statusText = "PRÓXIMA OLEADA EN " + Math.max(0, Math.ceil(state.nextWaveAt)) + "s";
    } else if (state.waveCountdownActive && state.nextWaveAt > 0) {
      statusText = "PRÓXIMA OLEADA EN " + Math.max(0, Math.ceil(state.nextWaveAt)) + "s";
    }
    var nb = UI.nextWaveBtn;
    if (nb && statusText) {
      ctx.fillStyle = "rgba(20, 14, 18, 0.55)";
      ctx.fillRect(nb.x, nb.y, nb.w, nb.h);
      ctx.fillStyle = "#ffd6c4";
      ctx.font = "bold " + Math.max(11, Math.min(13, nb.h * 0.36)) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(statusText, nb.x + nb.w / 2, nb.y + nb.h / 2);
    }

    // Restart y Mute como rectángulos planos (sin borde).
    var rb = UI.restartBtn;
    ctx.fillStyle = "#5a3540";
    ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
    drawRestartIcon(rb.x + rb.w / 2, rb.y + rb.h / 2, rb.h * 0.32, "#fff");

    var mb = UI.muteBtn;
    ctx.fillStyle = "#5a3540";
    ctx.fillRect(mb.x, mb.y, mb.w, mb.h);
    drawSpeakerIcon(mb.x + mb.w / 2, mb.y + mb.h / 2, mb.h * 0.36, audio.muted, "#fff");
    if (state.dissemination) drawAntigenHud();
  }

  function drawSpeakerIcon(cx, cy, r, muted, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Speaker box + cone
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.85, cy - r * 0.30);
    ctx.lineTo(cx - r * 0.30, cy - r * 0.30);
    ctx.lineTo(cx + r * 0.10, cy - r * 0.70);
    ctx.lineTo(cx + r * 0.10, cy + r * 0.70);
    ctx.lineTo(cx - r * 0.30, cy + r * 0.30);
    ctx.lineTo(cx - r * 0.85, cy + r * 0.30);
    ctx.closePath();
    ctx.fill();
    if (muted) {
      // X over speaker
      ctx.strokeStyle = "#ff7878";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.30, cy - r * 0.50);
      ctx.lineTo(cx + r * 0.95, cy + r * 0.50);
      ctx.moveTo(cx + r * 0.95, cy - r * 0.50);
      ctx.lineTo(cx + r * 0.30, cy + r * 0.50);
      ctx.stroke();
    } else {
      // Sound waves
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx + r * 0.10, cy, r * 0.42, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + r * 0.10, cy, r * 0.70, -Math.PI * 0.30, Math.PI * 0.30);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRestartIcon(cx, cy, r, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.25, Math.PI * 1.85);
    ctx.stroke();
    // arrow tip
    var ang = Math.PI * 1.85;
    var ax = cx + Math.cos(ang) * r;
    var ay = cy + Math.sin(ang) * r;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - r * 0.55, ay - r * 0.05);
    ctx.lineTo(ax - r * 0.05, ay - r * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  function drawHudStat(label, value, x, y, color, fontStat, fontLabel) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = fontLabel + "px Fredoka, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, y);
    ctx.fillStyle = color;
    ctx.font = "bold " + fontStat + "px Fredoka, sans-serif";
    ctx.fillText(value, x, y + fontLabel + 4);
  }

  function drawButton(r, text, fill, stroke, enabled) {
    ctx.fillStyle = fill;
    roundRect(r.x, r.y, r.w, r.h, 0);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    roundRect(r.x, r.y, r.w, r.h, 0);
    ctx.stroke();
    ctx.fillStyle = enabled ? "#fff" : "rgba(255,255,255,0.55)";
    var fs = Math.max(11, Math.min(14, r.h * 0.36));
    ctx.font = "bold " + fs + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h - r);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawPanel() {
    // Dock lateral derecho a alto completo.
    var dockX = FIELD_RIGHT;
    ctx.fillStyle = "#2a1a22";
    ctx.fillRect(dockX, FIELD_TOP, VW - dockX, FIELD_BOTTOM - FIELD_TOP);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(dockX, FIELD_TOP, 2, FIELD_BOTTOM - FIELD_TOP);

    // Cartilla por grupos: cabeceras desplegables + cartas del grupo abierto.
    // Todo dentro del strip con scroll vertical y clipping.
    var strip = UI.cardStrip;
    var scroll = state.panelScroll || 0;
    if (strip && strip.h > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(strip.x - 6, strip.y, strip.w + 12, strip.h);
      ctx.clip();
      // Cabeceras de grupo.
      for (var gh = 0; gh < UI.groupHeaders.length; gh++) {
        var Hh = UI.groupHeaders[gh];
        var hy = strip.y + Hh.contentY - scroll;
        if (hy + Hh.h < strip.y - 4 || hy > strip.y + strip.h + 4) continue;
        ctx.fillStyle = Hh.open ? "#33212e" : "#241620";
        ctx.fillRect(Hh.x, hy, Hh.w, Hh.h);
        // Layout con auto-ajuste: la cuenta a la derecha (siempre visible),
        // y la etiqueta a la izquierda escalada/recortada para que no
        // invada el espacio de la cuenta.
        ctx.textBaseline = "middle";
        var countStr = String(Hh.count);
        // Reserva espacio para la cuenta (siempre 11px font).
        ctx.font = "bold 11px Fredoka, sans-serif";
        var countW = ctx.measureText(countStr).width;
        var lblText = (Hh.open ? "▾ " : "▸ ") + Hh.label;
        var lblX = Hh.x + 8;
        var lblMaxW = Hh.w - 16 - countW - 6;
        // Probar tamaños descendentes hasta que entre, o usar ellipsis.
        var maxFs = Math.max(10, Math.min(12, Hh.w * 0.105));
        var fs = maxFs;
        ctx.font = "bold " + fs + "px Fredoka, sans-serif";
        while (fs > 8 && ctx.measureText(lblText).width > lblMaxW) {
          fs -= 0.5;
          ctx.font = "bold " + fs + "px Fredoka, sans-serif";
        }
        // Si aún no entra al mínimo de 8px, recorta con "…"
        var displayText = lblText;
        if (ctx.measureText(displayText).width > lblMaxW) {
          while (displayText.length > 4 && ctx.measureText(displayText + "…").width > lblMaxW) {
            displayText = displayText.slice(0, -1);
          }
          displayText += "…";
        }
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.fillText(displayText, lblX, hy + Hh.h / 2);
        // Cuenta a la derecha.
        ctx.font = "bold 11px Fredoka, sans-serif";
        ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillText(countStr, Hh.x + Hh.w - 8, hy + Hh.h / 2);
      }
      // Cartas (solo de los grupos abiertos).
      for (var i = 0; i < UI.cards.length; i++) {
        var card = UI.cards[i];
        var typeId = card.typeId;
        var def = TOWER_DEFS[typeId];
        var cardViewY = strip.y + card.contentY - scroll;
        // Skip if completely off-screen (small perf win when content grows).
        if (cardViewY + card.h < strip.y - 4) continue;
        if (cardViewY > strip.y + strip.h + 4) continue;
        var canAfford = towerAffordable(def);
        var isSelected = state.selectedToBuild === typeId;
        var sc = isSelected ? 1.04 : 1.0;
        var cw = card.w * sc, ch = card.h * sc;
        var cardX = card.x - (cw - card.w) / 2;
        var cardY = cardViewY - (ch - card.h) / 2;

        if (isSelected) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = -4;
        }
        ctx.fillStyle = isSelected ? "#3a2538" : "#1f1219";
        ctx.fillRect(cardX, cardY, cw, ch);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        // Borde solo si está seleccionada (para feedback) — el resto sin outline.
        if (isSelected) {
          ctx.strokeStyle = def.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(cardX, cardY, cw, ch);
        }

        // Layout HORIZONTAL: ícono pequeño a la izquierda (en su propio
        // recuadro cuadrado) + nombre y costo a la derecha. Todo dentro del
        // rectángulo del card — sin "cabeza redonda" sobre "cuerpo rectangular".
        var iconBoxSize = Math.min(ch - 8, cw * 0.30);
        var iconCx = cardX + iconBoxSize / 2 + 4;
        var iconCy = cardY + ch / 2;
        var iconR = iconBoxSize * 0.40 * (canAfford ? 1 : 0.6);
        drawCardIcon(typeId, iconCx, iconCy, iconR, canAfford);

        // Texto: nombre (línea superior) + costo (línea inferior), alineado
        // a la izquierda, dentro del rectángulo.
        var textX = cardX + iconBoxSize + 10;
        var textRight = cardX + cw - 8;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        ctx.fillStyle = canAfford ? "#fff" : "rgba(255,255,255,0.45)";
        var fs1 = Math.max(11, Math.min(13, cw * 0.10));
        ctx.font = "bold " + fs1 + "px Fredoka, sans-serif";
        var nameStr = (cw - textX + cardX < 100 && def.shortName) ? def.shortName : def.name;
        // Truncar si el texto se sale.
        while (ctx.measureText(nameStr).width > (textRight - textX) && nameStr.length > 4) {
          nameStr = nameStr.slice(0, -2);
        }
        ctx.fillText(nameStr, textX, cardY + ch * 0.36);

        var isComp = def.currency === "complement";
        ctx.fillStyle = canAfford ? (isComp ? "#7CFC9E" : "#f5d76e") : "#d9534f";
        ctx.font = "bold " + Math.max(10, Math.min(12, cw * 0.09)) + "px Fredoka, sans-serif";
        if (typeId === "plaqueta") {
          var rdy = (state.plaquetaPickups || []).length;
          ctx.fillText("🔶 " + rdy + " listas", textX, cardY + ch * 0.70);
        } else {
          ctx.fillText((isComp ? "🧬 " : "⚡ ") + def.cost, textX, cardY + ch * 0.70);
        }
      }
      ctx.restore();
      // Edge-fade indicators (arriba/abajo) cuando hay contenido oculto.
      var maxScroll = Math.max(0, strip.contentH - strip.h);
      if (maxScroll > 0) {
        var fadeH = 16;
        if (scroll > 2) {
          var tg = ctx.createLinearGradient(0, strip.y, 0, strip.y + fadeH);
          tg.addColorStop(0, "rgba(42, 26, 34, 0.95)");
          tg.addColorStop(1, "rgba(42, 26, 34, 0)");
          ctx.fillStyle = tg;
          ctx.fillRect(strip.x - 6, strip.y, strip.w + 12, fadeH);
        }
        if (scroll < maxScroll - 2) {
          var bg = ctx.createLinearGradient(0, strip.y + strip.h - fadeH, 0, strip.y + strip.h);
          bg.addColorStop(0, "rgba(42, 26, 34, 0)");
          bg.addColorStop(1, "rgba(42, 26, 34, 0.95)");
          ctx.fillStyle = bg;
          ctx.fillRect(strip.x - 6, strip.y + strip.h - fadeH, strip.w + 12, fadeH);
        }
      }
    }

    var infoX = UI.infoX, infoY = UI.infoY, infoW = UI.infoW;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (state.selectedTower) {
      var t = state.selectedTower;
      var stats = towerStats(t);
      ctx.fillStyle = t.def.color;
      ctx.font = "bold 13px Fredoka, sans-serif";
      var nm = (t.def.shortName || t.def.name);
      ctx.fillText(nm, infoX, infoY + 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px Fredoka, sans-serif";
      ctx.fillText("Nivel " + (t.level + 1) + "/3", infoX, infoY + 18);

      ctx.font = "11px Fredoka, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText("Dmg " + stats.damage + (stats.splash > 0 ? " AOE" : ""), infoX, infoY + 36);
      ctx.fillText("Rango " + stats.range, infoX, infoY + 50);
      ctx.fillText("Cad. " + stats.fireRate.toFixed(1) + "/s", infoX, infoY + 64);

      // X deseleccionar (esquina sup-der de la zona info).
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      roundRect(UI.deselectBtn.x, UI.deselectBtn.y, UI.deselectBtn.w, UI.deselectBtn.h, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 13px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✕", UI.deselectBtn.x + UI.deselectBtn.w / 2, UI.deselectBtn.y + UI.deselectBtn.h / 2 + 1);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      var sellRefund = Math.floor(t.def.cost * 0.6);
      for (var li = 0; li < t.level; li++) sellRefund += Math.floor(t.def.upgradeCost[li] * 0.5);
      drawButton(UI.sellBtn, "Vender +" + sellRefund, "#7a3a3a", "#552020", true);

      if (t.level < 2) {
        var ucost = t.def.upgradeCost[t.level];
        var canUp = state.atp >= ucost;
        drawButton(UI.upgradeBtn,
          "Mejorar ⚡" + ucost,
          canUp ? "#1f8a4c" : "#3a2530",
          canUp ? "#16632f" : "#22141c",
          canUp);
      } else {
        drawButton(UI.upgradeBtn, "Nivel máx.", "#5a4250", "#3a2530", false);
      }
    } else if (state.selectedToBuild) {
      var def2 = TOWER_DEFS[state.selectedToBuild];
      ctx.fillStyle = def2.color;
      ctx.font = "bold 12px Fredoka, sans-serif";
      ctx.fillText((def2.shortName || def2.name), infoX, infoY + 2);
      ctx.font = "11px Fredoka, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("Toca el campo", infoX, infoY + 20);
      ctx.fillText("para colocar", infoX, infoY + 34);
      ctx.fillStyle = "#f5d76e";
      ctx.font = "bold 12px Fredoka, sans-serif";
      ctx.fillText("⚡ " + def2.cost, infoX, infoY + 52);
    }
  }

  function drawGhost() {
    if (!state.selectedToBuild || !state.pointer.isOver) return;
    var x = state.pointer.x, y = state.pointer.y;
    if (y < FIELD_TOP || y >= FIELD_BOTTOM || x >= FIELD_RIGHT) return;
    var def = TOWER_DEFS[state.selectedToBuild];
    var stats = def.levels[0];
    var ok = canPlaceTowerAt(x, y) && state.atp >= def.cost;
    // Range circle (white dotted on tinted disc)
    ctx.save();
    ctx.fillStyle = ok ? "rgba(255, 255, 255, 0.18)" : "rgba(220, 70, 70, 0.20)";
    ctx.beginPath();
    ctx.arc(x, y, stats.range * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ok ? "rgba(255, 255, 255, 0.85)" : "rgba(220, 70, 70, 0.85)";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7 * U, 6 * U]);
    ctx.beginPath();
    ctx.arc(x, y, stats.range * U, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // Ghost sprite
    ctx.save();
    ctx.globalAlpha = ok ? 0.85 : 0.55;
    var fakeTower = { x: x, y: y, def: def, level: 0, idlePhase: 0, attackAnim: 0, muzzleFlash: 0 };
    if (def.id === "neutrofilo") drawNeutrofilo(fakeTower, 1, "idle", false);
    else if (def.id === "linfocitoB") drawLinfocitoB(fakeTower, 1, "idle", false);
    else if (def.id === "linfocitoT") drawLinfocitoT(fakeTower, 1, "idle", false);
    else if (def.id === "langerhans") drawLangerhans(fakeTower, 1, "idle", false);
    else if (def.id === "nk") drawNK(fakeTower, 1, "idle", false);
    else if (def.id === "eosinofilo") drawEosinofilo(fakeTower, 1, "idle", false);
    else if (def.id === "mastocito") drawMastocito(fakeTower, 1, "idle", false);
    else if (def.id === "plaqueta") drawPlaqueta(fakeTower, 1, "idle", false);
    else if (def.id === "complemento") drawComplementCannon(fakeTower, 1, "idle", false);
    else drawLinfocitoT(fakeTower, 1, "idle", false);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawWaveBanner() {
    if (state.waveBannerTimer <= 0 || !state.waveBannerText) return;
    // Entra desde la izquierda, se DETIENE un momento en el centro, y sale por
    // la derecha. Chico y en la zona superior, sin oscurecer el campo.
    var dur = 2.2;
    var p = 1 - Math.max(0, Math.min(1, state.waveBannerTimer / dur)); // 0->1
    ctx.save();
    var fs = Math.min(VW * 0.055, 24);
    ctx.font = "700 " + fs + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var tw = ctx.measureText(state.waveBannerText).width;
    var center = VW / 2, offL = -tw / 2 - 20, offR = VW + tw / 2 + 20;
    var cx;
    if (p < 0.28) {                       // entra (desacelera al centro)
      var k = p / 0.28; k = 1 - (1 - k) * (1 - k);
      cx = offL + (center - offL) * k;
    } else if (p < 0.62) {                // PAUSA en el centro
      cx = center;
    } else {                              // sale (acelera a la derecha)
      var k2 = (p - 0.62) / 0.38; k2 = k2 * k2;
      cx = center + (offR - center) * k2;
    }
    var by = FIELD_TOP + (FIELD_BOTTOM - FIELD_TOP) * 0.18;
    var alpha = Math.max(0, Math.min(1, Math.min(p / 0.1, (1 - p) / 0.1)));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillText(state.waveBannerText, cx + 1, by + 1);
    ctx.fillStyle = "#fffcf0";
    ctx.fillText(state.waveBannerText, cx, by);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawMessage() {
    if (state.msgTimer > 0 && state.msg) {
      var alpha = Math.min(1, state.msgTimer / 0.4);
      ctx.font = "bold 16px Fredoka, sans-serif";
      var w = ctx.measureText(state.msg).width + 32;
      var x = VW / 2 - w / 2;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.globalAlpha = alpha * 0.6;
      roundRect(x, FIELD_TOP + 12, w, 36, 0);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(state.msg, VW / 2, FIELD_TOP + 30);
      ctx.globalAlpha = 1;
    }
  }

  function drawConfirmModal() {
    if (!state.confirmRestart) return;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "#2a1a22";
    roundRect(UI.modal.x, UI.modal.y, UI.modal.w, UI.modal.h, 0);
    ctx.fill();
    ctx.strokeStyle = "#5a3540";
    ctx.lineWidth = 2;
    roundRect(UI.modal.x, UI.modal.y, UI.modal.w, UI.modal.h, 0);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("¿Reiniciar partida?", UI.modal.x + UI.modal.w / 2, UI.modal.y + 44);
    ctx.font = "13px Fredoka, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Perderas el progreso actual.", UI.modal.x + UI.modal.w / 2, UI.modal.y + 80);
    drawButton(UI.modalYes, "Si, reiniciar", "#7a3a3a", "#552020", true);
    drawButton(UI.modalNo, "Cancelar", "#1f8a4c", "#16632f", true);
  }

  function drawLevelTransition() {
    if (!state.levelTransition) return;
    var t = Math.min(1, state.transitionTimer / 0.4);
    ctx.save();
    ctx.fillStyle = "rgba(40, 20, 20, " + (0.92 * t) + ")";
    ctx.fillRect(0, 0, VW, VH);
    // Subtle red particles falling (decorative)
    for (var i = 0; i < 24; i++) {
      var px = ((state.time * 6 + i * 41) % VW + VW) % VW;
      var py = ((state.time * 22 + i * 73) % VH + VH) % VH;
      ctx.fillStyle = "rgba(192, 57, 43, " + (0.10 + 0.10 * Math.sin(state.time + i)) + ")";
      ctx.beginPath();
      ctx.arc(px, py, 1.5 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = t;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var titleFs = Math.min(VW * 0.085, VH * 0.075, 36);
    ctx.font = '600 ' + titleFs + 'px Fredoka, sans-serif';
    ctx.fillStyle = "#C0392B";
    var title = state.finalScreen ? "FIN DE LA SIMULACIÓN" : "INFECCIÓN ESTABLECIDA";
    ctx.fillText(title, VW / 2, VH * 0.28);

    var subFs = Math.max(13, Math.min(18, titleFs * 0.45));
    ctx.font = 'italic ' + subFs + 'px Fredoka, sans-serif';
    ctx.fillStyle = "rgba(255, 235, 230, 0.85)";
    var sub = state.finalScreen
      ? "Has alcanzado el último nivel."
      : "Avanzando a Nivel " + (state.currentLevel + 1);
    ctx.fillText(sub, VW / 2, VH * 0.28 + titleFs * 0.95);

    var sx = VW / 2;
    var sy = VH * 0.28 + titleFs * 1.6;
    ctx.font = 'bold 15px Fredoka, sans-serif';
    ctx.fillStyle = "#f5e7e7";
    var stats = state.finalScreen ? [
      "Niveles superados: " + state.currentLevel + " / " + MAX_LEVEL,
      "Patogenos eliminados (total): " + META.totalPathogensDefeated,
      "Patogenos infiltrados (total): " + META.totalPathogensInfiltrated,
      "Mejor nivel alcanzado: " + META.highestLevelReached
    ] : [
      "Nivel: " + state.currentLevel + " / " + MAX_LEVEL,
      "Patogenos eliminados: " + state.pathogensDefeated,
      "Patogenos infiltrados: " + state.pathogensReached,
      "ATP no usado: " + state.atp
    ];
    var lineH = 22;
    for (var si = 0; si < stats.length; si++) {
      ctx.fillText(stats[si], sx, sy + si * lineH);
    }

    // Continue button
    var btnW = 240, btnH = 50;
    var btn = { x: VW / 2 - btnW / 2, y: sy + stats.length * lineH + 24, w: btnW, h: btnH };
    UI.transitionBtn = btn;
    ctx.fillStyle = state.finalScreen ? "#2C3E50" : "#1f8a4c";
    roundRect(btn.x, btn.y, btn.w, btn.h, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1.5;
    roundRect(btn.x, btn.y, btn.w, btn.h, 0);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = 'bold 16px Fredoka, sans-serif';
    ctx.fillText(
      state.finalScreen ? "Reiniciar simulación" : "Continuar al Nivel " + (state.currentLevel + 1),
      btn.x + btn.w / 2, btn.y + btn.h / 2
    );
    ctx.restore();
  }

  // -------- TOOLTIP EDUCATIVO (Sprint 6) ------------------------------
  function drawTooltip() {
    var tt = state.activeTooltip;
    if (!tt) { UI.tooltipCard = null; UI.tooltipBtn = null; return; }
    var def = ENEMY_DEFS[tt.defId];
    if (!def) { state.activeTooltip = null; return; }
    // Sprint 8A: lateral right-side sticky note. No backdrop, no button.
    // Ficha MUY compacta: nombre + 1 oración corta, chica, que no estorbe.
    var W = Math.min(180, VW - 24);
    var previewSize = 17 * U;
    var rawDesc = (def.tooltip || "");
    var shortDesc = rawDesc.split(/\.\s/)[0] || "";
    if (shortDesc && !/[.…!?]$/.test(shortDesc)) shortDesc += ".";
    // Nombre en 1-2 líneas (género / especie) para que no se apriete ni desborde.
    var ttNameLines = wrapText(def.name, W - 26, 13).slice(0, 2);
    // Descripción: hasta 3 líneas (la tarjeta crece); si sobra, recorta con "…".
    var ttDescLines = wrapText(shortDesc, W - 26, 10);
    if (ttDescLines.length > 3) {
      ttDescLines = ttDescLines.slice(0, 3);
      ttDescLines[2] = ttDescLines[2].replace(/\s*\S*$/, "") + "…";
    }
    // Filas de altura fija -> distribución pareja y alto exacto.
    var ttPad = 11;
    var ttRows = [];
    if (tt.isFirst) ttRows.push("header");
    ttRows.push("sprite");
    for (var ni = 0; ni < ttNameLines.length; ni++) ttRows.push("name" + ni);
    ttRows.push("sep", "shield");
    for (var di = 0; di < ttDescLines.length; di++) ttRows.push("desc" + di);
    function ttRowH(r) {
      if (r === "header") return 16;
      if (r === "sprite") return previewSize * 2 + 8;
      if (r.indexOf("name") === 0) return 16;
      if (r === "sep") return 11;
      if (r === "shield") return 17;
      return 14;  // desc
    }
    var H = ttPad * 2;
    for (var rh0 = 0; rh0 < ttRows.length; rh0++) H += ttRowH(ttRows[rh0]);
    H = Math.min(H, FIELD_BOTTOM - FIELD_TOP - 24);
    var marginRight = 8;
    var anchorX = VW - marginRight - W;
    var anchorY = FIELD_TOP + (FIELD_BOTTOM - FIELD_TOP) / 2 - H / 2;
    // Slide animation: enter from right (0->1 over 0.3s easeOut),
    // exit slide right + fade (closeProgress 0->1 over 0.4s).
    var enterT = Math.min(1, tt.elapsed / 0.30);
    var enterEase = 1 - Math.pow(1 - enterT, 3); // easeOutCubic
    var exitT = tt.closing ? Math.min(1, tt.closeProgress) : 0;
    var slideOffset = (1 - enterEase) * (W + marginRight + 20)
                    + exitT * (W + marginRight + 20);
    var x = anchorX + slideOffset;
    var y = anchorY;
    var alpha = tt.closing ? Math.max(0, 1 - exitT) : enterEase;
    if (alpha <= 0.01) { UI.tooltipCard = null; return; }
    UI.tooltipCard = { x: x, y: y, w: W, h: H };
    UI.tooltipBtn = null;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Tarjeta plana estilo overlay: fondo oscuro semitransparente, sin borde
    // ni sombra. Antes era cream + borde negro grueso + sombra → "bocadillo".
    ctx.fillStyle = "rgba(15, 12, 18, 0.92)";
    ctx.fillRect(x, y, W, H);
    // Dibujo por filas: cada fila centrada en su franja (baseline middle).
    var cyc = y + ttPad;
    for (var r2 = 0; r2 < ttRows.length; r2++) {
      var r = ttRows[r2], rh = ttRowH(r), midY = cyc + rh / 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (r === "header") {
        ctx.font = "bold 8px Fredoka, sans-serif";
        ctx.fillStyle = "#6BB4FF";
        ctx.fillText("🔬 NUEVO PATÓGENO", x + W / 2, midY);
      } else if (r === "sprite") {
        drawTooltipSprite(def, x + W / 2, midY, previewSize);
      } else if (r.indexOf("name") === 0) {
        var nidx = parseInt(r.slice(4), 10);
        var line = ttNameLines[nidx], fns = 13;
        ctx.font = "italic bold " + fns + "px Fredoka, sans-serif";
        while (fns > 9 && ctx.measureText(line).width > W - 18) {
          fns--; ctx.font = "italic bold " + fns + "px Fredoka, sans-serif";
        }
        ctx.fillStyle = "#FF8080";
        ctx.fillText(line, x + W / 2, midY);
      } else if (r === "sep") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 16, midY); ctx.lineTo(x + W - 16, midY); ctx.stroke();
      } else if (r === "shield") {
        var sl, sc;
        if (def.shield) {
          if (def.shield.type === "capsula") { sl = "🟡 Cápsula ·" + def.shield.maxHP; sc = "#FFD380"; }
          else if (def.shield.type === "spike") { sl = "🔵 Spike ·" + def.shield.maxHP; sc = "#9FC8F0"; }
          else { sl = "🟢 Pared ·" + def.shield.maxHP; sc = "#B5E090"; }
          ctx.font = "bold 11px Fredoka, sans-serif"; ctx.fillStyle = sc;
        } else {
          sl = "Sin escudo"; ctx.font = "italic 11px Fredoka, sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        }
        ctx.fillText(sl, x + W / 2, midY);
      } else {
        var idx = parseInt(r.slice(4), 10);
        ctx.font = "10px Fredoka, sans-serif"; ctx.fillStyle = "rgba(240, 235, 230, 0.92)";
        ctx.fillText(ttDescLines[idx], x + W / 2, midY);
      }
      cyc += rh;
    }
    ctx.restore();
  }

  function wrapText(text, maxWidth, fontSize) {
    var words = text.split(" ");
    var lines = [];
    var curr = "";
    ctx.font = fontSize + "px Fredoka, sans-serif";
    for (var w = 0; w < words.length; w++) {
      var test = curr ? curr + " " + words[w] : words[w];
      if (ctx.measureText(test).width <= maxWidth) curr = test;
      else { if (curr) lines.push(curr); curr = words[w]; }
    }
    if (curr) lines.push(curr);
    return lines;
  }

  function drawTooltipSprite(def, cx, cy, R) {
    // Lightweight preview using existing sprite renderers.
    var fakeEnemy = {
      def: def,
      x: cx, y: cy,
      wobble: 0,
      hitFlash: 0,
      hurtTimer: 0,
      enraged: false,
      sporeTimer: 0,
      blinkTimer: 0,
      shieldHP: def.shield ? def.shield.maxHP : 0,
      shieldHitTimer: 0,
      shieldShatterTimer: 0
    };
    ctx.save();
    // Clip al cuadrado de la fila del preview para que decoraciones (flagelos,
    // protrusiones, escudos extendidos) no salgan del marco del tooltip.
    var clipR = R * 1.8;
    ctx.beginPath();
    ctx.rect(cx - clipR, cy - clipR, clipR * 2, clipR * 2);
    ctx.clip();
    var kind = def.baseKind || def.id;
    if (def.id === "dermatofito") drawDermatofito(fakeEnemy, R, "idle", false);
    else if (def.id === "sarna") drawSarna(fakeEnemy, R, "idle", false);
    else if (def.id === "hpv") drawHPV(fakeEnemy, R, "idle", false);
    else if (def.id === "molluscum") drawMolluscum(fakeEnemy, R, "idle", false);
    else if (def.id === "malassezia") drawMalassezia(fakeEnemy, R, "idle", false);
    else if (kind === "bacteria") drawBacteria(fakeEnemy, R, "idle", false);
    else if (kind === "virus") drawVirus(fakeEnemy, R, "idle", false);
    else if (kind === "hongo") drawHongo(fakeEnemy, R, "idle", false);
    else drawBoss(fakeEnemy, R, "idle", false);
    if (def.shield) drawShield(fakeEnemy, R);
    ctx.restore();
  }

  // -------- MRSA INTRO BANNER (Sprint 6) ------------------------------
  function drawMrsaIntro() {
    var mi = state.mrsaIntro;
    if (!mi) return;
    var t = mi.t / mi.duration;
    var alpha;
    if (t < 0.2) alpha = t / 0.2;
    else if (t > 0.85) alpha = (1 - t) / 0.15;
    else alpha = 1;
    alpha = Math.max(0, Math.min(1, alpha));
    var slideY = (1 - Math.min(1, mi.t / 0.4)) * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    var bw = VW * 0.6;
    var bh = 110;
    var bx = (VW - bw) / 2;
    var by = VH * 0.35 - bh / 2 + slideY;
    var grad = ctx.createLinearGradient(bx, by, bx + bw, by);
    grad.addColorStop(0, "#1A0000");
    grad.addColorStop(0.5, "#4A0000");
    grad.addColorStop(1, "#1A0000");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw, bh);
    // Glow border
    ctx.shadowColor = "rgba(231, 76, 60, 0.85)";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "#E74C3C";
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(231, 76, 60, 0.6)";
    ctx.font = "600 38px Fredoka, sans-serif";
    ctx.fillText("MRSA", bx + bw / 2 + 1, by + 28 + 1);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("MRSA", bx + bw / 2, by + 28);
    ctx.font = "italic 14px Fredoka, sans-serif";
    ctx.fillStyle = "#FFCDD2";
    ctx.fillText("Staphylococcus aureus resistente a meticilina", bx + bw / 2, by + 60);
    ctx.font = "11px Fredoka, sans-serif";
    ctx.fillStyle = "#F0E68C";
    ctx.fillText("Multi-resistente. Arsenal completo requerido.", bx + bw / 2, by + 84);
    ctx.restore();
  }

  // -------- COMIC INTRO SCREEN ----------------------------------------
  // -------- INTRO CÓMIC ANIMADA (imágenes + Ken Burns) ------------------
  var INTRO_DUR = [4.2, 5.2, 3.8, 3.6, 4.6];   // duración (s) por escena
  var INTRO_CAPTIONS = [
    "Jugando en el parque, Tomás se raspó la rodilla.",
    "El doctor la limpió con antiséptico, le dio antibióticos y la cubrió.",
    "Pero la curiosidad pudo más... y volvió a abrir la herida.",
    "Se asomó muy de cerca... y el mundo se volvió enorme.",
    "Allí dentro, en lo microscópico, la invasión ya comenzó."
  ];
  // Zoom inicial/final por escena (deriva lenta; buceo fuerte en la última).
  var INTRO_Z0 = [1.04, 1.03, 1.05, 1.06, 1.00];
  var INTRO_Z1 = [1.11, 1.08, 1.14, 1.26, 1.55];
  var INTRO_SRC = [
    "assets/intro/intro1.jpg", "assets/intro/intro2.jpg", "assets/intro/intro3.jpg",
    "assets/intro/intro4.jpg", "assets/intro/intro5.jpg"
  ];
  var introImgs = INTRO_SRC.map(function (s) { var im = new Image(); im.src = s; return im; });

  function introAdvance() {
    state.introScene = (state.introScene || 0) + 1;
    state.introT = 0;
    if (state.introScene >= INTRO_DUR.length) { state.showIntro = false; }
  }
  function updateIntroComic(dt) {
    if (!state.showIntro) return;
    state.introT = (state.introT || 0) + dt;
    if (state.introT >= INTRO_DUR[state.introScene || 0]) introAdvance();
  }

  // Dibuja la imagen cubriendo todo el viewport (cover), con zoom y deriva.
  function introCover(img, zoom, oy) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(VW / iw, VH / ih) * zoom;
    var w = iw * s, h = ih * s;
    ctx.drawImage(img, (VW - w) / 2, (VH - h) / 2 + (oy || 0), w, h);
    return true;
  }
  function introEase(x) { x = x < 0 ? 0 : (x > 1 ? 1 : x); return x * x * (3 - 2 * x); }
  var INTRO_TR = 0.85;                          // duración de la transición (s)
  var INTRO_PRE = [0, 0.06, 0.07, 0.13, 0.18];  // pre-zoom de la escena entrante
  var INTRO_POUT = [0, 0.05, 0.06, 0.11, 0.16]; // empuje de la escena saliente

  function drawIntroScreen() {
    if (!state.showIntro || state.showTitle) return;
    var sc = state.introScene || 0;
    var t = state.introT || 0;
    var dur = INTRO_DUR[sc];
    var p = Math.min(1, t / dur);
    var last = INTRO_DUR.length - 1;
    ctx.save();
    ctx.fillStyle = "#140a0a"; ctx.fillRect(0, 0, VW, VH);
    var ke = introEase(p);                       // Ken Burns con curva
    var zoom = INTRO_Z0[sc] + (INTRO_Z1[sc] - INTRO_Z0[sc]) * ke;
    var oy = -ke * VH * 0.03;
    var fin = Math.min(1, t / INTRO_TR);
    // Transición de inmersión: la escena saliente sigue cayendo (escala hacia
    // adelante) por debajo; la entrante empieza pre-acercada y se asienta.
    if (sc > 0 && t < INTRO_TR) {
      var te = introEase(t / INTRO_TR);
      introCover(introImgs[sc - 1], INTRO_Z1[sc - 1] * (1 + INTRO_POUT[sc] * te), -VH * 0.03);
      ctx.globalAlpha = te;
      introCover(introImgs[sc], zoom + INTRO_PRE[sc] * (1 - te), oy);
      ctx.globalAlpha = 1;
    } else {
      introCover(introImgs[sc], zoom, oy);
    }

    // "¡AY!" cómic en la escena del parque.
    if (sc === 0 && p > 0.12) {
      var pop = Math.min(1, (p - 0.12) / 0.16);
      ctx.save();
      ctx.translate(VW * 0.72, VH * 0.16);
      ctx.rotate(-0.12);
      var k = 0.6 + pop * 0.4; ctx.scale(k, k);
      ctx.font = "900 " + Math.round(VW * 0.14) + "px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(3, VW * 0.012); ctx.lineJoin = "round";
      ctx.strokeStyle = "#fff"; ctx.strokeText("¡AY!", 0, 0);
      ctx.fillStyle = "#d61f1f"; ctx.fillText("¡AY!", 0, 0);
      ctx.restore();
    }

    // Subtítulo estilo barra de subtítulos de video: fondo oscuro
    // semitransparente, texto blanco, sin borde. Antes tenía fondo cream con
    // borde oscuro grueso (estilo comic) y se leía como "bocadillo".
    var capA = fin * (sc === last ? Math.max(0, 1 - (p - 0.45) / 0.2) : 1);
    if (capA > 0.01) {
      ctx.globalAlpha = capA;
      var boxH = 70, boxY = VH - boxH - 14, boxX = 16, boxW = VW - 32;
      ctx.fillStyle = "rgba(15, 12, 18, 0.78)";
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = "#ffffff"; ctx.font = "15px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var capLines = wrapText(INTRO_CAPTIONS[sc], boxW - 28, 15);
      var lineH = 19;
      var totalH = capLines.length * lineH;
      var startY = boxY + (boxH - totalH) / 2 + lineH / 2;
      for (var ci = 0; ci < capLines.length; ci++) {
        ctx.fillText(capLines[ci], VW / 2, startY + ci * lineH);
      }
      ctx.globalAlpha = 1;
    }

    // Puntos de progreso (rectángulo sólido para que se lea limpio).
    var nd = INTRO_DUR.length, dx0 = VW / 2 - (nd - 1) * 6;
    ctx.fillStyle = "rgba(20,15,18,0.85)";
    roundRect(dx0 - 12, 12, (nd - 1) * 12 + 24, 16, 4); ctx.fill();
    for (var s2 = 0; s2 < nd; s2++) {
      ctx.fillStyle = s2 === sc ? "#ffffff" : "rgba(255,255,255,0.45)";
      ctx.beginPath(); ctx.arc(dx0 + s2 * 12, 20, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Botón "Saltar" — rectángulo sólido, esquinas suaves, texto centrado.
    var sw = 86, sh = 30, sx = VW - sw - 12, sy = 12;
    UI.introSkip = { x: sx, y: sy, w: sw, h: sh };
    ctx.fillStyle = "#1a1a22"; roundRect(sx, sy, sw, sh, 0); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.40)"; ctx.lineWidth = 1.5;
    roundRect(sx, sy, sw, sh, 0); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Fredoka, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Saltar", sx + sw / 2, sy + sh / 2);
    UI.introBtn = null;

    // Cierre del buceo: oscurecer al final de la última escena -> juego.
    if (sc === last && p > 0.82) {
      ctx.globalAlpha = (p - 0.82) / 0.18;
      ctx.fillStyle = "#1a0606"; ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // -------- PANTALLA DE TÍTULO -----------------------------------------
  function drawTitleScreen() {
    if (!state.showTitle) return;
    var tt = state.time, cx = VW / 2;
    ctx.save();
    ctx.fillStyle = "#140a0a"; ctx.fillRect(0, 0, VW, VH);
    // Fondo: mundo microscópico con deriva lenta (Ken Burns).
    var bgZoom = 1.10 + Math.sin(tt * 0.25) * 0.02;
    if (!introCover(introImgs[4], bgZoom, Math.sin(tt * 0.2) * VH * 0.012)) {
      var bg = ctx.createLinearGradient(0, 0, 0, VH);
      bg.addColorStop(0, "#3a0d0d"); bg.addColorStop(1, "#1a0606");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
    }
    // Oscurecido para legibilidad (más fuerte arriba y abajo).
    var ov = ctx.createLinearGradient(0, 0, 0, VH);
    ov.addColorStop(0, "rgba(8,3,3,0.80)");
    ov.addColorStop(0.42, "rgba(8,3,3,0.28)");
    ov.addColorStop(0.72, "rgba(8,3,3,0.45)");
    ov.addColorStop(1, "rgba(8,3,3,0.90)");
    ctx.fillStyle = ov; ctx.fillRect(0, 0, VW, VH);

    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";

    // --- Título estilo "presentación Capcom": slam-in + destello + glint ---
    var titleY = VH * 0.32, maxW = VW * 0.88, fs = VW * 0.185;
    ctx.font = "900 " + fs + "px Fredoka, sans-serif";
    while (ctx.measureText("ImmunoDefense").width > maxW && fs > 12) {
      fs -= 1; ctx.font = "900 " + fs + "px Fredoka, sans-serif";
    }
    var tw = ctx.measureText("ImmunoDefense").width;
    var rev = Math.min(1, tt / 0.5);                 // progreso de entrada
    var ease = 1 - Math.pow(1 - rev, 3);             // easeOutCubic
    var slam = 2.7 - 1.7 * ease;                     // escala 2.7 -> 1.0 (golpe)
    ctx.save();
    ctx.globalAlpha = Math.min(1, tt / 0.18);
    ctx.translate(cx, titleY);
    ctx.scale(slam, slam);
    ctx.save();
    ctx.shadowColor = "rgba(214,31,31,0.95)"; ctx.shadowBlur = 30;
    ctx.fillStyle = "#fff"; ctx.fillText("ImmunoDefense", 0, 0);
    ctx.restore();
    ctx.lineWidth = Math.max(3, VW * 0.011) / slam; ctx.strokeStyle = "#3a0a0a";
    ctx.strokeText("ImmunoDefense", 0, 0);
    var tg = ctx.createLinearGradient(0, -fs * 0.55, 0, fs * 0.55);
    tg.addColorStop(0, "#ffffff"); tg.addColorStop(0.5, "#fbe6e0"); tg.addColorStop(1, "#d7aea6");
    ctx.fillStyle = tg; ctx.fillText("ImmunoDefense", 0, 0);
    ctx.restore();

    // Destello blanco al impactar.
    var impT = tt - 0.5;
    if (impT >= 0 && impT < 0.26) {
      ctx.globalAlpha = (1 - impT / 0.26) * 0.45;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = 1;
    }

    // Barrido de brillo (glint) que recorre las letras, ya asentado el título.
    if (rev >= 1) {
      var period = 3.2, ph = ((tt - 0.5) % period) / period;
      if (ph < 0.28) {
        var sp = ph / 0.28;                          // 0..1 a lo ancho
        var bandX = cx - tw * 0.62 + sp * (tw * 1.24);
        var band = Math.max(10, tw * 0.09);
        var grad = ctx.createLinearGradient(bandX - band, titleY - fs * 0.6, bandX + band, titleY + fs * 0.6);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.95)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillText("ImmunoDefense", cx, titleY);
      }
    }

    // Lema (aparece tras el impacto).
    ctx.globalAlpha = Math.min(1, Math.max(0, (tt - 0.55) / 0.5));
    ctx.font = "italic " + Math.round(VW * 0.040) + "px Fredoka, sans-serif";
    ctx.fillStyle = "rgba(255,235,225,0.92)";
    ctx.fillText("Tu cuerpo es el campo de batalla", cx, VH * 0.44);
    ctx.globalAlpha = 1;

    // Botón INICIAR — rectángulo plano sólido, sin esquinas redondeadas ni
    // outline (era lo que le daba aspecto de cápsula/badge).
    var bw = Math.min(VW * 0.62, 270), bh = 56, by = VH * 0.72, bx = cx - bw / 2;
    UI.startBtn = { x: bx, y: by, w: bw, h: bh };
    ctx.fillStyle = "#d61f1f"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#fff"; ctx.font = "900 " + Math.round(bh * 0.40) + "px Fredoka, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("INICIAR", cx, by + bh / 2 + 1);

    // Pista parpadeante.
    ctx.globalAlpha = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(tt * 2.2));
    ctx.fillStyle = "#fff"; ctx.font = Math.round(VW * 0.032) + "px Fredoka, sans-serif";
    ctx.fillText("o toca en cualquier lugar para empezar", cx, by + bh + VH * 0.05);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // -------- CINEMATIC ENDING (infestacion >= 100) ---------------------
  function updateCinematic(dt) {
    var ce = state.cinematicEnd;
    if (!ce) return;
    ce.t += dt;
    if (ce.t >= 7.0 && !ce.buttonShown) ce.buttonShown = true;
  }

  // Sprint 8B-Polish-2: per-letter melt drips + blood pool.
  // Cache deterministic per-letter metadata so the irregular shapes don't
  // jitter every frame.
  // Map keyed by text so each line caches its own deterministic drip metadata.
  var TERROR_DRIPS = {};
  function ensureTerrorDrips(text, capMaxLen) {
    if (TERROR_DRIPS[text]) return TERROR_DRIPS[text];
    var letters = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === " ") { letters.push(null); continue; }
      var max = 40 + Math.random() * 50;          // 40-90px
      if (capMaxLen) max = Math.min(max, capMaxLen);
      letters.push({
        maxLen: max,
        growTime: 1.5 + Math.random() * 1.0,       // 1.5-2.5s
        startDelay: 0.5 + Math.random() * 0.4,
        jitter1: Math.random() * 4 + 1,
        jitter2: Math.random() * 3 + 0.5,
        fallDrops: [
          { delay: 1.8 + Math.random() * 1.5, speed: 90 + Math.random() * 50 },
          { delay: 3.4 + Math.random() * 1.5, speed: 90 + Math.random() * 50 },
          { delay: 5.0 + Math.random() * 2.0, speed: 90 + Math.random() * 50 }
        ]
      });
    }
    TERROR_DRIPS[text] = { text: text, letters: letters };
    return TERROR_DRIPS[text];
  }

  // Sprint 8B-Polish-3A: organic teardrop drip per spec.
  // Form: starts at letter base full width -> narrows irregularly via beziers
  // -> ends in a ROUND BALL (radius 4-7px), not a point.
  function drawMeltDrip(letterCx, letterBaseY, letterW, len, jitter1, jitter2) {
    if (len <= 1) return;
    var halfW = letterW * 0.5;
    var topY = letterBaseY;
    var midY = topY + len * 0.55;
    var dropR = 4 + (jitter1 % 3.5);   // 4-7.5px
    var dropY = topY + len - dropR;
    // Path: top edge -> right side curving in -> ball arc -> left side back up
    ctx.beginPath();
    ctx.moveTo(letterCx - halfW, topY);
    ctx.lineTo(letterCx + halfW, topY);
    // Right wall curving inward toward the ball
    ctx.bezierCurveTo(
      letterCx + halfW - jitter1, midY,
      letterCx + dropR + jitter2, dropY - 5,
      letterCx + dropR, dropY
    );
    // Round ball at the bottom (lower hemisphere, 0..PI sweeps left)
    ctx.arc(letterCx, dropY, dropR, 0, Math.PI);
    // Left wall back up to the letter base
    ctx.bezierCurveTo(
      letterCx - dropR - jitter2, dropY - 5,
      letterCx - halfW + jitter1, midY,
      letterCx - halfW, topY
    );
    ctx.closePath();
    var grd = ctx.createLinearGradient(letterCx, topY, letterCx, dropY + dropR);
    grd.addColorStop(0, "#5A0000");
    grd.addColorStop(0.55, "#8B0000");
    grd.addColorStop(1, "#DC143C");
    ctx.fillStyle = grd;
    ctx.fill();
    // Subtle white highlight on the left side for 3D feel.
    ctx.save();
    ctx.clip();
    var hi = ctx.createLinearGradient(letterCx - halfW, 0, letterCx, 0);
    hi.addColorStop(0, "rgba(255, 255, 255, 0.20)");
    hi.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = hi;
    ctx.fillRect(letterCx - halfW, topY, halfW, len);
    ctx.restore();
  }

  // Renders one line's drips + optional pool. Assumes ctx is set to
  // textAlign="left" (caller's job), so measureText returns the actual width.
  // Returns the bottom-most drip y reached, plus pool bounds, so the caller
  // can stack lines.
  function drawTitleDrips(text, cx, baseY, fs, ceT, capMaxLen) {
    var drips = ensureTerrorDrips(text, capMaxLen);
    var totalW = ctx.measureText(text).width;
    var leftEdge = cx - totalW / 2;
    var cursorX = leftEdge;
    var maxBottomY = baseY;
    var minPoolX = Infinity, maxPoolX = -Infinity;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var lw = ctx.measureText(ch).width;
      if (ch !== " ") {
        var meta = drips.letters[i];
        if (meta) {
          var t01 = Math.max(0, Math.min(1, (ceT - meta.startDelay) / meta.growTime));
          var ease = 1 - Math.pow(1 - t01, 3);
          var len = meta.maxLen * ease;
          if (len > 1) {
            drawMeltDrip(cursorX + lw / 2, baseY, lw * 0.80, len, meta.jitter1, meta.jitter2);
            minPoolX = Math.min(minPoolX, cursorX + lw * 0.05);
            maxPoolX = Math.max(maxPoolX, cursorX + lw * 0.95);
            maxBottomY = Math.max(maxBottomY, baseY + len);
            // Gota redonda colgando de la punta del chorro (cuando ya creció).
            if (t01 > 0.85) {
              var bob = Math.sin(ceT * 3 + meta.jitter1 * 6) * 2;
              ctx.fillStyle = "#7a0000";
              ctx.beginPath();
              ctx.ellipse(cursorX + lw / 2, baseY + len + 2, 3.2, 4.4 + bob * 0.3, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      cursorX += lw;
    }
    return { maxBottomY: maxBottomY, minX: minPoolX, maxX: maxPoolX };
  }

  function drawBloodPool(minX, maxX, topY, ceT) {
    if (maxX <= minX) return;
    var pY = topY + 6;
    var pW = maxX - minX;
    ctx.save();
    var poolGrad = ctx.createLinearGradient(0, pY, 0, pY + 18);
    poolGrad.addColorStop(0, "#5A0000");
    poolGrad.addColorStop(1, "#2A0000");
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.moveTo(minX, pY + 8);
    var step = Math.max(18, pW / 14);
    var prevX = minX, prevY = pY + 8;
    for (var seg = 1; seg * step <= pW + step; seg++) {
      var nx = minX + Math.min(seg * step, pW);
      var ph = (nx - minX) * 0.04 + ceT * 1.2;
      var ny = pY + Math.sin(ph) * 4 + Math.sin(ph * 0.6 + 1.2) * 2.5;
      var cpX = (prevX + nx) / 2;
      var cpY = (prevY + ny) / 2 - 3;
      ctx.quadraticCurveTo(cpX, cpY, nx, ny);
      prevX = nx; prevY = ny;
    }
    ctx.lineTo(maxX, pY + 18);
    ctx.lineTo(minX, pY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Sprint 8B-Polish-3B: two-line horror title with drips per line.
  // Strict pattern: ONE save/restore. ONE strokeText + ONE fillText per line
  // with textAlign="center" and matching cx,cy. Then textAlign="left" SOLO
  // para medir letras; loop solo dibuja paths de chorros, nunca re-dibuja
  // las líneas. Charco al final debajo de la última línea.
  function drawTerrorTitleTwoLines(line1, line2, cx, cyCenter, time) {
    var padding = 24;
    var maxW = VW - padding * 2;
    var fontStack = "'Impact', 'Arial Black', 'Helvetica Neue', Fredoka, sans-serif";
    var fs = Math.min(VW * 0.14, 72);
    fs = Math.max(28, fs);
    // Auto-fit: el bottleneck es la línea más larga.
    while (fs > 28) {
      ctx.font = "900 " + fs + "px " + fontStack;
      var w1 = ctx.measureText(line1).width;
      var w2 = ctx.measureText(line2).width;
      if (Math.max(w1, w2) <= maxW) break;
      fs -= 2;
    }
    var lineHeight = fs * 1.7;        // 1.7x — deja espacio para chorros
    var dripCap = lineHeight * 0.55;  // ~55% del gap para los chorros L1
    ctx.save();
    // ---- 1. Setup compartido ------------------------------------------
    ctx.font = "900 " + fs + "px " + fontStack;
    if ("letterSpacing" in ctx) {
      try { ctx.letterSpacing = (fs * 0.05) + "px"; } catch (e) {}
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    var u1 = line1.toUpperCase();
    var u2 = line2.toUpperCase();
    var ce = state.cinematicEnd;
    var ceT = ce ? ce.t : time;
    // Posicionamiento centrado del bloque vertical.
    var cyLine1 = cyCenter - lineHeight / 2;
    var cyLine2 = cyCenter + lineHeight / 2;
    // ---- 2. Pulsing red glow (8..16) ---------------------------------
    var pulseSlow = 0.5 + 0.5 * Math.sin(ceT * (Math.PI * 2 / 1.5));
    ctx.shadowColor = "rgba(255, 0, 0, " + (0.55 + pulseSlow * 0.30) + ")";
    ctx.shadowBlur = 8 + pulseSlow * 8;
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#000000";
    // Degradado de sangre: carmesí brillante arriba -> sangre oscura abajo.
    function bloodGrad(cy) {
      var g = ctx.createLinearGradient(0, cy - fs * 0.55, 0, cy + fs * 0.55);
      g.addColorStop(0, "#FF4D4D");
      g.addColorStop(0.45, "#C41E25");
      g.addColorStop(1, "#5A0606");
      return g;
    }
    // ---- 3. Línea 1: stroke + fill (UNA SOLA VEZ cada uno) -----------
    ctx.strokeText(u1, cx, cyLine1);
    ctx.fillStyle = bloodGrad(cyLine1);
    ctx.fillText(u1, cx, cyLine1);
    // Brillo especular tenue en el borde superior de las letras.
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillText(u1, cx, cyLine1 - fs * 0.04);
    // ---- 4. Línea 2: stroke + fill (UNA SOLA VEZ cada uno) -----------
    ctx.strokeStyle = "#000000";
    ctx.strokeText(u2, cx, cyLine2);
    ctx.fillStyle = bloodGrad(cyLine2);
    ctx.fillText(u2, cx, cyLine2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillText(u2, cx, cyLine2 - fs * 0.04);
    // ---- 5. Quitar sombra antes de los chorros -----------------------
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    // Goteo de sangre eliminado: las letras quedan limpias, sin chorros ni charco.
    if ("letterSpacing" in ctx) {
      try { ctx.letterSpacing = "0px"; } catch (e) {}
    }
    ctx.restore();
    return { bottomY: cyLine2 + lineHeight * 0.55 };
  }

  // Backwards-compat single-line wrapper for any straggler callers.
  function drawTerrorTitle(text, cx, cy, time) {
    return drawTerrorTitleTwoLines(text, "", cx, cy, time);
  }

  // Sprint 8B-Polish-2: subtle title logo at the top of the cinematic.
  function drawCinematicLogo(t) {
    var ce = state.cinematicEnd;
    if (!ce) return;
    var fadeIn = Math.min(1, ce.t / 0.5);
    var alpha = 0.4 * fadeIn;
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
    ctx.font = "300 20px 'Helvetica Neue', Arial, Fredoka, sans-serif";
    if ("letterSpacing" in ctx) {
      try { ctx.letterSpacing = "4px"; } catch (e) {}
    }
    ctx.fillText("IMMUNODEFENSE", VW / 2, 24);
    ctx.fillStyle = "rgba(255, 255, 255, " + (alpha * 0.65) + ")";
    ctx.font = "300 12px 'Helvetica Neue', Arial, Fredoka, sans-serif";
    if ("letterSpacing" in ctx) {
      try { ctx.letterSpacing = "3px"; } catch (e) {}
    }
    ctx.fillText("FASE 1 — LA INVASION", VW / 2, 50);
    if ("letterSpacing" in ctx) {
      try { ctx.letterSpacing = "0px"; } catch (e) {}
    }
    ctx.restore();
  }

  function drawCinematicEnd() {
    var ce = state.cinematicEnd;
    if (!ce) return;
    var t = ce.t;
    // Subtle game logo at the top during the cinematic.
    drawCinematicLogo(t);
    ctx.save();
    // T+0..1: red flash pulse from center
    if (t < 1.0) {
      var alpha = (1 - t) * 0.6;
      var rg = ctx.createRadialGradient(VW / 2, VH / 2, 0, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
      rg.addColorStop(0, "rgba(220, 30, 30, " + alpha + ")");
      rg.addColorStop(1, "rgba(220, 30, 30, 0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, VW, VH);
    }
    // T+1..3: toxic wave from vessel expanding outward
    if (t >= 1.0 && t < 3.0 && PATH.exit) {
      var wt = t - 1.0;
      var wr = wt * 600 * U;  // ~600 px/s scaled
      var ringAlpha = Math.max(0, 1 - wt / 2.0);
      var wrG = ctx.createRadialGradient(PATH.exit.x, PATH.exit.y, wr * 0.6, PATH.exit.x, PATH.exit.y, wr);
      wrG.addColorStop(0, "rgba(74, 20, 76, " + ringAlpha * 0.55 + ")");
      wrG.addColorStop(1, "rgba(139, 0, 0, " + ringAlpha * 0.10 + ")");
      ctx.fillStyle = wrG;
      ctx.beginPath();
      ctx.arc(PATH.exit.x, PATH.exit.y, wr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180, 50, 90, " + ringAlpha + ")";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(PATH.exit.x, PATH.exit.y, wr, 0, Math.PI * 2);
      ctx.stroke();
    }
    // T+2..5: progressive poison background covering field bottom-up
    if (t >= 2.0) {
      var pt = Math.min(1, (t - 2.0) / 3.0);
      var bandH = (FIELD_BOTTOM - FIELD_TOP) * pt;
      var by = FIELD_BOTTOM - bandH;
      var pg = ctx.createLinearGradient(0, FIELD_BOTTOM, 0, by);
      pg.addColorStop(0, "rgba(74, 0, 0, 0.85)");
      pg.addColorStop(1, "rgba(139, 0, 0, 0.0)");
      ctx.fillStyle = pg;
      ctx.fillRect(0, by, VW, bandH);
    }
    // T+4.5..7: skin/exterior darken (overlay)
    if (t >= 4.5) {
      var dt2 = Math.min(1, (t - 4.5) / 1.5);
      ctx.fillStyle = "rgba(20, 10, 10, " + (dt2 * 0.50) + ")";
      ctx.fillRect(0, 0, VW, FIELD_TOP + FIELD_H * 0.15);
    }
    // T+5.5..7: text fade in (Sprint 8B-Polish-3B: dos renglones con chorros)
    if (t >= 5.5) {
      var tt = Math.min(1, (t - 5.5) / 1.0);
      ctx.globalAlpha = tt;
      var titleResult = drawTerrorTitleTwoLines("INFECCIÓN", "ESTABLECIDA",
                                                VW / 2, VH * 0.45, t);
      var subY = (titleResult ? titleResult.bottomY : VH * 0.45 + 80) + 14;
      ctx.font = "italic 16px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.strokeText("Los patógenos han alcanzado el torrente sanguíneo.", VW / 2, subY);
      ctx.fillStyle = "#FF6B6B";
      ctx.fillText("Los patógenos han alcanzado el torrente sanguíneo.", VW / 2, subY);
      ctx.strokeText("Comienza la diseminación...", VW / 2, subY + 24);
      ctx.fillText("Comienza la diseminación...", VW / 2, subY + 24);
      // Stash the bottom of the subtitle so the Continue button positions below.
      ce._textBottomY = subY + 24 + 12;
    }
    // T+7+: continue button — Sprint 8B-Polish-3B-fix: posicionado debajo
    // del subtítulo con margen 36px, con un piso a VH*0.78 si el texto
    // queda muy arriba.
    if (t >= 7.0) {
      var btnW = 320, btnH = 56;
      var btnYFloor = VH * 0.78;
      var btnY = Math.max(btnYFloor, (ce._textBottomY || 0) + 36);
      // Si por alguna razón el botón queda fuera del viewport, lo subimos.
      if (btnY + btnH > VH - 24) btnY = VH - btnH - 24;
      var btn = { x: VW / 2 - btnW / 2, y: btnY, w: btnW, h: btnH };
      UI.cinematicBtn = btn;
      var bp = 1 + Math.sin(state.time * 3) * 0.03;
      ctx.save();
      ctx.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.scale(bp, bp);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-btn.w / 2, -btn.h / 2, btn.w, btn.h);
      ctx.strokeStyle = "#1a1a22";
      ctx.lineWidth = 3;
      ctx.strokeRect(-btn.w / 2, -btn.h / 2, btn.w, btn.h);
      ctx.fillStyle = "#1a1a22";
      ctx.font = "bold 16px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("▶ CONTINUAR A FASE 2 (Próximamente)", 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawEndOverlay() {
    if (!state.gameOver && !state.victory) return;
    var fade = Math.min(1, state.endRevealTimer / 0.45);
    ctx.save();
    if (state.victory) {
      drawGoldParticles();
      ctx.fillStyle = "rgba(255, 250, 245, " + (0.92 * fade) + ")";
    } else {
      ctx.fillStyle = "rgba(60, 20, 20, " + (0.85 * fade) + ")";
    }
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = fade;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var titleFs = Math.min(VW * 0.085, VH * 0.075, 36);
    ctx.font = '600 ' + titleFs + 'px Fredoka, sans-serif';
    var title = state.victory ? "INFECCIÓN ERRADICADA" : "INFECCIÓN CRÍTICA";
    ctx.fillStyle = state.victory ? "#2C3E50" : "#C0392B";
    ctx.fillText(title, VW / 2, VH * 0.35);

    var subFs = Math.max(13, Math.min(18, titleFs * 0.45));
    ctx.font = 'italic ' + subFs + 'px Fredoka, sans-serif';
    ctx.fillStyle = state.victory ? "#555" : "rgba(255, 235, 230, 0.85)";
    var sub = state.victory
      ? "Tu sistema inmune defendió al organismo."
      : "El organismo ha sido comprometido.";
    ctx.fillText(sub, VW / 2, VH * 0.35 + titleFs * 0.95);

    // Stats list
    var sx = VW / 2;
    var sy = VH * 0.35 + titleFs * 1.65;
    ctx.font = 'bold ' + Math.max(14, 16) + 'px Fredoka, sans-serif';
    var statsColor = state.victory ? "#2C3E50" : "#f5e7e7";
    ctx.fillStyle = statsColor;
    var stats = [
      "Oleadas alcanzadas: " + state.waveIdx,
      "Patogenos eliminados: " + state.pathogensDefeated,
      "Patogenos infiltrados: " + state.pathogensReached,
      "ATP final: " + state.atp
    ];
    var lineH = 24;
    for (var si = 0; si < stats.length; si++) {
      ctx.fillText(stats[si], sx, sy + si * lineH);
    }

    // Single button
    var btn = UI.endRestartBtn;
    if (state.victory) {
      ctx.fillStyle = "#2C3E50";
      roundRect(btn.x, btn.y, btn.w, btn.h, 0);
      ctx.fill();
      ctx.strokeStyle = "#1a2b3a";
      ctx.lineWidth = 1.5;
      roundRect(btn.x, btn.y, btn.w, btn.h, 0);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = 'bold 15px Fredoka, sans-serif';
      ctx.textBaseline = "middle";
      ctx.fillText("Jugar de nuevo", btn.x + btn.w / 2, btn.y + btn.h / 2);
    } else {
      ctx.fillStyle = "#C0392B";
      roundRect(btn.x, btn.y, btn.w, btn.h, 0);
      ctx.fill();
      ctx.strokeStyle = "#7d2419";
      ctx.lineWidth = 1.5;
      roundRect(btn.x, btn.y, btn.w, btn.h, 0);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = 'bold 15px Fredoka, sans-serif';
      ctx.textBaseline = "middle";
      ctx.fillText("Reintentar", btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
    ctx.restore();
  }

  function render() {
    // Defensive: iOS Chrome/Safari pueden cambiar el visualViewport sin
    // disparar resize. Si VW/VH o offsetTop cambiaron, forzar relayout.
    var vv = window.visualViewport;
    if (vv) {
      if (Math.abs(vv.width  - VW) > 0.5 ||
          Math.abs(vv.height - VH) > 0.5 ||
          parseFloat(canvas.style.top  || "0") !== vv.offsetTop ||
          parseFloat(canvas.style.left || "0") !== vv.offsetLeft) {
        resize();
      }
    } else {
      if (window.innerWidth !== VW || window.innerHeight !== VH) {
        resize();
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Shake offset for life loss only (defeat overlay is calm/elegant per spec).
    var shakeOff = { x: 0, y: 0 };
    if (state.shakeTimer > 0 && !state.gameOver && !state.victory) {
      var sm = state.shakeMag || 5;
      var sintensity = Math.min(1, state.shakeTimer / 0.3);
      shakeOff.x = (Math.random() - 0.5) * sm * sintensity;
      shakeOff.y = (Math.random() - 0.5) * sm * sintensity;
    }
    // MRSA intro earthquake: ±2px on both axes for the duration of the banner.
    if (state.mrsaIntro) {
      shakeOff.x += (Math.random() - 0.5) * 4;
      shakeOff.y += (Math.random() - 0.5) * 4;
    }
    ctx.setTransform(dpr, 0, 0, dpr, shakeOff.x * dpr, shakeOff.y * dpr);

    // Strict render order per Sprint 4A spec.
    // Wrapper: si algo en el field crashea, atrapamos para que HUD/Panel
    // sigan visibles (clave en Safari iOS, más estricto que Chrome).
    clearCanvas();
    try {
      if (state.dissemination) {
        drawDisseminationField();
        drawAntigenDrops();
        drawDendriticStains();
        drawNets();
        if (state.dissemination) drawThrombi();
      } else {
        drawExteriorZone();
        drawSkinZone();
        drawSkinLayers();
        drawCirculatoryZone();
      }
      drawAmbient();
      if (!state.dissemination) drawMitosis();
      if (!state.dissemination) drawPatrol();
      drawTissue();
      drawInflammation();
      drawPath();
      if (!state.dissemination) drawPlasmaFlow();
      if (!state.dissemination) drawWound();
      drawLymphNode();
      drawRestos();
      drawCollectors();
      drawBarricada();
      drawSlicks();
      drawNecroticPatches();
      drawAcidSplats();
      drawMegakaryocyte();
      drawPlaquetaPickups();
      drawRangeHint();
      for (var j = 0; j < state.enemies.length; j++) {
        var ej = state.enemies[j];
        if (!ej.absorbing) drawEnemy(ej);
      }
      if (!state.dissemination) drawVessel();
      for (var jb = 0; jb < state.enemies.length; jb++) {
        var ejb = state.enemies[jb];
        if (ejb.absorbing) drawEnemy(ejb);
      }
      for (var i = 0; i < state.towers.length; i++) drawTower(state.towers[i]);
      drawGuardians();
      drawFragments();
      drawCannonShots();
      drawSeekers();
      drawSynergyLines();   // líneas punteadas entre torres en sinergia
      drawLymphDrop();
      drawMedulaOsea();
      drawUnlockPickups();
      if (!state.dissemination) drawMedVial();
      if (!state.dissemination) drawTopical();
      for (var k = 0; k < state.projectiles.length; k++) drawProjectile(state.projectiles[k]);
      drawGermShots();
      for (var m = 0; m < state.effects.length; m++) drawEffect(state.effects[m]);
      drawAcid();
      drawGas();
      drawGhost();
      drawDamageNumbers();
      drawAtmosphere();
    } catch (e) {
      // Si el field crashea, dejamos el HUD/Panel intactos. Solo registramos
      // (la primera vez) para no inundar.
      if (!window.__renderErrorLogged) {
        window.__renderErrorLogged = true;
        try { console.error("Render field error:", e); } catch (_) {}
      }
    }
    // HUD y panel SIEMPRE visibles (excepto en title/intro, que tienen su
    // propio overlay). La cinemática vieja ya no se usa (era el placeholder
    // pre-puente); mantenerlo oculto rompía la jugabilidad si quedaba activo.
    if (!state.showTitle && !state.showIntro) {
      drawHUD();
      drawPanel();
      drawCompendiumButton();
      drawComplementMeter();
      if (state.dissemination) drawImmuneResponsePanel();
    }
    // Mini aviso de nuevo germen: reactivo en tiempo real — se chequea cada
    // frame si HAY al menos un germen vivo en el campo cuyo tipo no esté
    // en vistos. Antes el aviso quedaba colgado cuando los gérmenes morían.
    if (!state.showTitle && !state.showIntro && !state.compendiumOpen) {
      var hasUnseenAlive = false;
      for (var nAi = 0; nAi < state.enemies.length; nAi++) {
        var nAe = state.enemies[nAi];
        if (nAe.dead || nAe.dying) continue;
        if (!nAe.def || !nAe.def.id) continue;
        if (!state.vistos[nAe.def.id]) { hasUnseenAlive = true; break; }
      }
      if (hasUnseenAlive) {
        var pulseA = 0.5 + 0.5 * Math.sin(state.time * 4);
        var bw = Math.min(VW - 32, 260);
        var bh = 30;
        var bx = (VW - bw) / 2;
        var by = FIELD_TOP + 16;
        ctx.save();
        ctx.fillStyle = "rgba(255, 210, 74, " + (0.85 + pulseA * 0.10) + ")";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#3a2008";
        ctx.font = "bold 12px Fredoka, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("¡Toca al nuevo enemigo!", bx + bw / 2, by + bh / 2);
        ctx.restore();
      }
    }
    // Compendio: por encima de todo lo demás cuando está abierto.
    drawCompendium();
    // Transición de fase: fundido a negro suave con texto narrativo.
    if (state.phaseTransition) {
      var ph = state.phaseTransition;
      var k = ph.t / ph.duration;             // 0 → 1
      // Curva: fade-in rápido a oscuro, hold, fade-out parcial (luego la
      // cinemática de Diseminación toma el control).
      var veilAlpha;
      if (k < 0.50) veilAlpha = (k / 0.50) * 0.95;
      else if (k < 0.85) veilAlpha = 0.95;
      else veilAlpha = 0.95 * (1 - (k - 0.85) / 0.15);
      ctx.save();
      ctx.fillStyle = "rgba(8, 4, 8, " + veilAlpha + ")";
      ctx.fillRect(0, 0, VW, VH);
      // Texto narrativo "La barrera se rompe..." con leve aparición y latido.
      if (k > 0.15) {
        var ta = Math.min(1, (k - 0.15) / 0.20);
        if (k > 0.70) ta *= Math.max(0, 1 - (k - 0.70) / 0.30);
        ctx.globalAlpha = ta;
        ctx.fillStyle = "#ff6868";
        ctx.font = "bold " + Math.floor(28 * U) + "px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = 3;
        ctx.strokeText("LA BARRERA SE ROMPE", VW / 2, VH * 0.46);
        ctx.fillText("LA BARRERA SE ROMPE", VW / 2, VH * 0.46);
        ctx.fillStyle = "#d4a888";
        ctx.font = "italic " + Math.floor(15 * U) + "px Fredoka, sans-serif";
        ctx.fillText("la infección entra en sangre…", VW / 2, VH * 0.54);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    drawMessage();
    drawWaveBanner();
    if (state.time - state.lastPlaceFailedAt < 0.25) {
      var a = 1 - (state.time - state.lastPlaceFailedAt) / 0.25;
      ctx.strokeStyle = "rgba(220, 70, 70, " + a + ")";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, FIELD_TOP + 2, VW - 4, FIELD_H - 4);
    }
    drawEndOverlay();
    drawMrsaIntro();
    drawCinematicEnd();
    drawDisseminationIntro();
    drawDisseminationOver();
    // drawTooltip(): reemplazado por el compendio. El glow del germen +
    // el mini banner invitan al tap, y el compendio abre con sus datos.
    drawIntroScreen();
    drawTitleScreen();
    drawConfirmModal();
  }

  function drawDamageNumbers() {
    if (!state.damageNumbers.length) return;
    var fs = Math.max(16, 18 * U);
    ctx.save();
    ctx.font = "bold " + fs + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    for (var i = 0; i < state.damageNumbers.length; i++) {
      var d = state.damageNumbers[i];
      var alpha = Math.max(0, d.life / d.max);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.restore();
  }

  function drawRangeHint() {
    if (!state.rangeHint) return;
    var rh = state.rangeHint;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, rh.range, 0, Math.PI * 2);
    ctx.fill();
    // Outer dark hairline for contrast against cream background.
    ctx.strokeStyle = "rgba(20, 20, 30, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, rh.range, 0, Math.PI * 2);
    ctx.stroke();
    // Main dashed white ring.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2.6;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, rh.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Subtle inner colored hairline so it's tinted by the source.
    ctx.strokeStyle = "rgba(40, 40, 50, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, rh.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGoldParticles() {
    if (!state.goldParticles.length) return;
    for (var i = 0; i < state.goldParticles.length; i++) {
      var p = state.goldParticles[i];
      var alpha = Math.max(0, Math.min(1, p.life / 1.5)) * p.alpha;
      ctx.fillStyle = "rgba(245, 215, 110, " + alpha + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // -------- NIVEL PUENTE: RENDER -------------------------------------------
  function drawDisseminationField() {
    // Fondo gradiente cálido (tejido profundo del cuerpo).
    var g = ctx.createLinearGradient(0, FIELD_TOP, 0, FIELD_TOP + FIELD_H);
    g.addColorStop(0, "#3a1d24");
    g.addColorStop(1, "#1f0e16");
    ctx.fillStyle = g;
    ctx.fillRect(0, FIELD_TOP, VW, FIELD_H);
    if (!PATH.laneXs) return;
    // Rectángulo del campo de carriles (80% del field, centrado).
    var bridgeLeft = FIELD_LEFT + FIELD_W * 0.13;
    var bridgeRight = FIELD_LEFT + FIELD_W * 0.87;
    var bridgeTop = FIELD_TOP + FIELD_H * 0.06;
    var bridgeBottom = FIELD_TOP + FIELD_H * 0.94;
    var laneW = (bridgeRight - bridgeLeft) / 5;
    // Tintes verticales por carril.
    for (var i = 0; i < PATH.laneXs.length; i++) {
      var organ = DISSEMINATION_ORGANS[i];
      var xc = FIELD_LEFT + PATH.laneXs[i] * FIELD_W;
      var xL = xc - laneW / 2;
      ctx.fillStyle = organ.tint;
      ctx.fillRect(xL, bridgeTop, laneW, bridgeBottom - bridgeTop);
      // Hairline central (la "vena" del recorrido).
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xc, bridgeTop);
      ctx.lineTo(xc, bridgeBottom);
      ctx.stroke();
    }
    // Separadores verticales entre carriles.
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = 1;
    for (var s = 1; s < PATH.laneXs.length; s++) {
      var xs = FIELD_LEFT + ((PATH.laneXs[s - 1] + PATH.laneXs[s]) / 2) * FIELD_W;
      ctx.beginPath();
      ctx.moveTo(xs, bridgeTop);
      ctx.lineTo(xs, bridgeBottom);
      ctx.stroke();
    }
    // Marco del campo del puente (sutil).
    ctx.strokeStyle = "rgba(255, 200, 160, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bridgeLeft, bridgeTop, bridgeRight - bridgeLeft, bridgeBottom - bridgeTop);
    // Grietas (spawn) arriba y puertas de órgano abajo.
    if (PATH.wounds && PATH.organDoors) {
      for (var k = 0; k < PATH.wounds.length; k++) {
        var w = PATH.wounds[k];
        var d = PATH.organDoors[k];
        drawDisseminationCrack(w.x, w.y);
        var load = (state.disseminationOrganLoad && state.disseminationOrganLoad[k]) || 0;
        var flash = (state.disseminationFlash && state.disseminationFlash[k]) || 0;
        var hp = (state.disseminationBarrierHP && state.disseminationBarrierHP[k]) || 0;
        var hpMax = (state.disseminationBarrierMax && state.disseminationBarrierMax[k]) || 1;
        var broken = !!(state.disseminationBarrierBroken && state.disseminationBarrierBroken[k]);
        drawOrganBarrier(d.x, d.y, d.organ, hp, hpMax, broken, flash);
        drawOrganDoor(d.x, d.y, d.organ, load, flash);
      }
    }
  }

  function drawDisseminationCrack(x, y) {
    // Grieta horizontal (la barrera rota arriba del carril). Mancha rojo oscuro.
    ctx.save();
    ctx.translate(x, y);
    var w = 16 * U, h = 7 * U;
    ctx.fillStyle = "rgba(120, 20, 30, 0.85)";
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.4);
    ctx.lineTo(-w * 0.4, -h);
    ctx.lineTo(w * 0.1, -h * 0.5);
    ctx.lineTo(w * 0.5, -h);
    ctx.lineTo(w, -h * 0.3);
    ctx.lineTo(w * 0.6, h * 0.5);
    ctx.lineTo(w * 0.2, h);
    ctx.lineTo(-w * 0.3, h * 0.6);
    ctx.lineTo(-w * 0.7, h);
    ctx.lineTo(-w, h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(40, 8, 12, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Brillo interno apenas.
    ctx.fillStyle = "rgba(220, 100, 90, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.6, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawOrganBarrier(x, yDoor, organ, hp, hpMax, broken, flash) {
    hp = hp || 0; hpMax = hpMax || 1; flash = flash || 0;
    var r = 22 * U;
    var yMem = yDoor - r * 1.3;
    var laneW = (FIELD_W / 5);
    var w = laneW * 0.75;
    var h = 8 * U;
    var ratio = hp / hpMax;

    ctx.save();
    if (broken) {
      // Barrera completamente rota: franja oscura con bordes rojos rotos.
      ctx.fillStyle = "rgba(20, 10, 14, 0.85)";
      ctx.fillRect(x - w/2, yMem - h/2, w, h);
      ctx.strokeStyle = "rgba(255, 60, 60, 0.85)";
      ctx.lineWidth = 2 * U;
      ctx.setLineDash([4 * U, 3 * U]);
      ctx.beginPath();
      ctx.moveTo(x - w/2, yMem - h/2); ctx.lineTo(x + w/2, yMem - h/2);
      ctx.moveTo(x - w/2, yMem + h/2); ctx.lineTo(x + w/2, yMem + h/2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    // 1. Banda con pattern del órgano.
    var pat = getOrganPattern(organ.id);
    ctx.fillStyle = pat || colorAlpha(organ.color, 0.4);
    ctx.fillRect(x - w/2, yMem - h/2, w, h);

    // 2. Bordes superior/inferior.
    ctx.strokeStyle = organ.color;
    ctx.lineWidth = 2 * U;
    ctx.beginPath();
    ctx.moveTo(x - w/2, yMem - h/2); ctx.lineTo(x + w/2, yMem - h/2);
    ctx.moveTo(x - w/2, yMem + h/2); ctx.lineTo(x + w/2, yMem + h/2);
    ctx.stroke();

    // 3. Etiqueta histológica.
    ctx.fillStyle = colorAlpha(organ.color, 0.6);
    ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(TISSUE_LABEL[organ.id] || "", x, yMem + h/2 + 2 * U);

    // 4. Inflamación si ratio < 0.7
    if (ratio < 0.7) {
      var inflam = Math.min(0.30, (0.7 - ratio) * 0.5);
      ctx.fillStyle = "rgba(255, 90, 90, " + inflam + ")";
      ctx.fillRect(x - w/2 - 2, yMem - h/2 - 2, w + 4, h + 4);
    }

    // 5. Agujeros si ratio < 0.4 (1 a 3 deterministas por organId)
    if (ratio < 0.4) {
      var holes = Math.max(1, Math.min(3, Math.floor((0.4 - ratio) * 10)));
      var seed = organIdSeed(organ.id);
      for (var hi = 0; hi < holes; hi++) {
        var hx = x - w/2 + ((seed * (hi + 1) * 17) % 1000) / 1000 * w;
        ctx.fillStyle = "rgba(20, 10, 14, 0.92)";
        ctx.beginPath();
        ctx.ellipse(hx, yMem, 3 * U, 2.5 * U, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Flash + rasgadura si flash > 0
    if (flash > 0) {
      ctx.strokeStyle = "rgba(255, 200, 200, " + (flash * 0.65) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, yMem, r * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, yMem, r * 1.4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(20, 10, 14, " + flash + ")";
      ctx.beginPath();
      ctx.ellipse(x, yMem, 4 * U, 3 * U, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Barra de HP debajo del label
    var hpBarY = yMem + h/2 + 14 * U;
    var hpBarW = w * 0.7;
    ctx.fillStyle = "rgba(20, 10, 14, 0.85)";
    ctx.fillRect(x - hpBarW/2, hpBarY, hpBarW, 4 * U);
    var hpFillW = hpBarW * ratio;
    var hpColor = ratio > 0.6 ? "#5ad15a" : ratio > 0.3 ? "#e8c84a" : "#d9534f";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x - hpBarW/2, hpBarY, hpFillW, 4 * U);
    ctx.fillStyle = hpColor;
    ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hp + " / " + hpMax + " HP", x, hpBarY + 14 * U);

    ctx.restore();
  }

  function drawOrganDoor(x, y, organ, load, flash) {
    load = load || 0;
    flash = flash || 0;
    var pct = Math.min(1, load / 10);
    ctx.save();
    var r = 20 * U;
    // Halo de color del órgano (más intenso con load y con flash).
    var haloA = 0.8 + flash * 1.2 + pct * 0.6;
    var grd = ctx.createRadialGradient(x, y, 4, x, y, r * (1.6 + flash * 0.5));
    grd.addColorStop(0, colorAlpha(organ.color, Math.min(1, haloA)));
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5);
    // Disco oscuro de fondo.
    ctx.fillStyle = "rgba(20, 10, 14, 0.92)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Relleno del color del órgano según el load (anillo que se va llenando).
    if (pct > 0) {
      ctx.fillStyle = colorAlpha(organ.color, 0.35 + pct * 0.45);
      ctx.beginPath();
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    }
    // Anillo del color del órgano (más grueso con flash).
    ctx.strokeStyle = organ.color;
    ctx.lineWidth = 3 + flash * 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Ícono central.
    ctx.fillStyle = organ.color;
    ctx.font = "bold " + Math.floor(16 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var icon = organ.id === "corazon" ? "♥"
             : organ.id === "pulmon" ? "🫁"
             : organ.id === "sangre" ? "●"
             : organ.id === "hueso" ? "▌"
             : "◯";
    ctx.fillText(icon, x, y - 1);
    // Contador X/10 sobre la puerta.
    ctx.font = "bold " + Math.floor(11 * U) + "px Fredoka, sans-serif";
    var loadColor = pct >= 0.7 ? "#ff7a7a" : (pct >= 0.4 ? "#ffd24a" : "rgba(240, 220, 200, 0.95)");
    ctx.fillStyle = loadColor;
    ctx.fillText(load + " / 10", x, y - r - 8 * U);
    // Etiqueta del órgano más arriba.
    ctx.font = "bold " + Math.floor(10 * U) + "px Fredoka, sans-serif";
    ctx.fillStyle = "rgba(240, 220, 200, 0.80)";
    ctx.fillText(organ.label, x, y - r - 20 * U);
    ctx.restore();
  }

  function drawDisseminationIntro() {
    if (state.disseminationIntroTimer <= 0) return;
    var total = 4.0;
    var t = state.disseminationIntroTimer;
    var elapsed = total - t;
    ctx.save();
    // ── Velo oscuro de fondo: empezamos opacos para que la rajadura se vea ANTES que los carriles.
    // Hold-on al inicio (sin fade-in), fade-out al final que revela el campo.
    var bgAlpha;
    if (elapsed < 0.4) bgAlpha = 1.0;
    else if (elapsed < 2.6) bgAlpha = 0.95;
    else if (elapsed < 3.6) bgAlpha = Math.max(0, 0.95 * (1 - (elapsed - 2.6) / 1.0));
    else bgAlpha = 0;
    ctx.fillStyle = "rgba(8, 4, 8, " + bgAlpha + ")";
    ctx.fillRect(0, 0, VW, VH);
    // ── Flash radial rojo (la barrera cediendo) — 0.4-1.4s
    if (elapsed > 0.4 && elapsed < 1.6) {
      var ft = (elapsed - 0.4) / 1.2;
      var flashAlpha = Math.sin(ft * Math.PI) * 0.60;
      var fg = ctx.createRadialGradient(VW / 2, VH / 2, 0, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
      fg.addColorStop(0, "rgba(220, 40, 50, " + flashAlpha + ")");
      fg.addColorStop(0.6, "rgba(120, 20, 30, " + (flashAlpha * 0.5) + ")");
      fg.addColorStop(1, "rgba(40, 0, 0, 0)");
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, VW, VH);
    }
    // ── Grietas que se expanden desde el centro — 0.4-2.6s
    if (elapsed > 0.4 && elapsed < 2.6) {
      var crackProgress = Math.min(1, (elapsed - 0.4) / 0.8);
      var crackFade = elapsed > 2.0 ? Math.max(0, 1 - (elapsed - 2.0) / 0.6) : 1;
      ctx.strokeStyle = "rgba(240, 110, 120, " + (0.85 * crackFade) + ")";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      var nCracks = 8;
      var rMax = Math.max(VW, VH) * 0.55 * crackProgress;
      for (var c = 0; c < nCracks; c++) {
        var ang = (c / nCracks) * Math.PI * 2 + 0.2;
        ctx.beginPath();
        ctx.moveTo(VW / 2, VH / 2);
        // Grieta con quiebres (zigzag).
        var steps = 4;
        for (var k = 1; k <= steps; k++) {
          var rk = rMax * (k / steps);
          var jitter = (Math.sin(c * 1.7 + k * 2.3) * 0.18) - 0.09;
          var ax = VW / 2 + Math.cos(ang + jitter) * rk;
          var ay = VH / 2 + Math.sin(ang + jitter) * rk;
          ctx.lineTo(ax, ay);
        }
        ctx.stroke();
      }
    }
    // ── Texto principal: aparece en 0.6s, hold, fade out en 2.8s
    if (elapsed > 0.6) {
      var textAlpha;
      if (elapsed < 1.2) textAlpha = (elapsed - 0.6) / 0.6;
      else if (elapsed < 2.4) textAlpha = 1;
      else textAlpha = Math.max(0, 1 - (elapsed - 2.4) / 0.4);
      ctx.globalAlpha = textAlpha;
      // Título grande con slide-in vertical.
      var slideOff = Math.max(0, (1.2 - elapsed) * 30 * U);
      ctx.fillStyle = "#ffce8a";
      ctx.font = "bold " + Math.floor(38 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(80, 10, 10, 0.9)";
      ctx.strokeText("LA BARRERA CAYÓ", VW / 2, VH * 0.40 + slideOff);
      ctx.fillText("LA BARRERA CAYÓ", VW / 2, VH * 0.40 + slideOff);
      // Subtítulo.
      ctx.font = "italic " + Math.floor(17 * U) + "px Fredoka, sans-serif";
      ctx.fillStyle = "#d4a888";
      ctx.fillText("La infección busca órganos profundos", VW / 2, VH * 0.49);
      // Call to action.
      ctx.font = "bold " + Math.floor(22 * U) + "px Fredoka, sans-serif";
      ctx.fillStyle = "#f0d8a0";
      ctx.fillText("◆ DEFENDÉ LOS 5 ÓRGANOS ◆", VW / 2, VH * 0.60);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawDisseminationOver() {
    var dOver = state.disseminationOver;
    if (!dOver) return;
    var t = dOver.t;
    // Fade in del fondo oscuro.
    var bgAlpha = Math.min(0.85, t / 0.6 * 0.85);
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, " + bgAlpha + ")";
    ctx.fillRect(0, 0, VW, VH);
    // Banner: "[Germen] alcanzó [Órgano]" — aparece a los 0.4s.
    if (t > 0.4) {
      var b1Alpha = Math.min(1, (t - 0.4) / 0.4);
      ctx.globalAlpha = b1Alpha;
      ctx.fillStyle = dOver.organ.color;
      ctx.font = "bold " + Math.floor(34 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var germLabel = (dOver.germ && (dOver.germ.label || dOver.germ.shortName || dOver.germ.id)) || "El patógeno";
      ctx.fillText(germLabel + " alcanzó", VW / 2, VH * 0.34);
      ctx.font = "bold " + Math.floor(52 * U) + "px Fredoka, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(dOver.organ.label, VW / 2, VH * 0.44);
      ctx.globalAlpha = 1;
    }
    // Cinemática: "Próximamente — Fase 2: [Escenario]" a los 1.6s.
    if (t > 1.6) {
      var b2Alpha = Math.min(1, (t - 1.6) / 0.5);
      ctx.globalAlpha = b2Alpha;
      ctx.fillStyle = "#c0a080";
      ctx.font = "bold " + Math.floor(18 * U) + "px Fredoka, sans-serif";
      ctx.fillText("PRÓXIMAMENTE — FASE 2", VW / 2, VH * 0.58);
      ctx.fillStyle = "#f0d2a0";
      ctx.font = "bold " + Math.floor(40 * U) + "px Fredoka, sans-serif";
      ctx.fillText(dOver.organ.scenario, VW / 2, VH * 0.66);
      // Hint pequeño abajo.
      if (t > 2.6) {
        var b3Alpha = Math.min(0.7, (t - 2.6) / 0.5 * 0.7);
        ctx.globalAlpha = b3Alpha;
        ctx.fillStyle = "#a08060";
        ctx.font = "bold " + Math.floor(13 * U) + "px Fredoka, sans-serif";
        ctx.fillText("(escenario en desarrollo)", VW / 2, VH * 0.76);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // -------- FIN NIVEL PUENTE: RENDER --------------------------------------

  // -------- LOOP ----------------------------------------------------------
  var lastT = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    state.time += dt;
    var paused = state.confirmRestart || state.showTitle || state.showIntro || state.cinematicEnd || state.compendiumOpen || !!state.phaseTransition;
    // Nivel puente: pausamos la lógica al caer el primer carril (cinemática + placeholder).
    if (state.disseminationOver) {
      state.disseminationOver.t += dt;
      paused = true;
    }
    if (state.disseminationIntroTimer > 0) state.disseminationIntroTimer -= dt;
    if (state.disseminationFlash) {
      for (var dFi = 0; dFi < state.disseminationFlash.length; dFi++) {
        if (state.disseminationFlash[dFi] > 0) state.disseminationFlash[dFi] -= dt;
      }
    }
    if (!paused) {
      updateWaveScheduler(dt);
      updateWave(dt);
      updateEnemies(dt);
      updateTowers(dt);
      updateGuardians(dt);
      updateGermShots(dt);
      updateProjectiles(dt);
      updateMed(dt);
      updateFragments(dt);
      updateCannonShots(dt);
      updateAcidSplats(dt);
      updateSeekers(dt);
      updateNecroticPatches(dt);
      updateMegakaryocyte(dt);
      updateAntigenDrops(dt);
      updateNets(dt);
      updateThrombi(dt);
      updateDendriticStains(dt);
      updateUnlockPickups(dt);
      // Spawneo retardado de pickups per-fase al cambiar de fase.
      if (state.pendingPhaseUnlocks && state.pendingPhaseUnlocks.length > 0) {
        for (var pui = state.pendingPhaseUnlocks.length - 1; pui >= 0; pui--) {
          if (state.time >= state.pendingPhaseUnlocks[pui].spawnAt) {
            spawnUnlockPickup(state.pendingPhaseUnlocks[pui].typeId);
            state.pendingPhaseUnlocks.splice(pui, 1);
          }
        }
      }
    }
    if (state.showIntro && !state.showTitle) updateIntroComic(dt);
    if (state.cinematicEnd) updateCinematic(dt);
    // Transición suave entre fases: fundido a negro, después dispara
    // enterDissemination al cumplir la mitad de la duración.
    if (state.phaseTransition) {
      state.phaseTransition.t += dt;
      if (!state.phaseTransition.fired && state.phaseTransition.t >= state.phaseTransition.duration * 0.55) {
        state.phaseTransition.fired = true;
        if (state.phaseTransition.target === "dissemination") {
          enterDissemination();
        }
      }
      if (state.phaseTransition.t >= state.phaseTransition.duration) {
        state.phaseTransition = null;
      }
    }
    updateEffects(dt);
    if (state.msgTimer > 0) state.msgTimer -= dt;
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
  }
  resize();
  requestAnimationFrame(loop);
})();
