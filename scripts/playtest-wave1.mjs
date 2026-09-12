/**
 * Playtest visual de oleada 1 — captura screenshots en /opt/cursor/artifacts/
 * Uso: DISPLAY=:1 node scripts/playtest-wave1.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ARTIFACTS = "/opt/cursor/artifacts";
const BASE = "http://127.0.0.1:5173";

mkdirSync(ARTIFACTS, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--window-size=1280,800", "--window-position=80,60"],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__game?.state);

  // Entrar a Fase 1 (piel) sin título ni intro; countdown corto dispara ola 1.
  await page.evaluate(() => {
    const st = window.__game.state;
    st.showTitle = false;
    st.showIntro = false;
    st.atp = 140;
    st.nextWaveAt = 0.08;
    st.waveCountdownActive = true;
  });
  await sleep(1200);

  const waveStart = await page.evaluate(() => ({
    waveIdx: window.__game.state.waveIdx,
    waveActive: window.__game.state.waveActive,
    nextWaveAt: window.__game.state.nextWaveAt,
    enemies: window.__game.state.enemies.length,
  }));
  console.log("Oleada iniciada:", waveStart);

  await page.screenshot({
    path: join(ARTIFACTS, "wave1_wave_start.png"),
    fullPage: false,
  });

  // Colocar línea básica vía hook (posiciones validadas en campo)
  const built = await page.evaluate(() => {
    const g = window.__game;
    g.place("neutrofilo", 0.34, 0.50);
    g.place("queratinocito", 0.50, 0.55);
    g.place("mastocito", 0.62, 0.48);
    const st = g.state;
    return {
      towers: st.towers.map((t) => t.def.id),
      atp: Math.round(st.atp),
      enemies: st.enemies.length,
      waveIdx: st.waveIdx,
      waveActive: st.waveActive,
    };
  });
  console.log("Torres colocadas:", built);

  await sleep(500);
  await page.screenshot({
    path: join(ARTIFACTS, "wave1_towers_placed.png"),
    fullPage: false,
  });

  // Dejar correr la simulación en tiempo real (~40s)
  for (let i = 0; i < 5; i++) {
    await sleep(5000);
    const snap = await page.evaluate(() => {
      const st = window.__game.state;
      const types = {};
      for (const e of st.enemies) {
        const id = e.def?.id || "?";
        types[id] = (types[id] || 0) + 1;
      }
      return {
        time: Math.round(st.time),
        waveIdx: st.waveIdx,
        waveActive: st.waveActive,
        kills: st.kills,
        enemies: st.enemies.length,
        enemyTypes: types,
        towers: st.towers.length,
        gameOver: st.gameOver,
      };
    });
    console.log(`+${(i + 1) * 5}s`, snap);
    if (i === 2) {
      await page.screenshot({
        path: join(ARTIFACTS, "wave1_combat_mid.png"),
        fullPage: false,
      });
    }
    if (!snap.waveActive && snap.waveIdx >= 1 && snap.enemies === 0) break;
  }

  await page.screenshot({
    path: join(ARTIFACTS, "wave1_combat_end.png"),
    fullPage: false,
  });

  const final = await page.evaluate(() => {
    const st = window.__game.state;
    const types = {};
    for (const e of st.enemies) {
      const id = e.def?.id || "?";
      types[id] = (types[id] || 0) + 1;
    }
    return {
      waveIdx: st.waveIdx,
      waveActive: st.waveActive,
      kills: st.kills,
      enemiesLeft: st.enemies.length,
      enemyTypes: types,
      towers: st.towers.map((t) => ({
        id: t.def.id,
        hp: Math.round(t.hp),
        maxHp: t.maxHp,
        level: t.level,
      })),
      gameOver: st.gameOver,
      hints: (st.gameHints || []).map((h) => h.title + ": " + h.desc),
      germIntro: st.germIntroBanner?.id || null,
    };
  });

  console.log("\n=== RESULTADO OLEADA 1 ===");
  console.log(JSON.stringify(final, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
