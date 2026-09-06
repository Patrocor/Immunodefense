(function (root) {
root.storageKeys = {
  meta: "immunodefense_meta",
  campaign: "immunodefense_campaign_v1",
  achievements: "immunodefense_achievements_v1",
  vistos: "immunodefense_pathogens_seen_v3",
  muted: "immunodefense_muted",
  legacyVistos: ["immunodefense_pathogens_seen", "immunodefense_pathogens_seen_v2"]
};
root.metaDefaults = {
  totalPathogensDefeated: 0,
  totalPathogensInfiltrated: 0,
  wavesReached: 1,
  highestLevelReached: 1
};
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
  },
  trombo: {
    strong: "Empuja a los gérmenes en cada golpe (knockback real)",
    weak: "Daño bajo por sí solo — su verdadero golpe es la bomba al romperse",
    synergyWith: ["langerhans"],
    potentiates: [],
    bestIn: ["piel"],
    affinity: "Plaquetario · Coagulación"
  },
  centinela: {
    strong: "Atrae los poderes especiales de los gérmenes (señuelo)",
    weak: "Daño casi nulo — protege a las otras torres, no remata",
    synergyWith: ["langerhans"],
    potentiates: [],
    bestIn: ["piel"],
    affinity: "Centinela · Señuelo"
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
  vih:            { strong: "Escudo spike: solo Linfocito T lo atraviesa de verdad",
                    weak:   "Linfocito T (citotóxico), NK (rompe escudos virales)" },
  dermatofito:    { strong: "Suelta esporas hijas que cazan torres directamente",
                    weak:   "Eosinófilo (hongos), rematarlo antes de que esporule" },
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
var COMPENDIUM_LEGACY_IDS = ["bacteria", "virus", "hongo", "boss", "bossBacteria", "bossVirus", "bossHongo"];
root.towerLore = TOWER_LORE;
root.enemyLore = ENEMY_LORE;
root.macrofagoLibreDef = MACROFAGO_LIBRE_DEF;
root.compendiumLegacyIds = COMPENDIUM_LEGACY_IDS;
})(window.ImmunoDefenseData);
