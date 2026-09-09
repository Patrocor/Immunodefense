/** Captura Sebocito v1 — Hiperseborrhea holocrina. DISPLAY=:1 node scripts/playtest-sebocito.mjs */
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
  st.atp = 350;
  st.waveIdx = 6;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.cacnes = true;
  st.germIntroSeen.dermatofito = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.sebumPuddles = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const U = g.metrics.U;

  g.place("sebocito", 0.34, 0.52);
  const sb = st.towers[0];
  if (!sb) return { ok: false, reason: "no sebocito placed" };
  sb.level = 2;

  const defs = window.ImmunoDefenseData.enemyDefs;
  const germSpots = [
    { id: "cacnes", x: cx + 95, y: cy - 28, progress: 0.5 },
    { id: "dermatofito", x: cx + 130, y: cy + 12, progress: 0.54 },
    { id: "cacnes", x: cx + 70, y: cy + 38, progress: 0.46 },
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
      hitFlash: 0,
      dying: false,
      dead: false,
      wobble: 0.4,
      _heading: -0.08,
      _lastPosX: spot.x - 14,
      _lastPosY: spot.y + 2,
    });
  }

  sb.specialReady = true;
  sb.specialCharge = 1;
  g.tapTower(0);

  const sbR = 185 * U * 1.4;
  const puddle = { r: 38, life: 8, dot: 18 };

  for (let i = 0; i < 6; i++) {
    const off = (i - 2.5) * 52 * U;
    const px = sb.x + off * 0.85;
    const py = sb.y + Math.sin(i * 0.9) * 18 * U;
    st.sebumPuddles.push({
      x: px,
      y: py,
      r: puddle.r * U * 1.5,
      life: puddle.life * 1.5,
      max: puddle.life * 1.5,
      dot: puddle.dot * 1.8,
      kind: "sebum",
      srcId: "sebocito",
    });
    st.effects.push({
      kind: "sebumSplash",
      x: px,
      y: py,
      r: puddle.r * U * 1.1,
      life: 0.38,
      max: 0.5,
    });
  }

  st.effects.push({
    kind: "sebumGeyser",
    x: sb.x,
    y: sb.y - 12 * U,
    r: sbR * 0.55,
    life: 0.62,
    max: 0.85,
  });
  st.effects.push({
    kind: "novaRing",
    x: sb.x,
    y: sb.y,
    r: sbR,
    color: "#c8980a",
    life: 0.42,
    max: 0.65,
  });
  st.effects.push({
    kind: "atpText",
    x: sb.x,
    y: sb.y - 38 * U,
    vy: -24 * U,
    text: "¡GLU!",
    life: 0.55,
    max: 0.7,
    color: "#ffe79a",
  });

  sb.sebumPulse = 2.4;
  sb.specialAnim = 0.78;

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (sb.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (sb.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    enemies: st.enemies.length,
    clip: { x: Math.round(sx - 320), y: Math.round(sy - 260), width: 860, height: 560 },
  };
});

console.log("Sebocito v1 Hiperseborrhea:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "sebocito_v1_hiperseborrhea_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "sebocito_v1_hiperseborrhea_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
