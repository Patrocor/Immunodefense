/** Captura Nicho — secreción + Muro córneo. DISPLAY=:1 node scripts/playtest-queratinocito.mjs */
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
  g.place("queratinocito", 0.46, 0.48);
  const t = g.state.towers[0];
  t.specialCharge = 0.7;
  t.level = 1;
});
await sleep(500);
await page.screenshot({ path: join(ART, "queratinocito_idle.png") });
await page.evaluate(() => {
  window.__game.step(5.2, 0.05);
});
await page.evaluate(() => {
  const t = window.__game.state.towers[0];
  t.specialReady = true;
  t.specialCharge = 1;
  t.keraCornifyPending = false;
  window.__game.tapTower(0);
});
await page.evaluate(() => { window.__game.step(0.35, 0.03); window.__game.hold(true); });
await sleep(80);
await page.screenshot({ path: join(ART, "queratinocito_secreting.png") });
await page.evaluate(() => {
  window.__game.hold(false);
  const t = window.__game.state.towers[0];
  t.keraCornifyPending = true;
  t.specialReady = true;
  t.specialCharge = 1;
  window.__game.tapTower(0);
  window.__game.step(0.28, 0.03);
  window.__game.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "queratinocito_muro_launch.png") });
await page.evaluate(() => {
  window.__game.hold(false);
  window.__game.step(0.85, 0.03);
  window.__game.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "queratinocito_cornify.png") });
await browser.close();
console.log("OK: queratinocito screenshots");
