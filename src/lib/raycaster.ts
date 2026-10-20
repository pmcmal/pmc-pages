// Lekki raycaster do krotkich przejsc miedzy scenami.
//
// Ta sama technika, co w starych grach DOS-owych: dla kazdej kolumny ekranu
// puszczamy promien i rysujemy jeden pionowy pasek sciany. Zero bibliotek,
// zero WebGL.
//
// Pierwsza wersja rysowala plaskie kolory i przez to korytarz byl pusty: ani
// tekstur, ani drzwi, ani zadnych przedmiotow. Teraz sciany maja fakture
// (lamperia, fugi), drzwi wygladaja jak drzwi i maja tabliczke z numerem,
// a w korytarzu stoja sprity: kaloryfer, tablica ogloszen, kosz i lampa.

export type SpriteKind = "kaloryfer" | "tablica" | "kosz" | "lampa" | "trzepak" | "skrzynka";

export interface Sprite {
  x: number;
  y: number;
  kind: SpriteKind;
}

export interface WalkMap {
  /** Znaki: # sciana, D drzwi, . podloga, S start, E wyjscie (drzwi docelowe). */
  rows: string[];
  facing: number;
  caption: string;
  /** Napis na tabliczce przy drzwiach docelowych. */
  exitSign: string;
  sprites: Sprite[];
  /** Paleta scian - rozna dla klatki, podworka i zakladu. */
  wallColor: [number, number, number];
  wainscotColor: [number, number, number];
  ceilingColor: string;
  floorColor: string;
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
const PADDING = 0.22;

export const WALK_MAPS: Record<string, WalkMap> = {
  klatka: {
    caption: "Klatka schodowa. Winda nieczynna od marca.",
    facing: 0,
    exitSign: "12",
    wallColor: [150, 138, 112],
    wainscotColor: [74, 88, 74],
    ceilingColor: "#241f18",
    floorColor: "#4a4036",
    rows: [
      "###########",
      "#S........#",
      "#.#D###D#.#",
      "#.#.....#.#",
      "#.#.###.#.#",
      "#...DE..#.#",
      "###########",
    ],
    sprites: [
      { x: 4.5, y: 1.5, kind: "kaloryfer" },
      { x: 8.5, y: 1.5, kind: "tablica" },
      { x: 1.5, y: 4.5, kind: "lampa" },
      { x: 9.5, y: 3.5, kind: "kosz" },
      { x: 6.5, y: 3.5, kind: "skrzynka" },
    ],
  },
  podworko: {
    caption: "Podwórko-studnia. Trzepak, śmietnik, brama na ulicę.",
    facing: 0,
    exitSign: "WY",
    wallColor: [122, 104, 92],
    wainscotColor: [92, 78, 68],
    ceilingColor: "#1b2330",
    floorColor: "#3b3630",
    rows: [
      "#############",
      "#S..........#",
      "#.#D##.##D#.#",
      "#.#......#..#",
      "#.#.####.#.##",
      "#...#..#...ED",
      "#############",
    ],
    sprites: [
      { x: 6.5, y: 1.5, kind: "trzepak" },
      { x: 3.5, y: 3.5, kind: "kosz" },
      { x: 11.5, y: 3.5, kind: "lampa" },
      { x: 2.5, y: 5.5, kind: "skrzynka" },
    ],
  },
  zaklad: {
    caption: "Korytarz zakładu. Lastryko, lamperia do połowy ściany.",
    facing: 0,
    exitSign: "3",
    wallColor: [158, 150, 126],
    wainscotColor: [64, 92, 86],
    ceilingColor: "#20231f",
    floorColor: "#55504a",
    rows: [
      "#############",
      "#S.........D#",
      "#.#########.#",
      "#.........#.#",
      "#########.#.#",
      "DE........#.#",
      "#############",
    ],
    sprites: [
      { x: 5.5, y: 1.5, kind: "tablica" },
      { x: 9.5, y: 1.5, kind: "kaloryfer" },
      { x: 3.5, y: 3.5, kind: "lampa" },
      { x: 7.5, y: 3.5, kind: "kosz" },
      { x: 4.5, y: 5.5, kind: "skrzynka" },
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
  /** Gdzie w obrebie kafla trafil promien (0..1) - potrzebne do faktury. */
  wallX: number;
  mapX: number;
  mapY: number;
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
      const distance = Math.max(0.05, side === 0 ? sideX - deltaX : sideY - deltaY);
      const wallX = side === 0 ? oy + distance * dy : ox + distance * dx;
      return { distance, cell, side, wallX: wallX - Math.floor(wallX), mapX, mapY };
    }
  }
  return { distance: 64, cell: "#", side, wallX: 0, mapX, mapY };
}

/** Czy ten kafel scienny sasiaduje z polem wyjscia. */
function touchesExit(map: WalkMap, mx: number, my: number): boolean {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    if (map.rows[my + dy]?.[mx + dx] === "E") return true;
  }
  return false;
}

const shadeOf = (base: [number, number, number], k: number) =>
  `rgb(${Math.round(base[0] * k)},${Math.round(base[1] * k)},${Math.round(base[2] * k)})`;

const DOOR_BASE: [number, number, number] = [112, 72, 44];
const DOOR_FRAME: [number, number, number] = [70, 44, 28];
const PLATE: [number, number, number] = [196, 190, 170];

/** Rysuje jedna kolumne sciany razem z faktura. */
function drawWallColumn(
  ctx: CanvasRenderingContext2D,
  map: WalkMap,
  hit: Hit,
  x: number,
  stripe: number,
  top: number,
  lineHeight: number,
  isExit: boolean,
) {
  const fog = Math.max(0.22, 1 - hit.distance / 12);
  const shade = (hit.side === 1 ? 0.7 : 1) * fog;

  if (hit.cell === "D") {
    // drzwi: osciieznica po bokach, plycina w srodku, klamka i tabliczka
    const edge = hit.wallX < 0.12 || hit.wallX > 0.88;
    ctx.fillStyle = shadeOf(edge ? DOOR_FRAME : DOOR_BASE, shade);
    ctx.fillRect(x, top, stripe, lineHeight);

    // poziome przetloczenia plyciny
    if (!edge) {
      ctx.fillStyle = shadeOf(DOOR_FRAME, shade * 0.85);
      ctx.fillRect(x, top + lineHeight * 0.2, stripe, Math.max(1, lineHeight * 0.015));
      ctx.fillRect(x, top + lineHeight * 0.62, stripe, Math.max(1, lineHeight * 0.015));
    }
    // klamka
    if (hit.wallX > 0.74 && hit.wallX < 0.82) {
      ctx.fillStyle = shadeOf([210, 190, 120], shade);
      ctx.fillRect(x, top + lineHeight * 0.5, stripe, Math.max(2, lineHeight * 0.035));
    }
    // tabliczka z numerem
    if (isExit && hit.wallX > 0.32 && hit.wallX < 0.68) {
      ctx.fillStyle = shadeOf(PLATE, shade);
      ctx.fillRect(x, top + lineHeight * 0.26, stripe, Math.max(2, lineHeight * 0.1));
    }
    return;
  }

  // sciana: gora tynk, dol lamperia, miedzy nimi ciemny pasek
  const wainscotTop = top + lineHeight * 0.55;
  ctx.fillStyle = shadeOf(map.wallColor, shade);
  ctx.fillRect(x, top, stripe, lineHeight);
  ctx.fillStyle = shadeOf(map.wainscotColor, shade);
  ctx.fillRect(x, wainscotTop, stripe, top + lineHeight - wainscotTop);
  ctx.fillStyle = shadeOf([30, 30, 26], shade);
  ctx.fillRect(x, wainscotTop, stripe, Math.max(1, lineHeight * 0.02));

  // pionowe fugi co cwierc kafla - dzieki nim widac, ze sciana ma fakture
  const quarter = hit.wallX % 0.25;
  if (quarter < 0.02) {
    ctx.fillStyle = `rgba(0,0,0,${0.3 * fog})`;
    ctx.fillRect(x, top, stripe, lineHeight);
  }
}

export function renderWalk(
  ctx: CanvasRenderingContext2D,
  map: WalkMap,
  state: WalkState,
  width: number,
  height: number,
) {
  // sufit i podloga z lagodnym przejsciem zamiast dwoch plaskich prostokatow
  const ceiling = ctx.createLinearGradient(0, 0, 0, height / 2);
  ceiling.addColorStop(0, "#0d0c09");
  ceiling.addColorStop(1, map.ceilingColor);
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, width, height / 2);

  const floor = ctx.createLinearGradient(0, height / 2, 0, height);
  floor.addColorStop(0, map.floorColor);
  floor.addColorStop(1, "#15120e");
  ctx.fillStyle = floor;
  ctx.fillRect(0, height / 2, width, height / 2);

  const stripe = 2;
  const zBuffer: number[] = [];

  for (let x = 0; x < width; x += stripe) {
    const cameraX = (2 * x) / width - 1;
    const angle = state.angle + Math.atan(cameraX * Math.tan(FOV / 2));
    const hit = castRay(map, state.x, state.y, angle);

    const corrected = hit.distance * Math.cos(angle - state.angle);
    const lineHeight = Math.min(height * 4, height / corrected);
    const top = (height - lineHeight) / 2;

    // Tabliczka tylko na drzwiach docelowych - zwykle drzwi w korytarzu maja
    // byc tlem, a nie konkurowac z celem.
    const isExit = hit.cell === "D" && touchesExit(map, hit.mapX, hit.mapY);
    drawWallColumn(ctx, map, hit, x, stripe, top, lineHeight, isExit);

    for (let i = 0; i < stripe; i++) zBuffer[x + i] = corrected;
  }

  drawSprites(ctx, map, state, width, height, zBuffer);
}

// ---------------------------------------------------------------- sprity

const SPRITE_STYLE: Record<SpriteKind, { color: string; accent: string; w: number; h: number; base: number }> = {
  kaloryfer: { color: "#b9b2a0", accent: "#8d8777", w: 0.55, h: 0.42, base: 0.78 },
  tablica: { color: "#6b5536", accent: "#d8cfa8", w: 0.7, h: 0.5, base: 0.46 },
  kosz: { color: "#4c5a4a", accent: "#2f3a2e", w: 0.3, h: 0.36, base: 0.86 },
  lampa: { color: "#f0e4a8", accent: "#5a5342", w: 0.26, h: 0.18, base: 0.12 },
  trzepak: { color: "#7d8288", accent: "#575c61", w: 0.9, h: 0.6, base: 0.72 },
  skrzynka: { color: "#8a6a3a", accent: "#5e4726", w: 0.42, h: 0.3, base: 0.86 },
};

function drawSprites(
  ctx: CanvasRenderingContext2D,
  map: WalkMap,
  state: WalkState,
  width: number,
  height: number,
  zBuffer: number[],
) {
  const dirX = Math.cos(state.angle);
  const dirY = Math.sin(state.angle);
  // plaszczyzna kamery prostopadla do kierunku patrzenia
  const planeScale = Math.tan(FOV / 2);
  const planeX = -dirY * planeScale;
  const planeY = dirX * planeScale;

  const ordered = map.sprites
    .map((s) => ({ s, d: (s.x - state.x) ** 2 + (s.y - state.y) ** 2 }))
    .sort((a, b) => b.d - a.d);

  for (const { s } of ordered) {
    const relX = s.x - state.x;
    const relY = s.y - state.y;

    const inverse = 1 / (planeX * dirY - dirX * planeY);
    const transformX = inverse * (dirY * relX - dirX * relY);
    const transformY = inverse * (-planeY * relX + planeX * relY);
    if (transformY <= 0.1) continue; // za plecami

    const screenX = Math.round((width / 2) * (1 + transformX / transformY));
    const style = SPRITE_STYLE[s.kind];
    const unit = height / transformY;
    const w = Math.abs(unit * style.w);
    const h = Math.abs(unit * style.h);
    // base: 0 = pod sufitem, 1 = na podlodze
    const bottom = height / 2 + (unit / 2) * (2 * style.base - 1);
    const top = bottom - h;
    const left = screenX - w / 2;

    const fog = Math.max(0.25, 1 - transformY / 12);
    ctx.globalAlpha = 1;

    for (let col = Math.max(0, Math.floor(left)); col < Math.min(width, left + w); col++) {
      if (zBuffer[col] !== undefined && zBuffer[col] < transformY) continue;
      const local = (col - left) / w;
      // prosty ksztalt: obwodka ciemniejsza, srodek jasniejszy
      const edge = local < 0.12 || local > 0.88;
      ctx.fillStyle = shadeOf(hexToRgb(edge ? style.accent : style.color), fog);
      ctx.fillRect(col, top, 1, h);

      // detale zalezne od rodzaju
      if (s.kind === "kaloryfer" && Math.floor(local * 9) % 2 === 0) {
        ctx.fillStyle = shadeOf(hexToRgb(style.accent), fog);
        ctx.fillRect(col, top, 1, h);
      }
      if (s.kind === "tablica" && local > 0.12 && local < 0.88) {
        ctx.fillStyle = shadeOf(hexToRgb(style.accent), fog);
        ctx.fillRect(col, top + h * 0.12, 1, h * 0.76);
      }
      if (s.kind === "trzepak" && local > 0.08 && local < 0.92) {
        ctx.fillStyle = shadeOf(hexToRgb(style.accent), fog);
        ctx.fillRect(col, top + h * 0.3, 1, Math.max(1, h * 0.06));
        ctx.fillRect(col, top + h * 0.62, 1, Math.max(1, h * 0.06));
      }
    }
  }
  ctx.globalAlpha = 1;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function distanceToExit(map: WalkMap, state: WalkState): number {
  for (let y = 0; y < map.rows.length; y++) {
    const x = map.rows[y].indexOf("E");
    if (x !== -1) return Math.hypot(x + 0.5 - state.x, y + 0.5 - state.y);
  }
  return 0;
}
