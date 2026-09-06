import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../game.js", import.meta.url), "utf8");

function makeGradient() {
  return { addColorStop() {} };
}

function makeContext2D() {
  const values = {
    globalAlpha: 1,
    lineWidth: 1,
    shadowBlur: 0,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
  };

  return new Proxy(values, {
    get(target, property) {
      if (property in target) return target[property];
      if (property === "measureText") {
        return (text) => ({
          width: String(text).length * 7,
          actualBoundingBoxAscent: 8,
          actualBoundingBoxDescent: 2,
        });
      }
      if (property === "createLinearGradient" || property === "createRadialGradient") {
        return makeGradient;
      }
      if (property === "createPattern") return () => null;
      if (property === "isPointInPath" || property === "isPointInStroke") return () => false;
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

const context2d = makeContext2D();
const canvas = {
  width: 1280,
  height: 720,
  style: {},
  getContext: () => context2d,
  getBoundingClientRect: () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1280,
    bottom: 720,
    width: 1280,
    height: 720,
  }),
  addEventListener() {},
  setPointerCapture() {},
  releasePointerCapture() {},
};

const storage = new Map();
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

class FakeImage {
  constructor() {
    this.width = 1024;
    this.height = 1024;
    this.naturalWidth = 1024;
    this.naturalHeight = 1024;
    this.complete = false;
  }
}

const sandbox = {
  console,
  Math,
  Date,
  JSON,
  Map,
  Set,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  parseFloat,
  parseInt,
  isFinite,
  localStorage,
  Image: FakeImage,
  navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
  location: { hash: "" },
  performance: { now: () => 0 },
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  getComputedStyle: () => ({
    paddingTop: "0",
    paddingRight: "0",
    paddingBottom: "0",
    paddingLeft: "0",
  }),
  requestAnimationFrame() {},
  cancelAnimationFrame() {},
  setInterval: () => 0,
  clearInterval() {},
  setTimeout: (callback) => {
    callback();
    return 0;
  },
  clearTimeout() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
};

sandbox.window = sandbox;
sandbox.document = {
  getElementById: (id) => (id === "canvas" ? canvas : {}),
  createElement: (tag) => (tag === "canvas" ? { ...canvas } : {}),
  addEventListener() {},
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "game.js" });

assert.ok(sandbox.__game, "game.js debe exponer window.__game");
assert.equal(sandbox.__game.state.showTitle, true, "el juego debe iniciar en el título");
assert.equal(sandbox.__game.achievements().total, 10, "el catálogo de logros debe cargar");

const levels = [
  "endocarditis",
  "osteomielitis",
  "artritis",
  "f3_pulm",
  "f3_cereb",
  "f3_bazo",
  "f3_epid",
  "f3_bact",
  "f3_fasc",
  "f3_multi",
  "f3_osloc",
  "f3_pust",
  "sepsis",
  "mods",
];

for (const key of levels) {
  sandbox.__lerr = null;
  sandbox.__game.goF2(key);
  assert.equal(sandbox.__game.state.f2?.cfg?.key, key, `debe entrar al nivel ${key}`);
  sandbox.__game.step(0.05, 0.05);
  assert.equal(sandbox.__lerr, null, `el primer frame de ${key} no debe fallar`);
}

console.log(`Smoke OK: título, logros y ${levels.length} niveles cargados`);
