/** Arpón del macrófago. DISPLAY=:1 node scripts/playtest-macro-harpoon.mjs */
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
  const f = g.metrics.FIELD;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 240;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.pendingSpawns = [];
  st.guardians = [];
  st.viralLoad = 18;
  const ids = Object.keys(window.ImmunoDefenseData.enemyDefs);
  const def = window.ImmunoDefenseData.enemyDefs.saureus
    || window.ImmunoDefenseData.enemyDefs[ids[0]];
  st.enemies = [{
    def,
    state: "walking",
    enteringTimer: 0,
    x: f.left + f.w * 0.5,
    y: f.top + f.h * 0.5,
    progress: 0.62,
    radiusScale: 1.2,
    hp: def.hp || 40,
    maxHp: def.hp || 40,
    hitFlash: 0,
    dying: false,
    dead: false,
    wobble: 0,
    beingEngulfed: false,
    beingDropped: false,
  }];
  g.hold(false);
  g.step(0.05, 0.05);
  const e = st.enemies[0];
  g.spawnGuardianAt((e.x - f.left) / f.w - 0.08, (e.y - f.top) / f.h);
  st.macrofagoUltimate = { ready: true, charge: 1 };
  g.hold(true);
});
await sleep(160);
await page.screenshot({ path: join(ART, "macro_idle.png") });

await page.evaluate(() => {
  const g = window.__game;
  g.tryMacroUlt();
  g.hold(false);
  g.step(0.12, 0.02);
  g.state.time = 0.42;
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "macro_harpoon_throw.png") });
const throwBox = await page.evaluate(() => {
  const g = window.__game;
  const m = g.state.guardians[0];
  const e = g.state.enemies[0];
  const x = Math.min(m.x, e.x) - 70;
  const y = Math.min(m.y, e.y) - 70;
  const w = Math.abs(e.x - m.x) + 140;
  const h = Math.abs(e.y - m.y) + 140;
  return { x: Math.max(0, x), y: Math.max(0, y), w, h };
});
await page.screenshot({
  path: join(ART, "macro_harpoon_tongue.png"),
  clip: { x: throwBox.x, y: throwBox.y, width: throwBox.w, height: throwBox.h },
});

await page.evaluate(() => {
  const g = window.__game;
  g.hold(false);
  g.step(0.24, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "macro_harpoon_grab.png") });

await page.evaluate(() => {
  const g = window.__game;
  g.hold(false);
  g.step(0.26, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "macro_harpoon_pull.png") });

await browser.close();
console.log("OK: macrophage screenshots in", ART);
