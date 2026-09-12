/** Dock portrait / landscape. DISPLAY=:1 node scripts/playtest-dock.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prep(page) {
  await page.waitForFunction(() => window.__game?.state);
  await page.evaluate(() => {
    const g = window.__game;
    const st = g.state;
    st.showTitle = false;
    st.showIntro = false;
    st.atp = 220;
    st.waveActive = false;
    st.nextWaveAt = 99;
    st.waveCountdownActive = false;
    st.germIntroQueue = [];
    st.effects = [];
    st.towers = [];
    st.enemies = [];
    st.loadout = {
      towers: ["neutrofilo", "nk", "eosinofilo", "queratinocito", "mastocito"],
      tanks: ["complemento"],
      barriers: []
    };
    st.unlockedTowers = [
      "neutrofilo", "nk", "eosinofilo", "queratinocito", "mastocito", "complemento"
    ];
    st.openGroups = { defensas: true, potenciadores: true, tanques: true };
    st.selectedToBuild = null;
    g.relayout();
    g.step(0.2, 0.05);
    g.hold(true);
  });
  await sleep(80);
}

const sizes = [
  ["desktop", 1280, 800],
  ["portrait", 390, 844],
  ["phone_land", 844, 390],
];

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});

for (const [tag, w, h] of sizes) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto("http://127.0.0.1:5173/#hifx");
  await prep(page);
  await page.screenshot({ path: join(ART, "dock_" + tag + ".png") });
  await page.evaluate(() => {
    window.__game.state.selectedToBuild = "neutrofilo";
    window.__game.relayout();
    window.__game.hold(true);
  });
  await sleep(80);
  await page.screenshot({ path: join(ART, "dock_" + tag + "_info.png") });
  await page.close();
}

await browser.close();
console.log("OK: dock shots in", ART);
