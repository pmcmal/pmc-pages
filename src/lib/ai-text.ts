// Rozbijanie tekstowej odpowiedzi modelu na pola.
//
// Przy strumieniowaniu funkcja oddaje czysty tekst w locie, wiec podzial na
// sekcje robi sie tutaj, po zamknieciu strumienia. Odpowiednik dla Deno lezy w
// supabase/functions/_shared/ai-text.ts i obsluguje ten sam format - zmieniajac
// kontrakt w promptach trzeba ruszyc oba pliki.

// Przy strumieniowaniu funkcja oddaje sam tekst modelu, wiec staly dopisek
// dokleja juz strona. Te same tresci siedza w funkcjach dla trybu bez strumienia.
export const DISCLAIMERS = {
  story: "To opowiadanie wygenerowała AI, a jego długość ogranicza pojedyncza odpowiedź modelu.",
  coach: "To porada wygenerowana przez AI i nie zastępuje profesjonalnej pomocy.",
  electronics:
    "To pomysł wygenerowany przez AI — przed budową zweryfikuj komponenty, połączenia i bezpieczeństwo.",
} as const;

/** Dzieli tekst na sekcje po naglowkach typu `### OPIS` albo `**KOMPONENTY**`. */
export function splitSections(text: string): Record<string, string> {
  const headingRe =
    /^[ \t]{0,3}(?:#{1,6}[ \t]*)?\*{0,2}([A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ0-9 _/-]{1,40}?)\*{0,2}[ \t]*:?[ \t]*$/gm;

  const marks: { name: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(text)) !== null) {
    marks.push({ name: match[1].trim().toUpperCase(), start: match.index, end: headingRe.lastIndex });
  }

  const sections: Record<string, string> = {};
  for (let i = 0; i < marks.length; i++) {
    const to = i + 1 < marks.length ? marks[i + 1].start : text.length;
    const body = text.slice(marks[i].end, to).trim();
    if (body && !(marks[i].name in sections)) sections[marks[i].name] = body;
  }
  return sections;
}

/** Wyciaga pierwszy blok ``` ``` i zwraca go razem z tekstem bez tego bloku. */
export function extractCodeFence(text: string): { code: string; rest: string } {
  const match = text.match(/```[a-zA-Z0-9+#_-]*[ \t]*\r?\n?([\s\S]*?)```/);
  if (!match || match.index === undefined) return { code: "", rest: text.trim() };
  const rest = text.slice(0, match.index) + text.slice(match.index + match[0].length);
  return { code: match[1].trim(), rest: rest.trim() };
}

/** Zamienia liste (myslniki, gwiazdki, numeracja) na tablice pozycji. */
export function toList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[ \t]*(?:[-*•+]|\d+[.)])[ \t]*/, "").trim())
    .filter((line) => line.length > 0);
}

export function cleanNotes(text: string): string {
  return text.replace(/^---UWAGI---$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Podglad skryptu w trakcie strumieniowania: blok kodu bywa jeszcze niedomkniety,
 * wiec obcinamy same znaczniki i pokazujemy to, co juz przyszlo.
 */
export function previewScript(text: string): string {
  const closed = extractCodeFence(text);
  if (closed.code) return closed.code;

  const opening = text.match(/```[a-zA-Z0-9+#_-]*[ \t]*\r?\n?/);
  if (opening?.index !== undefined) {
    return text.slice(opening.index + opening[0].length).split("---UWAGI---")[0].trim();
  }
  return text.split("---UWAGI---")[0].trim();
}

/** Koncowy podzial odpowiedzi generatora PowerShell na skrypt i uwagi. */
export function parseScriptResponse(text: string): { script: string; explanation: string } {
  const fence = extractCodeFence(text);
  if (fence.code) return { script: fence.code, explanation: cleanNotes(fence.rest) };

  const [code, ...notes] = text.split(/^---UWAGI---$/m);
  return { script: code.trim(), explanation: cleanNotes(notes.join("\n")) };
}
