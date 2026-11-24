// Kalendarz cytatow z polskiej literatury - cache w przegladarce i zestaw
// zapasowy na wypadek, gdy AI nie odpowie albo zwroci niekompletny miesiac.
//
// Generowanie leci raz na miesiac, nie przy kazdym wejsciu: darmowy limit
// OpenRoutera to 50 zapytan na dobe, a kalendarz raz wygenerowany dla danego
// roku i miesiaca nie zmienia sie - nie ma po co pytac AI drugi raz.

export interface CalendarEntry {
  day: number;
  quote: string;
  author: string;
  work: string;
}

export interface FilledDay extends CalendarEntry {
  /** True, gdy AI nie pokryl tego dnia i wstawiono cytat z zestawu zapasowego. */
  isFallback: boolean;
}

const CACHE_PREFIX = "pmc-quote-calendar-";

interface CachedMonth {
  year: number;
  month: number;
  entries: CalendarEntry[];
  generatedAt: string;
}

const cacheKey = (year: number, month: number) => `${CACHE_PREFIX}${year}-${String(month).padStart(2, "0")}`;

export function getCachedMonth(year: number, month: number): CalendarEntry[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(year, month));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMonth;
    if (parsed.year !== year || parsed.month !== month || !Array.isArray(parsed.entries)) return null;
    return parsed.entries;
  } catch {
    // prywatne okno, zablokowane dane albo uszkodzony zapis - po prostu wygenerujemy od nowa
    return null;
  }
}

export function setCachedMonth(year: number, month: number, entries: CalendarEntry[]) {
  try {
    const payload: CachedMonth = { year, month, entries, generatedAt: new Date().toISOString() };
    localStorage.setItem(cacheKey(year, month), JSON.stringify(payload));
  } catch {
    // brak miejsca w pamieci nie jest powodem, zeby przerywac - kalendarz po
    // prostu wygeneruje sie ponownie przy nastepnych odwiedzinach
  }
}

/**
 * Usuwa zapis danego miesiaca, zeby nastepne wczytanie zapytalo AI od nowa.
 *
 * To NIE to samo co setCachedMonth(year, month, []) - pusta tablica jest
 * w JS prawdziwa (truthy), wiec loadMonth odczytalby ja jako "jest w cache"
 * i nigdy nie zapytalby AI ponownie. Trzeba faktycznie usunac klucz.
 */
export function clearCachedMonth(year: number, month: number) {
  try {
    localStorage.removeItem(cacheKey(year, month));
  } catch {
    // jw. - brak dostepu do pamieci nie jest tu problemem
  }
}

/**
 * Cytaty powszechnie znane i latwe do zweryfikowania - uzywane tylko tam,
 * gdzie AI nie pokryl dnia. Celowo krotka lista samych pewniakow zamiast proby
 * zapelnienia calego miesiaca na sztywno: kazdy wpis sprawdzony recznie co do
 * dokladnego brzmienia, a nie tylko "to chyba tak bylo".
 *
 * Jeden z poprzednich wariantow mial odwrocony sens cytatu z "Romantycznosci"
 * (orygina mowi, ze czucie i wiara widza WIECEJ niz szkielko i oko - sedno
 * calego wiersza) - stad ta uwaga, zeby nikt tu nie wkleil czegos z pamieci
 * bez sprawdzenia.
 */
export const FALLBACK_ENTRIES: Omit<CalendarEntry, "day">[] = [
  { quote: "Litwo! Ojczyzno moja! ty jesteś jak zdrowie.", author: "Adam Mickiewicz", work: "Pan Tadeusz" },
  {
    quote: "Czucie i wiara silniej mówi do mnie, niż mędrca szkiełko i oko.",
    author: "Adam Mickiewicz",
    work: "Romantyczność",
  },
  {
    quote: "Kto ty jesteś? Polak mały. Jaki znak twój? Orzeł biały.",
    author: "Władysław Bełza",
    work: "Katechizm polskiego dziecka",
  },
  { quote: "Nie rzucim ziemi, skąd nasz ród!", author: "Maria Konopnicka", work: "Rota" },
  {
    quote: "Szlachetne zdrowie, nikt się nie dowie, jako smakujesz, aż się zepsujesz.",
    author: "Jan Kochanowski",
    work: "Fraszki",
  },
  { quote: "Polska to jest wielka rzecz.", author: "Stefan Żeromski", work: "Przedwiośnie" },
];

function fallbackFor(day: number): FilledDay {
  const base = FALLBACK_ENTRIES[(day - 1) % FALLBACK_ENTRIES.length];
  return { day, ...base, isFallback: true };
}

export const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

/** Uzupelnia brakujace dni zestawem zapasowym, zeby kalendarz nie mial dziur. */
export function fillMonth(year: number, month: number, entries: CalendarEntry[]): FilledDay[] {
  const byDay = new Map(entries.map((e) => [e.day, e]));
  const total = daysInMonth(year, month);
  const result: FilledDay[] = [];
  for (let day = 1; day <= total; day++) {
    const found = byDay.get(day);
    result.push(found ? { ...found, isFallback: false } : fallbackFor(day));
  }
  return result;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class CalendarFetchError extends Error {}

/** Woła edge function bez streamingu - kalendarz to jedna odpowiedz JSON, nie tekst na biezaco. */
export async function fetchMonthFromAI(year: number, month: number, force = false): Promise<CalendarEntry[]> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-quote-calendar`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ year, month, force }),
  });

  if (!response.ok) {
    let message = `Funkcja zwróciła status ${response.status}.`;
    try {
      const data = await response.json();
      if (typeof data?.error === "string" && data.error) message = data.error;
    } catch {
      // odpowiedz nie byla JSON-em - zostaje komunikat ze statusem
    }
    throw new CalendarFetchError(message);
  }

  const data = await response.json();
  if (!Array.isArray(data?.entries)) {
    throw new CalendarFetchError("Funkcja nie zwróciła listy cytatów.");
  }
  return data.entries as CalendarEntry[];
}

/**
 * Pobiera miesiac z pamieci przegladarki, a jesli go tam nie ma - z AI
 * (i zapisuje na przyszlosc). Zwraca tez informacje, czy AI zawiodlo, zeby
 * strona mogla pokazac, ze dziala na samym zestawie zapasowym.
 *
 * force=true (przycisk "Losuj ponownie") pomija lokalny cache i prosi
 * edge function o wymuszona regeneracje - samo wyczyszczenie lokalnego
 * cache by nie wystarczylo, bo funkcja ma tez wspolny cache w bazie danych
 * i bez flagi "force" oddalaby z powrotem to samo, co juz tam lezy.
 */
export async function loadMonth(
  year: number,
  month: number,
  force = false,
): Promise<{ entries: CalendarEntry[]; fromCache: boolean; aiFailed: boolean }> {
  if (!force) {
    const cached = getCachedMonth(year, month);
    if (cached) return { entries: cached, fromCache: true, aiFailed: false };
  }

  try {
    const entries = await fetchMonthFromAI(year, month, force);
    setCachedMonth(year, month, entries);
    return { entries, fromCache: false, aiFailed: false };
  } catch {
    return { entries: [], fromCache: false, aiFailed: true };
  }
}
