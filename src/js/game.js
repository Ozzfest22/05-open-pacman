// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Puntos por comer un power pellet.
const PELLET_SCORE = 50;

// Esquina de huida de Clyde (celda transitable inferior-izquierda).
const CLYDE_CORNER = { x: 1, y: 29 };

// Celda de salida de la pen: arriba de la puerta.
const PEN_EXIT = { x: 13, y: 11 };

// Frames de espera en la pen antes de salir, uno tras otro (estilo clasico).
const RELEASE_DELAY = { blinky: 0, pinky: 0, inky: 90, clyde: 180 };

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  // Los power pellets (4) cuentan igual que los dots: sin comerlos no se gana.
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      wait: RELEASE_DELAY[ g.kind ] || 0,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// El fantasma esta dentro de la pen (interior o sobre la puerta)?
function inPen( x, y ) {
  if ( y === 12 && ( x === 13 || x === 14 ) ) return true; // puerta
  return x >= 11 && x <= 16 && y >= 13 && y <= 15;         // interior
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  if ( isWall( grid, tx, ty, actor ) ) return false;
  // Puerta pen: un fantasma fuera de la jaula no puede volver a entrar.
  if ( actor === 'ghost' && grid[ ty ][ tx ] === 3 && !inPen( x, y ) ) return false;
  return true;
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Comer power pellet (el modo asustado se activa en el paso 2).
    else if ( grid[ p.y ][ p.x ] === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += PELLET_SCORE;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Celda objetivo de un fantasma segun su personalidad.
// Devuelve { x, y } en celdas, o null si no hay target (fallback aleatorio).
// El target puede caer en celda-muro o fuera del laberinto: solo se usa como
// referencia de distancia, nunca se camina hacia el directamente.
function targetFor( game, g ) {
  const p = game.pacman;
  // Dentro de la pen la prioridad es salir por la puerta; la personalidad
  // se aplica al llegar a la celda de salida.
  if ( inPen( Math.round( g.x ), Math.round( g.y ) ) ) return PEN_EXIT;
  // Blinky (agresivo): la celda actual de Pac-Man.
  if ( g.kind === 'blinky' ) {
    return { x: Math.round( p.x ), y: Math.round( p.y ) };
  }
  // Pinky (emboscador): la celda 4 por delante de Pac-Man en su direccion.
  if ( g.kind === 'pinky' ) {
    const d = DIRS[ p.dir ];
    return { x: Math.round( p.x ) + d.x * 4, y: Math.round( p.y ) + d.y * 4 };
  }
  // Inky (vectorial): 2 x (Pacman + 2*dir) - posicion de Blinky.
  if ( g.kind === 'inky' ) {
    const blinky = game.ghosts[ 0 ];
    const d = DIRS[ p.dir ];
    return {
      x: 2 * ( Math.round( p.x ) + d.x * 2 ) - blinky.x,
      y: 2 * ( Math.round( p.y ) + d.y * 2 ) - blinky.y,
    };
  }
  // Clyde (timido): persigue si esta lejos de Pac-Man, si no huye a su esquina.
  if ( g.kind === 'clyde' ) {
    const dist = Math.abs( g.x - Math.round( p.x ) ) + Math.abs( g.y - Math.round( p.y ) );
    return dist > 8 ? { x: Math.round( p.x ), y: Math.round( p.y ) } : CLYDE_CORNER;
  }
  // kind desconocido (o sin estrategia aun): deambular.
  return null;
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  const target = targetFor( game, g );
  if ( !target ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  // Elegir el cruce que mas reduce la distancia Manhattan al target.
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const dist = Math.abs( g.x + d.x - target.x ) + Math.abs( g.y + d.y - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  // Espera de salida de la pen: el fantasma esta inmovil hasta su turno.
  if ( g.wait > 0 ) {
    g.wait--;
    return;
  }

  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.wait = RELEASE_DELAY[ g.kind ] || 0;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
