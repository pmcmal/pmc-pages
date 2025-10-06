"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogoGeneratorLogo } from "@/components/LogoGeneratorLogo"; // Import nowego komponentu logo

const LogoGenerator = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerateLogo = async () => {
    if (!prompt.trim()) {
      toast.error("Proszę opisać, jakie logo potrzebujesz.");
      return;
    }

    setIsLoading(true);
    setGeneratedImageUrl("");
    setDisclaimer("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: JSON.stringify({ prompt }),
      });

      if (error) {
        console.error("Error invoking Edge Function:", error);
        toast.error(`Błąd podczas generowania logo: ${error.message}`);
        setDisclaimer("Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.");
      } else if (data) {
        setGeneratedImageUrl(data.imageUrl || "");
        setDisclaimer(data.disclaimer || "");
        toast.success("Logo zostało wygenerowane!");
      } else {
        toast.error("Nie otrzymano odpowiedzi od generatora logo.");
        setDisclaimer("Nie otrzymano odpowiedzi od generatora logo.");
      }
    } catch (e: any) {
      console.error("Unexpected error:", e);
      toast.error(`Wystąpił nieoczekiwany błąd: ${e.message}`);
      setDisclaimer("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (generatedImageUrl) {
      const link = document.createElement('a');
      link.href = generatedImageUrl;
      link.download = 'generated_logo.png'; // Możesz dostosować nazwę pliku
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.info("Logo zostało pobrane!");
    } else {
      toast.error("Brak logo do pobrania.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full">
        <CardHeader>
          <LogoGeneratorLogo className="mb-4" />
          <CardTitle className="text-2xl font-bold">Generator Logo AI</CardTitle>
          <CardDescription>
            Opisz swoje wymarzone logo, a my wygenerujemy dla Ciebie jego obraz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full gap-2">
            <Label htmlFor="prompt">Opisz logo:</Label>
            <Textarea
              id="prompt"
              placeholder="Np. 'Minimalistyczne logo dla firmy technologicznej z literą A w odcieniach niebieskiego' lub 'Logo dla kawiarni z motywem ziarna kawy i uśmiechniętej buźki, w stylu kreskówkowym'."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
            <Button onClick={handleGenerateLogo} disabled={isLoading}>
              {isLoading ? "Generowanie logo..." : "Generuj Logo"}
            </Button>
          </div>

          {generatedImageUrl && (
            <div className="grid w-full gap-2">
              <Label htmlFor="generated-logo-image">Wygenerowane Logo:</Label>
              <div className="relative flex justify-center items-center p-4 border border-input rounded-md bg-gray-50 dark:bg-gray-900 min-h-[200px]">
                <img
                  id="generated-logo-image"
                  src={generatedImageUrl}
                  alt="Wygenerowane Logo"
                  className="max-w-full max-h-[300px] object-contain"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={handleDownloadImage}
              >
                Pobierz Logo
              </Button>

              {disclaimer && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-md text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                  <Label className="font-semibold mb-1 block">Ważne:</Label>
                  {disclaimer}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="text-center mt-8 text-gray-600 dark:text-gray-400 text-sm">
        Stworzył Paweł Malec ® | Jeśli chcesz mnie wesprzeć{" "}
        <a href="https://tipped.pl/pmcmalec" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">
          https://tipped.pl/pmcmalec
        </a>
      </div>
    </div>
  );
};

export default LogoGenerator;