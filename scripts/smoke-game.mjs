import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();

assert.ok(game.__game, "game.js debe exponer window.__game");
assert.equal(game.__game.state.showTitle, true, "el juego debe iniciar en el título");
assert.equal(game.__game.achievements().total, 10, "el catálogo de logros debe cargar");

const levels = [
  "endocarditis",
  "osteomielitis",
  "artritis",
  "f3_pulm",
  "f3_cereb",
  "f3_bazo",
  "f3_epid",
  "f3_bact",
  "f3_fasc",
  "f3_multi",
  "f3_osloc",
  "f3_pust",
  "sepsis",
  "mods",
];

for (const key of levels) {
  game.__lerr = null;
  game.__game.goF2(key);
  assert.equal(game.__game.state.f2?.cfg?.key, key, `debe entrar al nivel ${key}`);
  game.__game.step(0.05, 0.05);
  assert.equal(game.__lerr, null, `el primer frame de ${key} no debe fallar`);
}

console.log(`Smoke OK: título, logros y ${levels.length} niveles cargados`);
