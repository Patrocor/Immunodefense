/** Captura pDC v4 — Faro IFN robusto + Tormenta IFN-α. DISPLAY=:1 node scripts/playtest-pdc.mjs */
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
  st.atp = 400;
  st.waveIdx = 7;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.hsv = true;
  st.germIntroSeen.hpv = true;
  st.germIntroSeen.molluscum = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const U = g.metrics.U;

  g.place("pdc", 0.36, 0.52);
  const pd = st.towers[0];
  if (!pd) return { ok: false, reason: "no pdc placed" };
  pd.level = 2;

  const defs = window.ImmunoDefenseData.enemyDefs;
  const germSpots = [
    { id: "hsv", x: cx + 90, y: cy - 30, progress: 0.5 },
    { id: "hpv", x: cx + 125, y: cy + 8, progress: 0.54 },
    { id: "molluscum", x: cx + 65, y: cy + 35, progress: 0.46 },
    { id: "hsv", x: cx + 145, y: cy - 18, progress: 0.57 },
  ];

  for (const spot of germSpots) {
    const def = defs[spot.id];
    if (!def) continue;
    st.enemies.push({
      def,
      state: "walking",
      enteringTimer: 0,
      x: spot.x,
      y: spot.y,
      progress: spot.progress,
      radiusScale: 1.5,
      hp: def.hp,
      maxHp: def.hp,
      hitFlash: 0.2,
      dying: false,
      dead: false,
      wobble: 0.4,
      _heading: -0.08,
      _lastPosX: spot.x - 14,
      _lastPosY: spot.y + 2,
    });
  }

  pd.specialReady = true;
  pd.specialCharge = 1;
  g.tapTower(0);

  const pdR = 165 * U * 1.45;
  st.effects.push({
    kind: "ifnStorm",
    x: pd.x,
    y: pd.y,
    r: pdR,
    life: 0.82,
    max: 1.25,
  });
  for (let i = 0; i < 3; i++) {
    const e = st.enemies[i];
    if (!e) continue;
    st.effects.push({
      kind: "ifnShred",
      x: e.x,
      y: e.y,
      r: 28 * U,
      life: 0.38,
      max: 0.55,
    });
  }
  st.effects.push({
    kind: "novaRing",
    x: pd.x,
    y: pd.y,
    r: pdR,
    color: "#6a3dd4",
    life: 0.52,
    max: 0.8,
  });
  st.effects.push({
    kind: "atpText",
    x: pd.x,
    y: pd.y - 40 * U,
    vy: -28 * U,
    text: "IFN-α!",
    life: 0.58,
    max: 0.75,
    color: "#d4b8ff",
  });

  pd.ifnPulse = 2.8;
  pd.ifnBuffT = 4.5;
  pd.specialAnim = 0.55;
  pd.attackAnim = 0.38;

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (pd.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (pd.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    enemies: st.enemies.length,
    clip: { x: Math.round(sx - 320), y: Math.round(sy - 320), width: 900, height: 620 },
  };
});

console.log("pDC v4 faro IFN robusto:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "pdc_v4_beacon_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "pdc_v4_beacon_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
