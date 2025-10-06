import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PMCLogo } from "@/components/PMCLogo";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-4">PMCmalec</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
          Wybierz jedną z moich podstron aby przejść dalej
        </p>
        <div className="flex flex-col space-y-4">
          <Link to="/powershell-generator">
            <Button className="px-6 py-3 text-lg w-full">
              Przejdź do Generatora Skryptów PowerShell
            </Button>
          </Link>
          <Link to="/philosopher-coach">
            <Button className="px-6 py-3 text-lg w-full">
              Uzyskaj Poradę od Filozofa/Coacha
            </Button>
          </Link>
          <Link to="/recipe-generator">
            <Button className="px-6 py-3 text-lg w-full">
              Wygeneruj Przepis Kulinarny
            </Button>
          </Link>
          <Link to="/logo-generator">
            <Button className="px-6 py-3 text-lg w-full">
              Wygeneruj Logo
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <PMCLogo />
      </div>
    </div>
  );
};

export default Index;