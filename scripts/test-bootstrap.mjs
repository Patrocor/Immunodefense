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

export function createStorage() {
  const storage = new Map();
  return {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };
}

class FakeImage {
  constructor() {
    this.width = 1024;
    this.height = 1024;
    this.naturalWidth = 1024;
    this.naturalHeight = 1024;
    this.complete = false;
  }
}

export function createTestGame(localStorage = createStorage()) {
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
    __lerr: null,
  };

  sandbox.window = sandbox;
  sandbox.document = {
    getElementById: (id) => (id === "canvas" ? canvas : {}),
    createElement: (tag) => (tag === "canvas" ? { ...canvas } : {}),
    addEventListener() {},
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "game.js" });
  return sandbox;
}
