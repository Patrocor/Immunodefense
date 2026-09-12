/** Showcase HPV cauliflower wart — DISPLAY=:1 node scripts/playtest-hpv.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/hpv-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function placeHpv(mode) {
  const g = window.__game;
  const st = g.state;
  const src = st._hpvSrc;
  if (!src) return { ok: false, reason: "no src" };
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const maxShield = src.def.shield ? src.def.shield.maxHP : 0;
  const enraged = mode === "enraged";
  const cracked = mode === "cracked";
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
    shieldHP: enraged ? 0 : cracked ? Math.max(1, Math.floor(maxShield * 0.25)) : maxShield,
    shieldHitTimer: 0,
    shieldShatterTimer: enraged ? 0.2 : 0,
    enraged,
    noShieldRegen: enraged,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 0.6,
    _heading: 0.15,
    _lastPosX: cx - 14,
    _lastPosY: cy + 4,
  };
  st.enemies = [e];
  st.effects = [];
  st.towers = [];
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
    mode,
    shieldHP: e.shieldHP,
    enraged,
    clip: { x: Math.round(sx - 270), y: Math.round(sy - 230), width: 540, height: 440 },
  };
}

function spawnHpv() {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 200;
  st.waveIdx = 6;
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
    src = st.enemies.find((en) => en.def?.id === "hpv");
  }
  if (!src) {
    const types = {};
    for (const en of st.enemies) {
      const id = en.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return { ok: false, reason: "no hpv spawned", waveIdx: st.waveIdx, types };
  }
  st._hpvSrc = src;
  return { ok: true, waveIdx: st.waveIdx, radius: src.def.radius, shield: src.def.shield?.maxHP };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const spawned = await page.evaluate(spawnHpv);
console.log("Spawn:", spawned);

const armor = await page.evaluate(placeHpv, "armor");
console.log("Armor:", armor);
await sleep(800);
await page.screenshot({ path: join(TMP, "hpv_field.png") });
if (armor.ok) {
  await page.screenshot({ path: join(TMP, "hpv_wart.png"), clip: armor.clip });
}

const fury = await page.evaluate(placeHpv, "enraged");
console.log("Fury:", fury);
await sleep(700);
if (fury.ok) {
  await page.screenshot({ path: join(TMP, "hpv_fury.png"), clip: fury.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
copyFileSync(join(TMP, "hpv_wart.png"), join(ART, "hpv_wart_armor.png"));
copyFileSync(join(TMP, "hpv_field.png"), join(ART, "hpv_wart_field.png"));
copyFileSync(join(TMP, "hpv_fury.png"), join(ART, "hpv_wart_fury.png"));
console.log("OK: hpv screenshots in", ART);
