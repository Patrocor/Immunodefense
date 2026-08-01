// Build web: junta los fuentes sueltos de la raiz en www/, que es el webDir
// que consume Capacitor. No hay bundler: el juego es un solo game.js.
// Uso: npm run build   (o node scripts/build-web.mjs)
import { cp, rm, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "www");

// Lo que entra al build. Nada mas: playtest.html y scripts/ son de desarrollo.
const ENTRIES = ["index.html", "game.js", "assets"];

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  for (const entry of ENTRIES) {
    const from = join(ROOT, entry);
    await stat(from); // falla fuerte si falta un fuente
    await cp(from, join(OUT, entry), { recursive: true });
  }

  const bytes = (await stat(join(OUT, "game.js"))).size;
  console.log(`www/ listo — ${ENTRIES.join(", ")} (game.js ${(bytes / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error("build-web fallo:", err.message);
  process.exit(1);
});
