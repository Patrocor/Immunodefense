# Dock lateral derecho — rediseño de distribución en pantalla

Fecha: 2026-05-25
Estado: aprobado

## Problema

El panel de cartas vive en una franja inferior (`PANEL_H`) que recorta el alto
del campo. El camino heridas→vaso (vertical) queda comprimido y el tránsito de
elementos se interrumpe al llegar abajo.

## Objetivo

Mover los personajes (cartas) a un **dock vertical en el borde derecho** para
que el campo aproveche **todo el alto** de la pantalla y el tránsito no se corte.
Orientación principal: **móvil vertical (portrait)**. Layout **unificado** para
portrait y landscape (un solo dock derecho).

## Diseño

### Zonas (canvas)
- **HUD**: arriba, ancho completo (`HUD_H`). Sin cambios.
- **Dock derecho**: ancho `SIDE_W`, desde `FIELD_TOP` hasta el fondo.
- **Campo**: alto completo (`FIELD_TOP`→`VH−safeBottom`), ancho
  `FIELD_LEFT`→`FIELD_RIGHT` donde `FIELD_RIGHT = VW − safeRight − sideInner`.

### Contenido del dock (arriba → abajo)
1. **3 cartas apiladas verticalmente** (Macrófago / LinfocitoB / LinfocitoT),
   ancho = ancho útil del dock. Siempre visibles. Scroll **vertical** como
   fallback si en el futuro hay más cartas (con 3 no hace falta: `maxScroll=0`).
2. **Zona info/acciones anclada al fondo del dock**:
   - vacía en juego normal,
   - al seleccionar torre: nombre+nivel, stats compactas (Dmg/R/cadencia),
     botones **Vender** y **Mejorar** apilados (ancho completo del dock),
     y una "X" para deseleccionar,
   - al elegir carta: hint "Toca el campo" + costo/ATP.

Nada queda debajo del campo → el camino usa el 100% del alto.

## Cambios técnicos (todo en `index.html`)

1. `layout()` (~331): introducir `SIDE_W`/`sideInner`;
   `FIELD_RIGHT = VW − safeRight − sideInner`; `FIELD_BOTTOM = VH − safeBottom`
   (alto completo). `PANEL_H` deja de recortar abajo.
2. `layoutUI()` (~1128): reescribir posiciones de cartas (columna vertical) e
   info/botones (anclados al fondo del dock). Unificar portrait/landscape.
3. `drawPanel()` (~6013): pintar la franja derecha (no la inferior); cartas en
   vertical con clip/scroll vertical; info/botones abajo; edge-fades arriba/abajo.
4. Scroll de cartas: horizontal → vertical en `onPointerMove`/`onPointerUp`
   (usar `dy`), clamp (`contentH`), momentum vertical, hit-test vertical (~3242),
   y clamp en `layoutUI` (~1222).
5. Routing de toques `handleClick` (~3240): la rama de panel pasa de
   `y >= FIELD_BOTTOM` a `x >= FIELD_RIGHT`.
6. `drawGhost` (~6173) y build-hint en `onPointerMove` (~3437): excluir
   `x >= FIELD_RIGHT` para no colocar/dibujar torres bajo el dock.

`canPlaceTowerAt` ya rechaza `x > FIELD_RIGHT − pad`, así que la colocación
respeta el dock automáticamente. El path es normalizado a `FIELD_W/FIELD_H`,
así que se reacomoda solo al cambiar el campo.

## Verificación
- Abrir en navegador en viewport portrait (≈390×844) y landscape.
- Confirmar: cartas a la derecha, campo a alto completo, camino sin corte,
  colocar/seleccionar/mejorar/vender torres funciona, no se colocan torres
  bajo el dock.

## Fuera de alcance
- Flujo horizontal del camino (opción descartada).
- Sprites, habilidades activas, audio (roadmap aparte).
