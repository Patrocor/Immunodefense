# Neutrófilo: reemplazo del ultimate "Martillazo" por "Bombardeo de Defensinas"

Fecha: 2026-06-20
Estado: aprobado

## Problema

El ultimate actual del Neutrófilo ("Martillazo") es un solo golpe de área
instantáneo (0.65s) en un punto chico (radio 32px) del camino más cercano.
Comparado con los ultimates del resto del roster (frenesí giratorio de NK,
ráfaga continua de Linfocito B, ejecución retardada de Linfocito T), se
siente mecánicamente plano: un punto, un instante, sin secuencia ni
desarrollo.

## Objetivo

Reemplazar el Martillazo por completo con un ultimate de mayor impacto
visual y mecánico: un bombardeo escalonado de gránulos que cubre un tramo
ancho del camino durante varios segundos, en vez de un único punto
instantáneo.

## Diseño

### Nombre y costo
- `specialName`: `"Bombardeo de Defensinas"` (reemplaza `"Martillazo"`).
- `specialChargeSec`: sin cambios (`24 * 1.15` = 27.6s) — el cambio es de
  impacto del ultimate, no de frecuencia de uso.

### Secuencia (≈2.4s total, `specialAnim`)
Durante toda la secuencia la torre no realiza ataques normales (mismo
patrón que ya usan Linfocito B/NK durante sus ultimates de varios segundos).

1. **Anticipación (0–0.3s):** los pseudópodos se repliegan, aro dorado
   pulsante alrededor del cuerpo (mismo lenguaje visual del "windup glow"
   ya usado en `drawGermSprite`), la torre se achica y se funde hasta
   desaparecer — deja una silueta translúcida (alpha 0.25) en su lugar.
2. **Lluvia (0.3–1.6s):** 7 gránulos (defensinas) caen escalonados, uno
   cada ~0.19s, sobre puntos repartidos a lo largo del camino en un tramo
   de ±70px alrededor del punto que hoy calcula `computeUltimateTarget(t)`
   (en Diseminación, el reparto es vertical por el carril en vez de
   horizontal por el camino). Cada gránulo: radio de impacto 18px, daño =
   `stats.damage × 2.2`. Visual: estela de luz dorada-púrpura cayendo desde
   arriba de pantalla (ease-in), flash radial al impactar, micro-shake de
   cámara, número de daño flotante (igual que el resto del juego).
3. **Aterrizaje (1.6–2.1s):** la silueta se vuelve sólida de golpe, anillo
   de shockwave expandiéndose alrededor de la propia torre (radio 32px,
   daño = `stats.damage × 6` — mismo "golpe propio" que tenía el Martillazo,
   ahora como cierre y no como todo el ataque), shake de cámara más fuerte,
   rebote con squash-stretch al aterrizar.
4. **Recuperación (2.1–2.4s):** pseudópodos se re-extienden, wobble de
   asentamiento, vuelve a poder atacar normal.

Sonido: reusa `sfx("upgrade")` al activar (igual que el resto de las
torres) — sin asset de audio nuevo.

### Daño total
`2.2 × 7 + 6 = 21.4×` el daño base de la torre, repartido en ~1.8s sobre un
tramo ancho del camino — contra el `8×` instantáneo y puntual de hoy. Es una
suba fuerte de daño total, justificada porque ahora hay que cubrir un área
mucho más grande (más fácil de esquivar parcialmente para el germen que
para el jugador fallar) en vez de garantizar un golpe puntual. Quedan como
números de partida, ajustables jugando.

## Cambios técnicos (`game.js`)

- `TOWER_DEFS.neutrofilo`: `specialName` → `"Bombardeo de Defensinas"`,
  comentario de diseño actualizado.
- `triggerTowerSpecial()`, rama `def.id === "neutrofilo"`: en vez de fijar
  `hammerTarget` una vez, calcula el centro con `computeUltimateTarget(t)`,
  construye `t.bombardImpacts` (7 puntos repartidos a lo largo del
  camino/carril alrededor del centro, cada uno con su offset de tiempo
  programado) y arranca `t.specialAnim = 2.4`.
- Nueva función de resolución por frame (reemplaza `resolveNeutrofiloHammer`)
  que dispara cada gránulo cuando le toca su turno según el tiempo
  transcurrido, y al llegar a la fase de aterrizaje resuelve el shockwave en
  la posición de la propia torre. Se extrae un helper chico
  `dealAoEDamageAt(x, y, radius, dmg)` reusado por ambos (gránulos +
  shockwave) — el mismo cálculo que hoy vive inline en
  `resolveNeutrofiloHammer`.
- Función de dibujo: reemplaza el bloque de dibujo del mazo (~12443-12530)
  por contracción/fade en la anticipación, gránulos cayendo + impactos
  durante la lluvia, y shockwave + rebote en el aterrizaje.
- Limpieza: se eliminan por completo `hammerTarget`, `hammerImpacted` y
  `resolveNeutrofiloHammer` — reemplazo total, sin código muerto ni shim de
  compatibilidad.
- Diseminación: el centro sigue saliendo de `computeUltimateTarget(t)`
  (punto vertical arriba de la torre, ya existente); el reparto de los 7
  gránulos se hace verticalmente por el carril en vez de horizontalmente
  por el camino.

## Verificación
- Activar el ultimate en Fase 1: confirmar la secuencia completa
  (anticipación → lluvia escalonada de 7 gránulos en un tramo ancho →
  shockwave de aterrizaje → recuperación), que la torre no ataca durante la
  secuencia, y que vuelve a cargar normalmente después.
- Repetir en Diseminación (`Shift+B`): confirmar que el reparto de gránulos
  es vertical por el carril, no horizontal.
- Confirmar que `hammerTarget`/`hammerImpacted`/`resolveNeutrofiloHammer` no
  quedan referenciados en ningún otro lado del archivo.
- Sin errores de consola al activar el ultimate repetidas veces, en
  distintos niveles de torre (1/2/3) y con cero, uno o varios gérmenes en
  rango.

## Fuera de alcance
- Cambios al resto de los ultimates del roster.
- Asset de audio nuevo (se reusa `sfx("upgrade")`).
- Rebalanceo de `specialChargeSec` — se deja para una pasada de balance
  posterior si el playtesting lo pide.
