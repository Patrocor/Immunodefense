import assert from "node:assert/strict";
import { createStorage, createTestGame } from "./test-bootstrap.mjs";

const storage = createStorage();
const game = createTestGame(storage);

game.__game.state.completedMapNodes = { fase1: true };
game.__game.saveCampaign();

const reloaded = createTestGame(storage);
reloaded.__game.continueCampaign();

assert.equal(reloaded.__game.state.completedMapNodes.fase1, true, "debe restaurar Fase 1 completada");
assert.equal(reloaded.__game.state.showTitle, false, "continuar debe saltar el título");
assert.ok(reloaded.__game.state.bodyMap, "continuar debe abrir el mapa corporal");
assert.equal(reloaded.__game.computeMapState().availableNodes[0], "dissem");

reloaded.__game.launchNext();
assert.equal(reloaded.__game.state.dissemination, true, "desde el mapa debe entrar a Diseminación");

reloaded.__game.state.completedMapNodes.dissem = true;
reloaded.__game.state.unlockedF2 = "osteomielitis";
reloaded.__game.saveCampaign();
reloaded.__game.launchNext();
assert.equal(
  reloaded.__game.state.f2?.cfg?.key,
  "osteomielitis",
  "debe lanzar la rama F2 desbloqueada"
);

const game1 = createTestGame(storage);
game1.__game.unlockAchievement("wave_5");
assert.equal(game1.__game.achievements().count, 1, "unlockAchievement debe contar en la sesión actual");

const game2 = createTestGame(storage);
assert.ok(game2.__game.achievements().unlocked.wave_5, "el logro debe persistir en localStorage");
assert.equal(game2.__game.achievements().count, 1, "el logro persistido debe restaurarse al recargar");

game2.__game.clearCampaign();
assert.equal(storage.getItem("immunodefense_campaign_v1"), null, "clearCampaign debe borrar el save");

console.log("Persistencia OK: campaña, transiciones del mapa y logros");
