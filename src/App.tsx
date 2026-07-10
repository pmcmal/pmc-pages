import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const PowershellScriptGenerator = lazy(() => import("./pages/PowershellScriptGenerator"));
const PhilosopherCoach = lazy(() => import("./pages/PhilosopherCoach"));
const RecipeGenerator = lazy(() => import("./pages/RecipeGenerator"));
const StoryGenerator = lazy(() => import("./pages/StoryGenerator"));
const ElectronicProjectGenerator = lazy(() => import("./pages/ElectronicProjectGenerator"));
const ShortAICourse = lazy(() => import("./pages/ShortAICourse"));
const WeatherForecastAI = lazy(() => import("./pages/WeatherForecastAI"));
const SpaceInvaders = lazy(() => import("./pages/SpaceInvaders"));
const PortfolioStore = lazy(() => import("./pages/PortfolioStore"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/powershell-generator" element={<PowershellScriptGenerator />} />
              <Route path="/philosopher-coach" element={<PhilosopherCoach />} />
              <Route path="/recipe-generator" element={<RecipeGenerator />} />
              <Route path="/story-generator" element={<StoryGenerator />} />
              <Route path="/electronic-project-generator" element={<ElectronicProjectGenerator />} />
              <Route path="/short-ai-course" element={<ShortAICourse />} />
              <Route path="/weather-forecast-ai" element={<WeatherForecastAI />} />
              <Route path="/space-invaders" element={<SpaceInvaders />} />
              <Route path="/portfolio-store" element={<PortfolioStore />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/admin" element={<Admin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;