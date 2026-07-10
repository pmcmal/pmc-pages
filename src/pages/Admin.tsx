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

const Editor = ({ session }: { session: Session }) => {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handlePublish = async () => {
    if (!title.trim() || !slug.trim() || !content.trim()) {
      toast.error("Wypełnij tytuł, slug i treść.");
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-blog-post", {
        body: {
          slug: slug.trim(),
          title: title.trim(),
          excerpt: excerpt.trim(),
          content,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Wpis opublikowany! Deploy na Vercelu ruszy automatycznie (ok. 1 min).");
    } catch (e) {
      toast.error(`Błąd publikacji: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SiteHomeButton />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nowy wpis na blogu</h1>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Wyloguj
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Tytuł</Label>
              <Input id="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="slug">Slug (adres URL)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </div>
            <div>
              <Label htmlFor="excerpt">Krótki opis</Label>
              <Input id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="content">Treść (Markdown)</Label>
              <Textarea
                id="content"
                rows={20}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handlePublish} disabled={isSaving} className="w-full">
              {isSaving ? "Publikowanie..." : "Opublikuj"}
            </Button>
          </div>

          <div>
            <Label>Podgląd na żywo</Label>
            <div className="mt-2 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 prose prose-gray dark:prose-invert max-w-none min-h-[500px]">
              <h1>{title || "Tytuł wpisu"}</h1>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Podgląd treści pojawi się tutaj...*"}</ReactMarkdown>
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
