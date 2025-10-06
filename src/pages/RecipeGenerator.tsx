"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChefLogo } from "@/components/ChefLogo"; // Import nowego komponentu logo

const RecipeGenerator = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedRecipe, setGeneratedRecipe] = useState<string>("");
  const [conversionTable, setConversionTable] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerateRecipe = async () => {
    if (!prompt.trim()) {
      toast.error("Proszę opisać, jakie danie chcesz przygotować.");
      return;
    }

    setIsLoading(true);
    setGeneratedRecipe("");
    setConversionTable("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: JSON.stringify({ prompt }),
      });

      if (error) {
        console.error("Error invoking Edge Function:", error);
        toast.error(`Błąd podczas generowania przepisu: ${error.message}`);
        setConversionTable("Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.");
      } else if (data) {
        setGeneratedRecipe(data.recipeText || "");
        setConversionTable(data.conversionTable || "");
        toast.success("Przepis został wygenerowany!");
      } else {
        toast.error("Nie otrzymano odpowiedzi od generatora przepisów.");
        setConversionTable("Nie otrzymano odpowiedzi od generatora przepisów.");
      }
    } catch (e: any) {
      console.error("Unexpected error:", e);
      toast.error(`Wystąpił nieoczekiwany błąd: ${e.message}`);
      setConversionTable("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full">
        <CardHeader>
          <ChefLogo className="mb-4" />
          <CardTitle className="text-2xl font-bold">Generator Przepisów AI</CardTitle>
          <CardDescription>
            Opisz, jakie danie chcesz przygotować, a my wygenerujemy dla Ciebie szybki i prosty przepis wraz z przelicznikami.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full gap-2">
            <Label htmlFor="prompt">Opisz danie:</Label>
            <Textarea
              id="prompt"
              placeholder="Np. 'Szybki obiad wegetariański dla jednej osoby' lub 'Prosta pasta z kurczakiem'."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
            <Button onClick={handleGenerateRecipe} disabled={isLoading}>
              {isLoading ? "Generowanie przepisu..." : "Generuj Przepis"}
            </Button>
          </div>

          {generatedRecipe && (
            <div className="grid w-full gap-2">
              <Label htmlFor="generated-recipe">Wygenerowany Przepis:</Label>
              <div className="relative">
                <Textarea
                  id="generated-recipe"
                  value={generatedRecipe}
                  readOnly
                  rows={15}
                  className="font-mono bg-gray-50 dark:bg-gray-900"
                />
              </div>

              {conversionTable && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-700 rounded-md text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                  <Label className="font-semibold mb-1 block">Przeliczniki:</Label>
                  {conversionTable}
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

export default RecipeGenerator;