# ImmunoDefense

Tower defense con tema de sistema inmunológico. El jugador despliega células
inmunes para contener una infección que avanza desde la piel hacia distintos
órganos y, finalmente, puede desencadenar sepsis y falla multiorgánica.

Juego HTML5 + Canvas 2D escrito en JavaScript vanilla. Funciona en desktop,
móvil web y como aplicación nativa mediante Capacitor.

## Jugar

- Online (GitHub Pages): https://patrocor.github.io/Immunodefense/
- Online (Vercel): https://immunodefense.vercel.app
- Local: `npm run serve` y abre http://localhost:5173.

## Campaña

La campaña conecta cinco etapas mediante un mapa corporal:

1. **Fase 1 · Piel** — 10 oleadas y cuatro jefes.
2. **Diseminación** — 12 oleadas en tres carriles: corazón, hueso y
   articulación.
3. **Fase 2** — Endocarditis, Osteomielitis o Artritis séptica, según la
   rama desbloqueada.
4. **Fase 3** — nueve complicaciones posibles, tres por cada rama de Fase 2.
5. **Sepsis y Shock/MODS** — cierre sistémico y jefe final.

Cada campaña recorre una de las tres ramas de órgano; las demás quedan
disponibles para nuevas partidas.

## Progreso de campaña

El juego guarda progreso localmente en el navegador/dispositivo mediante
`localStorage`. Al volver a abrir ImmunoDefense, la pantalla de título muestra
**Continuar**, **Nueva partida** y **Ver mapa** si ya existe una campaña en
curso. El guardado ocurre en hitos narrativos; no conserva una oleada a mitad
del combate.

También hay logros persistentes con notificaciones en pantalla para hitos como
primera eliminación, oleadas alcanzadas, Diseminación resuelta, llegada a
Sepsis y final de Shock/MODS.

## Cómo jugar

- **Click / Tap** en una carta del dock para elegir una célula inmune.
- **Click / Tap** en el campo para colocarla. La mayoría cuesta ATP; el
  Cañón del Complemento usa fragmentos de complemento en vez de ATP.
- **Click / Tap** sobre una torre existente para seleccionarla y poder
  **mejorarla** (hasta nivel 3) o **venderla**.
- **Iniciar Oleada** (botón superior derecho) lanza la siguiente wave.
- Los patógenos que alcanzan el torrente aumentan la carga de infestación.
- Fase 1 termina al derrotar a MRSA en la oleada 10 o cuando la infestación
  desborda la barrera. Ambos desenlaces continúan la historia en
  **Diseminación**.
- Cada nivel posterior tiene integridad propia, condición de derrota,
  mecánica fisiológica y poder de base.

### Atajos de teclado (desktop)

| Tecla | Acción |
|---|---|
| `1` / `2` / `3` | Seleccionar Neutrófilo / Linfocito B / Linfocito T |
| `Espacio` | Iniciar siguiente oleada |
| `Esc` | Cancelar selección |
| `M` | Mute / unmute |
| `R` | Reiniciar (con confirmación) |

## Contenido

- Cerca de 30 definiciones de células y estructuras defensivas, incluidas
  unidades residentes específicas de corazón, hueso, articulación y fases
  sistémicas.
- Más de 40 definiciones de patógenos y jefes con escudos, auras, biofilm,
  esporas, migración, embolización y otras mecánicas.
- Loadout, mejoras, venta, poderes activos, medicamentos, compendio, tutorial,
  audio sintetizado y 10 logros persistentes.
- Sprites WebP opcionales con fallback a gráficos Canvas.

## Branches

- **`main`** → juego HTML5 actual.
- **`godot-prototype`** → prototipo inicial en Godot 4 (preservado como
  backup, no se usa para el deploy de GitHub Pages).

## Stack

- HTML + CSS + JavaScript vanilla
- Canvas 2D
- Sin framework ni bundler: `index.html` carga el motor monolítico `game.js`.
- `npm run build` copia `index.html`, `game.js` y `assets/` a `www/`.
- Vercel y Capacitor consumen `www/`; GitHub Pages sirve los fuentes raíz.
- `npm run sync`, `npm run android` y `npm run ios` sincronizan o abren los
  proyectos nativos.

## Desarrollo

- `npm run build` — genera `www/`.
- `npm run serve` — genera `www/` y levanta el juego local.
- `npm run playtest` — sirve los fuentes raíz; abre
  http://localhost:5173/playtest.html para usar saltos de nivel y ayudas
  mediante `window.__game`.

## Próximas mejoras

- Añadir pruebas smoke automáticas para todos los niveles y la persistencia.
- Completar sprites de patógenos y células que aún usan fallback Canvas.
- Modularizar gradualmente `game.js` para reducir el riesgo de regresiones.
- Medir rendimiento y memoria en sesiones largas de Android e iOS.
