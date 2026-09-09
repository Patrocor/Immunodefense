/** Captura Eosinófilo — Descarga de gránulos. DISPLAY=:1 node scripts/playtest-eosinofilo.mjs */
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

  g.step(24, 0.05);
  let src = st.enemies.find((e) => e.def && e.def.baseKind === "parasito");
  if (!src) src = st.enemies.find((e) => e.def && e.def.id === "demodex");
  const F = g.metrics.FIELD;
  const cx = (F.left + F.right) / 2;
  const cy = (F.top + F.bottom) * 0.52;

  g.place("eosinofilo", 0.40, 0.52);
  const eo = st.towers[0];
  if (!eo) return { ok: false, reason: "no eos placed" };
  eo.level = 2;

  const paraDef = window.ImmunoDefenseData.enemyDefs.demodex
    || window.ImmunoDefenseData.enemyDefs.leishmania
    || window.ImmunoDefenseData.enemyDefs.sarna;
  const parasites = [];
  if (paraDef) {
    const spots = [
      { x: cx + 70, y: cy - 35 },
      { x: cx + 95, y: cy + 25 },
      { x: cx + 55, y: cy + 45 },
    ];
    for (let i = 0; i < spots.length; i++) {
      parasites.push({
        def: paraDef,
        state: "walking",
        enteringTimer: 0,
        x: spots[i].x,
        y: spots[i].y,
        progress: 0.4 + i * 0.05,
        radiusScale: 1.5,
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

  const U = g.metrics.U;
  const eoR = 190 * U;
  st.effects.push({
    kind: "novaRing",
    x: eo.x,
    y: eo.y,
    r: eoR,
    color: "#F2774E",
    life: 0.42,
    max: 0.55,
  });
  for (let i = 0; i < parasites.length; i++) {
    const pe = parasites[i];
    const dur = 0.18 + i * 0.04;
    st.effects.push({
      kind: "granuleShot",
      x: eo.x + (Math.random() - 0.5) * 8 * U,
      y: eo.y + (Math.random() - 0.5) * 8 * U,
      vx: (pe.x - eo.x) / dur,
      vy: (pe.y - eo.y) / dur,
      life: dur,
      max: dur,
    });
  }
  eo.specialAnim = 0.55;

  g.hold(true);
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (eo.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (eo.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    paraId: paraDef ? paraDef.id : null,
    parasites: parasites.length,
    clip: { x: Math.round(sx - 320), y: Math.round(sy - 240), width: 720, height: 500 },
  };
});

console.log("Eosinófilo Descarga:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "eosinofilo_descarga_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "eosinofilo_descarga_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: eosinofilo ultimate in", ART);
