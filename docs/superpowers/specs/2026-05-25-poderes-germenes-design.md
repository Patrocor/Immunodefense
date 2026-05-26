# Poderes animados de los gérmenes (ataques especiales a las torres)

Fecha: 2026-05-25
Estado: aprobado

## Objetivo
Los gérmenes fuertes y los jefes, además de su escudo y daño por contacto,
tienen un **ataque especial animado** a distancia contra las torres, con
efectos: bajar vida, paralizar, ralentizar disparo, o DEVORAR (destruir).

## Sistema (data-driven)
Cada def con poder lleva `power: { type, range, cooldown, ... }`. En
`updateEnemies`, si el germen está "walking", tiene `power`, su `powerCd<=0`
y hay una torre dentro de `range`, dispara el poder (anim + efecto) y reinicia
`powerCd`.

### Tipos de poder
- **spray**: cono hacia la torre más cercana. Efecto: `stun` (paraliza s) +
  `dmg` a la vida. (Pseudomonas, jefe MRSA)
- **catapult**: bola en arco (parábola) a la posición de la torre; al caer,
  `dmg` (pequeño splash). (Candida)
- **burst**: proyectil directo rápido; al impactar, `dmg` + `slowFire` (s de
  cadencia lenta). (S. aureus, jefe Pyogenes)
- **devour**: agarra la torre más cercana, la atrae hacia el germen durante
  `pull` s (telégrafo: tentáculo/flagelo), y la DESTRUYE. Cooldown largo.
  (jefes Pseudomonas y Clostridium)

### Config por germen
| id | type | range | cd | efecto |
|---|---|---|---|---|
| pseudomonas | spray | 115 | 5 | stun 2.4 + dmg 16 |
| candida | catapult | 150 | 5 | dmg 32 |
| saureus | burst | 135 | 4 | dmg 13 + slowFire 3 |
| bossPyogenes | burst | 165 | 3 | dmg 24 + slowFire 3 |
| bossPseudomonas | devour | 130 | 11 | destruye (pull 1.5) |
| bossClostridium | devour | 120 | 13 | destruye (pull 1.8) |
| bossMRSA | spray | 165 | 3 | stun 3 + dmg 28 |

S. epidermidis, HSV, C. acnes: sin poder especial (solo contacto).

## Estados nuevos en torres
- `stunTimer`: paralizada (no dispara) mientras > 0.
- `slowFireTimer`: dispara al doble de cooldown mientras > 0.
- devorada: la torre es arrastrada hacia el germen y al terminar se destruye
  (cuenta como muerte → +1 bloque del medicamento sanguíneo, como hoy).

## Animación
- `state.germShots`: proyectiles de germen (spray/catapult/burst) con su update
  y draw propios (gotas de spray en cono, bola parabólica con sombra, dardo
  rápido). Al llegar al objetivo aplican el efecto.
- devour: tentáculo/flagelo del germen a la torre; la torre se desliza hacia el
  germen (lerp); al completar, chomp + destrucción.

## Cambios de código (index.html)
- `ENEMY_DEFS`: añadir `power` a los 3 regulares + 4 jefes; init `powerCd`.
- `updateEnemies`: disparo de poder (busca torre en rango, off-cooldown).
- `state.germShots` + `updateGermShots` + `drawGermShots`.
- Devour: estado en germen/torre + update + visual.
- `placeTower`: init stunTimer/slowFireTimer.
- `updateTowers`: gate de disparo por stun; cadencia x2 si slowFire.
- `drawTower`: indicadores de paralizada/lenta/siendo devorada.

## Verificación
- Capturas: gérmenes fuertes disparan spray/catapulta/dardo a torres; torres
  muestran paralización/lentitud; un jefe devora una torre.
- Sin excepciones.

## Fuera de alcance
- Empujar/desplazar torres (descartado por ahora); poderes para los débiles.
