/** Showcase boss Clostridium gas gangrene — DISPLAY=:1 node scripts/playtest-clostridium.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/clostridium-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeClo(shieldOn) {
  const g = window.__game;
  const st = g.state;
  const src = st._cloSrc;
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
    radiusScale: 1,
    hp: src.def.hp,
    maxHp: src.maxHp || src.def.hp,
    shieldHP: shieldOn ? maxShield : 0,
    shieldHitTimer: 0,
    shieldShatterTimer: 0,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.4,
    _heading: 0,
    _lastPosX: cx - 20,
    _lastPosY: cy,
    isBoss: true,
  };
  st.enemies = [e];
  st.effects = [];
  st.towers = [];
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
    clip: { x: Math.round(sx - 320), y: Math.round(sy - 220), width: 640, height: 440 },
  };
}

function spawnClo() {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 200;
  st.waveIdx = 0;
  st.waveActive = false;
  st.nextWaveAt = 0.05;
  st.waveCountdownActive = true;
  st.germIntroSeen = st.germIntroSeen || {};
  ["hsv", "sepidermidis", "molluscum", "demodex", "cacnes", "saureus", "malassezia", "dermatofito", "neisseria", "hpv", "sarna", "leishmania", "candida", "bossPyogenes", "bossPseudomonas", "bossClostridium"].forEach((id) => {
    st.germIntroSeen[id] = true;
  });
  st.germIntroQueue = [];
  st.germIntroActive = null;
  st.effects = [];
  st.towers = [];
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.msgTimer = 0;
  g.step(1.2, 0.05);
  const def = window.ImmunoDefenseData.enemyDefs.bossClostridium;
  if (!def) return { ok: false, reason: "no bossClostridium def", screen: !!st.showTitle };
  st._cloSrc = { def, hp: def.hp, maxHp: def.hp, wobble: 0.5 };
  return { ok: true, waveIdx: st.waveIdx, radius: def.radius, via: "def" };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const spawned = await page.evaluate(spawnClo);
console.log("Spawn:", spawned);
await page.mouse.move(16, 16);

const withWall = await page.evaluate(placeClo, true);
console.log("Wall on:", withWall);
await sleep(800);
await page.screenshot({ path: join(TMP, "clo_field.png") });
if (withWall.ok) {
  await page.screenshot({ path: join(TMP, "clo_wall.png"), clip: withWall.clip });
}

const bare = await page.evaluate(placeClo, false);
console.log("Wall off:", bare);
await sleep(600);
if (bare.ok) {
  await page.screenshot({ path: join(TMP, "clo_bare.png"), clip: bare.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
if (!withWall.ok || !bare.ok) {
  console.error("Showcase failed", { spawned, withWall, bare });
  process.exit(1);
}
copyFileSync(join(TMP, "clo_wall.png"), join(ART, "clostridium_v3_drumstick_wall.png"));
copyFileSync(join(TMP, "clo_bare.png"), join(ART, "clostridium_v3_drumstick_bare.png"));
copyFileSync(join(TMP, "clo_field.png"), join(ART, "clostridium_v3_drumstick_field.png"));
console.log("OK: clostridium screenshots in", ART);
