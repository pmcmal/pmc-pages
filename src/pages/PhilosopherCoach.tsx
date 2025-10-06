"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhilosopherLogo } from "@/components/PhilosopherLogo"; // Import nowego komponentu logo

const PhilosopherCoach = () => {
  const [problem, setProblem] = useState<string>("");
  const [advice, setAdvice] = useState<string>("");
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGetAdvice = async () => {
    if (!problem.trim()) {
      toast.error("Proszę opisać swój problem, aby otrzymać poradę.");
      return;
    }

    setIsLoading(true);
    setAdvice("");
    setDisclaimer("");

    try {
      const { data, error } = await supabase.functions.invoke('philosopher-coach', {
        body: JSON.stringify({ problem }),
      });

      if (error) {
        console.error("Error invoking Edge Function:", error);
        toast.error(`Błąd podczas uzyskiwania porady: ${error.message}`);
        setDisclaimer("Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.");
      } else if (data) {
        setAdvice(data.advice || "");
        setDisclaimer(data.disclaimer || "");
        toast.success("Porada została wygenerowana!");
      } else {
        toast.error("Nie otrzymano odpowiedzi od filozofa/coacha.");
        setDisclaimer("Nie otrzymano odpowiedzi od filozofa/coacha.");
      }
    } catch (e: any) {
      console.error("Unexpected error:", e);
      toast.error(`Wystąpił nieoczekiwany błąd: ${e.message}`);
      setDisclaimer("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full">
        <CardHeader>
          <PhilosopherLogo className="mb-4" /> {/* Użycie nowego komponentu logo */}
          <CardTitle className="text-2xl font-bold">Twój Filozof i Coach Życiowy</CardTitle>
          <CardDescription>Opisz swój problem, a otrzymasz głęboką poradę życiową.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full gap-2">
            <Label htmlFor="problem">Opisz swój problem:</Label>
            <Textarea
              id="problem"
              placeholder="Np. 'Czuję się zagubiony w życiu i nie wiem, w którą stronę iść.' lub 'Mam trudności z podjęciem ważnej decyzji zawodowej.'"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
            <Button onClick={handleGetAdvice} disabled={isLoading}>
              {isLoading ? "Generowanie porady..." : "Uzyskaj Poradę"}
            </Button>
          </div>

          {advice && (
            <div className="grid w-full gap-2">
              <Label htmlFor="advice">Porada od Filozofa/Coacha:</Label>
              <div className="relative">
                <Textarea
                  id="advice"
                  value={advice}
                  readOnly
                  rows={10}
                  className="font-mono bg-gray-50 dark:bg-gray-900"
                />
              </div>
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

export default PhilosopherCoach;