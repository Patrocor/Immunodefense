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

g.state.cellVignettes.act = null;
g.state.cellVignettes.gap = 0;
g.state.cellVignettes.kindIdx = -1;
g.step(0.2, 0.05);
assert.ok(g.state.cellVignettes.act, "el turno debe lanzar la siguiente viñeta sola");
assert.equal(game.__lerr, null);

console.log("Smoke OK: viñetas celulares");
