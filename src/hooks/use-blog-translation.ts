import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface TranslatableFields {
  title: string;
  excerpt: string;
  content: string;
}

// Tlumaczy pola wpisu, gdy jezyk strony to EN.
// Jesli tlumaczenie zostalo juz kiedys wygenerowane i zacommitowane do repo
// (staticTranslation, wczytane statycznie z bundla), uzywamy go od razu - zero
// czekania. W przeciwnym razie wolamy edge function na zywo (i ona sama zapisze
// wynik do repo, zeby kolejni odwiedzajacy dostali juz gotowa, statyczna wersje).
const cache = new Map<string, TranslatableFields>();

export function useTranslatedBlogFields(slug: string, fields: TranslatableFields, staticTranslation?: TranslatableFields) {
  const { i18n } = useTranslation();
  const [translated, setTranslated] = useState<TranslatableFields | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (i18n.language !== "en") {
      setTranslated(null);
      return;
    }

    if (staticTranslation) {
      setTranslated(staticTranslation);
      return;
    }

    const cacheKey = `en:${slug}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setTranslated(cached);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);
    import("@/integrations/supabase/client")
      .then(({ supabase }) => supabase.functions.invoke("translate-blog-post", { body: { slug } }))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || data?.error) {
          console.error("Blog translation failed:", error || data?.error);
          return;
        }
        cache.set(cacheKey, data);
        setTranslated(data);
      })
      .finally(() => {
        if (!cancelled) setIsTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language, slug, staticTranslation]);

  return {
    title: translated?.title ?? fields.title,
    excerpt: translated?.excerpt ?? fields.excerpt,
    content: translated?.content ?? fields.content,
    isTranslating,
  };
}
