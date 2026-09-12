(function (root) {
  root.mapCompletedLabels = {
    fase1: {
      title:    "FASE 1 SUPERADA",
      subtitle: "La infección alcanzó el torrente sanguíneo"
    },
    dissem: {
      title:    "DISEMINACIÓN COMPLETA",
      subtitle: "El órgano diana ha sido comprometido"
    },
    endocarditis: {
      title:    "ENDOCARDITIS",
      subtitle: "Corazón comprometido — héroes en la circulación"
    },
    osteomielitis: {
      title:    "OSTEOMIELITIS",
      subtitle: "Hueso comprometido — héroes en la circulación"
    },
    artritis: {
      title:    "ARTRITIS",
      subtitle: "Articulación comprometida — héroes en la circulación"
    },
    sepsis: {
      title:    "SEPSIS SISTÉMICA",
      subtitle: "Todo converge — héroes y gérmenes frente a frente"
    },
    mods: {
      title:    "SHOCK SÉPTICO",
      subtitle: "Falla multiorgánica · boss final"
    }
  };
  root.mapNodes = [
    { key: "fase1",  x: 0.05, y: 0.32, label: "Fase 1",       color: "#ffb19a", branch: "stem" },
    { key: "dissem", x: 0.14, y: 0.32, label: "Diseminación", color: "#e84343", branch: "stem" },
    { key: "endocarditis",  x: 0.26, y: 0.10, label: "Endocarditis",  sub: "corazón",       color: "#c1416a", branch: "f2" },
    { key: "osteomielitis", x: 0.26, y: 0.32, label: "Osteomielitis", sub: "hueso",         color: "#c8a070", branch: "f2" },
    { key: "artritis",      x: 0.26, y: 0.54, label: "Artritis",      sub: "articulación",  color: "#8ec5d0", branch: "f2" },
    { key: "f3_pulm",   x: 0.46, y: 0.03, label: "Pulm.",   sub: "émbolos sépticos",   color: "#e8a3b3", branch: "f3", parent: "endocarditis" },
    { key: "f3_cereb",  x: 0.46, y: 0.10, label: "Cereb.",  sub: "émbolos sépticos",   color: "#a8b8e8", branch: "f3", parent: "endocarditis" },
    { key: "f3_bazo",   x: 0.46, y: 0.17, label: "Bazo",    sub: "émbolos sépticos",   color: "#a85090", branch: "f3", parent: "endocarditis" },
    { key: "f3_epid",   x: 0.46, y: 0.25, label: "Epidur.", sub: "absceso espinal",    color: "#a08070", branch: "f3", parent: "osteomielitis" },
    { key: "f3_bact",   x: 0.46, y: 0.32, label: "Bact.",   sub: "bact. persistente",  color: "#b8232a", branch: "f3", parent: "osteomielitis" },
    { key: "f3_fasc",   x: 0.46, y: 0.39, label: "Fascit.", sub: "fascitis necr.",     color: "#c87090", branch: "f3", parent: "osteomielitis" },
    { key: "f3_multi",  x: 0.46, y: 0.47, label: "Multi.",  sub: "pioartritis dis.",   color: "#8ec5d0", branch: "f3", parent: "artritis" },
    { key: "f3_osloc",  x: 0.46, y: 0.54, label: "Os. loc", sub: "osteo. adyacente",   color: "#c8a070", branch: "f3", parent: "artritis" },
    { key: "f3_pust",   x: 0.46, y: 0.61, label: "Pust.",   sub: "pustulosis",         color: "#e8b09a", branch: "f3", parent: "artritis" },
    { key: "sepsis", x: 0.70, y: 0.32, label: "SEPSIS", sub: "sistémica", color: "#ff5550", branch: "converge" },
    { key: "mods",   x: 0.88, y: 0.32, label: "SHOCK",  sub: "MODS · boss", color: "#7a0010", branch: "boss" }
  ];
  root.mapEdges = [
    { from: "fase1",  to: "dissem", group: "stem" },
    { from: "dissem", to: "endocarditis",  group: "fork-f2" },
    { from: "dissem", to: "osteomielitis", group: "fork-f2" },
    { from: "dissem", to: "artritis",      group: "fork-f2" },
    { from: "endocarditis",  to: "f3_pulm",   group: "fan-f3" },
    { from: "endocarditis",  to: "f3_cereb",  group: "fan-f3" },
    { from: "endocarditis",  to: "f3_bazo",   group: "fan-f3" },
    { from: "osteomielitis", to: "f3_epid",   group: "fan-f3" },
    { from: "osteomielitis", to: "f3_bact",   group: "fan-f3" },
    { from: "osteomielitis", to: "f3_fasc",   group: "fan-f3" },
    { from: "artritis",      to: "f3_multi",  group: "fan-f3" },
    { from: "artritis",      to: "f3_osloc",  group: "fan-f3" },
    { from: "artritis",      to: "f3_pust",   group: "fan-f3" },
    { from: "f3_pulm",  to: "sepsis", group: "converge" },
    { from: "f3_cereb", to: "sepsis", group: "converge" },
    { from: "f3_bazo",  to: "sepsis", group: "converge" },
    { from: "f3_epid",  to: "sepsis", group: "converge" },
    { from: "f3_bact",  to: "sepsis", group: "converge" },
    { from: "f3_fasc",  to: "sepsis", group: "converge" },
    { from: "f3_multi", to: "sepsis", group: "converge" },
    { from: "f3_osloc", to: "sepsis", group: "converge" },
    { from: "f3_pust",  to: "sepsis", group: "converge" },
    { from: "sepsis", to: "mods", group: "boss-link" }
  ];
  root.mapProgression = [
    "fase1", "dissem",
    "endocarditis", "osteomielitis", "artritis",
    "sepsis",
    "mods"
  ];
})(window.ImmunoDefenseData);
