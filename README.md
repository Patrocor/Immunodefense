# ImmunoDefense

Tower defense con tema de sistema inmunológico. El jugador controla las
células inmunes del organismo y debe detener la infección antes de que los
patógenos lleguen al vaso sanguíneo.

Prototipo jugable en HTML5 + Canvas 2D. Vanilla JS, sin dependencias, un
único archivo `index.html`. Funciona en desktop y móvil (touch).

## Jugar

- Online (GitHub Pages): https://patrocor.github.io/App-recetas/
- Local: clona el repo y abre `index.html` directamente en el navegador.

## Cómo jugar

- **Click / Tap** en una carta del panel inferior para elegir una célula
  inmune (Macrófago, Linfocito B, Linfocito T).
- **Click / Tap** en el campo para colocarla. Cada torre cuesta ATP.
- **Click / Tap** sobre una torre existente para seleccionarla y poder
  **mejorarla** (hasta nivel 3) o **venderla**.
- **Iniciar Oleada** (botón superior derecho) lanza la siguiente wave.
- Cuando un patógeno alcanza el vaso sanguíneo pierdes una vida.
  Empiezas con 10 vidas. Si llegan a 0 → derrota.
- Supera las 8 oleadas para ganar.

### Atajos de teclado (desktop)

| Tecla | Acción |
|---|---|
| `1` / `2` / `3` | Seleccionar Macrófago / Linfocito B / Linfocito T |
| `Espacio` | Iniciar siguiente oleada |
| `Esc` | Cancelar selección |

## Unidades

**Células inmunes (torres):**
- **Macrófago** — corto alcance, golpe instantáneo, alto daño cuerpo a cuerpo.
- **Linfocito B** — largo alcance, dispara anticuerpos a alta cadencia.
- **Linfocito T** — alcance medio, daño en área (citotoxicidad).

**Patógenos (enemigos):**
- **Bacteria** — lento, mucha vida.
- **Virus** — muy rápido, poca vida.
- **Hongo** — velocidad y vida medias.

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

- Sprites en lugar de formas geométricas.
- Habilidades activas (inflamación, fiebre).
- Más tipos de patógenos y células inmunes.
- Audio.
