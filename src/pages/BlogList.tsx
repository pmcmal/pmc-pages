import { Link } from "react-router-dom";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { PageFooter } from "@/components/PageFooter";
import { getAllPosts } from "@/lib/blog";

const BlogList = () => {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SiteHomeButton />
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Blog</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Notatki o projektach i rzeczach, które robię poza tymi podstronami.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Brak wpisów jeszcze.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="block p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all"
              >
                <div className="text-sm text-gray-400 dark:text-gray-500 mb-1">{post.date}</div>
                <h2 className="text-xl font-semibold mb-1">{post.title}</h2>
                <p className="text-gray-500 dark:text-gray-400">{post.excerpt}</p>
              </Link>
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
