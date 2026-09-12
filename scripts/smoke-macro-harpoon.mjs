import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();
const g = game.__game;
const st = g.state;
st.showTitle = false;
st.showIntro = false;
st.atp = 200;
st.enemies = [];
st.towers = [];
st.guardians = [];
st.macrofagoUltimate = { ready: true, charge: 1 };

const mac = g.spawnGuardianAt(0.42, 0.48);
assert.ok(mac && st.guardians.length === 1, "debe spawnear el macrófago");

const def = game.ImmunoDefenseData.enemyDefs.saureus
  || game.ImmunoDefenseData.enemyDefs.staph
  || Object.values(game.ImmunoDefenseData.enemyDefs)[0];
assert.ok(def, "hace falta un germen de prueba");

st.enemies = [{
  def,
  state: "walking",
  enteringTimer: 0,
  x: mac.x + 80,
  y: mac.y,
  progress: 0.55,
  radiusScale: 1,
  hp: def.hp || 40,
  maxHp: def.hp || 40,
  hitFlash: 0,
  dying: false,
  dead: false,
  wobble: 0,
  beingEngulfed: false,
  beingDropped: false,
}];

const fired = g.tryMacroUlt();
assert.equal(fired, true, "el Arpón debe enganchar al germen en rango");
assert.equal(mac.harpoonPhase, "throw", "fase inicial throw");
assert.ok(mac.harpoonTarget, "tiene objetivo");
assert.equal(st.macrofagoUltimate.ready, false, "consume la carga");

game.__lerr = null;
g.step(0.35, 0.05);
assert.equal(game.__lerr, null, "render del seudópodo-arpón no debe fallar");
assert.ok(mac.harpoonPhase === "pull" || mac.engulfTarget, "pasa a pull o fagocitosis");

console.log("Smoke OK: Arpón del macrófago");
