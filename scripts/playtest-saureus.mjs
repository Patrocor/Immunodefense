/** Showcase S. aureus grape bunch — DISPLAY=:1 node scripts/playtest-saureus.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeSaureus(shieldOn) {
  const g = window.__game;
  const st = g.state;
  const src = st._saureusSrc;
  if (!src) return { ok: false, reason: "no src" };
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const maxShield = src.def.shield ? src.def.shield.maxHP : 0;
  const e = {
    ...src,
    state: "walking",
    enteringTimer: 0,
    x: cx,
    y: cy,
    progress: 0.35,
    radiusScale: 1.7,
    hp: src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    shieldHP: shieldOn ? maxShield : 0,
    shieldHitTimer: 0,
    shieldShatterTimer: 0,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.85,
    _heading: -0.28,
    _lastPosX: cx - 16,
    _lastPosY: cy + 3,
  };
  st.enemies = [e];
  st.effects = [];
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
    shieldOn: !!shieldOn,
    shieldHP: e.shieldHP,
    clip: { x: Math.round(sx - 240), y: Math.round(sy - 190), width: 480, height: 380 },
  };
}

function spawnSaureus() {
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
  g.step(48, 0.05);
  let src = st.enemies.find((e) => e.def?.id === "saureus");
  if (!src) {
    g.step(24, 0.05);
    src = st.enemies.find((e) => e.def?.id === "saureus");
  }
  if (!src) {
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no saureus spawned", waveIdx: st.waveIdx, types };
  }
  st._saureusSrc = src;
  return { ok: true, waveIdx: st.waveIdx, radius: src.def.radius, shield: src.def.shield };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const spawned = await page.evaluate(spawnSaureus);
console.log("Spawn:", spawned);

const withCap = await page.evaluate(placeSaureus, true);
console.log("Capsule on:", withCap);
await sleep(900);
await page.screenshot({ path: join(ART, "saureus_grape_field.png") });
if (withCap.ok) {
  await page.screenshot({ path: join(ART, "saureus_grape_capsule.png"), clip: withCap.clip });
}

const bare = await page.evaluate(placeSaureus, false);
console.log("Capsule off:", bare);
await sleep(700);
if (bare.ok) {
  await page.screenshot({ path: join(ART, "saureus_grape_bare.png"), clip: bare.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: saureus screenshots in", ART);
