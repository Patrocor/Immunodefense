/** Casillas de vértices romos: dock, HUD, Dex, título. DISPLAY=:1 node scripts/playtest-ui-slots.mjs */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prepBattle(page) {
  await page.waitForFunction(() => window.__game?.state);
  await page.evaluate(() => {
    const g = window.__game;
    const st = g.state;
    st.showTitle = false;
    st.showIntro = false;
    st.atp = 220;
    st.waveActive = false;
    st.nextWaveAt = 12;
    st.waveCountdownActive = true;
    st.germIntroQueue = [];
    st.effects = [];
    st.towers = [];
    st.enemies = [];
    st.medCharge = 30;
    st.topicalCharge = 40;
    st.complement = 3;
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

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});

const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/#hifx");
await page.waitForFunction(() => window.__game?.state);
await page.screenshot({ path: join(ART, "slots_title.png") });

await prepBattle(page);
await page.screenshot({ path: join(ART, "slots_dock_hud.png") });

await page.evaluate(() => {
  const g = window.__game;
  g.state.selectedToBuild = "neutrofilo";
  g.state.compendiumOpen = true;
  g.state.loadoutEditing = true;
  g.relayout();
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "slots_dex.png") });

await page.evaluate(() => {
  const g = window.__game;
  g.state.compendiumOpen = false;
  g.state.loadoutEditing = false;
  g.state.paused = false;
  g.state.gameHints = [{
    title: "CASILLAS",
    desc: "Rectángulos de vértices romos",
    t: 0.4,
    life: 4
  }];
  g.relayout();
  g.hold(true);
});
await sleep(80);
await page.screenshot({ path: join(ART, "slots_hint.png") });

await browser.close();
console.log("OK: ui-slots shots in", ART);
