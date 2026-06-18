# Arte del cómic intro (ImmunoDefense — Fase 1)

Deja aquí las imágenes generadas. El juego las carga a pantalla completa
(cover) y las anima con paneo/zoom/fundidos.

## Especificaciones
- **Formato:** WebP (`cwebp -q 85 input.png -o output.webp`). El juego solo busca `.webp`; si generás arte nuevo en PNG/JPG, convertilo antes de commitear.
- **Orientación:** VERTICAL. Ideal **9:16** (1080×1920). También sirve 2:3 (1024×1536); recorto al centro.
- **Sin texto/letras/bocadillos** en la imagen: los subtítulos y la UI los pongo yo por encima (quedan nítidos y editables).
- **Estilo consistente** entre paneles (mismo niño "Tomás", mismo trazo y paleta).

## Nombres de archivo (importante para la integración)
- `intro1.webp` — Parque: Tomás se cae y se raspa la rodilla.
- `intro2.webp` — Clínica: el doctor lo atiende (bandeja con frasco + pastillas + apósito).
- `intro3.webp` — En casa: despega el apósito y mira la herida reabierta.
- `intro4.webp` — Se asoma al túnel rojo de la herida con gérmenes (transición).
- `intro5.webp` — Mundo microscópico completo (tejido + gérmenes); destino del zoom → Fase 1.
