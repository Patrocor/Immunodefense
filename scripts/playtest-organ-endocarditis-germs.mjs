/** Siluetas F2 endocarditis: viridans / enterococo / HACEK. DISPLAY=:1 node scripts/playtest-organ-endocarditis-germs.mjs */
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
  const F = g.metrics.FIELD;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  const defs = window.ImmunoDefenseData.enemyDefs;
  function germ(typeId, frac, lane, extra) {
    const d = defs[typeId];
    const tot = g.pathLen(lane);
    const p = g.pathPos(tot * frac, lane);
    const e = {
      def: d, state: "walking", enteringTimer: 0, heridaIdx: lane,
      progress: tot * frac, progAtLastBeat: tot * frac,
      x: p.x, y: p.y, hp: d.hp, maxHp: d.hp,
      hitFlash: 0, dying: false, dead: false, absorbing: false,
      wobble: 0.4, radiusScale: 1.45, vegLayers: 0,
      shieldHP: d.shield ? d.shield.maxHP : 0
    };
    if (extra) Object.assign(e, extra);
    return e;
  }
  st.enemies = [
    germ("viridans", 0.48, 1),
    germ("enterococo", 0.52, 2),
    germ("hacek", 0.50, 3)
  ];
  g.hold(false);
  g.step(0.12, 0.02);
  g.hold(true);
  return st.enemies.map((e) => e.def.id);
}).then((ids) => console.log("Germs:", ids));
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_germs.png") });

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
  const germs = {};
  st.enemies.forEach((e) => { if (e.def) germs[e.def.id] = clip(e.x, e.y, 110); });
  return germs;
});
for (const [id, clip] of Object.entries(unitClips)) {
  await page.screenshot({ path: join(ART, "organ_endocarditis_germ_" + id + ".png"), clip });
}

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.enemies.forEach((e) => {
    if (e.def.id === "viridans") { e.vegLayers = 2; e.vegMature = false; }
    if (e.def.id === "enterococo") { e.hp = e.maxHp * 0.45; e.shieldHP = 1; }
  });
  g.hold(true);
});
await sleep(80);
const vegClip = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  const v = st.enemies.find((e) => e.def.id === "viridans");
  const en = st.enemies.find((e) => e.def.id === "enterococo");
  return {
    vir: { x: Math.max(0, Math.round(sx(v.x) - 110)), y: Math.max(0, Math.round(sy(v.y) - 110)), width: 220, height: 220 },
    ent: { x: Math.max(0, Math.round(sx(en.x) - 110)), y: Math.max(0, Math.round(sy(en.y) - 110)), width: 220, height: 220 }
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_germ_viridans_veg.png"), clip: vegClip.vir });
await page.screenshot({ path: join(ART, "organ_endocarditis_germ_enterococo_hurt.png"), clip: vegClip.ent });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.f2.pulseT = 0.08;
  g.hold(false);
  g.step(0.05, 0.02);
  g.hold(true);
  return { inSystole: !!st.f2.inSystole };
}).then((s) => console.log("Systole:", s));
await sleep(80);
const hacekClip = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  const h = st.enemies.find((e) => e.def.id === "hacek");
  return {
    x: Math.max(0, Math.round(sx(h.x) - 120)),
    y: Math.max(0, Math.round(sy(h.y) - 120)),
    width: 240,
    height: 240
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_germ_hacek_systole.png"), clip: hacekClip });

await browser.close();
console.log("OK: endocarditis germs in", ART);
