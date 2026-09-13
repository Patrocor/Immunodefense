/** Botón de cinemática nombra Diseminación. DISPLAY=:1 node scripts/playtest-textos-honestos.mjs */
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
await page.evaluate(() => {
  const g = window.__game;
  g.state.showTitle = false;
  g.state.showIntro = false;
  g.state.cinematicEnd = { t: 8.2, buttonShown: true };
  g.step(0.2, 0.05);
  g.hold(true);
});
await sleep(120);
await page.screenshot({ path: join(ART, "honest_cinematic_btn.png") });
const label = await page.evaluate(() => {
  const btn = window.__game.ui.cinematicBtn;
  return btn ? { x: btn.x, y: btn.y, w: btn.w, h: btn.h } : null;
});
if (label) {
  await page.screenshot({
    path: join(ART, "honest_cinematic_btn_closeup.png"),
    clip: { x: label.x - 8, y: label.y - 8, width: label.w + 16, height: label.h + 16 }
  });
  await page.mouse.click(label.x + label.w / 2, label.y + label.h / 2);
  await sleep(200);
  await page.screenshot({ path: join(ART, "honest_cinematic_map.png") });
}
await browser.close();
console.log("OK: honest-text shots in", ART, label);
