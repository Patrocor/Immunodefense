/** Captura Mastocito — DISPLAY=:1 node scripts/playtest-mastocito.mjs */
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
  g.place("mastocito", 0.48, 0.50);
  g.place("neutrofilo", 0.62, 0.46);
  const m = g.state.towers[0];
  m.specialCharge = 0.65;
  m.level = 1;
});
await sleep(700);
await page.screenshot({ path: join(ART, "mastocito_idle_aura.png") });
await page.evaluate(() => {
  const g = window.__game;
  const m = g.state.towers[0];
  const n = g.state.towers[1];
  n.histBuffT = 0.85;
  m.attackAnim = 0.14;
  m.ilc2MastoT = 4.5;
});
await sleep(400);
await page.screenshot({ path: join(ART, "mastocito_degranulate.png") });
await page.evaluate(() => {
  const g = window.__game;
  const m = g.state.towers[0];
  m.specialReady = true;
  m.specialCharge = 1;
  m.specialAnim = 0.55;
  m.attackAnim = 0;
  const U = g.metrics.U;
  const maR = 130 * U * 1.6;
  g.state.effects.push({
    kind: "mastocWave",
    x: m.x,
    y: m.y,
    r: maR,
    life: 0.35,
    max: 0.7,
  });
});
await sleep(350);
await page.screenshot({ path: join(ART, "mastocito_ultimate_wave.png") });
await browser.close();
console.log("OK: mastocito screenshots");
