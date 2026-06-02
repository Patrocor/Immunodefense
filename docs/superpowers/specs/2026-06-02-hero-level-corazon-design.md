# Hero Level "Corazón" — Diseño v1

**Fecha**: 2026-06-02
**Estado**: aprobado para prototipo
**Scope**: prototipo de un (1) nivel; replicar fórmula a los otros 4 órganos si funciona.

---

## 1. Concepto

Cuando un órgano cae en la fase de diseminación, la infección "huye" al siguiente órgano. Pero queda el daño. Los héroes **DenK** (célula dendrítica) y **Mac** (macrófago veterano) llegan al órgano caído y recorren los escombros buscando remanentes, recogiendo recompensa para la próxima batalla TD.

**Narrativa**: tower defense = inmunidad innata peleando al frente. Hero level = adaptativa rezagada siguiendo el rastro. "Atrápame si puedes."

**Estilo NES**: Castlevania (side-scroller con ritmo cardíaco como timing).

---

## 2. Activación

- Trigger: en `dissemination`, cuando `disseminationOrganLoad[lane] >= 10` (la barrera ya se rompió y 10 germenes entraron al órgano).
- En lugar del `disseminationOver` actual (game over inmediato), entra al hero level del órgano caído.
- Resto de órganos (otros 4 carriles) siguen bajo TD durante el hero level (TD pausada).
- Al ganar el hero level → TD se reanuda con buff aplicado.
- Al perder el hero level → game over real.

**Para el prototipo**: trigger debug (botón en HUD) que entra directo al nivel Corazón sin depender de TD.

---

## 3. Héroes

Dos personajes intercambiables (botón SWAP). Solo uno activo a la vez.

| | **DenK** (Dendrítica) | **Mac** (Macrófago) |
|---|---|---|
| Tamaño | chico (12·U radius) | grande (18·U radius) |
| Velocidad | 1.4x base | 0.85x base |
| Salto | doble + planeo (botón sostenido baja lento) | simple, caída con golpe (ground pound) |
| Ataque | dispara antígeno (proyectil, rango ~250·U) | puñetazo cuerpo a cuerpo (rango ~30·U) |
| Daño | 1 | 2 |
| HP | 3 corazones | 5 corazones |
| Especial | revela enemigos invisibles (biofilm) | rompe paredes débiles (necrosis) |
| Color | celeste | naranja-rojizo |

**Swap**: tap en botón SWAP arriba derecha. El otro héroe aparece donde está el actual (no se separan).

**HP compartido pool**: cada héroe muere → swap forzado al otro. Si ambos mueren → game over.

---

## 4. Layout del nivel

Side-scroller horizontal + vertical en cámaras.

```
[ AURÍCULA DERECHA ] → [ VENTRÍCULO DERECHO ] → [ AURÍCULA IZQUIERDA ] → [ VENTRÍCULO IZQUIERDO ] → 💀BOSS
   ↓ válvula            ↓ válvula                ↓ válvula                ↓ válvula
   tricúspide          pulmonar (top)            mitral                   aórtica (final)
```

5 zonas (cámaras), conectadas por **válvulas** que se abren/cierran al ritmo del latido (1 ciclo cada 1.0s a 60 BPM).

- **Tamaño cámara**: ~2 pantallas verticales × 1 horizontal cada una
- **Cámara persigue al héroe activo**: scroll suave en X e Y
- **Latido global**: pulso visual rojo cada 1.0s, shake sutil de 1-2px

---

## 5. Hazards y enemigos

**Enemigos residuales** (germes débiles, NO los de TD):
- **Coco sobreviviente**: camina horizontal, 1 hit, daña al contacto
- **Telaraña fibrina**: estática, bloquea paso. Solo Mac rompe con golpe
- **Pus**: charco fijo en piso, daña si lo pisás
- **Geyser de sangre**: del piso, timing sincronizado con latido (sale en cada beat)

**Boss final**: 🟡 **Pyogenes Remanente**
- 3 fases (HP/3):
  1. Salta de plataforma a plataforma
  2. Lanza estreptolisinas (proyectiles que dejan parches necróticos)
  3. Enraged: dobla velocidad, embiste
- Cuarto del boss = ventrículo izquierdo, salida bloqueada

---

## 6. Pickups

- **Antígeno** (la moneda) — coleccionable, se acumula con el balance de TD
- **Corazón** — restaura 1 HP
- **ATP grande** — restaura todos los HP
- **Medalla del órgano** — recompensa final (1 por nivel)

---

## 7. Reward al ganar

- **Permanente para el siguiente órgano TD**: +1 daño base a TODAS las torres contra bosses
- Medalla "Corazón limpio" visible en HUD durante el resto de la run
- 5 antígenos bonus

---

## 8. Controles (mobile portrait)

```
┌─────────────────────────────────┐
│           canvas                 │
│        [ personaje ]             │
│                                  │
│                       [SWAP]     │
├─────────────────────────────────┤
│  ◄ joystick ▼ ►   │  [SALTAR]   │
│       ▲           │  [ATACAR]   │
└─────────────────────────────────┘
```

- **Izquierda (joystick virtual)**: drag = movimiento direccional
- **Derecha (botones)**: SALTAR (con hold = planeo de DenK), ATACAR
- **Arriba derecha**: botón SWAP DenK↔Mac
- **HP**: corazones arriba izquierda (3 de DenK + 5 de Mac)

---

## 9. Implementación incremental (commits secuenciales)

Cada paso es un commit independiente para que un bug en uno no contamine los anteriores.

| # | Commit | Qué se ve después |
|---|---|---|
| 1 | spec doc | (este archivo) |
| 2 | scene routing skeleton | botón "Test hero level" en HUD entra al placeholder |
| 3 | placeholder corazón | fondo rojo, texto "AURÍCULA DERECHA", botón EXIT |
| 4 | DenK + Mac sprites | dibujados centro, botón SWAP funciona (visualmente) |
| 5 | movimiento + gravedad | joystick mueve, salto |
| 6 | tilemap aurícula derecha | plataformas + paredes + colisión |
| 7 | cámara scrolleable | sigue al héroe |
| 8 | latido + válvula primera | timing puzzle simple |
| 9 | primer enemigo (coco) | walk + colisión con héroe |
| 10 | sistema de ataque | DenK dispara, Mac golpea |
| 11 | hazards (fibrina, pus, geyser) | obstáculos completos |
| 12 | cámaras 2-4 | resto del nivel |
| 13 | boss Pyogenes | 3 fases |
| 14 | reward + return a TD | cinemática salida |

Cada commit se push'ea y deploya a Vercel antes de continuar al siguiente.

---

## 10. Cosas que NO hacemos en v1

- Audio nuevo (reusamos sfx existentes)
- Sprites custom (todo dibujado en canvas)
- Cinemáticas elaboradas (solo fade in/out + texto)
- Multi-touch elegante (un dedo por control)
- Salvado de progreso del hero level si el jugador sale (siempre se reinicia el nivel)

Estos quedan para v2 si el prototipo funciona.
