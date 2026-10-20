// Lekki raycaster do krotkich przejsc miedzy scenami.
//
// Ta sama technika, co w starych grach DOS-owych: dla kazdej kolumny ekranu
// puszczamy promien i rysujemy jeden pionowy pasek sciany. Zero bibliotek,
// zero WebGL - i wyglada jak gra z epoki, co akurat gra do reki klimatowi PRL.

export interface WalkMap {
  /** Znaki: # sciana, D drzwi, . podloga, S start, E wyjscie. */
  rows: string[];
  /** Kat startowy w radianach. */
  facing: number;
  caption: string;
}

export interface WalkState {
  x: number;
  y: number;
  angle: number;
  finished: boolean;
}

const FOV = Math.PI / 3;
const MOVE_SPEED = 2.6;
const TURN_SPEED = 2.4;
/** Promien gracza - zeby nie wchodzil nosem w sciane. */
const PADDING = 0.22;

export const WALK_MAPS: Record<string, WalkMap> = {
  klatka: {
    caption: "Klatka schodowa. Trzecie piętro, winda nieczynna od marca.",
    facing: 0,
    rows: [
      "###########",
      "#S........#",
      "#.#######.#",
      "#.#.....#.#",
      "#.#.###.#.#",
      "#...#E..#.#",
      "###########",
    ],
  },
  podworko: {
    caption: "Podwórko-studnia. Trzepak, śmietnik, brama na ulicę.",
    facing: 0,
    rows: [
      "#############",
      "#S..........#",
      "#.####.####.#",
      "#.#......#..#",
      "#.#.####.#.##",
      "#...#..#...E#",
      "#############",
    ],
  },
  zaklad: {
    caption: "Korytarz zakładu. Lastryko, lamperia do połowy ściany.",
    facing: 0,
    rows: [
      "#############",
      "#S.........D#",
      "#.#########.#",
      "#.........#.#",
      "#########.#.#",
      "#E........#.#",
      "#############",
    ],
  },
};

export function parseWalk(map: WalkMap): WalkState {
  for (let y = 0; y < map.rows.length; y++) {
    const x = map.rows[y].indexOf("S");
    if (x !== -1) return { x: x + 0.5, y: y + 0.5, angle: map.facing, finished: false };
  }
  return { x: 1.5, y: 1.5, angle: map.facing, finished: false };
}

const cellAt = (map: WalkMap, x: number, y: number): string => {
  const row = map.rows[Math.floor(y)];
  if (!row) return "#";
  return row[Math.floor(x)] ?? "#";
};

const isWall = (c: string) => c === "#" || c === "D";

/** Ruch z osobnym sprawdzeniem osi - dzieki temu slizga sie po scianie zamiast blokowac. */
export function moveWalk(map: WalkMap, state: WalkState, forward: number, turn: number, dt: number) {
  if (state.finished) return;

  state.angle += turn * TURN_SPEED * dt;

  const step = forward * MOVE_SPEED * dt;
  const nx = state.x + Math.cos(state.angle) * step;
  const ny = state.y + Math.sin(state.angle) * step;

  const padX = Math.sign(nx - state.x) * PADDING;
  const padY = Math.sign(ny - state.y) * PADDING;

  if (!isWall(cellAt(map, nx + padX, state.y))) state.x = nx;
  if (!isWall(cellAt(map, state.x, ny + padY))) state.y = ny;

  if (cellAt(map, state.x, state.y) === "E") state.finished = true;
}

interface Hit {
  distance: number;
  cell: string;
  side: 0 | 1;
}

function castRay(map: WalkMap, ox: number, oy: number, angle: number): Hit {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let mapX = Math.floor(ox);
  let mapY = Math.floor(oy);

  const deltaX = Math.abs(1 / (dx || 1e-9));
  const deltaY = Math.abs(1 / (dy || 1e-9));

  const stepX = dx < 0 ? -1 : 1;
  const stepY = dy < 0 ? -1 : 1;
  let sideX = dx < 0 ? (ox - mapX) * deltaX : (mapX + 1 - ox) * deltaX;
  let sideY = dy < 0 ? (oy - mapY) * deltaY : (mapY + 1 - oy) * deltaY;

  let side: 0 | 1 = 0;
  for (let guard = 0; guard < 64; guard++) {
    if (sideX < sideY) {
      sideX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      sideY += deltaY;
      mapY += stepY;
      side = 1;
    }
    const cell = map.rows[mapY]?.[mapX] ?? "#";
    if (isWall(cell)) {
      const distance = side === 0 ? sideX - deltaX : sideY - deltaY;
      return { distance: Math.max(0.05, distance), cell, side };
    }
  }
  return { distance: 64, cell: "#", side };
}

const WALL_COLORS: Record<string, [number, number, number]> = {
  "#": [148, 134, 108], // lamperia w kolorze musztardy
  D: [96, 64, 40], // drzwi
};

export function renderWalk(
  ctx: CanvasRenderingContext2D,
  map: WalkMap,
  state: WalkState,
  width: number,
  height: number,
) {
  // sufit i podloga
  ctx.fillStyle = "#2b2a26";
  ctx.fillRect(0, 0, width, height / 2);
  ctx.fillStyle = "#3a3832";
  ctx.fillRect(0, height / 2, width, height / 2);

  // kolumny po 2 px - mniej promieni, a roznicy nie widac
  const stripe = 2;
  for (let x = 0; x < width; x += stripe) {
    const cameraX = (2 * x) / width - 1;
    const angle = state.angle + Math.atan(cameraX * Math.tan(FOV / 2));
    const hit = castRay(map, state.x, state.y, angle);

    // korekta rybiego oka
    const corrected = hit.distance * Math.cos(angle - state.angle);
    const lineHeight = Math.min(height * 4, height / corrected);
    const top = (height - lineHeight) / 2;

    const base = WALL_COLORS[hit.cell] ?? WALL_COLORS["#"];
    // sciany boczne ciemniejsze - daje czytelna bryle bez tekstur
    const shade = (hit.side === 1 ? 0.72 : 1) * Math.max(0.25, 1 - corrected / 11);
    ctx.fillStyle = `rgb(${Math.round(base[0] * shade)},${Math.round(base[1] * shade)},${Math.round(
      base[2] * shade,
    )})`;
    ctx.fillRect(x, top, stripe, lineHeight);

    // pas lamperii - dolna polowa sciany ciemniejsza, jak w kazdym PRL-owskim korytarzu
    if (hit.cell === "#") {
      ctx.fillStyle = `rgba(60,70,60,${0.45 * shade})`;
      ctx.fillRect(x, top + lineHeight * 0.55, stripe, lineHeight * 0.45);
    }
  }
}

/** Jak daleko do wyjscia - do podpowiedzi na ekranie. */
export function distanceToExit(map: WalkMap, state: WalkState): number {
  for (let y = 0; y < map.rows.length; y++) {
    const x = map.rows[y].indexOf("E");
    if (x !== -1) return Math.hypot(x + 0.5 - state.x, y + 0.5 - state.y);
  }
  return 0;
}
