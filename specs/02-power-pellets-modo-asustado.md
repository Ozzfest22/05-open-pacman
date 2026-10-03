# SPEC 02 — Power pellets y modo asustado

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-10-03
> **Objective:** Añadir 4 power pellets al laberinto que activan un modo asustado de ~6 s durante el cual Pac-Man puede comer fantasmas.

## Scope

**In:**

- Carácter `'o'` en `MAZE_STR` → código `4` en `parseTile` de `src/js/maze.js`, con 4 pellets en las esquinas: (1,3), (26,3), (1,26), (26,26).
- Comer un pellet: `+50` puntos, `dotsRemaining--` e inicio del modo asustado.
- Modo asustado de 360 frames (~6 s): los fantasmas invierten su dirección al activarse, se mueven a la mitad de `GHOST_SPEED` y eligen dirección aleatoria en cada cruce (fuera de la pen).
- Comer fantasmas con puntuación progresiva 200 → 400 → 800 → 1600 por ronda.
- El fantasma comido vuelve a su celda de `GHOST_STARTS`, con `dir: 'up'` y su `RELEASE_DELAY`, y espera a salir de nuevo.
- Un segundo pellet durante el modo reinicia el temporizador a 360 frames y la cadena de puntos a 200.
- Colisión sin modo asustado = pérdida de vida (regla actual), que además apaga el modo.
- Visual en `src/js/render.js`: pellets blancos de radio 6 px; fantasmas azules durante el modo, con parpadeo blanco en los últimos 120 frames.
- Los power pellets cuentan para `dotsRemaining`: la partida solo se gana comiéndolos todos.

**Out of scope (for future specs):**

- Sonido.
- Animación de ojos del fantasma comido (regresa por teleport, sin vuelo visible).
- Extra-life a 10.000 puntos.
- HUD con temporizador del modo o contador de fantasmas comidos.
- Velocidad de fantasmas o duración del modo por nivel.
- Fases scatter con temporizador (queda diferido del SPEC 01).
- Cualquier cambio al laberinto más allá de los 4 carácteres `'o'`, al canvas o a las vidas.

## Data model

```js
// src/js/maze.js — parseTile gana un código y MAZE_STR gana 4 'o'
if ( ch === 'o' ) return 4;
// filas modificadas (solo cambian las esquinas):
// fila 3:  '#o####.#####.##.#####.####o#'
// fila 26: '#o.....##....##....##.....o#'
```

```js
// src/js/game.js — constantes del modo
const PELLET_SCORE = 50;
const FRIGHT_FRAMES = 360;  // 6 s a 60 fps
const FRIGHT_FLASH = 120;   // últimos 2 s: parpadeo blanco
const GHOST_EAT_SCORES = [ 200, 400, 800, 1600 ];
```

```js
// src/js/game.js — campos nuevos en createGame()
frightenedTimer: 0,   // frames restantes; 0 = modo apagado (a nivel de partida)
ghostChain: 0,        // índice en GHOST_EAT_SCORES

// por fantasma:
eaten: false,         // comido en esta ronda; no se puede volver a comer
```

Notas:

- El modo es global (`game.frightenedTimer`), no por fantasma: no hace falta más estado.
- `grid[y][x] === 4` no bloquea movimiento: `isWall` solo trata `1` y `3`.
- La cadena se reinicia al tragar cualquier pellet y se lee con `Math.min( ghostChain, 3 )`.

## Implementation plan

1. **`src/js/maze.js` + `src/js/game.js`:** `parseTile` acepta `'o'` → `4`; reemplazar los 4 puntos de esquina de `MAZE_STR` por `'o'`; en `createGame()` contar `v === 2 || v === 4` en `dotsRemaining`; en `movePacman` comer celda `=== 4` con `PELLET_SCORE` (todavía sin modo). Manual: el juego arranca sin errores, cada `'o'` da 50 puntos y la partida se gana comiéndolo todo.
2. **`src/js/game.js`:** añadir `frightenedTimer` y `ghostChain` al estado; al tragar un pellet: activar `frightenedTimer = FRIGHT_FRAMES`, `ghostChain = 0` e invertir `g.dir` de los 4 fantasmas con `OPPOSITE`; en `targetFor`, si `frightenedTimer > 0` y el fantasma no está en la pen, devolver `null` (fallback aleatorio de `decideGhost`); en `moveGhost`, usar `GHOST_SPEED / 2` mientras el modo esté activo; decrementar `frightenedTimer` al final de `update`, después de las colisiones. Manual: al tragar un pellet los fantasmas invierten, se mueven más lento y deambulan durante ~6 s.
3. **`src/js/game.js`:** reescribir el bucle de colisión de `update()`. Si hay modo y el fantasma no está `eaten`: sumar `GHOST_EAT_SCORES[ Math.min( ghostChain, 3 ) ]`, `ghostChain++`, marcar `eaten = true` y teletransportar el fantasma a su celda de `GHOST_STARTS` con `dir: 'up'` y `wait = RELEASE_DELAY[ g.kind ]`. Si hay modo y ya está `eaten`: no pasa nada. Si no hay modo: la pérdida de vida actual, y al apagar el modo (fin de temporizador o muerte) limpiar `eaten` de los 4. Manual: comer fantasmas suma 200/400/800/1600 sin perder vida; una colisión tras acabar el modo resta vida.
4. **`src/js/render.js`:** nueva `drawPellets( ctx, grid )` con círculos blancos de radio 6 en las celdas `=== 4`, llamada desde `draw()`; constante `FRIGHT_FLASH`; en `draw()` calcular el color de cada fantasma: modo activo → `#2121ff`, y en los últimos 120 frames alternar `#2121ff` / `#ffffff` cada 15 frames; si no hay modo, `GHOST_COLORS[ i ]`. Manual: se ven los 4 pellets, los fantasmas se pintan azules y parpadean al final del modo.

## Acceptance criteria

- [ ] El juego carga sin errores en la consola.
- [ ] `MAZE_STR` contiene exactamente 4 `'o'`, en (1,3), (26,3), (1,26) y (26,26).
- [ ] Comer un power pellet suma 50 puntos.
- [ ] Comer un power pellet activa el modo asustado durante ~6 s (359–360 frames).
- [ ] Al activarse, los 4 fantasmas invierten su dirección al instante.
- [ ] Mientras dura el modo, los fantasmas se mueven a 0.05 celda/frame (la mitad de `GHOST_SPEED`).
- [ ] Fuera de la pen, un fantasma asustado elige dirección aleatoria en cada cruce.
- [ ] Un fantasma dentro de la pen durante el modo sale por la puerta con normalidad.
- [ ] Colisión con un fantasma no `eaten` durante el modo: Pac-Man no pierde vida y suma 200, luego 400, 800 y 1600.
- [ ] El fantasma comido reaparece en su celda de `GHOST_STARTS` con `dir: 'up'` y su `RELEASE_DELAY`.
- [ ] Un fantasma `eaten` no puede ser comido otra vez hasta que el modo termine.
- [ ] Tragar un segundo pellet reinicia el temporizador a 360 frames y la cadena vuelve a 200.
- [ ] Los fantasmas se pintan de `#2121ff` durante el modo y alternan con blanco cada 15 frames en los últimos 120.
- [ ] Los power pellets se dibujan como círculos blancos de radio 6 px.
- [ ] `dotsRemaining` incluye los 4 pellets: no se puede ganar sin comérselos.
- [ ] Tras perder una vida se apaga el modo asustado; los pellets ya comidos siguen comidos.
- [ ] Terminado el modo, una colisión con un fantasma resta una vida (regla actual).
- [ ] No se añadieron sonidos, extra-life ni cambios al HUD.

## Decisions

- **Sí:** puntuación progresiva 200/400/800/1600 por ronda. Es la clásica y premia encadenar.
- **No:** puntos fijos por fantasma. Menos incentivo, menos verificable.
- **Sí:** el fantasma comido regresa a su celda de `GHOST_STARTS` con su `RELEASE_DELAY`. Reutiliza la mecánica de salida de la pen ya existente.
- **No:** renacer en el sitio o al perder una vida. Dejaría al fantasma vulnerable o inoperante.
- **Sí:** duración fija de 360 frames (6 s), sin escalado por nivel. El juego hoy no tiene niveles con dificultad.
- **Sí:** invertir la dirección de todos los fantasmas al activar. Regla clásica, 3 líneas de código.
- **Sí:** invertir incluso a mitad de celda. Así lo hace el original; alinear antes solo retrasa el efecto.
- **Sí:** fantasmas asustados a la mitad de velocidad. Hace transitable la huida sin nuevos algoritmos.
- **Sí:** asustados deambulan aleatorio reutilizando el fallback `target = null` de `decideGhost`. Cero lógica nueva.
- **No:** huida activa (celda más lejana de Pac-Man). Requeriría otra rama de `targetFor` y más riesgo de órbitas raras.
- **Sí:** en la pen manda `PEN_EXIT` aunque el modo esté activo. La pen tiene prioridad sobre cualquier target.
- **Sí:** codificar el pellet como `'o'` → `4` dentro de `MAZE_STR`. Una sola fuente de verdad para geometría y pellets.
- **No:** lista de coordenadas aparte en `maze.js`. Dos fuentes que se desincronizan al tocar el laberinto.
- **Sí:** 4 pellets en (1,3), (26,3), (1,26), (26,26). Distribución clásica de esquinas.
- **Sí:** los pellets cuentan para `dotsRemaining`. En el original hay que comerlos todos para pasar de nivel.
- **Sí:** cadena de 200→1600 se reinicia con cada pellet nuevo. Regla clásica, evita farmeo encadenando pellets.
- **Sí:** flag `eaten` por fantasma. Sin él, campar en (13,11) con Blinky daría 1600 puntos por frame durante el modo.
- **Sí:** apagar el modo y limpiar `eaten` al morir. Estado limpio tras cada pérdida de vida.
- **Sí:** parpadeo blanco en los últimos 2 s (`FRIGHT_FLASH = 120`). Aviso de que el modo va a acabar.
- **Sí:** pellets blancos, radio 6 px, estáticos. Se distinguen de los dots (`#ffb897`, radio 2.5) sin animación.
- **No:** temporizador o contador en el HUD. El aviso visual es el parpadeo; el HUD es otro spec.
- **No:** sonido, ojos del fantasma comido, extra-life a 10.000, velocidad/duración por nivel.

## Risks

| Riesgo                                                        | Mitigación                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Campar en (13,11) y comer a Blinky una y otra vez             | Flag `eaten`: el fantasma comido no vuelve a ser comible hasta que el modo termine.                |
| El código `4` rompe el bloqueo de movimiento                  | `isWall` solo trata `1` y `3`; se verifica jugando que Pac-Man atraviesa y come la celda `'o'`.     |
| La duración en frames depende de 60 fps                       | Misma unidad que `RELEASE_DELAY` y las velocidades actuales; si cambia el ritmo, lo hace todo el juego. |
| Invertir dirección a mitad de celda produce un tirón visual   | Es el comportamiento del original; se acepta tal cual.                                              |

## What is **not** in this spec

- Sonido.
- Animación de ojos del fantasma comido.
- Extra-life a 10.000 puntos.
- HUD con temporizador o contador de fantasmas.
- Velocidad o duración por nivel.
- Fases scatter con temporizador.

Cada uno de esos, si algún día se implementa, va en su propio spec.
