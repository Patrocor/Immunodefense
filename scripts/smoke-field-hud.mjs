import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTestGame } from "./test-bootstrap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "game.js"), "utf8");

function assertNoFillText(label) {
  const re = new RegExp("fillText\\(\\s*[\"']" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  assert.ok(!re.test(src), label + " no debe pintarse como cartel");
}

[
  "TOCA PARA ARMAR",
  "ENSAMBLAJE",
  "GANGLIO",
  "MÉDULA",
  "MITOCONDRIA",
  "TAPÓN DE FIBRINA",
  "EPIDERMIS",
  "DERMIS",
  "HIPODERMIS",
  "⚡ ATP",
  "📖",
  "🧴",
].forEach(assertNoFillText);

assert.ok(src.includes("function sampleTissueAt"), "el carril toma el color del tejido");
assert.ok(src.includes("function ensureWoundCoverSample"), "muestrea el PNG del campo");
assert.ok(src.includes("function drawTissueDepth"), "hay profundidad de tejido");
assert.ok(src.includes("Cuerda viva: seudópodo"), "el Arpón es seudópodo, no cadena");
assert.ok(src.includes("Copa fagocítica"), "el Arpón cierra en copa");
assert.ok(src.includes("function drawAtpDrop"), "ATP usa gota canvas");
assert.ok(src.includes("function drawSerumShell"), "HUD abajo es tira de suero");
assert.ok(src.includes("function drawDexBookIcon"), "Dex usa libro canvas");
assert.ok(src.includes("function macrophageBodyPath"), "macrófago usa silueta de lóbulos");
assert.ok(src.includes("function drawC3bMark"), "C3b tiene marca de complemento");
assert.ok(src.includes("ready ? \"LISTO\""), "C3b listo se lee en el medidor");
assert.ok(src.includes("a 2/5 se leen dos llenos"), "C3b a medias usa bloques, no un tinte");
assert.ok(src.includes("Pausá y elegí tu loadout"), "el aviso de pausa es una frase");
assert.ok(src.includes("MACRO_LOBE_ANG"), "macrófago usa lóbulos irregulares");
assert.ok(src.includes("function paintMacrophageCell"), "macrófago comparte silueta de habichuela+dedos");
assert.ok(src.includes("detailBottom"), "el Dex recorta el texto a la casilla");
assert.ok(src.includes("function uiSlotRadius"), "casillas usan radio de vértices romos");
assert.ok(src.includes("function fillSlot"), "casillas se rellenan con fillSlot");
assert.ok(src.includes("function strokeSlot"), "casillas se recortan con strokeSlot");
assert.ok(src.includes("Casillas/casilleros a todo nivel: cuadrado o rectángulo de puntas romas"), "regla visual de casillas documentada");
assert.ok(src.includes("function clipSlot"), "las casillas internas recortan con el mismo path");
assert.ok(src.includes("se leen como burbuja de diálogo"), "el radio evita la forma de bocadillo");
assert.ok(src.includes("ctx.arcTo"), "roundRect usa arco circular, no curva hinchada");
assert.ok(!/function roundRect[\s\S]{0,240}quadraticCurveTo/.test(src), "roundRect ya no usa quadraticCurveTo");
assert.ok(!src.includes("sin rounded corners"), "ya no hay cartas de esquina viva");
assert.ok(!/roundRect\([^)]*,\s*0\s*\)/.test(src), "ningún roundRect queda en radio 0");
assert.ok(src.includes("LOCKED v5 — Habichuela+4 seudópodos+boca abierta+lengua-Arpón"), "macrófago idle cerrado");
assert.ok(src.includes("LOCKED v5 — lengua serpenteante + copa fagocítica"), "Arpón cerrado");

const game = createTestGame();
const g = game.__game;
g.state.showTitle = false;
g.state.showIntro = false;
g.state.atp = 180;
g.state.topicalCharge = 40;
g.state.medCharge = 20;
g.relayout();
game.__lerr = null;
g.step(0.2, 0.05);
assert.equal(game.__lerr, null, "render Fase 1 con HUD/suero no debe fallar");
assert.ok((g.state.ambient || []).length <= 10, "ambient no satura el campo");
assert.ok((g.state.ambient || []).length >= 5, "ambient sigue vivo");

console.log("Smoke OK: campo + HUD + Dex");
