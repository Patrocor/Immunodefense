# Lote 3 — Cierre de la Fase 1: balance + limpieza

Fecha: 2026-05-28
Estado: aplicado

## Objetivo
Cerrar la Fase 1 con todo el roster nuevo presente en partidas normales y
sin defs heredadas que no son de piel.

## A. Limpieza de defs no-piel
Removidas de `ENEMY_DEFS` (no se referenciaban en `WAVE_TABLE`, `BOSS_WAVES`
ni `INTERMEDIATE_POOL`, pero quedaban dormidas):
- `ecoli` (intestinal)
- `spneumoniae` (vías respiratorias)
- `bossTuberculosis` (pulmonar)
- `bossAspergillus` (pulmonar/sistémico)

También removidas sus líneas de dispatch en `drawEnemy` (las funciones de
dibujo `drawEcoli`/`drawSpneumoniae`/`drawBossTuberculosis`/`drawBossAspergillus`
quedan inalcanzables; `drawEcoli` sigue usándose como dibujante reutilizable
para cacnes, pseudomonas y bossPseudomonas).

Resultado: roster 100% de piel — sepidermidis, hsv, cacnes, candida,
dermatofito, pseudomonas, saureus, sarna, hpv, molluscum, malassezia,
+ jefes: bossPyogenes, bossPseudomonas, bossClostridium, bossMRSA.

## B. Balance — los nuevos gérmenes aparecen en todas las oleadas medias-tardías
Antes solo aparecían en algunas oleadas explícitas (6/7/8/12/16). Ahora
están sembrados a lo largo del recorrido:

| Ola | Añadido en Lote 3 |
|---|---|
| 9  | + hpv (2) |
| 10 | + molluscum (2) |
| 11 | + malassezia (2) |
| 12 | (ya tenía sarna+hpv) |
| 13 | + molluscum (2) |
| 14 | + malassezia (2), sarna (2) |
| 15 | + hpv (2), sarna (2) |
| 16 | (ya tenía molluscum+malassezia) |
| 17 | + sarna (2), molluscum (2), hpv (2) |
| 18 | + hpv (3) |

Además `INTERMEDIATE_POOL_LATE` ahora incluye `hpv`, `molluscum`,
`malassezia` y `sarna`, así que el goteo intermedio también los inyecta.

## C. Curva de dificultad
Sin cambios: el sistema mantiene `diffHp = 1 + (w-1)*0.05` y
`diffSpeed = 1 + (w-1)*0.04` por oleada. Con los gérmenes nuevos sembrados
en más olas, la curva real sube algo porque:
- HPV es lento pero tanque (escudo + furia).
- Molluscum se multiplica al morir.
- Malassezia engrasa y deja charcos que aceleran aliados.
- Sarna se entierra y suelta larvas.

## Verificación
- `node --check`: sintaxis OK.
- 0 referencias huérfanas a `ecoli`/`spneumoniae`/`bossTuberculosis`/`bossAspergillus`.
- Sin excepciones en boot+intro.

## Fuera de alcance
- Ajuste fino de DPS/HP por torre y por germen (se hará en base a feedback).
- Fase 2 (siguiente).
