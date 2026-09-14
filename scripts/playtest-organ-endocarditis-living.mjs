/** Velos, ateromas y mineros de endocarditis. DISPLAY=:1 node scripts/playtest-organ-endocarditis-living.mjs */
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
  st.towers = [];
  st.effects = [];
  st.f2.atheromas.forEach((a, i) => { a.excavated = 0.06; a.mineT = 0.52 + i * 0.4; });
  const def = window.ImmunoDefenseData.enemyDefs;
  function germ(typeId, frac, lane) {
    const d = def[typeId];
    const tot = g.pathLen(lane);
    const p = g.pathPos(tot * frac, lane);
    return {
      def: d, state: "walking", enteringTimer: 0, heridaIdx: lane,
      progress: tot * frac, progAtLastBeat: tot * frac,
      x: p.x, y: p.y, hp: d.hp, maxHp: d.hp,
      hitFlash: 0, dying: false, dead: false, absorbing: false,
      wobble: 0, radiusScale: 1.4,
    };
  }
  st.enemies = [
    germ("viridans", 0.78, 2),
    germ("enterococo", 0.74, 1),
  ];
  const F = g.metrics.FIELD;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  st.f2.inSystole = false;
  st.f2.pulseT = 2.58;
  g.hold(false);
  g.step(0.05, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_valve_push.png") });

const valveClip = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const tot = g.pathLen(2);
  const p = g.pathPos(tot * 0.86, 2);
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  return {
    x: Math.max(0, Math.round(sx(p.x) - 220)),
    y: Math.max(0, Math.round(sy(p.y) - 160)),
    width: 440,
    height: 300,
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_valve_clip.png"), clip: valveClip });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.f2.pulseT = 1.35;
  st.f2.inSystole = false;
  st.f2.valveSlap = 0;
  g.hold(false);
  g.step(0.04, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_valve_open.png") });
await page.screenshot({ path: join(ART, "organ_endocarditis_valve_open_clip.png"), clip: valveClip });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  const def = window.ImmunoDefenseData.enemyDefs;
  function germ(typeId, frac, lane) {
    const d = def[typeId];
    const tot = g.pathLen(lane);
    const p = g.pathPos(tot * frac, lane);
    return {
      def: d, state: "walking", enteringTimer: 0, heridaIdx: lane,
      progress: tot * frac, progAtLastBeat: tot * frac,
      x: p.x, y: p.y, hp: d.hp, maxHp: d.hp,
      hitFlash: 0, dying: false, dead: false, absorbing: false,
      wobble: 0, radiusScale: 1.25,
    };
  }
  st.f2.pulseT = 1.4;
  st.f2.inSystole = false;
  st.f2.valveSlap = 0;
  st.enemies = [
    germ("viridans", 0.24, 1),
    germ("viridans", 0.38, 3),
  ];
  st.dsScrollY = F.h * 0.22;
  g.hold(false);
  g.step(0.04, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_sarro.png") });

const atheromaClip = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const ath = st.f2.atheromas[0];
  const tot = g.pathLen(ath.lane);
  const p = g.pathPos(ath.atFrac * tot, ath.lane);
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  return {
    x: Math.max(0, Math.round(sx(p.x) - 170)),
    y: Math.max(0, Math.round(sy(p.y) - 140)),
    width: 340,
    height: 280,
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_sarro_clip.png"), clip: atheromaClip });

const minersClip = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const ath = st.f2.atheromas[0];
  const tot = g.pathLen(ath.lane);
  const p = g.pathPos(Math.max(0.02, ath.atFrac - ath.half * 0.72) * tot, ath.lane);
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  return {
    x: Math.max(0, Math.round(sx(p.x) - 180)),
    y: Math.max(0, Math.round(sy(p.y) - 160)),
    width: 360,
    height: 300,
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_sarro_miners.png"), clip: minersClip });

const info = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const ath = st.f2.atheromas[0];
  const tot = g.pathLen(ath.lane);
  const p0 = g.pathPos(ath.atFrac * tot, ath.lane);
  const dug = ath.excavated;
  ath.excavated = 1;
  const p1 = g.pathPos(ath.atFrac * tot, ath.lane);
  ath.excavated = dug;
  return {
    atheromas: st.f2.atheromas.length,
    excavated: st.f2.atheromas.map((a) => +a.excavated.toFixed(3)),
    valveSlap: st.f2.valveSlap,
    inSystole: !!st.f2.inSystole,
    enemies: st.enemies.length,
    bulgePx: Math.hypot(p0.x - p1.x, p0.y - p1.y),
  };
});
console.log("Endocarditis living:", info, { valveClip, atheromaClip, minersClip });
await browser.close();
console.log("OK: endocarditis living in", ART);
