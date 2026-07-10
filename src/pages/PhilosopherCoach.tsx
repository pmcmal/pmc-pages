"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhilosopherLogo } from "@/components/PhilosopherLogo";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { PageFooter } from "@/components/PageFooter";

const PhilosopherCoach = () => {
  const [problem, setProblem] = useState<string>("");
  const [advice, setAdvice] = useState<string>("");
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSurpriseMeActive, setIsSurpriseMeActive] = useState<boolean>(false);

  const handleGetAdvice = async () => {
    if (!isSurpriseMeActive && !problem.trim()) {
      toast.error("Proszę opisać swój problem, aby otrzymać poradę, lub wybrać opcję 'Zaskocz mnie'.");
      return;
    }

    setIsLoading(true);
    setAdvice("");
    setDisclaimer("");

    let currentProblem = problem.trim();
    if (isSurpriseMeActive) {
      currentProblem = "losowy problem życiowy"; // Send a generic prompt for surprise me
    }

    try {
      const { data, error } = await supabase.functions.invoke('philosopher-coach', {
        body: JSON.stringify({ problem: currentProblem }),
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
    } catch (e) {
      console.error("Unexpected error:", e);
      toast.error(`Wystąpił nieoczekiwany błąd: ${e instanceof Error ? e.message : String(e)}`);
      setDisclaimer("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurpriseMeToggle = () => {
    setIsSurpriseMeActive(!isSurpriseMeActive);
    if (!isSurpriseMeActive) { // If activating surprise me, clear fields
      setProblem("");
    }
  };

  return (
    <div className="min-h-screen bg-background container mx-auto p-4 max-w-3xl">
      <SiteHomeButton />
      <Card className="w-full">
        <CardHeader>
          <PhilosopherLogo className="mb-4" /> {/* Użycie nowego komponentu logo */}
          <CardTitle className="text-2xl font-bold">Twój Filozof i Coach Życiowy</CardTitle>
          <CardDescription>Opisz swój problem, a otrzymasz głęboką poradę życiową.</CardDescription>
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
              {isSurpriseMeActive ? "AI wygeneruje poradę na losowy temat." : "Wypełnij pole lub kliknij 'Zaskocz mnie'."}
            </Label>
          </div>

          <div className="grid w-full gap-2">
            <Label htmlFor="problem">Opisz swój problem:</Label>
            <Textarea
              id="problem"
              placeholder="Np. 'Czuję się zagubiony w życiu i nie wiem, w którą stronę iść.' lub 'Mam trudności z podjęciem ważnej decyzji zawodowej.'"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={5}
              disabled={isLoading || isSurpriseMeActive}
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
      <PageFooter />
    </div>
  );
};

export default PhilosopherCoach;