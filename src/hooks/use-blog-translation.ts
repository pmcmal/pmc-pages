import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface TranslatableFields {
  title: string;
  excerpt: string;
  content: string;
}

// Tlumaczy pola wpisu na zywo przez OpenRouter, gdy jezyk strony to EN.
// Cache w pamieci (per slug+jezyk) zapobiega ponownemu tlumaczeniu tego samego
// posta przy kazdym przejsciu miedzy stronami w tej samej sesji.
const cache = new Map<string, TranslatableFields>();

export function useTranslatedBlogFields(key: string, fields: TranslatableFields) {
  const { i18n } = useTranslation();
  const [translated, setTranslated] = useState<TranslatableFields | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    if (i18n.language !== "en") {
      setTranslated(null);
      return;
    }

    const cacheKey = `en:${key}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setTranslated(cached);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);
    import("@/integrations/supabase/client")
      .then(({ supabase }) => supabase.functions.invoke("translate-blog-post", { body: fieldsRef.current }))
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
  }, [i18n.language, key]);

  return {
    title: translated?.title ?? fields.title,
    excerpt: translated?.excerpt ?? fields.excerpt,
    content: translated?.content ?? fields.content,
    isTranslating,
  };
}
