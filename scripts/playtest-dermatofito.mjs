/** Showcase Dermatofito ringworm — DISPLAY=:1 node scripts/playtest-dermatofito.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/dermatofito-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeDermatofito(shieldOn) {
  const g = window.__game;
  const st = g.state;
  const src = st._dermatofitoSrc;
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
    wobble: 0.7,
    _heading: 0.2,
    _lastPosX: cx - 16,
    _lastPosY: cy + 3,
    childTimer: 0.18,
    childCount: 0,
  };
  st.enemies = [e];
  st.effects = [];
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
    shieldOn: !!shieldOn,
    clip: { x: Math.round(sx - 260), y: Math.round(sy - 200), width: 520, height: 400 },
  };
}

function spawnDermatofito() {
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
  for (let i = 0; i < 10 && !src; i++) {
    g.step(20, 0.05);
    src = st.enemies.find((e) => e.def?.id === "dermatofito");
  }
  if (!src) {
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no dermatofito spawned", waveIdx: st.waveIdx, types };
  }
  st._dermatofitoSrc = src;
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

const spawned = await page.evaluate(spawnDermatofito);
console.log("Spawn:", spawned);

const withWall = await page.evaluate(placeDermatofito, true);
console.log("Ring wall on:", withWall);
await sleep(800);
await page.screenshot({ path: join(TMP, "dermatofito_ring_field.png") });
if (withWall.ok) {
  await page.screenshot({ path: join(TMP, "dermatofito_ring.png"), clip: withWall.clip });
}

const bare = await page.evaluate(placeDermatofito, false);
console.log("Ring wall off:", bare);
await sleep(600);
if (bare.ok) {
  await page.screenshot({ path: join(TMP, "dermatofito_ring_bare.png"), clip: bare.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
copyFileSync(join(TMP, "dermatofito_ring.png"), join(ART, "dermatofito_ringworm.png"));
copyFileSync(join(TMP, "dermatofito_ring_field.png"), join(ART, "dermatofito_ringworm_field.png"));
copyFileSync(join(TMP, "dermatofito_ring_bare.png"), join(ART, "dermatofito_ringworm_bare.png"));
console.log("OK: dermatofito screenshots in", ART);
