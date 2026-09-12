import { test, expect } from "@playwright/test";

function isIgnorableConsoleError(text) {
  return (
    text.includes("favicon") ||
    text.includes("apple-mobile-web-app-capable") ||
    text.includes("Deprecated feature")
  );
}

test("carga el juego y expone el hook de desarrollo", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !isIgnorableConsoleError(msg.text())) {
      errors.push(msg.text());
    }
  });

  await page.goto("/");
  await expect(page.locator("#canvas")).toBeVisible();
  await page.waitForFunction(() => window.__game?.state);

  const boot = await page.evaluate(() => ({
    title: window.__game.state.showTitle,
    achievements: window.__game.achievements().total,
  }));

  expect(boot.title).toBe(true);
  expect(boot.achievements).toBe(10);
  expect(errors).toEqual([]);
});

test("sirve favicon y assets principales", async ({ page, request }) => {
  const favicon = await request.get("/favicon.svg");
  expect(favicon.ok()).toBeTruthy();

  await page.goto("/");
  await page.waitForFunction(() => window.__game?.state);

  const assetStatus = await page.evaluate(async () => {
    const paths = [
      "assets/intro/intro1.webp",
      "assets/fase1/bg-skin-field.webp",
      "assets/fase1/germs/saureus.webp",
    ];
    const results = await Promise.all(
      paths.map(async (path) => {
        const res = await fetch(path, { method: "HEAD" });
        return { path, ok: res.ok };
      })
    );
    return results;
  });

  for (const asset of assetStatus) {
    expect(asset.ok, asset.path).toBeTruthy();
  }
});

test("redimensiona el canvas en distintos viewports", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.state);
  await page.waitForTimeout(150);

  const portrait = await page.evaluate(() => ({
    w: window.__game.metrics.VW,
    h: window.__game.metrics.VH,
    portrait: window.__game.metrics.isPortrait,
  }));
  expect(portrait.w).toBeGreaterThan(0);
  expect(portrait.h).toBeGreaterThan(portrait.w);
  expect(portrait.portrait).toBe(true);

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150);

  const landscape = await page.evaluate(() => ({
    w: window.__game.metrics.VW,
    h: window.__game.metrics.VH,
    portrait: window.__game.metrics.isPortrait,
  }));
  expect(landscape.w).toBeGreaterThan(landscape.h);
  expect(landscape.portrait).toBe(false);
});

test("abre el mapa de campaña desde el hash de depuración", async ({ page }) => {
  await page.goto("/#bodymap=dissem");
  await page.waitForFunction(() => window.__game?.state?.bodyMap);

  const mapInfo = await page.evaluate(() => ({
    title: window.__game.state.bodyMap.title,
    forkOpen: window.__game.state.bodyMap.forkOpen,
    unlockedF2: window.__game.state.unlockedF2,
  }));

  expect(mapInfo.title).toContain("DISEMINACIÓN");
  expect(mapInfo.forkOpen).toBe(true);
});

test("entra a Diseminación con el hook de pruebas", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.goDissemination);

  await page.evaluate(() => {
    window.__game.goDissemination();
    window.__game.step(0.1, 0.05);
  });

  const phase = await page.evaluate(() => ({
    dissemination: window.__game.state.dissemination,
    waveTable: window.__game.testData().disseminationWaveTable.length,
  }));

  expect(phase.dissemination).toBe(true);
  expect(phase.waveTable).toBe(12);
});
