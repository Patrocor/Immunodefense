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

assert.ok(src.includes("ctx.lineWidth = 44 * U"), "el carril tapa el PNG con stroke opaco de 44 U");
assert.ok(src.includes("#c89888"), "tapa del carril usa color dermis");
assert.ok(src.includes("function drawTissueDepth"), "hay profundidad de tejido");
assert.ok(src.includes("Cuerda viva: seudópodo ondulante"), "el Arpón es seudópodo, no cadena");
assert.ok(src.includes("Copa fagocítica"), "el Arpón cierra en copa");
assert.ok(src.includes("function drawAtpDrop"), "ATP usa gota canvas");
assert.ok(src.includes("function drawSerumShell"), "HUD abajo es tira de suero");
assert.ok(src.includes("function drawDexBookIcon"), "Dex usa libro canvas");

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
