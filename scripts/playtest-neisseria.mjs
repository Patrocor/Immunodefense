/** Showcase Neisseria coffee-bean + polar pili — DISPLAY=:1 node scripts/playtest-neisseria.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/neisseria-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeNeisseria(attached) {
  const g = window.__game;
  const st = g.state;
  const src = st._neisseriaSrc;
  if (!src) return { ok: false, reason: "no src" };
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  st.towers = [];
  st.effects = [];
  let tower = null;
  if (attached) {
    g.place("linfocitoB", 0.68, 0.50);
    tower = st.towers[0] || null;
  }
  const e = {
    ...src,
    state: attached ? "blocked" : "walking",
    enteringTimer: 0,
    x: cx,
    y: cy,
    progress: 0.35,
    radiusScale: 1.75,
    hp: src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    shieldHP: 0,
    shieldHitTimer: 0,
    shieldShatterTimer: 0,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.55,
    _heading: 0.18,
    _lastPosX: cx - 18,
    _lastPosY: cy + 4,
    piliTarget: tower,
    piliTimer: attached ? 4 : 0,
  };
  st.enemies = [e];
  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.time = 2.4;
  st.selectedTower = null;
  st.selectedToBuild = null;
  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (cx / g.metrics.VW) * rect.width;
  const sy = rect.top + (cy / g.metrics.VH) * rect.height;
  return {
    ok: true,
    attached: !!attached,
    tower: !!tower,
    clip: { x: Math.round(sx - 270), y: Math.round(sy - 210), width: 560, height: 420 },
  };
}

function spawnNeisseria() {
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
  for (let i = 0; i < 16 && !src; i++) {
    g.step(20, 0.05);
    src = st.enemies.find((e) => e.def?.id === "neisseria");
  }
  if (!src) {
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no neisseria spawned", waveIdx: st.waveIdx, types };
  }
  st._neisseriaSrc = src;
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

const spawned = await page.evaluate(spawnNeisseria);
console.log("Spawn:", spawned);

const rest = await page.evaluate(placeNeisseria, false);
console.log("Rest:", rest);
await sleep(800);
await page.screenshot({ path: join(TMP, "neisseria_field.png") });
if (rest.ok) {
  await page.screenshot({ path: join(TMP, "neisseria_bean.png"), clip: rest.clip });
}

const hooked = await page.evaluate(placeNeisseria, true);
console.log("Hooked:", hooked);
await sleep(700);
if (hooked.ok) {
  await page.screenshot({ path: join(TMP, "neisseria_pili.png"), clip: hooked.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
copyFileSync(join(TMP, "neisseria_bean.png"), join(ART, "neisseria_bean_rest.png"));
copyFileSync(join(TMP, "neisseria_field.png"), join(ART, "neisseria_bean_map.png"));
copyFileSync(join(TMP, "neisseria_pili.png"), join(ART, "neisseria_pili_hook.png"));
console.log("OK: neisseria screenshots in", ART);
