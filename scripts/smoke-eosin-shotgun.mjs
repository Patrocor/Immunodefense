import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame(undefined, { hash: "#hifx" });
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
assert.ok((t.eosinShotgun.recoilL || 0) > 0, "cañón izquierdo con recoil");
assert.ok((t.eosinShotgun.recoilR || 0) > 0, "cañón derecho con recoil");
assert.ok((t.eosinShotgun.volleys || 0) >= 2, "ambos lóbulos disparan al arrancar");
const pellets0 = st.effects.filter((e) => e.kind === "granuleShot");
assert.ok(pellets0.length >= 8, "descarga inicial de cristales MBP");
assert.ok(pellets0.some((e) => e.side === -1), "pellets del lóbulo izquierdo");
assert.ok(pellets0.some((e) => e.side === 1), "pellets del lóbulo derecho");

g.step(0.2, 0.05);
assert.equal(game.__lerr, null, "render de la perdigonera no debe fallar");
assert.ok((t.eosinShotgun.volleys || 0) >= 3, "siguen las descargas escalonadas");
assert.ok(st.effects.some((e) => e.kind === "granuleShot"), "debe escupir cristales");

console.log("Smoke OK: perdigonera eosinófilo v3");
