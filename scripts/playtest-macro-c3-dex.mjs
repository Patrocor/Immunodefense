/** Macrófago idle, C3b y Dex. DISPLAY=:1 node scripts/playtest-macro-c3-dex.mjs */
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
await page.goto("http://127.0.0.1:5173/#hifx");
await page.waitForFunction(() => window.__game?.state);
await sleep(500);

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const data = window.ImmunoDefenseData;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 240;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];
  st.guardians = [];
  st.viralLoad = 16;
  st.unlockedTowers = Object.keys(data.towerDefs || {});
  st.vistos = {};
  Object.keys(data.enemyDefs || {}).forEach((id) => { st.vistos[id] = true; });
  st.complement = 2;
  g.spawnGuardianAt(0.42, 0.48);
  g.relayout();
  g.hold(true);
});
await sleep(160);
await page.screenshot({ path: join(ART, "macro_idle_lobes.png") });

await page.evaluate(() => {
  const g = window.__game;
  g.state.complement = 5;
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "c3b_ready.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.compendiumOpen = true;
  st.loadoutEditing = false;
  st.paused = false;
  st.compendiumTab = "cells";
  st.compendiumSelected = "neutrofilo";
  st.compendiumScroll = 0;
  g.relayout();
  g.hold(true);
});
await sleep(120);
await page.screenshot({ path: join(ART, "dex_cells_clip.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.compendiumTab = "germs";
  st.compendiumSelected = "saureus";
  st.compendiumScroll = 0;
  g.relayout();
  g.hold(true);
});
await sleep(120);
await page.screenshot({ path: join(ART, "dex_germs_clip.png") });

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => {
  const g = window.__game;
  g.relayout();
  g.hold(true);
});
await sleep(160);
await page.screenshot({ path: join(ART, "dex_germs_portrait.png") });

await browser.close();
console.log("OK: macro/C3b/Dex screenshots in", ART);
