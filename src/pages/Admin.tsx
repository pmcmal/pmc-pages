import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { ResizableImage } from "@/components/ResizableImage";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/utils/edge-function-error";
import { getAllPosts, autoLinkBareDomains, type BlogPost } from "@/lib/blog";
import { sandboxApps, type SandboxApp } from "@/lib/sandbox-apps";
import { ICON_OPTIONS, COLOR_OPTIONS, COLOR_SWATCH_CLASS, suggestTile } from "@/lib/promote-options";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Podmienia width="N" w konkretnym tagu <img src="..."> na nowa wartosc (albo dodaje atrybut, jesli go nie ma)
function updateImageWidthInMarkdown(markdown: string, src: string, newWidth: number): string {
  const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const imgTagRegex = new RegExp(`<img[^>]*src="${escapedSrc}"[^>]*/?>`, "g");
  return markdown.replace(imgTagRegex, (tag) =>
    /width="\d+"/.test(tag)
      ? tag.replace(/width="\d+"/, `width="${newWidth}"`)
      : tag.replace(/\s*\/?>$/, ` width="${newWidth}" />`),
  );
}

const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// "lyrics-finder" -> "lyricsFinder" - projectsMeta/i18n uzywaja camelCase, sandbox-apps.ts kebab-case
const kebabToCamel = (slug: string) => slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const PromoteSandboxApp = ({ app, onPromoted }: { app: SandboxApp; onPromoted: (key: string) => void }) => {
  const [open, setOpen] = useState(false);
  // Ikona i kolor sa proponowane od razu po otwarciu, na podstawie klucza,
  // tytulu i opisu apki - przy liscie ponad stu ikon szukanie od zera bylo
  // najbardziej uciazliwym krokiem. Oczywiscie mozna je zmienic.
  const suggested = useMemo(() => suggestTile(app.key, app.title, app.description), [app]);
  const [icon, setIcon] = useState(suggested.icon);
  const [color, setColor] = useState<string>(suggested.color);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const SelectedIcon = ICON_OPTIONS[icon];
  const [category, setCategory] = useState<"ai" | "other">("other");
  const [titlePl, setTitlePl] = useState(app.title);
  const [descriptionPl, setDescriptionPl] = useState(app.description);
  const [titleEn, setTitleEn] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [makeDraft, setMakeDraft] = useState(true);

  /**
   * Pisze szkic wpisu o promowanej apce. Zwraca markdown albo null, gdy sie
   * nie udalo - wtedy promowanie i tak idzie dalej, bo kafelek jest wazniejszy
   * niz szkic, ktory mozna dopisac pozniej recznie.
   */
  const generateDraft = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("blog-ai-assist", {
        body: {
          instruction:
            "Napisz krótki wpis na blog o tym projekcie: po polsku, w pierwszej osobie, 3-5 akapitów. " +
            "Opisz po co powstał, co robi i co było ciekawe w robieniu go. Zwróć sam markdown treści, " +
            "bez nagłówka H1 z tytułem i bez wstępów typu 'Oto wpis'.",
          title: titlePl.trim(),
          content: `Nazwa projektu: ${titlePl.trim()}\nOpis: ${descriptionPl.trim()}\nAdres podstrony: ${app.path}`,
        },
      });
      if (error) throw new Error(await getEdgeFunctionErrorMessage(error, "Nieznany błąd."));
      if (data?.error) throw new Error(data.error);
      const text = String(data?.result ?? "").trim();
      return text || null;
    } catch (e) {
      toast.info(`Szkic wpisu się nie udał: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  };

  // Tytul i opis po angielsku sa tlumaczone automatycznie po otwarciu
  // formularza. Jedno wywolanie zalatwia oba pola - darmowy limit OpenRoutera
  // to 50 zapytan na dobe, wiec nie ma po co robic dwoch.
  const translateToEnglish = async () => {
    if (!titlePl.trim() || !descriptionPl.trim()) return;
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("blog-ai-assist", {
        body: {
          instruction:
            "Przetłumacz poniższy tytuł i opis na naturalny angielski. Zwróć DOKŁADNIE dwie linie: w pierwszej sam tytuł, w drugiej sam opis. Bez etykiet, bez cudzysłowów, bez formatowania.",
          title: titlePl.trim(),
          content: `Tytuł: ${titlePl.trim()}\nOpis: ${descriptionPl.trim()}`,
        },
      });
      if (error) throw new Error(await getEdgeFunctionErrorMessage(error, "Nieznany błąd."));
      if (data?.error) throw new Error(data.error);

      // Model bywa gadatliwy mimo instrukcji, wiec zdejmujemy ewentualne
      // etykiety, cudzyslowy i znaczniki listy, a bierzemy dwie pierwsze
      // niepuste linie.
      const lines = String(data?.result ?? "")
        .split(/\r?\n/)
        .map((line) =>
          line
            .replace(/^\s*(?:[-*>]|\d+[.)])\s*/, "")
            .replace(/^\s*(?:title|tytuł|tytul|description|opis)\s*:\s*/i, "")
            .replace(/^["'`*_]+|["'`*_]+$/g, "")
            .trim(),
        )
        .filter(Boolean);

      if (lines[0]) setTitleEn(lines[0]);
      if (lines[1]) setDescriptionEn(lines[1]);
      if (!lines[0] || !lines[1]) {
        toast.info("AI nie zwróciło kompletu — uzupełnij angielskie pola ręcznie.");
      }
    } catch (e) {
      toast.info(`Nie udało się przetłumaczyć automatycznie: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Tylko gdy pola sa jeszcze puste - recznych poprawek nie nadpisujemy.
  useEffect(() => {
    if (open && !titleEn && !descriptionEn && !isTranslating) {
      void translateToEnglish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePromote = async () => {
    if (!icon || !color || !titlePl.trim() || !descriptionPl.trim() || !titleEn.trim() || !descriptionEn.trim()) {
      toast.error("Uzupełnij ikonę, kolor oraz tytuł i opis po polsku i angielsku.");
      return;
    }
    setIsPromoting(true);
    try {
      const draftContent = makeDraft ? await generateDraft() : null;

      const { data, error } = await supabase.functions.invoke("promote-sandbox-app", {
        body: {
          key: kebabToCamel(app.key),
          sandboxKey: app.key,
          path: app.path,
          icon,
          color,
          category,
          titlePl: titlePl.trim(),
          descriptionPl: descriptionPl.trim(),
          titleEn: titleEn.trim(),
          descriptionEn: descriptionEn.trim(),
          draft: draftContent
            ? {
                slug: slugify(titlePl.trim()),
                title: titlePl.trim(),
                excerpt: descriptionPl.trim(),
                content: draftContent,
              }
            : undefined,
        },
      });
      if (error) throw new Error(await getEdgeFunctionErrorMessage(error, "Nieznany błąd."));
      if (data?.error) throw new Error(data.error);
      toast.success(
        `"${app.title}" przeniesiony na stronę główną! Deploy na Vercelu ruszy automatycznie (ok. 1 min) — odśwież stronę po chwili.`,
      );
      onPromoted(app.key);
    } catch (e) {
      toast.error(`Błąd przenoszenia na stronę główną: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="border-t border-amber-200 dark:border-amber-900 mt-2 pt-2">
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(!open)}>
        {open ? "Anuluj" : "🚀 Przenieś na stronę główną"}
      </Button>
      {open && (
        <div className="mt-2 space-y-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Ikona</Label>
              {/* Zwykla lista rozwijana przy ponad stu ikonach byla nie do
                  przejscia, wiec wybor idzie przez pole z wyszukiwarka. */}
              <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="flex items-center gap-2 truncate">
                      {SelectedIcon && <SelectedIcon className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{icon || "Wybierz ikonę"}</span>
                    </span>
                    <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64" align="start">
                  <Command>
                    <CommandInput placeholder="Szukaj ikony..." />
                    <CommandList>
                      <CommandEmpty>Nie znaleziono ikony.</CommandEmpty>
                      <CommandGroup>
                        {Object.entries(ICON_OPTIONS).map(([name, Icon]) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={() => {
                              setIcon(name);
                              setIconPickerOpen(false);
                            }}
                          >
                            <Icon className="w-4 h-4 mr-2 shrink-0" />
                            {name}
                            {name === suggested.icon && (
                              <span className="ml-auto text-xs text-muted-foreground">sugestia</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Kolor</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kolor" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${COLOR_SWATCH_CLASS[c]}`} /> {c}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as "ai" | "other")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">Wsparte na AI</SelectItem>
                  <SelectItem value="other">Pozostałe projekty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Tytuł (PL)</Label>
              <Input value={titlePl} onChange={(e) => setTitlePl(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Tytuł (EN)</Label>
                <button
                  type="button"
                  onClick={() => void translateToEnglish()}
                  disabled={isTranslating}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  {isTranslating ? "Tłumaczę..." : "Przetłumacz ponownie"}
                </button>
              </div>
              <Input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={isTranslating ? "Tłumaczenie..." : "np. CV Generator"}
              />
            </div>
            <div>
              <Label>Opis (PL)</Label>
              <Input value={descriptionPl} onChange={(e) => setDescriptionPl(e.target.value)} />
            </div>
            <div>
              <Label>Opis (EN)</Label>
              <Input
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder={isTranslating ? "Tłumaczenie..." : "np. A simple CV builder with a live preview."}
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={makeDraft}
              onChange={(e) => setMakeDraft(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Przygotuj też szkic wpisu na bloga
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Trafi do „Oczekujących szkiców" — nie pokaże się na blogu, dopóki go nie opublikujesz.
              </span>
            </span>
          </label>

          <Button onClick={handlePromote} disabled={isPromoting} className="w-full">
            {isPromoting
              ? makeDraft
                ? "Przenoszę i piszę szkic..."
                : "Przenoszenie..."
              : "Potwierdź i przenieś na stronę główną"}
          </Button>
        </div>
      )}
    </div>
  );
};

const IDLE_LOGOUT_MS = 10 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;

// Wylogowuje po 10 min bez ruchu myszki/klawiatury - panel admina jest publicznie
// dostepny pod znanym adresem, wiec zapomniana otwarta sesja jest ryzykiem.
// Sprawdzanie realnego uplywu czasu (Date.now()) w interwale zamiast pojedynczego
// dlugiego setTimeout - przegladarki mocno tortluja timery na kartach w tle,
// wiec sam setTimeout ustawiony na 10 min potrafi nie odpalic sie na czas.
function useIdleLogout() {
  useEffect(() => {
    let lastActivity = Date.now();
    const markActivity = () => {
      lastActivity = Date.now();
    };

    const checkIdle = () => {
      if (Date.now() - lastActivity >= IDLE_LOGOUT_MS) {
        supabase.auth.signOut();
        toast.info("Wylogowano automatycznie po 10 minutach bezczynności.");
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActivity));
    document.addEventListener("visibilitychange", markActivity);

    const intervalId = setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      events.forEach((event) => window.removeEventListener(event, markActivity));
      document.removeEventListener("visibilitychange", markActivity);
    };
  }, []);
}

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      toast.error(`Błąd logowania: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <SiteHomeButton />
      <div className="w-full max-w-sm p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <h1 className="text-xl font-semibold mb-4">Panel admina</h1>
        <div className="space-y-3">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button onClick={handleLogin} disabled={isLoading} className="w-full">
            {isLoading ? "Logowanie..." : "Zaloguj"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const emptyForm = { title: "", slug: "", excerpt: "", content: "", date: "", draft: false };

const Editor = ({ session }: { session: Session }) => {
  useIdleLogout();
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // true - panel widzi tez szkice, blog i strona glowna ich nie pokazuja
  const [posts, setPosts] = useState<BlogPost[]>(getAllPosts(true));
  const [sandbox, setSandbox] = useState<SandboxApp[]>(sandboxApps);
  const [instruction, setInstruction] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = (text: string) => {
    const textarea = contentRef.current;
    if (!textarea) {
      setForm((f) => ({ ...f, content: f.content + text }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setForm((f) => ({ ...f, content: f.content.slice(0, start) + text + f.content.slice(end) }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    });
  };

  const handleAskAi = async () => {
    if (!instruction.trim()) {
      toast.error("Napisz czego potrzebujesz od asystenta.");
      return;
    }
    setIsAsking(true);
    setAiResult("");
    try {
      const { data, error } = await supabase.functions.invoke("blog-ai-assist", {
        body: { instruction: instruction.trim(), content: form.content, title: form.title },
      });
      if (error) throw new Error(await getEdgeFunctionErrorMessage(error, "Nieznany błąd."));
      if (data?.error) throw new Error(data.error);
      setAiResult(data.result || "");
    } catch (e) {
      toast.error(`Błąd asystenta AI: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsAsking(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      insertAtCursor(`<img src="${data.publicUrl}" alt="${file.name}" width="600" />\n`);
      toast.success("Zdjęcie wgrane. Najedź na nie w podglądzie i przeciągnij za rożek, żeby zmienić rozmiar.");
    } catch (e) {
      toast.error(`Błąd wgrywania zdjęcia: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleTitleChange = (value: string) => {
    setForm((f) => ({ ...f, title: value }));
    if (!slugTouched) setForm((f) => ({ ...f, slug: slugify(value) }));
  };

  // Panel pobiera komplet (getAllPosts(true)), a tu rozdziela na dwie listy.
  const drafts = posts.filter((p) => p.draft);
  const published = posts.filter((p) => !p.draft);

  const loadPost = (post: BlogPost) => {
    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, date: post.date, draft: post.draft });
    setSlugTouched(true);
    setIsEditing(true);
    setAiResult("");
    setInstruction("");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSlugTouched(false);
    setIsEditing(false);
    setAiResult("");
    setInstruction("");
  };

  const handlePublish = async (asDraft = false) => {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error("Wypełnij tytuł, slug i treść.");
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-blog-post", {
        body: {
          slug: form.slug.trim(),
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content,
          date: form.date || undefined,
          draft: asDraft,
        },
      });
      if (error) throw new Error(await getEdgeFunctionErrorMessage(error, "Nieznany błąd."));
      if (data?.error) throw new Error(data.error);
      toast.success(
        asDraft
          ? "Szkic zapisany. Deploy ruszy automatycznie (ok. 1 min) — po odświeżeniu znajdziesz go w oczekujących."
          : "Wpis opublikowany! Deploy na Vercelu ruszy automatycznie (ok. 1 min) — odśwież stronę po chwili, żeby zobaczyć go na liście.",
      );
      resetForm();
    } catch (e) {
      toast.error(`Błąd publikacji: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (postSlug: string) => {
    if (!confirm(`Usunąć wpis "${postSlug}"? Tego nie da się odwołać.`)) return;
    setDeletingSlug(postSlug);
    try {
      const { data, error } = await supabase.functions.invoke("save-blog-post", {
        body: { slug: postSlug, action: "delete" },
      });
      if (error) throw new Error(await getEdgeFunctionErrorMessage(error, "Nieznany błąd."));
      if (data?.error) throw new Error(data.error);
      toast.success("Wpis usunięty. Deploy na Vercelu ruszy automatycznie.");
      setPosts((prev) => prev.filter((p) => p.slug !== postSlug));
      if (form.slug === postSlug) resetForm();
    } catch (e) {
      toast.error(`Błąd usuwania: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SiteHomeButton />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Panel bloga</h1>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Wyloguj
          </Button>
        </div>

        {sandbox.length > 0 && (
          <div className="mb-8 p-5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">🧪 Piaskownica ({sandbox.length})</h2>
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Działają, ale nie ma ich jeszcze na stronie głównej — przetestuj i daj znać, jeśli mają wejść na stałe.
              </span>
            </div>
            <div className="space-y-2">
              {sandbox.map((app) => (
                <div
                  key={app.key}
                  className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-gray-900"
                >
                  <a
                    href={app.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:opacity-80 transition-opacity"
                  >
                    <div className="font-medium">{app.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{app.description}</div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">{app.path} ↗</div>
                  </a>
                  <PromoteSandboxApp
                    app={app}
                    onPromoted={(key) => setSandbox((prev) => prev.filter((a) => a.key !== key))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {drafts.length > 0 && (
          <div className="mb-8 p-5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">📝 Oczekujące szkice ({drafts.length})</h2>
              <span className="text-xs text-sky-700 dark:text-sky-400">
                Nie widać ich na blogu — dokończ i opublikuj.
              </span>
            </div>
            <div className="space-y-2">
              {drafts.map((post) => (
                <div
                  key={post.slug}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-sky-200 dark:border-sky-900 bg-white dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">{post.date}</div>
                    <div className="font-medium truncate">{post.title}</div>
                    {post.excerpt && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{post.excerpt}</div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => loadPost(post)}>
                      Otwórz
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(post.slug)}
                      disabled={deletingSlug === post.slug}
                    >
                      {deletingSlug === post.slug ? "Usuwanie..." : "Usuń"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Istniejące wpisy ({published.length})</h2>
            <span className="text-xs text-gray-400">
              Lista odzwierciedla ostatni zbudowany deploy — po publikacji/usunięciu odśwież stronę po ok. 1 min.
            </span>
          </div>
          {published.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Brak wpisów.</p>
          ) : (
            <div className="space-y-2">
              {published.map((post) => (
                <div
                  key={post.slug}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">{post.date}</div>
                    <div className="font-medium truncate">{post.title}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => loadPost(post)}>
                      Edytuj
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(post.slug)}
                      disabled={deletingSlug === post.slug}
                    >
                      {deletingSlug === post.slug ? "Usuwanie..." : "Usuń"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{isEditing ? `Edycja: ${form.title}` : "Nowy wpis"}</h2>
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              + Nowy wpis
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Tytuł</Label>
              <Input id="title" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="slug">Slug (adres URL){isEditing && " — niezmienny przy edycji"}</Label>
              <Input
                id="slug"
                value={form.slug}
                disabled={isEditing}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
              />
            </div>
            <div>
              <Label htmlFor="excerpt">Krótki opis</Label>
              <Input id="excerpt" value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="content">Treść (Markdown)</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? "Wgrywanie..." : "🖼️ Wgraj zdjęcie"}
                  </Button>
                </div>
              </div>
              <Textarea
                id="content"
                ref={contentRef}
                rows={20}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 space-y-3">
              <Label htmlFor="ai-instruction">Asystent AI (redakcja, pomysły, poprawki)</Label>
              <div className="flex gap-2">
                <Input
                  id="ai-instruction"
                  placeholder="np. 'zaproponuj tytuł', 'popraw styl i literówki', 'rozwiń ten fragment'..."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
                />
                <Button type="button" onClick={handleAskAi} disabled={isAsking}>
                  {isAsking ? "Myślę..." : "Zapytaj"}
                </Button>
              </div>
              {aiResult && (
                <div className="space-y-2">
                  <Textarea readOnly rows={8} value={aiResult} className="font-mono text-sm bg-white dark:bg-gray-900" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => insertAtCursor(aiResult)}>
                      Wstaw do treści
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setForm((f) => ({ ...f, content: aiResult }))}
                    >
                      Zastąp całą treść
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAiResult("")}>
                      Odrzuć
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Przy szkicu publikacja to po prostu zapis bez flagi draft -
                dlatego edycja szkicu pokazuje oba przyciski. */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => handlePublish(false)} disabled={isSaving} className="flex-1">
                {isSaving
                  ? "Zapisywanie..."
                  : form.draft
                    ? "Opublikuj szkic"
                    : isEditing
                      ? "Zapisz zmiany"
                      : "Opublikuj"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePublish(true)}
                disabled={isSaving}
                className="sm:w-48"
              >
                Zapisz jako szkic
              </Button>
            </div>
          </div>

          <div>
            <Label>Podgląd na żywo</Label>
            <div className="mt-2 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 prose prose-gray dark:prose-invert max-w-none min-h-[500px]">
              <h1>{form.title || "Tytuł wpisu"}</h1>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  img: ({ src, alt, width }) => (
                    <ResizableImage
                      src={typeof src === "string" ? src : undefined}
                      alt={alt}
                      width={width}
                      onResizeEnd={(imgSrc, newWidth) =>
                        setForm((f) => ({ ...f, content: updateImageWidthInMarkdown(f.content, imgSrc, newWidth) }))
                      }
                    />
                  ),
                }}
              >
                {form.content ? autoLinkBareDomains(form.content) : "*Podgląd treści pojawi się tutaj...*"}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!loaded) return null;
  return session ? <Editor session={session} /> : <LoginForm />;
};

export default Admin;
