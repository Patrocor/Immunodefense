# Map Unlock System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los `enterBodyMap` hardcodeados por un sistema de estado real (`completedMapNodes`) que muestra el mapa automáticamente al completar cada pieza de contenido y enruta el siguiente con `launchNextContent`.

**Architecture:** Una función pura `computeMapState(state)` deriva `currentNode` y `availableNodes` desde `completedMapNodes` + `unlockedF2`. `enterBodyMapForState()` lo muestra sin parámetros. `launchNextContent()` consulta `MAP_NODE_CONTENT` para encontrar el siguiente contenido construido. `exitHeroLevel` usa `completedMapNodes.dissem` para distinguir el hero level mid-diseminación (narrativo) del post-diseminación (secuencia principal).

**Tech Stack:** JavaScript vanilla, canvas, mismo patrón que el resto de `game.js`. Sin dependencias externas. Sin framework de tests — validación manual en el navegador.

---

## Mapa de archivos

Solo un archivo cambia: `game.js` (~24846 líneas).

| Zona | Qué cambia |
|------|------------|
| `newState()` (~línea 3490) | +2 campos: `completedMapNodes`, `activeF3` |
| Junto a `MAP_NODES` (~línea 8362) | +2 constantes: `MAP_COMPLETED_LABELS`, `MAP_NODE_CONTENT` |
| Después de `enterBodyMap` (~línea 8927) | +4 funciones: `computeMapState`, `enterBodyMapForState`, `launchNextContent`, `showProximamente` |
| `exitHeroLevel` (~línea 22968) | Lógica de completado + mostrar mapa |
| `pendingHeroLevel` handler (~línea 24629) | Separar Use1 (mid-dissem) de Use2 (post-dissem); Use2 usa nuevo sistema |
| `phaseTransition` handler (~línea 24730) | Marcar fase1 completo + usar `enterBodyMapForState` |

---

## Task 1: Agregar campos a `newState` y constantes globales

**Files:**
- Modify: `game.js:3490` (newState)
- Modify: `game.js:8362` (junto a MAP_NODES)

- [ ] **Step 1: Agregar campos a `newState()`**

Buscar la línea `unlockedF2: null,` (~3490) y agregar inmediatamente después:

```js
      unlockedF2: null,                 // qué complicación se desbloqueó tras diseminación
      completedMapNodes: {},            // nodeKey → true cuando esa pieza fue completada
      activeF3: null,                   // qué nodo F3 está activo (null hasta llegar ahí)
```

- [ ] **Step 2: Agregar `MAP_COMPLETED_LABELS` junto a MAP_NODES**

Buscar la línea `var MAP_NODES = [` (~8364) y agregar ANTES de ella:

```js
  // Títulos y subtítulos del mapa según el nodo que acaba de completarse.
  // enterBodyMapForState los lee desde completedMapNodes.currentNode.
  var MAP_COMPLETED_LABELS = {
    "fase1": {
      title:    "FASE 1 SUPERADA",
      subtitle: "La infección alcanzó el torrente sanguíneo"
    },
    "dissem": {
      title:    "DISEMINACIÓN COMPLETA",
      subtitle: "Los héroes entran en escena — rastro desde la piel"
    },
    "h_fase1": {
      title:    "HÉROES: PIEL → VASO",
      subtitle: "Seguimos el rastro al órgano diana"
    },
    "endocarditis": {
      title:    "ENDOCARDITIS",
      subtitle: "Corazón comprometido — héroes en la circulación"
    },
    "osteomielitis": {
      title:    "OSTEOMIELITIS",
      subtitle: "Hueso comprometido — héroes en la circulación"
    },
    "artritis": {
      title:    "ARTRITIS",
      subtitle: "Articulación comprometida — héroes en la circulación"
    },
    "h_dissem": {
      title:    "HÉROES EN LA SANGRE",
      subtitle: "Persiguiendo la diseminación"
    },
    "sepsis": {
      title:    "SEPSIS SISTÉMICA",
      subtitle: "Todo converge — héroes y gérmenes frente a frente"
    },
    "mods": {
      title:    "SHOCK SÉPTICO",
      subtitle: "Falla multiorgánica · boss final"
    }
  };
```

- [ ] **Step 3: Agregar `MAP_NODE_CONTENT` inmediatamente después de MAP_COMPLETED_LABELS**

```js
  // Tabla de contenido construido. nodeKey → { built: bool, launch: fn }.
  // launchNextContent consulta esto para saber qué lanzar al presionar CONTINUAR.
  // Para agregar nuevo contenido: agregar la entrada y el exit handler correspondiente.
  var MAP_NODE_CONTENT = {
    "fase1":   { built: false },   // punto de entrada — no se rejuega
    "dissem":  { built: true,  launch: function() { enterDissemination(); } },
    "h_fase1": { built: true,  launch: function() { enterHeroLevel("piel"); } }
    // Futuros:
    // "endocarditis":  { built: true, launch: function() { enterF2TD("endocarditis"); } },
    // "osteomielitis": { built: true, launch: function() { enterF2TD("osteomielitis"); } },
    // "artritis":      { built: true, launch: function() { enterF2TD("artritis"); } },
    // "h_endocarditis": { built: true, launch: function() { enterHeroLevel("corazon"); } },
  };
```

- [ ] **Step 4: Verificar manualmente**

Abrir `game.js`, buscar `completedMapNodes` — debe aparecer en `newState()`. Buscar `MAP_NODE_CONTENT` — debe aparecer antes de `MAP_NODES`. No abrir el juego aún.

- [ ] **Step 5: Commit**

```bash
git add game.js
git commit -m "feat(map-unlock): estado completedMapNodes + constantes MAP_COMPLETED_LABELS y MAP_NODE_CONTENT"
```

---

## Task 2: Funciones centrales del sistema de mapa

**Files:**
- Modify: `game.js:8927` (después de `handleBodyMapTap`, antes del comentario `// -------- PODERES`)

- [ ] **Step 1: Agregar `computeMapState` después de `handleBodyMapTap`**

Buscar la línea `// ============ FIN BODY-MAP` (~8927) y agregar ANTES de ella:

```js
  // Deriva { currentNode, availableNodes } desde el estado real del jugador.
  // Función pura — sin side effects. Llámala cada vez que necesites saber
  // dónde está el jugador y qué nodo sigue.
  function computeMapState(st) {
    var done = st.completedMapNodes || {};
    var f2   = st.unlockedF2 || "endocarditis";
    var hf2  = "h_" + f2;                       // "h_endocarditis", "h_osteomielitis", etc.
    var f3   = st.activeF3 || null;

    // Secuencia lineal completa. filter(Boolean) elimina null cuando f3 no está definido.
    var sequence = [
      "fase1", "dissem", "h_fase1",
      f2, "h_dissem",
      f3, hf2,
      "sepsis", "h_sepsis",
      "mods", "h_mods"
    ].filter(Boolean);

    var currentNode = null;
    var nextNode    = null;

    for (var i = 0; i < sequence.length; i++) {
      if (done[sequence[i]]) {
        currentNode = sequence[i];
      } else {
        nextNode = sequence[i];
        break;
      }
    }

    return {
      currentNode:    currentNode,
      availableNodes: nextNode ? [nextNode] : []
    };
  }
```

- [ ] **Step 2: Agregar `enterBodyMapForState` inmediatamente después**

```js
  // Muestra el mapa derivando currentNode y availableNodes desde el estado real.
  // titleOverride: { title, subtitle } — úsalo para los textos narrativos
  // específicos de Fase 1 (victory/contained/overload) que difieren del label
  // genérico en MAP_COMPLETED_LABELS.
  function enterBodyMapForState(titleOverride) {
    var ms     = computeMapState(state);
    var labels = (ms.currentNode && MAP_COMPLETED_LABELS[ms.currentNode]) || {};
    enterBodyMap({
      currentNode:    ms.currentNode,
      availableNodes: ms.availableNodes,
      forkOpen:       ms.availableNodes.length > 0,
      title:    (titleOverride && titleOverride.title)    || labels.title    || "MAPA DE LA INVASIÓN",
      subtitle: (titleOverride && titleOverride.subtitle) || labels.subtitle || "",
      onContinue: launchNextContent
    });
  }
```

- [ ] **Step 3: Agregar `launchNextContent` inmediatamente después**

```js
  // Lanza el siguiente contenido según computeMapState + MAP_NODE_CONTENT.
  // Si el nodo no tiene contenido construido, muestra "próximamente".
  function launchNextContent() {
    var ms   = computeMapState(state);
    var next = ms.availableNodes[0];
    if (!next) { showProximamente(); return; }
    var content = MAP_NODE_CONTENT[next];
    if (content && content.built) {
      content.launch();
    } else {
      showProximamente();
    }
  }
```

- [ ] **Step 4: Agregar `showProximamente` inmediatamente después**

```js
  // Muestra un aviso de "próximamente" cuando el siguiente nodo no tiene
  // contenido construido, y ofrece al jugador reiniciar.
  function showProximamente() {
    showMsg("Has llegado al límite del contenido actual  ·  PRÓXIMAMENTE más");
    state.confirmRestart = true;
  }
```

- [ ] **Step 5: Verificar que las 4 funciones están en orden correcto**

En `game.js`, buscar `computeMapState` — debe aparecer antes de `// ============ FIN BODY-MAP`. Buscar `showProximamente` — debe aparecer justo después de `launchNextContent`.

- [ ] **Step 6: Commit**

```bash
git add game.js
git commit -m "feat(map-unlock): computeMapState + enterBodyMapForState + launchNextContent + showProximamente"
```

---

## Task 3: Integrar en `exitHeroLevel`

**Files:**
- Modify: `game.js:22968`

- [ ] **Step 1: Leer la función actual para verificar la línea exacta**

La función actual (~línea 22968) es:

```js
  function exitHeroLevel(outcome) {
    // outcome: "win" | "lose" | "abort" (debug)
    if (outcome === "win" && state.heroLevel) {
      state.heroLevelMedals[state.heroLevel.organ] = true;
    }
    state.heroLevel = null;
  }
```

- [ ] **Step 2: Reemplazar `exitHeroLevel` con la versión nueva**

```js
  function exitHeroLevel(outcome) {
    // outcome: "win" | "lose" | "abort" (debug)
    var organ = state.heroLevel ? state.heroLevel.organ : null;
    // completedMapNodes.dissem es true solo después del pendingHeroLevel post-diseminación.
    // Si es false, este hero level es la cinemática mid-dissem (narrativa, no secuencia principal).
    var isMainSequence = !!(state.completedMapNodes && state.completedMapNodes.dissem);

    if (outcome === "win" && organ) {
      state.heroLevelMedals[organ] = true;
      if (isMainSequence && (organ === "piel" || organ === "pielvaso")) {
        state.completedMapNodes["h_fase1"] = true;
      }
      // Futuros: agregar aquí el mapeo organ → completedMapNodes key cuando se
      // construyan los hero levels de corazon/hueso/articulacion.
    }
    state.heroLevel = null;
    // Mostrar mapa solo en la secuencia principal (no en la cinemática mid-dissem).
    // "abort" (debug) tampoco muestra el mapa.
    if (isMainSequence && (outcome === "win" || outcome === "lose")) {
      enterBodyMapForState();
    }
  }
```

- [ ] **Step 3: Test manual — cinemática mid-dissem no muestra mapa**

1. Abrir `https://immunodefense.vercel.app` (o localhost).
2. Jugar Fase 1 hasta ganar → ir a Diseminación.
3. Esperar ~4.5s → la cinemática de Piel debe arrancar.
4. Completar el hero level de Piel/PielVaso.
5. Verificar: al terminar PielVaso, NO aparece el mapa (porque `completedMapNodes.dissem` es false en este punto). El juego vuelve a Diseminación.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat(map-unlock): exitHeroLevel marca h_fase1 y muestra mapa en secuencia principal"
```

---

## Task 4: Integrar en el handler de `pendingHeroLevel` (post-diseminación)

**Files:**
- Modify: `game.js:24629`

**Nota:** la condición en `enterDissemination()` (~línea 4047) tiene un bug — compara `!state.heroLevelPlayed` (siempre false porque `{}` es truthy) en vez de `!state.heroLevelPlayed.piel`. En la práctica, el pendingHeroLevel mid-dissem NUNCA se dispara: solo existe el pendingHeroLevel post-diseminación (disparado desde `disseminationOver`). El plan simplifica el handler directamente.

- [ ] **Step 1: Leer el bloque actual (~líneas 24629-24670)**

El bloque actual es:

```js
    if (state.pendingHeroLevel) {
      state.pendingHeroLevel.delay -= dt;
      if (state.pendingHeroLevel.delay <= 0) {
        var pending = state.pendingHeroLevel;
        state.pendingHeroLevel = null;
        state.heroLevelPlayed = state.heroLevelPlayed || {};
        var winningOrgan = (state.disseminationOver && state.disseminationOver.organ)
          ? state.disseminationOver.organ.id
          : "corazon";
        var unlockedF2 = ORGAN_TO_F2[winningOrgan] || "endocarditis";
        var f2Subtitle = F2_SUBTITLE[unlockedF2] || "";
        state.unlockedF2 = unlockedF2;
        state.lastDisseminationMode = state.disseminationOver ? state.disseminationOver.mode : null;
        state.disseminationOver = null;
        enterBodyMap({
          currentNode: "dissem",
          availableNodes: [unlockedF2, "h_fase1"],
          forkOpen: true,
          title: "DISEMINACIÓN COMPLETA",
          subtitle: f2Subtitle + " · héroes pueden empezar por la piel",
          onContinue: function () {
            state.heroLevelPlayed[pending.organ] = true;
            var heroOrgan = HERO_LEVEL_BUILT.indexOf(pending.organ) !== -1 ? pending.organ : "piel";
            enterHeroLevel(heroOrgan);
          }
        });
      }
    }
```

- [ ] **Step 2: Reemplazar el bloque con la versión simplificada**

```js
    if (state.pendingHeroLevel) {
      state.pendingHeroLevel.delay -= dt;
      if (state.pendingHeroLevel.delay <= 0) {
        state.pendingHeroLevel = null;
        // Este handler solo se dispara tras disseminationOver (el trigger
        // mid-dissem de enterDissemination() tiene un bug que lo inhibe).
        if (state.disseminationOver) {
          var winningOrgan = state.disseminationOver.organ.id;
          var unlockedF2 = ORGAN_TO_F2[winningOrgan] || "endocarditis";
          state.unlockedF2 = unlockedF2;
          state.lastDisseminationMode = state.disseminationOver.mode;
          state.disseminationOver = null;
          // Marcar dissem completo + mostrar mapa.
          // CONTINUAR → launchNextContent() → enterHeroLevel("piel") via MAP_NODE_CONTENT.
          state.completedMapNodes = state.completedMapNodes || {};
          state.completedMapNodes.dissem = true;
          enterBodyMapForState();
        }
      }
    }
```

- [ ] **Step 3: Test manual — post-diseminación muestra mapa correcto**

1. Jugar Diseminación hasta que terminen las 6 olas (win o lose).
2. Esperar ~3-5 segundos.
3. Verificar: el mapa aparece con `dissem` como nodo actual y `h_fase1` como disponible (pulsando en dorado).
4. Tocar CONTINUAR.
5. Verificar: arranca el hero level de Piel (cinemática).
6. Completar Piel + PielVaso.
7. Verificar: el mapa aparece de nuevo con `h_fase1` como done y el nodo F2 como próximo (en gris, no disponible, si F2 TD no está construido).
8. Tocar CONTINUAR.
9. Verificar: aparece el mensaje "Has llegado al límite..." y `confirmRestart` se activa.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat(map-unlock): pendingHeroLevel separa cinemática mid-dissem de secuencia principal post-dissem"
```

---

## Task 5: Integrar en `phaseTransition` (Fase 1 → Diseminación)

**Files:**
- Modify: `game.js:24730`

- [ ] **Step 1: Leer el bloque actual (~líneas 24727-24742)**

```js
          var ptOutcome = state.phaseTransition.outcome;
          var ptVictory = ptOutcome === "victory" || ptOutcome === "contained";
          var ptContained = ptOutcome === "contained";
          enterBodyMap({
            currentNode: "fase1",
            availableNodes: ["dissem"],
            forkOpen: false,
            title: ptContained ? "CONTENCIÓN ROTA" : (ptVictory ? "¡MRSA DERROTADO!" : "FASE 1 SUPERADA"),
            subtitle: ptContained
              ? "La controlaste casi por completo — pero algo logró escapar hacia el torrente sanguíneo"
              : (ptVictory
                ? "Contuviste la infección en la piel — pero ya alcanzó el torrente sanguíneo"
                : "La infección rompe la barrera de la piel · diseminación inminente"),
            onContinue: function () { enterDissemination(); }
          });
```

- [ ] **Step 2: Reemplazar con la versión que marca fase1 completo y usa `enterBodyMapForState`**

```js
          var ptOutcome = state.phaseTransition.outcome;
          var ptVictory = ptOutcome === "victory" || ptOutcome === "contained";
          var ptContained = ptOutcome === "contained";
          // Marcar Fase 1 como completada antes de mostrar el mapa.
          state.completedMapNodes = state.completedMapNodes || {};
          state.completedMapNodes.fase1 = true;
          // Los títulos de Fase 1 varían según el outcome narrativo (victory/
          // contained/overload), así que se pasan como override en vez de
          // usar MAP_COMPLETED_LABELS["fase1"] que es el texto genérico.
          enterBodyMapForState({
            title: ptContained ? "CONTENCIÓN ROTA" : (ptVictory ? "¡MRSA DERROTADO!" : "FASE 1 SUPERADA"),
            subtitle: ptContained
              ? "La controlaste casi por completo — pero algo logró escapar hacia el torrente sanguíneo"
              : (ptVictory
                ? "Contuviste la infección en la piel — pero ya alcanzó el torrente sanguíneo"
                : "La infección rompe la barrera de la piel · diseminación inminente")
          });
          // onContinue ya no se pasa aquí: enterBodyMapForState lo setea a
          // launchNextContent(), que llama enterDissemination() vía MAP_NODE_CONTENT.
```

- [ ] **Step 3: Test manual — transición Fase 1 → Diseminación**

1. Jugar Fase 1 hasta ganar (derrotar al boss).
2. Verificar: aparece el mapa con `fase1` como nodo actual y `dissem` como disponible.
3. Tocar CONTINUAR.
4. Verificar: empieza Diseminación normalmente.
5. Verificar: `#bodymap=fase1` en la URL sigue funcionando como acceso directo de debug.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat(map-unlock): phaseTransition marca fase1 completo y usa enterBodyMapForState"
```

---

## Task 6: Smoke test del flujo completo

No hay test framework — esta tarea es validación manual en el navegador.

- [ ] **Step 1: Verificar flujo happy path completo**

Jugar la secuencia entera y confirmar cada transición:

| Transición | Mapa esperado | CONTINUAR esperado |
|---|---|---|
| Fase1 boss vence | fase1=current, dissem=possible | enterDissemination |
| Dissem 6 olas (win/lose) | dissem=current, h_fase1=possible | enterHeroLevel("piel") |
| PielVaso boss vence | h_fase1=current, {f2}=possible (bloqueado) | showProximamente |
| Cinemática mid-dissem (4.5s) | sin mapa | arranca piel hero directo |

- [ ] **Step 2: Verificar que debug URLs siguen funcionando**

- `#hero=pielvaso` → arranca pielvaso sin mapa
- `#hero=corazon` → arranca corazon sin mapa
- `#bodymap=fase1` → muestra el mapa en estado fase1 (preset existente)

- [ ] **Step 3: Verificar edge case — `"lose"` en hero level post-dissem**

1. Llegar al hero level de Piel (post-dissem).
2. Usar el botón EXIT del plataformero (que llama `exitHeroLevel("abort")`) — no debe mostrar el mapa.
3. Forzar una derrota si hay mecánica de HP (outcome "lose") — debe mostrar el mapa con h_fase1 todavía disponible (retry).

- [ ] **Step 4: Verificar que `completedMapNodes` persiste a través del hero level mid-dissem**

Después de completar el hero level mid-dissem (Use 1), confirmar en devtools que `state.completedMapNodes.dissem` sigue siendo `undefined` o `false` (no fue marcado por el Use 1, solo por Use 2).

- [ ] **Step 5: Commit final si todo OK**

```bash
git add game.js
git commit -m "test(map-unlock): smoke test del flujo completo verificado manualmente"
```

---

## Notas de extensibilidad

Cuando se construya nuevo contenido (ej. Endocarditis TD):
1. Agregar a `MAP_NODE_CONTENT`: `"endocarditis": { built: true, launch: function() { enterEndocarditisTD(); } }`
2. En el exit handler de Endocarditis TD: `state.completedMapNodes.endocarditis = true; enterBodyMapForState();`
3. Agregar a `MAP_COMPLETED_LABELS` el título correspondiente.
4. Nada más — `computeMapState` lo recoge automáticamente.

Para h_endocarditis (Corazón):
1. Agregar a `MAP_NODE_CONTENT`: `"h_endocarditis": { built: true, launch: function() { enterHeroLevel("corazon"); } }`
2. En `exitHeroLevel`, agregar el mapeo `organ === "corazon"` → `completedMapNodes.h_endocarditis = true`.
