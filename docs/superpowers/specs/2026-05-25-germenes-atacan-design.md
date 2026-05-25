# Los gérmenes atacan a las células inmunes (combate bidireccional)

Fecha: 2026-05-25
Estado: aprobado

## Objetivo

Que los gérmenes no solo caminen: que **dañen a las torres** (células inmunes)
al pasar cerca. Las torres ganan vida; al agotarse quedan inactivas un rato y
reviven (sin pérdida permanente de ATP).

## Mecánica

### 1. Vida de torres (`hp` por nivel en TOWER_DEFS.levels)
- Macrófago (melee, expuesto): 120 / 160 / 210
- Linfocito T (área):           90 / 120 / 150
- Linfocito B (rango largo):    70 / 90 / 120

`placeTower`: `t.maxHp = levels[0].hp; t.hp = t.maxHp; t.exhaust = 0;
t.lastAttackedAt = -999`. Al mejorar: `t.maxHp = levels[lvl].hp; t.hp = maxHp`
(curación al mejorar).

### 2. Ataque de gérmenes (`attack` = daño/seg en ENEMY_DEFS; 0 = no ataca)
- sepidermidis 0, hsv 0
- cacnes 4, candida 6
- pseudomonas 10, saureus 12
- bossPyogenes 25, bossPseudomonas 22, bossClostridium 28, bossMRSA 35

### 3. Aura de contacto
Constante `ATTACK_RADIUS = 46 * U`. En `updateEnemies`, para cada enemigo vivo
en estado "walking" con `def.attack > 0`: por cada torre NO agotada con
`dist(enemy, tower) < ATTACK_RADIUS`, `tower.hp -= attack * dt`,
`tower.hitFlash`, `tower.lastAttackedAt = state.time`. El germen no se detiene.
(Las torres se colocan a ≥30·U del camino, así que solo las pegadas reciben
daño.) Efecto visual: pulso/toxina rojiza tenue del germen a la torre.

### 4. Agotamiento y recuperación
- `EXHAUST_TIME = 5`, `HEAL_DELAY = 3`, `HEAL_RATE = 1/8` (de maxHp por seg).
- Si `t.hp <= 0` y no agotada: `t.exhaust = EXHAUST_TIME`, no dispara, se
  dibuja apagada/gris. Mientras `t.exhaust > 0`: descuenta dt; no recibe daño
  ni dispara; al llegar a 0 → `t.hp = t.maxHp` (revive completa).
- Autocuración: si `t.exhaust<=0` y `state.time - t.lastAttackedAt > HEAL_DELAY`
  y `t.hp < t.maxHp`: `t.hp += maxHp * HEAL_RATE * dt` (cap a maxHp).

### 5. Firing gate
En `updateTowers`, saltar disparo si `t.exhaust > 0`.

## Cambios de código (todo en index.html)
- `TOWER_DEFS`: añadir `hp` a cada entry de `levels`.
- `ENEMY_DEFS`: añadir `attack` a cada def (0 por defecto donde no aplica).
- `placeTower`: init hp/maxHp/exhaust/lastAttackedAt.
- `tryUpgrade`: recalcular maxHp y curar.
- `updateEnemies` (~1433): bloque de aura de daño a torres.
- `updateTowers` (~1686): manejar exhaust (timer, revive), autocuración, gate
  de disparo.
- `drawTower` (~4268): barra de vida (solo si dañada), estado agotado (gris),
  y efecto de toxina al recibir daño.

## Verificación
- Capturas headless: colocar torres pegadas al camino, avanzar a oleadas con
  gérmenes agresivos (S. aureus W9+, Pseudomonas W7+), confirmar que las torres
  pierden vida (barra), se agotan y reviven; las puestas atrás no sufren.
- Sin excepciones de runtime.

## Fuera de alcance
- Habilidades activas, nuevos tipos de ataque (a distancia), curanderos.
