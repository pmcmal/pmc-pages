import type { ElementType } from "react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
  Moon,
  Sun,
  Terminal,
  Brain,
  ChefHat,
  BookOpen,
  CircuitBoard,
  GraduationCap,
  CloudSun,
  Rocket,
  ShoppingCart,
  ArrowRight,
  Newspaper,
  ChevronDown,
  Sparkles,
  Languages,
} from "lucide-react";
import { PMCLogo } from "@/components/PMCLogo";
import { PageFooter } from "@/components/PageFooter";
import { getAllPosts, getPostTranslation, type BlogPost } from "@/lib/blog";
import { useTranslatedBlogFields } from "@/hooks/use-blog-translation";

const BlogBarItem = ({ post }: { post: BlogPost }) => {
  const { title, isTranslating } = useTranslatedBlogFields(
    post.slug,
    { title: post.title, excerpt: "", content: "" },
    getPostTranslation(post.slug),
  );
  return (
    <Link to={`/blog/${post.slug}`} className="block group">
      <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
        {post.date}
        {isTranslating && (
          <span className="inline-block w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      <div className="font-medium group-hover:underline">{title}</div>
    </Link>
  );
};

interface ProjectMeta {
  key: string;
  path: string;
  icon: ElementType;
  accent: string;
  category: "ai" | "other";
}

interface ProjectCard {
  title: string;
  description: string;
  path: string;
  icon: ElementType;
  accent: string;
  category: "ai" | "other";
}

const projectsMeta: ProjectMeta[] = [
  { key: "powershell", path: "/powershell-generator", icon: Terminal, accent: "text-sky-500 bg-sky-500/10", category: "ai" },
  { key: "philosopher", path: "/philosopher-coach", icon: Brain, accent: "text-violet-500 bg-violet-500/10", category: "ai" },
  { key: "recipe", path: "/recipe-generator", icon: ChefHat, accent: "text-orange-500 bg-orange-500/10", category: "ai" },
  { key: "story", path: "/story-generator", icon: BookOpen, accent: "text-pink-500 bg-pink-500/10", category: "ai" },
  { key: "electronics", path: "/electronic-project-generator", icon: CircuitBoard, accent: "text-emerald-500 bg-emerald-500/10", category: "ai" },
  { key: "aiCourse", path: "/short-ai-course", icon: GraduationCap, accent: "text-indigo-500 bg-indigo-500/10", category: "other" },
  { key: "weather", path: "/weather-forecast-ai", icon: CloudSun, accent: "text-purple-500 bg-purple-500/10", category: "other" },
  { key: "spaceInvaders", path: "/space-invaders", icon: Rocket, accent: "text-green-500 bg-green-500/10", category: "other" },
  { key: "store", path: "/portfolio-store", icon: ShoppingCart, accent: "text-lime-500 bg-lime-500/10", category: "other" },
];

const MAGNIFY_RADIUS = 220;
const MAGNIFY_MAX_SCALE = 1.06;

const ProjectGrid = ({ items, openLabel }: { items: ProjectCard[]; openLabel: string }) => {
  const cardRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const getScale = (path: string) => {
    if (!mousePos) return 1;
    const el = cardRefs.current[path];
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(mousePos.x - cx, mousePos.y - cy);
    if (dist > MAGNIFY_RADIUS) return 1;
    const t = 1 - dist / MAGNIFY_RADIUS;
    return 1 + t * (MAGNIFY_MAX_SCALE - 1);
  };

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos(null)}
    >
      {items.map((project) => {
        const Icon = project.icon;
        return (
          <Link
            key={project.path}
            ref={(el) => {
              cardRefs.current[project.path] = el;
            }}
            to={project.path}
            style={{ transform: `scale(${getScale(project.path)})`, transition: "transform 150ms ease-out" }}
            className="group flex flex-col p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md will-change-transform"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${project.accent}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="font-semibold mb-1">{project.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow">{project.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              {openLabel} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        );
      })}
    </div>
  );
};

const Index = () => {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [blogOpen, setBlogOpen] = useState(true);
  const posts = getAllPosts();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "pl" ? "en" : "pl");
  };

  const projects: ProjectCard[] = projectsMeta.map((p) => ({
    ...p,
    title: t(`projects.${p.key}.title`),
    description: t(`projects.${p.key}.description`),
  }));
  const aiProjects = projects.filter((p) => p.category === "ai");
  const otherProjects = projects.filter((p) => p.category === "other");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          aria-label={t("index.langToggle")}
          title={t("index.langToggle")}
          className="flex items-center justify-center gap-1 h-10 px-3 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-semibold uppercase"
        >
          <Languages className="h-4 w-4" /> {i18n.language === "pl" ? "PL" : "EN"}
        </button>
        <button
          onClick={toggleTheme}
          aria-label={t("index.themeToggle")}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-16">
        <header className="flex flex-col items-center text-center mb-14">
          <PMCLogo />
          <h1 className="text-xl sm:text-2xl font-semibold mt-5 tracking-tight">{t("index.name")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl">{t("index.subtitle")}</p>
        </header>

        <div className="mb-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <button
            onClick={() => setBlogOpen(!blogOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold">
              <Newspaper className="w-4 h-4 text-cyan-500" /> {t("blogBar.title")}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${blogOpen ? "rotate-180" : ""}`} />
          </button>
          {blogOpen && (
            <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-800 pt-4">
              {posts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("blogBar.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 3).map((post) => (
                    <BlogBarItem key={post.slug} post={post} />
                  ))}
                </div>
              )}
              <Link
                to="/blog"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {t("blogBar.seeAll")} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">
            <Sparkles className="w-4 h-4" /> {t("index.sectionAi")}
          </h2>
          <ProjectGrid items={aiProjects} openLabel={t("index.open")} />
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">
            {t("index.sectionOther")}
          </h2>
          <ProjectGrid items={otherProjects} openLabel={t("index.open")} />
        </section>

        <div className="mt-16">
          <PageFooter />
        </div>
      </div>
    </div>
  );
};

export default Index;
