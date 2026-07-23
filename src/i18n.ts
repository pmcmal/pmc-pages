import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  pl: {
    translation: {
      index: {
        name: "Paweł Malec",
        subtitle: "Portfolio: mini-projekty, blog, eksperymenty. Wybierz kafelek, zobacz bloga i GitHuba, LinkedIna na dole strony.",
        sectionAi: "Wsparte na AI",
        sectionOther: "Pozostałe projekty",
        open: "Otwórz",
        themeToggle: "Przełącz motyw",
        langToggle: "Zmień język",
      },
      blogBar: {
        title: "Blog",
        empty: "Brak wpisów jeszcze.",
        seeAll: "Zobacz wszystkie",
      },
      projects: {
        powershell: { title: "Generator Skryptów PowerShell", description: "Opisz co ma robić skrypt, a AI napisze go za Ciebie." },
        philosopher: { title: "Filozof i Coach Życiowy", description: "Opisz swój problem i otrzymaj głęboką poradę życiową." },
        recipe: { title: "Generator Przepisów AI", description: "Podaj składniki, które masz w kuchni, a AI wymyśli przepis." },
        story: { title: "Generator Opowiadań AI", description: "Gatunek, postać, zdarzenie — AI napisze dla Ciebie historię." },
        electronics: { title: "Generator Projektów Elektronicznych", description: "Pomysły na projekty Arduino, Raspberry Pi i lutowanie." },
        aiCourse: { title: "Krótki Kurs AI", description: "Interaktywny przewodnik po podstawach sztucznej inteligencji." },
        weather: { title: "Inteligentna Pogoda", description: "Prognoza, jakość powietrza i analiza pogodowa dla miejscowości." },
        spaceInvaders: { title: "Space Invaders", description: "Klasyczna gra arcade — pokonaj kosmicznych najeźdźców." },
        store: { title: "Przykładowy Sklep WWW", description: "Demo sklepu w stylu terminala — portfolio projekt e-commerce." },
      },
      footer: {
        createdBy: "Stworzył Paweł Malec ®",
        support: "Jeśli chcesz mnie wesprzeć",
      },
      notFound: {
        title: "404",
        message: "Nie znaleziono tej podstrony:",
        backHome: "Wróć do strony głównej",
      },
      blog: {
        title: "Blog",
        subtitle: "Notatki o projektach i rzeczach, które robię poza tymi podstronami.",
        empty: "Brak wpisów jeszcze.",
        notFoundTitle: "Nie znaleziono wpisu",
        backToBlog: "Wróć do bloga",
        backLink: "← Blog",
      },
    },
  },
  en: {
    translation: {
      index: {
        name: "Paweł Malec",
        subtitle: "Portfolio: mini-projects, blog, experiments. Pick a tile, check out the blog, GitHub and LinkedIn at the bottom of the page.",
        sectionAi: "AI-powered",
        sectionOther: "Other projects",
        open: "Open",
        themeToggle: "Toggle theme",
        langToggle: "Change language",
      },
      blogBar: {
        title: "Blog",
        empty: "No posts yet.",
        seeAll: "See all",
      },
      projects: {
        powershell: { title: "PowerShell Script Generator", description: "Describe what the script should do, and AI writes it for you." },
        philosopher: { title: "Philosopher & Life Coach", description: "Describe your problem and get deep life advice." },
        recipe: { title: "AI Recipe Generator", description: "List what you have in the kitchen, and AI comes up with a recipe." },
        story: { title: "AI Story Generator", description: "Genre, character, event — AI writes a story for you." },
        electronics: { title: "Electronics Project Generator", description: "Ideas for Arduino, Raspberry Pi and soldering projects." },
        aiCourse: { title: "Short AI Course", description: "An interactive guide to the basics of artificial intelligence." },
        weather: { title: "Smart Weather", description: "Forecast, air quality and weather analysis for any location." },
        spaceInvaders: { title: "Space Invaders", description: "Classic arcade game — defeat the space invaders." },
        store: { title: "Sample Web Store", description: "Terminal-styled store demo — an e-commerce portfolio project." },
      },
      footer: {
        createdBy: "Built by Paweł Malec ®",
        support: "If you'd like to support me",
      },
      notFound: {
        title: "404",
        message: "This page wasn't found:",
        backHome: "Back to home",
      },
      blog: {
        title: "Blog",
        subtitle: "Notes on projects and things I do outside of these mini-apps.",
        empty: "No posts yet.",
        notFoundTitle: "Post not found",
        backToBlog: "Back to blog",
        backLink: "← Blog",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pl",
    supportedLngs: ["pl", "en"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pmc-lang",
    },
  });

export default i18n;
