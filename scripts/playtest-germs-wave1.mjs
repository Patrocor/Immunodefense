/** Gérmenes ola 1 — DISPLAY=:1 node scripts/playtest-germs-wave1.mjs */
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
  st.waveCountdownActive = true;
});
await sleep(1400);

const waveInfo = await page.evaluate(() => {
  const types = {};
  for (const e of window.__game.state.enemies) {
    const id = e.def?.id || "?";
    types[id] = (types[id] || 0) + 1;
  }
  return { waveIdx: window.__game.state.waveIdx, types };
});
console.log("Oleada 1:", waveInfo);

await page.screenshot({ path: join(ART, "germs_wave1_spawn.png") });

await page.evaluate(() => {
  window.__game.step(12, 0.05);
});
await sleep(500);
await page.screenshot({ path: join(ART, "germs_wave1_march.png") });

await browser.close();
console.log("OK: germs wave1 screenshots");
