/** Captura Linfocito B v2 — Plasmocito caricaturesco. DISPLAY=:1 node scripts/playtest-linfocitoB.mjs */
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
  lb.specialAnim = 0.92;

  const aimAng = Math.atan2(ty - lb.y, tx - lb.x);
  const nx = Math.cos(aimAng);
  const ny = Math.sin(aimAng);
  const perpX = -ny;
  const perpY = nx;
  const R = 18 * U * 1.72;
  const barrelLen = 22 * U;

  st.effects.push({
    kind: "igComicBurst",
    x: lb.x,
    y: lb.y,
    r: 130 * U,
    life: 0.42,
    max: 0.55,
  });

  st.effects.push({
    kind: "atpText",
    x: lb.x,
    y: lb.y - R * 1.35,
    vy: -18 * U,
    text: "¡PLASMA!",
    life: 0.65,
    max: 0.65,
    color: "#ffd24a",
  });

  for (const sign of [-1, 1]) {
    const cbX = lb.x + sign * perpX * R * 0.92;
    const cbY = lb.y + sign * perpY * R * 0.92;
    const mX = cbX + nx * barrelLen;
    const mY = cbY + ny * barrelLen;
    st.effects.push({
      kind: "antibodyBeam",
      startX: mX,
      startY: mY,
      endX: mX + nx * 130 * U,
      endY: mY + ny * 130 * U,
      life: 0.10,
      max: 0.10,
      comic: true,
    });
    for (let b = 0; b < 4; b++) {
      st.effects.push({
        kind: "antibodyHeavy",
        x: mX + nx * (20 + b * 32) * U,
        y: mY + ny * (20 + b * 32) * U,
        vx: nx * 680 * U + (Math.random() - 0.5) * 40 * U,
        vy: ny * 680 * U + (Math.random() - 0.5) * 40 * U,
        rot: aimAng + Math.PI / 2,
        rotSpd: 14,
        size: (b % 2 ? 9 : 14) * U,
        life: 0.4,
        max: 0.4,
        comic: true,
      });
    }
    st.effects.push({
      kind: "atpText",
      x: mX,
      y: mY - 12 * U,
      vy: -24 * U,
      text: "IgG!",
      life: 0.45,
      max: 0.45,
      color: "#ffd24a",
    });
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

console.log("Linfocito B v2:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "linfocitoB_v2_plasmocito_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "linfocitoB_v2_plasmocito_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
