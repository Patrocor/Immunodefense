import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

function stubEnemy(overrides) {
  return Object.assign({
    def: { id: "saureus", radius: 14, hp: 100, attack: 0 },
    x: 100,
    y: 200,
    hp: 100,
    maxHp: 100,
    state: "walking",
    wobble: 1.2,
    dead: false,
    dying: false
  }, overrides);
}

const game = createTestGame();
game.__game.goDissemination();
game.__game.state.disseminationIntroTimer = 0;
game.__game.state.vistos = game.__game.state.vistos || {};
game.__game.state.vistos.saureus = true;
game.__game.state.enemies = [stubEnemy({})];
assert.equal(game.__game.enemyIdleLod().active, false, "pocos gérmenes no activan LOD");

for (let i = 0; i < 24; i++) {
  game.__game.state.enemies.push(stubEnemy({ x: 120 + i * 8, wobble: i }));
}
assert.equal(game.__game.state.enemies.length, 25);
assert.ok(game.__game.enemyIdleLod().active, "25+ gérmenes activan LOD");

const grunt = game.__game.state.enemies[1];
assert.equal(game.__game.enemyUsesFullIdleAnim(grunt), false);

const boss = game.__game.state.enemies[0];
boss.def.isBoss = true;
assert.equal(game.__game.enemyUsesFullIdleAnim(boss), true);

grunt.def.isBoss = false;
grunt.hitFlash = 0.12;
assert.equal(game.__game.enemyUsesFullIdleAnim(grunt), true);

game.__lerr = null;
game.__game.step(0.04, 0.02);
assert.equal(game.__lerr, null, "render con LOD idle no debe fallar");

const low = createTestGame(undefined, { hash: "#lowfx" });
low.__game.goDissemination();
low.__game.state.enemies = [stubEnemy({})];
assert.ok(low.__game.enemyIdleLod().active, "QUALITY.low activa LOD aunque haya pocos gérmenes");

console.log("Smoke OK: LOD idle de gérmenes");
