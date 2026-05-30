# Refinamiento visual — Obstáculo previo al órgano diana

Fecha: 2026-05-29
Estado: diseño aprobado, listo para writing-plans
Spec antecesora: [2026-05-28-nivel-puente-diseminacion-design.md](2026-05-28-nivel-puente-diseminacion-design.md)

## Objetivo

Refinar la zona visual justo antes de cada puerta de órgano en el nivel
puente ("Diseminación"). Hoy el germen baja por un carril limpio y al llegar
a un disco de color suma +1 al contador X/10. La transición se ve plana:
el jugador no percibe que hay una *barrera tisular* siendo atravesada y los
5 órganos se ven prácticamente iguales salvo por el color.

Después del refinamiento:
- Cada puerta tiene **identidad biológica propia**: el corazón se ve como
  miocardio, el pulmón como alvéolos, etc.
- Existe una **membrana visible** entre el carril y la puerta que el germen
  cruza explícitamente.
- La membrana **reacciona** al cruce (flash + rasgadura) y **se deteriora**
  con el load (inflamación, agujeros, color cada vez más rojo).

## No-objetivos

Esto es un refinamiento *visual*. Queda **fuera** del scope:

- ❌ Cambiar la mecánica X/10 (el contador, el threshold, el efecto al 10). El texto "X / 10" sobre la puerta también queda con el mismo color y posición de hoy.
- ❌ Tocar el path/trayectoria del germen.
- ❌ Añadir HP a la membrana o cualquier capa mecánica nueva.
- ❌ Música o SFX nuevos. El `sfx("playerHurt")` del cruce queda igual.
- ❌ Rediseñar las puertas/torrente de Fase 1.

## Diseño visual

### Texturas por órgano

Cada órgano tiene un pattern propio que se usa tanto en la membrana como
en el relleno del disco interior:

| Órgano | Textura | Color clave | ID |
|---|---|---|---|
| Corazón | Fibras de miocardio estriado (líneas paralelas con bandas claras) | `#c1416a` | `corazon` |
| Pulmón | Alvéolos (burbujas claras sobre fondo rosado oscuro) | `#e8a3b3` | `pulmon` |
| Sangre | Eritrocitos bicóncavos | `#b8232a` | `sangre` |
| Hueso | Trabéculas óseas (red de líneas blancas sobre marrón claro) | `#d8c89a` | `hueso` |
| Articulación | Cartílago hialino con grietas finas | `#8ec5d0` | `articulacion` |

### Membrana endotelial

- **Posición**: a `r * 1.3` por encima del centro del disco del órgano,
  donde `r` es el radio del disco (`22 * U`). Centrada en `laneX`.
- **Tamaño**: ancho ≈ `(FIELD_W / 5) * 0.75` (no llega a tocar los carriles
  vecinos), alto = `8 * U`.
- **Apariencia base**:
  - Fondo: rectángulo relleno con el pattern del órgano.
  - Borde superior e inferior: línea horizontal de `2 * U` de grosor, color
    del órgano.
  - **Etiqueta tisular** (siempre visible, no opcional): texto pequeño justo
    debajo de la banda con el nombre histológico real — `corazon` →
    "miocardio", `pulmon` → "epitelio alveolar", `sangre` → "torrente
    sanguíneo", `hueso` → "trabéculas óseas", `articulacion` → "cartílago
    articular". `font: bold 9pt * U`, color `colorAlpha(organ.color, 0.6)`,
    `textAlign: center`, `textBaseline: top`, posicionada a `yMem + h/2 + 2*U`.

### Disco interior del órgano

- **Radio**: pasa de `20 * U` a `22 * U` (un 10% más grande para que el
  ícono y la textura respiren).
- **Relleno interno**: en vez de `colorAlpha(organ.color, 0.35 + pct * 0.45)`
  (color sólido translúcido), se usa el pattern del órgano. El "pct" del
  relleno radial (el sector que crece con el load, líneas
  `index.html:10386-10393`) se mantiene **encima** del pattern como overlay
  semi-transparente del color del órgano. Esto preserva la lectura del
  X/10 sin perder la textura.
- **Anillo + ícono + halo + contador**: sin cambios respecto al actual.

### Reacción al cruce (`flash`)

Cuando un germen cruza la puerta (`disseminationFlash[i] > 0`):

1. **Flash radial** centrado en `(laneX, yMembrane)`: dos anillos blancos
   (`rgba(255,200,200, flash * 0.65)`) de radios `r*0.9` y `r*1.4` que
   se expanden y se desvanecen en `0.6s` (igual que el timer actual).
2. **Rasgadura puntual** en la membrana: una pequeña elipse oscura
   (`rgba(20,10,14, flash)`) de `4*U × 3*U` en el punto de impacto, con
   4-6 líneas radiales finas saliendo (`stroke rgba(255,200,200, flash*0.6)`).
3. La rasgadura **desaparece** cuando `flash` decae a 0 (es momentánea,
   no acumulativa).

### Degradación con `load`

La membrana refleja el estado general del órgano según el load (0..10):

| Load | Estado visual |
|---|---|
| 0–3 | Sana. Solo el pattern + bordes del color del órgano. |
| 4–6 | Inflamación leve. Overlay rojo translúcido sobre la banda: `rgba(255, 90, 90, (load-3) / 7 * 0.25)`. Sin agujeros aún. |
| 7–9 | Inflamación + 1 a 3 agujeros oscuros permanentes en la banda. Las posiciones son **deterministas** (sembradas por `organId` para que no salten cada frame). Tamaños `3*U × 2.5*U`, distribuidos en X aleatoriamente dentro de la banda. |
| 10 | Ruptura total. La banda pierde su pattern y se reemplaza por una franja oscura con bordes rojos rotos. Coincide con `disseminationOver` — durará apenas hasta que la cinemática "PRÓXIMAMENTE FASE 2" tome el foco. |

El **disco** también pulsa más rojo con load alto: el halo radial existente
gana un componente extra `rgba(255, 60, 60, (load-5)/5 * 0.3)` cuando
`load > 5`.

## Arquitectura del código

Todo en `index.html`. Sin archivos nuevos.

### Nuevas funciones

#### `getOrganPattern(organId): CanvasPattern`

- Caché en módulo (`var ORGAN_PATTERN_CACHE = {}`).
- Si no existe, crea un `OffscreenCanvas` de 64×64 (o `document.createElement('canvas')` como fallback si `OffscreenCanvas` no está disponible).
- Pinta el pattern específico del órgano dentro y devuelve `ctx.createPattern(canvas, "repeat")`.
- Se invoca lazily la primera vez que se renderiza una puerta. No requiere preload.

#### `drawOrganMembrane(x, yDoor, organ, load, flash)`

~40 líneas. Inputs: centro horizontal del carril, y del disco, organ object, load 0..10, flash 0..0.6.

Pseudocódigo:

```js
function drawOrganMembrane(x, yDoor, organ, load, flash) {
  var r = 22 * U;
  var yMem = yDoor - r * 1.3;
  var w = (FIELD_W / 5) * 0.75;
  var h = 8 * U;
  // 1. banda con pattern
  ctx.save();
  ctx.fillStyle = getOrganPattern(organ.id);
  ctx.fillRect(x - w/2, yMem - h/2, w, h);
  // 2. bordes
  ctx.strokeStyle = organ.color;
  ctx.lineWidth = 2 * U;
  ctx.beginPath();
  ctx.moveTo(x - w/2, yMem - h/2); ctx.lineTo(x + w/2, yMem - h/2);
  ctx.moveTo(x - w/2, yMem + h/2); ctx.lineTo(x + w/2, yMem + h/2);
  ctx.stroke();
  // 2b. etiqueta histológica
  ctx.fillStyle = colorAlpha(organ.color, 0.6);
  ctx.font = "bold " + Math.floor(9 * U) + "px Fredoka, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(TISSUE_LABEL[organ.id], x, yMem + h/2 + 2 * U);
  // 3. overlay inflamatorio si load >= 4
  if (load >= 4) {
    var inflam = Math.min(0.25, (load - 3) / 7 * 0.25);
    ctx.fillStyle = "rgba(255, 90, 90, " + inflam + ")";
    ctx.fillRect(x - w/2 - 2, yMem - h/2 - 2, w + 4, h + 4);
  }
  // 4. agujeros si load >= 7 (posiciones deterministas por organId)
  if (load >= 7) {
    var holes = Math.min(3, load - 6);
    var seed = organIdSeed(organ.id);
    for (var i = 0; i < holes; i++) {
      var hx = x - w/2 + ((seed * (i+1) * 17) % 1000) / 1000 * w;
      ctx.fillStyle = "rgba(20, 10, 14, 0.92)";
      ctx.beginPath();
      ctx.ellipse(hx, yMem, 3*U, 2.5*U, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 5. flash + rasgadura si flash > 0
  if (flash > 0) {
    ctx.strokeStyle = "rgba(255, 200, 200, " + (flash * 0.65) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, yMem, r * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, yMem, r * 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(20, 10, 14, " + flash + ")";
    ctx.beginPath();
    ctx.ellipse(x, yMem, 4*U, 3*U, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
```

#### `organIdSeed(id): number`

Devuelve un número estable a partir del `id` (suma de char codes, por ej.) para sembrar la posición de los agujeros sin recalcular cada frame.

#### Constantes

```js
var TISSUE_LABEL = {
  corazon: "miocardio",
  pulmon: "epitelio alveolar",
  sangre: "torrente sanguíneo",
  hueso: "trabéculas óseas",
  articulacion: "cartílago articular"
};
```

### Modificaciones a funciones existentes

#### `drawDisseminationField` — `index.html:10325-10334`

Antes de iterar las wounds/doors actuales, añadir la llamada a la membrana:

```js
if (PATH.wounds && PATH.organDoors) {
  for (var k = 0; k < PATH.wounds.length; k++) {
    var w = PATH.wounds[k];
    var d = PATH.organDoors[k];
    drawDisseminationCrack(w.x, w.y);
    var load = (state.disseminationOrganLoad && state.disseminationOrganLoad[k]) || 0;
    var flash = (state.disseminationFlash && state.disseminationFlash[k]) || 0;
    drawOrganMembrane(d.x, d.y, d.organ, load, flash);  // <-- NUEVO
    drawOrganDoor(d.x, d.y, d.organ, load, flash);
  }
}
```

#### `drawOrganDoor` — `index.html:10367-10421`

Dos cambios mínimos en sitio:

1. Línea ~10372: `var r = 20 * U;` → `var r = 22 * U;`.
2. Líneas 10386-10393 (relleno radial): el `ctx.fillStyle = colorAlpha(organ.color, ...)` ahora se aplica **encima** de un previo `ctx.fillStyle = getOrganPattern(organ.id)` que pinta el círculo completo:
   ```js
   // pattern de fondo del disco
   ctx.fillStyle = getOrganPattern(organ.id);
   ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
   // overlay del sector que crece con load (lo que ya hace hoy)
   if (pct > 0) { /* ... */ }
   ```
3. Halo radial (línea 10374): si `load > 5`, añadir una segunda capa de halo `rgba(255, 60, 60, (load-5)/5 * 0.3)` para reforzar el peligro.

### Sin cambios

- `state.disseminationOrganLoad`, `state.disseminationFlash`, `state.disseminationOver`.
- `enterDissemination`, `startNextDisseminationWave`.
- El trigger del cruce en `updateEnemies` (`index.html:2234-2258`): el +1 al contador y el efecto `escape` siguen igual.
- Path/Bezier de los carriles.
- Render de Fase 1.

## Performance

- 5 patterns × 64×64 RGBA ≈ 80 KB de memoria total, generados una sola vez.
- Por frame: 5 `fillRect` con pattern (banda) + 5 `arc` con pattern (disco) + bordes + overlays. Todas operaciones triviales sobre Canvas 2D. Overhead estimado: <1 ms en hardware razonable.
- El path `repeat` del pattern es nativo del navegador, no requiere lógica JS por píxel.

## Compatibilidad

- **`OffscreenCanvas` no disponible** (Safari iOS antiguo): fallback automático a `document.createElement('canvas')`. Detección con `typeof OffscreenCanvas !== 'undefined'`.
- **Portrait/landscape**: `drawOrganMembrane` usa `FIELD_W` y el `laneX` actual, ambos recalculados en `rebuildDisseminationPath`. No hay coordenadas hardcoded.
- **Resize del viewport**: `U` y `FIELD_W` se actualizan; el pattern (que es `repeat`) no necesita regenerarse — solo los tamaños de los rects.

## Casos borde

- `state.disseminationOrganLoad` undefined al primer frame: el patrón `(state.disseminationOrganLoad && state.disseminationOrganLoad[k]) || 0` ya cubre esto.
- `state.dissemination` false: la función nueva solo se llama desde el render del puente; en Fase 1 nunca corre.
- Pattern de un órgano falla al crearse (improbable): `getOrganPattern` retorna `null` → `drawOrganMembrane` cae a un `fillStyle = colorAlpha(organ.color, 0.4)` plano para no crashear.

## Validación

Esto es polish visual: no hay tests automáticos significativos. Plan manual:

1. Deploy a `https://immunodefense.vercel.app` después de cada commit grande.
2. Abrir el juego, presionar **Shift+B** (cheat DEV) para saltar al puente.
3. Abrir DevTools y mutar:
   ```js
   // assumes a debug hook exposes state — only DEV
   state.disseminationOrganLoad = [0, 4, 7, 9, 10];
   ```
   Verificar que cada carril muestra el estado correspondiente.
4. Dejar correr una ola y observar:
   - Cada puerta tiene textura propia identificable.
   - Al cruzar un germen, se ve el flash + rasgadura.
   - El contador X/10 sigue siendo legible.
5. Comparar con el deploy anterior (Vercel guarda deploys por commit hash).

## Entregables

- 1 commit principal con el render nuevo (o 2-3 commits incrementales: patterns → membrana → integración disco).
- URL de Vercel actualizada automáticamente vía git push + `vercel deploy --prod`.
- Sin cambios en README (refinamiento interno, no cambia mecánica ni controles).
