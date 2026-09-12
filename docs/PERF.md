# Medición de rendimiento (ImmunoDefense)

Este documento describe la baseline automática del motor y cómo interpretarla
antes de optimizar efectos visuales o trocear más código.

## Comando

```bash
npm run perf
```

Ejecuta `scripts/smoke-perf.mjs`: carga `data/*.js` + `game.js` en Node, simula
Diseminación (12 oleadas), Sepsis y MODS con `__game.step()`, y reporta picos.

También está en `npm run test:all`.

## Métricas reportadas

| Métrica | Qué mide |
|---------|----------|
| `parseBytes` | Tamaño total de fuentes cargados (game + data) |
| `bootMs` | Tiempo de arranque del sandbox Node |
| `engineBootMs` | Tiempo interno registrado al finalizar el IIFE de `game.js` |
| `peakEnemies` / `peakEffects` | Máximo concurrente durante la simulación |
| `disseminationWaveTotals` | Gérmenes por ola (debe ser monótono creciente) |

## Hooks en el juego

- `window.__game.perfSnapshot()` — picos y calidad en runtime
- `window.__game.quality()` — `{ low, motion, highContrast, ... }`

Overrides de URL/hash:

- `#lowfx` / `#hifx` — calidad gráfica
- `#reducemotion` / `#fullmotion` — movimiento reducido
- `#highcontrast` / `#lowcontrast` — contraste alto

El motor respeta `prefers-reduced-motion` y `prefers-contrast: more`.

## Auto-degradado

Si el FPS sostenido cae bajo 45 durante ~4 s de juego activo, `QUALITY.low`
activa el gate global de `shadowBlur` (sin recompilar).

## Próximos pasos (manual)

Medir en Android/iOS reales con las mismas fases finales y comparar contra
esta baseline Node antes de cambiar efectos o introducir carga diferida.
