import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame(undefined, { hash: "#hifx" });
const kit = game.ImmunoDefenseData.organIdentity.endocarditis;
assert.ok(kit, "debe existir el kit de endocarditis");
assert.equal(kit.entry, "auricula", "entrada auricular, no grieta de piel");
assert.equal(kit.focus, "velo", "focos de velo/comisura/cuerda");
assert.ok(kit.path && kit.path.lumen, "carril con paleta de sangre");
assert.equal(kit.labelKit, "Válvula+Pulso");

const g = game.__game;
assert.ok(g.organIdentity("endocarditis"), "__game.organIdentity lee el kit");
assert.equal(g.organIdentity("osteomielitis"), null, "otros órganos aún no tienen kit");

g.goF2("endocarditis");
assert.equal(g.state.f2.cfg.key, "endocarditis");
assert.ok(g.organIdentity(), "el nivel activo expone el kit");
g.state.f2.introTimer = 0;
g.state.f2.pulseT = 0.10;
g.step(0.05, 0.05);
assert.equal(g.f2Markers().length, 5, "cinco ostia/focos de la mitral");
assert.equal(game.__lerr, null, "render de endocarditis con kit no debe fallar");
assert.equal(g.state.f2.inSystole, true, "pulseT bajo debe estar en sístole");

g.goF2("osteomielitis");
g.state.f2.introTimer = 0;
g.step(0.05, 0.05);
assert.equal(game.__lerr, null, "osteomielitis sin kit no debe fallar");
assert.equal(g.organIdentity(), null, "osteomielitis sigue sin kit");

g.goF2("artritis");
g.state.f2.introTimer = 0;
g.step(0.05, 0.05);
assert.equal(game.__lerr, null, "artritis sin kit no debe fallar");

console.log("Smoke OK: identidad endocarditis");
