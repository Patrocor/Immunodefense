# Bombardeo de Defensinas: gotas más gruesas + resquebrajado temporal del camino

Fecha: 2026-06-20
Estado: aprobado

## Problema

El Bombardeo de Defensinas (ultimate del Neutrófilo) ya está implementado:
gránulos cayendo + impactos + shockwave de aterrizaje. Pero la gota que cae
es visualmente delgada (línea fina + punto chico) y el impacto en el camino
no deja ninguna marca — se siente menos contundente de lo que podría.

## Objetivo

Engrosar la gota que cae para que se lea como un glob con peso, y agregar
una grieta temporal en el camino al momento del impacto (gránulos y
aterrizaje), reusando el efecto `pathCrack` que ya existe en el sistema de
efectos genérico (quedó intacto al borrar el Martillazo viejo).

## Diseño

### Gotas más gruesas (bloque de caída en `drawNeutrofilo`)
- Radio de la gota: `4.5 * U` → `8 * U`.
- Relleno: gradiente radial (highlight lila claro `#e8d4ff` en el centro →
  púrpura medio `#caa8ff` → borde oscuro `#8a5fc0`) en vez de `fillStyle`
  plano — da sensación de volumen.
- Estela: deja de ser una línea de ancho uniforme (`ctx.lineWidth`); pasa a
  ser una cuña rellena (ancha junto a la gota, afinándose hacia arriba con
  gradiente de alpha decreciente) — se lee como cola de cometa de un
  objeto con masa, no un láser delgado.
- Squash sutil en el último ~15% de la caída (justo antes de tocar el
  piso): la gota se achata levemente en Y / se ensancha en X, mismo
  lenguaje de "impacto inminente" que ya usan otras animaciones del juego.

### Resquebrajado temporal del camino
Reusa `pathCrack` (cráter oscuro + grietas radiales jagged, ya
implementado en el renderer de efectos genérico, intacto desde el
Martillazo viejo — no requiere tocar el dibujo).

- **Por gránulo**: en `updateTowers()`, en el mismo punto donde se marca
  `imp.hit = true` (junto al `dealAoEDamageAt`/`triggerShake` que ya
  corren ahí), disparar:
  ```js
  pushEffect({ kind: "pathCrack", x: imp.x, y: imp.y, r: 16 * U, life: 1.2, max: 1.2, seed: Math.random() * 1000 });
  ```
- **En el aterrizaje**: en el mismo punto donde se marca
  `t.bombardLanded = true`, disparar:
  ```js
  pushEffect({ kind: "pathCrack", x: t.x, y: t.y, r: 26 * U, life: 1.6, max: 1.6, seed: Math.random() * 1000 });
  ```
  Grieta más grande que la de un gránulo (es el golpe de cierre) pero más
  chica que el cráter del Martillazo viejo (30px/2.5s, pensado para un
  solo golpe en vez de 8 impactos repartidos).

Estas grietas se renderizan solas desde el sistema de efectos
(`state.effects`/`drawEffects`) — no se toca `drawNeutrofilo` para esto,
manteniendo la separación lógica (`updateTowers`)/dibujo que ya tiene el
Bombardeo.

## Verificación
- Activar el ultimate en Fase 1: confirmar que las 7 gotas caen con cola
  de cometa más gruesa y volumen visible (no línea fina), con un leve
  achatamiento justo antes de tocar el piso.
- Confirmar que cada gránulo deja una grieta chica al impactar, que se
  desvanece sola en ~1.2s.
- Confirmar que el aterrizaje de la torre deja una grieta más grande que
  se desvanece en ~1.6s, además del anillo de shockwave que ya tenía.
- Repetir en Diseminación (`Shift+B`): las grietas aparecen igual sobre el
  carril vertical, sin errores de consola.
- Sin errores de consola en ninguna fase.

## Fuera de alcance
- Cambios al burst de impacto que ya existe (el flash radial al momento
  del `hit`) — queda como está.
- Cambios al anillo de shockwave del aterrizaje — queda como está, solo se
  le suma la grieta.
- Rebalanceo de daño o timing — sin cambios.
