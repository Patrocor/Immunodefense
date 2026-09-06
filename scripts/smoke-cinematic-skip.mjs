import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

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
game.__game.state.disseminationIntroTimer = 4.0;
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

console.log("Smoke OK: tap-to-skip en cinemáticas");
