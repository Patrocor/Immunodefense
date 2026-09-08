/** Showcase Malassezia — pasta 0.95 + escama furfurácea. DISPLAY=:1 node scripts/playtest-malassezia.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/malassezia-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeMalassezia(alt) {
  const g = window.__game;
  const st = g.state;
  const src = st._malasseziaSrc;
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
    radiusScale: 1.65,
    hp: src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.9,
    _heading: alt ? -0.25 : -0.4,
    _lastPosX: cx - 14,
    _lastPosY: cy + 4,
    _malasseziaAlt: !!alt,
  };
  st.enemies = [e];
  st.effects = [];
  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.time = 2.8;
  st.selectedTower = null;
  st.selectedToBuild = null;
  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (cx / g.metrics.VW) * rect.width;
  const sy = rect.top + (cy / g.metrics.VH) * rect.height;
  return {
    ok: true,
    alt: !!alt,
    clip: { x: Math.round(sx - 270), y: Math.round(sy - 210), width: 540, height: 420 },
  };
}

function spawnMalassezia() {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 200;
  st.waveIdx = 4;
  st.waveActive = false;
  st.nextWaveAt = 0.05;
  st.waveCountdownActive = true;
  st.germIntroSeen = st.germIntroSeen || {};
  ["hsv", "sepidermidis", "molluscum", "demodex", "cacnes", "saureus", "malassezia", "dermatofito", "neisseria"].forEach((id) => {
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
  for (let i = 0; i < 8 && !src; i++) {
    g.step(20, 0.05);
    src = st.enemies.find((e) => e.def?.id === "malassezia");
  }
  if (!src) {
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no malassezia spawned", waveIdx: st.waveIdx, types };
  }
  st._malasseziaSrc = src;
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

const spawned = await page.evaluate(spawnMalassezia);
console.log("Spawn:", spawned);

const pasta = await page.evaluate(placeMalassezia, false);
console.log("Pasta 0.95:", pasta);
await sleep(800);
await page.screenshot({ path: join(TMP, "malassezia_spaghetti_095_field.png") });
if (pasta.ok) {
  await page.screenshot({ path: join(TMP, "malassezia_spaghetti_095.png"), clip: pasta.clip });
}

const flake = await page.evaluate(placeMalassezia, true);
console.log("Flake alt:", flake);
await sleep(800);
await page.screenshot({ path: join(TMP, "malassezia_flake_field.png") });
if (flake.ok) {
  await page.screenshot({ path: join(TMP, "malassezia_flake.png"), clip: flake.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
copyFileSync(join(TMP, "malassezia_spaghetti_095.png"), join(ART, "malassezia_v2_pasta095.png"));
copyFileSync(join(TMP, "malassezia_spaghetti_095_field.png"), join(ART, "malassezia_v2_pasta095_field.png"));
copyFileSync(join(TMP, "malassezia_flake.png"), join(ART, "malassezia_v3_flake.png"));
copyFileSync(join(TMP, "malassezia_flake_field.png"), join(ART, "malassezia_v3_flake_field.png"));
console.log("OK: malassezia screenshots in", ART);
