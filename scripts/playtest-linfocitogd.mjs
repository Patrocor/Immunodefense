/** Captura Linfocito γδ v3 — Alas δ bilobulado + Cascada IL-17. DISPLAY=:1 node scripts/playtest-linfocitogd.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);
await sleep(900);

const info = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 500;
  st.waveIdx = 9;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.saureus = true;
  st.germIntroSeen.malassezia = true;
  st.germIntroSeen.candida = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const U = g.metrics.U;

  g.place("linfocitogd", 0.34, 0.52);
  g.place("neutrofilo", 0.34, 0.38);
  const gd = st.towers[0];
  const ally = st.towers[1];
  if (!gd) return { ok: false, reason: "no gd placed" };
  gd.level = 2;
  if (ally) ally.level = 1;

  const defs = window.ImmunoDefenseData.enemyDefs;
  const germSpots = [
    { id: "saureus", x: cx + 95, y: cy - 25, progress: 0.5, hpFrac: 0.35 },
    { id: "malassezia", x: cx + 130, y: cy + 10, progress: 0.54, hpFrac: 0.55 },
    { id: "candida", x: cx + 70, y: cy + 30, progress: 0.47, hpFrac: 0.42 },
    { id: "saureus", x: cx + 150, y: cy - 10, progress: 0.57, hpFrac: 0.28 },
  ];

  for (const spot of germSpots) {
    const def = defs[spot.id];
    if (!def) continue;
    const hp = Math.round(def.hp * spot.hpFrac);
    st.enemies.push({
      def,
      state: "walking",
      enteringTimer: 0,
      x: spot.x,
      y: spot.y,
      progress: spot.progress,
      radiusScale: 1.45,
      hp,
      maxHp: def.hp,
      hitFlash: 0.15,
      dying: false,
      dead: false,
      wobble: 0.4,
      _heading: -0.08,
      _lastPosX: spot.x - 14,
      _lastPosY: spot.y + 2,
    });
  }

  gd.specialReady = true;
  gd.specialCharge = 1;
  g.tapTower(0);

  const gdR = 160 * U * 1.2;
  gd.gdPulse = 2.4;
  gd.il17BuffT = 6.5;
  gd.specialAnim = 0.72;
  gd.lastTargetX = germSpots[0].x;
  gd.lastTargetY = germSpots[0].y;
  if (ally) ally.il17BuffT = 6.5;

  st.effects.push({
    kind: "il17Cascade",
    x: gd.x,
    y: gd.y,
    r: gdR,
    life: 0.75,
    max: 1.1,
  });
  if (ally) {
    st.effects.push({
      kind: "il17Bolt",
      x: gd.x,
      y: gd.y,
      tx: ally.x,
      ty: ally.y,
      life: 0.42,
      max: 0.62,
    });
  }
  for (let i = 0; i < 2; i++) {
    const e = st.enemies[i];
    if (!e) continue;
    st.effects.push({
      kind: "gdChain",
      x: gd.x,
      y: gd.y,
      tx: e.x,
      ty: e.y,
      life: 0.18,
      max: 0.28,
    });
  }
  st.effects.push({
    kind: "novaRing",
    x: gd.x,
    y: gd.y,
    r: gdR,
    color: "#8bc34a",
    life: 0.55,
    max: 0.85,
  });
  st.effects.push({
    kind: "atpText",
    x: gd.x,
    y: gd.y - 38 * U,
    vy: -26 * U,
    text: "IL-17!",
    life: 0.58,
    max: 0.75,
    color: "#d4ff70",
  });

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (gd.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (gd.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    enemies: st.enemies.length,
    clip: { x: Math.round(sx - 300), y: Math.round(sy - 280), width: 920, height: 620 },
  };
});

console.log("Linfocito γδ v3 alas:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "linfocitogd_v1_hunter_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "linfocitogd_v3_wings_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
