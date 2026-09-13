import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTestGame } from "./test-bootstrap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const organ = { id: "heart", label: "Corazón", color: "#ff6688", scenario: "Endocarditis" };

const game = createTestGame();
game.__game.goDissemination();

game.__game.state.phaseTransition = {
  t: 0.2,
  duration: 1.4,
  outcome: "victory",
  target: "dissemination",
  startedAt: 0,
};
game.__game.state.time = 0.3;
game.__game.tap(640, 360);
assert.ok(game.__game.state.phaseTransition, "tap antes del debounce no debe saltar la cinemática");

game.__game.state.time = 1.2;
game.__game.tap(640, 360);
assert.equal(game.__game.state.phaseTransition, null, "tap tras debounce debe cerrar la transición");
assert.ok(game.__game.state.bodyMap, "skip de transición debe abrir el mapa corporal");

game.__game.state.bodyMap = null;
game.__game.state.disseminationIntroTimer = 3.2;
game.__game.state.disseminationIntroStartedAt = 0;
game.__game.state.time = 1.5;
game.__game.tap(200, 200);
assert.equal(game.__game.state.disseminationIntroTimer, 0, "skip debe terminar la intro de Diseminación");

game.__game.state.disseminationOver = {
  t: 0.5,
  mode: "win",
  organ,
  germ: { id: "mrsa", label: "MRSA" },
  resolved: false,
  startedAt: 0,
};
game.__game.state.time = 1.0;
game.__game.tap(400, 400);
assert.equal(game.__game.state.disseminationOver, null, "skip debe resolver disseminationOver");
assert.ok(game.__game.state.bodyMap, "skip de fin de Diseminación debe abrir el mapa");

const src = readFileSync(join(ROOT, "game.js"), "utf8");
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
assert.ok(!src.includes("CONTINUAR A FASE 2 (Próximamente)"), "el botón ya no promete Fase 2 inexistente");
assert.ok(!src.includes("La Fase 2 esta en desarrollo"), "continuar no reinicia Fase 1");
assert.ok(src.includes("CONTINUAR A DISEMINACIÓN"), "el botón nombra Diseminación");
assert.ok(src.includes("function continueFromPhase1Cinematic"), "continuar abre el mapa de campaña");
assert.ok(!readme.includes("Iniciar Oleada"), "el README no inventa un botón de oleada");
assert.ok(readme.includes("Adelantar el contador"), "el README describe Espacio como adelantar");

const cine = createTestGame();
cine.__game.state.showTitle = false;
cine.__game.state.showIntro = false;
cine.__game.state.cinematicEnd = { t: 8, buttonShown: true };
cine.__game.ui.cinematicBtn = { x: 100, y: 100, w: 200, h: 50 };
cine.__game.tap(150, 125);
assert.equal(cine.__game.state.cinematicEnd, null, "el botón cierra la cinemática");
assert.ok(cine.__game.state.bodyMap, "el botón abre el mapa hacia Diseminación");
assert.ok(cine.__game.state.completedMapNodes && cine.__game.state.completedMapNodes.fase1, "marca Fase 1 hecha");

console.log("Smoke OK: tap-to-skip en cinemáticas");
