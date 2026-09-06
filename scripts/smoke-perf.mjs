import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_DATA_FILES } from "./data-manifest.mjs";
import { createTestGame } from "./test-bootstrap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadBytes() {
  let bytes = readFileSync(join(ROOT, "game.js")).length;
  for (const rel of GAME_DATA_FILES) bytes += readFileSync(join(ROOT, rel)).length;
  return bytes;
}

function countWaveGerms(groups) {
  return groups.reduce((sum, g) => sum + g[1], 0);
}

const bytes = loadBytes();
const t0 = performance.now();
const sandbox = createTestGame();
const bootMs = performance.now() - t0;
const game = sandbox.__game;

assert.ok(game.perfSnapshot, "falta __game.perfSnapshot()");
assert.ok(game.quality, "falta __game.quality()");

game.goDissemination();
game.state.disseminationIntroTimer = 0;
game.state.waveCountdownActive = false;
for (let w = 0; w < 12; w++) game.startDissemWave();
game.step(60, 0.05);

const dissem = game.perfSnapshot();
assert.ok(dissem.peakEnemies >= 1, "Diseminación debe generar enemigos bajo carga");

game.goF2("sepsis");
game.state.f2.introTimer = 0;
for (let i = 0; i < 8; i++) game.startF2Wave();
game.step(40, 0.05);
const sepsis = game.perfSnapshot();

game.goF2("mods");
game.state.f2.introTimer = 0;
for (let j = 0; j < 7; j++) game.startF2Wave();
game.step(40, 0.05);
const mods = game.perfSnapshot();

const table = game.testData().disseminationWaveTable;
const totals = table.map(countWaveGerms);
for (let i = 1; i < totals.length; i++) {
  assert.ok(totals[i] >= totals[i - 1], `Diseminación ola ${i + 1} debe ser >= ola ${i} (${totals[i]} vs ${totals[i - 1]})`);
}

console.log(
  JSON.stringify(
    {
      parseBytes: bytes,
      bootMs: Math.round(bootMs),
      engineBootMs: Math.round(dissem.bootMs || 0),
      dissemination: {
        peakEnemies: dissem.peakEnemies,
        peakEffects: dissem.peakEffects,
        simSeconds: Math.round(dissem.simSeconds)
      },
      sepsis: { peakEnemies: sepsis.peakEnemies, peakEffects: sepsis.peakEffects },
      mods: { peakEnemies: mods.peakEnemies, peakEffects: mods.peakEffects },
      disseminationWaveTotals: totals
    },
    null,
    2
  )
);

console.log("Perf OK: carga, picos de Diseminación/Sepsis/MODS y curva de oleadas");
