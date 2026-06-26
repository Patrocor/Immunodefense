# Sistema de mapa con bloqueo/desbloqueo en cadena

**Fecha:** 2026-06-26
**Estado:** Aprobado

## Contexto

El mapa-mundo (`drawBodyMap`) existe visualmente desde hace tiempo, pero su lógica de desbloqueo está hardcodeada: cada transición llama `enterBodyMap` con `availableNodes` y `currentNode` fijos. No hay estado persistente que represente el progreso real del jugador, y cuando un hero level termina (`exitHeroLevel`), el juego simplemente hace `state.heroLevel = null` sin mostrar el mapa ni enrutar al siguiente contenido.

## Objetivo

Convertir el mapa en una fuente de verdad real del progreso:
- Cada pieza de contenido completada actualiza un estado persistente
- El mapa se muestra automáticamente después de cada pieza
- `CONTINUAR` lanza el siguiente contenido según reglas, sin hardcodeo disperso
- Nodos no construidos muestran "próximamente" en vez de romper el juego

## Regla central de desbloqueo

**El germen va siempre un paso adelante del héroe.**

La narrativa: los gérmenes avanzan a un nuevo órgano, los héroes los persiguen a través del camino que dejaron. Por eso la secuencia alterna germ → hero → germ → hero.

## Secuencia lineal completa

El fork F2 ya fue determinado por `state.unlockedF2` (resultado de la diseminación), así que el camino es lineal. Usando `f2 = state.unlockedF2` y `hf2 = "h_" + f2`:

```
fase1 → dissem → h_fase1 → {f2} → h_dissem → {f3} → h_{f2} → sepsis → h_sepsis → mods → h_mods
```

Donde `{f3}` se determina cuando el jugador llega a ese punto (`state.activeF3`).

## Sección 1 — Modelo de datos

### Nuevo campo en `state` (en `newState()`)

```js
completedMapNodes: {}   // nodeKey → true cuando esa pieza de contenido fue completada
```

### Campos existentes que se reutilizan

- `state.unlockedF2` — qué nodo F2 abrió la diseminación
- `state.heroLevelMedals` — se sincroniza a `completedMapNodes` al terminar hero levels con "win"
- `state.activeF3` — qué nodo F3 está activo (se define cuando se llega a ese punto; null mientras tanto)

### Cuándo marcar cada nodo completo

| Nodo | Trigger existente |
|------|------------------|
| `fase1` | Al entrar a `phaseTransition` con target `"dissemination"` |
| `dissem` | Al resolver `disseminationOver` (antes de `enterBodyMapForState`) |
| `h_fase1` | En `exitHeroLevel("win")` cuando `state.heroLevel.organ` es `"piel"` o `"pielvaso"` |
| `{f2}` | Cuando se construya F2 TD: en su exit/win handler |
| `h_dissem` | Cuando se construya h_dissem hero level: en `exitHeroLevel("win")` |
| `h_{f2}` | Cuando se construya h_endocarditis/etc.: en `exitHeroLevel("win")` |
| Siguientes | Mismo patrón: exit handler del contenido correspondiente |

## Sección 2 — Función de reglas: `computeMapState`

Deriva `{ currentNode, availableNodes }` desde `state`. No tiene side-effects.

```js
function computeMapState(state) {
  var done = state.completedMapNodes || {};
  var f2   = state.unlockedF2 || "endocarditis";
  var hf2  = "h_" + f2;
  var f3   = state.activeF3 || null;

  var sequence = [
    "fase1", "dissem", "h_fase1",
    f2, "h_dissem",
    f3, hf2,
    "sepsis", "h_sepsis",
    "mods", "h_mods"
  ].filter(Boolean);   // elimina null cuando f3 todavía no está definido

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

## Sección 3 — Tabla de títulos automáticos

`MAP_COMPLETED_LABELS[nodeKey]` define el título y subtítulo del mapa al completar ese nodo. Se elimina el patrón de pasar strings hardcodeados en cada llamada a `enterBodyMap`.

```js
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
  // F3 y h_{f2} se agregan cuando se construyan
};
```

Para los casos especiales de Fase 1 que ya tienen títulos distintos según outcome (victory/contained/overload), `enterBodyMapForState` acepta un `titleOverride` opcional que tiene precedencia.

## Sección 4 — `enterBodyMapForState` y `launchNextContent`

### `enterBodyMapForState(titleOverride?)`

Reemplaza todos los calls hardcodeados a `enterBodyMap`. Deriva todo desde `state`.

```js
function enterBodyMapForState(titleOverride) {
  var ms     = computeMapState(state);
  var labels = (ms.currentNode && MAP_COMPLETED_LABELS[ms.currentNode]) || {};
  enterBodyMap({
    currentNode:    ms.currentNode,
    availableNodes: ms.availableNodes,
    forkOpen:       ms.availableNodes.length > 0,
    title:          (titleOverride && titleOverride.title)    || labels.title    || "MAPA DE LA INVASIÓN",
    subtitle:       (titleOverride && titleOverride.subtitle) || labels.subtitle || "",
    onContinue:     launchNextContent
  });
}
```

### `launchNextContent()`

```js
var MAP_NODE_CONTENT = {
  // TD — ya jugados, no se rejuegan
  "fase1":  { built: false },
  "dissem": { built: false },
  // Hero levels construidos
  "h_fase1": { built: true, launch: function() { enterHeroLevel("piel"); } },
  // F2+ se agrega aquí cuando se construya:
  // "endocarditis": { built: true, launch: function() { enterF2TD("endocarditis"); } },
  // "h_endocarditis": { built: true, launch: function() { enterHeroLevel("corazon"); } },
};

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

### `showProximamente()`

Pantalla breve (2-3s) sobre fondo oscuro con el mapa visible detrás, texto "PRÓXIMAMENTE" pulsante, luego vuelve al título. Evita que el juego quede en un estado sin salida cuando el siguiente nodo no tiene contenido construido.

## Sección 5 — Puntos de integración (cambios en código existente)

### 1. En `phaseTransition` (al disparar → dissemination)

**Antes:** `enterBodyMap({ currentNode: "fase1", availableNodes: ["dissem"], ... })` con título manual.

**Después:**
```js
state.completedMapNodes.fase1 = true;
enterBodyMapForState({ title: ptTitle, subtitle: ptSubtitle });
// ptTitle/ptSubtitle siguen dependiendo del outcome (victory/contained/overload)
// para preservar los textos narrativos existentes.
```

### 2. En `disseminationOver` resolver

**Antes:** `enterBodyMap({ currentNode: "dissem", availableNodes: [unlockedF2, "h_fase1"], ... })` con `onContinue` hardcodeado a `enterHeroLevel("piel")`.

**Después:**
```js
state.completedMapNodes.dissem = true;
enterBodyMapForState();
// computeMapState devuelve availableNodes: ["h_fase1"] (correcto)
// launchNextContent lanza enterHeroLevel("piel") via MAP_NODE_CONTENT
```

### 3. En `exitHeroLevel` (NUEVO — hoy no hace nada más que `state.heroLevel = null`)

```js
function exitHeroLevel(outcome) {
  var organ = state.heroLevel ? state.heroLevel.organ : null;
  if (outcome === "win" && organ) {
    state.heroLevelMedals[organ] = true;
    // Mapear organ → map node key
    if (organ === "piel" || organ === "pielvaso") {
      state.completedMapNodes["h_fase1"] = true;
    }
    // Futuros: "corazon" → completedMapNodes["h_endocarditis"] = true, etc.
  }
  state.heroLevel = null;
  // Si terminó con win o lose (no abort), mostrar mapa actualizado
  if (outcome === "win" || outcome === "lose") {
    enterBodyMapForState();
  }
}
```

`"lose"` también muestra el mapa (con el mismo nodo disponible — el jugador puede reintentar). `"abort"` (debug) no muestra nada.

## Sección 6 — Nodos no construidos vs. locked

El visual del mapa ya tiene `nodeState` con valores: `"done"`, `"current"`, `"possible"`, `"future"`, `"hidden"`. No se cambia el render. La distinción semántica nueva:

| Estado | Qué significa | Visual actual |
|--------|--------------|---------------|
| `done` | Completado por el jugador | Checkmark, gris cálido |
| `current` | Último completado | Animación de pulso |
| `possible` | Disponible ahora (puede ser unbuilt) | Pulso dorado |
| `future` | Bloqueado (prerequisito no cumplido) | Gris tenue |

Un nodo `possible` con contenido no construido se ve igual que uno construido en el mapa. La diferencia aparece solo al tocar CONTINUAR: lanza el contenido o muestra "próximamente". No se agrega un estado visual nuevo por ahora.

## Extensibilidad

Cuando se construya contenido nuevo (ej. Endocarditis TD):
1. Agregar `"endocarditis": { built: true, launch: function() { ... } }` a `MAP_NODE_CONTENT`
2. En el exit handler de ese TD, hacer `state.completedMapNodes["endocarditis"] = true`
3. Listo — `computeMapState` y `enterBodyMapForState` lo recogen automáticamente

No hay que editar la función de reglas ni el mapa visual.

## Contenido de debug (sin cambios)

`#hero=pielvaso`, `#hero=corazon`, etc. siguen funcionando como acceso directo de debug. No se conectan al sistema de unlock — son bypasses explícitos para pruebas.
