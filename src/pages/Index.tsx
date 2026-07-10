import type { ElementType } from "react";
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
} from "lucide-react";
import { PMCLogo } from "@/components/PMCLogo";
import { PageFooter } from "@/components/PageFooter";

interface ProjectCard {
  title: string;
  description: string;
  path: string;
  icon: ElementType;
  accent: string;
}

const projects: ProjectCard[] = [
  {
    title: "Generator Skryptów PowerShell",
    description: "Opisz co ma robić skrypt, a AI napisze go za Ciebie.",
    path: "/powershell-generator",
    icon: Terminal,
    accent: "text-sky-500 bg-sky-500/10",
  },
  {
    title: "Filozof i Coach Życiowy",
    description: "Opisz swój problem i otrzymaj głęboką poradę życiową.",
    path: "/philosopher-coach",
    icon: Brain,
    accent: "text-violet-500 bg-violet-500/10",
  },
  {
    title: "Generator Przepisów AI",
    description: "Podaj składniki, które masz w kuchni, a AI wymyśli przepis.",
    path: "/recipe-generator",
    icon: ChefHat,
    accent: "text-orange-500 bg-orange-500/10",
  },
  {
    title: "Generator Opowiadań AI",
    description: "Gatunek, postać, zdarzenie — AI napisze dla Ciebie historię.",
    path: "/story-generator",
    icon: BookOpen,
    accent: "text-pink-500 bg-pink-500/10",
  },
  {
    title: "Generator Projektów Elektronicznych",
    description: "Pomysły na projekty Arduino, Raspberry Pi i lutowanie.",
    path: "/electronic-project-generator",
    icon: CircuitBoard,
    accent: "text-emerald-500 bg-emerald-500/10",
  },
  {
    title: "Krótki Kurs AI",
    description: "Interaktywny przewodnik po podstawach sztucznej inteligencji.",
    path: "/short-ai-course",
    icon: GraduationCap,
    accent: "text-indigo-500 bg-indigo-500/10",
  },
  {
    title: "Inteligentna Pogoda",
    description: "Prognoza, jakość powietrza i analiza pogodowa dla miejscowości.",
    path: "/weather-forecast-ai",
    icon: CloudSun,
    accent: "text-purple-500 bg-purple-500/10",
  },
  {
    title: "Space Invaders",
    description: "Klasyczna gra arcade — pokonaj kosmicznych najeźdźców.",
    path: "/space-invaders",
    icon: Rocket,
    accent: "text-green-500 bg-green-500/10",
  },
  {
    title: "Przykładowy Sklep WWW",
    description: "Demo sklepu w stylu terminala — portfolio projekt e-commerce.",
    path: "/portfolio-store",
    icon: ShoppingCart,
    accent: "text-lime-500 bg-lime-500/10",
  },
];

const Index = () => {
  const { theme, setTheme } = useTheme();

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
          <h1 className="text-4xl sm:text-5xl font-bold mt-6 tracking-tight">PMCmalec</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl">
            Kolekcja moich mini-projektów AI, gier i demo. Wybierz podstronę, żeby zacząć.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const Icon = project.icon;
            return (
              <Link
                key={project.path}
                to={project.path}
                className="group flex flex-col p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${project.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="font-semibold mb-1">{project.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow">
                  {project.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                  Otwórz <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-16">
          <PageFooter />
        </div>
      </div>
    </div>
  );
};

export default Index;
