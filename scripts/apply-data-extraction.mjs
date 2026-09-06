/**
 * Replaces extracted inline data in game.js with gameData() lookups.
 * Run after extract-game-data.mjs
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

// Apply bottom-up so indices stay valid.
replaceRange(6212, 6690, [
  "  var F2_LEVELS = gameData(\"f2Levels\");",
  "  var F2_TO_F3 = gameData(\"f2ToF3\");",
]);

replaceRange(1586, 1946, [
  "  var ENEMY_DEFS = gameData(\"enemyDefs\");",
  "  var SIGNATURE_ATTACK_DEFS = gameData(\"signatureAttackDefs\");",
  "",
  "  // -------- STATE ---------------------------------------------------------",
  "  var state;",
  "  // -------- PHASE 1 CONFIG ------------------------------------------------",
  "  var INFESTACION_THRESHOLD = 100;",
  "  var VIRAL_BY_TYPE = gameData(\"viralByType\");",
]);

replaceRange(1021, 1542, [
  "  var TOWER_DEFS = gameData(\"towerDefs\");",
  "  var MAC_COST = gameData(\"macCost\");",
  "  var TOWER_LIST = gameData(\"towerList\");",
  "  var F2_ORGAN_TOWERS = gameData(\"f2OrganTowers\");",
  "  var TOWER_GROUPS = gameData(\"towerGroups\");",
  "  var LOADOUT_LIMITS = gameData(\"loadoutLimits\");",
]);

writeFileSync(path, lines.join("\n"), "utf8");
console.log("game.js updated with gameData() references");
