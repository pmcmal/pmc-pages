// Zywe kafelki na stronie glownej.
//
// Zasada: kafelek NIGDY nie wola AI. Darmowy limit OpenRoutera to 50 zapytan
// na dobe - gdyby kazde wejscie na strone generowalo przyklady, limit padlby
// po kilku odwiedzinach i zepsulby dzialajace generatory.
//
// Zrodla sa wiec tylko trzy: dane lokalne z bundla (blog), pamiec przegladarki
// (rekordy, zapisane CV) i jedno tanie zapytanie o pogode.

const CV_KEY = "pmc-cv-generator-data";
const TUNNEL_BEST_KEY = "pmc-tunnel-best";

/** Przyklady krecace sie w kafelkach - zmieniaja sie co wejscie, bez API. */
const SAMPLES: Record<string, string[]> = {
  powershell: [
    "znajdź pliki większe niż 1 GB",
    "wypisz procesy zżerające CPU",
    "zrób kopię folderu z datą",
    "sprawdź, kto jest zalogowany",
  ],
  recipe: [
    "jajka, ser, szczypiorek",
    "kurczak i ryż",
    "to, co zostało w lodówce",
    "makaron w 15 minut",
  ],
  story: [
    "kryminał, detektyw, zaginiony list",
    "sci-fi, astronautka, awaria",
    "baśń, lis, zamarznięte jezioro",
  ],
  electronics: [
    "czujnik wilgotności gleby",
    "termometr na ESP32",
    "dzwonek do drzwi na Arduino",
  ],
  philosopher: [
    "boję się zmiany pracy",
    "jak odróżnić pasję od przyzwyczajenia",
    "czy warto zaczynać od zera",
  ],
  lyricsFinder: ["Kult — Arahja", "Dawid Podsiadło — Trójkąty i kwadraty", "Queen — Bohemian Rhapsody"],
};

const pickSample = (key: string): string | null => {
  const list = SAMPLES[key];
  if (!list?.length) return null;
  return list[Math.floor(Math.random() * list.length)];
};

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    // prywatne okno albo zablokowane dane - kafelek po prostu nie pokaze liczby
    return null;
  }
};

export interface LiveInfo {
  /** Krotki tekst na kafelku. */
  text: string;
  /** Czy to dane uzytkownika (rekord, zapis), czy przyklad. */
  kind: "data" | "sample";
}

/** Co pokazac bez zadnego zapytania sieciowego. */
export function instantInfo(key: string, latestPostTitle?: string): LiveInfo | null {
  if (key === "tunel") {
    const best = Number(readStorage(TUNNEL_BEST_KEY) || 0);
    return best > 0
      ? { text: `Twój rekord: ${best} pkt`, kind: "data" }
      : { text: "Jeszcze nie grałeś", kind: "sample" };
  }

  if (key === "cvGenerator") {
    const saved = readStorage(CV_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const name = String(data?.fullName ?? "").trim();
        if (name) return { text: `Zapisane CV: ${name}`, kind: "data" };
      } catch {
        // uszkodzony zapis - traktujemy jak brak
      }
    }
    return { text: "5 szablonów, eksport do PDF", kind: "sample" };
  }

  if (key === "blog" && latestPostTitle) {
    return { text: latestPostTitle, kind: "data" };
  }

  const sample = pickSample(key);
  return sample ? { text: `np. „${sample}"`, kind: "sample" } : null;
}

/**
 * Pogoda to jedyny kafelek, ktory siega do sieci. Jedno tanie zapytanie do
 * OpenWeatherMap, wynik trzymany przez pol godziny, zeby odswiezanie strony
 * nie mielilo limitu.
 */
const WEATHER_CACHE_KEY = "pmc-tile-weather";
const WEATHER_TTL_MS = 30 * 60 * 1000;

export async function fetchWeatherTile(city = "Warszawa"): Promise<LiveInfo | null> {
  const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
  if (!apiKey) return null;

  const cached = readStorage(WEATHER_CACHE_KEY);
  if (cached) {
    try {
      const { at, text } = JSON.parse(cached);
      if (Date.now() - at < WEATHER_TTL_MS && text) return { text, kind: "data" };
    } catch {
      // uszkodzony cache - pobierzemy na nowo
    }
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&appid=${apiKey}&units=metric&lang=pl`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const temp = Math.round(Number(data?.main?.temp));
    const description = String(data?.weather?.[0]?.description ?? "").trim();
    if (!Number.isFinite(temp)) return null;

    const text = description ? `${city}: ${temp}°C, ${description}` : `${city}: ${temp}°C`;
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ at: Date.now(), text }));
    } catch {
      // brak pamieci to nie powod, zeby nie pokazac wyniku
    }
    return { text, kind: "data" };
  } catch {
    return null;
  }
}
