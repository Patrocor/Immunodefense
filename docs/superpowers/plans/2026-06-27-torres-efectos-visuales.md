# Torres & Tanques — Efectos Visuales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mejorar los efectos visuales de disparo y ultimate de las 7 torres, distinguir visualmente los 3 tanques con HP bar siempre visible, y ajustar el schedule de desbloqueo.

**Architecture:** Todo en `game.js` (único archivo). Los cambios son aditivos: nuevos `kind` en `pushEffect`/`drawEffect`, modificaciones a funciones draw existentes, y una función helper de HP bar reutilizable.

**Tech Stack:** Canvas 2D, vanilla JS, sistema pushEffect/drawEffect existente, `state.time` para animaciones.

---

## Alcance rápido: qué ya existe vs. qué falta

| Feature | Estado actual |
|---------|--------------|
| LinfocitoB infla en ult | ✅ ya existe (ultBoost 1→1.45) |
| NK tornado en frenesí | ✅ ya existe (8 spoke lines + aura) |
| Langerhans extiende brazos en ult | ✅ ya existe (ultExt 2.5×) |
| Mastocito 3 anillos en desgranulación | ✅ ya existe |
| Apoptosis marcas X en enemigos | ✅ ya existe (drawApoptosisMarks) |
| Slow indicator en enemigos | ✅ ya existe (tinte azul en drawEnemy) |
| Neutrofilo granules cayendo VISIBLES | ❌ falta — pathCrack existe pero no hay visual de caída |
| Neutrofilo defensin shockwave final | ❌ falta |
| Eosinofilo nova ring en ult | ❌ falta |
| Tank HP bars siempre visibles | ❌ falta (Trombo/Centinela/Complemento) |
| Melee con shockwave por torre | ❌ falta (melee genérico, no lleva towerId) |
| NK shield-break burst | ❌ falta |
| NK perforin: DoT indicator en enemigo | ❌ falta |
| Unlock schedule NK wave 4→5 | ❌ falta |

---

## Task 1: Unlock schedule — NK wave 4 → wave 5

**Files:**
- Modify: `game.js:1376-1379`

- [ ] **Step 1: Cambiar el schedule**

Buscar en game.js:
```js
var UNLOCK_SCHEDULE = {
    2: "langerhans",
    4: "nk"
};
```

Reemplazar con:
```js
var UNLOCK_SCHEDULE = {
    2: "langerhans",
    5: "nk"
};
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(towers): NK se desbloquea en ola 5 en vez de 4 -- da más respiro al jugador antes de verse ante virus"
```

---

## Task 2: Helper `drawTankHpBar` + HP bars en los 3 tanques

**Files:**
- Modify: `game.js` — añadir helper antes de `drawTrombo` (línea ~14102), llamarlo al final de drawTrombo, drawCentinela, drawComplementCannon.

**Propósito:** Los tanques tienen HP como mechanic core (Trombo death-bomb, Centinela se absorbe). Mostrar la barra siempre hace legible su estado sin hover.

- [ ] **Step 1: Añadir función helper `drawTankHpBar`**

Insertar inmediatamente ANTES de `function drawTrombo(` (~línea 14102):

```js
  // HP bar siempre visible para tanques (Trombo, Centinela, Complemento).
  // Llamar dentro de ctx.save()/translate(t.x,t.y) antes de ctx.restore().
  function drawTankHpBar(R, hpFrac, color) {
    var bW = R * 2.4, bH = Math.max(4, 5 * U);
    var bX = -bW / 2, bY = R + Math.max(4, 5 * U);
    // Fondo oscuro
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.roundRect(bX - 1, bY - 1, bW + 2, bH + 2, 2); ctx.fill();
    // Relleno coloreado (verde→amarillo→rojo según HP)
    var hue = hpFrac > 0.5 ? "#4caf50" : hpFrac > 0.25 ? "#ff9800" : "#f44336";
    ctx.fillStyle = hue;
    ctx.beginPath(); ctx.roundRect(bX, bY, Math.max(0, bW * hpFrac), bH, 1.5); ctx.fill();
    // Borde sutil
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bX - 1, bY - 1, bW + 2, bH + 2, 2); ctx.stroke();
  }
```

- [ ] **Step 2: Llamar `drawTankHpBar` al final de `drawTrombo`**

Justo antes del `ctx.restore()` que cierra `drawTrombo` (después de `towerFace(...)` y antes de `ctx.restore()`):

```js
    var tHpFrac = (t.maxHp && t.hp > 0) ? Math.max(0, t.hp / t.maxHp) : 1;
    drawTankHpBar(R, tHpFrac, t.def.color);
```

- [ ] **Step 3: Llamar `drawTankHpBar` al final de `drawCentinela`**

En `drawCentinela`, justo antes del `ctx.restore()` final:

```js
    var cHpFrac = (t.maxHp && t.hp > 0) ? Math.max(0, t.hp / t.maxHp) : 1;
    drawTankHpBar(R, cHpFrac, t.def.color);
```

- [ ] **Step 4: Llamar `drawTankHpBar` al final de `drawComplementCannon`**

En `drawComplementCannon`, justo antes del `ctx.restore()` final:

```js
    var ccHpFrac = (t.maxHp && t.hp > 0) ? Math.max(0, t.hp / t.maxHp) : 1;
    drawTankHpBar(R, ccHpFrac, t.def.color);
```

- [ ] **Step 5: Verificar que `ctx.roundRect` existe** (Chrome 99+, Safari 15.4+). Si puede fallar, usar fallback:

```js
  function drawTankHpBar(R, hpFrac, color) {
    var bW = R * 2.4, bH = Math.max(4, 5 * U);
    var bX = -bW / 2, bY = R + Math.max(4, 5 * U);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(bX - 1, bY - 1, bW + 2, bH + 2);
    var hue = hpFrac > 0.5 ? "#4caf50" : hpFrac > 0.25 ? "#ff9800" : "#f44336";
    ctx.fillStyle = hue;
    ctx.fillRect(bX, bY, Math.max(0, bW * hpFrac), bH);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bX - 1, bY - 1, bW + 2, bH + 2);
  }
```

- [ ] **Step 6: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(tanks): HP bar siempre visible en Trombo, Centinela y Complemento -- su salud es su mechanic, tiene que verse"
```

---

## Task 3: Melee shockwave por torre (Neutrófilo naranja, Trombo rojo)

**Files:**
- Modify: `game.js` — `fireTower` (~línea 6128) y `drawEffect` case `"melee"` (~línea 18772)

**Por qué:** El melee actual (3 garras) es sutil. Neutro necesita un anillo expansivo naranja-blanco al golpear; Trombo necesita uno rojo-oscuro con más punch.

- [ ] **Step 1: Añadir `towerId` al pushEffect de melee en `fireTower`**

Buscar (línea ~6128):
```js
      pushEffect({ kind: "melee", x1: t.x, y1: t.y, x2: target.x, y2: target.y, life: 0.18, max: 0.18, color: t.def.color });
```

Reemplazar con:
```js
      pushEffect({ kind: "melee", x1: t.x, y1: t.y, x2: target.x, y2: target.y, life: 0.18, max: 0.18, color: t.def.color, towerId: t.def.id });
```

- [ ] **Step 2: Añadir shockwave ring en drawEffect para "melee"**

Dentro del bloque `} else if (ef.kind === "melee") {` (después del destello redondo existente y ANTES de `ctx.globalAlpha = 1;`), añadir:

```js
      // Shockwave específico por torre
      if (ef.towerId === "neutrofilo" || ef.towerId === "trombo") {
        var swColor = ef.towerId === "neutrofilo" ? "rgba(255,140,50," : "rgba(200,50,30,";
        var swR = (8 + (1 - alpha) * 42) * U;
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = swColor + (alpha * 0.8) + ")";
        ctx.lineWidth = (3 * (1 - (1 - alpha))) * U;
        ctx.beginPath(); ctx.arc(ef.x2, ef.y2, swR, 0, Math.PI * 2); ctx.stroke();
        // Segundo anillo interior más brillante
        ctx.strokeStyle = swColor + (alpha * 0.5) + ")";
        ctx.lineWidth = 1.5 * U;
        ctx.beginPath(); ctx.arc(ef.x2, ef.y2, swR * 0.55, 0, Math.PI * 2); ctx.stroke();
      }
```

- [ ] **Step 3: Extender `life` del melee effect para que el ring tenga tiempo de verse**

En `fireTower` (el pushEffect que ya modificamos en Step 1), cambiar `life: 0.18, max: 0.18` a `life: 0.28, max: 0.28`:

```js
      pushEffect({ kind: "melee", x1: t.x, y1: t.y, x2: target.x, y2: target.y, life: 0.28, max: 0.28, color: t.def.color, towerId: t.def.id });
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(vfx): melee de Neutro/Trombo ahora emite shockwave anillo expandiendose -- mas punch en cada golpe"
```

---

## Task 4: Neutrofilo — granules cayendo visibles + defensin shockwave final

**Files:**
- Modify: `game.js` — `drawNeutrofilo` (~línea 12764) y `updateTowers` block de bombardImpacts (~línea 5917), y `drawEffect` para añadir `"defensinWave"`.

**Por qué:** El bombardeo ya tiene `pathCrack` pero el jugador no ve los 7 gránulos CAYENDO desde arriba. Sin la animación de caída, el ult parece que los cráteres aparecen de la nada.

- [ ] **Step 1: Dibujar gránulos cayendo en `drawNeutrofilo`**

En `drawNeutrofilo`, dentro del bloque:
```js
    if (t.def.id === "neutrofilo" && (t.specialAnim || 0) > 0 && t.bombardImpacts) {
      var bgElapsed = 2.4 - t.specialAnim;
```

Justo ANTES de los cálculos de `bodyAlpha`/`bodyScale` existentes, añadir la animación de gránulos cayendo:

```js
      // Gránulos dorados cayendo desde el techo del viewport — uno por impacto
      ctx.save();
      ctx.globalAlpha = 1;
      for (var grI = 0; grI < t.bombardImpacts.length; grI++) {
        var grImp = t.bombardImpacts[grI];
        var grStart = grImp.tOffset - 0.2;  // empieza a verse 0.2s antes de aterrizar
        if (bgElapsed < grStart) continue;
        var grAge = bgElapsed - grStart;
        if (grAge > 0.5 || grImp.hit) continue;  // ya llegó, ya no dibuja
        var grProg = Math.min(1, grAge / 0.5);
        // Posición: cae desde Y=-60*U hasta el punto de impacto
        var grTopY = grImp.y - FIELD_H * 0.55;  // desde arriba del campo
        var grY = grTopY + (grImp.y - grTopY) * (grProg * grProg);  // aceleración
        // Trail dorado
        for (var trI = 1; trI <= 5; trI++) {
          var trProg = Math.max(0, grProg - trI * 0.06);
          var trY = grTopY + (grImp.y - grTopY) * (trProg * trProg);
          ctx.fillStyle = "rgba(255,200,50," + ((1 - trI / 6) * grProg * 0.5) + ")";
          ctx.beginPath(); ctx.arc(grImp.x, trY, (9 - trI) * U, 0, Math.PI * 2); ctx.fill();
        }
        // Gránulo dorado
        ctx.fillStyle = "#FFD24A";
        ctx.shadowBlur = 14 * U; ctx.shadowColor = "#ff9900";
        ctx.beginPath(); ctx.arc(grImp.x, grY, 10 * U, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
```

- [ ] **Step 2: Añadir pushEffect `"defensinWave"` al completarse el bombardeo**

En `updateTowers`, en el bloque de neutrofilo (línea ~5936):
```js
        if ((t.specialAnim || 0) <= 0) {
          t.bombardImpacts = null;
```

Justo ANTES de `t.bombardImpacts = null;`, añadir:
```js
        if ((t.specialAnim || 0) <= 0) {
          // Onda de choque de defensinas desde la propia torre al terminar la lluvia
          var defStats = towerStats(t);
          pushEffect({
            kind: "defensinWave",
            x: t.x, y: t.y,
            r: defStats.range * U * 1.1,
            life: 0.9, max: 0.9
          });
          triggerShake(0.14, 5);
          t.bombardImpacts = null;
```

- [ ] **Step 3: Añadir drawing para `"defensinWave"` en `drawEffect`**

Justo ANTES del cierre `}` final de `drawEffect` (antes de la última `}`):

```js
    } else if (ef.kind === "defensinWave") {
      // Onda azul-blanca expansiva del Neutrófilo al final del bombardeo
      var dwT = 1 - ef.life / ef.max;  // 0→1
      var dwR = ef.r * (0.15 + 0.85 * dwT);
      ctx.save();
      ctx.globalAlpha = (1 - dwT) * 0.9;
      // Anillo exterior azul-blanco
      ctx.strokeStyle = "rgba(180,240,255," + (1 - dwT) + ")";
      ctx.lineWidth = (5 - dwT * 3) * Math.max(1, U);
      ctx.beginPath(); ctx.arc(ef.x, ef.y, dwR, 0, Math.PI * 2); ctx.stroke();
      // Anillo interior blanco
      ctx.strokeStyle = "rgba(255,255,255," + ((1 - dwT) * 0.5) + ")";
      ctx.lineWidth = 2 * Math.max(1, U);
      ctx.beginPath(); ctx.arc(ef.x, ef.y, dwR * 0.65, 0, Math.PI * 2); ctx.stroke();
      // Fill interior
      var dwGrad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, dwR * 0.5);
      dwGrad.addColorStop(0, "rgba(180,240,255," + ((1 - dwT) * 0.3) + ")");
      dwGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = dwGrad;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, dwR * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(vfx/neutro): granulos dorados caen visibles durante Bombardeo + onda defensin azul-blanca al rematar"
```

---

## Task 5: Eosinofilo — nova ring central al disparar el ult

**Files:**
- Modify: `game.js` — `triggerTowerSpecial` bloque eosinofilo (~línea 5454), `drawEffect` añadir `"novaRing"`.

**Por qué:** Descarga de Gránulos empuja `granuleShot` individualmente por enemigo pero NO hay efecto visual en la propia torre — el ult empieza sin fanfarria. Un ring naranja masivo da el "punch" inicial.

- [ ] **Step 1: Pushear `"novaRing"` al inicio del ult eosinofilo**

En `triggerTowerSpecial`, bloque `if (def.id === "eosinofilo")` (~línea 5454), DESPUÉS del loop de enemigos y ANTES de `t.specialAnim = 1.0`:

```js
      // Nova ring central — fanfarria visual al detonar
      pushEffect({
        kind: "novaRing",
        x: t.x, y: t.y,
        r: eoR,
        color: "#F2774E",
        life: 0.55, max: 0.55
      });
```

- [ ] **Step 2: Añadir drawing para `"novaRing"` en `drawEffect`**

Justo ANTES del cierre `}` final de `drawEffect`:

```js
    } else if (ef.kind === "novaRing") {
      // Nova naranja masiva desde el Eosinófilo al detonar el ult
      var nrT = 1 - ef.life / ef.max;  // 0→1
      var nrR = ef.r * (0.05 + 0.95 * nrT);
      ctx.save();
      ctx.globalAlpha = (1 - nrT);
      // Anillo grueso naranja exterior
      ctx.strokeStyle = ef.color || "#F2774E";
      ctx.lineWidth = (6 - nrT * 4) * Math.max(1, U);
      ctx.beginPath(); ctx.arc(ef.x, ef.y, nrR, 0, Math.PI * 2); ctx.stroke();
      // Fill degradado del interior
      var nrGrad = ctx.createRadialGradient(ef.x, ef.y, nrR * 0.3, ef.x, ef.y, nrR);
      nrGrad.addColorStop(0, "rgba(255,160,60," + ((1 - nrT) * 0.35) + ")");
      nrGrad.addColorStop(1, "rgba(242,119,78,0)");
      ctx.fillStyle = nrGrad;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, nrR, 0, Math.PI * 2); ctx.fill();
      // Partículas de gránulos radiales (8 puntos saliendo)
      for (var nrP = 0; nrP < 8; nrP++) {
        var nrA = nrP * Math.PI / 4;
        var nrPx = ef.x + Math.cos(nrA) * nrR * 0.85;
        var nrPy = ef.y + Math.sin(nrA) * nrR * 0.85;
        ctx.fillStyle = "rgba(242,119,78," + ((1 - nrT) * 0.7) + ")";
        ctx.beginPath(); ctx.arc(nrPx, nrPy, 4 * Math.max(1, U), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(vfx/eosin): nova ring naranja masiva al detonar Descarga de Granulos -- el ult ahora tiene fanfarria visual"
```

---

## Task 6: NK — shield-break burst visible

**Files:**
- Modify: `game.js` — `damageEnemy` o donde se verifica `breakShield` (~búscar `breakShield`).

**Por qué:** La NK rompe escudos pero visualmente el jugador no sabe cuándo lo hizo. Un burst visual al romperse el escudo hace legible esa mecánica.

- [ ] **Step 1: Buscar dónde se aplica el breakShield**

```bash
grep -n "breakShield\|shield.*break\|t\.def\.breakShield" /Users/compusita/proyectos/immunodefense/game.js | head -20
```

- [ ] **Step 2: Añadir pushEffect de burst al romper el escudo**

Cuando se detecta que el escudo se rompe (shield HP ≤ 0), añadir:
```js
        pushEffect({
          kind: "shieldBurst",
          x: e.x, y: e.y,
          r: e.def.radius * U * 2.2,
          life: 0.4, max: 0.4,
          color: "#E84393"
        });
```

- [ ] **Step 3: Añadir drawing para `"shieldBurst"` en `drawEffect`**

```js
    } else if (ef.kind === "shieldBurst") {
      var sbT = 1 - ef.life / ef.max;
      var sbR = ef.r * (0.2 + 0.8 * sbT);
      ctx.save();
      ctx.globalAlpha = (1 - sbT) * 0.9;
      // Hexágono que revienta (escudo hexagonal = inmunología estándar)
      ctx.strokeStyle = ef.color || "#E84393";
      ctx.lineWidth = (4 - sbT * 3) * Math.max(1, U);
      ctx.beginPath();
      for (var sbI = 0; sbI < 6; sbI++) {
        var sbA = sbI * Math.PI / 3;
        var sbX = ef.x + Math.cos(sbA) * sbR;
        var sbY = ef.y + Math.sin(sbA) * sbR;
        if (sbI === 0) ctx.moveTo(sbX, sbY); else ctx.lineTo(sbX, sbY);
      }
      ctx.closePath(); ctx.stroke();
      // Flash blanco brillante en el centro
      ctx.fillStyle = "rgba(255,255,255," + ((1 - sbT) * 0.4) + ")";
      ctx.beginPath(); ctx.arc(ef.x, ef.y, sbR * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(vfx/nk): burst hexagonal visible al romper escudo de germen -- mechanic ahora se lee claramente"
```

---

## Task 7: Mastocito — desgranulación: push big blue shockwave en campo

**Files:**
- Modify: `game.js` — `triggerTowerSpecial` bloque mastocito (~línea 5488).

**Por qué:** El Mastocito ya tiene rings en `drawMastocito` (relativos a la torre), pero en el campo abierto no se ve el alcance real de 1.6× range. Un `pushEffect` independiente que viaja por el campo hace la ult legible.

- [ ] **Step 1: Pushear shockwave de campo en `triggerTowerSpecial` mastocito**

En el bloque `if (def.id === "mastocito")` (~línea 5488), ANTES de `t.specialAnim = 1.0`:

```js
      // Shockwave de campo — azul-hielo que viaja hasta 1.6× range
      pushEffect({
        kind: "mastocWave",
        x: t.x, y: t.y,
        r: maR,
        life: 0.7, max: 0.7
      });
```

- [ ] **Step 2: Añadir drawing para `"mastocWave"` en `drawEffect`**

Justo ANTES del cierre `}` final de `drawEffect`:

```js
    } else if (ef.kind === "mastocWave") {
      // Onda de choque azul-hielo del Mastocito al desgranularse
      var mwT = 1 - ef.life / ef.max;
      var mwR = ef.r * (0.05 + 0.95 * mwT);
      ctx.save();
      ctx.globalAlpha = (1 - mwT) * 0.85;
      // Anillo grueso azul
      ctx.strokeStyle = "rgba(79,143,224," + (1 - mwT) + ")";
      ctx.lineWidth = (7 - mwT * 5) * Math.max(1, U);
      ctx.beginPath(); ctx.arc(ef.x, ef.y, mwR, 0, Math.PI * 2); ctx.stroke();
      // Anillo interior helado (blanco-azul)
      ctx.strokeStyle = "rgba(180,220,255," + ((1 - mwT) * 0.6) + ")";
      ctx.lineWidth = 2.5 * Math.max(1, U);
      ctx.beginPath(); ctx.arc(ef.x, ef.y, mwR * 0.7, 0, Math.PI * 2); ctx.stroke();
      // Fill interior helado
      var mwGrad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, mwR * 0.55);
      mwGrad.addColorStop(0, "rgba(79,143,224," + ((1 - mwT) * 0.18) + ")");
      mwGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = mwGrad;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, mwR * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(vfx/masto): onda de choque azul-hielo en el campo al desgranularse -- alcance de 1.6x range ahora visible"
```

---

## Task 8: Trombo death-bomb — indicador pulsante mientras cuenta regresiva

**Files:**
- Modify: `game.js` — `updatePendingBombs` / draw loop. Añadir dibujo de `state.pendingBombs` en el render.

**Por qué:** El Trombo tiene death-bomb de 2s de delay pero el jugador no sabe que hay una bomba esperando explotar. Añadir un indicador visual pulsante en la posición de la bomba.

- [ ] **Step 1: Buscar dónde se dibuja el campo y agregar drawPendingBombHints**

Buscar en game.js el orden de draw calls (~línea 21300+):
```bash
grep -n "safeDraw.*Trombo\|safeDraw.*Bomb\|drawPending\|pendingBombs" /Users/compusita/proyectos/immunodefense/game.js | head -10
```

- [ ] **Step 2: Añadir función `drawPendingBombHints`**

Antes de la función de draw del path o towers (buscar un lugar lógico), añadir:

```js
  function drawPendingBombHints() {
    if (!state.pendingBombs || !state.pendingBombs.length) return;
    for (var bi = 0; bi < state.pendingBombs.length; bi++) {
      var bomb = state.pendingBombs[bi];
      var frac = Math.max(0, bomb.timer / bomb.max);  // 1→0 mientras cuenta
      var pulse = 0.5 + 0.5 * Math.sin(state.time * (8 + (1 - frac) * 12));
      // Zona de explosión futura
      ctx.save();
      ctx.globalAlpha = (1 - frac) * 0.3 * pulse;
      ctx.fillStyle = "#f44336";
      ctx.beginPath(); ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2); ctx.fill();
      // Anillo pulsante
      ctx.globalAlpha = (0.4 + pulse * 0.5) * (1 - frac * 0.4);
      ctx.strokeStyle = "#ff5252";
      ctx.lineWidth = 2.5 * Math.max(1, U);
      ctx.beginPath(); ctx.arc(bomb.x, bomb.y, bomb.radius * (0.6 + pulse * 0.4), 0, Math.PI * 2); ctx.stroke();
      // Icono 💥 o texto "BOOM" flotante
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#ff1744";
      ctx.font = "bold " + Math.max(10, 12 * U) + "px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💥", bomb.x, bomb.y - bomb.radius * 0.5);
      ctx.restore();
    }
  }
```

- [ ] **Step 3: Llamar `drawPendingBombHints` en el render loop**

Buscar una posición adecuada en el main draw loop (después de towers, antes de enemies):
```js
    safeDraw("PendingBombHints", drawPendingBombHints);
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/compusita/proyectos/immunodefense add game.js
git -C /Users/compusita/proyectos/immunodefense commit -m "feat(vfx/trombo): indicador pulsante visible de bomba pendiente -- jugador sabe exactamente donde y cuándo explota"
```

---

## Task 9: Deploy y verificar

- [ ] **Step 1: Deploy a Vercel**

```bash
cd /Users/compusita/proyectos/immunodefense && vercel --prod 2>&1 | tail -5
```

- [ ] **Step 2: Verificar en browser:**
- NK se desbloquea en ola 5 (antes era 4)
- Trombo/Centinela/Complemento muestran HP bar siempre visible
- Neutrofilo melee emite shockwave naranja
- Bombardeo de Defensinas: ver gránulos dorados caer desde arriba
- Al final del bombardeo: onda azul-blanca desde la torre
- Descarga de Gránulos del Eosinófilo: nova ring naranja al disparar
- NK rompe escudo: hexágono burst rosa
- Mastocito ult: onda azul-hielo visible en el campo
- Trombo muere: indicador pulsante de bomba
