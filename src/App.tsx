import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PowershellScriptGenerator from "./pages/PowershellScriptGenerator";
import PhilosopherCoach from "./pages/PhilosopherCoach";
import RecipeGenerator from "./pages/RecipeGenerator";
// import LogoGenerator from "./pages/LogoGenerator"; // Usunięto import

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/powershell-generator" element={<PowershellScriptGenerator />} />
          <Route path="/philosopher-coach" element={<PhilosopherCoach />} />
          <Route path="/recipe-generator" element={<RecipeGenerator />} />
          {/* <Route path="/logo-generator" element={<LogoGenerator />} /> Usunięto trasę */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;