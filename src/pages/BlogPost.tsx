import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { PageFooter } from "@/components/PageFooter";
import { getPostBySlug, getPostTranslation, autoLinkBareDomains } from "@/lib/blog";
import { useTranslatedBlogFields } from "@/hooks/use-blog-translation";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;
  const { t } = useTranslation();
  const { title, content, isTranslating } = useTranslatedBlogFields(
    slug ?? "",
    post ? { title: post.title, excerpt: post.excerpt, content: post.content } : { title: "", excerpt: "", content: "" },
    slug ? getPostTranslation(slug) : undefined,
  );

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <SiteHomeButton />
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("blog.notFoundTitle")}</h1>
          <Link to="/blog">
            <Button>{t("blog.backToBlog")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SiteHomeButton />
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Link to="/blog" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
          {t("blog.backLink")}
        </Link>

        <article className="mt-6">
          {isTranslating && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Translating this post to English (can take up to ~20s the first time)…
            </div>
          )}
          <div className="text-sm text-gray-400 dark:text-gray-500 mb-2">{post.date}</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">{title}</h1>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {autoLinkBareDomains(content)}
            </ReactMarkdown>
          </div>
        </article>

        <div className="mt-16">
          <PageFooter />
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
