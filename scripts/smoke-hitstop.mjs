import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();
game.__game.goDissemination();
game.__game.state.hitstop = 0;

const hs = game.__game.testTriggerHitstop(0.06);
assert.ok(hs >= 0.06, "hitstop de ultimate debe aplicarse");

game.__game.testTriggerHitstop(0.04);
assert.equal(game.__game.hitstop(), 0.06, "hitstop no debe degradarse con duración menor");

const reduced = createTestGame(undefined, { hash: "#reducemotion" });
reduced.__game.goDissemination();
reduced.__game.state.hitstop = 0;
const reducedHs = reduced.__game.testTriggerHitstop(0.06);
assert.ok(reducedHs > 0 && reducedHs < 0.06, "reduced-motion acorta hitstop (~35%)");

console.log("Smoke OK: hitstop en ultimates y barrera");
