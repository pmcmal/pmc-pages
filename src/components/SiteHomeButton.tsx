import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home } from "lucide-react";

// Przycisk byl wczesniej na stale polprzezroczysta czarna pastylka, wiec na
// jasnym motywie odcinal sie jak naklejka z innej strony. Teraz uzywa tych
// samych kolorow co pozostale kontrolki i zmienia sie razem z motywem.
export const SiteHomeButton = () => {
  const { t } = useTranslation();
  const label = t("index.allProjects");

  return (
    <Link
      to="/"
      aria-label={label}
      title={label}
      className="fixed top-4 left-4 z-[100] flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 backdrop-blur-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm print:hidden"
    >
      <Home className="w-4 h-4" />
    </Link>
  );
};
