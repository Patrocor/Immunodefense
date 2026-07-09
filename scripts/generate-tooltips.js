/**
 * ImmunoDefense — Generador de tooltips enriquecidos via NVIDIA NIM (Llama 3.1)
 *
 * Uso:
 *   NVIDIA_API_KEY=nvapi-xxx node scripts/generate-tooltips.js
 *
 * Genera un archivo `scripts/tooltips-output.js` con todas las descripciones
 * listas para pegar en game.js. La clave NUNCA se guarda en este archivo.
 */

const https = require("https");

const API_KEY = process.env.NVIDIA_API_KEY;
if (!API_KEY) {
  console.error("ERROR: Falta NVIDIA_API_KEY en el entorno.");
  console.error("Uso: NVIDIA_API_KEY=nvapi-xxx node scripts/generate-tooltips.js");
  process.exit(1);
}

// ── Catálogo completo de gérmenes ────────────────────────────────────────────
const GERMS = [
  { id: "saureus",       name: "Staphylococcus aureus",         kind: "bacteria",  mechanic: "Cápsula polisacárida, biofilm; MRSA resiste β-lactámicos. En juego: escudo tipo cápsula, poder de ráfaga." },
  { id: "influenza",     name: "Virus Influenza A",             kind: "virus",     mechanic: "Hemaglutinina/neuraminidasa permiten entrada y salida celular. Muta con frecuencia. En juego: muy rápido, sin escudo." },
  { id: "vih",           name: "VIH-1",                        kind: "virus",     mechanic: "gp120/gp41 para entrar en CD4+. Solo Linfocito T citotóxico puede eliminarlo. En juego: escudo spike, muy resistente." },
  { id: "candida",       name: "Candida albicans",             kind: "hongo",     mechanic: "Dimorfismo levadura↔hifa; pared de β-glucanos y quitina. En juego: escudo tipo pared." },
  { id: "dermatofito",   name: "Trichophyton rubrum",          kind: "hongo",     mechanic: "Degrada queratina con queratinasas; conidios resistentes. En juego: suelta esporas hijas que atacan torres." },
  { id: "sepidermidis",  name: "Staphylococcus epidermidis",   kind: "bacteria",  mechanic: "Flora normal oportunista; biofilm en prótesis; seudópodos de ataque cuerpo a cuerpo al pasar junto a torres." },
  { id: "hsv",           name: "Virus Herpes Simple (HSV-1/2)",kind: "virus",     mechanic: "Latencia en ganglios nerviosos; glicoproteínas de envoltura para fusión. En juego: muy rápido, evasivo." },
  { id: "cacnes",        name: "Cutibacterium acnes",          kind: "bacteria",  mechanic: "Anaerobio productor de porfirina y lipasas en el folículo. En juego: lento, con biofilm parcial." },
  { id: "pseudomonas",   name: "Pseudomonas aeruginosa",       kind: "bacteria",  mechanic: "Piocianina, exotoxina A, biofilm en heridas. En juego: spray paralizante, esporas que buscan torres." },
  { id: "sarna",         name: "Sarcoptes scabiei (sarna)",    kind: "parasito",  mechanic: "Ácaro que excava galerías en el estrato córneo; deposita huevos. En juego: se entierra (burrow), invulnerable cuando está bajo tierra." },
  { id: "hpv",           name: "Virus del Papiloma Humano (HPV)", kind: "virus",  mechanic: "Cápside de 72 capsómeros L1/L2; proteínas E6/E7 inactivan p53 y Rb. En juego: escudo de queratina que se regenera; al romperlo entra en furia." },
  { id: "molluscum",     name: "Molluscum contagiosum (MCV)",  kind: "virus",     mechanic: "Poxvirus; proteínas de evasión inmune MC159/MC160. En juego: se divide en dos al morir; pápulas cerosas." },
  { id: "malassezia",    name: "Malassezia furfur",            kind: "hongo",     mechanic: "Levadura lipofílica; produce ácidos grasos que alteran melanogénesis. En juego: suelta charcos de grasa que ralentizan torres." },
  { id: "demodex",       name: "Demodex folliculorum",         kind: "parasito",  mechanic: "Ácaro del folículo piloso; invisible a casi todas las torres. Solo Langerhans lo detecta. En juego: cloaking + zigzag." },
  { id: "neisseria",     name: "Neisseria gonorrhoeae",        kind: "bacteria",  mechanic: "Pili tipo IV para adhesión e invasión; variación antigénica de Opa. En juego: se adhiere a torres y les ralentiza la cadencia." },
  { id: "leishmania",    name: "Leishmania major",             kind: "parasito",  mechanic: "Ciclo promastigote (flagelado, extracelular) ↔ amastigote (intracelular, en macrófagos). En juego: alterna forma vulnerable e invulnerable cada 7s." },
  { id: "bossPyogenes",  name: "Streptococcus pyogenes (Jefe)",kind: "bacteria",  mechanic: "Estreptolisina O/S, hialuronidasa, proteína M antifagocítica. Fascitis necrotizante. En juego: JEFE — parches necróticos en el camino." },
  { id: "bossMRSA",      name: "MRSA (Jefe)",                  kind: "bacteria",  mechanic: "Staphylococcus aureus meticilino-resistente. Gen mecA; cassette SCCmec. Solo Carbapenem hace 50% del efecto. En juego: JEFE final Fase 1." },
  { id: "bossClostridium", name: "Clostridium perfringens (Jefe)", kind: "bacteria", mechanic: "α-toxina fosfolipasa C destruye membranas; produce gas en tejidos (gangrena gaseosa). En juego: JEFE — avanza lento e implacable." },
  { id: "bossPseudomonas", name: "Pseudomonas aeruginosa invasiva (Jefe)", kind: "bacteria", mechanic: "Versión hipervirulenta: ectima gangrenoso, piocianina, sistema de secreción tipo III. En juego: JEFE W4." },
];

// ── Catálogo completo de torres ──────────────────────────────────────────────
const TOWERS = [
  { id: "neutrofilo",    name: "Neutrófilo",                   role: "Primera línea — fagocitosis, NET (trampas extracelulares), degranulación. Ultimate: Bombardeo de Defensinas." },
  { id: "linfocitoB",    name: "Linfocito B / Plasmocito",     role: "Produce anticuerpos IgG/IgM que opsonizan bacterias. Ultimate: cañones de anticuerpos penetrantes." },
  { id: "linfocitoT",    name: "Linfocito T citotóxico (CD8+)",role: "Reconoce péptidos en MHC-I; libera granzima B y perforina para apoptosis. Ultimate: Apoptosis en 5 enemigos." },
  { id: "langerhans",    name: "Célula de Langerhans",         role: "CPA de la epidermis; captura antígenos, migra al ganglio, activa Th. Ultimate: Presentación Antigénica Masiva — marca y bufa aliados." },
  { id: "nk",            name: "Célula NK (Natural Killer)",   role: "Mata sin MHC; reconoce ausencia de MHC-I (células infectadas/tumorales). Perforina + granzima. Ultimate: Frenesí citotóxico." },
  { id: "eosinofilo",    name: "Eosinófilo",                   role: "Gránulos de MBP, ECP, EDN; ADCC contra parásitos. Interleuquinas IL-4/IL-13. Ultimate: Descarga de gránulos." },
  { id: "mastocito",     name: "Mastocito",                    role: "Desgranulación de histamina, triptasa, leucotrienos. Ralentiza gérmenes en área. Ultimate: Onda de desgranulación." },
  { id: "complemento",   name: "Complemento MAC (C5b-9)",      role: "Complejo de ataque a membrana que perfora bacterias gram-. Ignora escudos. Disparo manual concentrado." },
  { id: "plaqueta",      name: "Fibrina / Plaqueta (barrera)", role: "Coágulo de fibrina que obstruye el carril; tromboxano A2 y factor von Willebrand. Barrera pasiva." },
  { id: "trombo",        name: "Trombo de Respuesta",          role: "Plaqueta activada con pseudópodos; empuja gérmenes hacia atrás. Al destruirse libera una bomba de factores de coagulación." },
  { id: "centinela",     name: "Célula Centinela",             role: "Receptor de reconocimiento de patrones (PRR/TLR); emite alarmas. Atrae los ataques especiales de los gérmenes hacia sí (señuelo)." },
  { id: "queratinocito", name: "Queratinocito activado",       role: "Produce defensinas α/β, IL-8, IL-1β; barrera física y química. Campo de defensinas ralentiza. IL-8 recluta neutrófilos (+fireRate)." },
  { id: "sebocito",      name: "Sebocito",                     role: "Produce sebo (ácidos grasos, escualeno, ceras) con actividad antimicrobiana. Charcos de sebo: DoT continuo, ×3 vs C.acnes y dermatofito." },
  { id: "pdc",           name: "Célula Dendrítica Plasmocitoide (pDC)", role: "Máxima productora de IFN-α/β: detecta ácidos nucleicos virales vía TLR7/9. Ralentiza y debilita virus. Ultimate: Tormenta de Interferón." },
  { id: "linfocitogd",   name: "Linfocito γδ",                role: "No requiere presentación por MHC; reconoce antígenos no peptídicos. Prioriza heridos. Bonus vs bacteria y hongo. IL-17 bufa todas las torres." },
  { id: "ilc2",          name: "ILC2 (Linfoide Innato tipo 2)",role: "Produce IL-4, IL-5, IL-13; amplifica respuesta de Eosinófilos y Mastocitos. No ataca directo. Ultimate: IL-5 activa ultimates aliados cercanos." },
];

// ── Llamada a NVIDIA NIM (Llama 3.1-70B) ─────────────────────────────────────
function callNvidiaLLM(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "meta/llama-3.1-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 300,
    });

    const options = {
      hostname: "integrate.api.nvidia.com",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
          resolve(text ? text.trim() : "");
        } catch (e) {
          reject(new Error("Parse error: " + data.slice(0, 200)));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Prompts ───────────────────────────────────────────────────────────────────
function promptForGerm(g) {
  return `Eres el escritor de textos científico-educativos del videojuego ImmunoDefense, un tower defense de inmunología.

Escribe el tooltip del germen "${g.name}" (tipo: ${g.kind}).

Datos clave del germen en el juego:
${g.mechanic}

Requisitos ESTRICTOS:
- Idioma: español latinoamericano
- Extensión: exactamente 2–3 oraciones
- Tono: científico pero accesible, con ENTUSIASMO — el jugador aprende mientras juega
- Incluye al menos UN dato de biología molecular o mecanismo de patogenicidad real
- Menciona qué tipo de célula inmune lo combate mejor (si aplica al juego)
- NO repitas los datos mecánicos del juego literalmente; integrálos de forma narrativa
- NO uses markdown, NO uses listas, solo texto corrido

Devuelve ÚNICAMENTE el texto del tooltip, nada más.`;
}

function promptForTower(t) {
  return `Eres el escritor de textos científico-educativos del videojuego ImmunoDefense, un tower defense de inmunología.

Escribe la descripción de la torre "${t.name}".

Rol biológico y mecánico en el juego:
${t.role}

Requisitos ESTRICTOS:
- Idioma: español latinoamericano
- Extensión: exactamente 1–2 oraciones cortas y directas
- Tono: conciso, técnico, con ENERGÍA — como una ficha de combate
- Incluye el mecanismo biológico real más importante de esta célula
- Termina con el punto fuerte en combate (qué combate mejor o qué habilidad especial tiene)
- NO uses markdown, NO uses listas, solo texto corrido

Devuelve ÚNICAMENTE el texto de la descripción, nada más.`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const results = { germs: {}, towers: {} };
  const total = GERMS.length + TOWERS.length;
  let done = 0;

  console.log(`\n🧬 Generando ${total} descripciones con NVIDIA Llama 3.1-70B...\n`);

  for (const g of GERMS) {
    process.stdout.write(`[${++done}/${total}] ${g.name}... `);
    try {
      results.germs[g.id] = await callNvidiaLLM(promptForGerm(g));
      console.log("✓");
    } catch (e) {
      console.log("✗ ERROR:", e.message);
      results.germs[g.id] = null;
    }
    await sleep(400);
  }

  for (const t of TOWERS) {
    process.stdout.write(`[${++done}/${total}] ${t.name}... `);
    try {
      results.towers[t.id] = await callNvidiaLLM(promptForTower(t));
      console.log("✓");
    } catch (e) {
      console.log("✗ ERROR:", e.message);
      results.towers[t.id] = null;
    }
    await sleep(400);
  }

  // ── Output ──────────────────────────────────────────────────────────────────
  const fs = require("fs");
  const path = require("path");

  let out = "// ============================================================\n";
  out += "// TOOLTIPS GENERADOS — NVIDIA Llama 3.1-70B\n";
  out += "// Pegar en game.js reemplazando los campos tooltip:/desc:\n";
  out += "// ============================================================\n\n";

  out += "// ── GÉRMENES (campo tooltip: en ENEMY_DEFS) ─────────────────\n";
  for (const [id, text] of Object.entries(results.germs)) {
    if (text) out += `// ${id}\n"${text.replace(/"/g, '\\"')}"\n\n`;
  }

  out += "\n// ── TORRES (campo desc: en TOWER_DEFS) ──────────────────────\n";
  for (const [id, text] of Object.entries(results.towers)) {
    if (text) out += `// ${id}\n"${text.replace(/"/g, '\\"')}"\n\n`;
  }

  const outPath = path.join(__dirname, "tooltips-output.txt");
  fs.writeFileSync(outPath, out, "utf8");
  console.log(`\n✅ Listo. Resultados en: ${outPath}\n`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
