# Arpón + C3b al dock en Fase 1 — paridad con Diseminación

Fecha: 2026-06-20
Estado: aprobado

## Problema

En Fase 1, el medidor C3b y la tarjeta del ultimate "Arpón" del Macrófago
flotan sobre el campo, en la fila inferior (4 items: Tópico / Medicamento /
C3b / Mφ, con el Arpón encima del C3b). En Diseminación, en cambio, ambos ya
viven en el dock lateral derecho, y la fila inferior del campo quedó reducida
a 3 items (Tópico / Medicamento / Mφ). Es una inconsistencia visual entre
fases y le resta alto útil al campo en Fase 1.

## Objetivo

Aplicar a Fase 1 el mismo tratamiento que ya tiene Diseminación: C3b y Arpón
viven en el dock, la fila inferior del campo queda en 3 items en ambas fases,
sin ramas especiales por fase.

## Diseño

### Dock (`layoutUI()`, ~3636)
Hoy `responsesReservedH` solo se calcula `if (state.dissemination)`, sumando
`rpH` (panel NETosis) + `c3bMeterH` + `ultCardH` + gaps. Pasa a reservarse
siempre: `c3bMeterH + c3bMeterGap + ultCardH + ultCardGap + dockPad`. El
término `rpH` se suma aparte, solo si existe `UI.responsePanel` (es decir,
solo en Diseminación, donde además hay que dejar lugar para las cartas de
NETosis).

### Fila inferior del campo (`layoutMed()`, ~7092-7151)
Se elimina la rama `else` (4 items + Arpón flotando). Queda una sola
construcción de fila — la que hoy usa Diseminación — con `topicalVial`,
`medVial` y `macrofagoBtn` (3 items), válida para ambas fases.

### Posición de `UI.c3bMeter` / `UI.macrofagoUltCard`
Hoy se anclan arriba de `UI.responsePanel`. Se agrega un fallback: si no
existe `responsePanel` (Fase 1), se anclan arriba del fondo del dock
(`dockBottom - dockPad`) en su lugar. Mismo layout relativo entre C3b y
Arpón (Arpón arriba, C3b abajo, pegados) en ambos casos.

### Lo que no cambia
- `drawComplementMeter()` y `drawMacrofagoUltMeter()`: ya leen la posición
  desde `UI.c3bMeter` / `UI.macrofagoUltCard`; con mover el rect alcanza.
- Hit-tests de click (ej. `UI.macrofagoUltCard && inRect(...)` en ~10714):
  dependen solo de la posición del rect, no de la fase.
- No hay lógica de desbloqueo que gatillar — Macrófago/C3b están activos
  desde el arranque de Fase 1, no son torres que se desbloqueen como las del
  dock superior.

## Verificación
- Portrait y landscape: Arpón y C3b visibles en el dock en Fase 1, cargan y
  se activan igual que antes (tap en Arpón cuando está listo, disparo
  automático de C3b).
- Fila inferior del campo con 3 items, centrada/proporcionada, sin huecos
  raros donde antes estaba el C3b.
- Scroll de la cartilla de torres en el dock sigue funcionando con el alto
  reducido por la reserva nueva (ya pasa hoy en Diseminación).
- Transición Fase 1 → Diseminación sin parpadeos ni saltos de layout (el
  dock ya se ve igual en ambas fases).

## Fuera de alcance
- Cambios visuales a los widgets de C3b/Arpón en sí (colores, labels,
  iconografía) — solo reposicionamiento.
- Habilidades activas (inflamación/fiebre) — brainstorm separado, pendiente.
- Condición de victoria/derrota propia para Fase 1 — fuera de esta sesión.
