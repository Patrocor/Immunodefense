/** Captura NK — Frenesí citotóxico (ultimate). DISPLAY=:1 node scripts/playtest-nk.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setupNkFrenesi() {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 300;
  st.waveIdx = 2;
  st.waveActive = false;
  st.nextWaveAt = 0.05;
  st.waveCountdownActive = true;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.hsv = true;
  st.germIntroSeen.sepidermidis = true;
  st.germIntroSeen.molluscum = true;
  st.germIntroQueue = [];
  st.germIntroActive = null;
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.selectedTower = null;
  st.selectedToBuild = null;
  st.msgTimer = 0;
  st.pendingSpawns = [];

  g.step(20, 0.05);
  let src = st.enemies.find((e) => e.def && e.def.id === "hsv");
  if (!src) {
    g.step(16, 0.05);
    src = st.enemies.find((e) => e.def && e.def.id === "hsv");
  }

  g.place("nk", 0.36, 0.52);
  const nk = st.towers[0];
  if (!nk) return { ok: false, reason: "no nk placed" };
  nk.level = 2;

  const F = g.metrics.FIELD;
  const tx = (F.left + F.right) * 0.58;
  const ty = (F.top + F.bottom) * 0.50;

  if (src) {
    st.enemies = [{
      ...src,
      state: "walking",
      enteringTimer: 0,
      x: tx,
      y: ty,
      progress: 0.42,
      radiusScale: 1.75,
      hp: src.maxHp || src.def.hp,
      maxHp: src.maxHp || src.def.hp,
      hitFlash: 0,
      hurtTimer: 0,
      dying: false,
      dead: false,
      wobble: 0.65,
      _heading: -0.25,
      _lastPosX: tx - 20,
      _lastPosY: ty + 4,
    }];
  }

  st.waveActive = false;
  st.waveCountdownActive = false;
  st.pendingSpawns = [];
  st.effects = [];

  nk.specialReady = true;
  nk.specialCharge = 1;
  g.tapTower(0);

  for (let i = 0; i < 10; i++) g.step(0.05, 0.05);

  g.hold(true);

  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = rect.left + (nk.x / g.metrics.VW) * rect.width;
  const sy = rect.top + (nk.y / g.metrics.VH) * rect.height;
  return {
    ok: true,
    specialAnim: nk.specialAnim,
    frenzySpin: nk.frenzySpin,
    bolts: st.effects.filter((e) => e.kind === "perforinBolt").length,
    clip: { x: Math.round(sx - 300), y: Math.round(sy - 220), width: 600, height: 440 },
  };
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);
await sleep(900);

const info = await page.evaluate(setupNkFrenesi);
console.log("NK Frenesí:", info);
await sleep(500);
await page.screenshot({ path: join(ART, "nk_frenesi_ultimate_field.png") });
if (info.ok) {
  await page.screenshot({ path: join(ART, "nk_frenesi_ultimate.png"), clip: info.clip });
}
await page.evaluate(() => window.__game.hold(false));
await browser.close();
console.log("OK: nk ultimate screenshots in", ART);
