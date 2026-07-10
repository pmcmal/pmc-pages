import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { PageFooter } from "@/components/PageFooter";
import { getPostBySlug } from "@/lib/blog";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <SiteHomeButton />
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Nie znaleziono wpisu</h1>
          <Link to="/blog">
            <Button>Wróć do bloga</Button>
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
          ← Blog
        </Link>

        <article className="mt-6">
          <div className="text-sm text-gray-400 dark:text-gray-500 mb-2">{post.date}</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">{post.title}</h1>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
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
