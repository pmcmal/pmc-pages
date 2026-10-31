// Logika drobnych narzedzi. Czysty modul bez Reacta i DOM, zeby przeliczniki
// i statystyki dalo sie sprawdzic testem - to akurat rzeczy, ktore psuja sie
// po cichu i nikt tego nie zauwaza.

// ---------------------------------------------------------------- hasla

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  /** Pomija znaki mylace sie na wydruku: O/0, l/1/I. */
  avoidAmbiguous: boolean;
}

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};
const AMBIGUOUS = "O0oIl1|`'\"{}[]";

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
};

export function passwordAlphabet(options: PasswordOptions): string {
  let alphabet = "";
  if (options.lower) alphabet += SETS.lower;
  if (options.upper) alphabet += SETS.upper;
  if (options.digits) alphabet += SETS.digits;
  if (options.symbols) alphabet += SETS.symbols;
  if (options.avoidAmbiguous) {
    alphabet = [...alphabet].filter((c) => !AMBIGUOUS.includes(c)).join("");
  }
  return alphabet;
}

/** Losowanie bez modulo-bias: odrzucamy wartosci z niepelnego ostatniego zakresu. */
function randomIndex(limit: number, randomBytes: (n: number) => Uint8Array): number {
  const max = Math.floor(256 / limit) * limit;
  for (let guard = 0; guard < 64; guard++) {
    const byte = randomBytes(1)[0];
    if (byte < max) return byte % limit;
  }
  return randomBytes(1)[0] % limit;
}

const browserBytes = (n: number) => {
  const buffer = new Uint8Array(n);
  crypto.getRandomValues(buffer);
  return buffer;
};

export function generatePassword(
  options: PasswordOptions,
  randomBytes: (n: number) => Uint8Array = browserBytes,
): string {
  const alphabet = passwordAlphabet(options);
  if (!alphabet) return "";
  const length = Math.max(4, Math.min(128, Math.round(options.length)));
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomIndex(alphabet.length, randomBytes)];
  return out;
}

/** Entropia w bitach - uczciwsza miara niz "slabe/mocne" na oko. */
export function passwordEntropy(options: PasswordOptions): number {
  const size = passwordAlphabet(options).length;
  if (size < 2) return 0;
  return Math.round(options.length * Math.log2(size));
}

export function entropyLabel(bits: number): { text: string; tone: "weak" | "ok" | "good" | "strong" } {
  if (bits < 50) return { text: "słabe", tone: "weak" };
  if (bits < 70) return { text: "przyzwoite", tone: "ok" };
  if (bits < 100) return { text: "mocne", tone: "good" };
  return { text: "bardzo mocne", tone: "strong" };
}

// ---------------------------------------------------------------- konwerter

export interface UnitCategory {
  id: string;
  label: string;
  units: { id: string; label: string; /** ile jednostek bazowych */ factor: number }[];
}

/** Temperatura nie jest zwyklym mnozeniem, wiec stoi osobno. */
export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length",
    label: "Długość",
    units: [
      { id: "mm", label: "milimetr", factor: 0.001 },
      { id: "cm", label: "centymetr", factor: 0.01 },
      { id: "m", label: "metr", factor: 1 },
      { id: "km", label: "kilometr", factor: 1000 },
      { id: "in", label: "cal", factor: 0.0254 },
      { id: "ft", label: "stopa", factor: 0.3048 },
      { id: "mi", label: "mila", factor: 1609.344 },
    ],
  },
  {
    id: "mass",
    label: "Masa",
    units: [
      { id: "g", label: "gram", factor: 0.001 },
      { id: "dag", label: "dekagram", factor: 0.01 },
      { id: "kg", label: "kilogram", factor: 1 },
      { id: "t", label: "tona", factor: 1000 },
      { id: "lb", label: "funt", factor: 0.45359237 },
      { id: "oz", label: "uncja", factor: 0.028349523125 },
    ],
  },
  {
    id: "data",
    label: "Dane",
    units: [
      { id: "B", label: "bajt", factor: 1 },
      { id: "KB", label: "kilobajt", factor: 1024 },
      { id: "MB", label: "megabajt", factor: 1024 ** 2 },
      { id: "GB", label: "gigabajt", factor: 1024 ** 3 },
      { id: "TB", label: "terabajt", factor: 1024 ** 4 },
    ],
  },
  {
    id: "speed",
    label: "Prędkość",
    units: [
      { id: "mps", label: "metr na sekundę", factor: 1 },
      { id: "kmh", label: "kilometr na godzinę", factor: 1 / 3.6 },
      { id: "mph", label: "mila na godzinę", factor: 0.44704 },
      { id: "kn", label: "węzeł", factor: 0.514444 },
    ],
  },
];

export const TEMPERATURE_UNITS = [
  { id: "C", label: "Celsjusz" },
  { id: "F", label: "Fahrenheit" },
  { id: "K", label: "Kelwin" },
];

export function convertUnit(categoryId: string, from: string, to: string, value: number): number | null {
  if (!Number.isFinite(value)) return null;

  if (categoryId === "temperature") {
    const celsius = from === "C" ? value : from === "F" ? ((value - 32) * 5) / 9 : value - 273.15;
    if (to === "C") return celsius;
    if (to === "F") return (celsius * 9) / 5 + 32;
    return celsius + 273.15;
  }

  const category = UNIT_CATEGORIES.find((c) => c.id === categoryId);
  const fromUnit = category?.units.find((u) => u.id === from);
  const toUnit = category?.units.find((u) => u.id === to);
  if (!fromUnit || !toUnit) return null;
  return (value * fromUnit.factor) / toUnit.factor;
}

/** Liczba do pokazania: bez wykladnika tam, gdzie nie trzeba, i bez ogona zer. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return value.toExponential(4);
  const rounded = Number(value.toFixed(6));
  return String(rounded);
}

// ---------------------------------------------------------------- tekst

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  /** Minuty, przy 200 slowach na minute. */
  readingMinutes: number;
  longestWord: string;
}

export function textStats(text: string): TextStats {
  const characters = [...text].length;
  const charactersNoSpaces = [...text.replace(/\s/g, "")].length;

  const wordList = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?…]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;

  const longestWord = wordList.reduce((longest, word) => {
    const clean = word.replace(/[^\p{L}\p{N}-]/gu, "");
    return clean.length > longest.length ? clean : longest;
  }, "");

  return {
    characters,
    charactersNoSpaces,
    words: wordList.length,
    sentences: wordList.length === 0 ? 0 : sentences,
    paragraphs,
    readingMinutes: wordList.length === 0 ? 0 : Math.max(1, Math.round(wordList.length / 200)),
    longestWord,
  };
}
