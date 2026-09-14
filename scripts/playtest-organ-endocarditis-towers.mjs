/** Roster F2 endocarditis: dock filtrado + 3 residentes. DISPLAY=:1 node scripts/playtest-organ-endocarditis-towers.mjs */
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
await sleep(700);

function canvasMap() {
  return page.evaluate(() => {
    const g = window.__game;
    const st = g.state;
    const canvas = document.getElementById("canvas");
    const rect = canvas.getBoundingClientRect();
    const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
    const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
    return { sx, sy, rect, F: g.metrics.FIELD, side: g.metrics.SIDE_W, VW: g.metrics.VW, VH: g.metrics.VH };
  });
}

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  g.goF2("endocarditis");
  st.f2.introTimer = 0;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.f2.pulseT = 1.4;
  const extra = ["neutrofilo", "eosinofilo", "nk", "langerhans", "queratinocito", "mastocito",
    "sebocito", "pdc", "linfocitogd", "linfocitoB", "linfocitoT", "complemento",
    "endotelial", "monocito", "macrofagoCardiaco"];
  extra.forEach((id) => { if (st.unlockedTowers.indexOf(id) === -1) st.unlockedTowers.push(id); });
  st.loadout.towers = ["neutrofilo", "eosinofilo", "nk", "langerhans", "linfocitoB"];
  st.loadout.tanks = ["complemento"];
  g.relayout();
  const F = g.metrics.FIELD;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  g.step(0.05, 0.02);
  g.hold(true);
  return { dock: g.dockTypeIds(), name: st.towers };
}).then((info) => console.log("Dock filtrado:", info.dock));

await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_dock.png") });

const dockClip = await page.evaluate(() => {
  const g = window.__game;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const F = g.metrics.FIELD;
  const x = Math.max(0, Math.round(rect.left + (F.right / g.metrics.VW) * rect.width) - 8);
  return {
    x,
    y: Math.max(0, Math.round(rect.top + (F.top / g.metrics.VH) * rect.height)),
    width: Math.min(rect.width - x, Math.round((g.metrics.SIDE_W / g.metrics.VW) * rect.width) + 16),
    height: Math.min(rect.height - 20, 620),
  };
});
console.log("Dock clip:", dockClip);
await page.screenshot({ path: join(ART, "organ_endocarditis_dock_clip.png"), clip: dockClip });

const placed = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  const worldW = F.w * (st.f2.cfg.stretchX || 1);
  const worldH = F.h * (st.f2.cfg.stretchY || 1);
  function nxy(x, y) { return [(x - F.left) / worldW, (y - F.top) / worldH]; }
  const mid = g.pathPos(g.pathLen(2) * 0.52, 2);
  const left = g.pathPos(g.pathLen(1) * 0.48, 1);
  const right = g.pathPos(g.pathLen(3) * 0.50, 3);
  st.towers = [];
  st.enemies = [];
  st.atp = 999;
  const pe = nxy(left.x + 56, left.y);
  const pm = nxy(mid.x - 56, mid.y);
  const pc = nxy(right.x + 56, right.y);
  g.place("endotelial", pe[0], pe[1]);
  g.place("monocito", pm[0], pm[1]);
  g.place("macrofagoCardiaco", pc[0], pc[1]);
  st.f2.pulseT = 1.4;
  g.hold(false);
  g.step(0.35, 0.02);
  g.hold(true);
  return st.towers.map((t) => t.def && t.def.id + " " + t.def.shortName);
});
console.log("Residentes:", placed);
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_residents.png") });

const unitClips = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  function clip(x, y, s) {
    return {
      x: Math.max(0, Math.round(sx(x) - s)),
      y: Math.max(0, Math.round(sy(y) - s)),
      width: s * 2,
      height: s * 2,
    };
  }
  const towers = {};
  st.towers.forEach((t) => { if (t.def) towers[t.def.id] = clip(t.x, t.y, 96); });
  return towers;
});
for (const [id, clip] of Object.entries(unitClips)) {
  await page.screenshot({ path: join(ART, "organ_endocarditis_tower_" + id + ".png"), clip });
}

const engulf = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  const worldW = F.w * (st.f2.cfg.stretchX || 1);
  const worldH = F.h * (st.f2.cfg.stretchY || 1);
  const tot = g.pathLen(2);
  const p = g.pathPos(tot * 0.82, 2);
  const defs = window.ImmunoDefenseData.enemyDefs;
  st.towers = [];
  st.enemies = [];
  st.atp = 999;
  g.place("macrofagoCardiaco", (p.x + 30 - F.left) / worldW, (p.y - F.top) / worldH);
  const d = defs.viridans;
  st.enemies = [{
    def: d, state: "walking", enteringTimer: 0, heridaIdx: 2,
    progress: tot * 0.82, progAtLastBeat: tot * 0.82,
    x: p.x, y: p.y, hp: d.hp, maxHp: d.hp,
    hitFlash: 0, dying: false, dead: false, absorbing: false,
    wobble: 0, radiusScale: 1.25, vegLayers: 3
  }];
  g.hold(false);
  g.step(0.55, 0.02);
  g.hold(true);
  const t = st.towers[0];
  const e = st.enemies[0];
  return {
    phase: t && t.engulfPhase,
    mouth: t && t.mouthOpen,
    germDead: !e || e.dead,
    being: e && e.beingEngulfed,
    tx: t && t.x, ty: t && t.y,
    ex: e && e.x, ey: e && e.y
  };
});
console.log("Engulf mid:", engulf);
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_engulf.png") });
const engulfClip = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const t = st.towers[0];
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  return {
    x: Math.max(0, Math.round(sx(t.x) - 140)),
    y: Math.max(0, Math.round(sy(t.y) - 140)),
    width: 280,
    height: 280,
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_engulf_clip.png"), clip: engulfClip });

await page.evaluate(() => {
  const g = window.__game;
  g.hold(false);
  g.step(1.6, 0.02);
  g.hold(true);
  return {
    enemies: g.state.enemies.length,
    dead: g.state.enemies.map((e) => !!e.dead),
    swallow: g.state.towers[0] && g.state.towers[0].swallow
  };
}).then((info) => console.log("Engulf after:", info));
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_engulf_after.png"), clip: engulfClip });

await browser.close();
console.log("OK: endocarditis towers in", ART);
