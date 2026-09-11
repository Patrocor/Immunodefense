/** Captura Centinela — ping PRR + Alarma PRR. DISPLAY=:1 node scripts/playtest-centinela.mjs */
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
  st.waveIdx = 4;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.demodex = true;
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

  g.place("centinela", 0.34, 0.52);
  g.place("neutrofilo", 0.34, 0.38);
  const ce = st.towers[0];
  const ally = st.towers[1];
  if (!ce) return { ok: false, reason: "no centinela placed" };
  ce.level = 2;
  if (ally) ally.level = 1;

  const defs = window.ImmunoDefenseData.enemyDefs;
  const germSpots = [
    { id: "demodex", x: cx + 95, y: cy - 12, progress: 0.5, hpFrac: 0.8 },
    { id: "saureus", x: cx + 128, y: cy + 22, progress: 0.54, hpFrac: 0.62 },
    { id: "saureus", x: cx + 72, y: cy + 34, progress: 0.47, hpFrac: 0.7 },
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
      radiusScale: 1.4,
      hp,
      maxHp: def.hp,
      hitFlash: 0.12,
      dying: false,
      dead: false,
      wobble: 0.3,
      revealed: spot.id !== "demodex",
      revealFlashT: spot.id === "demodex" ? 0.5 : 0,
      _heading: -0.08,
      _lastPosX: spot.x - 12,
      _lastPosY: spot.y + 2,
    });
  }

  ce.specialReady = true;
  ce.specialCharge = 1;
  ce.prrPulse = 2.4;
  ce.prrAlarmT = 6.5;
  ce.prrAlarmDecoy = 10;
  ce.specialAnim = 0.72;
  ce.attackAnim = 0.14;
  ce.lastTargetX = germSpots[0].x;
  ce.lastTargetY = germSpots[0].y;
  if (ally) ally.alarmBuffT = 6.5;

  const ceR = 130 * U * 1.5;
  st.effects.push({
    kind: "prrAlarm", x: ce.x, y: ce.y, r: ceR, life: 0.78, max: 1.2,
  });
  st.effects.push({
    kind: "prrPing", x: ce.x, y: ce.y - 18 * U,
    tx: germSpots[0].x, ty: germSpots[0].y, life: 0.18, max: 0.32,
  });
  if (ally) {
    st.effects.push({
      kind: "prrBolt", x: ce.x, y: ce.y - 18 * U, tx: ally.x, ty: ally.y,
      life: 0.32, max: 0.55,
    });
  }
  st.effects.push({
    kind: "prrHit", x: germSpots[0].x, y: germSpots[0].y, r: 24 * U, life: 0.2, max: 0.28,
  });
  st.effects.push({
    kind: "novaRing", x: ce.x, y: ce.y, r: ceR, color: "#E8A33D", life: 0.55, max: 0.75,
  });
  st.effects.push({
    kind: "atpText", x: ce.x, y: ce.y - 36 * U, vy: -24 * U,
    text: "PRR!", life: 0.58, max: 0.85, color: "#FFE9B0",
  });

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (ce.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (ce.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    enemies: st.enemies.length,
    clip: { x: Math.round(sx - 300), y: Math.round(sy - 280), width: 920, height: 620 },
  };
});

console.log("Centinela Alarma PRR:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "centinela_v1_prr_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "centinela_v1_prr_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
