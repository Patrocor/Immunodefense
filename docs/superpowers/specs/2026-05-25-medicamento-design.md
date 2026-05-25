# Medicamento: poder activo cargable con 4 efectos de gas

Fecha: 2026-05-25
Estado: aprobado

## Concepto
Un **vial de medicamento** en el margen izquierdo del campo se llena al
derrotar gérmenes. Al llenarse, el jugador lo toca y **elige 1 de 4 poderes**;
una **nube/oleada de gas** barre el campo aplicando el efecto a todos los
gérmenes presentes. La carga vuelve a 0.

## Estado y constantes
- `state.medCharge` (0..MED_MAX), `state.medChoosing` (bool), `state.gasFx`
  (`{ color, life, max }` o null), `state.medApplying` (flag interno).
- `MED_MAX = 100`; carga por baja: regular **+7**, jefe **+30**
  (en el bloque de muerte ~1866, solo si `!state.medApplying`).

## Carga
En `damageEnemy`, al morir el germen (`e.hp<=0`), sumar a `medCharge`
(salvo durante la aplicación del propio medicamento). Cap a MED_MAX.

## Estados nuevos en gérmenes (movimiento, ~1593-1600)
- `e.stunTimer`, `e.slowTimer` (decrementan con dt).
- factor de avance: `stunTimer>0 → 0`; si no, `slowTimer>0 → 0.4`; si no `1`.
  `e.progress += pxSpeed * factor * dt`.

## Los 4 poderes (`applyMedication(id)`, sobre todos los gérmenes vivos)
1. **antibiotico** (amarillo): daño directo al cuerpo = 40% de su `maxHp`
   (ignora escudo, es químico); puede matar (ATP + conteo, sin sumar carga).
2. **paralizante** (cian): `stunTimer = 4`.
3. **ralentizador** (azul): `slowTimer = 6`.
4. **disolvente** (magenta): `shieldHP = 0` + visual de rotura.
Cada uno lanza `state.gasFx` (nube del color ~1.5s) y resetea `medCharge=0`,
`medChoosing=false`.

## UI
- **Vial** (margen izq): rect vertical fino pegado a `FIELD_LEFT`, alto ~40%
  del campo, se llena de abajo→arriba según `medCharge/MED_MAX`. Lleno:
  brilla/pulsa + "¡LISTO!". `UI.medVial` para hit-test.
- **Selector**: al tocar el vial lleno → `medChoosing=true`. Panel central
  con 4 botones (color + nombre + efecto corto). Tocar uno → `applyMedication`.
  Tocar fuera → cancela (conserva carga). `UI.medPowers` = rects de botones.
- **Gas**: nube semitransparente del color que se expande/disipa ~1.5s sobre
  el campo (partículas). Visual de estado en gérmenes: paralizado (escarcha/
  quieto), lento (tinte azul), sin escudo, destello de daño.

## Integración (todo en index.html)
- `newState`: nuevos campos.
- Constantes + `MED_POWERS` (id, nombre, color, descripción corta).
- `damageEnemy` muerte: sumar carga (guard `medApplying`).
- `updateEnemies` movimiento: stun/slow.
- `applyMedication`, `updateMed(dt)` (tick gasFx) — llamado en el loop.
- `layoutMed()` (vial + botones) desde `layout()`.
- `drawMedVial()`, `drawMedChooser()`, `drawGas()` en render; tint stun/slow
  en `drawEnemy`.
- `handleClick`: rama medChoosing (botones/cancelar) y tap al vial lleno,
  antes de la lógica de campo.

## Verificación
- Captura: vial visible llenándose; al forzar carga, selector con 4 poderes;
  cada poder aplica su efecto (daño/stun/slow/escudo) + nube de color.
- Sin excepciones.

## Fuera de alcance
- Cargas múltiples acumulables; mejoras del medicamento; sonido dedicado.
