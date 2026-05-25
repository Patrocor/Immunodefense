# Pulido visual "más vivo" + Neutrófilo de refuerzo que huye llorando

Fecha: 2026-05-25
Estado: aprobado

## Parte A — Pulido visual (acotado a 5 ítems)

1. **Glow/aura pulsante** por torre: en `drawTower`, antes del sprite, disco
   con gradiente radial en `def.color` (alpha baja, pulsa con `idle`).
2. **Respiración/bob idle**: amplificar levemente `pulse` y añadir bob
   vertical sutil a las 3 torres (en `drawTower`/draw* de cada una).
3. **Sombra de contacto** más suave/grande bajo cada torre (`drawShadow`).
4. **Partículas ambientales**: motas de plasma que derivan lento por el campo
   (ampliar `drawAmbient` o set propio determinista).
5. **Latido del entorno**: modular sutilmente la alpha de las bandas de capas
   en `drawSkinLayers` con un sin lento (~1 Hz), como corazón lejano.

Mantiene la estética actual; solo más pulida. Sin cambios de jugabilidad.

## Parte B — Neutrófilo de refuerzo (aliado temporal)

### Datos / estado
- `state.guardians = []`, `state.guardianTimer` (en `newState`).
- Objeto guardián: `{ x, y, vx, vy, hp, maxHp, state:"roaming"|"fleeing",
  targetX, targetY, alpha:1, scale:1, biteCd, wobble, blinkTimer, nextBlink,
  tearTimer }`.

### Aparición
- Cada ~28 s a partir de la oleada 2; máximo 2 vivos. Entra caminando desde
  un borde lateral del campo a una `y` aleatoria.

### Mientras vive ("roaming")
- Busca el germen "walking" más cercano; se mueve hacia él.
- A rango corto (~28·U) lo **muerde**: `damageEnemy(germ, BITE_DMG, "neutrofilo")`
  con cooldown (`biteCd`). BITE_DMG ~30, cd ~0.8 s.
- **Recibe daño** de gérmenes agresivos dentro de `enemyAuraRadiusPx(germ.def)`
  (mismo aura que las torres), en `updateGuardians`.
- HP ~80; crítico = 30% (24).

### Muerte cómica ("fleeing")
- Al caer `hp <= maxHp*0.30` y no huyendo: `state="fleeing"`, elige el borde
  más cercano como `target` fuera de pantalla, sfx ("¡buaaa!").
- Corre acelerado hacia el borde; deja de morder/atacar.
- Cara llorosa (`drawHurtEyes` + boca abierta) y **lágrimas** que saltan
  (partículas). `alpha -= dt/2`, `scale` baja → se desvanece y encoge.
- Se elimina al `alpha<=0` o al salir de pantalla.

### Dibujo (`drawGuardian`)
- Célula clara con **núcleo multilobulado** morado (real del neutrófilo) +
  carita anime; respeta `alpha`/`scale`. Barra de vida pequeña si dañado.
- Glow tenue (coherente con Parte A).

### Integración
- `updateGuardians(dt)` llamado en el update loop; `drawGuardians()` en el
  render tras torres/enemigos. Reusa patrón de `patrol`/`collectors`.
- No altera balance de torres ni oleadas; es un extra que aparece y se va.

## Verificación
- Capturas: glow/partículas/latido visibles; un neutrófilo aparece, muerde
  un germen, y al recibir daño hasta crítico huye llorando y se desvanece.
- Sin excepciones de runtime.

## Fuera de alcance
- Rediseño total de sprites; mecánicas de invocación por el jugador.
