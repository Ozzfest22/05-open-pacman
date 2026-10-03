# SPEC 01 — Cuatro fantasmas con personalidades clásicas

> **Status:** Approved
> **Date:** 2026-09-28
> **Objective:** Añadir los 4 fantasmas clásicos de Pac-Man (Blinky, Pinky, Inky y Clyde), cada uno con su propia estrategia de persecución, con Blinky persiguiendo agresivamente a Pac-Man.

## Scope

**In:**

- 4 fantasmas en `GHOST_STARTS` (hoy hay 2) con `kind: 'blinky' | 'pinky' | 'inky' | 'clyde'`.
- 4 estrategias de giro en `src/js/game.js` (una por `kind`):
  - **Blinky (agresivo):** persecución directa — el cruce que más reduce la distancia Manhattan a la celda de Pac-Man (es el comportamiento `hunter` actual).
  - **Pinky (emboscador):** apunta a la celda a 4 por delante de Pac-Man en su dirección actual.
  - **Inky (vectorial):** apunta a `2 × (Pacman + 2×dir) − posición de Blinky`.
  - **Clyde (tímido):** si su distancia Manhattan a Pac-Man es > 8 celdas lo persigue; si no, va a la esquina inferior-izquierda.
- Reparto clásico de aparición: Blinky (13,11) fuera de la pen; Pinky (13,14), Inky (11,14) y Clyde (15,14) dentro.
- Colores clásicos en `src/js/render.js`, en orden de aparición: rojo, rosa, cian, naranja.

**Out of scope (for future specs):**

- Power pellets y modo asustado (fantasmas azules comestibles).
- Fases scatter con temporizador (esquinas de huida alternando con persecución).
- Velocidad distinta por fantasma.
- Marcadores de debug que dibujen la celda objetivo de cada fantasma.
- Cambios al laberinto, al canvas, al HUD o a las reglas de puntos/vidas.

## Data model

```js
// src/js/maze.js — sustituye a los 2 fantasmas actuales
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' }, // fuera de la pen
  { x: 13, y: 14, kind: 'pinky' },  // pen
  { x: 11, y: 14, kind: 'inky' },   // pen
  { x: 15, y: 14, kind: 'clyde' },  // pen
];
```

```js
// src/js/game.js — esquina de huida de Clyde (celda transitable inferior-izquierda)
const CLYDE_CORNER = { x: 1, y: 29 };
```

Notas:

- No hay más estructuras nuevas: los objetos fantasma ya llevan `kind` desde `createGame()`.
- Las distancias se calculan en celdas (Manhattan). Un target puede caer en celda-muro o fuera del laberinto: solo se usa como referencia de distancia, nunca se camina hacia él directamente.
- El orden del array es contrato: `game.ghosts[0]` es Blinky porque Inky lee su posición.

## Implementation plan

1. **`src/js/maze.js` + `src/js/game.js`:** expandir `GHOST_STARTS` a las 4 entradas clásicas y reescribir `decideGhost` para calcular un target con `targetFor( game, g )` (Blinky → celda de Pac-Man; `kind` desconocido → mantiene la selección aleatoria actual como fallback). Manual: el juego arranca con 4 fantasmas, Blinky persigue y los otros 3 deambulan.
2. **`src/js/game.js`:** añadir el target de `'pinky'` = Pac-Man desplazado 4 celdas en `pacman.dir`. Manual: Pinky se coloca por delante de Pac-Man en vez de deambular.
3. **`src/js/game.js`:** añadir el target de `'inky'` (vector con Blinky, lee `game.ghosts[0]`) y la lógica de `'clyde'` (persecución si Manhattan > 8, si no `CLYDE_CORNER`). Manual: los 4 fantasmas muestran comportamientos distinguibles al jugar.
4. **`src/js/render.js`:** reordenar `GHOST_COLORS` a `[ '#ff0000', '#ffb8ff', '#00ffff', '#ffb852' ]`. Manual: cada fantasma lleva su color clásico.

## Acceptance criteria

- [ ] El juego carga sin errores en la consola.
- [ ] Hay exactamente 4 fantasmas al iniciar y tras cada pérdida de vida.
- [ ] Aparecen en (13,11), (13,14), (11,14) y (15,14), todos con dirección inicial `up`.
- [ ] Los colores en orden de aparición son rojo, rosa, cian y naranja.
- [ ] Blinky siempre elige el cruce que reduce la distancia Manhattan a la celda actual de Pac-Man.
- [ ] Pinky apunta a la celda 4 por delante de Pac-Man en su dirección actual.
- [ ] Inky apunta a `2 × (Pacman + 2×dir) − Blinky`.
- [ ] Clyde persigue si su distancia Manhattan a Pac-Man es > 8 celdas; si no, se dirige a (1,29).
- [ ] Ningún fantasma invierte su dirección salvo en callejón sin salida (regla actual).
- [ ] Los 4 se mueven a `GHOST_SPEED` (1/10 celda/frame).
- [ ] Los 3 fantasmas de la pen salen al laberinto pasando por la puerta de (13,12)-(14,12).
- [ ] Tras morir, los 4 vuelven a sus posiciones iniciales.
- [ ] No se añadieron power pellets ni estados de fantasma asustado.

## Decisions

- **Sí:** personalidades clásicas de Pac-Man. Probadas, conocidas y fáciles de verificar jugando.
- **No:** inventar 4 comportamientos nuevos. Más diseño sin beneficio probado.
- **Sí:** agresivo = persecución directa Manhattan con velocidad uniforme. Es el `hunter` actual, ya funciona.
- **No:** velocidad mayor para el agresivo. Sin modo asustado podría volver la partida injusta.
- **No:** power pellets / modo asustado. Spec propio si algún día se quiere.
- **No:** fases scatter con temporizador. Solo Clyde usa su esquina, dentro de su propia lógica.
- **Sí:** nombres clásicos (`blinky`/`pinky`/`inky`/`clyde`) como valores de `kind`. Leen como personajes, no como algoritmos.
- **No:** conservar `'hunter'`/`'random'` como `kind` válidos. Se sustituyen en el paso 1; queda un fallback aleatorio para `kind` desconocidos.
- **Sí:** distribución clásica con Blinky fuera de la pen. Es la que más distingue al agresivo desde el primer segundo.
- **Sí:** reordenar `GHOST_COLORS` a rojo/rosa/cian/naranja. El color queda atado al índice de aparición.
- **No:** marcadores de target de debug. Se verifica jugando (decisión del usuario).
- **No:** reproducir el bug clásico de desbordamiento de Pinky al apuntar hacia arriba. Aritmética limpia.

## Risks

| Risk                                | Mitigation                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Inky depende de `game.ghosts[0]` (Blinky) | El contrato de orden de `GHOST_STARTS` queda documentado en `maze.js` y `game.js`. |
| La selección greedy sin giro de 180 puede orbitar bloques | Ya es el comportamiento actual del `hunter`; se acepta el mismo límite.    |
| Targets de Pinky/Inky caen fuera del laberinto | Solo se usan para distancia; `isWall` no se consulta sobre el target.    |

## What is **not** in this spec

- Power pellets y modo asustado (otro spec).
- Fases scatter con temporizador (otro spec).
- Velocidades por fantasma.
- Debug visual de targets.
- Cualquier cambio al laberinto, canvas o reglas de puntuación.

Cada uno de esos, si algún día se implementa, va en su propio spec.
