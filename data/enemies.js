(function (root) {
var ENEMY_DEFS = {
  // ---- Patógenos cutáneos (Fase 1) -------------------------------------
  saureus: {
    id: "saureus", name: "Staphylococcus aureus", baseKind: "bacteria",
    color: "#F9A825", colorDark: "#9c6e0a", radius: 27,
    speedMult: 0.7, hp: 578, reward: 18, viralAdd: 8, attack: 12, power: { type: "burst", range: 135, cooldown: 4, dmg: 13, slowFire: 3 }, isBoss: false,
    shield: { type: "capsula", maxHP: 5, regenRate: 0, regenDelay: 0, doubleRing: true },
    tooltip: "Staphylococcus aureus se protege con una cápsula polisacárida y puede formar biofilms que dificultan su eliminación. Su capacidad para producir cepas resistentes como la MRSA, inmune a los antibióticos β-lactámicos, la convierte en un oponente peligroso. Los neutrófilos son las células clave para combatirla mediante fagocitosis."
  },
  influenza: {
    id: "influenza", name: "Virus Influenza", baseKind: "virus",
    color: "#66BB6A", colorDark: "#357a32", radius: 9,
    speedMult: 1.5, hp: 165, reward: 10, viralAdd: 6, isBoss: false,
    shield: null,
    tooltip: "El Virus Influenza A utiliza su hemaglutinina para adherirse a las células del huésped y su neuraminidasa para escapar de ellas, mutando con frecuencia para evadir el sistema inmunitario. Su capacidad de cambio rápido lo convierte en un desafío para los linfocitos T citotóxicos, que deben reconocer y atacar a los virus infectados con precisión."
  },
  vih: {
    id: "vih", name: "Virus VIH", baseKind: "virus",
    color: "#7B1FA2", colorDark: "#3e0e54", radius: 11,
    speedMult: 1.0, hp: 297, reward: 20, viralAdd: 8, isBoss: false,
    shield: { type: "spike", maxHP: 4, regenRate: 4 / 12, regenDelay: 0, requiresT: true },
    tooltip: "El VIH-1 utiliza sus proteínas gp120 y gp41 para adherirse a los receptores de las células CD4+, infiltrándose y tomando el control de estas células clave del sistema inmunológico. Su capacidad para evadir la respuesta inmune es notable, pero los Linfocitos T citotóxicos son los especialistas capacitados para reconocer y eliminar a este virus invasor."
  },
  candida: {
    id: "candida", name: "Candida albicans", baseKind: "hongo",
    color: "#EC407A", colorDark: "#7a1d3e", radius: 27,
    speedMult: 0.9, hp: 413, reward: 15, viralAdd: 8, attack: 6, power: { type: "catapult", range: 150, cooldown: 5, dmg: 32 }, isBoss: false,
    shield: { type: "wall", maxHP: 4, regenRate: 0, regenDelay: 0 },
    tooltip: "Candida albicans es un hongo dimorfo que puede cambiar de forma levadura a hifa para adaptarse a diferentes entornos y evadir al sistema inmune. Su pared celular, compuesta por β-glucanos y quitina, actúa como escudo protector que dificulta la acción de las células fagocíticas especializadas en combatirlo."
  },
  dermatofito: {
    id: "dermatofito", name: "Trichophyton rubrum", shortName: "Dermatofito", baseKind: "hongo",
    color: "#9CA85A", colorDark: "#5E6A2C", radius: 23,
    speedMult: 0.85, hp: 352, reward: 14, viralAdd: 7, attack: 5, isBoss: false,
    shield: { type: "wall", maxHP: 2, regenRate: 0, regenDelay: 0 },
    spore: { interval: 3.2, childHpFrac: 0.2, childSpeedMult: 1.9, maxChildren: 5, huntsTowers: true, huntDmg: 18 },
    tooltip: "Trichophyton rubrum secreta queratinasas para degradar la queratina de las células huésped, penetrando en las capas más profundas de la piel. Sus conidios resistentes pueden esparcirse y dar origen a esporas hijas que atacan con ferocidad las torres más cercanas."
  },
  // ---- Patógenos cutáneos (Fase 1 = infección de piel) ---------------
  sepidermidis: {
    id: "sepidermidis", name: "Staphylococcus epidermidis", baseKind: "bacteria",
    color: "#90A4AE", colorDark: "#546E7A", radius: 27,
    speedMult: 1.3, hp: 132, reward: 6, viralAdd: 4, attack: 3, isBoss: false,
    shield: null,
    tentacles: { range: 70, dmg: 7, interval: 1.8, pulses: 3, pulseGap: 0.22 },
    tooltip: "Staphylococcus epidermidis es un oportunista de la flora normal que aprovecha las defensas debilitadas; su capacidad para formar biofilms en prótesis y superficies médicas lo hace persistente. Rápido y débil, pero cuando pasa junto a una torre saca SEUDÓPODOS y le mete puñetazos."
  },
  hsv: {
    id: "hsv", name: "Herpes simplex (HSV)", baseKind: "virus",
    color: "#9575CD", colorDark: "#4527A0", radius: 26,
    speedMult: 1.55, hp: 143, reward: 9, viralAdd: 6, attack: 4, isBoss: false,
    shield: null,
    tooltip: "El Virus Herpes Simple se esconde en los ganglios nerviosos, permaneciendo latente y listo para reactivarse en cualquier momento. Su envoltura viral está equipada con glicoproteínas que facilitan la fusión con las células huésped — los linfocitos T citotóxicos son los especialistas para eliminarlo."
  },
  cacnes: {
    id: "cacnes", name: "Cutibacterium acnes", baseKind: "bacteria",
    color: "#C9A66B", colorDark: "#7a5c33", colorLight: "#E8D2A8", radius: 20,
    speedMult: 0.7, hp: 308, reward: 12, viralAdd: 6, attack: 4, isBoss: false,
    shield: { type: "wall", maxHP: 2, regenRate: 0, regenDelay: 0 },
    tooltip: "Cutibacterium acnes prospera en los folículos pilosos produciendo porfirinas y lipasas que le permiten explotar este entorno rico en sebo. Aunque se mueve lentamente, su biofilm parcial lo hace resistente al ataque inmune — el Sebocito multiplica su daño ×3 contra este germen."
  },
  pseudomonas: {
    id: "pseudomonas", name: "Pseudomonas aeruginosa", baseKind: "bacteria",
    color: "#26A69A", colorDark: "#00695C", colorLight: "#80DEEA", radius: 20,
    speedMult: 1.0, hp: 396, reward: 16, viralAdd: 7, attack: 10, power: { type: "spray", range: 115, cooldown: 5, stun: 2.4, dmg: 16 }, isBoss: false,
    shield: { type: "wall", maxHP: 3, regenRate: 3 / 12, regenDelay: 8 },
    seekers: { interval: 7.5, hp: 8, speed: 75, dmg: 22 },   // esporas buscadoras de torres disparadoras (cañón MAC, NK, linfocito B/T, eosinófilo)
    tooltip: "Pseudomonas aeruginosa forma biofilms resistentes en heridas abiertas, libera piocianina que inhibe la función de los neutrófilos, y despliega exotoxina A que interfiere con la síntesis proteica del huésped. Además de su spray paralizante, suelta esporas que vuelan hacia las torres disparadoras para destruirlas."
  },
  // ---- Lote 2: gérmenes de piel con poderes propios ------------------
  sarna: {
    id: "sarna", name: "Sarcoptes scabiei", shortName: "Ácaro sarna", baseKind: "parasito",
    color: "#8a5a2b", colorDark: "#4d3014", colorLight: "#c79a5e", radius: 24,
    speedMult: 1.0, hp: 242, reward: 13, viralAdd: 7, attack: 6, isBoss: false,
    shield: null,
    burrow: { interval: 5.0, duration: 1.5, speedMult: 1.9, surfaceJump: 90 },
    spore: { interval: 4.5, childHpFrac: 0.2, childSpeedMult: 1.6, maxChildren: 3 },
    tooltip: "Sarcoptes scabiei excava galerías en el estrato córneo de la piel, donde deposita sus huevos y se refugia. Al enterrarse se vuelve temporalmente invulnerable — el Eosinófilo lo destroza cuando emerge y la Célula de Langerhans lo delata cuando está escondido."
  },
  hpv: {
    id: "hpv", name: "Virus del papiloma (HPV)", shortName: "HPV", baseKind: "virus",
    color: "#8a9a5e", colorDark: "#4f5a2c", colorLight: "#c2cf90", radius: 25,
    speedMult: 0.6, hp: 396, reward: 15, viralAdd: 8, attack: 6, isBoss: false,
    shield: { type: "wall", maxHP: 4, regenRate: 4 / 9, regenDelay: 3 },
    tooltip: "El Virus del Papiloma Humano se disfraza con una cápside de 72 capsómeros L1/L2; sus proteínas E6 y E7 inactivan a p53 y Rb, los reguladores del ciclo celular. Su coraza de queratina se regenera y amortigua los golpes — la Célula NK es la más efectiva para romperle el escudo."
  },
  molluscum: {
    id: "molluscum", name: "Molluscum contagiosum", shortName: "Molluscum", baseKind: "virus",
    color: "#e8d6c0", colorDark: "#b89a78", colorLight: "#fbf2e6", radius: 24,
    speedMult: 1.0, hp: 187, reward: 11, viralAdd: 6, attack: 4, isBoss: false,
    shield: null,
    spore: { interval: 3.5, childHpFrac: 0.4, childSpeedMult: 1.0, maxChildren: 3 },
    deathSplit: { count: 2, hpFrac: 0.35 },
    tooltip: "El Molluscum contagiosum ha evolucionado proteínas MC159 y MC160 que bloquean activamente la respuesta inmune. Suelta perlas que germinan en nuevos molluscum y, al morir, se divide en dos — los linfocitos T citotóxicos son clave para eliminar las células infectadas."
  },
  malassezia: {
    id: "malassezia", name: "Malassezia", shortName: "Malassezia", baseKind: "hongo",
    color: "#d8c060", colorDark: "#8a7320", colorLight: "#f0e29a", radius: 30,
    speedMult: 0.85, hp: 264, reward: 12, viralAdd: 7, attack: 5, isBoss: false,
    shield: null,
    greaseAura: { range: 95, slowFire: 1.5 },
    tooltip: "Malassezia furfur es una levadura lipofílica que metaboliza los triglicéridos del sebo produciendo ácido oleico, alterando la melanogénesis y causando pitiriasis versicolor y caspa. Su aura sebácea engrasa las torres cercanas reduciendo su cadencia de disparo — el daño bruto es la mejor salida contra este hongo."
  },
  // ---- Nuevos gérmenes de piel (Fase 1) -------------------------------
  demodex: {
    id: "demodex", name: "Demodex folliculorum", shortName: "Demodex", baseKind: "parasito",
    color: "#c8a86a", colorDark: "#7a5c20", colorLight: "#e8d4a0", radius: 21,
    speedMult: 0.55, hp: 110, reward: 7, viralAdd: 3, attack: 2, isBoss: false,
    shield: null,
    cloaked: true,
    zigzag: { amplitude: 18, frequency: 0.9 },
    spore: { interval: 6.0, childHpFrac: 0.25, childSpeedMult: 1.3, maxChildren: 3 },
    tooltip: "Demodex folliculorum produce antígenos que inhiben la respuesta inmune, haciéndolo casi invisible para las torres. Solo las células de Langerhans pueden procesarlo y marcarlo para su destrucción — avanza en zigzag dejando larvas mientras el Eosinófilo lo destroza."
  },
  neisseria: {
    id: "neisseria", name: "Neisseria gonorrhoeae", shortName: "Gonococo", baseKind: "bacteria",
    color: "#d47c3a", colorDark: "#7a4010", colorLight: "#f0b880", radius: 25,
    speedMult: 0.70, hp: 235, reward: 11, viralAdd: 5, attack: 4, isBoss: false,
    shield: null,
    piliAdhesion: { range: 55, slowFire: 4.0, duration: 4.5 },
    tooltip: "Neisseria gonorrhoeae utiliza sus pili tipo IV para adherirse a las células huésped; su variación antigénica de proteínas Opa le permite cambiar constantemente de apariencia. Se adhiere a torres cercanas ralentizando su cadencia — los anticuerpos del Linfocito B neutralizan sus pili (daño ×2)."
  },
  leishmania: {
    id: "leishmania", name: "Leishmania major", shortName: "Leishmania", baseKind: "parasito",
    color: "#7aaa44", colorDark: "#3d5a18", colorLight: "#b8d880", radius: 24,
    speedMult: 1.0, hp: 290, reward: 14, viralAdd: 6, attack: 5, isBoss: false,
    shield: null,
    leishForm: { interval: 7.0, amastigoteDmgMult: 0.10 },
    tooltip: "Leishmania major alterna entre el promastigote flagelado, que se desplaza libremente, y el amastigote, que se esconde dentro de macrófagos suprimiendo la producción de óxido nítrico para sobrevivir. Actúa rápido antes de que cambie de forma y se vuelva casi invulnerable — el Eosinófilo es la mejor defensa."
  },
  // ---- Bosses --------------------------------------------------------
  bossPyogenes: {
    id: "bossPyogenes", name: "Streptococcus pyogenes", baseKind: "bacteria",
    color: "#C62828", colorDark: "#5a0d0d", radius: 40,
    speedMult: 0.8, hp: 1155, reward: 50, viralAdd: 15, attack: 25, power: { type: "burst", range: 165, cooldown: 3, dmg: 24, slowFire: 3 }, isBoss: true,
    shield: { type: "capsula", maxHP: 6, regenRate: 6 / 8, regenDelay: 0 },
    tooltip: "Streptococcus pyogenes utiliza su estreptolisina O/S para destruir membranas celulares y su hialuronidasa para disolver el ácido hialurónico, avanzando por los tejidos y dejando un rastro de necrosis. Su proteína M antifagocítica le permite evadir a los neutrófilos — requiere respuesta completa del sistema inmune."
  },
  bossMRSA: {
    id: "bossMRSA", name: "MRSA", baseKind: "bacteria",
    color: "#424242", colorDark: "#1a1a1a", radius: 48,
    speedMult: 0.6, hp: 2970, reward: 150, viralAdd: 35, attack: 35, power: { type: "spray", range: 165, cooldown: 3, stun: 3, dmg: 28 }, isBoss: true,
    shield: { type: "capsula", maxHP: 10, regenRate: 2 / 6, regenDelay: 0, doubleRing: true, mrsaHalo: true },
    tooltip: "MRSA porta el gen mecA en el cassette SCCmec, lo que le permite esquivar los antibióticos β-lactámicos y resistir la mayoría de los tratamientos convencionales. Combina cápsula, biofilm y resistencia genética — el jefe final de la Fase 1 requiere todo el arsenal inmune disponible."
  },
  bossPseudomonas: {
    id: "bossPseudomonas", name: "Pseudomonas aeruginosa", baseKind: "bacteria",
    color: "#00ACC1", colorDark: "#00606e", colorLight: "#4DD0E1", radius: 38,
    speedMult: 0.9, hp: 1540, reward: 65, viralAdd: 18, attack: 22,     power: { type: "devour", range: 130, cooldown: 11, pull: 1.5 }, isBoss: true,
    seekers: { interval: 8, hp: 10, speed: 82, dmg: 26 },
    shield: { type: "wall", maxHP: 6, regenRate: 6 / 8, regenDelay: 0 },
    tooltip: "Pseudomonas aeruginosa hipervirulenta usa su sistema de secreción tipo III para inyectar exoenzimas directamente en las células huésped, mientras la piocianina bloquea la fagocitosis y su biofilm regenera el escudo continuamente. JEFE de ectima gangrenoso — atrae y devora torres cercanas con su campo de captación."
  },
  bossClostridium: {
    id: "bossClostridium", name: "Clostridium perfringens", baseKind: "bacteria",
    color: "#546E7A", colorDark: "#263238", radius: 40,
    speedMult: 0.55, hp: 1815, reward: 80, viralAdd: 22, attack: 28, power: { type: "devour", range: 120, cooldown: 13, pull: 1.8 }, isBoss: true,
    shield: { type: "wall", maxHP: 5, regenRate: 0, regenDelay: 0 },
    tooltip: "Clostridium perfringens produce la letal α-toxina fosfolipasa C que destruye membranas celulares, causando gangrena gaseosa al producir gas en los tejidos. Avanza lento e implacable — los neutrófilos son los candidatos más eficaces para combatir a este formidable jefe."
  },
  // ==== FASE 2 · ENDOCARDITIS (corazón / válvula mitral) ================
  // Patógenos de la triada clásica de endocarditis infecciosa. Su rasgo
  // común es la ADHESIÓN al endotelio valvular: en vez de solo avanzar,
  // se fijan y construyen VEGETACIÓN (biofilm de fibrina-plaquetas) que
  // los blinda. Hay que despegarlos antes de que la vegetación madure.
  viridans: {
    id: "viridans", name: "Streptococcus viridans", shortName: "S. viridans", baseKind: "bacteria",
    color: "#8fbf6a", colorDark: "#42632c", colorLight: "#c4e39c", radius: 24,
    speedMult: 0.55, hp: 340, reward: 14, viralAdd: 6, attack: 6, isBoss: false,
    shield: null,
    vegetation: { buildRate: 0.18, maxLayers: 4, dmgReducPerLayer: 0.14 },
    tooltip: "Streptococcus viridans llega desde la boca tras un procedimiento dental y se adhiere al endotelio dañado mediante adhesinas FimA. Es el agente clásico de la endocarditis SUBAGUDA: avanza lento pero teje VEGETACIÓN de fibrina y plaquetas que lo blinda capa a capa. Despegalo temprano — cada capa que madura le quita daño a tus torres."
  },
  enterococo: {
    id: "enterococo", name: "Enterococcus faecalis", shortName: "Enterococo", baseKind: "bacteria",
    color: "#c49a3a", colorDark: "#6b5010", colorLight: "#e8cd85", radius: 26,
    speedMult: 0.5, hp: 480, reward: 18, viralAdd: 7, attack: 9, isBoss: false,
    shield: { type: "wall", maxHP: 4, regenRate: 4 / 10, regenDelay: 2 },
    selfHeal: { rate: 0.02, delay: 3.0 },
    vegetation: { buildRate: 0.12, maxLayers: 3, dmgReducPerLayer: 0.12 },
    tooltip: "Enterococcus faecalis es intrínsecamente resistente a cefalosporinas y tolera concentraciones de antibiótico que matarían a otras bacterias. En la válvula se recupera continuamente del daño: si dejás de golpearlo 3 segundos, empieza a regenerar. Requiere presión sostenida, no ráfagas."
  },
  hacek: {
    id: "hacek", name: "Haemophilus (grupo HACEK)", shortName: "HACEK", baseKind: "bacteria",
    color: "#6ab5c4", colorDark: "#22525e", colorLight: "#a8e2ec", radius: 16,
    speedMult: 1.45, hp: 175, reward: 11, viralAdd: 5, attack: 4, isBoss: false,
    shield: null,
    bloodSurf: true,
    zigzag: { amplitude: 22, frequency: 1.4 },
    tooltip: "El grupo HACEK son bacilos gramnegativos exigentes, de crecimiento lento en cultivo pero SURFISTAS en el torrente: aprovechan cada sístole para acelerar. Son pequeños y erráticos; las torres de disparo lento fallan contra ellos. El flujo pulsátil los empuja — cronometrá tu marcapasos."
  },
  bossEndocarditis: {
    id: "bossEndocarditis", name: "S. aureus valvular", shortName: "Aureus valvular", baseKind: "bacteria",
    color: "#a01830", colorDark: "#48060f", colorLight: "#e05a70", radius: 46,
    speedMult: 0.5, hp: 3400, reward: 170, viralAdd: 30, attack: 38,
    power: { type: "burst", range: 175, cooldown: 3.2, dmg: 30, slowFire: 3 }, isBoss: true,
    shield: { type: "capsula", maxHP: 9, regenRate: 9 / 10, regenDelay: 1.5, doubleRing: true },
    vegetation: { buildRate: 0.30, maxLayers: 6, dmgReducPerLayer: 0.10 },
    valveDestroyer: true,
    tooltip: "Staphylococcus aureus sobre válvula nativa causa endocarditis AGUDA: destruye la valva en días, no en semanas. Perfora el velo valvular y siembra émbolos sépticos a distancia. Su vegetación crece el doble de rápido que la de cualquier otro — si la dejás madurar seis capas, la válvula se rompe."
  },
  // ==== FASE 2 · OSTEOMIELITIS (hueso / canales de Havers) ==============
  // Patógenos que sobreviven DENTRO del hueso. El rasgo común es el
  // SECUESTRO: se refugian en hueso muerto/desvitalizado donde las torres
  // no los alcanzan. Hay que romper el secuestro (Osteoclasto) o
  // revelarlos (Osteocito) antes de poder dañarlos.
  aureusSCV: {
    id: "aureusSCV", name: "S. aureus (variante de colonia pequeña)", shortName: "SCV", baseKind: "bacteria",
    color: "#b8a878", colorDark: "#5e5230", colorLight: "#e6dcb8", radius: 20,
    speedMult: 0.45, hp: 420, reward: 16, viralAdd: 6, attack: 7, isBoss: false,
    shield: null,
    cloaked: true,
    intraosseous: { hideEvery: 6.5, hideFor: 3.0 },
    selfHeal: { rate: 0.015, delay: 2.5 },
    tooltip: "Las small colony variants de S. aureus tienen metabolismo deprimido y se esconden DENTRO de osteocitos y osteoblastos, donde ni los antibióticos ni los fagocitos llegan. Reaparecen cuando bajás la guardia. Solo la red canalicular del Osteocito las revela mientras están intracelulares."
  },
  salmonelaOsea: {
    id: "salmonelaOsea", name: "Salmonella typhimurium ósea", shortName: "Salmonella", baseKind: "bacteria",
    color: "#7f9a55", colorDark: "#3a4a20", colorLight: "#bcd48e", radius: 23,
    speedMult: 0.9, hp: 300, reward: 13, viralAdd: 6, attack: 6, isBoss: false,
    shield: { type: "wall", maxHP: 3, regenRate: 0, regenDelay: 0 },
    power: { type: "burst", range: 120, cooldown: 5.5, dmg: 16, slowFire: 2 },
    tooltip: "Salmonella causa osteomielitis con predilección por pacientes con drepanocitosis, donde los infartos óseos dejan hueso muerto listo para colonizar. Sobrevive dentro del macrófago usando su sistema de secreción tipo III, y desde ahí bombardea las células vecinas."
  },
  kingella: {
    id: "kingella", name: "Kingella kingae", shortName: "Kingella", baseKind: "bacteria",
    color: "#c98fb0", colorDark: "#65395a", colorLight: "#efc4dc", radius: 15,
    speedMult: 1.5, hp: 150, reward: 10, viralAdd: 4, attack: 3, isBoss: false,
    shield: null,
    spore: { interval: 5.0, childHpFrac: 0.3, childSpeedMult: 1.5, maxChildren: 3 },
    tooltip: "Kingella kingae es la causa principal de osteoartritis en niños pequeños: coloniza la faringe, pasa a sangre y siembra hueso y articulación. Su toxina RTX mata células ciliadas. Pequeña, veloz y se multiplica — no la dejes acumular."
  },
  bossBrodie: {
    id: "bossBrodie", name: "Absceso de Brodie", shortName: "Brodie", baseKind: "bacteria",
    color: "#8a7b4e", colorDark: "#3d3518", colorLight: "#d6c48c", radius: 50,
    speedMult: 0.28, hp: 3900, reward: 180, viralAdd: 32, attack: 30,
    power: { type: "spray", range: 155, cooldown: 4.0, stun: 2, dmg: 24 }, isBoss: true,
    shield: { type: "wall", maxHP: 12, regenRate: 12 / 14, regenDelay: 2.0, doubleRing: true },
    abscessSeeder: { interval: 6.5, spawn: "aureusSCV" },
    tooltip: "El absceso de Brodie es una osteomielitis crónica encapsulada: una cavidad de pus rodeada de hueso esclerótico que el sistema inmune no puede penetrar. Casi no se mueve, pero SIEMBRA colonias sin parar desde su interior. Rompé la cápsula esclerótica con osteoclastos o te desborda por goteo."
  },
  // ==== FASE 2 · ARTRITIS SÉPTICA (articulación / cavidad sinovial) =====
  // Patógenos que flotan en el líquido sinovial. El rasgo común es que el
  // daño real no lo hacen ellos sino la INFLAMACIÓN que provocan: cada
  // germen vivo en la cavidad degrada cartílago con el tiempo.
  gonoArticular: {
    id: "gonoArticular", name: "Neisseria gonorrhoeae diseminada", shortName: "Gonococo art.", baseKind: "bacteria",
    color: "#e08a3c", colorDark: "#7a4410", colorLight: "#f7c288", radius: 24,
    speedMult: 0.85, hp: 320, reward: 14, viralAdd: 6, attack: 5, isBoss: false,
    shield: null,
    piliAdhesion: { range: 60, slowFire: 4.0, duration: 5.0 },
    cartilageEater: 1.0,
    tooltip: "La infección gonocócica diseminada es la artritis séptica más frecuente en adultos jóvenes sexualmente activos: da la triada de dermatitis, tenosinovitis y artritis migratoria. Sus pili tipo IV frenan a las torres que toca, y mientras vive en la cavidad va comiendo cartílago."
  },
  borrelia: {
    id: "borrelia", name: "Borrelia burgdorferi", shortName: "Borrelia", baseKind: "bacteria",
    color: "#9a7fd0", colorDark: "#463466", colorLight: "#cbb8f0", radius: 18,
    speedMult: 1.2, hp: 260, reward: 15, viralAdd: 7, attack: 4, isBoss: false,
    shield: null,
    spirochete: { coils: 7, amplitude: 26, frequency: 2.2 },
    antigenShift: { interval: 5.0, evadeChance: 0.35 },
    cartilageEater: 0.7,
    tooltip: "Borrelia burgdorferi es una espiroqueta que se desplaza en tirabuzón por el tejido conectivo y cambia su lipoproteína VlsE constantemente para escapar de los anticuerpos. La artritis de Lyme es su fase tardía: rodilla hinchada, poco dolor y una bacteria que a veces simplemente ESQUIVA el disparo."
  },
  pyogenesArt: {
    id: "pyogenesArt", name: "Streptococcus pyogenes articular", shortName: "Pyogenes art.", baseKind: "bacteria",
    color: "#d4506a", colorDark: "#6e1728", colorLight: "#f5a0b2", radius: 27,
    speedMult: 0.75, hp: 430, reward: 17, viralAdd: 8, attack: 11, isBoss: false,
    shield: { type: "capsula", maxHP: 4, regenRate: 0, regenDelay: 0 },
    power: { type: "burst", range: 140, cooldown: 4.5, dmg: 20, slowFire: 3 },
    cartilageEater: 1.6,
    tooltip: "S. pyogenes en la articulación produce una destrucción fulminante: su estreptoquinasa y su hialuronidasa disuelven el ácido hialurónico del líquido sinovial, y las enzimas de los neutrófilos que acuden hacen el resto. Es el que más rápido come cartílago — priorizalo siempre."
  },
  bossPannus: {
    id: "bossPannus", name: "Pannus séptico", shortName: "Pannus", baseKind: "hongo",
    color: "#b0455f", colorDark: "#4e1424", colorLight: "#eb92a8", radius: 52,
    speedMult: 0.3, hp: 4200, reward: 200, viralAdd: 35, attack: 34,
    power: { type: "devour", range: 145, cooldown: 10, pull: 1.7 }, isBoss: true,
    shield: { type: "wall", maxHP: 10, regenRate: 10 / 12, regenDelay: 1.8 },
    cartilageEater: 3.0,
    tooltip: "El pannus es tejido de granulación invasor: una masa de sinovia hipertrófica cargada de macrófagos y fibroblastos activados que trepa sobre el cartílago y lo devora desde el borde. Aquí viene infectado. Se traga tus torres y destruye la articulación mientras exista."
  },
  // ==== FASE 3 · COMPLICACIONES =========================================
  emboloSeptico: {
    id: "emboloSeptico", name: "Émbolo séptico", shortName: "Émbolo", baseKind: "bacteria",
    color: "#d4788c", colorDark: "#66242f", colorLight: "#ffc0cc", radius: 22,
    speedMult: 1.15, hp: 260, reward: 12, viralAdd: 6, attack: 6, isBoss: false,
    shield: null,
    fragments: true,
    tooltip: "Un émbolo séptico es un trozo de vegetación que se soltó de la válvula y viaja por la sangre hasta encajarse en un vaso pequeño. Lleva dentro bacterias vivas, fibrina y plaquetas. Al impactar se FRAGMENTA y siembra el territorio distal: por eso una endocarditis termina dando infartos en pulmón, cerebro y bazo a la vez."
  },
  bacteroides: {
    id: "bacteroides", name: "Bacteroides fragilis", shortName: "Bacteroides", baseKind: "bacteria",
    color: "#7d6a90", colorDark: "#33263f", colorLight: "#c4b0d8", radius: 25,
    speedMult: 0.6, hp: 400, reward: 16, viralAdd: 7, attack: 8, isBoss: false,
    shield: { type: "capsula", maxHP: 5, regenRate: 5 / 12, regenDelay: 2 },
    anaerobe: true,
    tooltip: "Bacteroides fragilis es un anaerobio estricto de la flora intestinal y el rey de los abscesos: su cápsula de polisacárido A induce por sí sola la formación de pus. Prospera donde no llega el oxígeno, es decir, justo en el centro de la colección. Mientras haya absceso sin drenar, él vuelve."
  },
  // ---- Legacy aliases (some old code still references these by name) --
  bacteria: {
    id: "bacteria", name: "Bacteria", baseKind: "bacteria",
    color: "#E74C3C", colorDark: "#922a1f", radius: 14, speedMult: 0.6,
    hp: 220, reward: 10, viralAdd: 5, isBoss: false, shield: null
  },
  virus: {
    id: "virus", name: "Virus", baseKind: "virus",
    color: "#8E44AD", colorDark: "#5a2c70", radius: 9, speedMult: 1.5,
    hp: 88, reward: 5, viralAdd: 6, isBoss: false, shield: null
  },
  hongo: {
    id: "hongo", name: "Hongo", baseKind: "hongo",
    color: "#E91E63", colorDark: "#8c1240", radius: 12, speedMult: 1.0,
    hp: 154, reward: 15, viralAdd: 8, isBoss: false, shield: null
  },
  boss: {
    id: "boss", name: "Boss", baseKind: "bacteria",
    color: "#E74C3C", colorDark: "#5a1010", radius: 42, speedMult: 0.4,
    hp: 2200, reward: 100, viralAdd: 20, isBoss: true, shield: null
  },
  bossBacteria:  { id: "bossBacteria",  name: "Mega Bacteria",      baseKind: "bacteria",  color: "#8B0000", colorDark: "#3d0a0a", radius: 35, speedMult: 0.40, hp:  660, reward:  50, viralAdd: 15, isBoss: true, shield: null },
  bossVirus:     { id: "bossVirus",     name: "Virus Mutado",        baseKind: "virus",     color: "#6A1B9A", colorDark: "#3a0f5b", radius: 22, speedMult: 1.20, hp:  770, reward:  60, viralAdd: 18, isBoss: true, shield: null },
  bossHongo:     { id: "bossHongo",     name: "Hongo Invasivo",      baseKind: "hongo",     color: "#C2185B", colorDark: "#6a0d33", radius: 33, speedMult: 0.90, hp:  935, reward:  80, viralAdd: 22, isBoss: true, shield: null },
  bossPrimordial:{ id: "bossPrimordial",name: "Patogeno Primordial", baseKind: "primordial",color: "#2A2424", colorDark: "#0a0606", radius: 45, speedMult: 0.50, hp: 1650, reward: 150, viralAdd: 35, isBoss: true, shield: null }
};
var SIGNATURE_ATTACK_DEFS = {
  saureus:     { pulseGap: 0.45, punchDur: 0.50, color: "#F9A825" },
  pseudomonas: { pulseGap: 0.42, punchDur: 0.48, color: "#26A69A" },
  candida:     { pulseGap: 0.55, punchDur: 0.52, color: "#EC407A" },
  sepidermidis:{ pulseGap: 0.38, punchDur: 0.40, color: "#90A4AE" },
  dermatofito: { pulseGap: 0.55, punchDur: 0.46, color: "#9CA85A", sporeKind: "hunt" },
  hsv:         { pulseGap: 0.38, punchDur: 0.40, color: "#9575CD" },
  cacnes:      { pulseGap: 0.70, punchDur: 0.55, color: "#C9A66B" },
  sarna:       { pulseGap: 0.60, punchDur: 0.38, color: "#8a5a2b", burrowIcon: true },
  hpv:         { pulseGap: 0.50, punchDur: 0.42, color: "#8a9a5e" },
  molluscum:   { pulseGap: 0.55, punchDur: 0.52, color: "#e8d6c0", sporeKind: "pearl" },
  malassezia:  { pulseGap: 0.60, punchDur: 0.46, color: "#d8c060" },
  demodex:     { pulseGap: 0.85, punchDur: 0.55, color: "#c8a86a", sporeKind: "larva" },
  neisseria:   { pulseGap: 0.65, punchDur: 0.45, color: "#d47c3a" },
  leishmania:  { pulseGap: 0.58, punchDur: 0.42, color: "#7aaa44" }
};
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
  root.enemyDefs = ENEMY_DEFS;
  root.signatureAttackDefs = SIGNATURE_ATTACK_DEFS;
  root.viralByType = VIRAL_BY_TYPE;
})(window.ImmunoDefenseData);
