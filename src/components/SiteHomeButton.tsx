import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export const SiteHomeButton = () => (
  <Link
    to="/"
    aria-label="Wszystkie projekty"
    title="Wszystkie projekty"
    className="fixed top-4 left-4 z-[100] flex items-center justify-center w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md transition-colors shadow-lg"
  >
    <Home className="w-4 h-4" />
  </Link>
);
