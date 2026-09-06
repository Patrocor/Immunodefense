/** Captura Queratinocito en Fase 1 — DISPLAY=:1 node scripts/playtest-queratinocito.mjs */
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
  st.atp = 200;
  st.nextWaveAt = 0.08;
});
await sleep(1200);
await page.evaluate(() => {
  const g = window.__game;
  g.place("queratinocito", 0.45, 0.52);
  const t = g.state.towers[0];
  t.specialCharge = 1;
  t.specialReady = true;
  t.level = 2;
});
await sleep(800);
await page.screenshot({ path: join(ART, "queratinocito_ready.png") });
await page.evaluate(() => {
  window.__game.tapTower(0);
});
await sleep(600);
await page.screenshot({ path: join(ART, "queratinocito_secreting.png") });
await browser.close();
console.log("OK: queratinocito screenshots");
