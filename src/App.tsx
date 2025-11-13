import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PowershellScriptGenerator from "./pages/PowershellScriptGenerator";
import PhilosopherCoach from "./pages/PhilosopherCoach";
import RecipeGenerator from "./pages/RecipeGenerator";
import StoryGenerator from "./pages/StoryGenerator";
import ElectronicProjectGenerator from "./pages/ElectronicProjectGenerator";
import ShortAICourse from "./pages/ShortAICourse";
import WeatherForecastAI from "./pages/WeatherForecastAI";
import SnakeGame from "./pages/SnakeGame"; // Import nowego komponentu

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/powershell-generator" element={<PowershellScriptGenerator />} />
            <Route path="/philosopher-coach" element={<PhilosopherCoach />} />
            <Route path="/recipe-generator" element={<RecipeGenerator />} />
            <Route path="/story-generator" element={<StoryGenerator />} />
            <Route path="/electronic-project-generator" element={<ElectronicProjectGenerator />} />
            <Route path="/short-ai-course" element={<ShortAICourse />} />
            <Route path="/weather-forecast-ai" element={<WeatherForecastAI />} />
            <Route path="/snake-game" element={<SnakeGame />} /> {/* Nowa trasa */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;