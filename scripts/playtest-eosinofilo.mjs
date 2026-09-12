/** Captura Eosinófilo — Perdigonera dual. DISPLAY=:1 node scripts/playtest-eosinofilo.mjs */
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
await page.screenshot({ path: join(ART, "eosinofilo_idle.png") });

const info = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
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
  g.step(0.22, 0.03);
  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (eo.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (eo.y / g.metrics.VH) * rect.height;
  return {
    ok: !!eo.eosinShotgun,
    ang: eo.eosinShotgun && eo.eosinShotgun.ang,
    pellets: st.effects.filter((e) => e.kind === "granuleShot").length,
    clip: { x: Math.round(sx - 120), y: Math.round(sy - 260), width: 720, height: 520 },
    parasites: st.enemies.length,
  };
});

console.log("Eosinófilo Perdigonera:", info);
await sleep(80);
await page.screenshot({ path: join(ART, "eosinofilo_perdigonera.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "eosinofilo_perdigonera_clip.png"), clip: info.clip });
}
await page.evaluate(() => {
  window.__game.hold(false);
  window.__game.step(0.45, 0.03);
  window.__game.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "eosinofilo_perdigonera_mid.png") });
await browser.close();
console.log("OK: eosinofilo perdigonera in", ART);
