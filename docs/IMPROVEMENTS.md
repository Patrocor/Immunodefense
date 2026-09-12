# Plan de mejoras de ImmunoDefense

Este plan prioriza reducir regresiones y aclarar el estado del producto antes
de ampliar contenido o reestructurar el motor.

## 1. Base verificable

- [x] Actualizar el README con la campaña, arquitectura y comandos actuales.
- [x] Corregir referencias antiguas de Diseminación (3 carriles, 12 oleadas).
- [x] Añadir un smoke test sin dependencias que arranque el juego y renderice
  el primer frame de los 14 niveles de Fase 2 en adelante.
- [x] Ejecutar sintaxis, smoke test y build en CI.
- [x] Exponer `playtest.html` mediante `npm run playtest`.

## 2. Cobertura de progresión

- [x] Probar transiciones Fase 1 → Diseminación → F2 → F3 → Sepsis → MODS.
- [x] Probar guardado, restauración y persistencia de logros en `localStorage`.
- [x] Añadir invariantes de tablas (gérmenes, torres, mapa, waves/leak).
- [x] Añadir una prueba real de navegador para carga de assets, interacción por
  puntero y tamaños portrait/landscape.

## 3. Modularización incremental

No conviene dividir las 31.000 líneas de una sola vez. Cada extracción debe
mantener el juego ejecutable y pasar los smoke tests.

- [x] Primer lote de datos puros en `data/` (`ImmunoDefenseData`): logros,
  oleadas Fase 1, Diseminación y mapa corporal.
- [x] Segundo lote: definiciones de torres, gérmenes y niveles F2–F5.
- [x] Tercer lote: claves de persistencia, metaDefaults y lore del compendio.
- [x] Manifest de carga (`scripts/data-manifest.mjs`) compartido por HTML,
  playtest, build y smoke tests.

Orden propuesto:

1. **Datos puros:** torres, gérmenes, oleadas y niveles. *(3 lotes hechos)*
2. **Persistencia:** campaña, logros y compendio. *(claves + lore extraídos)*
3. **Motores:** Fase 1, Diseminación y motor compartido F2–F5.
4. **Render:** HUD, mapa, overlays y render específico por fase.
5. **Entrada y plataforma:** pointer, teclado, audio y ciclo principal.

Mientras se mantenga el objetivo de funcionar sin bundler, los módulos pueden
publicar datos sobre un único namespace `window.ImmunoDefense`. Si se adopta
ES Modules, debe eliminarse de la documentación la opción de abrir
`index.html` directamente y conservarse un servidor local como entrada única.

## 4. Rendimiento móvil

Medir antes de optimizar:

- [x] Baseline automática: `npm run perf` (bytes, boot, picos Diseminación/Sepsis/MODS).
- [x] Hooks `__game.perfSnapshot()` y auto-degradado por FPS documentados en `docs/PERF.md`.
- tiempo de carga y parseo en dispositivos reales;
- FPS y memoria en oleadas finales de Diseminación, Sepsis y MODS;
- cantidad máxima de enemigos, efectos y números de daño;
- coste de sombras, gradientes y canvases auxiliares;
- rotación, safe areas y gestos en Android/iOS reales.

Usar esos datos para decidir entre reducir efectos, cachear dibujos, trocear
datos o introducir carga diferida por fase.

## 5. Pulido de producto

- Completar sprites donde hoy aparece el fallback Canvas.
- [x] Añadir favicon e iconos web.
- [x] Explicar en el mapa que cada campaña recorre una sola rama.
- [x] Revisar duración y balance de las 12 oleadas de Diseminación (curva monótona 4→28).
- [x] Respetar `prefers-reduced-motion` y `prefers-contrast: more` en HUD/banners.
- Validar audio y contraste en dispositivos reales.

## Criterio para añadir contenido nuevo

No agregar nuevas fases o unidades hasta que las transiciones de campaña y la
persistencia tengan cobertura automática. El contenido nuevo debe incluir su
configuración, invariante y caso smoke en el mismo cambio.
