import assert from "node:assert/strict";
import { createTestGame } from "./test-bootstrap.mjs";

const game = createTestGame();

game.__game.goDissemination();
assert.equal(game.__game.state.dissemination, true, "goDissemination debe activar el puente");
game.__game.step(0.05, 0.05);
assert.equal(game.__lerr, null, "Diseminación debe renderizar sin error");

const transitions = [
  {
    setup(st) {
      st.completedMapNodes = { fase1: true };
      st.unlockedF2 = null;
      st.activeF3 = null;
    },
    next: "dissem",
    assert(st) {
      assert.equal(st.dissemination, true);
    },
  },
  {
    setup(st) {
      st.completedMapNodes = { fase1: true, dissem: true };
      st.unlockedF2 = "artritis";
      st.activeF3 = null;
    },
    next: "artritis",
    assert(st) {
      assert.equal(st.f2?.cfg?.key, "artritis");
    },
  },
  {
    setup(st) {
      st.completedMapNodes = { fase1: true, dissem: true, artritis: true };
      st.unlockedF2 = "artritis";
      st.activeF3 = "f3_multi";
    },
    next: "f3_multi",
    assert(st) {
      assert.equal(st.f2?.cfg?.key, "f3_multi");
    },
  },
  {
    setup(st) {
      st.completedMapNodes = {
        fase1: true,
        dissem: true,
        artritis: true,
        f3_multi: true,
      };
      st.unlockedF2 = "artritis";
      st.activeF3 = "f3_multi";
    },
    next: "sepsis",
    assert(st) {
      assert.equal(st.f2?.cfg?.key, "sepsis");
    },
  },
  {
    setup(st) {
      st.completedMapNodes = {
        fase1: true,
        dissem: true,
        artritis: true,
        f3_multi: true,
        sepsis: true,
      };
      st.unlockedF2 = "artritis";
      st.activeF3 = "f3_multi";
    },
    next: "mods",
    assert(st) {
      assert.equal(st.f2?.cfg?.key, "mods");
    },
  },
];

for (const step of transitions) {
  const sandbox = createTestGame();
  step.setup(sandbox.__game.state);
  assert.equal(
    sandbox.__game.computeMapState().availableNodes[0],
    step.next,
    `siguiente nodo esperado: ${step.next}`
  );
  sandbox.__game.launchNext();
  step.assert(sandbox.__game.state);
  sandbox.__game.step(0.05, 0.05);
  assert.equal(sandbox.__lerr, null, `render tras ${step.next} no debe fallar`);
}

console.log("Progresión OK: Diseminación, F2, F3, Sepsis y MODS");
