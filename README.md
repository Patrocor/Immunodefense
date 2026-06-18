# ImmunoDefense

Tower defense con tema de sistema inmunológico. El jugador controla las
células inmunes del organismo y debe detener la infección antes de que los
patógenos lleguen al vaso sanguíneo.

Prototipo jugable en HTML5 + Canvas 2D. Vanilla JS, sin dependencias, un
único archivo `index.html`. Funciona en desktop y móvil (touch).

## Jugar

- Online (GitHub Pages): https://patrocor.github.io/Immunodefense/
- Online (Vercel): https://immunodefense.vercel.app
- Local: clona el repo y abre `index.html` directamente en el navegador.

## Cómo jugar

- **Click / Tap** en una carta del panel inferior para elegir una célula
  inmune (9 tipos disponibles, ver Unidades).
- **Click / Tap** en el campo para colocarla. La mayoría cuesta ATP; el
  Cañón del Complemento usa fragmentos de complemento en vez de ATP.
- **Click / Tap** sobre una torre existente para seleccionarla y poder
  **mejorarla** (hasta nivel 3) o **venderla**.
- **Iniciar Oleada** (botón superior derecho) lanza la siguiente wave.
- Los patógenos que no eliminás a tiempo son absorbidos por el torrente
  sanguíneo. Fase 1 todavía no tiene vidas ni derrota/victoria: es un
  modo de escalada continua, el desafío es la dificultad creciente.
- Hay un jefe cada pocas oleadas (3, 7, 12 y 18). Al cerrar la oleada 18
  (MRSA) se pasa automáticamente al nivel puente **Diseminación**, con
  mecánicas propias (barreras de Fibrina, carriles).

### Atajos de teclado (desktop)

| Tecla | Acción |
|---|---|
| `1` / `2` / `3` | Seleccionar Neutrófilo / Linfocito B / Linfocito T |
| `Espacio` | Iniciar siguiente oleada |
| `Esc` | Cancelar selección |
| `M` | Mute / unmute |
| `R` | Reiniciar (con confirmación) |

## Unidades

**Células inmunes (torres) — 9 tipos:**
- **Neutrófilo** — corto alcance, golpe instantáneo, cuerpo a cuerpo.
- **Linfocito B** — largo alcance, ametralladora de anticuerpos.
- **Linfocito T** — citotóxico, daño en área.
- **Célula de Langerhans** — marca antígenos (+daño de las aliadas).
- **Célula NK** — antiviral, rompe escudos.
- **Eosinófilo** — antiparásito (gránulos).
- **Mastocito** — histamina: ralentiza y hace daño continuo.
- **Cañón del Complemento (MAC)** — disparo manual, ácido que ignora escudos.
- **Malla de Fibrina** — barrera que obstruye el carril (solo en Diseminación).

**Patógenos (enemigos):** ~11 especies con nombre real, cada una con
mecánica propia (escudos, esporas hijas, auras, fagas buscadoras de
torres...) — *S. epidermidis*, *S. aureus*, HSV, *C. acnes*, *Candida*,
Dermatofito, *Pseudomonas*, HPV, Molluscum, Malassezia, sarna
(*Sarcoptes*) — más 4 jefes: *S. pyogenes*, *Pseudomonas*, *Clostridium*
y MRSA. Detalle de cada uno en su tooltip dentro del juego.

## Branches

- **`main`** → prototipo HTML5 jugable (este).
- **`godot-prototype`** → prototipo inicial en Godot 4 (preservado como
  backup, no se usa para el deploy de GitHub Pages).

## Stack

- HTML + CSS + JavaScript vanilla
- Canvas 2D
- Sin frameworks, sin build, sin npm
- Compatible con GitHub Pages

## Roadmap corto

- ~~Audio~~ ✅ hecho (Web Audio API, todo sintetizado).
- Sprites en lugar de formas geométricas — parcial: los personajes del
  nivel Piel (Mac/DenK) ya usan sprites; de los patógenos de Fase 1 solo
  *S. aureus* y *S. epidermidis* tienen sprite propio, el resto sigue en
  formas geométricas (el sistema ya soporta agregarlos sin tocar código).
- Definir condición de derrota/victoria para Fase 1 (hoy es escalada
  infinita sin fin, ver "Cómo jugar").
- Habilidades activas (inflamación, fiebre) — la inflamación hoy es un
  efecto pasivo, sin toggle que el jugador pueda activar.
- Más tipos de patógenos y células inmunes.
