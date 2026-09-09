/** Captura Linfocito B — Plasmocito ultimate. DISPLAY=:1 node scripts/playtest-linfocitoB.mjs */
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
  st.germIntroSeen.neisseria = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const U = g.metrics.U;

  g.place("linfocitoB", 0.36, 0.52);
  const lb = st.towers[0];
  if (!lb) return { ok: false, reason: "no lb placed" };
  lb.level = 2;

  const germDef = window.ImmunoDefenseData.enemyDefs.saureus
    || window.ImmunoDefenseData.enemyDefs.neisseria;
  const tx = cx + 100;
  const ty = cy - 20;
  if (germDef) {
    st.enemies = [{
      def: germDef,
      state: "walking",
      enteringTimer: 0,
      x: tx,
      y: ty,
      progress: 0.42,
      radiusScale: 1.6,
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
  lb.cannonRecoil = 0.05;
  lb.specialAnim = 0.85;

  const aimAng = Math.atan2(ty - lb.y, tx - lb.x);
  const barrelLen = 14 * U;
  const R = 18 * U * 1.45;
  const nx = Math.cos(aimAng);
  const ny = Math.sin(aimAng);
  const perpX = -ny;
  const perpY = nx;
  for (const sign of [-1, 1]) {
    const cbX = lb.x + sign * perpX * R * 0.85;
    const cbY = lb.y + sign * perpY * R * 0.85;
    const endX = cbX + nx * (barrelLen + 120 * U);
    const endY = cbY + ny * (barrelLen + 120 * U);
    st.effects.push({
      kind: "antibodyBeam",
      startX: cbX + nx * barrelLen,
      startY: cbY + ny * barrelLen,
      endX,
      endY,
      life: 0.12,
      max: 0.12,
    });
    for (let b = 0; b < 3; b++) {
      const bx = cbX + nx * (barrelLen + 30 * U + b * 28 * U);
      const by = cbY + ny * (barrelLen + 30 * U + b * 28 * U);
      st.effects.push({
        kind: "antibodyHeavy",
        x: bx,
        y: by,
        vx: nx * 520 * U,
        vy: ny * 520 * U,
        size: 7 * U,
        rot: aimAng,
        life: 0.35,
        max: 0.35,
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
    germ: germDef ? germDef.id : null,
    clip: { x: Math.round(sx - 320), y: Math.round(sy - 240), width: 760, height: 500 },
  };
});

console.log("Linfocito B Plasmocito:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "linfocitoB_plasmocito_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "linfocitoB_plasmocito_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: linfocitoB ultimate in", ART);
