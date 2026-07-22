export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
}

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
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
  return { data, content: content.trim() };
}

const modules = import.meta.glob("/content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function getAllPosts(): BlogPost[] {
  const posts = Object.entries(modules).map(([path, raw]) => {
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    const { data, content } = parseFrontmatter(raw);
    return {
      slug,
      title: data.title || slug,
      date: data.date || "",
      excerpt: data.excerpt || "",
      content,
    };
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

// Dopisuje https:// przed golymi domenami typu "github.com/xxx" (bez protokolu),
// zeby remark-gfm mogl je auto-zlinkowac - GFM z definicji linkuje tylko URL-e
// zaczynajace sie od http(s):// albo www. Wymaga "/" po TLD, zeby nie lapac
// skrotow typu "m.in." czy "np." (nigdy nie maja ukosnika po kropce).
export function autoLinkBareDomains(text: string): string {
  return text.replace(
    /(?<!https?:\/\/)\b((?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s)"'<]+)/gi,
    (match) => `https://${match}`,
  );
}
