/** Captura Sebocito v2 — hinchazón + erupción volcánica + lluvia. DISPLAY=:1 node scripts/playtest-sebocito.mjs */
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
    { id: "dermatofito", x: cx + 55, y: cy - 55, progress: 0.42 },
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

  const sbR = 185 * U * 1.55;
  const puddle = { r: 38, life: 8, dot: 18 };

  for (let i = 0; i < 16; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * sbR * 0.9;
    const px = sb.x + Math.cos(ang) * dist;
    const py = sb.y + Math.sin(ang) * dist;
    st.sebumPuddles.push({
      x: px,
      y: py,
      r: puddle.r * U * (1.1 + Math.random() * 0.4),
      life: puddle.life * 1.4,
      max: puddle.life * 1.4,
      dot: puddle.dot * 1.7,
      kind: "sebum",
      srcId: "sebocito",
    });
    st.effects.push({
      kind: "sebumSplash",
      x: px,
      y: py,
      r: puddle.r * U * 0.95,
      life: 0.32 + Math.random() * 0.12,
      max: 0.5,
    });
  }

  st.effects.push({
    kind: "sebumVolcano",
    x: sb.x,
    y: sb.y - 14 * U,
    r: sbR * 0.62,
    life: 0.72,
    max: 1.05,
  });
  st.effects.push({
    kind: "sebumRain",
    x: sb.x,
    y: sb.y,
    r: sbR,
    life: 0.85,
    max: 1.35,
  });
  st.effects.push({
    kind: "novaRing",
    x: sb.x,
    y: sb.y,
    r: sbR,
    color: "#c8980a",
    life: 0.48,
    max: 0.75,
  });
  st.effects.push({
    kind: "atpText",
    x: sb.x,
    y: sb.y - 42 * U,
    vy: -26 * U,
    text: "¡GLU!",
    life: 0.6,
    max: 0.75,
    color: "#ffe79a",
  });

  sb.sebumPulse = 3.2;
  sb.specialAnim = 0.72;

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (sb.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (sb.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    enemies: st.enemies.length,
    clip: { x: Math.round(sx - 340), y: Math.round(sy - 280), width: 900, height: 580 },
  };
});

console.log("Sebocito v2 volcán:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "sebocito_v2_volcan_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "sebocito_v2_volcan_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
