/** Captura NK — idle + Frenesí (sale / corte / vuelve). DISPLAY=:1 node scripts/playtest-nk.mjs */
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
  g.place("nk", 0.46, 0.48);
  const n = g.state.towers.find((t) => t.def.id === "nk");
  if (n) { n.specialCharge = 0.7; n.level = 1; }
});
await sleep(600);
await page.screenshot({ path: join(ART, "nk_idle.png") });
await page.evaluate(() => {
  window.__game.step(5.5, 0.05);
});
await page.evaluate(() => {
  const g = window.__game;
  const n = g.state.towers.find((t) => t.def.id === "nk");
  if (!n) return;
  n.specialReady = true;
  n.specialCharge = 1;
  g.ults();
});
await page.evaluate(() => { window.__game.step(0.22, 0.03); });
await sleep(160);
await page.screenshot({ path: join(ART, "nk_frenesi_launch.png") });
await page.evaluate(() => { window.__game.step(0.85, 0.03); });
await sleep(160);
await page.screenshot({ path: join(ART, "nk_frenesi_ultimate.png") });
await page.evaluate(() => { window.__game.step(1.55, 0.03); });
await sleep(160);
await page.screenshot({ path: join(ART, "nk_frenesi_return.png") });
await browser.close();
console.log("OK: nk screenshots");
