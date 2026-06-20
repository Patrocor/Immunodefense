# Neutrófilo: Bombardeo de Defensinas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar por completo el ultimate "Martillazo" del Neutrófilo por "Bombardeo de Defensinas": una secuencia de 2.4s con 7 gránulos cayendo escalonados sobre un tramo ancho del camino y un shockwave propio de cierre, en vez de un golpe instantáneo en un punto chico.

**Architecture:** Todo dentro de `game.js` (single-file Canvas 2D game). Sin tests automatizados — validación por lectura cuidadosa de código + deploy a Vercel + chequeo manual (no hay forma de ver píxeles desde un subagente). El daño pasa a resolverse en `updateTowers()` (capa de lógica, por frame) en vez de dentro de la función de dibujo — a diferencia del Martillazo viejo, que resolvía su golpe único desde dentro de `drawNeutrofilo`. El dibujo se vuelve puramente derivado del tiempo transcurrido (sin efectos secundarios), leyendo `t.bombardImpacts[i].hit` para decidir si un gránulo sigue cayendo o ya impactó.

**Tech Stack:** Vanilla JS, Canvas 2D. Sin dependencias nuevas. Reusa `damageEnemy()` (el pipeline de daño estándar que ya usan todas las demás torres — respeta escudos, recompensas y contadores; el Martillazo viejo NO lo usaba, dañaba `en.hp` directo ignorando escudos. Esto es una mejora intencional, no un cambio de alcance: alinea al Neutrófilo con el resto del roster).

**Spec:** `docs/superpowers/specs/2026-06-20-neutrofilo-bombardeo-design.md`

**Convenciones del plan:**
- Cada task termina con commit + push + `vercel deploy --prod` + verificación.
- Los números de línea son del estado actual de `game.js`; si se desplazan tras un commit anterior, usá el `grep` de contexto incluido en cada step para reubicarte.
- Activar el ultimate del Neutrófilo en juego: subir su carga a 1 desde devtools (`window.__game.state.towers[i].specialCharge = 1`) o esperar ~27.6s jugando — no hay atajo de teclado dedicado.
- `Shift+B` (con el juego corriendo, fuera de título/intro) salta directo a Diseminación, para probar el reparto vertical del bombardeo.

---

## Task 1: Helpers — `nearestPathProgress` y `dealAoEDamageAt`

**Por qué primero:** son funciones nuevas, puramente aditivas (no tocan ningún comportamiento existente), que las Tasks 2 y 3 van a consumir. Aislarlas en su propia task de bajo riesgo facilita la revisión.

**Files:**
- Modify: `game.js` — insertar después de `nearestPointOnPath` (termina en la línea 4991, justo antes del comentario de `computeUltimateTarget`).

- [ ] **Step 1: Localizar el punto de inserción**

```bash
grep -n "function nearestPointOnPath\|return best;\|Calcula el target del ultimate" game.js
```

Esperado: `nearestPointOnPath` empieza en 4971 y devuelve `return best;` en la línea 4990, cierra con `}` en 4991; el comentario `// Calcula el target del ultimate de una torre.` empieza en 4993.

- [ ] **Step 2: Insertar los dos helpers nuevos**

Justo después de la línea 4991 (`  }` que cierra `nearestPointOnPath`) y antes de la línea 4993, insertar:

```js

  // Como nearestPointOnPath, pero además devuelve la posición de arco
  // (heridaIdx + progress, compatible con pathPos()) del punto más
  // cercano. Permite generar puntos repartidos a lo largo del camino a
  // partir de un punto de referencia (ver Bombardeo de Defensinas, abajo).
  function nearestPathProgress(tx, ty) {
    var best = null, bestD2 = Infinity;
    function consider(heridaIdx, progress, x, y) {
      var dx = x - tx, dy = y - ty;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = { heridaIdx: heridaIdx, progress: progress }; }
    }
    function scanBranch(beziers, heridaIdx, baseProgress) {
      if (!beziers) return;
      for (var i = 0; i < beziers.length; i++) {
        var seg = beziers[i];
        var samples = seg.samples;
        if (!samples) continue;
        for (var j = 0; j < samples.length; j++) {
          var s = samples[j];
          consider(heridaIdx, baseProgress + seg.startD + s.d, s.x, s.y);
        }
      }
    }
    if (PATH.branches) {
      for (var b = 0; b < PATH.branches.length; b++) {
        scanBranch(PATH.branches[b].beziers, b, 0);
      }
    }
    if (PATH.main && PATH.main.beziers && PATH.main.beziers.length) {
      var branch0Len = (PATH.branches && PATH.branches[0]) ? PATH.branches[0].length : 0;
      scanBranch(PATH.main.beziers, 0, branch0Len);
    }
    return best;
  }

  // Daño de área genérico en un punto: todo enemigo "walking"/"blocked"
  // dentro de radius recibe dmg vía damageEnemy (respeta escudos,
  // recompensas y contadores — a diferencia del viejo daño inline del
  // Martillazo). Usado por el Bombardeo de Defensinas del Neutrófilo
  // (gránulos + shockwave de aterrizaje, ver updateTowers).
  function dealAoEDamageAt(x, y, radius, dmg) {
    var hits = 0;
    for (var ei = 0; ei < state.enemies.length; ei++) {
      var en = state.enemies[ei];
      if (en.dead || en.dying || en.absorbing) continue;
      if (en.state !== "walking" && en.state !== "blocked") continue;
      var dx = en.x - x, dy = en.y - y;
      if (dx * dx + dy * dy > radius * radius) continue;
      damageEnemy(en, dmg, "neutrofilo");
      hits++;
    }
    return hits;
  }
```

- [ ] **Step 3: Verificar sintaxis**

```bash
node --check game.js
```

Esperado: sin salida (OK).

- [ ] **Step 4: Verificar que no hay nombres en conflicto**

```bash
grep -n "function nearestPathProgress\|function dealAoEDamageAt" game.js
```

Esperado: cada uno aparece exactamente una vez.

- [ ] **Step 5: Commit**

```bash
git add game.js
git commit -m "feat(neutrofilo): agrega helpers nearestPathProgress y dealAoEDamageAt"
```

- [ ] **Step 6: Deploy**

```bash
git push origin main
vercel deploy --prod
```

- [ ] **Step 7: Verificar**

Estos helpers todavía no los llama nadie (los consumen las Tasks 2 y 3) — no hay cambio de comportamiento observable. Confirmar solo que el deploy no rompió nada: abrir `https://immunodefense.vercel.app`, jugar unas oleadas de Fase 1 normalmente, sin errores de consola.

---

## Task 2: Lógica — trigger, resolución por frame, datos de la torre

**Por qué:** reemplaza el "qué pasa" del ultimate (cuánto daño, cuándo, dónde) sin tocar todavía el dibujo. Al terminar esta task, activar el ultimate consumirá la carga y aplicará el daño correctamente, pero **no se va a ver ninguna animación nueva todavía** (el dibujo viejo del Martillazo, que sigue ahí, depende de `t.hammerTarget`, que esta task deja de fijar) — eso es esperado, lo resuelve la Task 3.

**Files:**
- Modify: `game.js:811-829` (`TOWER_DEFS.neutrofilo`)
- Modify: `game.js:5018-5028` (rama `neutrofilo` en `triggerTowerSpecial()`)
- Modify: `game.js` dentro de `updateTowers()`, justo después de la línea `if ((t.specialAnim || 0) > 0) t.specialAnim -= dt;`
- Modify: `game.js:17471` (defaults de inicialización de torre)

- [ ] **Step 1: Localizar los 4 puntos**

```bash
grep -n "specialName: \"Martillazo\"\|if (def.id === \"neutrofilo\")\|if ((t.specialAnim || 0) > 0) t.specialAnim -= dt;\|hammerTarget: null" game.js
```

Esperado: 4 resultados, uno por punto de edición de arriba.

- [ ] **Step 2: Actualizar `TOWER_DEFS.neutrofilo`**

Reemplazar (líneas ~819-822):

```js
      // Ultimate: MARTILLAZO CELULAR — al cargar, tap dispara un mazo
      // proteico contra el germen más cercano en su rango (damage 8x).
      specialChargeSec: 24 * 1.15,  // +15%: poderes tardan un poco más en cargar
      specialName: "Martillazo",
```

por:

```js
      // Ultimate: BOMBARDEO DE DEFENSINAS — 7 gránulos caen escalonados
      // sobre un tramo ancho del camino (dmg 2.2x c/u), cerrando con un
      // shockwave propio (dmg 6x). Ver triggerTowerSpecial/updateTowers.
      specialChargeSec: 24 * 1.15,  // +15%: poderes tardan un poco más en cargar
      specialName: "Bombardeo de Defensinas",
```

- [ ] **Step 3: Reescribir la rama `neutrofilo` de `triggerTowerSpecial()`**

Reemplazar (líneas ~5018-5028):

```js
    if (def.id === "neutrofilo") {
      // MARTILLAZO CELULAR: cae sobre el camino más cercano (o
      // vertical arriba en diseminación, donde los lanes son verticales).
      t.hammerTarget = computeUltimateTarget(t);
      t.specialAnim = 0.65;
      t.specialReady = false;
      t.specialCharge = 0;
      t.hammerImpacted = false;
      sfx("upgrade");
      return;
    }
```

por:

```js
    if (def.id === "neutrofilo") {
      // BOMBARDEO DE DEFENSINAS: 7 gránulos caen escalonados sobre un
      // tramo ancho del camino (±70px de arco alrededor del punto que da
      // computeUltimateTarget), seguidos de un shockwave propio al
      // aterrizar. Ver updateTowers() para la resolución por frame.
      var center = computeUltimateTarget(t);
      var arc = nearestPathProgress(center.x, center.y);
      var offsets = [-70, -46, -23, 0, 23, 46, 70];
      t.bombardImpacts = [];
      for (var bi = 0; bi < offsets.length; bi++) {
        var pt;
        if (arc) pt = pathPos(arc.progress + offsets[bi] * U, arc.heridaIdx);
        else pt = center;
        t.bombardImpacts.push({ x: pt.x, y: pt.y, tOffset: 0.3 + bi * 0.19, hit: false });
      }
      t.bombardLanded = false;
      t.specialAnim = 2.4;
      t.specialReady = false;
      t.specialCharge = 0;
      sfx("upgrade");
      return;
    }
```

- [ ] **Step 4: Agregar la resolución por frame en `updateTowers()`**

Localizar la línea `if ((t.specialAnim || 0) > 0) t.specialAnim -= dt;` (dentro del loop `for` de `updateTowers()`) e insertar inmediatamente después:

```js
      // Neutrófilo ultimate: Bombardeo de Defensinas — dispara cada
      // gránulo cuando le toca su turno y, al llegar a la fase de
      // aterrizaje (1.6s), el shockwave propio una sola vez.
      if (t.def.id === "neutrofilo" && t.bombardImpacts) {
        var elapsed = 2.4 - (t.specialAnim || 0);
        for (var nb = 0; nb < t.bombardImpacts.length; nb++) {
          var imp = t.bombardImpacts[nb];
          if (!imp.hit && elapsed >= imp.tOffset) {
            imp.hit = true;
            var nbStats = towerStats(t);
            dealAoEDamageAt(imp.x, imp.y, 18 * U, nbStats.damage * 2.2);
            triggerShake(0.08, 2);
          }
        }
        if (!t.bombardLanded && elapsed >= 1.6) {
          t.bombardLanded = true;
          var ndStats = towerStats(t);
          dealAoEDamageAt(t.x, t.y, 32 * U, ndStats.damage * 6);
          triggerShake(0.30, 7);
        }
        if ((t.specialAnim || 0) <= 0) {
          t.bombardImpacts = null;
          t.bombardLanded = false;
        }
      }
```

- [ ] **Step 5: Actualizar los defaults de inicialización de torre**

Reemplazar (línea ~17471):

```js
      hammerTarget: null, cannonTarget: null, frenzyTarget: null
```

por:

```js
      bombardImpacts: null, cannonTarget: null, frenzyTarget: null
```

- [ ] **Step 6: Verificar sintaxis**

```bash
node --check game.js
```

Esperado: sin salida (OK).

- [ ] **Step 7: Confirmar que no quedan referencias rotas a `hammerTarget` en la lógica (sí van a quedar en el dibujo viejo — eso lo limpia la Task 3)**

```bash
grep -n "hammerTarget\|hammerImpacted" game.js
```

Esperado en este punto: las únicas apariciones restantes están dentro del bloque de dibujo del Martillazo (función `drawNeutrofilo`, alrededor de las líneas 12438-12675) — todavía sin tocar. Si aparece alguna en `triggerTowerSpecial` o `updateTowers`, algo quedó sin reemplazar — revisar Steps 3-4.

- [ ] **Step 8: Commit**

```bash
git add game.js
git commit -m "feat(neutrofilo): nueva lógica del ultimate Bombardeo de Defensinas"
```

- [ ] **Step 9: Deploy**

```bash
git push origin main
vercel deploy --prod
```

- [ ] **Step 10: Verificar**

Abrir `https://immunodefense.vercel.app`, jugar Fase 1, colocar un Neutrófilo, subirle la carga del ultimate desde devtools (`window.__game.state.towers` — buscar el índice del Neutrófilo y setear `.specialCharge = 1`) y dejar que se active solo (o tocar su tarjeta de ultimate). Confirmar:
- Los gérmenes en el tramo bombardeado pierden HP en oleadas (7 tandas + 1 final), visible en sus barras de vida, **aunque no haya ninguna animación nueva en pantalla todavía** (esperado en esta task).
- No quedan saltando errores en consola.
- La torre vuelve a poder atacar normal ~2.4s después de activar el ultimate.

---

## Task 3: Dibujo nuevo + limpieza del código viejo

**Por qué:** cierra el cambio con la secuencia visual completa (contracción/fade del cuerpo, gránulos cayendo, impactos, shockwave de aterrizaje) y elimina el código del Martillazo que ya no se usa.

**Files:**
- Modify: `game.js` función `drawNeutrofilo` — bloque de apertura (~12247-12260) y bloque de cierre del ultimate (~12438-12675).
- Delete: función `resolveNeutrofiloHammer` completa (~5270-5445, incluyendo su comentario).

- [ ] **Step 1: Localizar los 3 puntos**

```bash
grep -n "function drawNeutrofilo\|ctx.translate(x, y);\|MARTILLAZO CELULAR\|function resolveNeutrofiloHammer\|function placeTower" game.js
```

Esperado: `drawNeutrofilo` ~12247, el primer `ctx.translate(x, y);` dentro de esa función poco después, `MARTILLAZO CELULAR` ~12438, `resolveNeutrofiloHammer` ~5274, `placeTower` ~5447 (función siguiente, marca el fin de `resolveNeutrofiloHammer`).

- [ ] **Step 2: Agregar el cálculo de alpha/escala del cuerpo + el wrap del `ctx.save()`**

En `drawNeutrofilo`, reemplazar (líneas ~12255-12260):

```js
    var x = t.x, y = t.y;
    var R = 23 * U * pulse;       // bumped 19→23 (~20% más grande)
    var time = state.time;
    var attacking = (expression === "attacking");
    ctx.save();
    ctx.translate(x, y);
```

por:

```js
    var x = t.x, y = t.y;
    var R = 23 * U * pulse;       // bumped 19→23 (~20% más grande)
    var time = state.time;
    var attacking = (expression === "attacking");
    // Bombardeo de Defensinas: el cuerpo se contrae y se funde durante la
    // anticipación/lluvia, y rebota al volver en el aterrizaje (resto de
    // la secuencia se dibuja más abajo, fuera de este bloque local).
    var bodyAlpha = 1, bodyScale = 1;
    if (t.def.id === "neutrofilo" && (t.specialAnim || 0) > 0 && t.bombardImpacts) {
      var bgElapsed = 2.4 - t.specialAnim;
      if (bgElapsed < 0.3) {
        var bgWu = bgElapsed / 0.3;
        bodyAlpha = 1 - bgWu * 0.75;
        bodyScale = 1 - bgWu * 0.25;
      } else if (bgElapsed < 1.6) {
        bodyAlpha = 0.25; bodyScale = 0.75;
      } else if (bgElapsed < 2.1) {
        var bgLd = (bgElapsed - 1.6) / 0.5;
        bodyAlpha = 0.25 + bgLd * 0.75;
        bodyScale = 0.75 + bgLd * 0.25 + Math.sin(bgLd * Math.PI) * 0.12;
      }
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = bodyAlpha;
    ctx.scale(bodyScale, bodyScale);
```

- [ ] **Step 3: Reemplazar el bloque de dibujo del ultimate**

Reemplazar TODO el bloque desde el comentario `// ── MARTILLAZO CELULAR ──` hasta el `}` que cierra ese `if` (líneas ~12438-12675 — el `}` que cierra la función `drawNeutrofilo` en la línea siguiente NO se toca):

```js
    // ── BOMBARDEO DE DEFENSINAS ──
    // Fases por `bElapsed` (segundos desde el trigger, ver
    // triggerTowerSpecial/updateTowers): anticipación (0-0.3s, aro dorado;
    // el cuerpo ya se contrae/funde arriba), lluvia (0.3-1.6s, gránulos
    // cayendo + impactos), aterrizaje (1.6-2.1s, shockwave + rebote del
    // cuerpo, también ya aplicado arriba).
    if (t.def.id === "neutrofilo" && (t.specialAnim || 0) > 0 && t.bombardImpacts) {
      var bElapsed = 2.4 - t.specialAnim;

      if (bElapsed < 0.3) {
        var wuP = bElapsed / 0.3;
        ctx.save();
        ctx.globalAlpha = 0.25 + wuP * 0.55;
        ctx.strokeStyle = "#ffd24a";
        ctx.lineWidth = 2.5 * U;
        ctx.beginPath();
        ctx.arc(x, y, R * (1.1 + wuP * 0.6), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (var bi2 = 0; bi2 < t.bombardImpacts.length; bi2++) {
        var imp2 = t.bombardImpacts[bi2];
        var fallStart = imp2.tOffset - 0.35;
        if (bElapsed >= fallStart && bElapsed < imp2.tOffset) {
          var fallU = (bElapsed - fallStart) / 0.35;
          var fallE = fallU * fallU;
          var fy = imp2.y - 220 * U * (1 - fallE);
          ctx.save();
          ctx.globalAlpha = 0.85;
          var trailGrad = ctx.createLinearGradient(imp2.x, fy - 26 * U, imp2.x, fy);
          trailGrad.addColorStop(0, "rgba(255,210,74,0)");
          trailGrad.addColorStop(1, "rgba(255,210,74,0.85)");
          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = 3 * U;
          ctx.beginPath();
          ctx.moveTo(imp2.x, fy - 26 * U);
          ctx.lineTo(imp2.x, fy);
          ctx.stroke();
          ctx.fillStyle = "#caa8ff";
          ctx.beginPath();
          ctx.arc(imp2.x, fy, 4.5 * U, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (imp2.hit) {
          var sinceHit = bElapsed - imp2.tOffset;
          if (sinceHit >= 0 && sinceHit < 0.25) {
            var burstP = sinceHit / 0.25;
            ctx.save();
            ctx.globalAlpha = 1 - burstP;
            var burstR = 6 * U + burstP * 22 * U;
            var burstGrad = ctx.createRadialGradient(imp2.x, imp2.y, 0, imp2.x, imp2.y, burstR);
            burstGrad.addColorStop(0, "rgba(255,250,210,0.9)");
            burstGrad.addColorStop(0.5, "rgba(255,210,74,0.6)");
            burstGrad.addColorStop(1, "rgba(202,168,255,0)");
            ctx.fillStyle = burstGrad;
            ctx.beginPath();
            ctx.arc(imp2.x, imp2.y, burstR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      if (bElapsed >= 1.6 && bElapsed < 2.1) {
        var landP = (bElapsed - 1.6) / 0.5;
        ctx.save();
        ctx.globalAlpha = 1 - landP;
        ctx.strokeStyle = "#ffd24a";
        ctx.lineWidth = 4 * U;
        ctx.beginPath();
        ctx.arc(x, y, landP * 55 * U, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
```

(Notar el `  }` final con 2 espacios de indentación — es el cierre de la función `drawNeutrofilo`, el mismo que ya estaba ahí. No agregar uno extra.)

- [ ] **Step 4: Eliminar `resolveNeutrofiloHammer` completa**

Borrar el bloque completo desde el comentario `// Aplica el daño + efectos del martillazo en el momento del impacto.` hasta el `}` de cierre de la función (líneas ~5270-5445), dejando intacta la línea en blanco y la función `placeTower` que sigue.

- [ ] **Step 5: Verificar sintaxis**

```bash
node --check game.js
```

Esperado: sin salida (OK).

- [ ] **Step 6: Confirmar limpieza completa**

```bash
grep -n "hammerTarget\|hammerImpacted\|resolveNeutrofiloHammer\|MARTILLAZO" game.js
```

Esperado: sin resultados.

- [ ] **Step 7: Commit**

```bash
git add game.js
git commit -m "feat(neutrofilo): dibujo del Bombardeo de Defensinas + limpieza del Martillazo"
```

- [ ] **Step 8: Deploy**

```bash
git push origin main
vercel deploy --prod
```

- [ ] **Step 9: Verificar — Fase 1**

Abrir `https://immunodefense.vercel.app` en portrait. Colocar un Neutrófilo, forzar su carga (`window.__game.state.towers[i].specialCharge = 1` desde devtools) y activarlo:
- Se ve la secuencia completa: aro dorado pulsante + cuerpo que se contrae/funde (anticipación) → gránulos cayendo con estela + flashes de impacto escalonados sobre un tramo ancho (lluvia) → anillo de shockwave expandiéndose desde la torre + cuerpo que vuelve sólido con rebote (aterrizaje).
- Los gérmenes en el tramo pierden HP visiblemente, de forma escalonada (no todo de golpe).
- La torre no ataca normal durante la secuencia (~2.4s) y retoma después.
- Repetir en landscape.

- [ ] **Step 10: Verificar — Diseminación**

Con el juego corriendo en Fase 1 (fuera de título/intro), `Shift+B` para saltar a Diseminación. Colocar/usar un Neutrófilo en un carril, forzar la carga y activar:
- El reparto de los 7 gránulos es vertical por el carril (hacia arriba/abajo desde el punto que da `computeUltimateTarget`), no horizontal.
- Sin errores de consola, sin comportamiento distinto al esperado.

- [ ] **Step 11: Verificar — casos sin gérmenes en rango**

Activar el ultimate con cero gérmenes cerca del Neutrófilo (campo vacío o fuera de alcance): la secuencia visual completa debe reproducirse igual (sin gérmenes que dañar), sin errores de consola ni cuelgues.
