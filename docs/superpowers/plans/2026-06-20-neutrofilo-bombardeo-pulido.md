# Bombardeo de Defensinas: pulido (gotas gruesas + grietas) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Engrosar visualmente la gota que cae en el ultimate del Neutrófilo (Bombardeo de Defensinas) y agregar una grieta temporal en el camino al momento del impacto, tanto por gránulo como en el aterrizaje de la torre.

**Architecture:** Cambio puramente visual dentro de `game.js`. La grieta reusa el efecto genérico `pathCrack` (ya implementado en el renderer de efectos, intacto desde el Martillazo viejo) — se dispara con `pushEffect()` desde `updateTowers()` (capa de lógica, donde ya se resuelve el daño de cada impacto), sin tocar el dibujo del camino ni crear ningún sistema nuevo. La gota más gruesa es un cambio acotado al bloque de dibujo ya existente en `drawNeutrofilo`.

**Tech Stack:** Vanilla JS, Canvas 2D. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-06-20-neutrofilo-bombardeo-pulido-design.md`

**Convenciones del plan:**
- La task termina con commit + push + `vercel deploy --prod` + verificación.
- Los números de línea son del estado actual de `game.js`; si se desplazaron, usá el `grep` de contexto incluido para reubicarte.
- Activar el ultimate del Neutrófilo en juego: subir su carga a 1 desde devtools (`window.__game.state.towers[i].specialCharge = 1`) o esperar ~27.6s jugando.
- `Shift+B` (con el juego corriendo, fuera de título/intro) salta directo a Diseminación.

---

## Task 1: Gotas más gruesas + grietas temporales en el impacto

**Files:**
- Modify: `game.js` dentro de `updateTowers()` — bloque del Bombardeo de Defensinas (donde se marca `imp.hit = true` y `t.bombardLanded = true`).
- Modify: `game.js` dentro de `drawNeutrofilo()` — bloque de la gota cayendo (dentro de `// ── BOMBARDEO DE DEFENSINAS ──`).

- [ ] **Step 1: Localizar los 2 puntos**

```bash
grep -n "imp.hit = true;\|t.bombardLanded = true;\|var fallStart = imp2.tOffset" game.js
```

Esperado: 3 resultados — `imp.hit = true;` y `t.bombardLanded = true;` dentro de `updateTowers()`, y `var fallStart = imp2.tOffset - 0.35;` dentro de `drawNeutrofilo()`.

- [ ] **Step 2: Agregar la grieta por gránulo en `updateTowers()`**

Localizar este bloque (dentro del `if (t.def.id === "neutrofilo" && t.bombardImpacts)` de `updateTowers()`):

```js
          if (!imp.hit && elapsed >= imp.tOffset) {
            imp.hit = true;
            var nbStats = towerStats(t);
            dealAoEDamageAt(imp.x, imp.y, 18 * U, nbStats.damage * 2.2);
            triggerShake(0.08, 2);
          }
```

Reemplazar por:

```js
          if (!imp.hit && elapsed >= imp.tOffset) {
            imp.hit = true;
            var nbStats = towerStats(t);
            dealAoEDamageAt(imp.x, imp.y, 18 * U, nbStats.damage * 2.2);
            triggerShake(0.08, 2);
            pushEffect({ kind: "pathCrack", x: imp.x, y: imp.y, r: 16 * U, life: 1.2, max: 1.2, seed: Math.random() * 1000 });
          }
```

- [ ] **Step 3: Agregar la grieta del aterrizaje en `updateTowers()`**

Localizar este bloque (mismo `if`, inmediatamente después del bloque del Step 2):

```js
        if (!t.bombardLanded && elapsed >= 1.6) {
          t.bombardLanded = true;
          var ndStats = towerStats(t);
          dealAoEDamageAt(t.x, t.y, 32 * U, ndStats.damage * 6);
          triggerShake(0.30, 7);
        }
```

Reemplazar por:

```js
        if (!t.bombardLanded && elapsed >= 1.6) {
          t.bombardLanded = true;
          var ndStats = towerStats(t);
          dealAoEDamageAt(t.x, t.y, 32 * U, ndStats.damage * 6);
          triggerShake(0.30, 7);
          pushEffect({ kind: "pathCrack", x: t.x, y: t.y, r: 26 * U, life: 1.6, max: 1.6, seed: Math.random() * 1000 });
        }
```

- [ ] **Step 4: Engrosar la gota cayendo en `drawNeutrofilo()`**

Localizar este bloque (dentro de `// ── BOMBARDEO DE DEFENSINAS ──`, rama `if (bElapsed >= fallStart && bElapsed < imp2.tOffset)`):

```js
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
```

Reemplazar por:

```js
        if (bElapsed >= fallStart && bElapsed < imp2.tOffset) {
          var fallU = (bElapsed - fallStart) / 0.35;
          var fallE = fallU * fallU;
          var fy = imp2.y - 220 * U * (1 - fallE);
          // Squash sutil en el último tramo antes de tocar el piso.
          var squashU = Math.max(0, (fallU - 0.85) / 0.15);
          var dropRX = 8 * U * (1 + squashU * 0.35);
          var dropRY = 8 * U * (1 - squashU * 0.30);
          ctx.save();
          ctx.globalAlpha = 0.9;
          // Cola tipo cometa: cuña ancha junto a la gota, afinándose hacia arriba.
          var tailLen = 30 * U;
          var tailHalfW = dropRX * 0.7;
          var tailGrad = ctx.createLinearGradient(imp2.x, fy - tailLen, imp2.x, fy);
          tailGrad.addColorStop(0, "rgba(202,168,255,0)");
          tailGrad.addColorStop(1, "rgba(202,168,255,0.55)");
          ctx.fillStyle = tailGrad;
          ctx.beginPath();
          ctx.moveTo(imp2.x, fy - tailLen);
          ctx.lineTo(imp2.x - tailHalfW, fy);
          ctx.lineTo(imp2.x + tailHalfW, fy);
          ctx.closePath();
          ctx.fill();
          // Gota: gradiente radial para volumen.
          var dropGrad = ctx.createRadialGradient(
            imp2.x - dropRX * 0.3, fy - dropRY * 0.3, dropRX * 0.15,
            imp2.x, fy, dropRX
          );
          dropGrad.addColorStop(0, "#e8d4ff");
          dropGrad.addColorStop(0.55, "#caa8ff");
          dropGrad.addColorStop(1, "#8a5fc0");
          ctx.fillStyle = dropGrad;
          ctx.beginPath();
          ctx.ellipse(imp2.x, fy, dropRX, dropRY, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (imp2.hit) {
```

- [ ] **Step 5: Verificar sintaxis**

```bash
node --check game.js
```

Esperado: sin salida (OK).

- [ ] **Step 6: Confirmar que los 3 cambios quedaron aplicados**

```bash
grep -n "pathCrack\|dropGrad\|tailGrad" game.js
```

Esperado: 2 llamadas nuevas a `pushEffect({ kind: "pathCrack"...` (una con `r: 16 * U`, otra con `r: 26 * U`) más la ya existente referencia en el comentario de `resolveNeutrofiloHammer` si quedó alguna (no debería — esa función ya se borró en un trabajo anterior); y las nuevas variables `dropGrad`/`tailGrad` dentro de `drawNeutrofilo`.

- [ ] **Step 7: Commit**

```bash
git add game.js
git commit -m "polish(neutrofilo): gotas más gruesas + grietas temporales en el Bombardeo"
```

(Append el trailer estándar después de una línea en blanco:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013iuvnVZtDbhkdpWTTmn7Tx
```
)

- [ ] **Step 8: Deploy**

```bash
git push origin main
vercel deploy --prod
```

- [ ] **Step 9: Verificar**

Abrir `https://immunodefense.vercel.app`, jugar Fase 1, forzar la carga del ultimate del Neutrófilo (`window.__game.state.towers[i].specialCharge = 1` desde devtools) y activarlo:
- Las gotas se ven más gruesas, con volumen (gradiente) y una cola tipo cometa, no una línea fina.
- Justo antes de tocar el piso, la gota se achata levemente (squash).
- Cada gránulo deja una grieta chica en el camino al impactar, que se desvanece en ~1.2s.
- El aterrizaje de la torre deja una grieta más grande (además del anillo de shockwave que ya tenía), que se desvanece en ~1.6s.
- Repetir en Diseminación (`Shift+B`): mismas confirmaciones sobre el carril vertical.
- Sin errores de consola.
