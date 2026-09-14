/** Ambiente mitral de endocarditis. DISPLAY=:1 node scripts/playtest-organ-endocarditis-ambient.mjs */
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
  st.f2.pulseT = 1.35;
  g.step(0.35, 0.03);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_ambient_atrium.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  st.dsScrollY = F.h * 0.32;
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_ambient_mid.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_ambient_valve.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.dsScrollY = 0;
  st.f2.pulseT = 0.08;
  g.hold(false);
  g.step(0.05, 0.02);
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_ambient_systole.png") });

await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  const F = g.metrics.FIELD;
  st.f2.integrity = 38;
  st.dsScrollY = Math.max(0, F.h * ((st.f2.cfg.stretchY || 1) - 1));
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "organ_endocarditis_ambient_eroded.png") });

const info = await page.evaluate(() => {
  const st = window.__game.state;
  return {
    motas: st.f2.ambient && st.f2.ambient.motas.length,
    streamers: st.f2.ambient && st.f2.ambient.streamers && st.f2.ambient.streamers.length,
    v: st.f2.ambient && st.f2.ambient.v,
    inSystole: !!st.f2.inSystole,
    integrity: st.f2.integrity,
  };
});
console.log("Ambiente mitral:", info);
await browser.close();
console.log("OK: endocarditis ambient in", ART);
