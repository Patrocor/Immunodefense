import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();
const g = game.__game;
g.state.showTitle = false;
g.state.showIntro = false;
g.state.enemies = [];
g.state.towers = [];
g.state.mitosis = null;

const kinds = ["platelets", "keratin", "endothelium", "fibroblasts", "sweepers"];
for (const kind of kinds) {
  const played = g.vignettePlay(kind);
  assert.equal(played, kind, "debe poder armar la viñeta " + kind);
  game.__lerr = null;
  g.step(0.4, 0.05);
  assert.equal(game.__lerr, null, "render de " + kind + " no debe fallar");
  assert.ok(g.state.cellVignettes.act, kind + " sigue activa a mitad de escena");
}

const field = g.metrics.FIELD;
const ker = g.vignettePlay("keratin");
assert.equal(ker, "keratin");
const act = g.state.cellVignettes.act;
assert.ok(act.left && act.left.length >= 3, "brigada izquierda hasta la herida");
assert.ok(act.right && act.right.length >= 3, "brigada derecha hasta la herida");
assert.ok(act.left[0].x - field.left < field.w * 0.08, "izquierda nace en el borde");
assert.ok(field.right - act.right[0].x < field.w * 0.08, "derecha nace en el borde");
const leftTip = act.left[act.left.length - 1];
const rightTip = act.right[act.right.length - 1];
assert.ok(Math.abs(leftTip.x - act.woundX) < 40, "izquierda llega a la herida");
assert.ok(Math.abs(rightTip.x - act.woundX) < 40, "derecha llega a la herida");

g.state.cellVignettes.act = null;
g.state.cellVignettes.gap = 0;
g.state.cellVignettes.kindIdx = -1;
g.step(0.2, 0.05);
assert.ok(g.state.cellVignettes.act, "el turno debe lanzar la siguiente viñeta sola");
assert.equal(game.__lerr, null);

console.log("Smoke OK: viñetas celulares");
