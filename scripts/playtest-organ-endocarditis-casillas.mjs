/** Casillas F2 = plato F1, texto que cabe. DISPLAY=:1 node scripts/playtest-organ-endocarditis-casillas.mjs */
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
  st.f2.focusFlash[0] = 0.7;
  st.f2.focusFlash[2] = 0.7;
  const F = g.metrics.FIELD;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  g.step(0.04, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_casillas.png") });

const clips = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  const marks = g.f2Markers();
  const door = marks[2] || marks[0];
  const left = marks[0];
  return {
    focusClip: {
      x: Math.max(0, Math.round(sx(door.doorX) - 160)),
      y: Math.max(0, Math.round(sy(door.doorY) - 150)),
      width: 320,
      height: 240,
    },
    rowClip: {
      x: Math.max(0, Math.round(sx(left.doorX) - 70)),
      y: Math.max(0, Math.round(sy(left.doorY) - 120)),
      width: Math.min(rect.width, Math.round(sx(marks[4].doorX) - sx(left.doorX) + 160)),
      height: 230,
    },
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_casillas_clip.png"), clip: clips.focusClip });
await page.screenshot({ path: join(ART, "organ_endocarditis_casillas_row.png"), clip: clips.rowClip });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  const defs = window.ImmunoDefenseData.towerDefs;
  const enemyDefs = window.ImmunoDefenseData.enemyDefs;
  function germ(typeId, frac, lane) {
    const d = enemyDefs[typeId];
    const tot = g.pathLen(lane);
    const p = g.pathPos(tot * frac, lane);
    return {
      def: d, state: "walking", enteringTimer: 0, heridaIdx: lane,
      progress: tot * frac, progAtLastBeat: tot * frac,
      x: p.x, y: p.y, hp: d.hp, maxHp: d.hp,
      hitFlash: 0, dying: false, dead: false, absorbing: false,
      wobble: 0, radiusScale: 1.35,
    };
  }
  st.atp = 999;
  st.dsScrollY = Math.round(F.h * 0.42);
  const worldW = F.w * ((st.f2.cfg.stretchX || 1));
  const worldH = F.h * ((st.f2.cfg.stretchY || 1));
  function nxy(x, y) {
    return [(x - F.left) / worldW, (y - F.top) / worldH];
  }
  const mid = g.pathPos(g.pathLen(2) * 0.52, 2);
  const left = g.pathPos(g.pathLen(1) * 0.48, 1);
  const right = g.pathPos(g.pathLen(3) * 0.50, 3);
  const pe = nxy(left.x + 56, left.y);
  const pm = nxy(mid.x - 56, mid.y);
  const pc = nxy(right.x + 56, right.y);
  g.place("endotelial", pe[0], pe[1]);
  g.place("monocito", pm[0], pm[1]);
  g.place("macrofagoCardiaco", pc[0], pc[1]);
  st.enemies = [
    germ("viridans", 0.50, 2),
    germ("enterococo", 0.46, 1),
    germ("hacek", 0.54, 3),
  ];
  st.f2.pulseT = 1.4;
  g.hold(false);
  g.step(0.05, 0.02);
  g.hold(true);
  return {
    towers: st.towers.map((t) => t.def && t.def.id),
    germs: st.enemies.map((e) => e.def && e.def.id),
  };
}).then((info) => console.log("Roster:", info));
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_roster.png") });

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
  st.towers.forEach((t) => { if (t.def) towers[t.def.id] = clip(t.x, t.y, 90); });
  const germs = {};
  st.enemies.forEach((e) => { if (e.def) germs[e.def.id] = clip(e.x, e.y, 90); });
  return { towers, germs, nT: st.towers.length, nE: st.enemies.length };
});
console.log("Unit clips:", unitClips);
for (const [id, clip] of Object.entries(unitClips.towers)) {
  await page.screenshot({ path: join(ART, "organ_endocarditis_tower_" + id + ".png"), clip });
}
for (const [id, clip] of Object.entries(unitClips.germs)) {
  await page.screenshot({ path: join(ART, "organ_endocarditis_germ_" + id + ".png"), clip });
}

await browser.close();
console.log("OK: endocarditis casillas in", ART);
