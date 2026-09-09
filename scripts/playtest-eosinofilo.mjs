/** Captura Eosinófilo v2 — Descarga de gránulos. DISPLAY=:1 node scripts/playtest-eosinofilo.mjs */
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
  st.waveIdx = 5;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.demodex = true;
  st.germIntroSeen.leishmania = true;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];

  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;
  const U = g.metrics.U;

  g.place("eosinofilo", 0.38, 0.52);
  const eo = st.towers[0];
  if (!eo) return { ok: false, reason: "no eos placed" };
  eo.level = 2;
  eo.ilc2EosinT = 2.5;

  const paraDef = window.ImmunoDefenseData.enemyDefs.demodex
    || window.ImmunoDefenseData.enemyDefs.leishmania;
  const parasites = [];
  if (paraDef) {
    const spots = [
      { x: cx + 85, y: cy - 40 },
      { x: cx + 115, y: cy + 18 },
      { x: cx + 70, y: cy + 48 },
    ];
    for (let i = 0; i < spots.length; i++) {
      parasites.push({
        def: paraDef,
        state: "walking",
        enteringTimer: 0,
        x: spots[i].x,
        y: spots[i].y,
        progress: 0.4 + i * 0.05,
        radiusScale: 1.55,
        hp: paraDef.hp,
        maxHp: paraDef.hp,
        hitFlash: 0,
        dying: false,
        dead: false,
        wobble: 0.5 + i * 0.2,
        _heading: -0.1,
        _lastPosX: spots[i].x - 12,
        _lastPosY: spots[i].y,
      });
    }
  }
  st.enemies = parasites;

  eo.specialReady = true;
  eo.specialCharge = 1;
  g.tapTower(0);

  const eoR = 190 * U;
  st.effects.push({
    kind: "eosinBurst",
    x: eo.x,
    y: eo.y,
    r: eoR,
    life: 0.48,
    max: 0.72,
  });
  for (let i = 0; i < parasites.length; i++) {
    const pe = parasites[i];
    for (let n = 0; n < 2; n++) {
      const dur = 0.16 + n * 0.05;
      const ox = (Math.random() - 0.5) * 12 * U;
      const oy = (Math.random() - 0.5) * 12 * U;
      st.effects.push({
        kind: "granuleShot",
        x: eo.x + ox,
        y: eo.y + oy,
        vx: (pe.x - eo.x - ox) / dur,
        vy: (pe.y - eo.y - oy) / dur,
        life: dur,
        max: dur,
        crystal: true,
      });
    }
    for (let p = 0; p < 3; p++) {
      const pa = Math.random() * Math.PI * 2;
      st.effects.push({
        kind: "particle",
        x: pe.x,
        y: pe.y,
        vx: Math.cos(pa) * 45 * U,
        vy: Math.sin(pa) * 45 * U - 15 * U,
        life: 0.5,
        max: 0.6,
        color: "rgba(160, 230, 90, 0.85)",
      });
    }
  }
  eo.specialAnim = 0.62;

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (eo.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (eo.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    paraId: paraDef ? paraDef.id : null,
    parasites: parasites.length,
    clip: { x: Math.round(sx - 340), y: Math.round(sy - 250), width: 780, height: 520 },
  };
});

console.log("Eosinófilo v2 Descarga:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "eosinofilo_v2_descarga_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "eosinofilo_v2_descarga_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: eosinofilo v2 in", ART);
