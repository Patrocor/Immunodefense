/** Captura Mastocito — geyser de desgranulación. DISPLAY=:1 node scripts/playtest-mastocito.mjs */
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
  g.place("mastocito", 0.46, 0.48);
  const m = g.state.towers[0];
  if (m) { m.specialCharge = 0.7; m.level = 1; }
});
await sleep(500);
await page.screenshot({ path: join(ART, "mastocito_idle_aura.png") });
await page.evaluate(() => { window.__game.step(5.2, 0.05); });
await page.evaluate(() => {
  const m = window.__game.state.towers[0];
  m.specialReady = true;
  m.specialCharge = 1;
  window.__game.ults();
});
await page.evaluate(() => { window.__game.step(0.22, 0.03); window.__game.hold(true); });
await sleep(80);
await page.screenshot({ path: join(ART, "mastocito_geyser.png") });
await page.evaluate(() => {
  window.__game.hold(false);
  window.__game.step(1.15, 0.03);
  window.__game.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "mastocito_ultimate_wave.png") });
await browser.close();
console.log("OK: mastocito screenshots");
