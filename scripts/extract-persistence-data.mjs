/**
 * Extract persistence/compendium static data from game.js into data/persistence.js
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const lines = readFileSync(join(ROOT, "game.js"), "utf8").split("\n");

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n").replace(/^  /gm, "");
}

const body = [
  "root.storageKeys = {",
  '  meta: "immunodefense_meta",',
  '  campaign: "immunodefense_campaign_v1",',
  '  achievements: "immunodefense_achievements_v1",',
  '  vistos: "immunodefense_pathogens_seen_v3",',
  '  muted: "immunodefense_muted",',
  '  legacyVistos: ["immunodefense_pathogens_seen", "immunodefense_pathogens_seen_v2"]',
  "};",
  "root.metaDefaults = {",
  "  totalPathogensDefeated: 0,",
  "  totalPathogensInfiltrated: 0,",
  "  wavesReached: 1,",
  "  highestLevelReached: 1",
  "};",
  slice(2631, 2728),
  slice(2729, 2764),
  slice(2768, 2778),
  'var COMPENDIUM_LEGACY_IDS = ["bacteria", "virus", "hongo", "boss", "bossBacteria", "bossVirus", "bossHongo"];',
  "root.towerLore = TOWER_LORE;",
  "root.enemyLore = ENEMY_LORE;",
  "root.macrofagoLibreDef = MACROFAGO_LIBRE_DEF;",
  "root.compendiumLegacyIds = COMPENDIUM_LEGACY_IDS;",
].join("\n");

writeFileSync(
  join(ROOT, "data/persistence.js"),
  `(function (root) {
${body}
})(window.ImmunoDefenseData);
`,
  "utf8"
);

console.log("Wrote data/persistence.js");
