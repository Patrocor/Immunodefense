(function (root) {
  // Sistema visual Fase 1 — roles de torre, marcos por baseKind y glifos de counter.
  // Consumido por game.js (drawTowerRoleFrame, drawGermKindFrame, drawGermCounterGlyphs).

  root.phase1TowerVisuals = {
    neutrofilo:   { role: "fagocito",   label: "PMN",    glyph: "star",     arc: "#B79CE0", silhouette: "polarized", labelKit: "Polarizado+ÑAM" },
    queratinocito:{ role: "productor",  label: "Barrera", glyph: "gear",     arc: "#d4a855", silhouette: "strata", labelKit: "Escamas+Muro córneo" }, // LOCKED v3 user OK "Queda"
    mastocito:    { role: "control",    label: "Ralent.",glyph: "snowflake",arc: "#4F8FE0", silhouette: "horseshoe", labelKit: "Herradura+Desgranulación", bodyScale: 1.1 },
    langerhans:   { role: "marca",      label: "APC",    glyph: "target",   arc: "#3FC1C9", silhouette: "dendrite", labelKit: "Estrella+Araña MHC" },
    nk:           { role: "citotoxico", label: "NK",     glyph: "perforin", arc: "#E84393", silhouette: "lgl", labelKit: "Hachazo+Frenesí" }, // LOCKED v2 user OK "Queda"
    eosinofilo:   { role: "parasito",   label: "Eosino", glyph: "granule",  arc: "#F2774E", silhouette: "bilobe", labelKit: "Perdigones+Descarga" },
    linfocitoB:   { role: "opsoniza",   label: "Ig",     glyph: "antibody", arc: "#50C878", silhouette: "round", labelKit: "Latigazos+Puñetazos" },
    linfocitoT:   { role: "apoptosis",  label: "CD8",    glyph: "cross",    arc: "#9370DB", silhouette: "teardrop", labelKit: "Cachetadas+Coscorrones" },
    sebocito:     { role: "sebo",       label: "Sebo",   glyph: "droplet",  arc: "#c8980a", silhouette: "sac", labelKit: "Hinchazón+Volcán" },
    pdc:          { role: "interferon", label: "IFN",    glyph: "wave",     arc: "#6a3dd4", silhouette: "beacon", labelKit: "Faro+Tormenta" },
    linfocitogd:  { role: "cazador",    label: "γδ",     glyph: "delta",    arc: "#8bc34a", silhouette: "classic", labelKit: "δ+Cadena+Cascada", bodyScale: 1.1 },
    complemento:  { role: "tanque",     label: "MAC",    glyph: "net",      arc: "#FFD24A", silhouette: "siege", labelKit: "Catapulta+Cascada" },
  };

  // Marco exterior por familia biológica (solo Fase 1 piel).
  root.germKindFrames = {
    bacteria:  { dash: [5, 4],  segments: 2,  notch: "capsule" },
    virus:     { dash: [],      segments: 6,  notch: "hex" },
    hongo:     { dash: [3, 5],  segments: 0,  notch: "bud" },
    parasito:  { dash: [6, 3],  segments: 1,  notch: "teardrop" },
    primordial:{ dash: [2, 2],  segments: 8,  notch: "hex" }
  };

  // Glifos de debilidad/counter sobre gérmenes (sustituyen emoji).
  root.germCounterGlyphs = {
    cloaked:    { glyph: "eye",      color: "#ffe082" },
    opsonized:  { glyph: "antibody", color: "#7dffb0" },
    virusShield:{ glyph: "shieldT",  color: "#ce93d8" },
    parasito:   { glyph: "worm",     color: "#ffcc80" },
    grease:     { glyph: "droplet",  color: "#d8c060" },
    amastigote: { glyph: "bang",     color: "#aed581" }
  };

  // Siluetas signature de gérmenes oleada 1 (referencia / futuros filtros).
  root.phase1GermVisuals = {
    sepidermidis: { silhouette: "diplochain", accent: "#90A4AE", label: "Biofilm" },
    cacnes:       { silhouette: "follicle",   accent: "#C9A66B", label: "Folículo" },
    hsv:          { silhouette: "vesicle",    accent: "#9575CD", label: "Ampolla" },
    molluscum:    { silhouette: "bivalve",    accent: "#e8d6c0", label: "Concha" },
    demodex:      { silhouette: "poremite",   accent: "#c8a86a", label: "Poro" },
    saureus:      { silhouette: "grape",      accent: "#F9A825", label: "Racimo" },
    malassezia:   { silhouette: "fan",        accent: "#d8c060", label: "Abanico" },
    dermatofito:  { silhouette: "ringworm",   accent: "#9CA85A", label: "Tiña" },
    neisseria:    { silhouette: "coffeebean", accent: "#d47c3a", label: "Pili" },
    hpv:          { silhouette: "wart",       accent: "#8a9a5e", label: "Verruga" },
    sarna:        { silhouette: "tortoise",   accent: "#8a5a2b", label: "Galería" },
    leishmania:   { silhouette: "eel",         accent: "#7aaa44", label: "Vacuola" },
    candida:      { silhouette: "germtube",    accent: "#EC407A", label: "Tubo" },
    pseudomonas:  { silhouette: "monotrich",   accent: "#26A69A", label: "Piocianina+T3SS", labelKit: "Spray+Esporas" },
    bossPyogenes: { silhouette: "coccihook",    accent: "#C62828", label: "Cuerno" },
    bossPseudomonas: { silhouette: "ecthyma", accent: "#00ACC1", label: "Ectima" },
    bossClostridium: { silhouette: "flytrap", accent: "#6a7a48", label: "Fauces" },
    bossMRSA: { silhouette: "grape", accent: "#E0A820", label: "Megaracimo" }
  };

  // Pistas de counter por germen Fase 1 (pip inferior).
  root.phase1GermHints = {
    sepidermidis: { glyph: "net",        color: "#90A4AE", tip: "Puñetazos" },
    cacnes:       { glyph: "droplet",    color: "#c8980a", tip: "×3 Sebo" },
    dermatofito:  { glyph: "droplet", color: "#c8980a", tip: "×3 Sebo" },
    demodex:      { glyph: "target",  color: "#3FC1C9", tip: "Marca APC" },
    hsv:          { glyph: "perforin",color: "#E84393", tip: "×2.3 NK" },
    hpv:          { glyph: "perforin",color: "#E84393", tip: "NK escudo" },
    molluscum:    { glyph: "cross",   color: "#9370DB", tip: "CD8" },
    malassezia:   { glyph: "droplet", color: "#d8c060", tip: "Aceite" },
    neisseria:    { glyph: "antibody",color: "#50C878", tip: "×2 Ig" },
    saureus:      { glyph: "antibody",color: "#50C878", tip: "Opsoniza" },
    leishmania:   { glyph: "granule", color: "#F2774E", tip: "×2.6 Eos" },
    sarna:        { glyph: "granule", color: "#F2774E", tip: "Parásito" },
    candida:      { glyph: "star",    color: "#B79CE0", tip: "PMN" },
    pseudomonas:  { glyph: "net",     color: "#FFD24A", tip: "MAC esporas" },
    bossPyogenes: { glyph: "net",     color: "#FFD24A", tip: "MAC" },
    bossPseudomonas: { glyph: "net",  color: "#FFD24A", tip: "MAC" },
    bossClostridium: { glyph: "star", color: "#B79CE0", tip: "PMN" },
    bossMRSA:        { glyph: "net",  color: "#FFD24A", tip: "MAC" }
  };
})(window.ImmunoDefenseData);
