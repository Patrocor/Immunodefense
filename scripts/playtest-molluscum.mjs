/** Showcase Molluscum — DISPLAY=:1 node scripts/playtest-molluscum.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeMolluscum(pinch) {
  const g = window.__game;
  const st = g.state;
  const src = st._molluscumSrc;
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
    radiusScale: 1.85,
    hp: pinch ? src.maxHp * 0.16 : src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    childTimer: pinch ? 0.12 : 2.4,
    childCount: 0,
    noSpore: false,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.6,
    _heading: -0.22,
    _lastPosX: cx - 10,
    _lastPosY: cy,
  };
  st.enemies = [e];
  st.effects = [];
  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.time = pinch ? 3.1 : 2.8;
  st.selectedTower = null;
  st.selectedToBuild = null;
  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (cx / g.metrics.VW) * rect.width;
  const sy = rect.top + (cy / g.metrics.VH) * rect.height;
  return {
    ok: true,
    pinch,
    clip: { x: Math.round(sx - 200), y: Math.round(sy - 180), width: 400, height: 350 },
  };
}

function spawnMolluscum() {
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
  g.step(40, 0.05);
  let src = st.enemies.find((e) => e.def?.id === "molluscum");
  if (!src) {
    g.step(16, 0.05);
    src = st.enemies.find((e) => e.def?.id === "molluscum");
  }
  if (!src) {
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no molluscum spawned", waveIdx: st.waveIdx, types };
  }
  st._molluscumSrc = src;
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

const spawned = await page.evaluate(spawnMolluscum);
console.log("Spawn:", spawned);
const idle = await page.evaluate(placeMolluscum, false);
console.log("Molluscum idle:", idle);
await sleep(900);
await page.screenshot({ path: join(ART, "molluscum_shell_field.png") });
if (idle.ok) {
  await page.screenshot({ path: join(ART, "molluscum_shell_closeup.png"), clip: idle.clip });
}

const fiss = await page.evaluate(placeMolluscum, true);
console.log("Molluscum fission:", fiss);
await sleep(900);
if (fiss.ok) {
  await page.screenshot({ path: join(ART, "molluscum_shell_fission.png"), clip: fiss.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: molluscum screenshots in", ART);
