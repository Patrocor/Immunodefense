import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame(undefined, { hash: "#hifx" });
const kit = game.ImmunoDefenseData.organIdentity.endocarditis;
assert.ok(kit, "debe existir el kit de endocarditis");
assert.equal(kit.entry, "auricula", "entrada auricular, no grieta de piel");
assert.equal(kit.focus, "velo", "focos de velo/comisura/cuerda");
assert.ok(kit.path && kit.path.lumen, "carril con paleta de sangre");
assert.equal(kit.labelKit, "Válvula+Pulso");

const g = game.__game;
assert.ok(g.organIdentity("endocarditis"), "__game.organIdentity lee el kit");
assert.equal(g.organIdentity("osteomielitis"), null, "otros órganos aún no tienen kit");

g.goF2("endocarditis");
assert.equal(g.state.f2.cfg.key, "endocarditis");
assert.ok(g.organIdentity(), "el nivel activo expone el kit");
g.state.f2.introTimer = 0;
g.state.f2.pulseT = 0.10;
g.step(0.05, 0.05);
assert.equal(g.f2Markers().length, 5, "cinco ostia/focos de la mitral");
assert.equal(game.__lerr, null, "render de endocarditis con kit no debe fallar");
assert.equal(g.state.f2.inSystole, true, "pulseT bajo debe estar en sístole");
assert.equal(g.state.f2.ambient.v, 2, "ambiente mitral v2");
assert.ok(g.state.f2.ambient.motas.length >= 36, "sangre con motas suficientes");
assert.ok(g.state.f2.ambient.streamers && g.state.f2.ambient.streamers.length >= 5, "chorros de plasma");
g.state.f2.integrity = 40;
g.step(0.05, 0.05);
assert.equal(game.__lerr, null, "render con válvula erosionada no debe fallar");

assert.ok((g.state.f2.atheromas || []).length >= 2, "endocarditis siembra ateromas");
const ath = g.state.f2.atheromas[0];
const totLane = g.pathLen(ath.lane);
const pBulge = g.pathPos(ath.atFrac * totLane, ath.lane);
ath.excavated = 1;
const pStraight = g.pathPos(ath.atFrac * totLane, ath.lane);
assert.ok(
  Math.hypot(pBulge.x - pStraight.x, pBulge.y - pStraight.y) > 10,
  "el ateroma deforma el carril"
);
ath.excavated = 0;
const outer = g.atheromaOuter(0, 0.5);
assert.ok(outer, "la cuadrilla expone un punto exterior");
assert.ok(
  Math.hypot(outer.x - outer.pathX, outer.y - outer.pathY) > 22,
  "la cuadrilla cava fuera del carril"
);
g.step(2.0, 0.05);
assert.ok(ath.excavated > 0.03, "la cuadrilla excava con el tiempo");
assert.ok(ath.excavated < 0.12, "la excavación es lenta, no instantánea");
assert.equal(game.__lerr, null, "render con ateromas vivos no debe fallar");

const totV = g.pathLen(2);
const def = game.ImmunoDefenseData.enemyDefs.viridans;
const frac = 0.78;
g.state.enemies = [{
  def, state: "walking", enteringTimer: 0, heridaIdx: 2,
  progress: totV * frac, progAtLastBeat: totV * frac,
  x: 0, y: 0, hp: def.hp, maxHp: def.hp,
  hitFlash: 0, dying: false, dead: false, absorbing: false, wobble: 0, radiusScale: 1
}];
g.state.f2.inSystole = false;
g.state.f2.pulseT = 2.58;
const before = g.state.enemies[0].progress;
g.step(0.05, 0.05);
const after = g.state.enemies[0].progress;
assert.equal(g.state.enemies[0].dead, false, "el germen del tercio distal sigue vivo");
assert.ok(after < before, "el velo empuja un poco al germen");
assert.ok(after > totV * 0.52, "el empujón no ancla: queda por encima del 52%");
assert.ok(g.state.f2.valveSlap > 0, "valveSlap se enciende en sístole");

g.goF2("osteomielitis");
g.state.f2.introTimer = 0;
g.step(0.05, 0.05);
assert.equal(game.__lerr, null, "osteomielitis sin kit no debe fallar");
assert.equal(g.organIdentity(), null, "osteomielitis sigue sin kit");
assert.ok(!(g.state.f2.atheromas && g.state.f2.atheromas.length), "osteomielitis no siembra ateromas");

g.goF2("artritis");
g.state.f2.introTimer = 0;
g.step(0.05, 0.05);
assert.equal(game.__lerr, null, "artritis sin kit no debe fallar");

console.log("Smoke OK: identidad endocarditis");
