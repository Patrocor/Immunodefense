import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const sandbox = createTestGame();
const data = sandbox.__game.testData();

function collectWaveGermIds(waveTable) {
  const ids = new Set();
  for (const wave of waveTable) {
    for (const group of wave) ids.add(group[0]);
  }
  return ids;
}

function collectF1GermIds(waveTable) {
  const ids = new Set();
  for (const waveNum in waveTable) {
    if (!Object.prototype.hasOwnProperty.call(waveTable, waveNum)) continue;
    for (const group of waveTable[waveNum]) ids.add(group[0]);
  }
  return ids;
}

const enemyIds = new Set(data.enemyIds);
const towerIds = new Set(data.towerIds);
const mapKeys = new Set(data.mapNodeKeys);

assert.equal(data.disseminationWaveTable.length, 12, "Diseminación debe tener 12 oleadas");

for (const germId of collectF1GermIds(data.waveTable)) {
  assert.ok(enemyIds.has(germId), `Fase 1 referencia germen desconocido: ${germId}`);
}

for (const germId of collectWaveGermIds(data.disseminationWaveTable)) {
  assert.ok(enemyIds.has(germId), `Diseminación referencia germen desconocido: ${germId}`);
}

for (const [levelKey, level] of Object.entries(data.f2Levels)) {
  assert.equal(
    level.waveCount,
    level.leakCount,
    `${levelKey}: waves y leak deben tener la misma longitud`
  );

  for (const towerId of level.towers) {
    assert.ok(towerIds.has(towerId), `${levelKey} referencia torre desconocida: ${towerId}`);
  }

  for (const germId of level.germPool) {
    assert.ok(enemyIds.has(germId), `${levelKey} referencia germen desconocido en pool: ${germId}`);
  }
}

for (const nodeKey of data.mapNodeKeys) {
  assert.ok(data.mapNodeContent[nodeKey], `falta MAP_NODE_CONTENT para ${nodeKey}`);
}

for (const [nodeKey, content] of Object.entries(data.mapNodeContent)) {
  if (nodeKey === "fase1") {
    assert.equal(content.built, false, "fase1 no debe ser rejugable desde el mapa");
    continue;
  }
  assert.equal(content.built, true, `${nodeKey} debe estar marcado como built`);
}

for (const edge of data.mapEdges) {
  assert.ok(mapKeys.has(edge.from), `edge.from desconocido: ${edge.from}`);
  assert.ok(mapKeys.has(edge.to), `edge.to desconocido: ${edge.to}`);
}

assert.equal(data.achievementIds.length, 10, "debe haber 10 logros definidos");

console.log("Invariantes OK: oleadas, torres, gérmenes, mapa y logros");
