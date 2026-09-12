/** Captura viñetas celulares (una por foto). DISPLAY=:1 node scripts/playtest-vignettes.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KINDS = [
  ["platelets", 2.4],
  ["keratin", 3.2],
  ["endothelium", 2.6],
  ["fibroblasts", 2.0],
  ["sweepers", 2.4],
];

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
  st.atp = 180;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroQueue = [];
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.pendingSpawns = [];
  st.mitosis = null;
});

for (const [kind, t] of KINDS) {
  const info = await page.evaluate(({ k, dur }) => {
    const g = window.__game;
    g.state.towers = [];
    g.state.enemies = [];
    const played = g.vignettePlay(k);
    g.step(dur, 0.04);
    g.hold(true);
    return {
      played,
      kind: g.state.cellVignettes && g.state.cellVignettes.act && g.state.cellVignettes.act.kind,
    };
  }, { k: kind, dur: t });
  console.log(kind, info);
  await sleep(80);
  await page.screenshot({ path: join(ART, "vignette_" + kind + ".png") });
  await page.evaluate(() => window.__game.hold(false));
}

for (const [tag, dur] of [["start", 0.7], ["mid", 3.2], ["end", 5.6]]) {
  await page.evaluate((t) => {
    const g = window.__game;
    g.state.towers = [];
    g.state.enemies = [];
    g.vignettePlay("keratin");
    g.step(t, 0.04);
    g.hold(true);
  }, dur);
  await sleep(80);
  await page.screenshot({ path: join(ART, "vignette_keratin_" + tag + ".png") });
  await page.evaluate(() => window.__game.hold(false));
}

await browser.close();
console.log("OK: vignettes in", ART);
