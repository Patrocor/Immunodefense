/** Captura identidad endocarditis. DISPLAY=:1 node scripts/playtest-organ-endocarditis.mjs */
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

const info = await page.evaluate(() => {
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
  g.step(0.04, 0.02);
  g.hold(true);
  const F = g.metrics.FIELD;
  const kit = g.organIdentity();
  return {
    key: st.f2.cfg.key,
    kit: kit && kit.labelKit,
    inSystole: !!st.f2.inSystole,
    entries: (window.__game.state /* wounds via metrics */),
    field: F,
    scrollMax: Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1)),
  };
});
console.log("Endocarditis diastole top:", info);
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_diastole_top.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_diastole_valve.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.dsScrollY = 0;
  st.f2.pulseT = 0.08;
  g.hold(false);
  g.step(0.04, 0.02);
  g.hold(true);
  return { inSystole: !!st.f2.inSystole };
}).then((s) => console.log("Endocarditis systole:", s));
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_systole_top.png") });

const clips = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const w0 = st /* PATH not exposed */;
  const sx = (x) => rect.left + (x / g.metrics.VW) * rect.width;
  const sy = (y) => rect.top + ((y - (st.dsScrollY || 0)) / g.metrics.VH) * rect.height;
  const entryX = F.left + F.w * 0.50;
  const entryY = F.top + F.h * 0.08;
  return {
    entryClip: {
      x: Math.round(sx(entryX) - 220),
      y: Math.round(sy(entryY) - 80),
      width: 440,
      height: 280,
    },
  };
});
await page.screenshot({ path: join(ART, "organ_endocarditis_entry_clip.png"), clip: clips.entryClip });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_systole_valve.png") });

await page.evaluate(() => {
  const g = window.__game;
  g.hold(false);
  g.goF2("osteomielitis");
  g.state.f2.introTimer = 0;
  g.step(0.04, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_osteomielitis_control.png") });

await browser.close();
console.log("OK: organ endocarditis identity in", ART);
