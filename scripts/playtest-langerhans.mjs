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
await sleep(1100);
await page.evaluate(() => {
  const g = window.__game;
  g.place("langerhans", 0.42, 0.28);
  const l = g.state.towers.find((t) => t.def.id === "langerhans");
  if (l) { l.specialCharge = 0.55; l.level = 1; }
});
await sleep(600);
await page.screenshot({ path: join(ART, "langerhans_idle.png") });
await page.evaluate(() => {
  window.__game.step(6.5, 0.05);
});
await page.evaluate(() => {
  const g = window.__game;
  const l = g.state.towers.find((t) => t.def.id === "langerhans");
  if (!l) return;
  l.specialReady = true;
  l.specialCharge = 1;
  g.ults();
});
await page.evaluate(() => {
  window.__game.step(0.5, 0.04);
});
await sleep(200);
await page.screenshot({ path: join(ART, "langerhans_impale.png") });
await page.evaluate(() => {
  window.__game.step(0.45, 0.04);
});
await sleep(200);
await page.screenshot({ path: join(ART, "langerhans_mhc_storm.png") });
await browser.close();
console.log("OK: langerhans screenshots");
