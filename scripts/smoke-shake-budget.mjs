import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();
game.__game.goDissemination();
game.__game.state.time = 10;

game.__game.testTriggerShake(0.08, 2, 0);
const firstMinor = game.__game.shake();
assert.ok(firstMinor.timer > 0, "primer shake leve debe aplicarse");

for (let i = 0; i < 8; i++) {
  game.__game.testTriggerShake(0.08, 2, 0);
}
const spamMinor = game.__game.shake();
assert.equal(spamMinor.priority, 0, "spamear shakes leves mantiene prioridad 0");
assert.ok(spamMinor.timer <= firstMinor.timer + 0.01, "cooldown debe limitar intensidad de spam leve");

game.__game.testTriggerShake(0.5, 9, 2);
const critical = game.__game.shake();
assert.equal(critical.priority, 2, "shake crítico debe elevar prioridad");
assert.ok(critical.mag >= 8, "shake crítico debe conservar magnitud alta");

game.__game.testTriggerShake(0.06, 2, 0);
const blocked = game.__game.shake();
assert.equal(blocked.priority, 2, "shake leve no debe degradar uno crítico activo");
assert.ok(blocked.mag >= 8, "magnitud crítica se conserva bajo spam leve");

const reduced = createTestGame(undefined, { hash: "#reducemotion" });
reduced.__game.goDissemination();
reduced.__game.state.time = 1;
reduced.__game.testTriggerShake(0.12, 4, 1);
assert.equal(reduced.__game.shake().timer, 0, "movimiento reducido bloquea shakes normales");
reduced.__game.testTriggerShake(0.5, 9, 2);
const reducedCritical = reduced.__game.shake();
assert.ok(reducedCritical.timer > 0, "movimiento reducido permite shakes críticos");
assert.ok(reducedCritical.mag > 0, "shake crítico conserva magnitud reducida");

console.log("Smoke OK: presupuesto de shake con prioridades");
