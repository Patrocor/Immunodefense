import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

function fillDock(g) {
  g.state.showTitle = false;
  g.state.showIntro = false;
  g.state.loadout = {
    towers: ["neutrofilo", "nk", "eosinofilo", "queratinocito", "mastocito"],
    tanks: ["complemento"],
    barriers: []
  };
  g.state.unlockedTowers = [
    "neutrofilo", "nk", "eosinofilo", "queratinocito", "mastocito", "complemento"
  ];
  g.state.openGroups = { defensas: true, potenciadores: true, tanques: true };
  g.relayout();
}

function dockWidth(g) {
  const m = g.metrics;
  return m.VW - m.FIELD.right;
}

function assertDock(label, w, h, portrait) {
  const game = createTestGame(undefined, { width: w, height: h });
  const g = game.__game;
  fillDock(g);
  const m = g.metrics;
  assert.equal(m.isPortrait, portrait, label + " portrait");
  const dw = dockWidth(g);
  assert.ok(dw >= 88, label + " dock >= 88px, got " + dw);
  assert.ok(dw <= 140, label + " dock <= 140px, got " + dw);
  const cards = g.ui.cards || [];
  assert.ok(cards.length >= 5, label + " muestra cartas del loadout (" + cards.length + ")");
  for (var i = 0; i < cards.length; i++) {
    const c = cards[i];
    assert.ok(c.w >= 70, label + " carta ancha");
    assert.ok(c.h >= 76, label + " carta alta para ícono+texto");
    assert.ok(c.h <= c.w * 1.45, label + " carta no se estira de más");
    const iconR = Math.min(c.h * 0.56 * 0.44, c.w * 0.40);
    assert.ok(iconR * 2 < c.w - 6, label + " preview cabe en la carta");
  }
  assert.ok(g.ui.dockType && g.ui.dockType.name >= 10, label + " tipo de nombre");
  assert.ok(g.ui.compendiumBtn.w === cards[0].w, label + " Dex al ancho de carta");
  assert.ok(g.ui.dockMeterH >= 28 && g.ui.dockMeterH <= 40, label + " medidores al ancho");
  game.__lerr = null;
  g.state.selectedToBuild = "neutrofilo";
  g.relayout();
  g.step(0.15, 0.05);
  assert.equal(game.__lerr, null, label + " render con info no falla");
}

assertDock("landscape", 1280, 720, false);
assertDock("portrait", 390, 844, true);
assertDock("phone-land", 844, 390, false);

console.log("Smoke OK: dock responsive");
