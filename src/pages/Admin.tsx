import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { supabase } from "@/integrations/supabase/client";
import { getAllPosts, type BlogPost } from "@/lib/blog";

const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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

const emptyForm = { title: "", slug: "", excerpt: "", content: "", date: "" };

const Editor = ({ session }: { session: Session }) => {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>(getAllPosts());

  const handleTitleChange = (value: string) => {
    setForm((f) => ({ ...f, title: value }));
    if (!slugTouched) setForm((f) => ({ ...f, slug: slugify(value) }));
  };

  const loadPost = (post: BlogPost) => {
    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, date: post.date });
    setSlugTouched(true);
    setIsEditing(true);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSlugTouched(false);
    setIsEditing(false);
  };

  const handlePublish = async () => {
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
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Wpis opublikowany! Deploy na Vercelu ruszy automatycznie (ok. 1 min) — odśwież stronę po chwili, żeby zobaczyć go na liście.");
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
      if (error) throw error;
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

        <div className="mb-8 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Istniejące wpisy ({posts.length})</h2>
            <span className="text-xs text-gray-400">
              Lista odzwierciedla ostatni zbudowany deploy — po publikacji/usunięciu odśwież stronę po ok. 1 min.
            </span>
          </div>
          {posts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Brak wpisów.</p>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
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
              <Label htmlFor="content">Treść (Markdown)</Label>
              <Textarea
                id="content"
                rows={20}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handlePublish} disabled={isSaving} className="w-full">
              {isSaving ? "Publikowanie..." : isEditing ? "Zapisz zmiany" : "Opublikuj"}
            </Button>
          </div>

          <div>
            <Label>Podgląd na żywo</Label>
            <div className="mt-2 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 prose prose-gray dark:prose-invert max-w-none min-h-[500px]">
              <h1>{form.title || "Tytuł wpisu"}</h1>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content || "*Podgląd treści pojawi się tutaj...*"}</ReactMarkdown>
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
