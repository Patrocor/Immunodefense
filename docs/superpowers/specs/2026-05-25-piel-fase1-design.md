# Fase 1 = infección de piel: roster cutáneo + camino serpenteante

Fecha: 2026-05-25
Estado: aprobado

## Objetivo

Fase 1 representa una **infección cutánea**. Dos mejoras:
1. **Roster cutáneo**: solo ingresan gérmenes de piel/tejidos blandos.
2. **Tránsito serpenteante**: el camino atraviesa las capas de la piel
   (epidermis → dermis → hipodermis → vaso) en 3 barridos horizontales, con
   las bandas de capas teñidas.

## Parte A — Roster cutáneo

### Se eliminan de las oleadas (no son de piel)
`ecoli`, `spneumoniae`, `influenza`, `vih`, `bossTuberculosis`, `bossAspergillus`.
Sus `ENEMY_DEFS` se conservan (evita romper dispatch/legacy); solo dejan de
aparecer en `WAVE_TABLE` y en el `bossPool` post-18.

### Patógenos regulares
Los nuevos reutilizan morfología existente; recoloreados por `def.color`/
`def.colorDark` (y `def.colorLight` para bacilos).

| id | Nombre | baseKind | Render | color (mid/dark/light) | speed·hp·reward·viral | shield |
|---|---|---|---|---|---|---|
| `sepidermidis` (nuevo) | Staphylococcus epidermidis | bacteria | drawBacteria | #90A4AE / #546E7A | 1.3 · 120 · 6 · 4 | — |
| `hsv` (nuevo) | Herpes simplex (HSV) | virus | drawVirus | #9575CD / #4527A0 | 1.55 · 130 · 9 · 6 | — |
| `cacnes` (nuevo) | Cutibacterium acnes | bacteria | drawEcoli | #C9A66B / #7a5c33 / #E8D2A8 | 0.7 · 280 · 12 · 6 | wall maxHP2 |
| `pseudomonas` (nuevo) | Pseudomonas aeruginosa | bacteria | drawEcoli | #26A69A / #00695C / #80DEEA | 1.0 · 360 · 16 · 7 | wall maxHP3, regen |
| `candida` (queda) | Candida albicans | hongo | drawCandida | propia | 0.9 · 375 · 15 · 8 | wall |
| `saureus` (queda) | Staphylococcus aureus | bacteria | drawSaureus | propia | 0.7 · 525 · 18 · 8 | cápsula+biofilm |

### Jefes (oleadas 3 / 7 / 12 / 18)
Narrativa: comensal → piógeno → necrosante → resistente.

| id | Nombre | wave | Render | color (mid/dark/light) | speed·hp·reward·viral | shield |
|---|---|---|---|---|---|---|
| `bossPyogenes` (queda) | Streptococcus pyogenes | 3 | drawBossPyogenes | propia | 0.8 · 1050 · 50 · 15 | cápsula maxHP6 |
| `bossPseudomonas` (nuevo) | Pseudomonas aeruginosa | 7 | drawEcoli (escala boss) | #00ACC1 / #00606e / #4DD0E1, r30 | 0.9 · 1400 · 65 · 18 | wall maxHP6, regen |
| `bossClostridium` (nuevo) | Clostridium perfringens (gangrena gaseosa) | 12 | drawBoss | #546E7A / #263238, r32 | 0.55 · 1650 · 80 · 22 | wall maxHP5 |
| `bossMRSA` (queda) | MRSA | 18 | drawBossMRSA | propia | 0.6 · 2700 · 150 · 35 | cápsula maxHP10 |

Cada nuevo def lleva `tooltip` educativo (clínica cutánea).

### Cambios de código (Parte A)
- `ENEMY_DEFS`: añadir `sepidermidis`, `hsv`, `cacnes`, `pseudomonas`,
  `bossPseudomonas`, `bossClostridium`.
- `drawEcoli`: parametrizar los 3 stops del gradiente y los trazos a
  `e.def.colorLight/color/colorDark` con los verdes actuales como default
  (no rompe nada; `ecoli` mantiene su verde).
- `drawEnemy` dispatch: añadir `cacnes`→drawEcoli, `pseudomonas`→drawEcoli,
  `bossPseudomonas`→drawEcoli, `bossClostridium`→drawBoss.
  (`sepidermidis`→bacteria, `hsv`→virus caen por baseKind, ya recoloreado.)
- `WAVE_TABLE` (1–18): reescribir con el roster cutáneo, jefes en 3/7/12/18.
- `getWaveDef` post-18: `bossPool` → skin bosses.
- `BOSS_WAVES`: actualizar a skin bosses (tidiness; está sin uso real).

## Parte B — Camino serpenteante por capas

### Tronco principal (3 barridos)
Reemplazar `mainAnchorsNorm` (la "S" de 5 curvas) por anclas en zigzag
horizontal amplio (confluencia y=0.22 → vaso y=0.88):

```
{0.50, 0.22}  confluencia
{0.16, 0.32}
{0.84, 0.44}   ← barrido 1 (izq→der)
{0.16, 0.58}   ← barrido 2 (der→izq)
{0.84, 0.70}   ← barrido 3 (izq→der)
{0.80, 0.88}  vaso
```
Catmull-Rom suaviza a serpentina. Extremos en 0.16/0.84 dejan canales
verticales libres en los márgenes para colocar torres. Si al probar el
corredor queda muy apretado para torres, ensanchar separación vertical o
acercar extremos a 0.20/0.80. Bump `STEPS` 26→30 para curvas más suaves.

### Bandas de capas (teñido)
Nueva `drawSkinLayers()` con bandas horizontales sutiles, dibujada bajo el
path (después del fondo, antes de tejido/path):
- **Epidermis** 0–0.15 (ya existe `drawSkinZone`, se conserva)
- **Dermis** 0.15–0.52 — rosa cálido `rgba(230,150,140,0.10)`
- **Hipodermis** 0.52–0.82 — amarillo pálido (grasa) `rgba(245,225,150,0.12)`
- **Circulatorio/vaso** 0.82–1.0 (ya existe `drawCirculatoryZone`)
Etiquetas tenues en el borde izquierdo ("EPIDERMIS / DERMIS / HIPODERMIS"),
baja opacidad, no invasivas.

### Cambios de código (Parte B)
- `mainAnchorsNorm` en `rebuildPath`: nuevas anclas.
- `buildBezierPath` STEPS 26→30 (opcional).
- `drawSkinLayers()` nueva + llamada en el orden de render correcto.

## Verificación
- Capturas headless en portrait/landscape: confirmar serpentina de 3
  barridos sin cortes, bandas de capas visibles, y que se pueden colocar
  torres en los márgenes/huecos.
- Jugar oleadas 1→3: confirmar que solo aparecen gérmenes de piel y el jefe
  S. pyogenes en W3. Verificar recoloreo (Pseudomonas turquesa, C. acnes
  beige, HSV morado, S. epidermidis gris-azul).

## Fuera de alcance
- Arte nueva dedicada por patógeno (se optó por arte mixta/recoloreada).
- Mecánicas nuevas de patógeno (latencia HSV, biofilm avanzado): futuro.
