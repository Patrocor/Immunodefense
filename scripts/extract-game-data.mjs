/**
 * One-off helper: copies static data blocks from game.js into data/*.js
 * Run: node scripts/extract-game-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const lines = readFileSync(join(ROOT, "game.js"), "utf8").split("\n");

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n").replace(/^  /gm, "");
}

function wrapIife(body, assigns) {
  const footer = assigns.map(({ local, key }) => `  root.${key} = ${local};`).join("\n");
  return `(function (root) {
${body}
${footer}
})(window.ImmunoDefenseData);
`;
}

writeFileSync(
  join(ROOT, "data/towers.js"),
  wrapIife(
    [
      slice(1021, 1509),
      slice(1510, 1510),
      slice(1511, 1517),
      slice(1519, 1523),
      slice(1530, 1538),
      slice(1542, 1542),
    ].join("\n"),
    [
      { local: "TOWER_DEFS", key: "towerDefs" },
      { local: "MAC_COST", key: "macCost" },
      { local: "TOWER_LIST", key: "towerList" },
      { local: "F2_ORGAN_TOWERS", key: "f2OrganTowers" },
      { local: "TOWER_GROUPS", key: "towerGroups" },
      { local: "LOADOUT_LIMITS", key: "loadoutLimits" },
    ]
  ),
  "utf8"
);

writeFileSync(
  join(ROOT, "data/enemies.js"),
  wrapIife(
    [slice(1586, 1909), slice(1916, 1927), slice(1937, 1946)].join("\n"),
    [
      { local: "ENEMY_DEFS", key: "enemyDefs" },
      { local: "SIGNATURE_ATTACK_DEFS", key: "signatureAttackDefs" },
      { local: "VIRAL_BY_TYPE", key: "viralByType" },
    ]
  ),
  "utf8"
);

writeFileSync(
  join(ROOT, "data/f2-levels.js"),
  wrapIife(
    [
      slice(6212, 6393),
      slice(6394, 6426),
      slice(6428, 6612),
      slice(6614, 6680),
      "for (var f3k in F3_LEVELS) if (F3_LEVELS.hasOwnProperty(f3k)) F2_LEVELS[f3k] = F3_LEVELS[f3k];",
      "for (var f45k in F45_LEVELS) if (F45_LEVELS.hasOwnProperty(f45k)) F2_LEVELS[f45k] = F45_LEVELS[f45k];",
      slice(6686, 6690),
    ].join("\n"),
    [
      { local: "F2_LEVELS", key: "f2Levels" },
      { local: "F2_TO_F3", key: "f2ToF3" },
    ]
  ),
  "utf8"
);

console.log("Extracted data/towers.js, data/enemies.js, data/f2-levels.js");
