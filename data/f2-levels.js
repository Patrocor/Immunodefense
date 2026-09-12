(function (root) {
var F2_LEVELS = {
  // ---------------------------------------------------------------- CORAZÓN
  endocarditis: {
    key: "endocarditis",
    label: "ENDOCARDITIS",
    organLabel: "VÁLVULA MITRAL",
    subtitle: "El endotelio valvular está sembrado",
    color: "#c1416a", colorDark: "#5e1730", colorLight: "#f0a0b8",
    tint: "rgba(193, 65, 106, 0.10)",
    bg: ["#2a0d16", "#4a1526", "#7a2038"],
    // EMBUDO: entra todo a lo ancho (sin arrastre lateral) y se navega solo
    // hacia abajo. Los 5 carriles nacen abiertos en la aurícula y se cierran
    // sobre la valva: el espacio se angosta a medida que el germen avanza.
    stretchX: 1.00, stretchY: 1.60,
    converge: 0.55,
    laneXs: [0.08, 0.29, 0.50, 0.71, 0.92],
    foci: ["Velo anterior", "Comisura anterior", "Cuerda tendinosa", "Comisura posterior", "Velo posterior"],
    bow: 0.030,
    entryYn: 0.05, exitYn: 0.95,
    integrityLabel: "VÁLVULA",
    integrityMax: 100,
    arrivalDamage: 7,          // cuánta integridad cuesta cada germen que llega
    ambient: "corazon",
    mechanic: "pulso",
    // Latido lento y contable: ~23 lpm. Avisa medio segundo antes (telegraph)
    // y pega fuerte. Entre sístole y sístole hay tiempo real para decidir.
    pulseCycle: 2.6,
    pulseSystoleFrac: 0.18,
    pulseTelegraph: 0.19,      // fracción del ciclo en que la valva se tensa
    pulsePush: 20,
    vegBeatsPerLayer: 2,       // dos latidos aguantado = una capa
    vegBossAt: 3,              // tres capas = vegetación madura
    mechanicName: "FLUJO PULSÁTIL",
    mechanicDesc: "Cada sístole empuja a los gérmenes hacia atrás. El que aguanta dos latidos teje una capa de VEGETACIÓN; a las tres capas madura y se blinda.",
    baseName: "Nódulo Sinusal",
    baseShort: "Marcapasos",
    basePowerName: "SÍSTOLE FORZADA",
    basePowerDesc: "Contracción máxima: barre todos los carriles y arranca una capa de vegetación a cada germen.",
    basePowerCd: 26,
    towers: ["endotelial", "monocito", "macrofagoCardiaco"],
    germPool: ["viridans", "enterococo", "hacek"],
    startAtp: 220,
    // 135 gérmenes en total, igualado con las otras dos ramas de Fase 2:
    // se juega UNA sola por partida, así que el volumen tiene que ser
    // parejo — la diferencia la pone la forma del ambiente, no la cantidad.
    // Los 7 que se sumaron van al arranque, que estaba muy flaco (la ola 1
    // tenía 4 gérmenes), no al final, que ya viene cargado.
    waves: [
      [["viridans", 6, 1.9]],
      [["viridans", 6, 1.6], ["hacek", 4, 1.3]],
      [["viridans", 6, 1.5], ["hacek", 5, 1.1], ["enterococo", 3, 2.0]],
      [["viridans", 6, 1.3], ["hacek", 5, 1.0], ["enterococo", 3, 1.7], ["saureus", 2, 1.6]],
      [["viridans", 6, 1.2], ["hacek", 6, 0.95], ["enterococo", 4, 1.5], ["bossPyogenes", 1, 4.0]],
      [["viridans", 7, 1.1], ["hacek", 6, 0.9], ["enterococo", 5, 1.35], ["saureus", 4, 1.3]],
      [["viridans", 8, 1.0], ["hacek", 7, 0.85], ["enterococo", 5, 1.25], ["bossMRSA", 1, 3.5]],
      [["viridans", 9, 0.95], ["hacek", 8, 0.8], ["enterococo", 6, 1.15], ["saureus", 5, 1.2], ["bossEndocarditis", 1, 4.0]]
    ],
    // Gérmenes que se FILTRAN al cerrar cada ola (ya dentro, tras tu línea).
    leak: [1, 1, 2, 2, 3, 3, 4, 2]
  },
  // ------------------------------------------------------------------ HUESO
  osteomielitis: {
    key: "osteomielitis",
    label: "OSTEOMIELITIS",
    organLabel: "DIÁFISIS FEMORAL",
    subtitle: "La infección bajó al canal medular",
    color: "#c8a070", colorDark: "#5e4620", colorLight: "#efdcb4",
    tint: "rgba(200, 160, 112, 0.10)",
    bg: ["#1c1710", "#3a3020", "#5e5030"],
    // EL POZO: el canal medular es angosto y hondo. Tres carriles en vez de
    // cinco, mucha profundidad, cortical gruesa a los costados. Entra todo a
    // lo ancho — no se arrastra de lado, solo se baja.
    stretchX: 1.00, stretchY: 2.00,
    laneXs: [0.27, 0.50, 0.73],
    foci: ["Canal de Havers", "Cavidad medular", "Canal de Volkmann"],
    // Secuestros FIJOS: se ven desde el arranque y siempre están donde
    // mismo. El canal central es el más obstruido; los laterales tienen
    // menos, pero uno bien profundo cada uno.
    sequestra: [
      { lane: 1, yn: 0.24, r: 34, hp: 140 },
      { lane: 0, yn: 0.34, r: 28, hp: 110 },
      { lane: 2, yn: 0.34, r: 28, hp: 110 },
      { lane: 1, yn: 0.52, r: 38, hp: 160 },
      { lane: 0, yn: 0.68, r: 30, hp: 130 },
      { lane: 2, yn: 0.68, r: 30, hp: 130 },
      { lane: 1, yn: 0.80, r: 32, hp: 150 }
    ],
    // El pozo NO serpentea: es un canal recto y angosto (ver comentario de
    // arriba, "solo se baja") — cualquier wobble contradice esa anatomía.
    // Los otros órganos (embudo valvular, cámara articular) sí curvan
    // porque su propia estructura lo pide; este no.
    bow: 0,
    entryYn: 0.04, exitYn: 0.96,
    integrityLabel: "CORTICAL",
    integrityMax: 100,
    arrivalDamage: 6,
    ambient: "hueso",
    mechanic: "secuestro",
    mechanicName: "SECUESTRO ÓSEO",
    mechanicDesc: "Siete islas de hueso muerto, siempre en el mismo lugar, protegen a los gérmenes que las pisan. Decidí de antemano: ¿las rompés con el Osteoclasto o convivís y revelás con el Osteocito?",
    baseName: "Canal Nutricio",
    baseShort: "Canal",
    basePowerName: "BROTE VASCULAR",
    basePowerDesc: "Angiogénesis de urgencia: irriga el hueso, cura a todas tus células y entrega un pulso de ATP.",
    basePowerCd: 30,
    towers: ["osteoclasto", "osteoblasto", "osteocito"],
    germPool: ["aureusSCV", "salmonelaOsea", "kingella"],
    startAtp: 240,
    waves: [
      [["kingella", 5, 1.5]],
      [["kingella", 6, 1.3], ["aureusSCV", 3, 1.8]],
      [["kingella", 6, 1.2], ["aureusSCV", 4, 1.6], ["salmonelaOsea", 3, 1.5]],
      [["kingella", 7, 1.1], ["aureusSCV", 5, 1.4], ["salmonelaOsea", 4, 1.35], ["bossClostridium", 1, 4.0]],
      [["kingella", 8, 1.0], ["aureusSCV", 6, 1.3], ["salmonelaOsea", 5, 1.25], ["saureus", 3, 1.4]],
      [["kingella", 8, 0.95], ["aureusSCV", 7, 1.2], ["salmonelaOsea", 6, 1.15], ["bossMRSA", 1, 3.5]],
      [["kingella", 8, 0.9], ["aureusSCV", 7, 1.1], ["salmonelaOsea", 5, 1.1], ["saureus", 4, 1.25]],
      [["kingella", 8, 0.85], ["aureusSCV", 8, 1.0], ["salmonelaOsea", 6, 1.05], ["bossBrodie", 1, 4.0]]
    ],
    leak: [1, 2, 2, 3, 3, 4, 4, 2]
  },
  // ----------------------------------------------------------- ARTICULACIÓN
  artritis: {
    key: "artritis",
    label: "ARTRITIS SÉPTICA",
    organLabel: "CAVIDAD SINOVIAL",
    subtitle: "La rodilla está caliente y tensa",
    color: "#8ec5d0", colorDark: "#2e565e", colorLight: "#d4eef4",
    tint: "rgba(142, 197, 208, 0.10)",
    bg: ["#0e1e22", "#1d3a42", "#2f5c66"],
    // LA CÁMARA: recinto cerrado, ancho y bajo. Casi todo entra de una sola
    // vista — no es un túnel que se recorre, es un espacio que se vigila.
    // Los gérmenes entran por el borde de la cápsula y van todos al centro,
    // donde está el cartílago.
    stretchX: 1.00, stretchY: 1.20,
    radial: true,
    radialSpanDeg: 165,        // arco de entradas: izquierda → techo → derecha
    radialCore: 0.12,          // radio del núcleo cartilaginoso
    laneXs: [0.12, 0.31, 0.50, 0.69, 0.88],
    foci: ["Receso suprapatelar", "Compartimento medial", "Escotadura intercondílea", "Compartimento lateral", "Bursa poplítea"],
    bow: 0.034,
    entryYn: 0.05, exitYn: 0.95,
    integrityLabel: "CÁPSULA",
    integrityMax: 100,
    arrivalDamage: 6,
    // BARRERA CAPSULAR (estilo Zuma): la cámara es cerrada y los gérmenes
    // entran por todo el arco a la vez — sin esto, "por todos lados" no
    // tiene ningún obstáculo físico, solo torres. Cada tanto, un pliegue
    // de la cápsula se tensa y bloquea un carril entero hasta que algo lo
    // rompe (los propios gérmenes lo muerden al chocar, igual que un
    // Involucro) — obliga a reencauzar el enjambre en vez de dejarlo
    // avanzar en línea recta al cartílago.
    capsuleBarrier: { intervalSec: 15, hp: 85, w: 34, h: 34, maxActive: 2, atFrac: 0.30 },
    ambient: "articulacion",
    mechanic: "cartilago",
    mechanicName: "CARTÍLAGO ARTICULAR",
    mechanicDesc: "Cada germen VIVO en la cavidad va comiendo cartílago, llegue o no al fondo. Si el cartílago se agota, perdés la articulación.",
    baseName: "Membrana Sinovial",
    baseShort: "Sinovial",
    basePowerName: "LAVADO ARTICULAR",
    basePowerDesc: "Artrocentesis: drena el líquido y arrastra a todos los gérmenes de vuelta hacia el receso.",
    basePowerCd: 28,
    towers: ["sinoviocitoA", "sinoviocitoB", "condrocito"],
    germPool: ["gonoArticular", "borrelia", "pyogenesArt"],
    startAtp: 230,
    cartilageMax: 100,
    cartilageRate: 0.55,       // puntos/seg por cada germen "cartilageEater 1.0"
    // 135 gérmenes, igualado con las otras dos ramas. Los 6 que entran van
    // al arranque: en la cámara el cartílago se come desde el primer germen
    // vivo, así que las olas iniciales flacas no enseñaban la mecánica.
    waves: [
      [["gonoArticular", 6, 1.7]],
      [["gonoArticular", 6, 1.5], ["borrelia", 4, 1.6]],
      [["gonoArticular", 6, 1.4], ["borrelia", 5, 1.4], ["pyogenesArt", 3, 1.9]],
      [["gonoArticular", 6, 1.25], ["borrelia", 5, 1.3], ["pyogenesArt", 3, 1.7], ["bossPyogenes", 1, 4.0]],
      [["gonoArticular", 7, 1.15], ["borrelia", 6, 1.2], ["pyogenesArt", 4, 1.5], ["neisseria", 3, 1.4]],
      [["gonoArticular", 8, 1.05], ["borrelia", 6, 1.1], ["pyogenesArt", 5, 1.4], ["bossPseudomonas", 1, 3.5]],
      [["gonoArticular", 9, 1.0], ["borrelia", 7, 1.05], ["pyogenesArt", 6, 1.3], ["saureus", 4, 1.3]],
      [["gonoArticular", 9, 0.95], ["borrelia", 8, 1.0], ["pyogenesArt", 7, 1.2], ["bossPannus", 1, 4.0]]
    ],
    leak: [1, 1, 2, 2, 3, 3, 4, 2]
  }
};
// ======================= FASE 3 · COMPLICACIONES ========================
// Nueve focos secundarios, tres por cada F2. Comparten el motor pero traen
// tres mecanismos nuevos, agrupados por familia:
//   · "embolia"  — el germen se FRAGMENTA y siembra a distancia (corazón).
//   · "absceso"  — se forman colecciones de pus que hay que drenar (hueso).
//   · "difusion" — los gérmenes MIGRAN entre carriles (articulación).
// Cada familia trae su propia célula residente.
var F3_COMMON = {
  integrityMax: 100,
  startAtp: 260,
  bow: 0.028,
  entryYn: 0.05, exitYn: 0.95
};
function f3Level(o) {
  var lv = {};
  for (var k in F3_COMMON) if (F3_COMMON.hasOwnProperty(k)) lv[k] = F3_COMMON[k];
  for (var k2 in o) if (o.hasOwnProperty(k2)) lv[k2] = o[k2];
  return lv;
}
// Curva de olas compartida por la Fase 3: 7 olas, in crescendo, con boss
// en la 4 y en la 7. Cada nivel inyecta su propio trío de gérmenes.
function f3Waves(a, b, c, boss1, boss2) {
  return [
    [[a, 5, 1.5]],
    [[a, 6, 1.3], [b, 3, 1.6]],
    [[a, 6, 1.2], [b, 4, 1.4], [c, 2, 1.8]],
    [[a, 7, 1.1], [b, 5, 1.3], [c, 3, 1.6], [boss1, 1, 4.0]],
    [[a, 8, 1.0], [b, 6, 1.2], [c, 4, 1.4]],
    [[a, 9, 0.95], [b, 7, 1.1], [c, 5, 1.3], [boss1, 1, 3.5]],
    [[a, 10, 0.9], [b, 8, 1.0], [c, 6, 1.2], [boss2, 1, 4.0]]
  ];
}
var F3_LEAK = [1, 2, 2, 3, 3, 4, 2];
var F3_LEVELS = {
  // ---- Familia EMBOLIA (hijas de Endocarditis) ------------------------
  f3_pulm: f3Level({
    key: "f3_pulm", ambient: "alveolo", label: "ÉMBOLOS PULMONARES", organLabel: "LECHO CAPILAR PULMONAR",
    subtitle: "La vegetación se soltó y viajó a los pulmones",
    color: "#e8a3b3", colorDark: "#6e3a46", colorLight: "#ffd8e2",
    tint: "rgba(232, 163, 179, 0.10)", bg: ["#2a1a20", "#4a2c36", "#6e4450"],
    stretchX: 1.50, stretchY: 1.40,
    laneXs: [0.10, 0.30, 0.50, 0.70, 0.90],
    foci: ["Lóbulo superior D", "Lóbulo medio", "Língula", "Lóbulo inferior I", "Pleura"],
    integrityLabel: "PARÉNQUIMA", arrivalDamage: 6,
    mechanic: "embolia", mechanicName: "SIEMBRA EMBÓLICA",
    mechanicDesc: "Los émbolos se FRAGMENTAN al avanzar: cada uno se parte en crías que caen más adelante, ya pasada tu línea.",
    baseName: "Red Capilar Alveolar", baseShort: "Capilar",
    basePowerName: "RECLUTAMIENTO MARGINAL",
    basePowerDesc: "Vacía el pool marginado de neutrófilos del pulmón: daña todo lo que flota en el lecho capilar.",
    basePowerCd: 27,
    towers: ["macrofagoAlveolar"],
    germPool: ["emboloSeptico", "viridans", "saureus"],
    waves: f3Waves("emboloSeptico", "viridans", "saureus", "bossPyogenes", "bossEndocarditis"),
    leak: F3_LEAK
  }),
  f3_cereb: f3Level({
    key: "f3_cereb", ambient: "cerebro", label: "ÉMBOLOS CEREBRALES", organLabel: "CIRCULACIÓN CEREBRAL",
    subtitle: "La siembra alcanzó la barrera hematoencefálica",
    color: "#a8b8e8", colorDark: "#3a4468", colorLight: "#dde5ff",
    tint: "rgba(168, 184, 232, 0.10)", bg: ["#141828", "#252d48", "#3a4468"],
    stretchX: 1.45, stretchY: 1.45,
    laneXs: [0.11, 0.30, 0.50, 0.70, 0.89],
    foci: ["Arteria cerebral media", "Territorio frontal", "Ganglios basales", "Territorio parietal", "Seno venoso"],
    integrityLabel: "BARRERA HE", arrivalDamage: 8,
    mechanic: "embolia", mechanicName: "MICROEMBOLIA CEREBRAL",
    mechanicDesc: "Territorio sin margen: cada germen que llega cuesta el doble. Los émbolos se fragmentan en el árbol arterial.",
    baseName: "Barrera Hematoencefálica", baseShort: "BHE",
    basePowerName: "CIERRE DE UNIONES",
    basePowerDesc: "Sella las uniones estrechas: frena en seco a todo lo que circula y protege el parénquima.",
    basePowerCd: 30,
    towers: ["macrofagoAlveolar"],
    germPool: ["emboloSeptico", "viridans", "hacek"],
    waves: f3Waves("emboloSeptico", "viridans", "hacek", "bossPyogenes", "bossEndocarditis"),
    leak: F3_LEAK
  }),
  f3_bazo: f3Level({
    key: "f3_bazo", ambient: "bazo", label: "INFARTOS ESPLÉNICOS", organLabel: "PULPA ROJA DEL BAZO",
    subtitle: "El filtro del cuerpo quedó tapado de émbolos",
    color: "#a85090", colorDark: "#4a1c40", colorLight: "#e8b0da",
    tint: "rgba(168, 80, 144, 0.10)", bg: ["#1e1020", "#3a1c38", "#5c2c54"],
    stretchX: 1.40, stretchY: 1.35,
    laneXs: [0.12, 0.31, 0.50, 0.69, 0.88],
    foci: ["Polo superior", "Hilio", "Pulpa roja", "Pulpa blanca", "Polo inferior"],
    integrityLabel: "PULPA", arrivalDamage: 5,
    mechanic: "embolia", mechanicName: "FILTRO ESPLÉNICO",
    mechanicDesc: "El bazo filtra: los gérmenes se acumulan en cordones y se fragmentan. Aguantás más golpes, pero llegan muchos más.",
    baseName: "Cordones de Billroth", baseShort: "Cordones",
    basePowerName: "PURGA DEL FILTRO",
    basePowerDesc: "Los macrófagos del cordón vacían el filtro de golpe: daño masivo a todo lo acumulado.",
    basePowerCd: 26,
    towers: ["macrofagoAlveolar"],
    germPool: ["emboloSeptico", "enterococo", "saureus"],
    waves: f3Waves("emboloSeptico", "enterococo", "saureus", "bossMRSA", "bossEndocarditis"),
    leak: F3_LEAK
  }),
  // ---- Familia ABSCESO (hijas de Osteomielitis) -----------------------
  f3_epid: f3Level({
    key: "f3_epid", ambient: "epidural", label: "ABSCESO EPIDURAL", organLabel: "ESPACIO EPIDURAL",
    subtitle: "El pus comprime la médula espinal",
    color: "#a08070", colorDark: "#40302a", colorLight: "#dcc4b4",
    tint: "rgba(160, 128, 112, 0.10)", bg: ["#181210", "#332822", "#4e3c33"],
    stretchX: 1.25, stretchY: 1.75,
    laneXs: [0.15, 0.33, 0.50, 0.67, 0.85],
    foci: ["Nivel cervical", "Nivel torácico alto", "Nivel torácico bajo", "Nivel lumbar", "Nivel sacro"],
    integrityLabel: "MÉDULA ESPINAL", arrivalDamage: 8,
    mechanic: "absceso", mechanicName: "COLECCIÓN PURULENTA",
    mechanicDesc: "El pus se acumula en bolsas sobre el carril. Cada bolsa que madura SIEMBRA gérmenes nuevos hasta que la drenás.",
    baseName: "Plexo Venoso de Batson", baseShort: "Plexo",
    basePowerName: "DRENAJE DE URGENCIA",
    basePowerDesc: "Descomprime el espacio epidural: revienta todas las colecciones y aturde lo que estaba dentro.",
    basePowerCd: 28,
    towers: ["fibroblastoEncap"],
    germPool: ["aureusSCV", "bacteroides", "salmonelaOsea"],
    waves: f3Waves("aureusSCV", "bacteroides", "salmonelaOsea", "bossBrodie", "bossMRSA"),
    leak: F3_LEAK
  }),
  f3_bact: f3Level({
    key: "f3_bact", ambient: "sangre", label: "BACTERIEMIA PERSISTENTE", organLabel: "TORRENTE SANGUÍNEO",
    subtitle: "Los hemocultivos siguen positivos",
    color: "#b8232a", colorDark: "#4e0d10", colorLight: "#ff8a90",
    tint: "rgba(184, 35, 42, 0.10)", bg: ["#20080c", "#420f16", "#661822"],
    stretchX: 1.60, stretchY: 1.30,
    laneXs: [0.09, 0.29, 0.50, 0.71, 0.91],
    foci: ["Vena cava", "Cavidades derechas", "Circulación menor", "Cavidades izquierdas", "Aorta"],
    integrityLabel: "HEMODINAMIA", arrivalDamage: 5,
    mechanic: "absceso", mechanicName: "FOCO NO DRENADO",
    mechanicDesc: "Mientras exista un foco sin drenar, la sangre se resiembra sola. Las bolsas aparecen más rápido que en ningún otro nivel.",
    baseName: "Catéter Central", baseShort: "Catéter",
    basePowerName: "RECAMBIO DE CATÉTER",
    basePowerDesc: "Retira la fuente: destruye toda colección activa y limpia el biofilm del torrente.",
    basePowerCd: 25,
    towers: ["fibroblastoEncap"],
    germPool: ["saureus", "enterococo", "bacteroides"],
    waves: f3Waves("saureus", "enterococo", "bacteroides", "bossMRSA", "bossEndocarditis"),
    leak: [2, 2, 3, 3, 4, 4, 3]
  }),
  f3_fasc: f3Level({
    key: "f3_fasc", ambient: "fascia", label: "FASCITIS NECROSANTE", organLabel: "FASCIA PROFUNDA",
    subtitle: "El plano fascial se está licuando",
    color: "#c87090", colorDark: "#521c30", colorLight: "#ffb0c8",
    tint: "rgba(200, 112, 144, 0.10)", bg: ["#200c14", "#421826", "#66283c"],
    stretchX: 1.55, stretchY: 1.35,
    laneXs: [0.10, 0.30, 0.50, 0.70, 0.90],
    foci: ["Plano superficial", "Fascia de Scarpa", "Plano profundo", "Vaina muscular", "Compartimento"],
    integrityLabel: "FASCIA", arrivalDamage: 9,
    mechanic: "absceso", mechanicName: "AVANCE POR EL PLANO",
    mechanicDesc: "La necrosis corre por la fascia: las colecciones se propagan a los carriles vecinos si no las cortás a tiempo.",
    baseName: "Desbridamiento Quirúrgico", baseShort: "Desbridar",
    basePowerName: "DESBRIDAMIENTO AMPLIO",
    basePowerDesc: "Corte quirúrgico: elimina el tejido necrótico y todo lo que estaba encima de él.",
    basePowerCd: 32,
    towers: ["fibroblastoEncap"],
    germPool: ["pyogenesArt", "bacteroides", "salmonelaOsea"],
    waves: f3Waves("pyogenesArt", "bacteroides", "salmonelaOsea", "bossClostridium", "bossPyogenes"),
    leak: F3_LEAK
  }),
  // ---- Familia DIFUSIÓN (hijas de Artritis) ---------------------------
  f3_multi: f3Level({
    key: "f3_multi", ambient: "articulacion", label: "PIOARTRITIS DISEMINADA", organLabel: "VARIAS ARTICULACIONES",
    subtitle: "Ya no es una rodilla: son todas",
    color: "#8ec5d0", colorDark: "#2a4e56", colorLight: "#d8f2f8",
    tint: "rgba(142, 197, 208, 0.10)", bg: ["#0e1c20", "#1c363e", "#2c545e"],
    stretchX: 1.55, stretchY: 1.45,
    laneXs: [0.10, 0.30, 0.50, 0.70, 0.90],
    foci: ["Hombro", "Codo", "Cadera", "Rodilla", "Tobillo"],
    integrityLabel: "APARATO LOCOMOTOR", arrivalDamage: 6,
    mechanic: "difusion", mechanicName: "ARTRITIS MIGRATORIA",
    mechanicDesc: "Los gérmenes SALTAN de articulación en articulación. Defender un carril no sirve: hay que cubrir el conjunto.",
    baseName: "Circulación Sinovial", baseShort: "Circulación",
    basePowerName: "PULSO DE CORTICOIDE",
    basePowerDesc: "Apaga la inflamación en todas las articulaciones: frena y debilita a todo el tablero a la vez.",
    basePowerCd: 30,
    towers: ["dendriticaMigratoria"],
    germPool: ["gonoArticular", "borrelia", "kingella"],
    waves: f3Waves("gonoArticular", "borrelia", "kingella", "bossPannus", "bossPyogenes"),
    leak: F3_LEAK
  }),
  f3_osloc: f3Level({
    key: "f3_osloc", ambient: "hueso", label: "OSTEOMIELITIS ADYACENTE", organLabel: "HUESO SUBCONDRAL",
    subtitle: "La infección cruzó del cartílago al hueso",
    color: "#c8a070", colorDark: "#5a4424", colorLight: "#f0dcb8",
    tint: "rgba(200, 160, 112, 0.10)", bg: ["#1a1610", "#332c1e", "#4e4430"],
    stretchX: 1.35, stretchY: 1.60,
    laneXs: [0.13, 0.32, 0.50, 0.68, 0.87],
    foci: ["Cartílago calcificado", "Placa subcondral", "Metáfisis", "Fisis", "Epífisis"],
    integrityLabel: "HUESO SUBCONDRAL", arrivalDamage: 7,
    mechanic: "difusion", mechanicName: "PASO TRANSCORTICAL",
    mechanicDesc: "Los gérmenes atraviesan la placa subcondral saltando de carril. Mezclan la lógica del hueso con la de la articulación.",
    baseName: "Placa Subcondral", baseShort: "Placa",
    basePowerName: "ESCLEROSIS REACTIVA",
    basePowerDesc: "El hueso se endurece: frena a todos y repara la placa dañada.",
    basePowerCd: 29,
    towers: ["dendriticaMigratoria"],
    germPool: ["aureusSCV", "kingella", "pyogenesArt"],
    waves: f3Waves("aureusSCV", "kingella", "pyogenesArt", "bossBrodie", "bossPannus"),
    leak: F3_LEAK
  }),
  f3_pust: f3Level({
    key: "f3_pust", ambient: "piel", label: "PUSTULOSIS DISEMINADA", organLabel: "PIEL DE TODO EL CUERPO",
    subtitle: "La siembra volvió a la superficie",
    color: "#e8b09a", colorDark: "#6a4034", colorLight: "#ffdccc",
    tint: "rgba(232, 176, 154, 0.10)", bg: ["#241812", "#452e24", "#6a4838"],
    stretchX: 1.60, stretchY: 1.35,
    laneXs: [0.09, 0.29, 0.50, 0.71, 0.91],
    foci: ["Tronco", "Palmas", "Extremidad superior", "Plantas", "Extremidad inferior"],
    integrityLabel: "TEGUMENTO", arrivalDamage: 4,
    mechanic: "difusion", mechanicName: "BROTE PUSTULOSO",
    mechanicDesc: "Cada germen que sobrevive salta a otra región y abre una pústula nueva. Es una carrera contra la dispersión.",
    baseName: "Plexo Dérmico", baseShort: "Plexo",
    basePowerName: "BARRIDO DÉRMICO",
    basePowerDesc: "Moviliza toda la inmunidad cutánea: daña y frena cada pústula abierta del tablero.",
    basePowerCd: 24,
    towers: ["dendriticaMigratoria"],
    germPool: ["gonoArticular", "saureus", "kingella"],
    waves: f3Waves("gonoArticular", "saureus", "kingella", "bossMRSA", "bossPannus"),
    leak: F3_LEAK
  })
};
// ==================== FASE 4-5 · SEPSIS Y SHOCK =========================
var F45_LEVELS = {
  sepsis: {
    key: "sepsis", ambient: "tormenta", label: "SEPSIS SISTÉMICA", organLabel: "TODO EL ORGANISMO",
    subtitle: "La respuesta se volvió contra el huésped",
    color: "#ff5550", colorDark: "#5e1210", colorLight: "#ffb0a8",
    tint: "rgba(255, 85, 80, 0.10)", bg: ["#1c0808", "#4a1410", "#7a2418"],
    stretchX: 1.70, stretchY: 1.55,
    laneXs: [0.08, 0.29, 0.50, 0.71, 0.92],
    foci: ["Pulmón", "Riñón", "Hígado", "Coagulación", "Cerebro"],
    bow: 0.032, entryYn: 0.04, exitYn: 0.96,
    integrityLabel: "PERFUSIÓN", integrityMax: 120, arrivalDamage: 6,
    mechanic: "tormenta", mechanicName: "TORMENTA DE CITOQUINAS",
    mechanicDesc: "Tu propia respuesta te está matando: las torres pierden vida sola mientras la tormenta esté alta. Bajar la tormenta importa tanto como matar gérmenes.",
    baseName: "Eje Neuroinmune", baseShort: "Eje",
    basePowerName: "REFLEJO COLINÉRGICO",
    basePowerDesc: "El nervio vago frena la tormenta de golpe: corta el daño autoinmune y cura a tus células.",
    basePowerCd: 26,
    towers: ["tregSepsis"],
    germPool: ["saureus", "pseudomonas", "enterococo", "bacteroides"],
    startAtp: 300,
    waves: [
      [["saureus", 6, 1.2], ["pseudomonas", 3, 1.5]],
      [["saureus", 7, 1.1], ["pseudomonas", 4, 1.3], ["bacteroides", 3, 1.5]],
      [["saureus", 8, 1.0], ["enterococo", 4, 1.3], ["bacteroides", 4, 1.3], ["bossMRSA", 1, 4.0]],
      [["saureus", 9, 0.95], ["pseudomonas", 6, 1.1], ["enterococo", 5, 1.2], ["bacteroides", 5, 1.2]],
      [["saureus", 10, 0.9], ["pseudomonas", 7, 1.0], ["enterococo", 6, 1.1], ["bossEndocarditis", 1, 4.0]],
      [["saureus", 11, 0.85], ["pseudomonas", 8, 0.95], ["bacteroides", 7, 1.05], ["bossBrodie", 1, 4.0]],
      [["saureus", 12, 0.8], ["pseudomonas", 9, 0.9], ["enterococo", 8, 1.0], ["bossPannus", 1, 4.0]],
      [["saureus", 14, 0.75], ["pseudomonas", 10, 0.85], ["bacteroides", 9, 0.95],
       ["bossMRSA", 1, 3.0], ["bossPyogenes", 1, 3.0]]
    ],
    leak: [2, 3, 3, 4, 4, 5, 5, 3]
  },
  mods: {
    key: "mods", ambient: "colapso", label: "SHOCK SÉPTICO · MODS", organLabel: "FALLA MULTIORGÁNICA",
    subtitle: "Último acto — todo o nada",
    color: "#7a0010", colorDark: "#2e0006", colorLight: "#ff6a70",
    tint: "rgba(122, 0, 16, 0.12)", bg: ["#12000a", "#33020e", "#5c0614"],
    stretchX: 1.75, stretchY: 1.70,
    laneXs: [0.08, 0.29, 0.50, 0.71, 0.92],
    foci: ["Falla respiratoria", "Falla renal", "Falla hepática", "CID", "Encefalopatía"],
    bow: 0.036, entryYn: 0.03, exitYn: 0.97,
    integrityLabel: "VIDA", integrityMax: 150, arrivalDamage: 7,
    mechanic: "tormenta", mechanicName: "FALLA MULTIORGÁNICA",
    mechanicDesc: "Cinco órganos fallando a la vez y la tormenta al máximo. El Patógeno Primordial cierra la partida.",
    baseName: "Reanimación", baseShort: "Reanimar",
    basePowerName: "PROTOCOLO DE REANIMACIÓN",
    basePowerDesc: "Fluidos, vasopresores y antibiótico de amplio espectro: recupera perfusión y castiga a todo el tablero.",
    basePowerCd: 30,
    towers: ["tregSepsis"],
    germPool: ["saureus", "pseudomonas", "enterococo", "bacteroides", "candida"],
    startAtp: 340,
    waves: [
      [["saureus", 8, 1.0], ["pseudomonas", 5, 1.2], ["candida", 3, 1.4]],
      [["saureus", 9, 0.95], ["pseudomonas", 6, 1.1], ["bacteroides", 5, 1.2], ["bossMRSA", 1, 4.0]],
      [["saureus", 10, 0.9], ["enterococo", 7, 1.05], ["candida", 5, 1.2], ["bossBrodie", 1, 4.0]],
      [["saureus", 12, 0.85], ["pseudomonas", 8, 1.0], ["bacteroides", 7, 1.1], ["bossPannus", 1, 4.0]],
      [["saureus", 13, 0.8], ["pseudomonas", 9, 0.95], ["enterococo", 8, 1.0], ["bossEndocarditis", 1, 4.0]],
      [["saureus", 15, 0.75], ["pseudomonas", 11, 0.9], ["candida", 8, 1.0],
       ["bossMRSA", 1, 3.0], ["bossPyogenes", 1, 3.0]],
      [["saureus", 16, 0.7], ["pseudomonas", 12, 0.85], ["bacteroides", 10, 0.95],
       ["bossPrimordial", 1, 5.0]]
    ],
    leak: [3, 3, 4, 4, 5, 5, 3]
  }
};
for (var f3k in F3_LEVELS) if (F3_LEVELS.hasOwnProperty(f3k)) F2_LEVELS[f3k] = F3_LEVELS[f3k];
for (var f45k in F45_LEVELS) if (F45_LEVELS.hasOwnProperty(f45k)) F2_LEVELS[f45k] = F45_LEVELS[f45k];
var F2_TO_F3 = {
  endocarditis:  ["f3_pulm", "f3_cereb", "f3_bazo"],
  osteomielitis: ["f3_epid", "f3_bact", "f3_fasc"],
  artritis:      ["f3_multi", "f3_osloc", "f3_pust"]
};
  root.f2Levels = F2_LEVELS;
  root.f2ToF3 = F2_TO_F3;
})(window.ImmunoDefenseData);
