/**
 * Replace compendium/persistence inline data in game.js with gameData() lookups.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(ROOT, "game.js");
const lines = readFileSync(path, "utf8").split("\n");

function replaceRange(start, end, replacementLines) {
  lines.splice(start - 1, end - start + 1, ...replacementLines);
}

replaceRange(4456, 4456, ['  var VISTOS_KEY = gameData("storageKeys").vistos;']);

replaceRange(4241, 4241, ['  var ACHIEVEMENTS_KEY = gameData("storageKeys").achievements;']);

replaceRange(4175, 4175, ['  var CAMPAIGN_KEY = gameData("storageKeys").campaign;']);

replaceRange(4147, 4152, [
  "  var META = Object.assign({}, gameData(\"metaDefaults\"));",
]);

replaceRange(2631, 2778, [
  "  var TOWER_LORE = gameData(\"towerLore\");",
  "  var ENEMY_LORE = gameData(\"enemyLore\");",
  "  var MACROFAGO_LIBRE_DEF = gameData(\"macrofagoLibreDef\");",
]);

replaceRange(2826, 2826, ['  var COMPENDIUM_LEGACY_IDS = gameData("compendiumLegacyIds");']);

// localStorage keys for meta/muted/vistos legacy cleanup
const metaLoadIdx = lines.findIndex((l) => l.includes('localStorage.getItem("immunodefense_meta")'));
if (metaLoadIdx >= 0) {
  lines[metaLoadIdx] = lines[metaLoadIdx].replace(
    '"immunodefense_meta"',
    'gameData("storageKeys").meta'
  );
}
const metaSaveIdx = lines.findIndex((l) => l.includes('localStorage.setItem("immunodefense_meta"'));
if (metaSaveIdx >= 0) {
  lines[metaSaveIdx] = lines[metaSaveIdx].replace(
    '"immunodefense_meta"',
    'gameData("storageKeys").meta'
  );
}
const mutedGetIdx = lines.findIndex((l) => l.includes('localStorage.getItem("immunodefense_muted")'));
if (mutedGetIdx >= 0) {
  lines[mutedGetIdx] = lines[mutedGetIdx].replace(
    '"immunodefense_muted"',
    'gameData("storageKeys").muted'
  );
}
const mutedSetIdx = lines.findIndex((l) => l.includes('localStorage.setItem("immunodefense_muted"'));
if (mutedSetIdx >= 0) {
  lines[mutedSetIdx] = lines[mutedSetIdx].replace(
    '"immunodefense_muted"',
    'gameData("storageKeys").muted'
  );
}

// legacy vistos cleanup loop
const legacyRemoveStart = lines.findIndex((l) =>
  l.includes('localStorage.removeItem("immunodefense_pathogens_seen")')
);
if (legacyRemoveStart >= 0) {
  lines.splice(legacyRemoveStart, 2, [
    "      var legacyVistos = gameData(\"storageKeys\").legacyVistos;",
    "      for (var li = 0; li < legacyVistos.length; li++) {",
    "        try { localStorage.removeItem(legacyVistos[li]); } catch (eLegacy) {}",
    "      }",
  ]);
}

writeFileSync(path, lines.join("\n"), "utf8");
console.log("game.js persistence references updated");
