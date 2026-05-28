# Nivel Puente — "Diseminación" (transición Fase 1 → Fase 2)

Fecha: 2026-05-28
Estado: diseño aprobado, implementación en curso

## Objetivo
Hacer de puente entre la **Fase 1 (piel)** y la **Fase 2 (órgano diana)**.
En vez de un menú frío, el propio jugador "elige" qué escenario de Fase 2 se
desbloquea: el primer carril que pierde define el órgano que cayó.

Inspiración mecánica: Plants vs Zombies. Carriles paralelos, gérmenes
avanzan, jugador defiende.

## Trigger
- Se activa al **vencer al boss MRSA** (final de oleada 18).
- Cinemática corta (~2 s): *"La infección rompió la barrera cutánea. Está
  buscando órgano blanco."*
- Carga la escena `dissemination`. El campo de Fase 1 se descarta.

## Campo (5 carriles paralelos, estilo PvZ)
- 5 carriles horizontales, de arriba a abajo:
  1. **CORAZÓN** → Endocarditis
  2. **PULMÓN** → Émbolos sépticos
  3. **SANGRE** → Sepsis
  4. **HUESO** → Osteomielitis
  5. **ARTICULACIÓN** → Artritis séptica
- Lado **derecho**: 5 grietas de tejido roto (spawn).
- Lado **izquierdo**: 5 puertas con ícono del órgano (meta del germen).
- Tinte sutil de fondo por carril para legibilidad.

## Estado heredado
Reset con ATP base nuevo (~150-200). No se heredan torres ni ATP de Fase 1.
Conceptualmente: es un campo distinto del cuerpo, el jugador re-construye
sobre la grilla nueva. Más fácil de balancear.

## Oleadas (3, in crescendo)
Calibradas para que el ATP/slots **no alcancen los 5 carriles a la vez**.
El jugador no puede defender todo: debe priorizar, y el carril descuidado
cae. No hay "ganar este nivel" — siempre uno cae.

Mix: pesado en S. aureus / MRSA (vía hematógena clásica), con apoyo de
S. pyogenes y algún Pseudomonas. Bosses del set ya conocido.

## Afinidad germen → carril
Cada germen tiende a su órgano clásico (con peso, no determinístico):

| Germen        | Corazón | Pulmón | Sangre | Hueso | Articul. |
|---------------|---------|--------|--------|-------|----------|
| saureus       | 3       | 2      | 2      | 3     | 3        |
| MRSA          | 3       | 2      | 3      | 2     | 2        |
| pyogenes      | 1       | 3      | 3      | 1     | 1        |
| pseudomonas   | 1       | 3      | 2      | 2     | 1        |
| sepidermidis  | 3       | 1      | 1      | 1     | 1        |
| candida       | 2       | 2      | 2      | 1     | 1        |

Esto hace que las decisiones de Fase 1 (qué gérmenes dejaste vivir más)
tengan eco aquí: si dejaste pasar muchos S. aureus, el corazón será el
carril más castigado.

## Fin del nivel
- Cuando **el primer enemy cruza una puerta de órgano** → el carril cae.
- Pausa breve. Overlay: *"[Germen] alcanzó [órgano]."*
- Pantalla: *"Próximamente: Fase 2 — [Escenario]."*
- (Los 5 escenarios de Fase 2 todavía no existen; este nivel deja al
  jugador en placeholder a la espera de implementación.)

## Render
- Fondo: vasos sanguíneos convergiendo a los 5 órganos (silueta sutil).
- Cada puerta de órgano con ícono claro (cardio = corazón, pulm = alvéolo,
  sangre = gota, hueso = corte óseo, art = silueta de cápsula).
- Tinte por carril: cardio carmesí, pulm rosado, sangre rojo, hueso crema,
  art celeste sinovial.
- Las torres ya conocidas (Macrófago/Linf B/Linf T + nuevas) funcionan
  igual. Se colocan en celdas dentro de un carril.

## Fuera de alcance (este nivel puente)
- Los 5 escenarios de Fase 2 reales (cada uno es su propio sub-proyecto).
- Sistema de progreso/persistencia de "carriles ya caídos".
- Final alternativo de contención (decisión de diseño: este nivel no se
  gana, solo se elige qué órgano sacrificar).

## Verificación esperada
- Tras vencer boss MRSA en oleada 18, el juego entra a `dissemination`.
- 5 carriles visibles con sus órganos.
- 3 oleadas con presión creciente.
- Imposible defender los 5: al menos uno cae.
- Cinemática + placeholder funcionan al primer cruce.
