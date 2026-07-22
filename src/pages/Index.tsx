import type { ElementType } from "react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
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
} from "lucide-react";
import { PMCLogo } from "@/components/PMCLogo";
import { PageFooter } from "@/components/PageFooter";
import { getAllPosts } from "@/lib/blog";

interface ProjectCard {
  title: string;
  description: string;
  path: string;
  icon: ElementType;
  accent: string;
  category: "ai" | "other";
}

const projects: ProjectCard[] = [
  {
    title: "Generator Skryptów PowerShell",
    description: "Opisz co ma robić skrypt, a AI napisze go za Ciebie.",
    path: "/powershell-generator",
    icon: Terminal,
    accent: "text-sky-500 bg-sky-500/10",
    category: "ai",
  },
  {
    title: "Filozof i Coach Życiowy",
    description: "Opisz swój problem i otrzymaj głęboką poradę życiową.",
    path: "/philosopher-coach",
    icon: Brain,
    accent: "text-violet-500 bg-violet-500/10",
    category: "ai",
  },
  {
    title: "Generator Przepisów AI",
    description: "Podaj składniki, które masz w kuchni, a AI wymyśli przepis.",
    path: "/recipe-generator",
    icon: ChefHat,
    accent: "text-orange-500 bg-orange-500/10",
    category: "ai",
  },
  {
    title: "Generator Opowiadań AI",
    description: "Gatunek, postać, zdarzenie — AI napisze dla Ciebie historię.",
    path: "/story-generator",
    icon: BookOpen,
    accent: "text-pink-500 bg-pink-500/10",
    category: "ai",
  },
  {
    title: "Generator Projektów Elektronicznych",
    description: "Pomysły na projekty Arduino, Raspberry Pi i lutowanie.",
    path: "/electronic-project-generator",
    icon: CircuitBoard,
    accent: "text-emerald-500 bg-emerald-500/10",
    category: "ai",
  },
  {
    title: "Krótki Kurs AI",
    description: "Interaktywny przewodnik po podstawach sztucznej inteligencji.",
    path: "/short-ai-course",
    icon: GraduationCap,
    accent: "text-indigo-500 bg-indigo-500/10",
    category: "other",
  },
  {
    title: "Inteligentna Pogoda",
    description: "Prognoza, jakość powietrza i analiza pogodowa dla miejscowości.",
    path: "/weather-forecast-ai",
    icon: CloudSun,
    accent: "text-purple-500 bg-purple-500/10",
    category: "other",
  },
  {
    title: "Space Invaders",
    description: "Klasyczna gra arcade — pokonaj kosmicznych najeźdźców.",
    path: "/space-invaders",
    icon: Rocket,
    accent: "text-green-500 bg-green-500/10",
    category: "other",
  },
  {
    title: "Przykładowy Sklep WWW",
    description: "Demo sklepu w stylu terminala — portfolio projekt e-commerce.",
    path: "/portfolio-store",
    icon: ShoppingCart,
    accent: "text-lime-500 bg-lime-500/10",
    category: "other",
  },
];

const aiProjects = projects.filter((p) => p.category === "ai");
const otherProjects = projects.filter((p) => p.category === "other");

const MAGNIFY_RADIUS = 220;
const MAGNIFY_MAX_SCALE = 1.06;

const ProjectGrid = ({ items }: { items: ProjectCard[] }) => {
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
              Otwórz <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        );
      })}
    </div>
  );
};

const Index = () => {
  const { theme, setTheme } = useTheme();
  const [blogOpen, setBlogOpen] = useState(true);
  const posts = getAllPosts();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          aria-label="Przełącz motyw"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-16">
        <header className="flex flex-col items-center text-center mb-14">
          <PMCLogo />
          <h1 className="text-xl sm:text-2xl font-semibold mt-5 tracking-tight">Paweł Malec</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
            Portfolio: mini-projekty AI, gry i demo. Wybierz podstronę, żeby zacząć.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">
            <Sparkles className="w-4 h-4" /> Wsparte na AI
          </h2>
          <ProjectGrid items={aiProjects} />
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">
            Pozostałe projekty
          </h2>
          <ProjectGrid items={otherProjects} />
        </section>

        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <button
            onClick={() => setBlogOpen(!blogOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold">
              <Newspaper className="w-4 h-4 text-cyan-500" /> Blog
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${blogOpen ? "rotate-180" : ""}`} />
          </button>
          {blogOpen && (
            <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-800 pt-4">
              {posts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Brak wpisów jeszcze.</p>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post) => (
                    <Link key={post.slug} to={`/blog/${post.slug}`} className="block group">
                      <div className="text-xs text-gray-400 dark:text-gray-500">{post.date}</div>
                      <div className="font-medium group-hover:underline">{post.title}</div>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                to="/blog"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Zobacz wszystkie <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className="mt-16">
          <PageFooter />
        </div>
      </div>
    </div>
  );
};

export default Index;
