import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Languages, Moon, Sun } from "lucide-react";

// Przelaczniki motywu i jezyka siedzialy wczesniej tylko na stronie glownej,
// wiec po wejsciu w dowolny generator uzytkownik tracil nad nimi kontrole.
// Jeden komponent trzyma je w tym samym miejscu i w tym samym stylu na kazdej
// podstronie.
export const SiteControls = () => {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  return (
    <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 print:hidden">
      <button
        onClick={() => i18n.changeLanguage(i18n.language === "pl" ? "en" : "pl")}
        aria-label={t("index.langToggle")}
        title={t("index.langToggle")}
        className="flex items-center justify-center gap-1 h-10 px-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-semibold uppercase"
      >
        <Languages className="h-4 w-4" /> {i18n.language === "pl" ? "PL" : "EN"}
      </button>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={t("index.themeToggle")}
        title={t("index.themeToggle")}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
};
