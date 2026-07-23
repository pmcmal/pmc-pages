import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const REPO = "pmcmal/pmc-pages";

// UTF-8 bezpieczne base64 (btoa sam nie radzi sobie z polskimi znakami)
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Sprawdza, czy Authorization header niesie prawdziwa sesje zalogowanego uzytkownika
// (role "authenticated"), a nie tylko publiczny anon key (rowniez technicznie poprawny JWT).
function getJwtRole(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const role = getJwtRole(req.headers.get("Authorization"));
  if (role !== "authenticated") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const { slug, action } = body;

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response(JSON.stringify({ error: "Slug jest wymagany i moze zawierac tylko male litery, cyfry i myslniki" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const githubToken = Deno.env.get("GITHUB_PAT");
    if (!githubToken) {
      throw new Error("GITHUB_PAT is not set in environment variables.");
    }

    const path = `content/blog/${slug}.md`;
    const githubHeaders = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };

    let sha: string | undefined;
    const existing = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      headers: githubHeaders,
    });
    if (existing.ok) {
      const existingData = await existing.json();
      sha = existingData.sha;
    }

    if (action === "delete") {
      if (!sha) {
        return new Response(JSON.stringify({ error: "Wpis nie istnieje" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      const deleteResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
        method: "DELETE",
        headers: githubHeaders,
        body: JSON.stringify({ message: `Blog: usunieto wpis "${slug}"`, sha }),
      });
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        console.error("GitHub API error:", errorData);
        throw new Error(`GitHub API returned an error: ${deleteResponse.status} - ${JSON.stringify(errorData)}`);
      }
      return new Response(JSON.stringify({ success: true, deleted: path }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { title, excerpt, content, date: providedDate } = body;
    if (!title || !content) {
      return new Response(JSON.stringify({ error: "title i content sa wymagane" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const date = providedDate || new Date().toISOString().split("T")[0];
    const fileContent = `---\ntitle: ${title}\ndate: ${date}\nexcerpt: ${excerpt || ""}\n---\n\n${content}\n`;

    const putResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: "PUT",
      headers: githubHeaders,
      body: JSON.stringify({
        message: sha ? `Blog: aktualizacja "${title}"` : `Blog: nowy wpis "${title}"`,
        content: toBase64(fileContent),
        sha,
      }),
    });

    if (!putResponse.ok) {
      const errorData = await putResponse.json();
      console.error("GitHub API error:", errorData);
      throw new Error(`GitHub API returned an error: ${putResponse.status} - ${JSON.stringify(errorData)}`);
    }

    return new Response(JSON.stringify({ success: true, path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error saving blog post:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
