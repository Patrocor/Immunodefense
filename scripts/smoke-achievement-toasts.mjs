import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();
assert.ok(game.__game.unlockAchievement("first_kill"), "debe desbloquear logro de prueba");
assert.equal(game.__game.state.achievementToasts[0].life, 4.0, "duración normal del toast");

game.__lerr = null;
game.__game.step(0.1, 0.1);
assert.equal(game.__lerr, null, "render de toast no debe fallar");

const reduced = createTestGame(undefined, { hash: "#reducemotion" });
assert.ok(reduced.__game.unlockAchievement("first_kill"));
assert.equal(reduced.__game.state.achievementToasts[0].life, 3.0, "toast más corto en reduced-motion");

reduced.__lerr = null;
reduced.__game.step(0.1, 0.1);
assert.equal(reduced.__lerr, null, "render reduced-motion del toast no debe fallar");

console.log("Smoke OK: toasts de logros en reduced-motion");
