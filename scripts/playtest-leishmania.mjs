/** Showcase Leishmania spindle + macrophage — DISPLAY=:1 node scripts/playtest-leishmania.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/leishmania-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeLeish(mode) {
  const g = window.__game;
  const st = g.state;
  const src = st._leishSrc;
  if (!src) return { ok: false, reason: "no src" };
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const ama = mode === "ama";
  const e = {
    ...src,
    state: ama ? "blocked" : "walking",
    enteringTimer: 0,
    x: cx,
    y: cy,
    progress: 0.35,
    radiusScale: 1.75,
    hp: src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    shieldHP: 0,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.55,
    _heading: 0.2,
    _lastPosX: cx - 22,
    _lastPosY: cy + 4,
    _leishFlagPhase: 1.4,
    leishAmastigote: ama,
    leishFormTimer: ama ? 4.2 : 5.5,
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
    ama,
    clip: { x: Math.round(sx - 290), y: Math.round(sy - 220), width: 580, height: 430 },
  };
}

function spawnLeish() {
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
  for (let i = 0; i < 18 && !src; i++) {
    g.step(20, 0.05);
    src = st.enemies.find((en) => en.def?.id === "leishmania");
  }
  if (!src) {
    const types = {};
    for (const en of st.enemies) {
      const id = en.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no leishmania spawned", waveIdx: st.waveIdx, types };
  }
  st._leishSrc = src;
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

const spawned = await page.evaluate(spawnLeish);
console.log("Spawn:", spawned);

const pro = await page.evaluate(placeLeish, "pro");
console.log("Pro:", pro);
await sleep(800);
await page.screenshot({ path: join(TMP, "leish_field.png") });
if (pro.ok) {
  await page.screenshot({ path: join(TMP, "leish_pro.png"), clip: pro.clip });
}

const ama = await page.evaluate(placeLeish, "ama");
console.log("Ama:", ama);
await sleep(700);
if (ama.ok) {
  await page.screenshot({ path: join(TMP, "leish_ama.png"), clip: ama.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
copyFileSync(join(TMP, "leish_pro.png"), join(ART, "leish_spindle.png"));
copyFileSync(join(TMP, "leish_field.png"), join(ART, "leish_spindle_field.png"));
copyFileSync(join(TMP, "leish_ama.png"), join(ART, "leish_macrophage.png"));
console.log("OK: leishmania screenshots in", ART);
