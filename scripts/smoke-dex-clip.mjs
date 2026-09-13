import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTestGame } from "./test-bootstrap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "game.js"), "utf8");

assert.ok(src.includes("detailBottom"), "el Dex recorta el panel de detalle");
assert.ok(src.includes("function macrophageBodyPath"), "silueta de 5 lóbulos");
assert.ok(src.includes("ready ? \"LISTO\""), "medidor C3b tiene estado listo");
assert.ok(src.includes("drawSerumShell(v.x, v.y, v.w, v.h, ready)"), "C3b usa tira de suero");

function unlockDex(st, data) {
  st.unlockedTowers = Object.keys(data.towerDefs || {});
  st.vistos = {};
  const enemies = data.enemyDefs || {};
  for (const id of Object.keys(enemies)) st.vistos[id] = true;
}

const game = createTestGame();
const g = game.__game;
const st = g.state;
st.showTitle = false;
st.showIntro = false;
unlockDex(st, game.ImmunoDefenseData);
st.compendiumOpen = true;
st.loadoutEditing = false;
st.compendiumTab = "cells";
st.compendiumSelected = "neutrofilo";
g.relayout();
game.__lerr = null;
g.step(0.2, 0.05);
assert.equal(game.__lerr, null, "Dex células + detalle no debe fallar");

st.compendiumTab = "germs";
st.compendiumSelected = "saureus";
g.relayout();
game.__lerr = null;
g.step(0.2, 0.05);
assert.equal(game.__lerr, null, "Dex gérmenes + detalle no debe fallar");

st.complement = 5;
st.compendiumOpen = false;
g.spawnGuardianAt(0.4, 0.45);
g.relayout();
game.__lerr = null;
g.step(0.2, 0.05);
assert.equal(game.__lerr, null, "macrófago idle + C3b listo no debe fallar");

console.log("Smoke OK: Dex clip + macrófago + C3b");
