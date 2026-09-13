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
const macBox = await page.evaluate(() => {
  const g = window.__game;
  const m = g.state.guardians[0];
  const f = g.metrics.FIELD;
  return { x: Math.max(0, m.x - 90), y: Math.max(0, m.y - 90), w: 180, h: 180, field: f };
});
await page.screenshot({
  path: join(ART, "macro_idle_closeup.png"),
  clip: { x: macBox.x, y: macBox.y, width: macBox.w, height: macBox.h },
});
const macBtn = await page.evaluate(() => {
  const v = window.__game.ui.macrofagoBtn;
  return { x: v.x - 6, y: v.y - 6, w: v.w + 12, h: v.h + 12 };
});
await page.screenshot({
  path: join(ART, "macro_dock_button.png"),
  clip: {
    x: Math.max(0, macBtn.x),
    y: Math.max(0, macBtn.y),
    width: macBtn.w,
    height: macBtn.h,
  },
});
const c3 = await page.evaluate(() => {
  const v = window.__game.ui.c3bMeter;
  return { x: v.x - 8, y: v.y - 8, w: v.w + 16, h: v.h + 16 };
});
await page.screenshot({
  path: join(ART, "c3b_charging.png"),
  clip: {
    x: Math.max(0, c3.x - 20),
    y: Math.max(0, c3.y - 20),
    width: c3.w + 40,
    height: c3.h + 40,
  },
});
const hintBox = await page.evaluate(() => {
  const s = window.__game.ui.cardStrip;
  return { x: s.x, y: s.y, width: s.w, height: Math.min(s.h, 240) };
});
await page.screenshot({
  path: join(ART, "dock_pause_hint.png"),
  clip: hintBox,
});

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
