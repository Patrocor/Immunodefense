import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { GAME_DATA_FILES } from "./data-manifest.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function loadGameDataInto(context) {
  for (const rel of GAME_DATA_FILES) {
    const src = await readFile(join(ROOT, rel), "utf8");
    vm.runInContext(src, context, { filename: rel });
  }
}
