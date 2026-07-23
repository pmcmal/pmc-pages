import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { PageFooter } from "@/components/PageFooter";
import { getAllPosts, getPostTranslation, type BlogPost } from "@/lib/blog";
import { useTranslatedBlogFields } from "@/hooks/use-blog-translation";

const BlogListItem = ({ post }: { post: BlogPost }) => {
  const { title, excerpt, isTranslating } = useTranslatedBlogFields(
    post.slug,
    { title: post.title, excerpt: post.excerpt, content: "" },
    getPostTranslation(post.slug),
  );

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all"
    >
      <div className="text-sm text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5">
        {post.date}
        {isTranslating && (
          <span className="inline-block w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400">{excerpt}</p>
    </Link>
  );
};

const BlogList = () => {
  const { t } = useTranslation();
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SiteHomeButton />
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("blog.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{t("blog.subtitle")}</p>
        </header>

        {posts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t("blog.empty")}</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <BlogListItem key={post.slug} post={post} />
            ))}
          </div>
        )}

        <div className="mt-16">
          <PageFooter />
        </div>
      </div>
    </div>
  );
};

export default BlogList;
