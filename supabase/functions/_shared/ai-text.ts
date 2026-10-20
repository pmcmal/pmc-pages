// Wspolny parser odpowiedzi modeli.
//
// Generatory prosily wczesniej model o JSON (np. {"script": "..."} albo
// {"exampleCode": "..."}). Przy kodzie i dluzszych tekstach to sie sypalo:
// cudzyslowy, backslashe i znaki nowej linii trzeba w stringu JSON escapowac,
// a slabsze darmowe modele robia to niekonsekwentnie. JSON.parse sie wywracal,
// jsonrepair czesto tez nie dawal rady i uzytkownik dostawal komunikat
// "Nie udalo sie przetworzyc odpowiedzi AI" razem z surowa odpowiedzia.
//
// Teraz modele odpowiadaja zwyklym tekstem z naglowkami sekcji i blokami kodu.
// Tam nie ma czego escapowac, wiec cala ta klasa bledow znika, a najgorszy
// mozliwy przypadek to pokazanie calego tekstu - czyli i tak tego, co
// uzytkownik chcial zobaczyc.

/** Dzieli tekst na sekcje po naglowkach typu `### OPIS` albo `**KOMPONENTY**`. */
export function splitSections(text: string): Record<string, string> {
  const headingRe =
    /^[ \t]{0,3}(?:#{1,6}[ \t]*)?\*{0,2}([A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ0-9 _/-]{1,40}?)\*{0,2}[ \t]*:?[ \t]*$/gm;

  const marks: { name: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(text)) !== null) {
    marks.push({ name: m[1].trim().toUpperCase(), start: m.index, end: headingRe.lastIndex });
  }

  const sections: Record<string, string> = {};
  for (let i = 0; i < marks.length; i++) {
    const to = i + 1 < marks.length ? marks[i + 1].start : text.length;
    const body = text.slice(marks[i].end, to).trim();
    // pierwsza sekcja o danej nazwie wygrywa - model potrafi sie powtorzyc
    if (body && !(marks[i].name in sections)) sections[marks[i].name] = body;
  }
  return sections;
}

/** Wyciaga pierwszy blok ``` ``` i zwraca go razem z tekstem bez tego bloku. */
export function extractCodeFence(text: string): { code: string; rest: string } {
  const m = text.match(/```[a-zA-Z0-9+#_-]*[ \t]*\r?\n?([\s\S]*?)```/);
  if (!m || m.index === undefined) return { code: "", rest: text.trim() };
  const rest = text.slice(0, m.index) + text.slice(m.index + m[0].length);
  return { code: m[1].trim(), rest: rest.trim() };
}

/** Zamienia liste (myslniki, gwiazdki, numeracja) na tablice pozycji. */
export function toList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[ \t]*(?:[-*•+]|\d+[.)])[ \t]*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Ostatnia deska ratunku dla starego kontraktu: jesli model mimo wszystko oddal
 * JSON, sprobuj go odczytac. Zwraca null, gdy to nie jest uzyteczny JSON.
 */
export function tryJson(
  text: string,
  repair: (input: string) => string,
  requiredField: string,
): Record<string, unknown> | null {
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/);
  const candidate = (fence ? fence[1] : text).trim();
  if (!candidate.startsWith("{")) return null;

  const attempts = [candidate];
  try {
    attempts.push(repair(candidate));
  } catch {
    // nie da sie naprawic - zostaje wariant oryginalny
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      const value = parsed?.[requiredField];
      if (typeof value === "string" ? value.trim() : Array.isArray(value)) return parsed;
    } catch {
      // probujemy kolejnego wariantu
    }
  }
  return null;
}
