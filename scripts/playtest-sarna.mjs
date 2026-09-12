/** Showcase Sarna tortoise mite + S-gallery — DISPLAY=:1 node scripts/playtest-sarna.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/sarna-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeSarna(mode) {
  const g = window.__game;
  const st = g.state;
  const src = st._sarnaSrc;
  if (!src) return { ok: false, reason: "no src" };
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const burrowed = mode === "burrow";
  const e = {
    ...src,
    state: burrowed ? "walking" : "walking",
    enteringTimer: 0,
    x: cx,
    y: cy,
    progress: 0.35,
    radiusScale: 1.7,
    hp: src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    shieldHP: 0,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.5,
    _heading: 0.25,
    _lastPosX: cx - 20,
    _lastPosY: cy + 5,
    _gaitPhase: 1.2,
    burrowed,
    surfaceTimer: burrowed ? 0.85 : 1.5,
    revealed: false,
    childTimer: 0.18,
    childCount: 0,
  };
  st.enemies = [e];
  st.effects = [];
  st.towers = [];
  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.time = 2.5;
  st.selectedTower = null;
  st.selectedToBuild = null;
  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (cx / g.metrics.VW) * rect.width;
  const sy = rect.top + (cy / g.metrics.VH) * rect.height;
  return {
    ok: true,
    mode,
    burrowed,
    clip: { x: Math.round(sx - 300), y: Math.round(sy - 220), width: 600, height: 430 },
  };
}

function spawnSarna() {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 200;
  st.waveIdx = 5;
  st.waveActive = false;
  st.nextWaveAt = 0.05;
  st.waveCountdownActive = true;
  st.germIntroSeen = st.germIntroSeen || {};
  ["hsv", "sepidermidis", "molluscum", "demodex", "cacnes", "saureus", "malassezia", "dermatofito", "neisseria", "hpv", "sarna", "leishmania"].forEach((id) => {
    st.germIntroSeen[id] = true;
  });
  st.germIntroQueue = [];
  st.germIntroActive = null;
  st.effects = [];
  st.towers = [];
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.msgTimer = 0;
  let src = null;
  for (let i = 0; i < 16 && !src; i++) {
    g.step(20, 0.05);
    src = st.enemies.find((en) => en.def?.id === "sarna");
  }
  if (!src) {
    const types = {};
    for (const en of st.enemies) {
      const id = en.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no sarna spawned", waveIdx: st.waveIdx, types };
  }
  st._sarnaSrc = src;
  return { ok: true, waveIdx: st.waveIdx, radius: src.def.radius };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const spawned = await page.evaluate(spawnSarna);
console.log("Spawn:", spawned);

const walk = await page.evaluate(placeSarna, "walk");
console.log("Walk:", walk);
await sleep(800);
await page.screenshot({ path: join(TMP, "sarna_field.png") });
if (walk.ok) {
  await page.screenshot({ path: join(TMP, "sarna_walk.png"), clip: walk.clip });
}

const hole = await page.evaluate(placeSarna, "burrow");
console.log("Burrow:", hole);
await sleep(700);
if (hole.ok) {
  await page.screenshot({ path: join(TMP, "sarna_burrow.png"), clip: hole.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
copyFileSync(join(TMP, "sarna_walk.png"), join(ART, "sarna_tortoise.png"));
copyFileSync(join(TMP, "sarna_field.png"), join(ART, "sarna_tortoise_field.png"));
copyFileSync(join(TMP, "sarna_burrow.png"), join(ART, "sarna_tortoise_burrow.png"));
console.log("OK: sarna screenshots in", ART);
