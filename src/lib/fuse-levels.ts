// Plansze do gry "Lont".
//
// Mapa jest rysowana znakami, zeby dalo sie ja czytac i poprawiac goly okiem:
//   S - start plomienia
//   # - lont
//   B - ladunek do odpalenia (lezy na loncie)
//   . - pusto
//
// Sasiadujace w pionie lub poziomie pola z lontem sa polaczone. Plomien idzie
// po polaczeniach, a przebyty odcinek sie wypala i nie da sie nim przejsc
// drugi raz - za to skrzyzowanie mozna przeciac dwa razy, raz w kazdej osi,
// bo wypala sie odcinek, a nie pole.

export interface FuseLevel {
  name: string;
  /** Sekundy na ukonczenie planszy. */
  time: number;
  /** Pol na sekunde - tempo plomienia. */
  speed: number;
  map: string[];
}

export const FUSE_LEVELS: FuseLevel[] = [
  {
    name: "Rozgrzewka",
    time: 30,
    speed: 3.2,
    map: [
      ".........",
      ".S###B#..",
      "......#..",
      "......#..",
      "......B..",
    ],
  },
  {
    name: "Rozwidlenie",
    time: 35,
    speed: 3.4,
    map: [
      ".........",
      ".B#####B.",
      ".#.....#.",
      ".#.....#.",
      ".S#####..",
    ],
  },
  {
    name: "Pętla",
    time: 40,
    speed: 3.6,
    map: [
      ".#####...",
      ".#...#...",
      ".B...B...",
      ".#...#...",
      ".S####...",
    ],
  },
  {
    name: "Grzebień",
    time: 45,
    speed: 3.8,
    map: [
      "..#.#.#..",
      "..#.#.#..",
      ".S#B#B#..",
      "..#...#..",
      "..B###B..",
    ],
  },
  {
    name: "Skrzyżowanie",
    time: 50,
    speed: 4,
    map: [
      "..#####..",
      "..#...#..",
      ".##+#+##.",
      ".B.#.#.B.",
      ".###+###.",
      "...#.#...",
      "...S.B...",
    ],
  },
  {
    name: "Plątanina",
    time: 60,
    speed: 4.2,
    map: [
      ".#####B#.",
      ".#...#.#.",
      ".B#+#+#B.",
      "...#.#...",
      ".###+###.",
      ".#.....#.",
      ".S##B###.",
    ],
  },
];

export type CellKind = "empty" | "fuse" | "bomb" | "start";

export interface ParsedLevel {
  width: number;
  height: number;
  /** [y][x] */
  cells: CellKind[][];
  start: { x: number; y: number };
  bombs: { x: number; y: number }[];
}

/** "+" to zwykly lont - znak istnieje tylko po to, zeby skrzyzowania bylo widac w mapie. */
function kindOf(ch: string): CellKind {
  if (ch === "S") return "start";
  if (ch === "B") return "bomb";
  if (ch === "#" || ch === "+") return "fuse";
  return "empty";
}

export function parseLevel(level: FuseLevel): ParsedLevel {
  const height = level.map.length;
  const width = Math.max(...level.map.map((row) => row.length));
  const cells: CellKind[][] = [];
  let start: { x: number; y: number } | null = null;
  const bombs: { x: number; y: number }[] = [];

  for (let y = 0; y < height; y++) {
    const row: CellKind[] = [];
    for (let x = 0; x < width; x++) {
      const kind = kindOf(level.map[y][x] ?? ".");
      row.push(kind);
      if (kind === "start") start = { x, y };
      if (kind === "bomb") bombs.push({ x, y });
    }
    cells.push(row);
  }

  if (!start) throw new Error(`Plansza "${level.name}" nie ma pola startowego`);
  return { width, height, cells, start, bombs };
}

export const isFuse = (parsed: ParsedLevel, x: number, y: number): boolean =>
  x >= 0 &&
  y >= 0 &&
  x < parsed.width &&
  y < parsed.height &&
  parsed.cells[y][x] !== "empty";

/** Klucz odcinka miedzy dwoma polami - niezalezny od kierunku przejscia. */
export function edgeKey(ax: number, ay: number, bx: number, by: number): string {
  return ax < bx || (ax === bx && ay < by) ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
}

export const DIRECTIONS = [
  { dx: 0, dy: -1, name: "up" },
  { dx: 0, dy: 1, name: "down" },
  { dx: -1, dy: 0, name: "left" },
  { dx: 1, dy: 0, name: "right" },
] as const;

export type DirectionName = (typeof DIRECTIONS)[number]["name"];
