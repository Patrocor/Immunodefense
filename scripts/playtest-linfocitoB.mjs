/** Captura Linfocito B v3 — Plasmocito latigazos/puñetazos. DISPLAY=:1 node scripts/playtest-linfocitoB.mjs */
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
  st.atp = 300;
  st.waveIdx = 3;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
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

  g.place("linfocitoB", 0.34, 0.52);
  const lb = st.towers[0];
  if (!lb) return { ok: false, reason: "no lb placed" };
  lb.level = 2;

  const germDef = window.ImmunoDefenseData.enemyDefs.saureus;
  const tx = cx + 105;
  const ty = cy - 25;
  if (germDef) {
    st.enemies = [{
      def: germDef,
      state: "walking",
      enteringTimer: 0,
      x: tx,
      y: ty,
      progress: 0.42,
      radiusScale: 1.65,
      hp: germDef.hp,
      maxHp: germDef.hp,
      hitFlash: 0,
      dying: false,
      dead: false,
      wobble: 0.5,
      _heading: -0.15,
      _lastPosX: tx - 18,
      _lastPosY: ty + 4,
    }];
  }

  lb.specialReady = true;
  lb.specialCharge = 1;
  g.tapTower(0);

  lb.cannonTarget = { x: tx, y: ty };
  lb.cannonRecoil = 0.07;
  lb.plasmoPulse = 2.4;
  lb.plasmoLashIdx = 1;
  lb.specialAnim = 0.92;

  const R = 18 * U * 1.72;
  const aimAng = Math.atan2(ty - lb.y, tx - lb.x);
  const nx = Math.cos(aimAng);
  const ny = Math.sin(aimAng);

  st.effects.push({
    kind: "igComicBurst",
    x: lb.x,
    y: lb.y,
    r: 95 * U,
    life: 0.35,
    max: 0.55,
  });

  // Simular impactos desde las puntas de los latigazos.
  for (let li = 0; li < 4; li++) {
    const lateral = li < 2 ? (li === 0 ? -0.68 : 0.68) : (li === 2 ? -0.34 : 0.34);
    const extMul = li < 2 ? 1.18 : 0.94;
    const extend = R * 2.9 * extMul;
    const baseAng = aimAng + lateral * 0.52;
    const bx = lb.x + Math.cos(baseAng) * R * 0.84;
    const by = lb.y + Math.sin(baseAng) * R * 0.84;
    const tipX = bx + nx * extend;
    const tipY = by + ny * extend;
    st.effects.push({
      kind: "antibodyLash",
      x1: bx, y1: by, x2: tipX, y2: tipY,
      cx: (bx + tipX) * 0.48 + (-ny) * (li % 2 ? -1 : 1) * R * 0.72,
      cy: (by + tipY) * 0.48 + (nx) * (li % 2 ? -1 : 1) * R * 0.72,
      whip: li < 2,
      life: 0.14,
      max: 0.16,
    });
    for (let b = 0; b < 3; b++) {
      st.effects.push({
        kind: "antibodyHeavy",
        x: tipX + nx * (12 + b * 28) * U,
        y: tipY + ny * (12 + b * 28) * U,
        vx: nx * 660 * U + (Math.random() - 0.5) * 35 * U,
        vy: ny * 660 * U + (Math.random() - 0.5) * 35 * U,
        rot: aimAng + Math.PI / 2,
        rotSpd: 14,
        size: (b % 2 ? 8 : 13) * U,
        life: 0.38,
        max: 0.38,
        comic: true,
      });
    }
  }

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (lb.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (lb.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    clip: { x: Math.round(sx - 340), y: Math.round(sy - 260), width: 820, height: 540 },
  };
});

console.log("Linfocito B v3:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "linfocitoB_v3_plasmocito_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "linfocitoB_v3_plasmocito_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
