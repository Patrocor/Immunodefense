/** Captura Linfocito T v2 — Apoptosis cachetadas. DISPLAY=:1 node scripts/playtest-linfocitoT.mjs */
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
  st.waveIdx = 8;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.molluscum = true;
  st.germIntroSeen.hsv = true;
  st.germIntroSeen.saureus = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const U = g.metrics.U;

  g.place("linfocitoT", 0.30, 0.52);
  const lt = st.towers[0];
  if (!lt) return { ok: false, reason: "no lt placed" };
  lt.level = 2;

  const defs = window.ImmunoDefenseData.enemyDefs;
  const germSpots = [
    { id: "molluscum", x: cx + 100, y: cy - 30, progress: 0.52 },
    { id: "hsv", x: cx + 60, y: cy + 20, progress: 0.48 },
    { id: "saureus", x: cx + 135, y: cy + 5, progress: 0.55 },
  ];

  st.enemies = [];
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
      radiusScale: 1.55,
      hp: def.hp,
      maxHp: def.hp,
      hitFlash: 0,
      dying: false,
      dead: false,
      wobble: 0.5,
      apoptosisMarked: true,
      _heading: -0.1,
      _lastPosX: spot.x - 16,
      _lastPosY: spot.y + 3,
    });
  }

  lt.specialReady = true;
  lt.specialCharge = 1;
  g.tapTower(0);

  lt.apoptosisTargets = st.enemies.slice(0, 3);
  lt.apoptosisBurst = false;
  lt.apoptosisPulse = 2.6;
  lt.apoptosisSlapT = 0.05;
  lt.specialAnim = 1.25;
  lt.lastTargetX = germSpots[0].x;
  lt.lastTargetY = germSpots[0].y;

  st.effects.push({
    kind: "apoptosisSlap",
    x: germSpots[0].x,
    y: germSpots[0].y,
    slapKind: "palm",
    big: true,
    life: 0.35,
    max: 0.52,
  });
  st.effects.push({
    kind: "atpText",
    x: germSpots[1].x,
    y: germSpots[1].y - 14 * U,
    vy: -30 * U,
    text: "¡PAM!",
    life: 0.5,
    max: 0.5,
    color: "#ffd24a",
  });

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (lt.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (lt.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    clip: { x: Math.round(sx - 320), y: Math.round(sy - 250), width: 860, height: 560 },
  };
});

console.log("Linfocito T v2:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "linfocitoT_v2_apoptosis_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "linfocitoT_v2_apoptosis_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
