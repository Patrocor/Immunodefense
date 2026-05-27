# Lote 2 — 4 gérmenes nuevos de piel (estructura + poder)

Fecha: 2026-05-27
Estado: aprobado (estructura y poderes)

## Objetivo
Cerrar el roster de la Fase 1 con 4 gérmenes clásicos de piel, cada uno con
geometría/rostro propios y un poder distintivo, formando ecosistema con las
defensas nuevas (NK, Eosinófilo, Langerhans, Mastocito).

Todos conservan el daño por contacto (aura `def.attack`) como el resto.
Tamaño: ~1.5× una torre (radio ~24, como los demás clásicos).

## 1. Sarcoptes scabiei — "sarna" · baseKind: `parasito`
- **Estructura:** cuerpo ovalado segmentado, 8 patitas cortas, ojitos malvados,
  marrón terroso. Lectura de "bicho/artrópodo", no microbio.
- **Poder A — Madriguera (`burrow`):** cada ~5 s se entierra ~1.5 s →
  `e.burrowed=true`: intocable por torres (skip en targeting) e invulnerable
  (damageEnemy lo ignora) salvo si está **revelado** (`e.revealed`, lo pone
  Langerhans). Bajo tierra avanza a ×1.9. Reaparece adelante.
  - Estado: `burrowTimer`, `burrowed`, `surfaceTimer`. Visual: se hunde (alpha
    baja + montículo de tierra), reaparece con polvo.
- **Poder B — Larvas:** reusa el sistema de esporas (`spore`) del dermatofito:
  `{ interval: 4.5, childHpFrac: 0.2, childSpeedMult: 1.6, maxChildren: 3 }`.
- **Contra:** Eosinófilo (×2.6), Langerhans (lo revela para poder atacarlo).
- Stats aprox: hp 70, speedMult 1.0, attack medio, radius 24.

## 2. HPV (verrugas) · baseKind: `virus`
- **Estructura:** cápside geométrica facetada (icosaedro) con bultos de
  queratina duros; verde-grisáceo. Lento y macizo.
- **Poder — Coraza de queratina (`shield` con regen):** escudo que reduce el
  daño al cuerpo (sistema de escudo existente) y se **regenera** tras un retardo
  sin recibir golpes. `shield: { type:"wall", maxHP: 4, regenDelay: 3, regen: 1 }`.
  - NK lo rompe rápido (ya implementado: -2 escudo, 60% al cuerpo).
- **Contra:** NK (×2.3 + rompe escudo).
- Stats aprox: hp 110, speedMult 0.6, radius 25.

## 3. Molluscum contagiosum · baseKind: `virus`
- **Estructura:** cúpula nacarada cerosa con hoyuelo central (umbilicada),
  blanda y brillante.
- **Poder — Contagio (`spore`):** cada ~3.5 s suelta una "perla" que germina en
  un nuevo molluscum: `{ interval: 3.5, childHpFrac: 0.4, childSpeedMult: 1.0,
  maxChildren: 3 }`. Telegrafía la perla antes de germinar.
- **Contra:** NK (×2.3).
- Stats aprox: hp 60, speedMult 1.0, radius 24.

## 4. Malassezia · baseKind: `hongo`
- **Estructura:** racimo de levaduras redondas con brillo aceitoso y yemas
  (budding).
- **Poder — Película grasa (`greaseAura`):** aura (radio ~`auraRadius`) que pone
  `slowFireTimer` a las torres cercanas mientras pasa (cadencia ×2). No mata,
  estorba. `greaseAura: { range: 95, slowFire: 1.5 }` (refresca cada frame).
- **Contra:** daño bruto / antiséptico tópico.
- Stats aprox: hp 75, speedMult 0.85, radius 24.

## Cambios de código (index.html)
- `ENEMY_DEFS`: 4 defs nuevas con baseKind/color/stats/poder.
- `spawnEnemy`: init de `burrowTimer/burrowed/surfaceTimer` (sarna),
  `greaseAura` no necesita estado en el germen.
- `updateEnemies`:
  - Madriguera: tic de burrow (entierra/reaparece), gate de invulnerabilidad,
    speed ×1.9 mientras burrowed; targeting ya salta `burrowed && !revealed`.
  - Larvas/Contagio: reusar `spawnSpore` con los parámetros de cada `spore`.
  - greaseAura: aplicar `slowFireTimer` a torres en rango.
- `damageEnemy`: ignorar daño si `e.burrowed && !e.revealed`.
- `drawEnemy` dispatch + 4 funciones de dibujo nuevas (sarna, hpv, molluscum,
  malassezia) con su geometría y carita malvada; visual de enterrado/reaparición.
- Tooltips/fichas: descripción y preview de cada uno.

## Oleadas / balance (Lote 3, aparte)
- Incluir los nuevos por baseKind en el roster; sarna como parásito (nuevo tipo
  o dentro de un grupo de oleada). Ajustar curva de dificultad.

## Verificación
- Sin excepciones; cada germen dibuja distinto; sarna se entierra y reaparece
  (invulnerable salvo marcado); HPV regenera escudo; molluscum se replica;
  Malassezia ralentiza el disparo de torres cercanas.

## Fuera de alcance
- Fase 2; rediseño de gérmenes existentes.
