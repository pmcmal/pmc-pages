import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PMCLogo } from "@/components/PMCLogo";
import { useTheme } from "next-themes"; // Import useTheme
import { Moon, Sun } from "lucide-react"; // Import ikon słońca i księżyca

const Index = () => {
  const { theme, setTheme } = useTheme(); // Użycie hooka useTheme

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="absolute top-4 right-4"> {/* Przycisk do przełączania motywu */}
        <Button variant="outline" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
      <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">PMCmalec</h1>
        <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 mb-6">
          Wybierz jedną z moich podstron aby przejść dalej
        </p>
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <Link to="/powershell-generator">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Przejdź do Generatora Skryptów PowerShell
            </Button>
          </Link>
          <Link to="/philosopher-coach">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Uzyskaj Poradę od Filozofa/Coacha
            </Button>
          </Link>
          <Link to="/recipe-generator">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Wygeneruj Przepis Kulinarny
            </Button>
          </Link>
          <Link to="/story-generator">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Wygeneruj Opowiadanie
            </Button>
          </Link>
          <Link to="/electronic-project-generator">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Wygeneruj Pomysł na Projekt Elektroniczny
            </Button>
          </Link>
          <Link to="/short-ai-course">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Krótki Kurs AI
            </Button>
          </Link>
          <Link to="/weather-forecast-ai">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Prognoza Pogody AI
            </Button>
          </Link>
          <Link to="/space-invaders">
            <Button className="px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg w-full">
              Gra w Space Invaders
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-8 flex flex-col items-center">
        <PMCLogo />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Powered by Paweł Malec ®
        </p>
      </div>
    </div>
  );
};

export default Index;