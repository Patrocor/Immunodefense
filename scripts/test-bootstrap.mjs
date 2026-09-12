import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { GAME_DATA_FILES } from "./data-manifest.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(new URL("../game.js", import.meta.url), "utf8");

function loadGameDataSync(context) {
  for (const rel of GAME_DATA_FILES) {
    const src = readFileSync(join(ROOT, rel), "utf8");
    vm.runInContext(src, context, { filename: rel });
  }
}

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

export function createTestGame(localStorage = createStorage(), options = {}) {
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
    location: { hash: options.hash || "" },
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
    matchMedia: (query) => ({
      matches: options.reducedMotion === true && String(query).includes("prefers-reduced-motion"),
      addEventListener() {},
    }),
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
  loadGameDataSync(sandbox);
  vm.runInContext(source, sandbox, { filename: "game.js" });
  return sandbox;
}
