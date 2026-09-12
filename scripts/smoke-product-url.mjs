import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCT = "https://immunodefense.vercel.app";
const html = readFileSync(join(ROOT, "index.html"), "utf8");
const readme = readFileSync(join(ROOT, "README.md"), "utf8");

assert.match(html, /rel="canonical" href="https:\/\/immunodefense\.vercel\.app\/"/);
assert.match(html, /patrocor\.github\.io/);
assert.match(html, /location\.replace\("https:\/\/immunodefense\.vercel\.app\/"/);

const jugar = readme.split("## Campaña")[0];
assert.match(jugar, new RegExp(PRODUCT.replace(/\./g, "\\.")));
assert.doesNotMatch(jugar, /github\.io/);

console.log("Smoke OK: un solo producto (" + PRODUCT + ")");
