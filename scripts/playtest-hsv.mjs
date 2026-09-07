/** Showcase HSV — DISPLAY=:1 node scripts/playtest-hsv.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setupShowcase() {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 200;
  st.waveIdx = 2;
  st.waveActive = false;
  st.nextWaveAt = 0.05;
  st.waveCountdownActive = true;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.hsv = true;
  st.germIntroSeen.sepidermidis = true;
  st.germIntroSeen.molluscum = true;
  st.germIntroSeen.demodex = true;
  st.germIntroQueue = [];
  st.germIntroActive = null;
  st.effects = [];
  st.towers = [];
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.msgTimer = 0;

  g.step(28, 0.05);

  let src = st.enemies.find((e) => e.def?.id === "hsv");
  if (!src) {
    g.step(16, 0.05);
    src = st.enemies.find((e) => e.def?.id === "hsv");
  }
  if (!src) {
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no hsv spawned", waveIdx: st.waveIdx, types };
  }

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;

  const e = {
    ...src,
    state: "entering",
    enteringTimer: 999,
    x: cx,
    y: cy,
    progress: 0,
    radiusScale: 1.85,
    hp: src.def.hp,
    maxHp: src.def.hp,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.85,
    _heading: -0.18,
    _lastPosX: cx - 18,
    _lastPosY: cy + 2,
  };

  st.enemies = [e];
  st.effects = [];
  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.time = 3.4;
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.hoverBuild = null;
  st.buildGhost = null;
  g.hold(true);

  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (cx / g.metrics.VW) * rect.width;
  const sy = rect.top + (cy / g.metrics.VH) * rect.height;
  return {
    ok: true,
    waveIdx: st.waveIdx,
    clip: { x: Math.round(sx - 220), y: Math.round(sy - 180), width: 440, height: 360 },
  };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const info = await page.evaluate(setupShowcase);
console.log("Showcase HSV:", info);
await sleep(1000);
await page.screenshot({ path: join(ART, "hsv_showcase.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "hsv_closeup.png"), clip: info.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: hsv screenshots in", ART);
