// Strumieniowanie odpowiedzi OpenRoutera do przegladarki.
//
// Darmowe endpointy OpenRoutera sa obslugiwane z nizszym priorytetem, wiec przy
// obciazeniu wpadaja w kolejke - ta sama funkcja potrafi odpowiedziec w 6 s albo
// w 33 s. Czekanie na komplet odpowiedzi oznaczalo, ze uzytkownik przez caly ten
// czas patrzyl w spinner. Streaming tego nie przyspiesza, ale pierwsze slowa
// pojawiaja sie po sekundzie i tekst dopisuje sie na biezaco.
//
// Do przegladarki lecial zwykly tekst, nie SSE: klient ma tylko doklejac kolejne
// kawalki, wiec nie ma po co zmuszac go do parsowania ramek zdarzen.

/** Buduje cialo zapytania do OpenRoutera z wlaczonym strumieniowaniem. */
export function withStreaming(body: Record<string, unknown>): Record<string, unknown> {
  return { ...body, stream: true };
}

/** Wyciaga z surowych linii SSE OpenRoutera kolejne kawalki tresci. */
function extractDeltas(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;

    try {
      const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) out.push(delta);
    } catch {
      // OpenRouter wysyla tez komentarze podtrzymujace polaczenie (linie
      // zaczynajace sie od ":") i okazjonalne niepelne ramki - pomijamy je
      // zamiast przerywac strumien.
    }
  }
  return out;
}

// Krotszy niz AI_TIMEOUT_MS w ai-providers.ts (30s) - ten limit to tylko
// oczekiwanie na PIERWSZY kawalek (ktory przy dzialajacym zapytaniu przychodzi
// dużo szybciej niz cala odpowiedz), a nie licza sie w budzet, ktory i tak
// zostanie zuzyty przez fallback (do 2x OpenRouter + 2x Gemini = do 120s).
// Razem z tym oczekiwaniem trzeba zmiescic sie w ~150s limicie Supabase dla
// darmowego planu - 15s + 120s zostawia margines.
const FIRST_CHUNK_TIMEOUT_MS = 15_000;

function sleep(ms: number): Promise<"timeout"> {
  return new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));
}

/**
 * Przepuszcza strumien SSE z OpenRoutera, wyciagajac z niego sam tekst - a
 * jesli caly strumien skonczy sie bez ani jednego kawalka tresci (ten sam
 * problem "rozumujacego" modelu co w trybie bez streamingu, patrz
 * ai-providers.ts), woła `fallback()` i oddaje jej wynik zamiast pustego
 * strumienia.
 *
 * Decyzja (OpenRouter vs fallback) zapada PRZED zwroceniem odpowiedzi do
 * przegladarki - klient nigdy nie widzi pustego/przerwanego strumienia.
 * Dlatego ta funkcja jest async i czeka na pierwszy kawalek tresci (albo na
 * timeout/koniec strumienia) zanim zwroci gotowy ReadableStream.
 *
 * Czekanie na pierwszy kawalek jest ograniczone w czasie (FIRST_CHUNK_TIMEOUT_MS),
 * zeby zawieszony/bardzo wolny start OpenRoutera tez wywolywal fallback. Gdy
 * pierwszy kawalek juz przyszedl, dalsze czytanie NIE ma limitu czasu - wolny,
 * ale dzialajacy strumien (darmowe modele potrafia pisac nawet przez minute)
 * ma prawo dokonczyc sie normalnie, bez przerywania w polowie.
 */
export async function openRouterTextStreamWithFallback(
  upstream: Response,
  fallback: () => Promise<string>,
): Promise<ReadableStream<Uint8Array>> {
  const body = upstream.body;
  if (!body) throw new Error("OpenRouter nie zwrocil strumienia.");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = body.getReader();
  let buffer = "";
  let firstChunks: string[] = [];
  let streamEnded = false;
  // Deadline liczony raz, nie per-odczyt: OpenRouter przerywa dlugie
  // oczekiwanie komentarzami podtrzymujacymi polaczenie (":" linie bez
  // tresci), ktore nie licza sie jako kawalek tresci - gdyby timeout liczyl
  // sie od nowa przy kazdym odczycie, seria samych keep-alive wydluzalaby
  // oczekiwanie na pierwszy realny kawalek bez ograniczenia.
  const deadline = Date.now() + FIRST_CHUNK_TIMEOUT_MS;

  while (firstChunks.length === 0 && !streamEnded) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      await reader.cancel().catch(() => {});
      streamEnded = true;
      break;
    }
    const result = await Promise.race([reader.read(), sleep(remaining)]);
    if (result === "timeout") {
      await reader.cancel().catch(() => {});
      streamEnded = true;
      break;
    }
    const { done, value } = result;
    if (done) {
      streamEnded = true;
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    firstChunks = extractDeltas(lines);
  }

  if (firstChunks.length === 0) {
    const fallbackText = await fallback();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(fallbackText));
        controller.close();
      },
    });
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of firstChunks) controller.enqueue(encoder.encode(chunk));

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const chunk of extractDeltas(lines)) controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        controller.error(error);
        return;
      } finally {
        reader.releaseLock();
      }

      controller.close();
    },
  });
}

/** Naglowki odpowiedzi strumieniowej. */
export function streamHeaders(corsHeaders: Record<string, string>): HeadersInit {
  return {
    ...corsHeaders,
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  };
}
