import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();
game.__game.state.showTitle = false;
game.__game.state.showIntro = false;
game.__lerr = null;
game.__game.step(0.08, 0.04);
assert.equal(game.__lerr, null, "el carril-herida no debe romper el render de Fase 1");

game.__game.place("neutrofilo", 0.38, 0.38);
assert.ok(game.__game.state.towers.length >= 1, "la colocación fuera del path sigue válida");

game.__lerr = null;
game.__game.step(0.05, 0.05);
assert.equal(game.__lerr, null, "render con torre sobre el nuevo carril no debe fallar");

console.log("Smoke OK: carril-herida Fase 1");
