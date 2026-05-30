# Refinamiento Fase Diseminación — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la fase Diseminación en un nivel con identidad mecánica propia: barrera con HP por órgano (con textura biológica), sistema económico de Antígenos que sueltan los gérmenes muertos, panel de 3 respuestas inmunes (Dendrítica, NETosis, Plaquetas), y fix de transición cinemática.

**Architecture:** Todo dentro de `index.html` (single-file Canvas 2D game). Sin tests automatizados — validación visual vía deploys a Vercel después de cada task (URL estable: `https://immunodefense.vercel.app`). Mantiene patrón existente: state global en closure, render por frame, sin frameworks.

**Tech Stack:** Vanilla JS, Canvas 2D, OffscreenCanvas con fallback a `document.createElement('canvas')`. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-05-29-puente-obstaculo-organo-design.md`

**Convenciones del plan:**
- Cada `task` termina con commit + deploy + verificación visual.
- Los **números de línea** son del estado actual del archivo y van a desplazarse según se inserta código. Usa la línea como ancla aproximada y orientate con el grep del contexto que se incluye.
- `Shift+B` salta directo al puente para validar (cheat DEV en `index.html:5395`).
- Cualquier código nuevo se inserta **cerca de funciones afines** (no al final del archivo) para mantener la organización por dominio.

---

## Task 0: Hook de debug para validación (commit aislado)

**Por qué primero:** las verificaciones de tareas 2-5 necesitan mutar `state` desde DevTools en la URL de Vercel. Exponer `window.__game` una vez ahorra fricción en cada validación.

**Files:** Modify `index.html:1435` (justo después de `state = newState();`)

- [ ] **Step 1: Localiza el sitio del state init**

```bash
grep -n "state = newState();" index.html
```

Resultado esperado: línea ~1435 con `  state = newState();`

- [ ] **Step 2: Inserta el hook expuesto**

Edita justo después de `state.vistos = loadVistos();` (línea ~1436):

```js
  state = newState();
  state.vistos = loadVistos();
  // Dev hook: permite inspeccionar y mutar state desde DevTools en producción.
  // Es inofensivo — el código del juego ya es público (GitHub Pages + Vercel).
  window.__game = { get state() { return state; } };
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "dev: expose window.__game.state for in-browser validation"
```

- [ ] **Step 4: Deploy a producción**

```bash
git push origin main
vercel deploy --prod -y --no-wait
```

- [ ] **Step 5: Verificar**

Abrir `https://immunodefense.vercel.app`, abrir DevTools console, ejecutar:

```js
window.__game.state.atp
```

Esperado: un número. Si retorna `undefined`, revisar que el `state` está al alcance del closure en el `=>` getter (debería estar — la línea va dentro del mismo IIFE).

---

## Task 1: Transición cinemática (rajadura antes de carriles)

**Por qué:** feedback #1 del usuario. Hoy se ven los 5 carriles 0.5s antes de la rajadura. Hay que invertir la curva de `bgAlpha` para arrancar opaco y revelar al final.

**Files:** Modify `index.html:10423-10500` (función `drawDisseminationIntro`)

- [ ] **Step 1: Releer la función actual para contexto**

```bash
sed -n '10423,10500p' index.html
```

Confirma que ves la curva `bgAlpha` actual: fade-in 0→0.88 en 0.5s, hold, fade-out al final.

- [ ] **Step 2: Reemplazar la curva de bgAlpha**

Edita el bloque (líneas ~10430-10435):

```js
    var bgAlpha;
    if (elapsed < 0.5) bgAlpha = (elapsed / 0.5) * 0.88;
    else if (elapsed < 2.9) bgAlpha = 0.88;
    else bgAlpha = Math.max(0, 0.88 * (1 - (elapsed - 2.9) / 1.1));
```

Por:

```js
    // V2: empezamos opacos para que la rajadura se vea ANTES que los carriles.
    // Hold-on al inicio (sin fade-in), fade-out al final que revela el campo.
    var bgAlpha;
    if (elapsed < 0.4) bgAlpha = 1.0;
    else if (elapsed < 2.6) bgAlpha = 0.95;
    else if (elapsed < 3.6) bgAlpha = Math.max(0, 0.95 * (1 - (elapsed - 2.6) / 1.0));
    else bgAlpha = 0;
```

- [ ] **Step 3: Ajustar timing de la rajadura y del texto para que casen con la nueva ventana**

Las rajaduras hoy aparecen entre 0.8s y 2.6s (`if (elapsed > 0.8 && elapsed < 2.6)`). El texto hoy aparece a partir de 1.0s con hold hasta 3.0s y fade hasta 4.0s.

Cambia el bloque de rajaduras (~línea 10448) para que empiecen un poquito antes:

```js
    if (elapsed > 0.4 && elapsed < 2.6) {
      var crackProgress = Math.min(1, (elapsed - 0.4) / 0.8);
      var crackFade = elapsed > 2.0 ? Math.max(0, 1 - (elapsed - 2.0) / 0.6) : 1;
```

Y el bloque de texto (~línea 10473) — el slide-in debe terminar antes del fade-out del velo:

```js
    if (elapsed > 0.6) {
      var textAlpha;
      if (elapsed < 1.2) textAlpha = (elapsed - 0.6) / 0.6;
      else if (elapsed < 2.4) textAlpha = 1;
      else textAlpha = Math.max(0, 1 - (elapsed - 2.4) / 0.4);
      ctx.globalAlpha = textAlpha;
      // Título grande con slide-in vertical.
      var slideOff = Math.max(0, (1.2 - elapsed) * 30 * U);
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
fix(diseminación): invertir transición — rajadura aparece antes que carriles

El velo arranca opaco mostrando la rajadura + texto, y solo al final
hace fade-out que revela los 5 carriles. Antes el jugador veía el
campo medio segundo antes que el contexto cinemático.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Deploy + verificar**

```bash
git push origin main
vercel deploy --prod -y --no-wait
```

Verificación manual en `immunodefense.vercel.app`:
1. Abrir el juego. Saltarse intro (clicks).
2. Presionar `Shift+B`.
3. **Confirmar**: la pantalla queda negra → aparece la rajadura + texto "LA BARRERA CAYÓ" → recién al final se revelan los 5 carriles con fade.
4. **NO debe verse** ningún destello de los carriles al inicio de la cinemática.

---

## Task 2: Patterns biológicos por órgano (foundation)

**Por qué:** Tasks 3 y 4 dependen de poder pintar texturas por órgano. Esto es la infraestructura: 5 patterns cacheados generados en `OffscreenCanvas`.

**Files:** Modify `index.html` — insertar bloque nuevo justo antes de `// ============ NIVEL PUENTE: DISEMINACIÓN ============` (línea ~1204).

- [ ] **Step 1: Localizar el sitio de inserción**

```bash
grep -n "NIVEL PUENTE: DISEMINACIÓN" index.html
```

Insertar el bloque inmediatamente antes de ese comentario.

- [ ] **Step 2: Añadir constantes y función `getOrganPattern`**

```js
  // ============ PATTERNS BIOLÓGICOS POR ÓRGANO ============
  // Cacheados en OffscreenCanvas para reutilizar en barrera + puerta.
  // Generados lazy la primera vez que se piden.
  var ORGAN_PATTERN_CACHE = {};
  var TISSUE_LABEL = {
    corazon:      "pericardio",
    pulmon:       "pleura",
    sangre:       "endotelio vascular",
    hueso:        "periostio",
    articulacion: "cápsula sinovial"
  };

  function createPatternCanvas(w, h) {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  function paintCorazonPattern(pctx) {
    // Miocardio: fondo rojo oscuro + líneas paralelas claras (fibras estriadas).
    pctx.fillStyle = "#7a2543"; pctx.fillRect(0, 0, 64, 64);
    pctx.strokeStyle = "rgba(255,180,170,0.30)"; pctx.lineWidth = 0.8;
    pctx.save();
    pctx.rotate(0.35); // ~20° en radianes
    for (var y = -10; y < 80; y += 4) {
      pctx.beginPath(); pctx.moveTo(-10, y); pctx.lineTo(80, y); pctx.stroke();
    }
    pctx.restore();
  }

  function paintPulmonPattern(pctx) {
    // Alvéolos: rosado oscuro + burbujas claras dispersas.
    pctx.fillStyle = "#a36272"; pctx.fillRect(0, 0, 64, 64);
    pctx.fillStyle = "rgba(255,210,220,0.50)";
    var spots = [[8,8,4],[26,18,5],[44,10,3.5],[58,28,4],[14,32,3],[36,40,5],[52,50,4],[10,54,3.5],[26,56,3],[42,58,4]];
    for (var i = 0; i < spots.length; i++) {
      pctx.beginPath(); pctx.arc(spots[i][0], spots[i][1], spots[i][2], 0, Math.PI*2); pctx.fill();
    }
  }

  function paintSangrePattern(pctx) {
    // Eritrocitos bicóncavos.
    pctx.fillStyle = "#7a1a1f"; pctx.fillRect(0, 0, 64, 64);
    var cells = [[10,10],[34,8],[52,18],[18,28],[42,32],[58,42],[12,46],[32,50],[50,58]];
    for (var i = 0; i < cells.length; i++) {
      var cx = cells[i][0], cy = cells[i][1];
      pctx.fillStyle = "#c02a30";
      pctx.beginPath(); pctx.ellipse(cx, cy, 4, 3, 0, 0, Math.PI*2); pctx.fill();
      pctx.fillStyle = "#5a0d10";
      pctx.beginPath(); pctx.ellipse(cx, cy, 1.6, 1.2, 0, 0, Math.PI*2); pctx.fill();
    }
  }

  function paintHuesoPattern(pctx) {
    // Trabéculas: marrón claro + red de líneas blancas.
    pctx.fillStyle = "#8a7548"; pctx.fillRect(0, 0, 64, 64);
    pctx.strokeStyle = "rgba(245,230,180,0.55)"; pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.moveTo(0, 0); pctx.lineTo(64, 64);
    pctx.moveTo(64, 0); pctx.lineTo(0, 64);
    pctx.moveTo(32, 0); pctx.lineTo(32, 64);
    pctx.moveTo(0, 32); pctx.lineTo(64, 32);
    pctx.stroke();
    pctx.fillStyle = "rgba(20,10,4,0.5)";
    pctx.beginPath(); pctx.arc(32, 32, 1.8, 0, Math.PI*2); pctx.fill();
  }

  function paintArticulacionPattern(pctx) {
    // Cartílago hialino: azul-verde liso con líneas onduladas finas.
    pctx.fillStyle = "#4c7f8a"; pctx.fillRect(0, 0, 64, 64);
    pctx.strokeStyle = "rgba(220,240,250,0.30)"; pctx.lineWidth = 1;
    for (var y = 4; y < 64; y += 16) {
      pctx.beginPath();
      pctx.moveTo(0, y);
      for (var x = 4; x <= 64; x += 8) {
        pctx.quadraticCurveTo(x - 4, y - 4, x, y);
      }
      pctx.stroke();
    }
  }

  function getOrganPattern(organId) {
    if (ORGAN_PATTERN_CACHE[organId]) return ORGAN_PATTERN_CACHE[organId];
    var canvas = createPatternCanvas(64, 64);
    var pctx = canvas.getContext("2d");
    switch (organId) {
      case "corazon":      paintCorazonPattern(pctx);      break;
      case "pulmon":       paintPulmonPattern(pctx);       break;
      case "sangre":       paintSangrePattern(pctx);       break;
      case "hueso":        paintHuesoPattern(pctx);        break;
      case "articulacion": paintArticulacionPattern(pctx); break;
      default: pctx.fillStyle = "#444"; pctx.fillRect(0, 0, 64, 64);
    }
    var pat = ctx.createPattern(canvas, "repeat");
    ORGAN_PATTERN_CACHE[organId] = pat;
    return pat;
  }

  function organIdSeed(id) {
    var s = 0;
    for (var i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(s);
  }
  // ============ FIN PATTERNS BIOLÓGICOS ============
```

- [ ] **Step 3: Smoke test rápido (no commit)**

En DevTools, después de deploy provisional o local, ejecutar:

```js
window.__game; // confirma que sigue funcionando
// Forzar generación del pattern (todavía no se usa en el render):
window.__game.state; // no triggea el pattern aún, OK
```

No hay verificación visual aún — los patterns no se renderizan. Confirma solo que la app no crashea.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): infraestructura de patterns biológicos por órgano

Añade getOrganPattern() con 5 texturas (miocardio, alvéolos,
eritrocitos, trabéculas, cartílago) cacheadas en OffscreenCanvas
con fallback. Sin uso aún — la próxima tarea las consume en la
barrera y la puerta.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Deploy + smoke test**

```bash
git push origin main
vercel deploy --prod -y --no-wait
```

Verificar que `https://immunodefense.vercel.app` carga sin errores en consola.

---

## Task 3: Barrera mecánica con HP + render visual

**Files:** Modify `index.html` en varios sitios:
- `newState()` para añadir estado nuevo
- `enterDissemination()` para inicializar HP por órgano
- `startNextDisseminationWave()` para regenerar HP entre olas
- Bloque de absorción en `updateEnemies` (línea ~2234) para nueva lógica
- `drawDisseminationField` (línea ~10325) para llamar al draw nuevo
- Añadir `drawOrganBarrier()` cerca de `drawOrganDoor` (línea ~10367)

- [ ] **Step 1: Extender `newState()` con el estado de barreras**

Localizar `newState()`:
```bash
grep -n "function newState" index.html
```

Dentro del literal que retorna, añadir (cerca de `disseminationOrganLoad`):

```js
      disseminationBarrierHP:     [0, 0, 0, 0, 0],
      disseminationBarrierMax:    [0, 0, 0, 0, 0],
      disseminationBarrierBroken: [false, false, false, false, false],
      disseminationBarrierBreakAt: 0,
      disseminationBarrierBreakLane: -1,
```

- [ ] **Step 2: Inicializar HP en `enterDissemination()`**

Localizar:
```bash
grep -n "function enterDissemination" index.html
```

Justo después de `state.disseminationFlash = [0, 0, 0, 0, 0];` (línea ~1613), insertar:

```js
    // HP biológico por órgano (orden = DISSEMINATION_ORGANS):
    // [corazón=pericardio, pulmón=pleura, sangre=endotelio, hueso=periostio, articulación=cápsula sinovial]
    state.disseminationBarrierMax    = [12, 8, 6, 10, 7];
    state.disseminationBarrierHP     = [12, 8, 6, 10, 7];
    state.disseminationBarrierBroken = [false, false, false, false, false];
    state.disseminationBarrierBreakAt = 0;
    state.disseminationBarrierBreakLane = -1;
```

- [ ] **Step 3: Regeneración +1 HP por wave**

Localizar `startNextDisseminationWave`:
```bash
grep -n "function startNextDisseminationWave" index.html
```

Justo después de `var idx = state.disseminationWaveIdx++;` (línea ~1681), insertar:

```js
    // Regenerar +1 HP en barreras NO rotas antes de empezar la oleada.
    if (state.disseminationBarrierHP) {
      for (var brI = 0; brI < state.disseminationBarrierHP.length; brI++) {
        if (!state.disseminationBarrierBroken[brI]) {
          state.disseminationBarrierHP[brI] = Math.min(
            state.disseminationBarrierMax[brI],
            state.disseminationBarrierHP[brI] + 1
          );
        }
      }
    }
```

- [ ] **Step 4: Reemplazar la lógica de absorción del germen**

Localizar el bloque que hoy suma al `disseminationOrganLoad`:
```bash
grep -n "state.disseminationOrganLoad\[hi\]" index.html
```

Línea ~2240. Reemplazar TODO el bloque desde `if (state.dissemination)` hasta el `continue;` (líneas ~2238-2259) por:

```js
        if (state.dissemination) {
          if (!state.disseminationOrganLoad) state.disseminationOrganLoad = [0, 0, 0, 0, 0];
          if (!state.disseminationBarrierHP) state.disseminationBarrierHP = [0,0,0,0,0];
          if (!state.disseminationBarrierBroken) state.disseminationBarrierBroken = [false,false,false,false,false];
          var lane = hi;
          var organ = (PATH.organDoors && PATH.organDoors[lane])
            ? PATH.organDoors[lane].organ
            : DISSEMINATION_ORGANS[lane] || DISSEMINATION_ORGANS[0];
          if (!state.disseminationFlash) state.disseminationFlash = [0,0,0,0,0];

          if (!state.disseminationBarrierBroken[lane] && state.disseminationBarrierHP[lane] > 0) {
            // El germen es absorbido por la barrera: muere, barrera -1 HP.
            state.disseminationBarrierHP[lane] -= 1;
            state.disseminationFlash[lane] = 0.6;
            triggerShake(0.08, 2);
            spawnEffect("escape", e.x, e.y, organ.color);
            // TODO Task 5: spawnAntigenDrop(e.x, e.y) — aún no existe.
            // ¿La barrera acaba de romperse?
            if (state.disseminationBarrierHP[lane] <= 0) {
              state.disseminationBarrierBroken[lane] = true;
              state.disseminationBarrierBreakAt = state.time;
              state.disseminationBarrierBreakLane = lane;
              triggerShake(0.35, 6);
              sfx("playerHurt");
            }
            e.dead = true;
            continue;
          }

          // Barrera rota: comportamiento original (suma al organ load).
          state.disseminationOrganLoad[lane] = (state.disseminationOrganLoad[lane] || 0) + 1;
          spawnEffect("escape", e.x, e.y, organ.color);
          state.disseminationFlash[lane] = 0.6;
          triggerShake(0.12, 3);
          if (audio && audio.ctx) sfx("playerHurt");
          if (state.disseminationOrganLoad[lane] >= 10 && !state.disseminationOver) {
            state.disseminationOver = { germ: e.def, organ: organ, t: 0 };
            triggerShake(0.5, 9);
            state.waveActive = false;
            state.pendingSpawns = [];
          }
          e.dead = true;
          continue;
        }
```

- [ ] **Step 5: Añadir `drawOrganBarrier` cerca de `drawOrganDoor`**

Localizar:
```bash
grep -n "function drawOrganDoor" index.html
```

Justo ANTES de `drawOrganDoor` (línea ~10367), insertar:

```js
  function drawOrganBarrier(x, yDoor, organ, hp, hpMax, broken, flash) {
    hp = hp || 0; hpMax = hpMax || 1; flash = flash || 0;
    var r = 22 * U;
    var yMem = yDoor - r * 1.3;
    var laneW = (FIELD_W / 5);
    var w = laneW * 0.75;
    var h = 8 * U;
    var ratio = hp / hpMax;

    ctx.save();
    if (broken) {
      // Barrera completamente rota: franja oscura con bordes rojos rotos.
      ctx.fillStyle = "rgba(20, 10, 14, 0.85)";
      ctx.fillRect(x - w/2, yMem - h/2, w, h);
      ctx.strokeStyle = "rgba(255, 60, 60, 0.85)";
      ctx.lineWidth = 2 * U;
      ctx.setLineDash([4 * U, 3 * U]);
      ctx.beginPath();
      ctx.moveTo(x - w/2, yMem - h/2); ctx.lineTo(x + w/2, yMem - h/2);
      ctx.moveTo(x - w/2, yMem + h/2); ctx.lineTo(x + w/2, yMem + h/2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    // 1. Banda con pattern del órgano.
    var pat = getOrganPattern(organ.id);
    ctx.fillStyle = pat || colorAlpha(organ.color, 0.4);
    ctx.fillRect(x - w/2, yMem - h/2, w, h);

    // 2. Bordes superior/inferior.
    ctx.strokeStyle = organ.color;
    ctx.lineWidth = 2 * U;
    ctx.beginPath();
    ctx.moveTo(x - w/2, yMem - h/2); ctx.lineTo(x + w/2, yMem - h/2);
    ctx.moveTo(x - w/2, yMem + h/2); ctx.lineTo(x + w/2, yMem + h/2);
    ctx.stroke();

    // 3. Etiqueta histológica.
    ctx.fillStyle = colorAlpha(organ.color, 0.6);
    ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(TISSUE_LABEL[organ.id] || "", x, yMem + h/2 + 2 * U);

    // 4. Inflamación si ratio < 0.7
    if (ratio < 0.7) {
      var inflam = Math.min(0.30, (0.7 - ratio) * 0.5);
      ctx.fillStyle = "rgba(255, 90, 90, " + inflam + ")";
      ctx.fillRect(x - w/2 - 2, yMem - h/2 - 2, w + 4, h + 4);
    }

    // 5. Agujeros si ratio < 0.4 (1 a 3 deterministas por organId)
    if (ratio < 0.4) {
      var holes = Math.max(1, Math.min(3, Math.floor((0.4 - ratio) * 10)));
      var seed = organIdSeed(organ.id);
      for (var hi = 0; hi < holes; hi++) {
        var hx = x - w/2 + ((seed * (hi + 1) * 17) % 1000) / 1000 * w;
        ctx.fillStyle = "rgba(20, 10, 14, 0.92)";
        ctx.beginPath();
        ctx.ellipse(hx, yMem, 3 * U, 2.5 * U, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Flash + rasgadura si flash > 0
    if (flash > 0) {
      ctx.strokeStyle = "rgba(255, 200, 200, " + (flash * 0.65) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, yMem, r * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, yMem, r * 1.4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(20, 10, 14, " + flash + ")";
      ctx.beginPath();
      ctx.ellipse(x, yMem, 4 * U, 3 * U, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Barra de HP debajo del label
    var hpBarY = yMem + h/2 + 14 * U;
    var hpBarW = w * 0.7;
    ctx.fillStyle = "rgba(20, 10, 14, 0.85)";
    ctx.fillRect(x - hpBarW/2, hpBarY, hpBarW, 4 * U);
    var hpFillW = hpBarW * ratio;
    var hpColor = ratio > 0.6 ? "#5ad15a" : ratio > 0.3 ? "#e8c84a" : "#d9534f";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x - hpBarW/2, hpBarY, hpFillW, 4 * U);
    ctx.fillStyle = hpColor;
    ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hp + " / " + hpMax + " HP", x, hpBarY + 14 * U);

    ctx.restore();
  }
```

- [ ] **Step 6: Hookear `drawOrganBarrier` en `drawDisseminationField`**

Localizar:
```bash
grep -n "drawOrganDoor(d.x, d.y" index.html
```

Línea ~10332. Justo antes de esa línea, añadir:

```js
        var hp = (state.disseminationBarrierHP && state.disseminationBarrierHP[k]) || 0;
        var hpMax = (state.disseminationBarrierMax && state.disseminationBarrierMax[k]) || 1;
        var broken = !!(state.disseminationBarrierBroken && state.disseminationBarrierBroken[k]);
        drawOrganBarrier(d.x, d.y, d.organ, hp, hpMax, broken, flash);
        drawOrganDoor(d.x, d.y, d.organ, load, flash);
```

(Mantener `drawOrganDoor` después — la puerta sigue visible aunque haya barrera.)

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): barrera mecánica con HP por órgano

Cada carril tiene ahora una barrera tisular con HP propio:
pericardio 12, pleura 8, endotelio 6, periostio 10, c. sinovial 7.
Mientras la barrera viva, los gérmenes mueren al impactar y la
barrera pierde 1 HP. Al romperse (HP=0), los gérmenes pasan y
suman al X/10 del órgano como antes.

Regenera +1 HP por oleada si no está rota. Visual incluye textura
biológica, inflamación gradual, agujeros con HP bajo, y HP bar.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Deploy + verificar**

```bash
git push origin main
vercel deploy --prod -y --no-wait
```

En `immunodefense.vercel.app` con `Shift+B` saltar al puente. En DevTools:

```js
// Mirar HP inicial
window.__game.state.disseminationBarrierHP;     // [12, 8, 6, 10, 7]
window.__game.state.disseminationBarrierMax;    // [12, 8, 6, 10, 7]
window.__game.state.disseminationBarrierBroken; // [false, false, false, false, false]

// Forzar barrera del corazón a 4
window.__game.state.disseminationBarrierHP[0] = 4;
// Forzar barrera de sangre a 0
window.__game.state.disseminationBarrierHP[2] = 0;
window.__game.state.disseminationBarrierBroken[2] = true;
```

Confirmar visualmente:
- Carril corazón (1ro): banda con textura miocardio, HP bar verde→amarillo (4/12), inflamación leve, etiqueta "pericardio".
- Carril sangre (3ro): banda rota con bordes rojos punteados.
- Otros: HP completo, sanas.

Luego dejar correr una oleada y verificar:
- Los gérmenes mueren al impactar la barrera (no llegan al X/10 mientras HP > 0).
- HP baja con cada impacto.

---

## Task 4: Sistema de Antígenos (drops + HUD)

**Files:** Modify `index.html`:
- `newState()` para añadir `antigens`
- `enterDissemination()` para resetear
- Insertar bloque nuevo con funciones de drop + render + HUD
- Hookear `spawnAntigenDrop` en sitios donde mueren gérmenes
- Llamar `updateAntigenDrops` desde el loop principal
- Llamar `drawAntigenDrops` + `drawAntigenHud` desde el render
- Handler de tap

- [ ] **Step 1: Extender `newState()` con el state de antígenos**

Dentro del literal de `newState()`, junto al resto del state de diseminación:

```js
      antigens: { count: 0, drops: [] },
```

- [ ] **Step 2: Reset en `enterDissemination()`**

Junto a las otras inicializaciones de diseminación:

```js
    state.antigens = { count: 0, drops: [] };
```

- [ ] **Step 3: Añadir bloque de funciones**

Insertar después del bloque de PATTERNS (fin del bloque que añadiste en Task 2), antes de `// ============ NIVEL PUENTE: DISEMINACIÓN ============`:

```js
  // ============ SISTEMA DE ANTÍGENOS ============
  // Cada germen muerto en diseminación suelta 1 antígeno tappeable.
  // El jugador los recoge para gastarlos en Respuestas Inmunes.

  var ANTIGEN_TTL = 10.0;
  var ANTIGEN_RADIUS = 8;  // multiplicado por U

  function spawnAntigenDrop(x, y) {
    if (!state.dissemination) return;
    if (!state.antigens) state.antigens = { count: 0, drops: [] };
    state.antigens.drops.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 24 * U,
      vy: -36 * U,
      age: 0,
      ttl: ANTIGEN_TTL,
      collecting: false,    // animación al HUD
      collectT: 0
    });
  }

  function updateAntigenDrops(dt) {
    if (!state.antigens) return;
    var drops = state.antigens.drops;
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.age += dt;

      if (d.collecting) {
        d.collectT += dt;
        // Lerp hacia el HUD (top-left) durante 0.4s.
        var t = Math.min(1, d.collectT / 0.4);
        d.x += (FIELD_LEFT + 30 * U - d.x) * t * 0.25;
        d.y += (FIELD_TOP + 30 * U - d.y) * t * 0.25;
        if (d.collectT >= 0.4) {
          state.antigens.count += 1;
          drops.splice(i, 1);
        }
        continue;
      }

      // Física: aplica gravedad leve, friction lateral.
      d.vy += 60 * U * dt;        // gravedad
      d.vx *= (1 - 1.2 * dt);     // friction
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      // Rebote suave contra el fondo del campo.
      if (d.y > FIELD_BOTTOM - 4 * U) {
        d.y = FIELD_BOTTOM - 4 * U;
        d.vy = -Math.abs(d.vy) * 0.4;
      }

      // Auto-collect a los TTL.
      if (d.age >= d.ttl) {
        d.collecting = true;
        d.collectT = 0;
      }
    }
  }

  function drawAntigenDrops() {
    if (!state.antigens) return;
    var drops = state.antigens.drops;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 6 + i);
      // Halo
      ctx.save();
      ctx.fillStyle = "rgba(255, 210, 74, " + (0.25 + pulse * 0.20) + ")";
      ctx.beginPath();
      ctx.arc(d.x, d.y, ANTIGEN_RADIUS * U * 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Disco
      ctx.fillStyle = "#ffd24a";
      ctx.strokeStyle = "#8a6020";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, ANTIGEN_RADIUS * U, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // "!"
      ctx.fillStyle = "#5a3a08";
      ctx.font = "bold " + Math.floor(11 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", d.x, d.y);
      ctx.restore();
    }
  }

  function drawAntigenHud() {
    if (!state.dissemination || !state.antigens) return;
    var w = 140 * U, h = 24 * U;
    var x = FIELD_LEFT + 8 * U;
    var y = FIELD_TOP + 100 * U;  // ajustar si choca con otro HUD
    ctx.save();
    // Píldora
    ctx.fillStyle = "rgba(30, 15, 20, 0.85)";
    ctx.strokeStyle = "#ffd24a";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, h / 2);
    ctx.fill(); ctx.stroke();
    // Ícono "!"
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.arc(x + h/2, y + h/2, h/2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a3a08";
    ctx.font = "bold " + Math.floor(11 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("!", x + h/2, y + h/2);
    // Número + label
    ctx.fillStyle = "#ffd24a";
    ctx.font = "bold " + Math.floor(13 * U) + "px Fredoka, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(state.antigens.count + "  ANTÍGENOS", x + h + 4 * U, y + h/2);
    ctx.restore();
  }

  function tryTapAntigen(x, y) {
    if (!state.antigens) return false;
    var drops = state.antigens.drops;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.collecting) continue;
      var dx = x - d.x, dy = y - d.y;
      if (dx*dx + dy*dy <= (ANTIGEN_RADIUS * U * 1.8) * (ANTIGEN_RADIUS * U * 1.8)) {
        d.collecting = true;
        d.collectT = 0;
        return true;
      }
    }
    return false;
  }
  // ============ FIN ANTÍGENOS ============
```

- [ ] **Step 4: Hookear `spawnAntigenDrop` en el punto de absorción de la barrera**

Volver al bloque de absorción que modificaste en Task 3 y reemplazar la línea:

```js
            // TODO Task 5: spawnAntigenDrop(e.x, e.y) — aún no existe.
```

por:

```js
            spawnAntigenDrop(e.x, e.y);
```

- [ ] **Step 5: Hookear `spawnAntigenDrop` en los otros sitios de muerte de germen**

Localiza los `e.dead = true` que NO sean por absorción:
```bash
grep -n "e.dead = true" index.html
```

Sitios típicos:
- Línea ~2003: muerte por daño en `updateEnemies`.
- Línea ~2090: similar.
- Línea ~2750: muerte por engullido (macrófago).

En cada uno, **justo antes** de `e.dead = true;` (o dentro del mismo if-block, con un check de `state.dissemination`):

```js
        if (state.dissemination && !e.antigenSpawned) {
          spawnAntigenDrop(e.x, e.y);
          e.antigenSpawned = true;
        }
        e.dead = true;
```

`e.antigenSpawned` evita doble-drop si el mismo germen pasa por dos paths de muerte. (Por ejemplo, daño y luego engullido en el mismo frame.)

**IMPORTANTE:** el sitio que añadiste en Task 3 (absorción de barrera) ya tiene su propio `spawnAntigenDrop` sin el guard `antigenSpawned` — añade el guard también ahí:

```js
            if (!e.antigenSpawned) {
              spawnAntigenDrop(e.x, e.y);
              e.antigenSpawned = true;
            }
```

- [ ] **Step 6: Llamar `updateAntigenDrops` desde el loop principal**

Localizar el cuerpo de `loop`:
```bash
grep -n "function loop" index.html
```

Dentro del `if (!paused) { ... }` (línea ~10568), después de las otras `updateX(dt)`:

```js
      updateAntigenDrops(dt);
```

- [ ] **Step 7: Llamar `drawAntigenDrops` + `drawAntigenHud` en el render**

Localizar el sitio donde se hace `drawDisseminationField()`:
```bash
grep -n "drawDisseminationField" index.html
```

Después de `drawDisseminationField()` (típicamente en `renderField` o equivalente):

```js
    if (state.dissemination) drawAntigenDrops();
```

Y en `drawHUD` (línea ~8687), al final justo antes del `}`:

```js
    if (state.dissemination) drawAntigenHud();
```

- [ ] **Step 8: Routear taps a `tryTapAntigen`**

Localizar el handler de pointerdown / tap del canvas. Buscar:
```bash
grep -n "function onPointerDown\|canvas.addEventListener.*pointerdown\|canvas.addEventListener.*mousedown" index.html
```

En el handler, **antes** de la lógica de colocar torres y SI `state.dissemination`, añadir:

```js
    if (state.dissemination && tryTapAntigen(p.x, p.y)) {
      sfx("upgrade"); // reusable
      return;
    }
```

(Asegurate que `p.x`, `p.y` ya estén en coords de campo, no de pantalla — sigue el patrón del handler existente.)

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): sistema de Antígenos — drops + HUD + tap

Cada germen muerto durante la fase suelta un antígeno tappeable
("!") que pulsa amarillo. Se recoge con tap o auto-collect a los
10s. Contador "! N ANTÍGENOS" arriba a la izquierda. Próximo paso:
panel de respuestas que consumen estos antígenos.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Deploy + verificar**

```bash
git push origin main
vercel deploy --prod -y --no-wait
```

En `immunodefense.vercel.app`:
1. `Shift+B` → puente.
2. Esperar a que los gérmenes lleguen a la barrera y mueran.
3. **Confirmar**: aparecen los puntos "!" amarillos que pulsan donde mueren.
4. Tappear uno → el contador "ANTÍGENOS" sube +1, animación al HUD.
5. Dejar uno sin tappear 10s → debe auto-collectarse.
6. Verificar en DevTools:
   ```js
   window.__game.state.antigens.count;
   window.__game.state.antigens.drops.length;
   ```

---

## Task 5: Panel de Respuestas Inmunes + las 3 cartas

**Files:** Modify `index.html`:
- `newState()` para añadir `nets`, `thrombi`, `armedResponse`
- `enterDissemination()` para resetear
- Insertar bloque nuevo con render del panel + las 3 funciones de efecto
- Handler de tap para cartas + colocación en carril
- Update + draw para nets y thrombi
- Llamadas desde el loop y el render

Por tamaño, esta tarea se divide en sub-commits internos.

### Sub-Task 5.1: Estado + panel + render base

- [ ] **Step 1: Extender `newState()`**

```js
      nets: [],
      thrombi: [],
      armedResponse: null,   // "netosis" | "plaquetas" cuando carta está armada
```

- [ ] **Step 2: Reset en `enterDissemination()`**

```js
    state.nets = [];
    state.thrombi = [];
    state.armedResponse = null;
```

- [ ] **Step 3: Constantes + render del panel**

Insertar después del bloque de ANTÍGENOS:

```js
  // ============ RESPUESTAS INMUNES (panel inferior nuevo) ============
  var RESPONSE_DEFS = {
    dendritica: { cost: 4, color: "#a872d8", label: "Dendrítica",  icon: "▼T", auto: true  },
    netosis:    { cost: 3, color: "#f0a050", label: "NETosis",     icon: "◈",  auto: false },
    plaquetas:  { cost: 5, color: "#e8a020", label: "Plaquetas",   icon: "●●", auto: false }
  };
  var RESPONSE_ORDER = ["dendritica", "netosis", "plaquetas"];

  function drawImmuneResponsePanel() {
    if (!state.dissemination) return;
    // Posición: barra horizontal arriba del dock lateral derecho, o donde
    // mejor encaje. Aquí usamos abajo del campo central, sobre el dock.
    var panelW = FIELD_W * 0.55;
    var panelH = 44 * U;
    var panelX = FIELD_LEFT + (FIELD_W - panelW) / 2;
    var panelY = FIELD_BOTTOM - panelH - 8 * U;
    ctx.save();
    // Fondo
    ctx.fillStyle = "rgba(30, 15, 20, 0.85)";
    ctx.strokeStyle = "rgba(255, 210, 74, 0.30)";
    ctx.lineWidth = 1;
    roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill(); ctx.stroke();

    var cardW = (panelW - 8 * U) / 3 - 6 * U;
    var cardH = panelH - 8 * U;
    UI.responseCards = [];
    for (var i = 0; i < RESPONSE_ORDER.length; i++) {
      var key = RESPONSE_ORDER[i];
      var def = RESPONSE_DEFS[key];
      var cx = panelX + 4 * U + i * (cardW + 6 * U);
      var cy = panelY + 4 * U;
      var canAfford = (state.antigens && state.antigens.count >= def.cost);
      var armed = (state.armedResponse === key);

      UI.responseCards.push({ key: key, x: cx, y: cy, w: cardW, h: cardH });

      ctx.globalAlpha = canAfford ? 1 : 0.4;
      ctx.fillStyle = armed ? colorAlpha(def.color, 0.30) : "rgba(20, 10, 14, 0.85)";
      ctx.strokeStyle = def.color;
      ctx.lineWidth = armed ? 3 : 2;
      roundRect(cx, cy, cardW, cardH, 6);
      ctx.fill(); ctx.stroke();

      // Ícono circular a la izquierda
      ctx.fillStyle = colorAlpha(def.color, 0.7);
      ctx.beginPath();
      ctx.arc(cx + cardH/2, cy + cardH/2, cardH/2 - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.floor(10 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(def.icon, cx + cardH/2, cy + cardH/2);

      // Label arriba
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.floor(11 * U) + "px Fredoka, sans-serif";
      ctx.fillText(def.label, cx + cardH + 4 * U, cy + 12 * U);

      // Costo (! N)
      ctx.fillStyle = "#ffd24a";
      ctx.font = "bold " + Math.floor(11 * U) + "px Fredoka, sans-serif";
      ctx.fillText("!  " + def.cost, cx + cardH + 4 * U, cy + 28 * U);

      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // ============ FIN RESPUESTAS (sub-task 5.1) ============
```

- [ ] **Step 4: Llamar desde render**

En el render principal (después de `drawHUD()` / `drawPanel()`), añadir:

```js
    if (state.dissemination) drawImmuneResponsePanel();
```

- [ ] **Step 5: Commit (sub-task 5.1)**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): panel de Respuestas Inmunes (UI base, sin lógica)

Renderiza las 3 cartas (Dendrítica, NETosis, Plaquetas) con su
costo en Antígenos. Cartas se ven deshabilitadas (gris) si no
hay suficientes. Próximos sub-commits: lógica de cada respuesta.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Deploy + verificar que el panel aparece pero al tappear cartas no pasa nada todavía.

```bash
git push origin main
vercel deploy --prod -y --no-wait
```

### Sub-Task 5.2: Carta Dendrítica (auto, sin carril)

- [ ] **Step 1: Función `spawnDendriticTCells()`**

Insertar después del bloque del panel:

```js
  function spawnDendriticTCells() {
    // Spawn 3 Ts temporales en posiciones aleatorias del campo. Cada uno
    // persigue al germen vivo más cercano, ataca cuerpo a cuerpo, y muere
    // a los 8s.
    if (!state.guardians) state.guardians = [];
    for (var i = 0; i < 3; i++) {
      var spawnX = FIELD_LEFT + Math.random() * FIELD_W;
      var spawnY = FIELD_TOP + (0.2 + Math.random() * 0.5) * FIELD_H;
      state.guardians.push({
        kind: "dendriticT",
        x: spawnX, y: spawnY,
        vx: 0, vy: 0,
        hp: 60, maxHp: 60,
        damage: 5,
        attackCd: 0,
        attackInterval: 0.5,
        speed: 90 * U,
        target: null,
        ttl: 8.0,
        age: 0,
        dead: false,
        color: "#d090e0"
      });
    }
  }
```

- [ ] **Step 2: Manejo del Dendritic T en `updateGuardians`**

Localizar:
```bash
grep -n "function updateGuardians\|updateGuardian" index.html
```

Si existe `updateGuardians(dt)`, dentro del loop por guardian añadir un branch para `g.kind === "dendriticT"`:

```js
      if (g.kind === "dendriticT") {
        g.age += dt;
        if (g.age >= g.ttl) { g.dead = true; continue; }
        g.attackCd = Math.max(0, g.attackCd - dt);
        // Find target
        if (!g.target || g.target.dead) {
          var best = null, bestDist = Infinity;
          for (var ei = 0; ei < state.enemies.length; ei++) {
            var en = state.enemies[ei];
            if (en.dead) continue;
            var dx = en.x - g.x, dy = en.y - g.y;
            var d2 = dx*dx + dy*dy;
            if (d2 < bestDist) { bestDist = d2; best = en; }
          }
          g.target = best;
        }
        if (g.target) {
          var tdx = g.target.x - g.x, tdy = g.target.y - g.y;
          var td = Math.sqrt(tdx*tdx + tdy*tdy) || 1;
          if (td > 14 * U) {
            g.x += (tdx / td) * g.speed * dt;
            g.y += (tdy / td) * g.speed * dt;
          } else if (g.attackCd <= 0) {
            g.target.hp = (g.target.hp || 1) - g.damage;
            g.attackCd = g.attackInterval;
            spawnEffect("hit", g.target.x, g.target.y, "#d090e0");
            if (g.target.hp <= 0) {
              if (!g.target.antigenSpawned) {
                spawnAntigenDrop(g.target.x, g.target.y);
                g.target.antigenSpawned = true;
              }
              g.target.dead = true;
            }
          }
        }
        continue; // no procesar otras ramas para este guardian
      }
```

Si NO existe `updateGuardians`, busca dónde está el update loop de `state.guardians`. Si está inline en `loop`, el branch va ahí.

- [ ] **Step 3: Render del Dendritic T**

Localizar:
```bash
grep -n "function drawGuardians\|drawGuardian" index.html
```

Añadir un branch para `g.kind === "dendriticT"`:

```js
    if (g.kind === "dendriticT") {
      var alpha = g.age > g.ttl - 1 ? Math.max(0, 1 - (g.age - (g.ttl - 1))) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#d090e0";
      ctx.strokeStyle = "#5a2a85";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 10 * U, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("T", g.x, g.y);
      ctx.restore();
      continue;
    }
```

- [ ] **Step 4: Handler de tap en la carta Dendrítica**

En el handler de pointerdown del canvas (mismo sitio que `tryTapAntigen`), añadir antes:

```js
    // Tap en cartas de respuesta inmune
    if (state.dissemination && UI.responseCards) {
      for (var rci = 0; rci < UI.responseCards.length; rci++) {
        var rc = UI.responseCards[rci];
        if (p.x >= rc.x && p.x <= rc.x + rc.w &&
            p.y >= rc.y && p.y <= rc.y + rc.h) {
          var def = RESPONSE_DEFS[rc.key];
          if (state.antigens.count < def.cost) return;
          if (rc.key === "dendritica") {
            // Auto, no requiere carril
            state.antigens.count -= def.cost;
            spawnDendriticTCells();
            sfx("upgrade");
            return;
          } else {
            // Manuales: armar carta (siguiente sub-task lo maneja)
            state.armedResponse = (state.armedResponse === rc.key) ? null : rc.key;
            return;
          }
        }
      }
    }
```

- [ ] **Step 5: Commit (sub-task 5.2)**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): respuesta Dendrítica spawneable

Tap a la carta de Dendrítica (con 4+ antígenos) spawnea 3 Linfocitos
T temporales que persiguen el germen más cercano por 8s. Cada uno
hace 5 daño cuerpo-a-cuerpo cada 0.5s, después se desvanece.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Deploy + verificar:
```bash
git push origin main
vercel deploy --prod -y --no-wait
```

1. Acumular 4+ antígenos (matar gérmenes).
2. Tappear carta Dendrítica.
3. **Confirmar**: aparecen 3 Ts púrpura que se mueven hacia los gérmenes y los atacan. Desaparecen a los 8s.

### Sub-Task 5.3: NETosis (tap+carril)

- [ ] **Step 1: Funciones de net**

```js
  function spawnNet(laneX, laneY) {
    state.nets.push({
      x: laneX, y: laneY,
      radius: 35 * U,
      ttl: 4.0,
      age: 0,
      damagePerSec: 2,
      lastDmgTick: 0
    });
  }

  function updateNets(dt) {
    if (!state.nets) return;
    for (var i = state.nets.length - 1; i >= 0; i--) {
      var n = state.nets[i];
      n.age += dt;
      // Dañar e inmovilizar gérmenes dentro
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.dead) continue;
        var dx = en.x - n.x, dy = en.y - n.y;
        if (dx*dx + dy*dy <= n.radius * n.radius) {
          en.nettedUntil = state.time + 0.2; // marca de inmovilizado (consumido por updateEnemies)
          // Daño cada frame (acumulativo via dt)
          en.hp = (en.hp || 1) - n.damagePerSec * dt;
          if (en.hp <= 0 && !en.dead) {
            if (!en.antigenSpawned) {
              spawnAntigenDrop(en.x, en.y);
              en.antigenSpawned = true;
            }
            en.dead = true;
          }
        }
      }
      if (n.age >= n.ttl) state.nets.splice(i, 1);
    }
  }

  function drawNets() {
    if (!state.nets) return;
    for (var i = 0; i < state.nets.length; i++) {
      var n = state.nets[i];
      var fadeIn = Math.min(1, n.age / 0.3);
      var fadeOut = n.age > n.ttl - 1 ? Math.max(0, 1 - (n.age - (n.ttl - 1))) : 1;
      var alpha = fadeIn * fadeOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Red de ADN: zigzags y líneas radiales
      ctx.strokeStyle = "rgba(255, 220, 180, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.stroke();
      // Líneas radiales
      for (var li = 0; li < 8; li++) {
        var a = (li / 8) * Math.PI * 2 + n.age * 0.5;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n.x + Math.cos(a) * n.radius, n.y + Math.sin(a) * n.radius);
        ctx.stroke();
      }
      // Zigzag interno
      ctx.beginPath();
      for (var t = 0; t <= Math.PI * 2; t += 0.2) {
        var r = n.radius * 0.5 * (1 + 0.4 * Math.sin(t * 4));
        var x = n.x + Math.cos(t) * r, y = n.y + Math.sin(t) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function hasResponseInLane(lane, type) {
    // type: "net" o "thrombus"
    var arr = (type === "net") ? state.nets : state.thrombi;
    if (!arr || !PATH.organDoors || !PATH.organDoors[lane]) return false;
    var laneX = PATH.organDoors[lane].x;
    for (var i = 0; i < arr.length; i++) {
      // Considera "en el carril" si está dentro del ancho de un carril.
      if (Math.abs(arr[i].x - laneX) < (FIELD_W / 5) * 0.45) return true;
    }
    return false;
  }

  function laneAt(x) {
    // Mapea x → índice de carril (0..4) según la posición horizontal.
    var rel = (x - FIELD_LEFT) / FIELD_W;
    var idx = Math.floor(rel * 5);
    return Math.max(0, Math.min(4, idx));
  }
```

- [ ] **Step 2: Inmovilización en `updateEnemies`**

Localizar el update de `enemies`. Donde se aplica velocidad (`e.progress += pxSpeed * dt` o similar), añadir guard:

```js
        if (e.nettedUntil && state.time < e.nettedUntil) {
          pxSpeed = 0;
        }
```

(Sé selectivo — solo cuando `state.dissemination` para evitar afectar Fase 1.)

- [ ] **Step 3: Handler de placement de NET**

En el handler de pointerdown, después de la lógica de cartas, añadir:

```js
    if (state.armedResponse && state.dissemination) {
      var lane = laneAt(p.x);
      var type = state.armedResponse;  // "netosis" o "plaquetas"
      var def2 = RESPONSE_DEFS[type];
      var arrType = (type === "netosis") ? "net" : "thrombus";
      if (hasResponseInLane(lane, arrType)) {
        showMsg("Ya hay un efecto en este carril");
        state.armedResponse = null;
        return;
      }
      if (state.antigens.count < def2.cost) {
        state.armedResponse = null;
        return;
      }
      var laneX = PATH.organDoors ? PATH.organDoors[lane].x : p.x;
      var laneY = p.y;  // donde tappeó, dentro del carril
      state.antigens.count -= def2.cost;
      if (type === "netosis") spawnNet(laneX, laneY);
      else if (type === "plaquetas") spawnThrombus(laneX, laneY);  // sub-task 5.4 implementa
      state.armedResponse = null;
      sfx("upgrade");
      return;
    }
```

- [ ] **Step 4: Llamar `updateNets` + `drawNets`**

En `loop` dentro del `if (!paused)`:
```js
      updateNets(dt);
```

En el render después de `drawDisseminationField` (o donde mejor encaje, sobre los gérmenes):
```js
    if (state.dissemination) drawNets();
```

- [ ] **Step 5: Commit (sub-task 5.3)**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): respuesta NETosis (trampa de ADN)

Carta NETosis: tap arma la carta (cursor cambia), tap en un carril
lanza la trampa. Gérmenes en el área quedan inmovilizados y reciben
2 dmg/s por 4s. Costo: 3 antígenos.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Deploy + verificar:
1. Acumular 3+ antígenos.
2. Tappear NETosis (carta queda highlighted).
3. Tappear un carril → aparece la red.
4. **Confirmar**: gérmenes inmovilizados, daño aplicándose, red desaparece a los 4s.

### Sub-Task 5.4: Plaquetas (tap+carril)

- [ ] **Step 1: Funciones de trombo**

```js
  function spawnThrombus(laneX, laneY) {
    state.thrombi.push({
      x: laneX, y: laneY,
      radius: 40 * U,
      ttl: 6.0,
      age: 0,
      damagePerSec: 4
    });
  }

  function updateThrombi(dt) {
    if (!state.thrombi) return;
    for (var i = state.thrombi.length - 1; i >= 0; i--) {
      var th = state.thrombi[i];
      th.age += dt;
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.dead) continue;
        var dx = en.x - th.x, dy = en.y - th.y;
        if (dx*dx + dy*dy <= th.radius * th.radius) {
          en.thrombusUntil = state.time + 0.2;  // bloqueo total (>net)
          en.hp = (en.hp || 1) - th.damagePerSec * dt;
          if (en.hp <= 0 && !en.dead) {
            if (!en.antigenSpawned) {
              spawnAntigenDrop(en.x, en.y);
              en.antigenSpawned = true;
            }
            en.dead = true;
          }
        }
      }
      if (th.age >= th.ttl) state.thrombi.splice(i, 1);
    }
  }

  function drawThrombi() {
    if (!state.thrombi) return;
    for (var i = 0; i < state.thrombi.length; i++) {
      var th = state.thrombi[i];
      var fadeIn = Math.min(1, th.age / 0.3);
      var fadeOut = th.age > th.ttl - 1 ? Math.max(0, 1 - (th.age - (th.ttl - 1))) : 1;
      var alpha = fadeIn * fadeOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Anillo dorado pulsante
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      ctx.strokeStyle = "rgba(232, 160, 32, " + (0.6 + pulse * 0.3) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(th.x, th.y, th.radius + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      // Coágulo central
      ctx.fillStyle = "rgba(160, 32, 48, 0.65)";
      ctx.beginPath();
      ctx.ellipse(th.x, th.y, th.radius * 0.6, th.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Plaquetas individuales (4-5 puntos dorados)
      var plats = [[-15,-8],[12,-12],[18,6],[-8,12],[-22,4]];
      ctx.fillStyle = "#e8a020";
      ctx.strokeStyle = "#8a5010";
      ctx.lineWidth = 1;
      for (var pi = 0; pi < plats.length; pi++) {
        ctx.beginPath();
        ctx.arc(th.x + plats[pi][0] * U, th.y + plats[pi][1] * U, 4 * U, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }
```

- [ ] **Step 2: Bloqueo en `updateEnemies`**

Añadir guard junto al de `nettedUntil`:

```js
        if (e.thrombusUntil && state.time < e.thrombusUntil) {
          pxSpeed = 0;
        }
```

- [ ] **Step 3: Llamar update + draw**

En `loop`:
```js
      updateThrombi(dt);
```

En render:
```js
    if (state.dissemination) drawThrombi();
```

- [ ] **Step 4: Prevenir mezcla NET + Trombo en mismo carril**

Modificar `hasResponseInLane` para verificar ambos:

```js
  function hasResponseInLaneAny(lane) {
    return hasResponseInLane(lane, "net") || hasResponseInLane(lane, "thrombus");
  }
```

Y en el handler de placement, reemplazar `hasResponseInLane(lane, arrType)` por `hasResponseInLaneAny(lane)`.

- [ ] **Step 5: Commit (sub-task 5.4)**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): respuesta Plaquetas (trombo defensivo)

Carta Plaquetas: tap arma + tap carril forma un coágulo dorado-rojo
que bloquea totalmente el paso y aplica 4 dmg/s por 6s. No se puede
mezclar con NET ni con otro trombo en el mismo carril. Costo: 5
antígenos.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Deploy + verificar:
```bash
git push origin main
vercel deploy --prod -y --no-wait
```

1. Acumular 5+ antígenos.
2. Tappear Plaquetas + carril → coágulo aparece.
3. **Confirmar**: gérmenes bloqueados totalmente, daño 4/s, dura 6s.
4. Intentar plantar NET en el mismo carril → ve mensaje "Ya hay un efecto".

---

## Task 6: Quitar Antiséptico del puente

**Files:** Modify `index.html` en 3 sitios.

- [ ] **Step 1: No renderizar `drawTopical` en diseminación**

Localizar:
```bash
grep -n "drawTopical()" index.html
```

Línea ~10172. Envolver:

```js
      drawMedVial();
      if (!state.dissemination) drawTopical();
```

- [ ] **Step 2: No procesar el tap del antiséptico**

Localizar:
```bash
grep -n "UI.topicalVial && inRect" index.html
```

Línea ~5041. Envolver:

```js
    if (!state.dissemination && UI.topicalVial && inRect(x, y, UI.topicalVial)) {
      if (state.topicalCharge >= TOPICAL_MAX) { applyTopical(); return; }
    }
```

- [ ] **Step 3: No cargar topicalCharge en diseminación**

Localizar:
```bash
grep -n "state.topicalCharge = Math.min" index.html
```

Línea ~2645. Envolver:

```js
      if (!state.dissemination) {
        state.topicalCharge = Math.min(TOPICAL_MAX, state.topicalCharge + (def.isBoss ? TOPICAL_PER_BOSS : TOPICAL_PER_KILL));
      }
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(diseminación): retirar Antiséptico del nivel puente

El antiséptico es tópico (sólo aplica a la piel). Una vez la
infección está diseminada en sangre, ya no es relevante. Se oculta
del HUD, no se procesa su tap, y no acumula carga durante esta
fase.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin main
vercel deploy --prod -y --no-wait
```

- [ ] **Step 5: Verificar**

En `immunodefense.vercel.app`:
1. Fase 1: el antiséptico (vial verde) sigue visible y funcional.
2. `Shift+B` → puente: el vial verde **desaparece**.
3. Volver a Fase 1 (restart) y confirmar que sigue funcionando ahí.

---

## Verificación integral (post-Task 6)

Después del último commit, hacer una pasada completa por el puente:

- [ ] **Cinemática**: rajadura primero, carriles después. Sin destello.
- [ ] **Barreras**: cada carril muestra su HP propio (12/8/6/10/7). HP bar visible.
- [ ] **Absorción**: gérmenes mueren al impactar barrera viva, no llegan al X/10.
- [ ] **Ruptura**: forzar HP=0 → shake + sonido + ese carril empieza a llenar X/10.
- [ ] **Regeneración**: barrera no rota +1 HP al inicio de wave 2 y 3.
- [ ] **Antígenos**: cada germen muerto suelta uno. Tap funciona, contador sube. Auto-collect a los 10s.
- [ ] **Dendrítica**: 4 antígenos → carta funciona → spawnea 3 Ts → atacan → mueren a los 8s.
- [ ] **NETosis**: 3 antígenos → armar → carril → red aparece → gérmenes inmóviles + dañados → desaparece a los 4s.
- [ ] **Plaquetas**: 5 antígenos → armar → carril → coágulo → bloqueo total + daño → desaparece a los 6s.
- [ ] **Stacking**: dos Dendríticas seguidas = 6 Ts. NET en carril 1 + Trombo en carril 2 OK. NET sobre Trombo mismo carril → mensaje.
- [ ] **Sin Antiséptico** en el puente. Funciona en Fase 1.
- [ ] **Sin crashes** en consola.

Si todo pasa: tarea terminada. Si algo falla: crear task `N.X-fix` apuntando al hallazgo.

---

## Notas de mantenimiento

- Los **patterns** generados se cachean en módulo. Si querés iterar el look, basta con `delete ORGAN_PATTERN_CACHE[organId]` desde DevTools y el siguiente frame regenera.
- El **dev hook `window.__game`** queda en el código permanentemente. No removerlo — sirve para debugging futuro y el juego es público.
- Los **costos de respuestas** (3 / 4 / 5 antígenos) son números de balance. Si en playtest se sienten lentos o rápidos, ajustar en `RESPONSE_DEFS`.
- Los **HP de barreras** (12/8/6/10/7) también son balance. Mismo principio.
- El orden del array `DISSEMINATION_ORGANS` se usa como índice por TODO el código de diseminación (`disseminationOrganLoad`, `disseminationBarrierHP`, etc.). NO reordenarlo sin migrar todo.
