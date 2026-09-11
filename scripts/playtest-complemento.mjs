/** Captura Cañón MAC v1 — poro C5b–C9 + Cascada C9. DISPLAY=:1 node scripts/playtest-complemento.mjs */
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
  st.complement = 8;
  st.waveIdx = 9;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.saureus = true;
  st.germIntroSeen.pseudomonas = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.cannonNets = [];
  st.cannonShots = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const U = g.metrics.U;

  g.place("complemento", 0.36, 0.52);
  g.place("linfocitoB", 0.36, 0.38);
  const mac = st.towers[0];
  if (!mac) return { ok: false, reason: "no mac placed" };
  mac.level = 1;
  mac.shotsFired = 2;
  mac.cooldown = 0;
  mac.patrolDir = 1;

  const defs = window.ImmunoDefenseData.enemyDefs;
  const germSpots = [
    { id: "saureus", x: cx + 90, y: cy - 18, progress: 0.52, hpFrac: 0.7 },
    { id: "pseudomonas", x: cx + 128, y: cy + 16, progress: 0.56, hpFrac: 0.55 },
    { id: "saureus", x: cx + 70, y: cy + 36, progress: 0.48, hpFrac: 0.62 },
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
      _heading: -0.08,
      _lastPosX: spot.x - 12,
      _lastPosY: spot.y + 2,
    });
  }

  mac.specialReady = true;
  mac.specialCharge = 1;
  mac.macPulse = 2.2;
  mac.specialAnim = 0.78;
  mac.lastTargetX = germSpots[0].x;
  mac.lastTargetY = germSpots[0].y;
  mac.muzzleFlash = 0.12;
  mac.attackAnim = 0.16;

  const splash = 50 * U;
  st.cannonNets.push({
    x: germSpots[0].x, y: germSpots[0].y, r: splash * 1.2, dps: 40,
    life: 2.4, max: 4.0, seed: 12,
  });
  st.cannonNets.push({
    x: germSpots[1].x, y: germSpots[1].y, r: splash * 1.1, dps: 40,
    life: 2.2, max: 4.0, seed: 40,
  });
  st.effects.push({
    kind: "macCascade", x: mac.x, y: mac.y, r: splash * 2.4, life: 0.72, max: 1.15,
  });
  st.effects.push({
    kind: "macBolt", x: mac.x, y: mac.y, tx: germSpots[0].x, ty: germSpots[0].y,
    life: 0.32, max: 0.55,
  });
  st.effects.push({
    kind: "novaRing", x: mac.x, y: mac.y, r: splash * 2.2, color: "#FFD24A",
    life: 0.55, max: 0.8,
  });
  st.effects.push({
    kind: "atpText", x: mac.x, y: mac.y - 38 * U, vy: -26 * U,
    text: "C9!", life: 0.58, max: 0.75, color: "#ffe27a",
  });
  st.cannonShots.push({
    sx: mac.x, sy: mac.y, tx: germSpots[2].x, ty: germSpots[2].y,
    t: 0.45, max: 1.0, dmg: 40, splash: splash, dur: 4,
  });

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (mac.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (mac.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    enemies: st.enemies.length,
    clip: { x: Math.round(sx - 300), y: Math.round(sy - 280), width: 920, height: 620 },
  };
});

console.log("Cañón MAC v1 poro:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "complemento_v1_pore_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "complemento_v1_pore_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK:", ART);
