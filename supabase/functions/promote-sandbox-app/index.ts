import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const REPO = "pmcmal/pmc-pages";

// Te dwie listy musza byc identyczne z src/lib/promote-options.ts (ICON_OPTIONS / COLOR_OPTIONS).
// Waliduja input zanim trafi jako literalny kod do Index.tsx - stad whitelist, nie wolny tekst.
const ALLOWED_ICONS = [
  "Terminal", "Code", "Cpu", "Database", "Server", "Bug", "GitBranch", "Braces",
  "Command", "Keyboard", "Monitor", "Laptop", "HardDrive", "Network", "Bot", "Brain",
  "Sparkles", "Atom", "Binary", "Music", "Headphones", "Mic", "Video", "Film",
  "Camera", "Image", "Radio", "Speaker", "Disc3", "Gamepad2", "Joystick", "Dices",
  "Puzzle", "Trophy", "Target", "Swords", "Rocket", "FileText", "File", "Files",
  "BookOpen", "Book", "Notebook", "Newspaper", "ScrollText", "ClipboardList", "StickyNote", "PenTool",
  "Pencil", "ShoppingCart", "ShoppingBag", "Store", "CreditCard", "Wallet", "Package", "Tag",
  "Receipt", "Coins", "Banknote", "User", "Users", "Mail", "MessageSquare", "MessageCircle",
  "Phone", "Send", "Share2", "Heart", "Star", "ThumbsUp", "ChefHat", "Utensils",
  "UtensilsCrossed", "Coffee", "Pizza", "Apple", "Soup", "CupSoda", "Cake", "CloudSun",
  "Cloud", "Sun", "Moon", "CloudRain", "Snowflake", "Umbrella", "Leaf", "TreePine",
  "Flower2", "Mountain", "Waves", "CircuitBoard", "Zap", "Battery", "Plug", "Lightbulb",
  "Antenna", "Wrench", "Hammer", "Settings", "Cog", "GraduationCap", "School", "BookMarked",
  "Library", "Presentation", "BarChart", "BarChart3", "LineChart", "PieChart", "TrendingUp", "Activity",
  "Gauge", "Calendar", "CalendarDays", "Clock", "Timer", "AlarmClock", "ListTodo", "CheckSquare",
  "Kanban", "MapPin", "Map", "Globe", "Compass", "Plane", "Car", "Bike",
  "Train", "Navigation", "Layers", "Box", "Archive", "Folder", "Search", "Filter",
  "Shield", "Lock", "Key", "Palette", "Brush", "Scissors", "Ruler", "Flame", "Droplet", "Dumbbell", "Stethoscope", "Pill", "Dog", "Cat",
];
const ALLOWED_COLORS = [
  "sky", "violet", "orange", "pink", "emerald", "indigo", "purple", "green",
  "lime", "rose", "amber", "teal", "cyan", "red", "blue", "fuchsia", "yellow",
];
const MAX_TEXT_LENGTH = 200;

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

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

function fromBase64(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function escapeForJsString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface PromoteBody {
  // projectsMeta i i18n uzywaja camelCase ("cvGenerator"), a sandbox-apps.ts
  // kebab-case ("cv-generator") - to dwa rozne identyfikatory tej samej apki
  // i trzeba je dostac osobno, zeby usuniecie wpisu z piaskownicy trafialo.
  key: string;
  sandboxKey: string;
  path: string;
  icon: string;
  color: string;
  category: "ai" | "other";
  titlePl: string;
  descriptionPl: string;
  titleEn: string;
  descriptionEn: string;
  /**
   * Opcjonalny szkic wpisu na bloga o promowanej apce. Leci w tym samym
   * commicie co kafelek, zeby jedna akcja = jeden deploy.
   */
  draft?: { slug: string; title: string; excerpt: string; content: string };
}

const MAX_DRAFT_LENGTH = 20000;

function validateDraft(draft: PromoteBody["draft"]): string | null {
  if (!draft) return null;
  if (!draft.slug || !/^[a-z0-9-]+$/.test(draft.slug)) {
    return "Slug szkicu moze zawierac tylko male litery, cyfry i myslniki";
  }
  if (!draft.title?.trim()) return "Szkic musi miec tytul";
  if (!draft.content?.trim()) return "Szkic musi miec tresc";
  if (draft.content.length > MAX_DRAFT_LENGTH) {
    return `Tresc szkicu jest za dluga (max ${MAX_DRAFT_LENGTH} znakow)`;
  }
  return null;
}

function validateBody(body: Partial<PromoteBody>): string | null {
  if (!body.key || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(body.key)) {
    return "key musi byc identyfikatorem (litery/cyfry, zaczynac sie od litery)";
  }
  if (!body.sandboxKey || !/^[a-z0-9-]+$/.test(body.sandboxKey)) {
    return "sandboxKey musi byc kluczem z sandbox-apps.ts (male litery, cyfry, myslniki)";
  }
  if (!body.path || !/^\/[a-z0-9-]+$/.test(body.path)) {
    return "path musi wygladac jak /nazwa-podstrony";
  }
  if (!body.icon || !ALLOWED_ICONS.includes(body.icon)) {
    return "Nieznana ikona";
  }
  if (!body.color || !ALLOWED_COLORS.includes(body.color)) {
    return "Nieznany kolor";
  }
  if (body.category !== "ai" && body.category !== "other") {
    return 'category musi byc "ai" albo "other"';
  }
  for (const field of ["titlePl", "descriptionPl", "titleEn", "descriptionEn"] as const) {
    const value = body[field];
    if (!value || !value.trim()) return `${field} jest wymagane`;
    if (value.length > MAX_TEXT_LENGTH) return `${field} jest za dlugie (max ${MAX_TEXT_LENGTH} znakow)`;
  }
  return null;
}

function addIconImport(source: string, icon: string): string {
  const importRegex = /import\s*\{([^}]*)\}\s*from\s*"lucide-react";/;
  const match = source.match(importRegex);
  if (!match) throw new Error("Nie znaleziono importu z lucide-react w Index.tsx");
  const names = match[1].split(",").map((n) => n.trim()).filter(Boolean);
  if (names.includes(icon)) return source;
  names.push(icon);
  const newBlock = `import {\n  ${names.join(",\n  ")},\n} from "lucide-react";`;
  return source.replace(importRegex, newBlock);
}

function addProjectMetaEntry(
  source: string,
  entry: { key: string; path: string; icon: string; accent: string; category: string },
): string {
  const arrayRegex = /(const projectsMeta: ProjectMeta\[\] = \[)([\s\S]*?)(\n\];)/;
  const match = source.match(arrayRegex);
  if (!match) throw new Error("Nie znaleziono projectsMeta w Index.tsx");
  if (new RegExp(`key:\\s*"${escapeForRegex(entry.key)}"`).test(match[2])) {
    throw new Error(`"${entry.key}" jest juz w projectsMeta - chyba zostal juz wczesniej przeniesiony`);
  }
  const newLine = `\n  { key: "${entry.key}", path: "${entry.path}", icon: ${entry.icon}, accent: "${entry.accent}", category: "${entry.category}" },`;
  return source.replace(arrayRegex, `$1$2${newLine}$3`);
}

const PROJECTS_BLOCK_REGEX = /(\s*projects:\s*\{)([\s\S]*?)(\n(\s*)\},\n\s*footer:)/;

function insertIntoProjectsBlock(
  section: string,
  lang: "pl" | "en",
  key: string,
  title: string,
  description: string,
): string {
  const match = section.match(PROJECTS_BLOCK_REGEX);
  if (!match) throw new Error(`Nie znaleziono bloku "projects" w sekcji ${lang} w i18n.ts`);
  if (new RegExp(`\\b${escapeForRegex(key)}:\\s*\\{`).test(match[2])) {
    throw new Error(`"${key}" jest juz w tlumaczeniach (${lang}) - chyba zostal juz wczesniej przeniesiony`);
  }
  const indent = match[4] + "  ";
  const newLine = `\n${indent}${key}: { title: "${escapeForJsString(title)}", description: "${escapeForJsString(description)}" },`;
  return section.replace(PROJECTS_BLOCK_REGEX, `$1$2${newLine}$3`);
}

function insertProjectTranslations(
  source: string,
  key: string,
  titlePl: string,
  descriptionPl: string,
  titleEn: string,
  descriptionEn: string,
): string {
  const splitMarker = "\n  en: {\n";
  const splitIndex = source.indexOf(splitMarker);
  if (splitIndex === -1) throw new Error("Nie znaleziono granicy pl/en w i18n.ts");
  const plSection = source.slice(0, splitIndex);
  const enSection = source.slice(splitIndex);

  const newPlSection = insertIntoProjectsBlock(plSection, "pl", key, titlePl, descriptionPl);
  const newEnSection = insertIntoProjectsBlock(enSection, "en", key, titleEn, descriptionEn);
  return newPlSection + newEnSection;
}

function removeSandboxAppEntry(source: string, key: string): string {
  const objectRegex = /\{\s*\n\s*key:\s*"([^"]+)"[\s\S]*?\n\s*\},/g;
  let found = false;
  let result = source.replace(objectRegex, (block, blockKey) => {
    if (blockKey === key) {
      found = true;
      return "";
    }
    return block;
  });
  if (!found) throw new Error(`Nie znaleziono "${key}" w sandbox-apps.ts`);
  result = result.replace(/\n[ \t]*\n(\s*\{|\s*\];)/g, "\n$1");
  return result;
}

function removeRobotsDisallow(source: string, path: string): string {
  const lineRegex = new RegExp(`\\nDisallow: ${escapeForRegex(path)}`, "g");
  if (!lineRegex.test(source)) throw new Error(`Nie znaleziono "Disallow: ${path}" w robots.txt`);
  return source.replace(lineRegex, "");
}

async function getFile(githubHeaders: Record<string, string>, path: string) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, { headers: githubHeaders });
  if (!res.ok) throw new Error(`Nie udalo sie pobrac ${path} z GitHuba (${res.status})`);
  const data = await res.json();
  return { content: fromBase64(data.content), sha: data.sha as string };
}

async function githubPost(githubHeaders: Record<string, string>, endpoint: string, body: unknown, method = "POST") {
  const res = await fetch(`https://api.github.com/repos/${REPO}/${endpoint}`, {
    method,
    headers: githubHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`GitHub API blad (${endpoint}): ${res.status} - ${JSON.stringify(errorData)}`);
  }
  return await res.json();
}

/**
 * Zapisuje komplet plikow jako JEDEN commit przez Git Data API.
 *
 * Zapisywanie plik po pliku przez /contents dawalo cztery osobne commity, czyli
 * cztery deploye Vercela, a przy bledzie w polowie zostawialo repo w stanie
 * posrednim: strona glowna juz z kafelkiem, piaskownica wciaz z wpisem. Tutaj
 * az do podmiany referencji nic nie jest widoczne, wiec albo wchodzi calosc,
 * albo nic.
 */
async function commitFiles(
  githubHeaders: Record<string, string>,
  files: { path: string; content: string }[],
  message: string,
) {
  const branch = "heads/main";

  const ref = await (await fetch(`https://api.github.com/repos/${REPO}/git/ref/${branch}`, {
    headers: githubHeaders,
  })).json();
  const baseCommitSha = ref?.object?.sha;
  if (!baseCommitSha) throw new Error("Nie udalo sie odczytac biezacego commita z GitHuba");

  const baseCommit = await (await fetch(`https://api.github.com/repos/${REPO}/git/commits/${baseCommitSha}`, {
    headers: githubHeaders,
  })).json();
  const baseTreeSha = baseCommit?.tree?.sha;
  if (!baseTreeSha) throw new Error("Nie udalo sie odczytac drzewa bazowego");

  const tree = await githubPost(githubHeaders, "git/trees", {
    base_tree: baseTreeSha,
    tree: files.map((file) => ({ path: file.path, mode: "100644", type: "blob", content: file.content })),
  });

  const commit = await githubPost(githubHeaders, "git/commits", {
    message,
    tree: tree.sha,
    parents: [baseCommitSha],
  });

  await githubPost(githubHeaders, `git/refs/${branch}`, { sha: commit.sha }, "PATCH");
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const role = getJwtRole(req.headers.get("Authorization"));
  if (role !== "authenticated") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const body = (await req.json()) as Partial<PromoteBody>;
    const validationError = validateBody(body) ?? validateDraft(body.draft);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const { key, sandboxKey, path, icon, color, category, titlePl, descriptionPl, titleEn, descriptionEn } =
      body as PromoteBody;
    const accent = `text-${color}-500 bg-${color}-500/10`;

    const githubToken = Deno.env.get("GITHUB_PAT");
    if (!githubToken) throw new Error("GITHUB_PAT is not set in environment variables.");
    const githubHeaders = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };

    const indexPath = "src/pages/Index.tsx";
    const i18nPath = "src/i18n.ts";
    const sandboxPath = "src/lib/sandbox-apps.ts";
    const robotsPath = "public/robots.txt";

    const [indexFile, i18nFile, sandboxFile, robotsFile] = await Promise.all([
      getFile(githubHeaders, indexPath),
      getFile(githubHeaders, i18nPath),
      getFile(githubHeaders, sandboxPath),
      getFile(githubHeaders, robotsPath),
    ]);

    let newIndex = addIconImport(indexFile.content, icon);
    newIndex = addProjectMetaEntry(newIndex, { key, path, icon, accent, category });

    const newI18n = insertProjectTranslations(i18nFile.content, key, titlePl, descriptionPl, titleEn, descriptionEn);

    const newSandbox = removeSandboxAppEntry(sandboxFile.content, sandboxKey);
    const newRobots = removeRobotsDisallow(robotsFile.content, path);

    const files = [
      { path: indexPath, content: newIndex },
      { path: i18nPath, content: newI18n },
      { path: sandboxPath, content: newSandbox },
      { path: robotsPath, content: newRobots },
    ];

    const draft = body.draft;
    if (draft) {
      // "draft: true" sprawia, ze wpis nie pokazuje sie na blogu - czeka
      // w panelu na dokonczenie i publikacje.
      const date = new Date().toISOString().split("T")[0];
      const markdown =
        `---\ntitle: ${draft.title.trim()}\ndate: ${date}\n` +
        `excerpt: ${(draft.excerpt ?? "").trim()}\ndraft: true\n---\n\n${draft.content.trim()}\n`;
      files.push({ path: `content/blog/${draft.slug}.md`, content: markdown });
    }

    const commitMessage = draft
      ? `Przenies "${titlePl}" z piaskownicy na strone glowna i dodaj szkic wpisu`
      : `Przenies "${titlePl}" z piaskownicy na strone glowna`;

    await commitFiles(githubHeaders, files, commitMessage);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error promoting sandbox app:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
