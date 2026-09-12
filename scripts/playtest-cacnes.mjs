/** Showcase C. acnes — DISPLAY=:1 node scripts/playtest-cacnes.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setupShowcase(shieldOn) {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 200;
  st.nextWaveAt = 0.05;
  st.waveCountdownActive = true;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.cacnes = true;
  st.germIntroSeen.sepidermidis = true;
  st.germIntroQueue = [];
  st.germIntroActive = null;
  st.effects = [];
  st.towers = [];
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.msgTimer = 0;

  g.step(22, 0.05);

  let src = st.enemies.find((e) => e.def?.id === "cacnes");
  if (!src) {
    g.step(12, 0.05);
    src = st.enemies.find((e) => e.def?.id === "cacnes");
  }
  if (!src) return { ok: false, reason: "no cacnes spawned" };

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const maxShield = src.def.shield ? src.def.shield.maxHP : 0;

  const e = {
    ...src,
    state: "entering",
    enteringTimer: 999,
    x: cx,
    y: cy,
    progress: 0,
    radiusScale: 1.55,
    shieldHP: shieldOn ? maxShield : 0,
    hp: src.def.hp,
    maxHp: src.def.hp,
    hitFlash: 0,
    hurtTimer: 0,
    dying: false,
    dead: false,
    wobble: 1.15,
    _heading: 0.22,
    _lastPosX: cx - 8,
    _lastPosY: cy,
  };

  st.enemies = [e];
  st.effects = [];
  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.time = 4.2;
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.hoverBuild = null;
  st.buildGhost = null;
  g.hold(true);

  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (cx / g.metrics.VW) * rect.width;
  const sy = rect.top + (cy / g.metrics.VH) * rect.height;
  return {
    ok: true,
    cx,
    cy,
    clip: { x: Math.round(sx - 190), y: Math.round(sy - 170), width: 380, height: 340 },
    shieldHP: e.shieldHP,
    maxShield,
  };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const infoBare = await page.evaluate(setupShowcase, false);
console.log("Showcase (sin escudo):", infoBare);
await sleep(900);
await page.screenshot({ path: join(ART, "cacnes_showcase_bare.png") });
if (infoBare.ok) {
  await page.screenshot({ path: join(ART, "cacnes_closeup_bare.png"), clip: infoBare.clip });
}

const infoShield = await page.evaluate(setupShowcase, true);
console.log("Showcase (escudo):", infoShield);
await sleep(900);
await page.screenshot({ path: join(ART, "cacnes_showcase_biofilm.png") });
if (infoShield.ok) {
  await page.screenshot({ path: join(ART, "cacnes_closeup_biofilm.png"), clip: infoShield.clip });
}

await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: cacnes screenshots in", ART);
