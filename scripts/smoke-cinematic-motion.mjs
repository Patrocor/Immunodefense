import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame(undefined, { hash: "#reducemotion" });

assert.equal(game.__game.quality().motion, 0, "debe activar movimiento reducido vía #reducemotion");

game.__game.goDissemination();
assert.ok(game.__game.state.dissemination, "debe entrar a Diseminación");
assert.equal(game.__game.state.disseminationIntroTimer, 3.2, "intro timer inicial");

const introBefore = game.__game.state.disseminationIntroTimer;
game.__game.step(0.1, 0.1);
const introAfter = game.__game.state.disseminationIntroTimer;
assert.ok(introAfter < introBefore, "intro timer debe acelerarse con cinematicSpeed()");

game.__game.state.phaseTransition = {
  t: 0.5,
  duration: 1.4,
  outcome: "victory",
  target: "dissemination",
};
game.__lerr = null;
game.__game.step(0.05, 0.05);
assert.equal(game.__lerr, null, "transición de fase no debe fallar en render");

game.__game.state.phaseTransition = null;
game.__game.state.disseminationOver = {
  t: 1.0,
  mode: "win",
  organ: { id: "heart", label: "Corazón", color: "#ff6688", scenario: "Endocarditis" },
  germ: { id: "mrsa", label: "MRSA" },
  resolved: false,
};
game.__lerr = null;
game.__game.step(0.05, 0.05);
assert.equal(game.__lerr, null, "disseminationOver win no debe fallar en render");

game.__game.state.disseminationOver.mode = "lose";
game.__lerr = null;
game.__game.step(0.05, 0.05);
assert.equal(game.__lerr, null, "disseminationOver lose no debe fallar en render");

const prefGame = createTestGame(undefined, { reducedMotion: true });
assert.equal(prefGame.__game.quality().motion, 0, "debe respetar prefers-reduced-motion en tests");

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const gameSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "game.js"), "utf8");
assert.ok(gameSrc.includes("DEFENDÉ LOS 3 ÓRGANOS"), "copy de intro debe mencionar 3 órganos");
assert.ok(!gameSrc.includes("DEFENDÉ LOS 5 ÓRGANOS"), "copy obsoleto de 5 órganos debe eliminarse");

console.log("Smoke OK: cinemáticas con movimiento reducido");
