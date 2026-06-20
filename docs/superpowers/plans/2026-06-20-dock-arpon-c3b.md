# Arpón + C3b al dock en Fase 1 — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover el medidor C3b y la tarjeta del ultimate "Arpón" del Macrófago, hoy flotando sobre el campo en Fase 1, al dock lateral derecho — el mismo lugar donde ya viven en Diseminación — para que la fila inferior del campo y el dock se vean y funcionen igual en ambas fases.

**Architecture:** Todo dentro de `game.js` (single-file Canvas 2D game). Sin tests automatizados — validación visual vía deploy a Vercel y devtools (`window.__game.state`) después de cada task. Mantiene patrón existente: layout calculado en `layoutUI()`/`layoutMed()` dentro de `layout()`, dibujado leído desde objetos `UI.*` sin lógica de fase en los draw/click handlers.

**Tech Stack:** Vanilla JS, Canvas 2D. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-06-20-dock-arpon-c3b-design.md`

**Convenciones del plan:**
- Cada task termina con commit + push + `vercel deploy --prod` + verificación visual (workflow ya establecido del proyecto).
- Los números de línea son del estado actual de `game.js`; si se desplazan tras un `commit` anterior, usá el `grep` de contexto incluido en cada step para reubicarte.
- `Shift+B` (con el juego corriendo, fuera de título/intro) salta directo a Diseminación — útil para comparar ambas fases sin jugar 18 oleadas.
- `window.__game.state` ya existe (`game.js:3325`) para inspeccionar desde devtools en producción.

---

## Task 1: Reservar espacio para C3b+Arpón en el dock también en Fase 1

**Por qué:** hoy `layoutUI()` solo reserva altura en el dock para C3b+Arpón `if (state.dissemination)`. Hay que reservarla siempre, y exponer el borde inferior del dock (`dockBottom`/`dockPad`) para que `layoutMed()` (Task 2) pueda anclar ahí cuando no exista `UI.responsePanel`.

**Files:**
- Modify: `game.js:3609-3641` (dentro de `layoutUI()`)

- [ ] **Step 1: Localizar el bloque actual**

```bash
grep -n "var dockBottom = VH\|var responsesReservedH = 0" game.js
```

Esperado: dos líneas, `dockBottom` cerca de 3617 y `responsesReservedH` cerca de 3630.

- [ ] **Step 2: Exponer `dockBottom`/`dockPad` en `UI`**

En `game.js`, justo después de la línea (~3617):

```js
    var dockBottom = VH - safeBottom - dockPad;
```

agregar:

```js
    var dockBottom = VH - safeBottom - dockPad;
    UI.dockBottom = dockBottom;
    UI.dockPad = dockPad;
```

- [ ] **Step 3: Reservar siempre el espacio de C3b+Arpón**

Reemplazar el bloque (~3630-3641):

```js
    var responsesReservedH = 0;
    var rpH = 0;
    var c3bMeterH = Math.round(34 * U);
    var c3bMeterGap = Math.round(4 * U);
    var ultCardH = Math.round(34 * U);
    var ultCardGap = Math.round(4 * U);
    if (state && state.dissemination) {
      var rpCardH = Math.round(44 * U);
      var rpPad = Math.round(5 * U);
      rpH = rpCardH + 2 * rpPad;
      responsesReservedH = rpH + c3bMeterH + c3bMeterGap + ultCardH + ultCardGap + dockPad;
    }
```

por:

```js
    var c3bMeterH = Math.round(34 * U);
    var c3bMeterGap = Math.round(4 * U);
    var ultCardH = Math.round(34 * U);
    var ultCardGap = Math.round(4 * U);
    // C3b + Arpón siempre reservan espacio al fondo del dock, en ambas fases.
    var responsesReservedH = c3bMeterH + c3bMeterGap + ultCardH + ultCardGap + dockPad;
    var rpH = 0;
    if (state && state.dissemination) {
      var rpCardH = Math.round(44 * U);
      var rpPad = Math.round(5 * U);
      rpH = rpCardH + 2 * rpPad;
      responsesReservedH += rpH;
    }
```

- [ ] **Step 4: Confirmar que no quedó ninguna referencia rota**

```bash
grep -n "responsesReservedH\|UI.dockBottom\|UI.dockPad" game.js
```

Esperado: `responsesReservedH` se declara una vez y se usa más abajo (~3646) para `infoY`; `UI.dockBottom`/`UI.dockPad` aparecen solo en esta asignación nueva (Task 2 los va a leer).

- [ ] **Step 5: Commit**

```bash
git add game.js
git commit -m "feat(ui): reserva espacio de C3b+Arpón en el dock también en Fase 1"
```

- [ ] **Step 6: Deploy**

```bash
git push origin main
vercel deploy --prod
```

- [ ] **Step 7: Verificar (parcial — el reposicionamiento real llega en Task 2)**

Abrir `https://immunodefense.vercel.app`, jugar Fase 1. Confirmar que:
- La cartilla de torres en el dock sigue mostrándose completa y con scroll si corresponde (perdió un poco de alto, no debería cortarse ni solaparse con la zona de info/Vender/Mejorar).
- C3b y Arpón siguen viéndose en su posición vieja, flotando sobre el campo (todavía no se movieron — eso es esperado, lo hace Task 2).

---

## Task 2: Colapsar `layoutMed()` a una fila de 3 items, con anclaje fallback para C3b/Arpón

**Por qué:** hoy `layoutMed()` tiene dos ramas: la de Diseminación (3 items en la fila, C3b+Arpón anclados arriba de `UI.responsePanel`) y la de Fase 1 (4 items, C3b+Arpón flotando sobre el campo). Hay que unificarlas: siempre 3 items en la fila, y un fallback de anclaje cuando no existe `UI.responsePanel`.

**Files:**
- Modify: `game.js:7092-7151` (función `layoutMed()` completa)

- [ ] **Step 1: Localizar la función actual**

```bash
grep -n "function layoutMed" game.js
```

Esperado: `7092:  function layoutMed() {`

- [ ] **Step 2: Reemplazar el cuerpo completo de la función**

Reemplazar todo el bloque desde `function layoutMed() {` (línea 7092) hasta el `}` de cierre (línea 7151):

```js
  function layoutMed() {
    // Fila inferior con indicadores HORIZONTALES alineados:
    //  [ antiséptico ] [ medicamento (4 bloques) ] [ Mφ call ]
    // C3b y el ultimate "Arpón" del Macrófago viven en el dock lateral (ver
    // layoutUI), no en esta fila — igual en ambas fases.
    var rowH = Math.max(34, 38 * U);
    var rowY = FIELD_BOTTOM - rowH - 8 * U;
    var gap = 6 * U;
    var availableW = FIELD_W - 16 * U;
    // Botón Macrófago es CUADRADO (rowH × rowH) — restamos su ancho del available
    var macW = rowH;
    var availableW2 = availableW - macW - gap;
    var startX = FIELD_LEFT + 8 * U;

    var totalRatio2 = 0.55 + 1.00;
    var unit2 = (availableW2 - gap) / totalRatio2;
    var topicalW2 = Math.round(unit2 * 0.55);
    var medW2 = Math.round(unit2 * 1.00);
    UI.topicalVial = { x: startX, y: rowY, w: topicalW2, h: rowH };
    UI.medVial = { x: startX + topicalW2 + gap, y: rowY, w: medW2, h: rowH };
    UI.macrofagoBtn = { x: UI.medVial.x + medW2 + gap, y: rowY, w: macW, h: rowH };

    // C3b + Arpón: ancladas arriba del panel de NETosis en Diseminación, o
    // arriba del fondo del dock en Fase 1 (no hay NETosis ahí).
    var anchorX, anchorW, anchorBottomY;
    if (UI.responsePanel) {
      var rp = UI.responsePanel;
      anchorX = rp.x + rp.pad;
      anchorW = rp.w - 2 * rp.pad;
      anchorBottomY = rp.y + rp.pad;
    } else {
      anchorX = UI.compendiumBtn.x;
      anchorW = UI.compendiumBtn.w;
      anchorBottomY = UI.dockBottom - UI.dockPad;
    }
    var c3bH = Math.round(34 * U);
    var c3bGap = Math.round(4 * U);
    UI.c3bMeter = {
      x: anchorX,
      y: anchorBottomY - c3bGap - c3bH,
      w: anchorW,
      h: c3bH
    };
    var ultH = Math.round(34 * U);
    var ultGap = Math.round(4 * U);
    UI.macrofagoUltCard = {
      x: UI.c3bMeter.x,
      y: UI.c3bMeter.y - ultGap - ultH,
      w: UI.c3bMeter.w,
      h: ultH
    };
  }
```

- [ ] **Step 3: Confirmar que no quedaron ramas viejas**

```bash
grep -n "state.dissemination && UI.responsePanel" game.js
```

Esperado: sin resultados (esa condición vivía solo en la rama vieja de `layoutMed()`, ya eliminada).

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat(ui): unifica fila inferior a 3 items, C3b+Arpón al dock en Fase 1"
```

- [ ] **Step 5: Deploy**

```bash
git push origin main
vercel deploy --prod
```

- [ ] **Step 6: Verificar — Fase 1**

Abrir `https://immunodefense.vercel.app` en portrait. Jugar Fase 1 (no hace falta esperar oleadas):
- La fila inferior del campo muestra solo 3 elementos (Tópico / Medicamento / Mφ), sin huecos ni textos cortados.
- Arpón y C3b se ven en el dock derecho, debajo de la cartilla de torres y arriba de la zona de info/Vender/Mejorar — Arpón arriba, C3b justo abajo, pegados.
- Tocar el Arpón cuando esté cargado (`window.__game.state.macrofagoUltimate.ready === true` desde devtools, o esperar a que la barra se llene) lo activa igual que antes.
- El medidor C3b sigue rellenándose con cada fragmento de complemento generado, sin overlap con la cartilla de torres ni con la zona de info.
- Repetir en landscape: mismas confirmaciones.

- [ ] **Step 7: Verificar — Diseminación (sin regresión)**

Con el juego corriendo en Fase 1 (fuera de título/intro), presionar `Shift+B` para saltar a Diseminación:
- El dock se ve igual que antes del cambio: Arpón y C3b arriba del panel de NETosis, fila inferior del campo con los mismos 3 items.
- Sin parpadeos ni saltos de layout en la transición.

- [ ] **Step 8: Verificar — sin errores en consola**

En devtools, confirmar que no aparecen errores (ej. `Cannot read property 'x' of undefined`) al cambiar de fase o al hacer resize de la ventana (rotar el viewport portrait↔landscape).
