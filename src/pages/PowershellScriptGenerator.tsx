"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PSSLogo } from "@/components/PSSLogo"; // Import nowego komponentu logo

const PowershellScriptGenerator = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [explanationText, setExplanationText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerateScript = async () => {
    if (!prompt.trim()) {
      toast.error("Proszę opisać, jaki skrypt PowerShell potrzebujesz.");
      return;
    }

    setIsLoading(true);
    setGeneratedScript("");
    setExplanationText("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-powershell-script', {
        body: JSON.stringify({ prompt }),
      });

      if (error) {
        console.error("Error invoking Edge Function:", error);
        toast.error(`Błąd podczas generowania skryptu: ${error.message}`);
        setExplanationText("Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.");
      } else if (data) {
        // Assuming data is already parsed JSON from the Edge Function
        setGeneratedScript(data.script || "");
        setExplanationText(data.explanation || "");
        toast.success("Skrypt PowerShell został wygenerowany!");
      } else {
        toast.error("Nie otrzymano odpowiedzi od generatora skryptów.");
        setExplanationText("Nie otrzymano odpowiedzi od generatora skryptów.");
      }
    } catch (e: any) {
      console.error("Unexpected error:", e);
      toast.error(`Wystąpił nieoczekiwany błąd: ${e.message}`);
      setExplanationText("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyScript = () => {
    if (generatedScript) {
      navigator.clipboard.writeText(generatedScript);
      toast.info("Skrypt został skopiowany do schowka!");
    } else {
      toast.error("Brak skryptu do skopiowania.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full">
        <CardHeader>
          <PSSLogo className="mb-4" /> {/* Dodanie logo PSS tutaj */}
          <CardTitle className="text-2xl font-bold">Generator Skryptów PowerShell</CardTitle>
          <CardDescription>Prosty, bez żadnych reklam szybki dla Ciebie ode mnie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full gap-2">
            <Label htmlFor="prompt">Opisz swój skrypt:</Label>
            <Textarea
              id="prompt"
              placeholder="Np. 'Skrypt do listowania wszystkich procesów z użyciem CPU powyżej 10%' lub 'Skrypt do tworzenia nowego pliku tekstowego w C:\temp'."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
            <Button onClick={handleGenerateScript} disabled={isLoading}>
              {isLoading ? "Generowanie..." : "Generuj Skrypt"}
            </Button>
          </div>

          {generatedScript && (
            <div className="grid w-full gap-2">
              {explanationText && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-700 rounded-md text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                  <Label className="font-semibold mb-1 block">Ważne informacje:</Label>
                  {explanationText}
                </div>
              )}
              <Label htmlFor="generated-script">Wygenerowany Skrypt PowerShell:</Label>
              <div className="relative">
                <Textarea
                  id="generated-script"
                  value={generatedScript}
                  readOnly
                  rows={10}
                  className="font-mono bg-gray-50 dark:bg-gray-900"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopyScript}
                >
                  Kopiuj
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="text-center mt-8 text-gray-600 dark:text-gray-400 text-sm">
        Stworzył Paweł Malec i link jeśli chcesz mnie wesprzeć i przydało Ci się narzędzie:{" "}
        <a href="https://tipped.pl/pmcmalec" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">
          https://tipped.pl/pmcmalec
        </a>
      </div>
    </div>
  );
};

export default PowershellScriptGenerator;