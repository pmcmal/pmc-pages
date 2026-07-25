import { FunctionsHttpError } from "@supabase/supabase-js";

// supabase-js zwraca dla kazdej odpowiedzi non-2xx generyczny komunikat
// "Edge Function returned a non-2xx status code" zamiast tresci JSON, ktora
// faktycznie wyslala nasza funkcja (np. "Nie znaleziono tekstu dla tego utworu.").
// Prawdziwa odpowiedz siedzi w error.context (obiekt Response) - trzeba ja odczytac recznie.
export async function getEdgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error && typeof body.error === "string") return body.error;
    } catch {
      // Odpowiedz nie byla JSON-em - zostaw fallback
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
