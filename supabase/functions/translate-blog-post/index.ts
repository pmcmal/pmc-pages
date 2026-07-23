import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const REPO = "pmcmal/pmc-pages";

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text;
}

// UTF-8 bezpieczne base64 (jak w save-blog-post)
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseFrontmatter(raw: string): { title: string; excerpt: string; date: string; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { title: "", excerpt: "", date: "", content: raw };
  const [, frontmatter, content] = match;
  const data: Record<string, string> = {};
  frontmatter.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  });
  return { title: data.title || "", excerpt: data.excerpt || "", date: data.date || "", content: content.trim() };
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response(JSON.stringify({ error: "Nieprawidłowy slug" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const githubToken = Deno.env.get("GITHUB_PAT");
    if (!githubToken) {
      throw new Error("GITHUB_PAT is not set in environment variables.");
    }
    const githubHeaders = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };

    const plPath = `content/blog/${slug}.md`;
    const enPath = `content/blog/${slug}.en.md`;

    // 1. Jesli tlumaczenie juz istnieje w repo, zwroc je od razu bez wolania AI
    const existingEn = await fetch(`https://api.github.com/repos/${REPO}/contents/${enPath}`, { headers: githubHeaders });
    if (existingEn.ok) {
      const existingData = await existingEn.json();
      const parsed = parseFrontmatter(fromBase64(existingData.content));
      return new Response(JSON.stringify({ title: parsed.title, excerpt: parsed.excerpt, content: parsed.content, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Pobierz prawdziwa, autorytatywna tresc PL z repo (nie ufamy tresci od klienta)
    const plResp = await fetch(`https://api.github.com/repos/${REPO}/contents/${plPath}`, { headers: githubHeaders });
    if (!plResp.ok) {
      return new Response(JSON.stringify({ error: "Wpis nie istnieje" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    const plData = await plResp.json();
    const original = parseFrontmatter(fromBase64(plData.content));

    // 3. Przetlumacz przez OpenRouter
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
    }

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        provider: { sort: "throughput" },
        messages: [
          {
            role: "system",
            content: "Jesteś tłumaczem technicznym. Otrzymujesz obiekt JSON z polami 'title', 'excerpt', 'content' wpisu bloga po polsku (pola moga byc puste). Przetłumacz KAŻDE niepuste pole na angielski. Zachowaj dokładnie formatowanie Markdown (nagłówki, listy, linki, obrazy, bloki kodu), adresy URL i fragmenty kodu bez zmian - tłumacz tylko naturalny tekst. Zwróć WYŁĄCZNIE obiekt JSON z dokładnie tymi samymi trzema polami (title, excerpt, content), bez żadnych komentarzy ani wyjaśnień.",
          },
          {
            role: "user",
            content: JSON.stringify({ title: original.title, excerpt: original.excerpt, content: original.content }),
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await openrouterResponse.json();
    const aiResponseContent = data.choices?.[0]?.message?.content ?? "";

    let translated;
    const jsonCandidate = extractJson(aiResponseContent);
    try {
      translated = JSON.parse(jsonCandidate);
    } catch {
      try {
        translated = JSON.parse(jsonrepair(jsonCandidate));
      } catch (e) {
        console.error("Failed to parse translation as JSON:", aiResponseContent, e);
        translated = original;
      }
    }

    const result = {
      title: typeof translated.title === "string" ? translated.title : original.title,
      excerpt: typeof translated.excerpt === "string" ? translated.excerpt : original.excerpt,
      content: typeof translated.content === "string" ? translated.content : original.content,
    };

    // 4. Zapisz jako plik obok oryginalu, zeby kolejni odwiedzajacy dostali go od razu, statycznie
    const enFileContent = `---\ntitle: ${result.title}\ndate: ${original.date}\nexcerpt: ${result.excerpt}\n---\n\n${result.content}\n`;
    const putResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${enPath}`, {
      method: "PUT",
      headers: githubHeaders,
      body: JSON.stringify({
        message: `Blog: auto-tlumaczenie EN dla "${slug}"`,
        content: toBase64(enFileContent),
      }),
    });
    if (!putResponse.ok) {
      // Tlumaczenie i tak sie udalo - zapis w repo to tylko optymalizacja na przyszlosc,
      // wiec nie wywalamy calego zadania jesli akurat to sie nie powiedzie.
      console.error("Failed to persist EN translation:", await putResponse.text());
    }

    return new Response(JSON.stringify({ ...result, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error translating blog post:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
