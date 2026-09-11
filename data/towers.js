(function (root) {
var TOWER_DEFS = {
  neutrofilo: {
    id: "neutrofilo",
    name: "Neutrofilo",
    shortName: "Neutro",
    color: "#B79CE0",
    colorDark: "#7E5FB0",
    cost: 55,
    desc: "Fagocitosis, NETs y degranulación — primera línea de defensa. Ultimate: ÑAM — mordida fagocítica grotesca que devora gérmenes en rango.",
    // Ultimate: ÑAM — hasta 5 mordidas fagocíticas en cadena sobre gérmenes
    // en rango (dmg ×3.2 c/u). Ver triggerTowerSpecial/updateTowers.
    specialChargeSec: 24 * 1.15,  // +15%: poderes tardan un poco más en cargar
    specialName: "ÑAM",
    levels: [
      { range: 108, damage: 25, fireRate: 1.0, projectileSpeed:   0, splash:  0, hp: 120 },
      { range: 120, damage: 45, fireRate: 1.2, projectileSpeed:   0, splash:  0, hp: 160 },
      { range: 132, damage: 75, fireRate: 1.4, projectileSpeed:   0, splash:  0, hp: 210 }
    ],
    upgradeCost: [60, 110]
  },
  linfocitoB: {
    id: "linfocitoB",
    name: "Linfocito B",
    shortName: "Linfo B",
    color: "#50C878",
    colorDark: "#2c8049",
    cost: 83,
    desc: "Produce anticuerpos IgG e IgM que opsonizan bacterias marcándolas para su destrucción. Ultimate: plasmocito — latigazos y puñetazos delgados con protrusiones Y penetrantes.",
    machineGun: true,
    // Ultimate: DIFERENCIACIÓN A PLASMOCITO — la torre se infla y
    // dispara una ráfaga de 30 anticuerpos Y al sector más cercano
    // del camino. Cada Y golpea a un germen del área.
    specialChargeSec: 28 * 1.15,  // +15%: poderes tardan un poco más en cargar
    specialName: "Plasmocito",
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
    shortName: "Linfo T",
    color: "#9370DB",
    colorDark: "#5d44a0",
    cost: 121,
    desc: "Reconoce péptidos en MHC-I y libera granzima B y perforina induciendo apoptosis. Ultimate: cachetadas y coscorrones de ejecución hasta 5 enemigos.",
    // Ultimate: APOPTOSIS — marca con granzima a los enemigos más
    // avanzados en rango (hasta 5); tras un breve retraso, todos
    // explotan juntos con daño masivo (ejecución retardada, no más
    // splash instantáneo).
    specialChargeSec: 32,
    specialName: "Apoptosis",
    levels: [
      { range: 110, damage:  40, fireRate: 0.7, projectileSpeed: 320, splash: 55, hp: 90 },
      { range: 125, damage:  65, fireRate: 0.85, projectileSpeed: 360, splash: 65, hp: 120 },
      { range: 140, damage: 100, fireRate: 1.0, projectileSpeed: 400, splash: 75, hp: 150 }
    ],
    upgradeCost: [120, 200]
  },
  langerhans: {
    id: "langerhans", name: "Cel. de Langerhans", shortName: "Langer",
    color: "#3FC1C9", colorDark: "#26797f", cost: 70,     desc: "CPA de la piel con ATAQUE PROPIO: granuloma Birbeck (cadena), pulso MHC-II (marca + revela ocultos), latigazo dendrítico cada 5s. Ultimate: Tormenta MHC-II — ráfaga de antígeno propia.",
    support: "mark",
    amplifies: true,
    presentAura: 0.08,
    birbeckChain: 0.72,
    whipInterval: 5.0,
    markPulseSec: 1.0,
    specialChargeSec: 30,
    specialName: "Tormenta MHC-II",
    levels: [
      { range: 135, damage: 26, fireRate: 1.15, projectileSpeed: 450, splash: 0, hp: 100, markBonus: 0.45, markDur: 3.5 },
      { range: 155, damage: 38, fireRate: 1.28, projectileSpeed: 480, splash: 0, hp: 125, markBonus: 0.55, markDur: 4.0 },
      { range: 175, damage: 52, fireRate: 1.40, projectileSpeed: 510, splash: 0, hp: 155, markBonus: 0.65, markDur: 4.5 }
    ],
    upgradeCost: [75, 130]
  },
  nk: {
    id: "nk", name: "Celula NK", shortName: "NK",
    color: "#E84393", colorDark: "#a82d6a", cost: 95, desc: "Citotóxico innato: detecta ausencia de MHC-I, rompe escudos y ejecuta virus con perforina (×2.3). Ultimate: Frenesí citotóxico — perforinas que ignoran escudos.",
    bonusVs: { kind: "virus", mult: 2.3 }, breakShield: true,
    // Ultimate: FRENESÍ CITOTÓXICO — rota como tornado fucsia y
    // dispara una tormenta de perforinas penetrantes que ignoran
    // escudos. 26s de carga.
    specialChargeSec: 26 * 1.15,  // +15%: poderes tardan un poco más en cargar
    specialName: "Frenesí",
    levels: [
      { range: 170, damage: 18, fireRate: 1.2, projectileSpeed: 430, splash: 0, hp: 95 },
      { range: 195, damage: 27, fireRate: 1.4, projectileSpeed: 470, splash: 0, hp: 120 },
      { range: 220, damage: 42, fireRate: 1.7, projectileSpeed: 510, splash: 0, hp: 150 }
    ],
    upgradeCost: [100, 165]
  },
  eosinofilo: {
    id: "eosinofilo", name: "Eosinofilo", shortName: "Eosin",
    color: "#F2774E", colorDark: "#a8401f", cost: 75, desc: "Gránulos de MBP, ECP y EDN atacan parásitos con ADCC; IL-4 e IL-13 potencian la respuesta. Bonus ×2.6 vs parásitos. Ultimate: Descarga de gránulos.",
    bonusVs: { kind: "parasito", mult: 2.6 },
    // Ultimate: DESCARGA DE GRÁNULOS — daño instantáneo a TODOS los
    // enemigos en rango; a los parásitos además les queda un DoT
    // corrosivo fuerte (refuerza el bonus normal vs parásitos).
    specialChargeSec: 28,
    specialName: "Descarga de gránulos",
    levels: [
      { range: 150, damage: 28, fireRate: 1.0, projectileSpeed: 380, splash: 30, hp: 90 },
      { range: 170, damage: 42, fireRate: 1.2, projectileSpeed: 420, splash: 35, hp: 115 },
      { range: 190, damage: 62, fireRate: 1.4, projectileSpeed: 460, splash: 42, hp: 145 }
    ],
    upgradeCost: [95, 150]
  },
  mastocito: {
    id: "mastocito", name: "Mastocito", shortName: "Masto",
    color: "#4F8FE0", colorDark: "#2c5da0", cost: 75, desc: "Desgranula histamina, triptasa y leucotrienos que ralentizan gérmenes en área. Ultimate: Onda de desgranulación — mediadores que paralizan invasores.",
    support: "slow",
    // Ultimate: DESGRANULACIÓN — onda de choque única: daño +
    // ralentización mucho más fuertes que su aura pasiva, en un radio
    // mayor (1.6x del rango normal).
    specialChargeSec: 30,
    specialName: "Desgranulación",
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
    desc: "Tanque que dispara una MALLA de complemento amarilla que ATRAPA y DETIENE a todos los gérmenes en el radio por 3 segundos, dañándolos, e ignora escudos. Se coloca en el CENTRO y patrulla de lado a lado solo.",
    ignoreShield: true,
    manualFire: true,             // el jugador apunta y dispara
    mobile: true,                 // tanque: patrulla automática; se coloca en zonas libres
    immuneToAura: true,           // el aura de contacto no le hace daño
    maxShots: 8,                  // vida = 8 disparos de malla, luego se consume
    specialChargeSec: 30 * 1.15,
    specialName: "Cascada C9",
    // Carga de 30s por disparo (cooldown = 1/fireRate = 30s). damage = DoT/s de
    // la malla; splash = radio; la malla dura 3s (fija). Sin decaimiento por tiempo.
    levels: [
      { range: 400, damage: 28, fireRate: 1 / 30, projectileSpeed: 0, splash: 42, hp: 100, travelTime: 1.1 },
      { range: 460, damage: 40, fireRate: 1 / 30, projectileSpeed: 0, splash: 50, hp: 130, travelTime: 1.0 },
      { range: 520, damage: 56, fireRate: 1 / 30, projectileSpeed: 0, splash: 58, hp: 160, travelTime: 0.95 }
    ],
    upgradeCost: [120, 200]
  },
  plaqueta: {
    id: "plaqueta", name: "Malla de fibrina", shortName: "Fibrina",
    color: "#E8A020", colorDark: "#8A5010", cost: 30,
    desc: "Coágulo de fibrina con tromboxano A2 y factor von Willebrand que obstruye el carril. Ralentiza significativamente el avance enemigo, dando ventaja a las torres aliadas.",
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
  },
  trombo: {
    id: "trombo", name: "Trombo de Respuesta", shortName: "Trombo",
    color: "#C0392B", colorDark: "#6B1410", cost: 45,
    desc: "Plaqueta activada con pseudópodos que empuja gérmenes hacia atrás. Al destruirse libera una bomba de factores de coagulación de alto impacto.",
    // Sin ultimate propio — su payoff es el death-bomb (factores de
    // coagulación liberados) al llegar a 0 HP, no una carga de ultimate.
    // Cada golpe además empuja al germen hacia atrás en el camino
    // (resta progreso — ver knockback en fireTower).
    deathBomb: { dmgMult: 4, radius: 45, delay: 2.0 },
    levels: [
      { range: 95, damage: 10, fireRate: 1.0, projectileSpeed: 0, splash: 0, hp: 180, knockback: 26 },
      { range: 95, damage: 16, fireRate: 1.1, projectileSpeed: 0, splash: 0, hp: 260, knockback: 32 },
      { range: 95, damage: 24, fireRate: 1.2, projectileSpeed: 0, splash: 0, hp: 360, knockback: 40 }
    ],
    upgradeCost: [55, 90]
  },
  centinela: {
    id: "centinela", name: "Centinela de Alarma", shortName: "Centinela",
    color: "#E8A33D", colorDark: "#8A5A12", cost: 35,
    desc: "Receptor PRR/TLR que detecta moléculas asociadas a patógenos y emite alarmas. Actúa como señuelo atrayendo los poderes especiales de los gérmenes hacia sí.",
    decoyAttraction: 2.5,
    specialChargeSec: 22,
    specialName: "Alarma PRR",
    levels: [
      { range: 130, damage: 10, fireRate: 0.6, projectileSpeed: 0, splash: 0, hp: 140 },
      { range: 130, damage: 16, fireRate: 0.7, projectileSpeed: 0, splash: 0, hp: 200 },
      { range: 130, damage: 24, fireRate: 0.8, projectileSpeed: 0, splash: 0, hp: 280 }
    ],
    upgradeCost: [60, 100]
  },
  queratinocito: {
    id: "queratinocito", name: "Nicho Epitelial", shortName: "Epitelio",
    color: "#d4a855", colorDark: "#7a5a18", cost: 70,
    desc: "Nicho epitelial productor. NO dispara: SECRETA defensinas. Aura pasiva ralentiza y buffea Neutrófilos. Tócalo para un TURNO DE TRABAJO: parches antimicrobianos sobre el carril (daño + lentitud). Para sebo lipofílico usa el Sebocito.",
    producer: true,
    defensinField: true,
    specialChargeSec: 14,            // ciclo de producción rápido (turno de trabajo)
    specialName: "Turno de secreción",
    levels: [
      { range: 130, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 130, patch: { count: 2, r: 30, life: 5, dot: 14, slow: true, kind: "defensin" } },
      { range: 150, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 170, patch: { count: 3, r: 34, life: 6, dot: 20, slow: true, kind: "defensin" } },
      { range: 175, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 220, patch: { count: 4, r: 42, life: 8, dot: 38, slow: true, kind: "defensin" } }
    ],
    upgradeCost: [80, 150]
  },
  sebocito: {
    id: "sebocito", name: "Sebocito", shortName: "Sebocito",
    color: "#c8980a", colorDark: "#7a5a04", cost: 80,
    desc: "Produce sebo antimicrobiano (ácidos grasos, escualeno, ceras) formando charcos de DoT continuo. Daño ×3 contra Cutibacterium acnes y dermatofitos.",
    sebumSpecialist: ["cacnes", "dermatofito"],
    specialChargeSec: 28,
    specialName: "Hiperseborrhea",
    levels: [
      { range: 165, damage: 12, fireRate: 0.7, projectileSpeed: 280, splash: 0, hp: 90,  puddle: { r: 32, life: 6, dot: 10 } },
      { range: 185, damage: 18, fireRate: 0.9, projectileSpeed: 300, splash: 0, hp: 115, puddle: { r: 38, life: 7, dot: 15 } },
      { range: 205, damage: 26, fireRate: 1.1, projectileSpeed: 320, splash: 0, hp: 145, puddle: { r: 45, life: 8, dot: 22 } }
    ],
    upgradeCost: [85, 145]
  },
  pdc: {
    id: "pdc", name: "Célula Dendrítica Plasmocitoide", shortName: "pDC",
    color: "#6a3dd4", colorDark: "#3a1a80", cost: 85,
    desc: "Detecta ácidos nucleicos virales vía TLR7/9 y produce IFN-α/β. Ralentiza y debilita virus en rango. Ultimate: Tormenta IFN-α — devastadora contra virus.",
    antiviralAura: true,
    virusPriority: true,
    bonusVs: { kind: "virus", mult: 2.0 },
    specialChargeSec: 32,
    specialName: "Tormenta IFN-α",
    levels: [
      { range: 145, damage: 18, fireRate: 1.0, projectileSpeed: 380, splash: 0, hp: 85 },
      { range: 165, damage: 28, fireRate: 1.2, projectileSpeed: 410, splash: 0, hp: 110 },
      { range: 185, damage: 40, fireRate: 1.4, projectileSpeed: 440, splash: 0, hp: 140 }
    ],
    upgradeCost: [90, 150]
  },
  linfocitogd: {
    id: "linfocitogd", name: "Linfocito γδ", shortName: "γδ T",
    color: "#8bc34a", colorDark: "#4a6e18", cost: 100,
    desc: "Reconoce antígenos no peptídicos sin presentación por MHC, priorizando patógenos heridos. Bonus ×1.6 vs bacterias y hongos; IL-17 bufa todas las torres cercanas.",
    huntWounded: true,
    bonusVsKinds: ["bacteria", "hongo"],
    bonusVsMult: 1.6,
    specialChargeSec: 30,
    specialName: "Cascada IL-17",
    levels: [
      { range: 140, damage: 32, fireRate: 1.1, projectileSpeed: 400, splash: 0, hp: 100 },
      { range: 160, damage: 50, fireRate: 1.3, projectileSpeed: 440, splash: 0, hp: 130 },
      { range: 180, damage: 72, fireRate: 1.5, projectileSpeed: 480, splash: 0, hp: 165 }
    ],
    upgradeCost: [105, 170]
  },
  // ======================================================================
  // FASE 2 — TORRES DE ÓRGANO. Cada nivel F2 desbloquea 3 células
  // residentes propias del tejido. No aparecen en el dock fuera de su
  // órgano (ver f2TowerAllowed): son población local, no circulante.
  // ======================================================================
  // ---- ENDOCARDITIS (válvula) -----------------------------------------
  endotelial: {
    id: "endotelial", name: "Célula Endotelial Valvular", shortName: "Endotelio",
    color: "#5fa8b8", colorDark: "#25525e", cost: 70,
    f2Organ: "endocarditis",
    desc: "Reviste la valva. NO dispara: SELLA. Su aura impide que los gérmenes se adhieran y DESHACE la vegetación ya formada en su rango. Tócala para un turno de reendotelización: repara el velo valvular dañado.",
    producer: true,
    antiVegetation: 0.55,          // capas/seg que disuelve en rango
    valveRepair: 1,                // puntos de valva que repara por turno
    specialChargeSec: 16,
    specialName: "Reendotelización",
    levels: [
      { range: 120, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 150 },
      { range: 145, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 200 },
      { range: 170, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 265 }
    ],
    upgradeCost: [80, 145]
  },
  monocito: {
    id: "monocito", name: "Monocito Patrullero", shortName: "Monocito",
    color: "#8a7fc8", colorDark: "#3b3470", cost: 85,
    f2Organ: "endocarditis",
    desc: "Patrulla el endotelio rodando sobre la valva. Daño moderado, pero ARRANCA a los gérmenes adheridos: cada impacto le quita una capa de vegetación al objetivo y lo despega del velo.",
    stripVegetation: 1,
    patrols: { radius: 46, speed: 26 },
    specialChargeSec: 24,
    specialName: "Rodamiento adhesivo",
    levels: [
      { range: 135, damage: 22, fireRate: 1.5, projectileSpeed: 400, splash: 0, hp: 120 },
      { range: 155, damage: 33, fireRate: 1.7, projectileSpeed: 430, splash: 0, hp: 155 },
      { range: 175, damage: 48, fireRate: 2.0, projectileSpeed: 460, splash: 0, hp: 195 }
    ],
    upgradeCost: [90, 155]
  },
  macrofagoCardiaco: {
    id: "macrofagoCardiaco", name: "Macrófago Cardíaco Residente", shortName: "MΦ cardíaco",
    color: "#c9634f", colorDark: "#6a2618", cost: 110,
    f2Organ: "endocarditis",
    desc: "Macrófago CCR2− de origen embrionario: fagocita y además CONDUCE el impulso, acelerando la cadencia de las torres vecinas (+25%). Ultimate: descarga de conducción — todas las torres en rango disparan a la vez.",
    conductionAura: 0.25,
    specialChargeSec: 30,
    specialName: "Descarga de conducción",
    levels: [
      { range: 145, damage: 34, fireRate: 0.8, projectileSpeed: 340, splash: 26, hp: 210 },
      { range: 165, damage: 52, fireRate: 0.95, projectileSpeed: 370, splash: 32, hp: 275 },
      { range: 190, damage: 76, fireRate: 1.1, projectileSpeed: 400, splash: 40, hp: 350 }
    ],
    upgradeCost: [115, 185]
  },
  // ---- OSTEOMIELITIS (hueso) ------------------------------------------
  osteoclasto: {
    id: "osteoclasto", name: "Osteoclasto", shortName: "Osteoclasto",
    color: "#c08a4a", colorDark: "#603c14", cost: 100,
    f2Organ: "osteomielitis",
    desc: "Célula multinucleada que acidifica su laguna de Howship y RESORBE hueso. Único que rompe SECUESTROS óseos: sin él, los gérmenes escondidos en hueso muerto son intocables. Daño en área y ×2 contra estructuras.",
    breaksSequestrum: true,
    bonusVsStructure: 2.0,
    specialChargeSec: 26,
    specialName: "Laguna de Howship",
    // El Osteoclasto es el ÚNICO cañón del pozo: el Osteoblasto produce y el
    // Osteocito revela, ninguno de los dos hace daño. Con el reparto de
    // Endocarditis (dos armas) el nivel quedaba dos olas corto, así que el
    // arma única pega más fuerte y más seguido para emparejar la rama.
    levels: [
      { range: 125, damage: 50, fireRate: 0.72, projectileSpeed: 300, splash: 34, hp: 190 },
      { range: 145, damage: 78, fireRate: 0.90, projectileSpeed: 330, splash: 42, hp: 245 },
      { range: 165, damage: 115, fireRate: 1.08, projectileSpeed: 360, splash: 52, hp: 310 }
    ],
    upgradeCost: [105, 175]
  },
  osteoblasto: {
    id: "osteoblasto", name: "Osteoblasto", shortName: "Osteoblasto",
    color: "#d8c89a", colorDark: "#7a6c40", cost: 75,
    f2Organ: "osteomielitis",
    desc: "Deposita matriz osteoide: NO dispara, CONSTRUYE. Tócalo para levantar un INVOLUCRO — muro de hueso nuevo que bloquea el carril y hay que romper para pasar. El muro se degrada, pero se puede volver a levantar.",
    producer: true,
    buildsWall: { hp: 260, life: 26, w: 54, h: 14 },
    specialChargeSec: 18,
    specialName: "Involucro",
    levels: [
      { range: 130, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 160 },
      { range: 150, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 210 },
      { range: 175, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 280 }
    ],
    upgradeCost: [85, 150]
  },
  osteocito: {
    id: "osteocito", name: "Osteocito (red canalicular)", shortName: "Osteocito",
    color: "#9fb0c4", colorDark: "#3f4c5e", cost: 80,
    f2Organ: "osteomielitis",
    desc: "Vive dentro de la laguna ósea y extiende dendritas por los canalículos. No pelea: DETECTA. Revela gérmenes intraóseos y ocultos en un radio amplio y los marca (+30% de daño recibido).",
    revealsHidden: true,
    markAmplify: 0.30,
    specialChargeSec: 28,
    specialName: "Red canalicular",
    levels: [
      { range: 175, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 95 },
      { range: 205, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 125 },
      { range: 240, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 160 }
    ],
    upgradeCost: [85, 145]
  },
  // ---- ARTRITIS SÉPTICA (articulación) --------------------------------
  sinoviocitoA: {
    id: "sinoviocitoA", name: "Sinoviocito tipo A (macrofágico)", shortName: "Sinov. A",
    color: "#6fa8b0", colorDark: "#2b565c", cost: 90,
    f2Organ: "artritis",
    desc: "Macrófago residente de la membrana sinovial: limpia detritus y fagocita lo que flota en la cavidad. Daño sólido y ×1.5 contra gérmenes que están comiendo cartílago.",
    bonusVsCartilageEater: 1.5,
    specialChargeSec: 27,
    specialName: "Aclaramiento sinovial",
    levels: [
      { range: 140, damage: 30, fireRate: 1.2, projectileSpeed: 390, splash: 18, hp: 150 },
      { range: 160, damage: 46, fireRate: 1.4, projectileSpeed: 420, splash: 24, hp: 195 },
      { range: 180, damage: 66, fireRate: 1.6, projectileSpeed: 450, splash: 30, hp: 245 }
    ],
    upgradeCost: [95, 160]
  },
  sinoviocitoB: {
    id: "sinoviocitoB", name: "Sinoviocito tipo B (fibroblástico)", shortName: "Sinov. B",
    color: "#b9d46a", colorDark: "#5a6c22", cost: 70,
    f2Organ: "artritis",
    desc: "Secreta ácido hialurónico y lubricina. NO dispara: ESPESA el líquido sinovial. Los gérmenes en su rango se arrastran (−45% velocidad) y el cartílago bajo su aura recibe la mitad del daño.",
    producer: true,
    viscosityField: { slow: 0.45, cartilageShield: 0.5 },
    specialChargeSec: 20,
    specialName: "Bolo de hialurónico",
    levels: [
      { range: 135, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 130 },
      { range: 160, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 170 },
      { range: 185, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 220 }
    ],
    upgradeCost: [80, 140]
  },
  condrocito: {
    id: "condrocito", name: "Condrocito", shortName: "Condrocito",
    color: "#e2e8ea", colorDark: "#7d8a90", cost: 95,
    f2Organ: "artritis",
    desc: "La única célula del cartílago. No ataca ni se defiende: REPARA. Regenera lentamente el cartílago articular perdido — la única forma de revertir el daño de la fase. Frágil: protegelo.",
    repairsCartilage: 0.10,        // puntos de cartílago por segundo
    specialChargeSec: 34,
    specialName: "Matriz de colágeno II",
    levels: [
      { range: 120, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 90 },
      { range: 140, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 120 },
      { range: 160, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 155 }
    ],
    upgradeCost: [100, 170]
  },
  // ---- FASE 3-5: una residente por familia de complicación ------------
  macrofagoAlveolar: {
    id: "macrofagoAlveolar", name: "Macrófago Alveolar", shortName: "MΦ alveolar",
    color: "#e0a0b0", colorDark: "#6e3a46", cost: 95,
    f2Organ: "embolia",
    desc: "Centinela del lecho capilar. Atrapa émbolos: los gérmenes marcados como fragmento reciben ×2.2 de daño y ya no pueden volver a partirse en su rango.",
    bonusVsFragment: 2.2,
    stopsFragmentation: true,
    specialChargeSec: 26,
    specialName: "Barrido capilar",
    levels: [
      { range: 155, damage: 30, fireRate: 1.2, projectileSpeed: 400, splash: 22, hp: 150 },
      { range: 175, damage: 46, fireRate: 1.4, projectileSpeed: 430, splash: 28, hp: 195 },
      { range: 200, damage: 66, fireRate: 1.6, projectileSpeed: 460, splash: 36, hp: 250 }
    ],
    upgradeCost: [100, 165]
  },
  fibroblastoEncap: {
    id: "fibroblastoEncap", name: "Fibroblasto Encapsulante", shortName: "Fibroblasto",
    color: "#c8b088", colorDark: "#5e4c2c", cost: 85,
    f2Organ: "absceso",
    desc: "Teje la pared del absceso. NO dispara: CONTIENE. Las colecciones en su rango dejan de sembrar y se drenan solas. Ultimate: encapsula y revienta todas las colecciones cercanas.",
    producer: true,
    sealsAbscess: 22,              // puntos de drenaje por segundo
    specialChargeSec: 22,
    specialName: "Encapsulación",
    levels: [
      { range: 150, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 175 },
      { range: 175, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 230 },
      { range: 205, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 300 }
    ],
    upgradeCost: [90, 155]
  },
  dendriticaMigratoria: {
    id: "dendriticaMigratoria", name: "Célula Dendrítica Migratoria", shortName: "DC migratoria",
    color: "#9fd0c8", colorDark: "#31615a", cost: 100,
    f2Organ: "difusion",
    desc: "Recorre los territorios como los gérmenes que persigue. Marca a todo el que MIGRA (+45% de daño recibido) y su marca viaja con el germen aunque cambie de carril.",
    marksMigrators: 0.45,
    globalMark: true,
    specialChargeSec: 28,
    specialName: "Presentación cruzada",
    levels: [
      { range: 165, damage: 26, fireRate: 1.3, projectileSpeed: 420, splash: 0, hp: 130 },
      { range: 190, damage: 40, fireRate: 1.5, projectileSpeed: 450, splash: 0, hp: 170 },
      { range: 215, damage: 58, fireRate: 1.7, projectileSpeed: 480, splash: 0, hp: 215 }
    ],
    upgradeCost: [105, 175]
  },
  tregSepsis: {
    id: "tregSepsis", name: "Linfocito T Regulador", shortName: "Treg",
    color: "#8fd8a8", colorDark: "#2e6640", cost: 110,
    f2Organ: "tormenta",
    desc: "El freno del sistema inmune. No mata: APAGA. Baja la tormenta de citoquinas de forma continua (IL-10 y TGF-β) y repara a las torres que la propia inflamación está quemando.",
    producer: true,
    calmsStorm: 3.5,               // puntos de tormenta por segundo
    healsTowers: 0.02,             // fracción de vida por segundo
    specialChargeSec: 30,
    specialName: "Descarga de IL-10",
    levels: [
      { range: 160, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 160 },
      { range: 185, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 210 },
      { range: 215, damage: 0, fireRate: 0, projectileSpeed: 0, splash: 0, hp: 275 }
    ],
    upgradeCost: [115, 185]
  }
};
var MAC_COST = 5;   // fragmentos de complemento para ensamblar el cañón
var TOWER_LIST = ["neutrofilo", "queratinocito", "mastocito", "langerhans", "nk", "eosinofilo",
  "linfocitoB", "sebocito", "pdc", "linfocitoT", "linfocitogd",
  "complemento", "centinela",
  // Residentes de órgano (Fase 2) — visibles en el Dex siempre, en el dock
  // solo dentro de su órgano (ver isUnlocked/f2Organ).
  "endotelial", "monocito", "macrofagoCardiaco",
  "osteoclasto", "osteoblasto", "osteocito",
  "sinoviocitoA", "sinoviocitoB", "condrocito",
  "macrofagoAlveolar", "fibroblastoEncap", "dendriticaMigratoria", "tregSepsis"];
var F2_ORGAN_TOWERS = {
  endocarditis:  ["endotelial", "monocito", "macrofagoCardiaco"],
  osteomielitis: ["osteoclasto", "osteoblasto", "osteocito"],
  artritis:      ["sinoviocitoA", "sinoviocitoB", "condrocito"]
};
var TOWER_GROUPS = [
  { id: "defensas",      label: "Defensas",      towers: ["neutrofilo", "nk", "eosinofilo", "linfocitoB",
                                                          "linfocitoT", "sebocito", "linfocitogd",
                                                          "monocito", "macrofagoCardiaco", "osteoclasto", "sinoviocitoA",
                                                          "macrofagoAlveolar", "dendriticaMigratoria"] },
  { id: "potenciadores", label: "Potenciadores", towers: ["queratinocito", "mastocito", "langerhans", "pdc",
                                                          "endotelial", "osteocito", "sinoviocitoB", "condrocito",
                                                          "fibroblastoEncap", "tregSepsis"] },
  { id: "tanques",       label: "Tanques",       towers: ["complemento", "centinela", "osteoblasto"] }
];
var LOADOUT_LIMITS = { towers: 5, tanks: 2, barriers: 1 };
  root.towerDefs = TOWER_DEFS;
  root.macCost = MAC_COST;
  root.towerList = TOWER_LIST;
  root.f2OrganTowers = F2_ORGAN_TOWERS;
  root.towerGroups = TOWER_GROUPS;
  root.loadoutLimits = LOADOUT_LIMITS;
})(window.ImmunoDefenseData);
