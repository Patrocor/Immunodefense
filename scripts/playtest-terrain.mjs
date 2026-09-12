/** Captura terreno Fase 1 — carril-herida. DISPLAY=:1 node scripts/playtest-terrain.mjs */
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
await sleep(700);

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 200;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];
  g.hold(true);
});
await sleep(200);
await page.screenshot({ path: join(ART, "terrain_wound_channel.png") });

await page.evaluate(() => {
  const g = window.__game;
  g.hold(false);
  g.place("neutrofilo", 0.38, 0.38);
  g.place("eosinofilo", 0.62, 0.58);
  g.hold(true);
});
await sleep(120);
await page.screenshot({ path: join(ART, "terrain_wound_channel_towers.png") });
await browser.close();
console.log("OK: terrain screenshots in", ART);
