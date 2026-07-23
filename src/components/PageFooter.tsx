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
          className="text-blue-500 hover:text-blue-700 underline"
        >
          LinkedIn
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/pmcmal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline"
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
          className="text-blue-500 hover:text-blue-700 underline"
        >
          tipped.pl/pmcmalec
        </a>
      </div>
    </div>
  );
};
