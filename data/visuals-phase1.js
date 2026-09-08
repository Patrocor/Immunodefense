(function (root) {
  // Sistema visual Fase 1 — roles de torre, marcos por baseKind y glifos de counter.
  // Consumido por game.js (drawTowerRoleFrame, drawGermKindFrame, drawGermCounterGlyphs).

  root.phase1TowerVisuals = {
    neutrofilo:   { role: "fagocito",   label: "PMN",    glyph: "star",     arc: "#B79CE0", silhouette: "polarized" },
    queratinocito:{ role: "productor",  label: "Barrera", glyph: "gear",     arc: "#d4a855", silhouette: "mosaic" },
    mastocito:    { role: "control",    label: "Ralent.",glyph: "snowflake",arc: "#4F8FE0", silhouette: "horseshoe" },
    langerhans:   { role: "marca",      label: "APC",    glyph: "target",   arc: "#3FC1C9" },
    nk:           { role: "citotoxico", label: "NK",     glyph: "perforin", arc: "#E84393" },
    eosinofilo:   { role: "parasito",   label: "Eosino", glyph: "granule",  arc: "#F2774E" },
    linfocitoB:   { role: "opsoniza",   label: "Ig",     glyph: "antibody", arc: "#50C878" },
    linfocitoT:   { role: "apoptosis",  label: "CD8",    glyph: "cross",    arc: "#9370DB" },
    sebocito:     { role: "sebo",       label: "Sebo",   glyph: "droplet",  arc: "#c8980a" },
    pdc:          { role: "interferon", label: "IFN",    glyph: "wave",     arc: "#6a3dd4" },
    linfocitogd:  { role: "cazador",    label: "γδ",     glyph: "delta",    arc: "#8bc34a" },
    complemento:  { role: "tanque",     label: "MAC",    glyph: "net",      arc: "#FFD24A" },
    centinela:    { role: "señuelo",    label: "PRR",    glyph: "beacon",   arc: "#E8A33D" }
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
    neisseria:    { silhouette: "coffeebean", accent: "#d47c3a", label: "Pili" }
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
    sarna:        { glyph: "granule", color: "#F2774E", tip: "Parásito" }
  };
})(window.ImmunoDefenseData);
