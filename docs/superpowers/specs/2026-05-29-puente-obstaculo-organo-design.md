# Refinamiento de la fase Diseminación

Fecha: 2026-05-29
Estado: diseño aprobado (v2 — expandido tras prueba en vivo), listo para writing-plans
Spec antecesora: [2026-05-28-nivel-puente-diseminacion-design.md](2026-05-28-nivel-puente-diseminacion-design.md)

## Resumen

Este refinamiento toca 4 áreas del nivel puente:

1. **Transición cinemática** al entrar al puente — orden invertido para que la "rajadura" preceda visualmente a los 5 carriles.
2. **Barrera mecánica con HP por órgano** justo antes de cada puerta. Cada barrera tiene textura biológica propia y absorbe gérmenes hasta romperse. Reemplaza el concepto "membrana visual" del spec original.
3. **Sistema de Antígenos** — moneda nueva que sueltan los gérmenes muertos.
4. **Panel de Respuestas Inmunes** — 3 cartas nuevas que se compran con Antígenos: Célula Dendrítica, NETosis, Plaquetas.

Además, dos ajustes de roster en diseminación: **quitar Antiséptico** (no aplica fuera de piel) y mantener Macrófago + resto de torres existentes.

## Objetivo

Convertir la fase Diseminación de un "campo abierto con discos al final" a un nivel con identidad mecánica propia: barreras tisulares que el jugador siente que está defendiendo, economía de gérmenes muertos, y respuestas inmunes que recompensan jugar bien la temprana.

## No-objetivos

- ❌ Tocar la mecánica X/10 del contador del órgano (sigue 0..10, sigue disparando "PRÓXIMAMENTE FASE 2" al 10).
- ❌ Cambiar el path/trayectoria del germen.
- ❌ Tocar Fase 1 (skin level, oleadas 1-18). Todos los cambios viven dentro de `if (state.dissemination)`.
- ❌ Rediseñar el HUD principal (ATP, vidas, ola).
- ❌ Música nueva. Algún SFX corto sí.

---

## 1. Transición cinemática (fix de orden)

### Problema actual

Al entrar al puente (`enterDissemination()` en `index.html:1607`), el render dibuja primero `drawDisseminationField` (los 5 carriles ya visibles) y encima `drawDisseminationIntro` con velo + rajaduras. Pero el velo arranca con `bgAlpha = 0` y sube a `0.88` en 0.5s — durante ese medio segundo el jugador ve los 5 carriles sin contexto.

Código actual (`index.html:10430-10435`):
```js
var bgAlpha;
if (elapsed < 0.5) bgAlpha = (elapsed / 0.5) * 0.88;   // fade IN
else if (elapsed < 2.9) bgAlpha = 0.88;
else bgAlpha = Math.max(0, 0.88 * (1 - (elapsed - 2.9) / 1.1));
```

### Solución

Invertir: empezar con velo **opaco** sobre los carriles, mostrar la rajadura + texto, y solo al final fade-out para revelar el campo.

Nueva curva de `bgAlpha` (con duración total 4.0s):

| elapsed | bgAlpha | Visible |
|---|---|---|
| 0.0 – 0.4s | 1.0 | Negro total + cinemática arrancando |
| 0.4 – 2.6s | 0.95 | Rajadura + texto "LA BARRERA CAYÓ" + subtítulo |
| 2.6 – 3.6s | 0.95 → 0 | Fade-out revela los 5 carriles |
| 3.6 – 4.0s | 0 | Cinemática terminada, hand-off al campo |

Sin cambios en el contenido visual (rajaduras, texto, flash radial — todo igual). Solo cambia la curva del velo de fondo y se ajusta el timing de los textos para que casen con la nueva ventana.

---

## 2. Barrera mecánica por órgano

### Concepto

Cada uno de los 5 carriles tiene una **barrera tisular** posicionada justo antes de la puerta del órgano. La barrera tiene HP. Cuando un germen llega a ella:

- **Si HP > 0**: el germen muere instantáneamente al impactar, barrera pierde `1 HP`, contador del órgano (`X/10`) **no se mueve**.
- **Si HP = 0** (barrera rota): el germen pasa, suma `+1` a `disseminationOrganLoad[lane]`, y se acciona el comportamiento actual.

### Identidad biológica + HP máximo

| Órgano | Barrera | HP máx | Razonamiento clínico |
|---|---|---|---|
| Corazón | **Pericardio** | 12 | Saco fibroso resistente, infectarlo cuesta. |
| Hueso | **Periostio** | 10 | Membrana fibrovascular, también gruesa. |
| Pulmón | **Pleura** | 8 | Membrana doble, pero más delgada. |
| Articulación | **Cápsula sinovial** | 7 | Fina y mucho menor presión inmune in situ. |
| Sangre | **Endotelio vascular** | 6 | Una sola capa celular — la más vulnerable, refleja por qué la sepsis es lo peor. |

Estos valores son **iniciales**; se ajustarán en playtests.

### Estado y regeneración

- `state.disseminationBarrierHP = [12, 8, 6, 10, 7]` — orden = índice de `DISSEMINATION_ORGANS` (`index.html:1209`): `[corazón, pulmón, sangre, hueso, articulación]`. Es decir: corazón=12, pulmón=8, sangre=6, hueso=10, articulación=7.
- `state.disseminationBarrierMax = [12, 8, 6, 10, 7]` — copia inmutable, usada para regeneración (no superar) y para el ratio del HUD.
- `state.disseminationBarrierBroken = [false, false, false, false, false]` — flag separado para no confundir "0 HP por daño" con "rota permanentemente".

Cuando una barrera llega a 0 HP por primera vez:
- `disseminationBarrierBroken[lane] = true`
- Cinemática corta de "barrera cediendo": 0.5s de flash rojo + shake en ese carril + sonido (`playerHurt` reusado).
- A partir de ahí, gérmenes en ese carril suman al X/10 normalmente.

**Regeneración**: al final de cada wave (en el callback que ya existe en `startNextDisseminationWave`):
```js
for (var b = 0; b < state.disseminationBarrierHP.length; b++) {
  if (!state.disseminationBarrierBroken[b]) {
    state.disseminationBarrierHP[b] = Math.min(
      state.disseminationBarrierMax[b],
      state.disseminationBarrierHP[b] + 1
    );
  }
}
```

Una barrera rota **no se regenera** — la integridad celular se perdió.

### Visual de la barrera

Reusamos el diseño del spec original (texturas por órgano, etiqueta histológica, degradación con load), pero la "fuente del estado visual" ahora es `disseminationBarrierHP / disseminationBarrierMax` en vez de `disseminationOrganLoad`.

| Ratio `HP / max` | Estado |
|---|---|
| > 0.7 | Sana. Pattern limpio + bordes nítidos del color del órgano. |
| 0.4 – 0.7 | Inflamación leve. Overlay rojo `rgba(255,90,90, (1-r) * 0.25)`. |
| 0.0 – 0.4 (no rota) | Inflamación + 1-3 agujeros oscuros (cantidad = `floor((0.4 - r) * 10)`, posiciones deterministas por organId). |
| `barrierBroken[k] = true` | Barrera totalmente rota: franja oscura con bordes rojos rotos. Los gérmenes la cruzan visualmente sin tocarla. |

Al impactar un germen (independiente del HP), reusamos `disseminationFlash[lane]` actual: flash radial + rasgadura momentánea en el punto de impacto.

### Texturas por órgano (reusadas del spec original)

| Órgano | Pattern | TISSUE_LABEL |
|---|---|---|
| Corazón | Fibras de miocardio estriado | "pericardio" |
| Pulmón | Alvéolos | "pleura" |
| Sangre | Eritrocitos bicóncavos | "endotelio vascular" |
| Hueso | Trabéculas óseas | "periostio" |
| Articulación | Cartílago hialino con grietas finas | "cápsula sinovial" |

(Los TISSUE_LABEL cambian respecto al spec v1 para reflejar el nombre biológico de la barrera específica.)

### Interacción con el trigger de cruce existente

El código actual en `index.html:2234-2258` detecta cuando un germen cruza el threshold de absorción y suma al `disseminationOrganLoad`. Ese bloque se modifica:

```js
if (state.dissemination) {
  // Nuevo: ¿hay barrera viva en este carril?
  var lane = hi;
  if (!state.disseminationBarrierBroken[lane] && state.disseminationBarrierHP[lane] > 0) {
    // Germen absorbido por la barrera.
    state.disseminationBarrierHP[lane] -= 1;
    state.disseminationFlash[lane] = 0.6;
    triggerShake(0.08, 2);  // shake leve, no como el de organ-load
    spawnAntigenDrop(e.x, e.y);   // suelta un Antígeno
    e.dead = true;
    // Detectar si esta es la ruptura.
    if (state.disseminationBarrierHP[lane] <= 0) {
      state.disseminationBarrierBroken[lane] = true;
      triggerShake(0.35, 6);
      sfx("playerHurt");
      // Cinemática corta de "barrera cediendo" — handled by render via flag.
      state.disseminationBarrierBreakAt = state.time;
      state.disseminationBarrierBreakLane = lane;
    }
    continue;
  }
  // Comportamiento actual (barrera rota): suma a organ load.
  state.disseminationOrganLoad[lane] = (state.disseminationOrganLoad[lane] || 0) + 1;
  // ... resto del flujo existente ...
}
```

---

## 3. Sistema de Antígenos

### Concepto

Cada germen que muere (por la razón que sea: barrera, torre, NET, lo que sea) suelta **1 Antígeno** — un drop tappeable que el jugador recoge para alimentar las Respuestas Inmunes.

### Comportamiento del drop

- **Spawn**: al morir un germen, llamar `spawnAntigenDrop(x, y)` que pushea a `state.antigens` un objeto:
  ```js
  { x, y, age: 0, ttl: 10.0, collected: false, vy: -8*U, vx: (Math.random()-0.5)*4*U }
  ```
- **Visual**: círculo amarillo radial `#ffd24a` de `4*U` con halo `rgba(255,210,74, pulse)` pulsando 1.2Hz. Texto centrado "!" en `#5a3a08`.
- **Movimiento**: arcaico — sube ligero por 0.4s (`vy negativo, lerp a 0`), luego cae con gravedad muy leve (`vy += 4*U*dt`) y rebota una vez al chocar contra el borde inferior del campo.
- **Auto-collect**: a los `10s` (ttl), si no fue recogido, se auto-recoge con una animación de flecha hacia el contador de Antígenos en el HUD. No se pierde nunca.
- **Tap**: detecta click/tap dentro de radio `8*U`. Al recogerse: `state.antigens.count += 1`, partícula de "subida" hacia el contador en el HUD, `sfx("collect")` (reusable si hay; si no, una variante corta).

### HUD del contador

Arriba a la izquierda, debajo del contador de ATP (o donde encaje en el HUD actual):

```
[ !  7  ANTÍGENOS ]
```

Píldora con fondo `rgba(30,15,20,0.85)`, borde `#ffd24a`, icono "!" en círculo, número grande, label compacta.

### Estado nuevo

```js
state.antigens = {
  count: 0,
  drops: [],       // array de { x, y, age, ttl, collected, vx, vy }
};
```

Reset en `enterDissemination()`:
```js
state.antigens = { count: 0, drops: [] };
```

---

## 4. Panel de Respuestas Inmunes

### Ubicación en la UI

Fila nueva **debajo** del panel actual de torres en el bottom panel del campo. Se renderiza **solo cuando `state.dissemination === true`**. En Fase 1 no aparece.

Layout:
- Separador horizontal punteado amarillo `rgba(255,210,74,0.20)` arriba de la fila.
- Etiqueta a la izquierda en pequeño: `RESPUESTAS INMUNES (Antígenos)`.
- 3 cartas, cada una `180×38 px` (aprox. en U=1), borde de color por carta, fondo oscuro.
- Si el jugador no tiene suficientes Antígenos para una carta, esa carta se renderiza con `globalAlpha = 0.4`.

### Carta A — Célula Dendrítica (auto)

- **Costo**: 4 Antígenos.
- **Borde**: `#a872d8` (púrpura).
- **Icono**: símbolo "▼T" en círculo púrpura.
- **Trigger**: tap directo en la carta (sin seleccionar carril).
- **Efecto**: spawnea 3 Linfocitos T citotóxicos en un punto aleatorio del campo. Cada uno:
  - Reusa el sprite + AI del Linfocito T existente.
  - Busca el germen vivo más cercano, lo persigue, ataca cuerpo-a-cuerpo (5 dmg cada 0.5s).
  - Vive `8s` y luego desaparece con un fade.
  - Independientes del jugador (no ocupan slot, no pueden ser vendidos).
- **Implementación**: usar `state.guardians.push(...)` con un nuevo tipo `dendriticT` que envuelve el comportamiento del T existente con un timer de auto-destrucción.

### Carta B — NETosis (manual + carril)

- **Costo**: 3 Antígenos.
- **Borde**: `#f0a050` (naranja-oro).
- **Icono**: símbolo "◈" en círculo dorado.
- **Trigger**: tap en la carta → carta queda "armada" (highlight, cursor cambia) → tap en un carril del campo dispara la NET ahí.
- **Efecto en el carril**:
  - Renderiza una red de ADN (líneas finas radiales + zigzags) en un área `60×40 U` centrada en el punto de tap.
  - Todos los gérmenes en esa área entran en estado `nettedAt = state.time` y:
    - Velocidad multiplicada por `0.0` (inmóviles) durante la duración.
    - Reciben `2 dmg/s` por contacto con la red.
    - Visual: tinte rojo + líneas blancas conectándolos a la red.
  - La red dura `4s`, fade-out en el último segundo.
- **Implementación**: pushear a un nuevo array `state.nets`, manejado en su propio `updateNets(dt)` y `drawNets()`.

### Carta C — Plaquetas / Trombo (manual + carril)

- **Costo**: 5 Antígenos.
- **Borde**: `#e8a020` (oro intenso).
- **Icono**: símbolo "●●" (dos plaquetas).
- **Trigger**: igual a NETosis — armar carta → tap en carril.
- **Efecto en el carril**:
  - Aparece un coágulo: óvalo rojo oscuro con plaquetas amarillas adentro y fibrina (líneas finas) conectándolas.
  - **Bloquea todo movimiento** de gérmenes en ese carril durante `6s` (los gérmenes que llegan al trombo se quedan pegados ahí).
  - **Daña** `4 dmg/s` a cualquier germen tocando el trombo.
  - Visual: el carril completo se ve con un anillo dorado pulsante.
  - Dura `6s`, fade-out en el último segundo.
- **Implementación**: array `state.thrombi`, similar a `state.nets`.

### Concurrencia y stacking

Sin límite global. Reglas concretas:

- **Dendrítica**: se puede activar N veces seguidas si hay Antígenos. Cada activación spawnea sus propios 3 Ts; pueden coexistir 6, 9, etc. en el campo.
- **NETosis y Plaquetas**: por-carril. Pueden coexistir múltiples NETs/Trombos en distintos carriles a la vez, pero **no** dos NETs en el mismo carril ni dos Trombos en el mismo carril ni una NET + Trombo en el mismo carril (las efectos de área se pisarían visualmente).

Si el jugador intenta plantar una segunda NET/Trombo sobre un carril que ya tiene un efecto activo → la carta queda visualmente "armada" pero el tap en el carril **no consume Antígenos** y muestra un mensaje breve "Ya hay un efecto en este carril".

---

## 5. Ajustes al roster de torres en diseminación

Estado actual: el panel de torres muestra todo lo desbloqueado de Fase 1 (Antiséptico, Macrófago, Linfocito B, Linfocito T, MAC, etc.).

Cambio:
- **Quitar Antiséptico** del panel cuando `state.dissemination === true`. Razón: el antiséptico es tópico (piel), no aplica una vez la infección ya está diseminada en sangre.
- **Mantener** Macrófago, Linfocito B, Linfocito T, MAC y demás (todas las torres "inmunes").

Implementación: en el callback que genera el panel de cartas en bottom, filtrar `if (state.dissemination && card.type === "antiseptico") return false`.

---

## Arquitectura del código

Todo dentro de `index.html`. Sin archivos nuevos.

### Nuevas funciones

- `getOrganPattern(organId): CanvasPattern` — genera y cachea patterns (igual que spec v1).
- `organIdSeed(id): number` — semilla determinista (igual que v1).
- `drawOrganBarrier(x, yDoor, organ, hp, hpMax, broken, flash)` — reemplaza el viejo `drawOrganMembrane` del v1. Pinta la banda + bordes + label + degradación según `hp/hpMax` + flash si aplica.
- `drawBarrierHpBar(x, y, hp, hpMax, organ)` — barrita debajo de la banda con color verde→amarillo→rojo según ratio. Texto "HP / max" centrado.
- `spawnAntigenDrop(x, y)` — pushea drop a `state.antigens.drops`.
- `updateAntigenDrops(dt)` — física + ttl + auto-collect.
- `drawAntigenDrops()` — pulse + halo.
- `drawAntigenHud()` — píldora con `! N ANTÍGENOS`.
- `drawImmuneResponsePanel()` — renderiza la fila nueva debajo de las torres.
- `tryActivateResponse(type, lane?)` — punto único de gasto de Antígenos + spawn del efecto.
- `updateNets(dt)` / `drawNets()` — manejo de NETosis.
- `updateThrombi(dt)` / `drawThrombi()` — manejo de Plaquetas.
- `spawnDendriticTCells()` — pushea 3 Ts temporales a `state.guardians`.

### Modificaciones a funciones existentes

- `enterDissemination` — añadir setup de `state.disseminationBarrierHP/Max/Broken`, `state.antigens`, `state.nets`, `state.thrombi`.
- `startNextDisseminationWave` — regeneración +1 HP por barrera no rota al inicio.
- Bloque de absorción en `updateEnemies` (`index.html:2234-2258`) — lógica nueva descrita en sección 2.
- Cualquier punto donde muere un germen (varios sites de daño) — añadir `spawnAntigenDrop(e.x, e.y)` antes del `e.dead = true`. Hay que auditar para que el drop se cree **una sola vez** por germen.
- `drawDisseminationField` — añadir `drawOrganBarrier` antes de `drawOrganDoor` (similar a v1).
- `drawDisseminationIntro` — nueva curva de `bgAlpha` (sección 1).
- `drawBottomPanel` (o el equivalente actual que renderiza las cartas) — añadir la fila de Respuestas Inmunes solo si `state.dissemination`.
- Filtro del roster — quitar antiséptico en diseminación.
- Handler de input (click/tap) — añadir resolución de hit-test contra Antígenos, cartas de respuesta, y posicionamiento de NET/Trombo en carril.

### Estado nuevo en `newState()`

```js
disseminationBarrierHP:     [0,0,0,0,0],     // se llena en enterDissemination
disseminationBarrierMax:    [0,0,0,0,0],
disseminationBarrierBroken: [false,false,false,false,false],
disseminationBarrierBreakAt: 0,
disseminationBarrierBreakLane: -1,
antigens: { count: 0, drops: [] },
nets: [],
thrombi: [],
```

### Sin cambios

- `disseminationOrganLoad`, `disseminationFlash`, `disseminationOver` — siguen igual.
- Path Bezier de los carriles.
- Render de Fase 1.
- Lógica de Fase 1.

---

## Casos borde

- **Spawn rate de Antígenos vs costos**: con 8 gérmenes/wave 1 y costos 3-5, el jugador puede activar 1-2 respuestas por wave. Es OK; si en playtest se siente lento, bajar costos o subir drop rate (¿1.5 antígenos por germen tipo boss?).
- **Auto-collect** evita situaciones donde el jugador no puede tappear todo en pantalla por demasiada presión.
- **Germen absorbido por barrera ¿suelta antígeno?**: SÍ. Es la economía principal del nivel — sin esto la barrera "esconde" recursos.
- **Última barrera rota mientras hay gérmenes en cola en ese carril**: los gérmenes en cola (`state` blocked) pasan a `walking`, siguen su path normal, suman al X/10. Sin re-renderizar nada.
- **`OffscreenCanvas` no disponible**: fallback a `document.createElement('canvas')`.
- **Resize / portrait-landscape**: las coordenadas de las barreras se recalculan en `rebuildDisseminationPath` (igual que las puertas).
- **`disseminationBarrierHP` undefined al primer frame**: guard `(state.disseminationBarrierHP && state.disseminationBarrierHP[k]) || 0`.

---

## Performance

- Patterns de órgano: 5 × 64×64 RGBA ≈ 80 KB total, generados lazy.
- Render por frame: 5 fillRects con pattern + 5 arcs con pattern + ~7 textos = trivial.
- Antígeno drops: típicamente <15 en pantalla a la vez. Despreciable.
- NETs / Trombos: máx 5 a la vez (uno por carril). Sus efectos por frame son O(gérmenes-en-area), también trivial.

---

## Validación

Esto es polish + mecánica nueva. Plan manual sobre Vercel:

1. Deploy a `https://immunodefense.vercel.app` después de cada commit grande.
2. Saltar al puente con **Shift+B**.
3. Checklist:
   - **Cinemática**: ¿se ve la rajadura ANTES de los 5 carriles? Sin destello del campo al inicio.
   - **Barreras**: cada carril muestra su HP propia (12/8/6/10/7 inicial). Tap a una y mirar la barrita verde.
   - **Antígenos**: matar un germen → cae el "!" amarillo → tap → contador sube.
   - **Auto-collect**: dejar pasar 10s sin tappear → vuelan al HUD.
   - **Dendrítica**: con 4 Antígenos, tap a la carta → aparecen 3 Ts que atacan automáticos.
   - **NETosis**: con 3, tap a la carta → tap en un carril → red aparece, gérmenes congelados.
   - **Plaquetas**: con 5, igual a NET pero con bloqueo total + daño.
   - **Antiséptico**: no aparece en el panel de torres.
   - **Regeneración**: terminar una wave con HP bajo en alguna barrera (no rota) → mirar que sube +1 al iniciar la siguiente.
   - **Ruptura**: forzar HP=0 → cinemática corta + ese carril empieza a sumar X/10 normalmente.
4. Comparar con deploy anterior (Vercel guarda histórico por commit).

---

## Entregables

- Múltiples commits incrementales:
  1. Fix transición cinemática (item 1, aislado).
  2. Patterns + barrera mecánica con HP + degradación visual.
  3. Sistema de Antígenos (state + drops + HUD).
  4. Panel de Respuestas Inmunes + las 3 cartas (cada una puede ser su commit chico).
  5. Filtro de antiséptico en panel.
- Deploy a Vercel después de cada paso grande.
- Sin cambios en README — los controles principales no cambian, sigue siendo el mismo juego.
