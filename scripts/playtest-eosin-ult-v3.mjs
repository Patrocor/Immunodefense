/** Captura Eosinófilo Ult v3 — dos escopetas MBP. DISPLAY=:1 node scripts/playtest-eosin-ult-v3.mjs */
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
await page.goto("http://127.0.0.1:5173/#hifx");
await page.waitForFunction(() => window.__game?.state);
await sleep(800);

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 400;
  st.waveIdx = 5;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.demodex = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];
  g.place("eosinofilo", 0.42, 0.50);
  const eo = st.towers[0];
  if (eo) { eo.level = 2; eo.specialCharge = 0.8; }
});
await sleep(400);
await page.screenshot({ path: join(ART, "eosin_ult_v3_idle.png") });

const info = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const U = g.metrics.U;
  const paraDef = window.ImmunoDefenseData.enemyDefs.leishmania;
  const eo = st.towers[0];
  const spots = [
    { x: eo.x + 120 * U, y: eo.y - 12 * U },
    { x: eo.x + 155 * U, y: eo.y + 28 * U },
    { x: eo.x + 100 * U, y: eo.y + 40 * U },
  ];
  st.enemies = spots.map((p, i) => ({
    def: paraDef, state: "walking", enteringTimer: 0,
    x: p.x, y: p.y, progress: 0.42 + i * 0.04, radiusScale: 1.45,
    hp: paraDef.hp, maxHp: paraDef.hp, hitFlash: 0, dying: false, dead: false,
    revealed: true, wobble: 0.4, _heading: -0.1, _lastPosX: p.x - 10, _lastPosY: p.y,
  }));
  eo.specialReady = true;
  eo.specialCharge = 1;
  g.ults();
  g.step(0.04, 0.02);
  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (eo.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (eo.y / g.metrics.VH) * rect.height;
  const pellets = st.effects.filter((e) => e.kind === "granuleShot");
  return {
    ok: !!eo.eosinShotgun,
    ang: eo.eosinShotgun && eo.eosinShotgun.ang,
    volleys: eo.eosinShotgun && eo.eosinShotgun.volleys,
    recoilL: eo.eosinShotgun && eo.eosinShotgun.recoilL,
    recoilR: eo.eosinShotgun && eo.eosinShotgun.recoilR,
    pellets: pellets.length,
    left: pellets.filter((e) => e.side === -1).length,
    right: pellets.filter((e) => e.side === 1).length,
    clip: { x: Math.round(sx - 140), y: Math.round(sy - 220), width: 760, height: 480 },
    parasites: st.enemies.length,
  };
});

console.log("Eosinófilo Ult v3 blast:", info);
await sleep(80);
await page.screenshot({ path: join(ART, "eosin_ult_v3_blast.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "eosin_ult_v3_clip.png"), clip: info.clip });
}
await page.evaluate(() => {
  window.__game.hold(false);
  window.__game.step(0.36, 0.03);
  window.__game.hold(true);
});
await sleep(80);
const mid = await page.evaluate(() => {
  const st = window.__game.state;
  const eo = st.towers[0];
  return {
    volleys: eo.eosinShotgun && eo.eosinShotgun.volleys,
    pellets: st.effects.filter((e) => e.kind === "granuleShot").length,
    specialAnim: eo.specialAnim,
  };
});
console.log("Eosinófilo Ult v3 mid:", mid);
await page.screenshot({ path: join(ART, "eosin_ult_v3_mid.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "eosin_ult_v3_mid_clip.png"), clip: info.clip });
}
await browser.close();
console.log("OK: eosin ult v3 in", ART);
