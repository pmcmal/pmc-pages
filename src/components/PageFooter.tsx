import { useTranslation } from "react-i18next";

export const PageFooter = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center mt-8 text-gray-600 dark:text-gray-400 text-sm space-y-1">
      <div>
        {t("footer.createdBy")} ·{" "}
        <a
          href="https://pl.linkedin.com/in/pmcmalec"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
        >
          LinkedIn
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/pmcmal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
        >
          GitHub
        </a>
      </div>
      <div>
        {t("footer.support")}{" "}
        <a
          href="https://tipped.pl/pmcmalec"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
        >
          tipped.pl/pmcmalec
        </a>
      </div>
    </div>
  );
};
