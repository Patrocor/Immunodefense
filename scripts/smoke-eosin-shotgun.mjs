import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();
const g = game.__game;
const st = g.state;
st.showTitle = false;
st.showIntro = false;
st.atp = 400;
g.place("eosinofilo", 0.45, 0.5);
const t = st.towers[0];
assert.ok(t, "debe colocar el eosinófilo");
t.level = 1;
t.specialReady = true;
t.specialCharge = 1;

const def = game.ImmunoDefenseData.enemyDefs.leishmania;
const hp0 = def.hp;
st.enemies = [{
  def,
  state: "walking",
  enteringTimer: 0,
  x: t.x + 90,
  y: t.y,
  progress: 0.4,
  radiusScale: 1,
  hp: hp0,
  maxHp: hp0,
  hitFlash: 0,
  dying: false,
  dead: false,
  wobble: 0,
  _heading: 0,
  _lastPosX: t.x + 80,
  _lastPosY: t.y,
}];

g.ults();
assert.ok(t.eosinShotgun, "el ult debe armar la perdigonera");
assert.ok(Math.abs(t.eosinShotgun.ang) < 0.45, "debe apuntar al parásito a la derecha");
assert.ok(st.enemies[0].hp < hp0, "el cono debe pegar al parásito");
assert.ok((st.enemies[0].dotTimer || 0) > 0, "parásito recibe DoT");
assert.ok(st.effects.some((e) => e.kind === "granuleShot"), "debe escupir cristales");

g.step(0.2, 0.05);
assert.equal(game.__lerr, null, "render de la perdigonera no debe fallar");

console.log("Smoke OK: perdigonera eosinófilo");
