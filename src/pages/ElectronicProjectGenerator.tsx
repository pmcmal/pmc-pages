"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CircuitLogo } from "@/components/CircuitLogo"; // Import nowego komponentu logo

const ElectronicProjectGenerator = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedProject, setGeneratedProject] = useState<string>("");
  const [componentsNeeded, setComponentsNeeded] = useState<string[]>([]);
  const [exampleCode, setExampleCode] = useState<string>("");
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSurpriseMeActive, setIsSurpriseMeActive] = useState<boolean>(false);

  const handleGenerateProject = async () => {
    if (!isSurpriseMeActive && !prompt.trim()) {
      toast.error("Proszę opisać swoje preferencje projektowe lub wybrać opcję 'Zaskocz mnie'.");
      return;
    }

    setIsLoading(true);
    setGeneratedProject("");
    setComponentsNeeded([]);
    setExampleCode("");
    setDisclaimer("");

    let currentPrompt = prompt.trim();
    if (isSurpriseMeActive) {
      currentPrompt = "losowy pomysł na projekt elektroniczny na Raspberry Pi, Arduino lub prosty układ do lutowania";
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-electronic-project', {
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      if (error) {
        console.error("Error invoking Edge Function:", error);
        toast.error(`Błąd podczas generowania pomysłu na projekt: ${error.message}`);
        setDisclaimer("Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.");
      } else if (data) {
        setGeneratedProject(data.projectIdea || "");
        setComponentsNeeded(data.componentsNeeded || []);
        setExampleCode(data.exampleCode || "");
        setDisclaimer(data.disclaimer || "");
        toast.success("Pomysł na projekt został wygenerowany!");
      } else {
        toast.error("Nie otrzymano odpowiedzi od generatora projektów.");
        setDisclaimer("Nie otrzymano odpowiedzi od generatora projektów.");
      }
    } catch (e: any) {
      console.error("Unexpected error:", e);
      toast.error(`Wystąpił nieoczekiwany błąd: ${e.message}`);
      setDisclaimer("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurpriseMeToggle = () => {
    setIsSurpriseMeActive(!isSurpriseMeActive);
    if (!isSurpriseMeActive) { // If activating surprise me, clear fields
      setPrompt("");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full">
        <CardHeader>
          <CircuitLogo className="mb-4" />
          <CardTitle className="text-2xl font-bold">Generator Projektów Elektronicznych AI</CardTitle>
          <CardDescription>
            Opisz swoje preferencje (np. poziom trudności, zastosowanie), a AI wygeneruje pomysł na projekt elektroniczny.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <Button
              onClick={handleSurpriseMeToggle}
              variant={isSurpriseMeActive ? "default" : "outline"}
              disabled={isLoading}
            >
              {isSurpriseMeActive ? "Wyłącz 'Zaskocz mnie'" : "Zaskocz mnie!"}
            </Button>
            <Label htmlFor="surprise-me-toggle" className="text-sm text-muted-foreground">
              {isSurpriseMeActive ? "AI wygeneruje losowy pomysł na projekt." : "Wypełnij pole lub kliknij 'Zaskocz mnie'."}
            </Label>
          </div>

          <div className="grid w-full gap-2">
            <Label htmlFor="prompt">Opisz swoje preferencje projektowe:</Label>
            <Textarea
              id="prompt"
              placeholder="Np. 'Prosty projekt na Arduino dla początkujących, do sterowania oświetleniem LED' lub 'Projekt na Raspberry Pi do monitorowania temperatury w domu'."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              disabled={isLoading || isSurpriseMeActive}
            />
            <Button onClick={handleGenerateProject} disabled={isLoading}>
              {isLoading ? "Generowanie pomysłu..." : "Generuj Pomysł na Projekt"}
            </Button>
          </div>

          {generatedProject && (
            <div className="grid w-full gap-2">
              <Label htmlFor="generated-project">Wygenerowany Pomysł na Projekt:</Label>
              <div className="relative">
                <Textarea
                  id="generated-project"
                  value={generatedProject}
                  readOnly
                  rows={10}
                  className="font-mono bg-gray-50 dark:bg-gray-900"
                />
              </div>

              {componentsNeeded.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-md text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                  <Label className="font-semibold mb-1 block">Potrzebne komponenty:</Label>
                  <ul className="list-disc pl-5">
                    {componentsNeeded.map((component, index) => (
                      <li key={index}>{component}</li>
                    ))}
                  </ul>
                </div>
              )}

              {exampleCode && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-800 dark:text-gray-200">
                  <Label className="font-semibold mb-1 block">Przykładowy kod:</Label>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                    <code>{exampleCode}</code>
                  </pre>
                </div>
              )}

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

export default ElectronicProjectGenerator;