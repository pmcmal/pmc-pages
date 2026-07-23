import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PMCLogo } from "@/components/PMCLogo";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <PMCLogo />
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2">{t("notFound.title")}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          {t("notFound.message")} <code className="font-mono">{location.pathname}</code>
        </p>
        <Link to="/">
          <Button>{t("notFound.backHome")}</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
