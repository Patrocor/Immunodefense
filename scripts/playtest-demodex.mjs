/** Showcase Demodex — DISPLAY=:1 node scripts/playtest-demodex.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeDemodex(revealed) {
  const g = window.__game;
  const st = g.state;
  const src = st._demodexSrc;
  if (!src) return { ok: false, reason: "no src" };
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const e = {
    ...src,
    state: "walking",
    enteringTimer: 0,
    x: cx,
    y: cy,
    progress: 0.35,
    radiusScale: 1.75,
    hp: src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    revealed: !!revealed,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.7,
    _heading: -0.35,
    _gaitPhase: 2.4,
    _lastPosX: cx - 14,
    _lastPosY: cy + 4,
  };
  st.enemies = [e];
  st.effects = [];
  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.time = 2.6;
  st.selectedTower = null;
  st.selectedToBuild = null;
  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (cx / g.metrics.VW) * rect.width;
  const sy = rect.top + (cy / g.metrics.VH) * rect.height;
  return {
    ok: true,
    revealed: !!revealed,
    clip: { x: Math.round(sx - 220), y: Math.round(sy - 170), width: 440, height: 340 },
  };
}

function spawnDemodex() {
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
  ["hsv", "sepidermidis", "molluscum", "demodex"].forEach((id) => {
    st.germIntroSeen[id] = true;
  });
  st.germIntroQueue = [];
  st.germIntroActive = null;
  st.effects = [];
  st.towers = [];
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.msgTimer = 0;
  g.step(48, 0.05);
  let src = st.enemies.find((e) => e.def?.id === "demodex");
  if (!src) {
    g.step(20, 0.05);
    src = st.enemies.find((e) => e.def?.id === "demodex");
  }
  if (!src) {
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no demodex spawned", waveIdx: st.waveIdx, types };
  }
  st._demodexSrc = src;
  return { ok: true, waveIdx: st.waveIdx };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const spawned = await page.evaluate(spawnDemodex);
console.log("Spawn:", spawned);

const shown = await page.evaluate(placeDemodex, true);
console.log("Demodex revealed:", shown);
await sleep(900);
await page.screenshot({ path: join(ART, "demodex_v2_hair_field.png") });
if (shown.ok) {
  await page.screenshot({ path: join(ART, "demodex_v2_hair_revealed.png"), clip: shown.clip });
}

const hid = await page.evaluate(placeDemodex, false);
console.log("Demodex cloaked:", hid);
await sleep(700);
if (hid.ok) {
  await page.screenshot({ path: join(ART, "demodex_v2_hair_cloaked.png"), clip: hid.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: demodex screenshots in", ART);
