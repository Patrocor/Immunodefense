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

Siguiente bloque recomendado:

1. Probar las transiciones Fase 1 → Diseminación → F2 → F3 → Sepsis → MODS.
2. Probar guardado, restauración y migración defensiva de `localStorage`.
3. Añadir invariantes de tablas:
   - todo germen usado en una oleada existe;
   - toda torre de un nivel existe;
   - todo nodo jugable tiene destino y configuración;
   - las longitudes de `waves` y `leak` coinciden.
4. Añadir una prueba real de navegador para carga de assets, interacción por
   puntero y tamaños portrait/landscape.

## 3. Modularización incremental

No conviene dividir las 31.000 líneas de una sola vez. Cada extracción debe
mantener el juego ejecutable y pasar los smoke tests.

Orden propuesto:

1. **Datos puros:** torres, gérmenes, oleadas y niveles.
2. **Persistencia:** campaña, logros y compendio.
3. **Motores:** Fase 1, Diseminación y motor compartido F2–F5.
4. **Render:** HUD, mapa, overlays y render específico por fase.
5. **Entrada y plataforma:** pointer, teclado, audio y ciclo principal.

Mientras se mantenga el objetivo de funcionar sin bundler, los módulos pueden
publicar datos sobre un único namespace `window.ImmunoDefense`. Si se adopta
ES Modules, debe eliminarse de la documentación la opción de abrir
`index.html` directamente y conservarse un servidor local como entrada única.

## 4. Rendimiento móvil

Medir antes de optimizar:

- tiempo de carga y parseo de `game.js`;
- FPS y memoria en oleadas finales de Diseminación, Sepsis y MODS;
- cantidad máxima de enemigos, efectos y números de daño;
- coste de sombras, gradientes y canvases auxiliares;
- rotación, safe areas y gestos en Android/iOS reales.

Usar esos datos para decidir entre reducir efectos, cachear dibujos, trocear
datos o introducir carga diferida por fase.

## 5. Pulido de producto

- Completar sprites donde hoy aparece el fallback Canvas.
- Añadir favicon e iconos web.
- Explicar en el mapa que cada campaña recorre una sola rama.
- Revisar duración y balance de las 12 oleadas de Diseminación.
- Validar audio, accesibilidad de movimiento reducido y contraste.

## Criterio para añadir contenido nuevo

No agregar nuevas fases o unidades hasta que las transiciones de campaña y la
persistencia tengan cobertura automática. El contenido nuevo debe incluir su
configuración, invariante y caso smoke en el mismo cambio.
