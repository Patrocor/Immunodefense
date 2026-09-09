/** Showcase Pseudomonas germ — DISPLAY=:1 node scripts/playtest-pseudomonas.mjs */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ART = "/opt/cursor/artifacts";
const TMP = "/tmp/pseudo-germ-shots";
mkdirSync(ART, { recursive: true });
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--window-size=1280,800", "--window-position=80,60"],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => window.__game?.state);

const spawned = await page.evaluate(() => {
  const g = window.__game;
  const st = g.state;
  st.showTitle = false;
  st.showIntro = false;
  st.atp = 300;
  st.waveIdx = 7;
  st.waveActive = false;
  st.nextWaveAt = 99;
  st.waveCountdownActive = false;
  st.germIntroSeen = st.germIntroSeen || {};
  st.germIntroSeen.pseudomonas = true;
  st.germIntroQueue = [];
  st.germIntroActive = null;
  st.effects = [];
  st.towers = [];
  st.enemies = [];
  st.seekers = [];
  const def = window.ImmunoDefenseData.enemyDefs.pseudomonas;
  if (!def) return { ok: false, reason: "no pseudomonas def" };
  st._pseudoGermSrc = { def, hp: def.hp, maxHp: def.hp, wobble: 0.55 };
  return { ok: true, radius: def.radius };
});
console.log("Spawn:", spawned);

async function captureScene(name, opts) {
  const info = await page.evaluate(({ shieldOn, signature }) => {
    const g = window.__game;
    const st = g.state;
    const src = st._pseudoGermSrc;
    if (!src) return { ok: false, reason: "no src" };
    const F = g.metrics.FIELD;
    const cx = (F.left + F.right) / 2;
    const cy = (F.top + F.bottom) * 0.52;
    const maxShield = src.def.shield ? src.def.shield.maxHP : 0;
    const e = {
      ...src,
      state: "walking",
      enteringTimer: 0,
      x: cx,
      y: cy,
      progress: 0.35,
      radiusScale: 1.65,
      hp: src.def.hp,
      maxHp: src.maxHp || src.def.hp,
      shieldHP: shieldOn ? maxShield : 0,
      shieldHitTimer: 0,
      shieldShatterTimer: 0,
      hitFlash: 0,
      hurtTimer: 0,
      dying: false,
      dead: false,
      wobble: 0.55,
      _heading: 0.12,
      _lastPosX: cx - 22,
      _lastPosY: cy + 3,
      seekerCd: 99,
    };
    st.enemies = [e];
    st.effects = [];
    st.seekers = [];
    st.towers = [];
    st.time = 3.2;

    if (signature) {
      g.place("nk", 0.64, 0.46);
      const nk = st.towers[0];
      e.sigPunchT = 0.32;
      e.sigX = nk.x;
      e.sigY = nk.y;
      e._heading = Math.atan2(nk.y - e.y, nk.x - e.x);
      const sp = src.def.seekers;
      st.seekers.push({
        x: e.x + 18, y: e.y - 12, vx: 0, vy: 0,
        hp: sp.hp, maxHp: sp.hp, dmg: sp.dmg, speed: sp.speed,
        target: nk, phase: 1.2, life: 12, max: 12,
      });
      st.seekers.push({
        x: e.x - 14, y: e.y + 8, vx: 0, vy: 0,
        hp: sp.hp, maxHp: sp.hp, dmg: sp.dmg, speed: sp.speed,
        target: nk, phase: 2.6, life: 12, max: 12,
      });
    }

    g.hold(true);
    const canvas = document.getElementById("canvas");
    const rect = canvas.getBoundingClientRect();
    const sx = rect.left + (cx / g.metrics.VW) * rect.width;
    const sy = rect.top + (cy / g.metrics.VH) * rect.height;
    return {
      ok: true,
      clip: { x: Math.round(sx - 340), y: Math.round(sy - 240), width: 700, height: 480 },
      sigClip: { x: Math.round(sx - 380), y: Math.round(sy - 260), width: 820, height: 520 },
    };
  }, opts);
  console.log(name + ":", info);
  await sleep(600);
  if (info.ok) {
    const clip = opts.signature ? info.sigClip : info.clip;
    await page.screenshot({ path: join(TMP, name + ".png"), clip });
  }
  return info;
}

await page.mouse.move(16, 16);
const withBio = await captureScene("pseudo_biofilm", { shieldOn: true, signature: false });
const bare = await captureScene("pseudo_bare", { shieldOn: false, signature: false });
const sig = await captureScene("pseudo_signature", { shieldOn: true, signature: true });

await page.evaluate(() => window.__game.hold(false));
await browser.close();

if (!withBio.ok || !bare.ok || !sig.ok) {
  console.error("Showcase failed", { spawned, withBio, bare, sig });
  process.exit(1);
}

copyFileSync(join(TMP, "pseudo_biofilm.png"), join(ART, "pseudomonas_v1_biofilm.png"));
copyFileSync(join(TMP, "pseudo_bare.png"), join(ART, "pseudomonas_v1_bare.png"));
copyFileSync(join(TMP, "pseudo_signature.png"), join(ART, "pseudomonas_v1_signature.png"));
console.log("OK: pseudomonas germ screenshots in", ART);
