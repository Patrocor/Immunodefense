# Poderes mejorados de gérmenes + Cañón del Complemento (MAC)

Fecha: 2026-05-27
Estado: aprobado (diseño)

Mejoras inspiradas en PvZ y Clash Royale, antes del balance (Lote 3).

## A. Poderes mejorados de los 4 gérmenes nuevos

### 1. Sarna — "Excavadora salta adelante" (PvZ Minero / CR Minero)
Al **reaparecer** de la madriguera, además de volverse atacable, **salta hacia
adelante** en el camino (`burrow.surfaceJump` px de diseño, p.ej. 90), emergiendo
más cerca del vaso y esquivando las torres del tramo. Sigue dejando larvas.
- Código: en el resurgir (updateEnemies, fin de `burrowed`), `e.progress +=
  burrow.surfaceJump * U` (clamp a fin de ruta).

### 2. HPV — "Coraza furiosa" (PvZ Zombi del Periódico)
Cuando le **rompen el escudo** de queratina (shieldHP→0), se **enfurece**:
`e.enraged=true`, +50% velocidad y +50% daño, tinte rojizo, y **el escudo ya no
se regenera** (`e.noShieldRegen=true`).
- Código: en `damageEnemy`, al pasar shieldHP a 0 con def.id==="hpv" → set flags.
  En movimiento: si `e.enraged` aplicar `enrageMult` a la velocidad; en aura de
  ataque, ×1.5 al daño. Saltar regen si `noShieldRegen`.

### 3. Molluscum — "Se divide al morir" (CR Lava Hound/Golem + Bruja)
Además de soltar perlas en vida, **al morir se divide en 2 mini-molluscum**
(`deathSplit: { count: 2, hpFrac: 0.35 }`), salvo que el que muere ya sea hijo
(`noSplit`). Los hijos no se vuelven a dividir ni sueltan perlas.
- Código: `spawnSpore` marca hijos con `noSplit:true`. En el bloque de muerte de
  `damageEnemy`, si `def.deathSplit && !e.noSplit && !absorbido` → spawnear 2
  hijos en la posición/al progreso actual.

### 4. Malassezia — "Charco que acelera aliados" (CR Rabia)
Deja un **charco aceitoso** en el camino (lista `state.slicks`) cada ~0.8 s
(vida ~3 s). Los gérmenes que pasan por un charco **avanzan +30%**. Mantiene su
aura que baja la cadencia de las torres.
- Código: `state.slicks=[]`; Malassezia agrega slick; en movimiento, si el germen
  está dentro de un slick → `slickFactor=1.3`. Update/cleanup + dibujo de manchas
  aceitosas bajo los gérmenes.

## B. Cañón del Complemento (MAC) — recurso + torre especial

### Concepto
Las proteínas del complemento se **ensamblan** en el Complejo de Ataque a
Membrana (MAC), que perfora a los patógenos. Recurso paralelo al ATP.

### Recurso: fragmentos de complemento (C3b)
- **Caen de gérmenes muertos:** al morir un germen, prob. ~25% (jefe 100%) suelta
  un **fragmento** que aparece en el sitio y **deriva** suave por el plasma.
- El jugador lo **toca para recogerlo** (estilo sol de PvZ). Suma a
  `state.complement` (0..MAC_COST). Si no se recoge en ~6 s, se desvanece.
- Estado: `state.complement`, `state.fragments=[]` ({x,y,vx,vy,life}).

### Torre: Cañón del Complemento
- Cuando `state.complement >= MAC_COST` (p.ej. 5) se **habilita** en la cartilla
  un grupo "Especial" con el **Cañón del Complemento**. Construirlo **gasta los
  fragmentos** (no ATP) y pone `complement=0`.
- Dispara **ráfagas de complemento** a la torre... perdón, al germen: daño alto,
  **ignora escudos** (químico, como el antibiótico), mini-área. Cadencia media.
  Como es caro, es un golpe de poder situacional (ideal vs HPV/tanques).
- Niveles/stats a afinar; arranca con 1 nivel potente.

### UI
- Contador de complemento (gotas C3b) cerca del HUD o del dock.
- Fragmentos flotantes tappables en el campo.
- Grupo "Especial" en la cartilla, deshabilitado hasta tener MAC_COST.

## Implementación por lotes
- **Lote A:** los 4 poderes mejorados (este).
- **Lote B:** recurso de complemento + Cañón del Complemento.
- Luego Lote 3: balance de oleadas y limpieza de defs no-piel.

## Verificación
- Sin excepciones. Sarna salta al reaparecer; HPV se enfurece al romper escudo;
  molluscum se divide al morir; Malassezia deja charcos que aceleran gérmenes;
  fragmentos caen y se recogen; el cañón se ensambla y dispara ignorando escudos.
