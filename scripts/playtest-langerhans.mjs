/** Captura Langerhans — DISPLAY=:1 node scripts/playtest-langerhans.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);
await page.evaluate(() => {
  const st = window.__game.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 300;
  st.nextWaveAt = 0.08;
});
await sleep(1200);
await page.evaluate(() => {
  const g = window.__game;
  g.place("langerhans", 0.48, 0.50);
  g.place("neutrofilo", 0.62, 0.46);
  const l = g.state.towers.find((t) => t.def.id === "langerhans");
  if (l) { l.specialCharge = 0.72; l.level = 1; }
});
await sleep(700);
await page.screenshot({ path: join(ART, "langerhans_idle.png") });
await page.evaluate(() => {
  const g = window.__game;
  const l = g.state.towers.find((t) => t.def.id === "langerhans");
  if (!l) return;
  l.attackAnim = 0.22;
  const U = g.metrics.U;
  g.state.effects.push({
    kind: "dendriteWhip",
    x1: l.x,
    y1: l.y,
    x2: l.x + 90 * U,
    y2: l.y - 40 * U,
    life: 0.28,
    max: 0.38,
    color: l.def.color,
  });
});
await sleep(350);
await page.screenshot({ path: join(ART, "langerhans_whip.png") });
await page.evaluate(() => {
  const g = window.__game;
  const l = g.state.towers.find((t) => t.def.id === "langerhans");
  if (!l) return;
  l.specialReady = true;
  l.specialCharge = 1;
  l.specialAnim = 0.75;
  l.attackAnim = 0;
  const U = g.metrics.U;
  const lR = 155 * U * 1.3;
  g.state.effects.push({
    kind: "novaRing",
    x: l.x,
    y: l.y,
    r: lR,
    color: "#3FC1C9",
    life: 0.45,
    max: 0.8,
  });
});
await sleep(350);
await page.screenshot({ path: join(ART, "langerhans_mhc_storm.png") });
await browser.close();
console.log("OK: langerhans screenshots");
