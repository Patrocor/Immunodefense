import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

function primeTower(game) {
  game.__game.state.showTitle = false;
  game.__game.state.showIntro = false;
  game.__game.place("neutrofilo", 0.5, 0.5);
  return game.__game.state.towers[0];
}

const game = createTestGame();
const tower = primeTower(game);
tower.specialCharge = 1;
tower.specialReady = false;
tower.ultimateTelegraphT = 0;
game.__game.step(0.04, 0.02);
assert.equal(tower.specialReady, true, "la carga debe marcar ultimate listo");
assert.ok((tower.ultimateTelegraphT || 0) > 0, "debe iniciar telegraph al quedar listo");

game.__lerr = null;
game.__game.step(0.05, 0.05);
assert.equal(game.__lerr, null, "render del telegraph no debe fallar");

const low = createTestGame(undefined, { hash: "#lowfx" });
const lowTower = primeTower(low);
lowTower.specialCharge = 1;
lowTower.specialReady = false;
low.__game.step(0.04, 0.02);
assert.equal(lowTower.specialReady, true);
assert.equal(lowTower.ultimateTelegraphT || 0, 0, "QUALITY.low desactiva telegraph");

const reduced = createTestGame(undefined, { hash: "#reducemotion" });
const reducedTower = primeTower(reduced);
reducedTower.specialCharge = 1;
reducedTower.specialReady = false;
reduced.__game.step(0.04, 0.02);
assert.ok((reducedTower.ultimateTelegraphT || 0) > 0, "reduced-motion conserva telegraph estático");

reduced.__lerr = null;
reduced.__game.step(0.05, 0.05);
assert.equal(reduced.__lerr, null, "render reduced-motion del telegraph no debe fallar");

console.log("Smoke OK: telegraph visual de ultimates");
