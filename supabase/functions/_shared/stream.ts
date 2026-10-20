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

/**
 * Przepuszcza strumien SSE z OpenRoutera, wyciagajac z niego sam tekst.
 * Zwraca strumien gotowy do oddania jako cialo odpowiedzi.
 */
export function openRouterTextStream(upstream: Response): ReadableStream<Uint8Array> {
  const body = upstream.body;
  if (!body) throw new Error("OpenRouter nie zwrocil strumienia.");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Ostatni element moze byc urwana linia - zostaw go w buforze.
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // OpenRouter wysyla tez komentarze podtrzymujace polaczenie
              // (linie zaczynajace sie od ":") i okazjonalne niepelne ramki -
              // pomijamy je zamiast przerywac strumien.
            }
          }
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
