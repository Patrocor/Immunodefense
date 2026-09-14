import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame(undefined, { hash: "#hifx" });
const kit = game.ImmunoDefenseData.organIdentity.endocarditis;
assert.ok(kit, "debe existir el kit de endocarditis");
assert.equal(kit.entry, "auricula", "entrada auricular, no grieta de piel");
assert.equal(kit.focus, "plato", "focos como casilla de Fase 1, no globo");
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
assert.equal((g.state.f2.cfg.foci || []).length, 5, "cinco nombres de casilla");
g.state.f2.cfg.foci.forEach(function (name) {
  assert.ok(String(name).indexOf(" ") > 0, "cada casilla tiene nombre de dos palabras: " + name);
});
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
  Math.hypot(outer.x - outer.pathX, outer.y - outer.pathY) > 36,
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

const td = game.ImmunoDefenseData.towerDefs;
assert.equal(td.macrofagoCardiaco.name, "Macrófago Valvular");
assert.equal(td.macrofagoCardiaco.shortName, "MΦ valvular");
assert.equal(td.macrofagoCardiaco.specialName, "Digestión");
assert.equal(td.macrofagoCardiaco.engulfAdhered, true);
assert.ok(!td.macrofagoCardiaco.conductionAura, "el MΦ valvular no conduce sístole");
assert.equal(td.endotelial.specialName, "Reendotelización");
assert.ok(td.monocito.patrols && td.monocito.patrols.radius > 0, "el monocito rueda");
assert.equal(td.monocito.stripVegetation, 1);

assert.equal(g.f2DockAllows("endotelial"), true);
assert.equal(g.f2DockAllows("monocito"), true);
assert.equal(g.f2DockAllows("macrofagoCardiaco"), true);
assert.equal(g.f2DockAllows("neutrofilo"), true);
assert.equal(g.f2DockAllows("linfocitoB"), true);
assert.equal(g.f2DockAllows("complemento"), true);
assert.equal(g.f2DockAllows("eosinofilo"), false, "eosinófilo no vive en la valva");
assert.equal(g.f2DockAllows("langerhans"), false);
assert.equal(g.f2DockAllows("queratinocito"), false);
assert.equal(g.f2DockAllows("sebocito"), false);
assert.equal(g.f2DockAllows("mastocito"), false);
assert.equal(g.f2DockAllows("pdc"), false);
assert.equal(g.f2DockAllows("linfocitogd"), false);
assert.equal(g.f2DockAllows("nk"), false);

["neutrofilo", "eosinofilo", "nk", "langerhans", "queratinocito", "mastocito",
 "sebocito", "pdc", "linfocitogd", "linfocitoB", "linfocitoT", "complemento",
 "endotelial", "monocito", "macrofagoCardiaco"].forEach(function (id) {
  if (g.state.unlockedTowers.indexOf(id) === -1) g.state.unlockedTowers.push(id);
});
g.state.loadout.towers = ["neutrofilo", "eosinofilo", "nk", "langerhans", "linfocitoB"];
g.state.loadout.tanks = ["complemento"];
g.relayout();
g.step(0.05, 0.05);
const dockIds = g.dockTypeIds();
assert.ok(dockIds.indexOf("endotelial") >= 0, "endotelio residente en dock");
assert.ok(dockIds.indexOf("monocito") >= 0, "monocito residente en dock");
assert.ok(dockIds.indexOf("macrofagoCardiaco") >= 0, "MΦ valvular residente en dock");
assert.ok(dockIds.indexOf("neutrofilo") >= 0, "neutrófilo de loadout sí entra");
assert.ok(dockIds.indexOf("eosinofilo") < 0, "eosinófilo filtrado del dock");
assert.ok(dockIds.indexOf("langerhans") < 0, "Langerhans filtrado del dock");
assert.ok(dockIds.indexOf("nk") < 0, "NK filtrado del dock");
assert.ok(dockIds.indexOf("queratinocito") < 0, "queratinocito filtrado del dock");

const nBeforeSkin = g.state.towers.length;
g.place("eosinofilo", 0.4, 0.5);
assert.equal(g.state.towers.length, nBeforeSkin, "no se planta una carta de piel en la valva");

function nxyAt(frac, lane, dx, dy) {
  const tot = g.pathLen(lane);
  const p = g.pathPos(tot * frac, lane);
  const F = g.metrics.FIELD;
  const worldW = F.w * (g.state.f2.cfg.stretchX || 1);
  const worldH = F.h * (g.state.f2.cfg.stretchY || 1);
  return {
    x: p.x, y: p.y,
    nx: (p.x + (dx || 0) - F.left) / worldW,
    ny: (p.y + (dy || 0) - F.top) / worldH
  };
}
function germAt(typeId, frac, lane, extra) {
  const d = game.ImmunoDefenseData.enemyDefs[typeId];
  const tot = g.pathLen(lane);
  const p = g.pathPos(tot * frac, lane);
  const e = {
    def: d, state: "walking", enteringTimer: 0, heridaIdx: lane,
    progress: tot * frac, progAtLastBeat: tot * frac,
    x: p.x, y: p.y, hp: d.hp, maxHp: d.hp,
    hitFlash: 0, dying: false, dead: false, absorbing: false,
    wobble: 0, radiusScale: 1, vegLayers: 0
  };
  if (extra) Object.assign(e, extra);
  return e;
}

g.state.towers = [];
g.state.enemies = [];
const macSpot = nxyAt(0.82, 2, 28, 0);
g.state.atp = 999;
g.place("macrofagoCardiaco", macSpot.nx, macSpot.ny);
assert.equal(g.state.towers.length, 1, "el MΦ valvular se planta en el velo");
assert.equal(g.state.towers[0].def.id, "macrofagoCardiaco");
g.state.enemies = [germAt("viridans", 0.82, 2, { vegLayers: 2 })];
const atp0 = g.state.atp;
g.step(2.2, 0.05);
const swallowed = !g.state.enemies.length || g.state.enemies.every(function (e) { return e.dead || e.dying; });
assert.ok(swallowed, "el MΦ valvular engulle al viridans clavado");
assert.ok(g.state.atp > atp0, "engullir suelta ATP");

g.state.towers = [];
g.state.enemies = [];
const macH = nxyAt(0.82, 2, 28, 0);
g.place("macrofagoCardiaco", macH.nx, macH.ny);
g.state.enemies = [germAt("hacek", 0.82, 2, { vegLayers: 0 })];
g.step(0.8, 0.05);
assert.equal(g.state.enemies[0].dead, false, "HACEK vivo si corre");
assert.ok(!g.state.enemies[0].beingEngulfed, "HACEK no clavado no entra a la boca");

g.state.towers = [];
g.state.enemies = [];
const monoSpot = nxyAt(0.55, 2, -30, 0);
g.place("monocito", monoSpot.nx, monoSpot.ny);
assert.equal(g.state.towers[0].def.id, "monocito");
const mx0 = g.state.towers[0].x, my0 = g.state.towers[0].y;
g.step(1.2, 0.05);
assert.ok(
  Math.hypot(g.state.towers[0].x - mx0, g.state.towers[0].y - my0) > 8,
  "el monocito rueda alrededor de su casilla"
);

g.state.towers = [];
g.state.enemies = [
  germAt("viridans", 0.46, 1, { vegLayers: 0 }),
  germAt("enterococo", 0.50, 2, { vegLayers: 0, shieldHP: 4 }),
  germAt("hacek", 0.54, 3, { vegLayers: 0 })
];
g.state.f2.pulseT = 1.4;
g.step(0.08, 0.02);
assert.equal(game.__lerr, null, "las tres siluetas de endocarditis renderizan");
assert.equal(g.state.enemies.length, 3, "los tres gérmenes siguen en el carril");

g.goF2("osteomielitis");
g.state.f2.introTimer = 0;
g.step(0.05, 0.05);
assert.equal(game.__lerr, null, "osteomielitis sin kit no debe fallar");
assert.equal(g.organIdentity(), null, "osteomielitis sigue sin kit");
assert.ok(!(g.state.f2.atheromas && g.state.f2.atheromas.length), "osteomielitis no siembra ateromas");
assert.equal(g.f2DockAllows("eosinofilo"), true, "el filtro de piel es solo de endocarditis");

g.goF2("artritis");
g.state.f2.introTimer = 0;
g.step(0.05, 0.05);
assert.equal(game.__lerr, null, "artritis sin kit no debe fallar");

console.log("Smoke OK: identidad endocarditis");
