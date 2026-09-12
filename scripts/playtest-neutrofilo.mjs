/** Captura Neutrófilo — DISPLAY=:1 node scripts/playtest-neutrofilo.mjs */
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
  g.place("neutrofilo", 0.42, 0.50);
  g.place("queratinocito", 0.58, 0.54);
  const n = g.state.towers[0];
  n.kcBuffT = 2.5;
  n.specialCharge = 0.7;
});
await sleep(600);
await page.screenshot({ path: join(ART, "neutrofilo_il8_buff.png") });
await page.evaluate(() => {
  window.__game.step(8, 0.05);
});
await sleep(400);
await page.screenshot({ path: join(ART, "neutrofilo_combat.png") });
await page.evaluate(() => {
  const n = window.__game.state.towers[0];
  n.specialReady = true;
  n.specialCharge = 1;
  const tx = n.x + 95;
  const ty = n.y - 35;
  n.biteUlt = { targets: [{ x: tx, y: ty, enemy: null }], idx: 0, nextAt: 0.04 };
  n.specialAnim = 0.55;
  n.lastTargetX = tx;
  n.lastTargetY = ty;
});
await sleep(200);
await page.screenshot({ path: join(ART, "neutrofilo_nam_ultimate.png") });
await page.evaluate(() => {
  window.__game.step(12, 0.05);
});
await sleep(400);
await page.screenshot({ path: join(ART, "neutrofilo_nam_chomp.png") });
await browser.close();
console.log("OK: neutrofilo screenshots");
