"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StorytellerLogo } from "@/components/StorytellerLogo";

const StoryGenerator = () => {
  const [genre, setGenre] = useState<string>("");
  const [character, setCharacter] = useState<string>("");
  const [event, setEvent] = useState<string>("");
  const [generatedStory, setGeneratedStory] = useState<string>("");
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSurpriseMeActive, setIsSurpriseMeActive] = useState<boolean>(false);

  const handleGenerateStory = async () => {
    if (!isSurpriseMeActive && (!genre.trim() || !character.trim() || !event.trim())) {
      toast.error("Proszę wypełnić wszystkie pola lub wybrać opcję 'Zaskocz mnie'.");
      return;
    }

    setIsLoading(true);
    setGeneratedStory("");
    setDisclaimer("");

    let currentGenre = genre.trim();
    let currentCharacter = character.trim();
    let currentEvent = event.trim();

    if (isSurpriseMeActive) {
      currentGenre = "losowy gatunek";
      currentCharacter = "losowa postać";
      currentEvent = "losowe zdarzenie";
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-story', {
        body: JSON.stringify({ genre: currentGenre, character: currentCharacter, event: currentEvent }),
      });

      if (error) {
        console.error("Error invoking Edge Function:", error);
        toast.error(`Błąd podczas generowania opowiadania: ${error.message}`);
        setDisclaimer("Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.");
      } else if (data) {
        setGeneratedStory(data.story || "");
        setDisclaimer(data.disclaimer || "");
        toast.success("Opowiadanie zostało wygenerowane!");
      } else {
        toast.error("Nie otrzymano odpowiedzi od generatora opowiadań.");
        setDisclaimer("Nie otrzymano odpowiedzi od generatora opowiadań.");
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
      setGenre("");
      setCharacter("");
      setEvent("");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full">
        <CardHeader>
          <StorytellerLogo className="mb-4" />
          <CardTitle className="text-2xl font-bold">Generator Opowiadań AI</CardTitle>
          <CardDescription>
            Wprowadź gatunek, postać i zdarzenie, aby stworzyć unikalną historię, lub pozwól AI Cię zaskoczyć!
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
              {isSurpriseMeActive ? "AI wygeneruje losowe parametry." : "Wypełnij pola lub kliknij 'Zaskocz mnie'."}
            </Label>
          </div>

          <div className="grid w-full gap-2">
            <Label htmlFor="genre">Gatunek:</Label>
            <Textarea
              id="genre"
              placeholder="Np. 'Fantasy', 'Science Fiction', 'Kryminał', 'Romans'."
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              rows={1}
              disabled={isLoading || isSurpriseMeActive}
            />
          </div>
          <div className="grid w-full gap-2">
            <Label htmlFor="character">Postać:</Label>
            <Textarea
              id="character"
              placeholder="Np. 'Młody rycerz szukający przygód', 'Detektyw z mroczną przeszłością', 'Szalony naukowiec'."
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              rows={1}
              disabled={isLoading || isSurpriseMeActive}
            />
          </div>
          <div className="grid w-full gap-2">
            <Label htmlFor="event">Zdarzenie:</Label>
            <Textarea
              id="event"
              placeholder="Np. 'Odkrycie starożytnego artefaktu', 'Tajemnicze morderstwo w zamkniętym pokoju', 'Pierwszy kontakt z obcą cywilizacją'."
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              rows={2}
              disabled={isLoading || isSurpriseMeActive}
            />
          </div>
          <Button onClick={handleGenerateStory} disabled={isLoading} className="w-full">
            {isLoading ? "Generowanie opowiadania..." : "Generuj Opowiadanie"}
          </Button>

          {generatedStory && (
            <div className="grid w-full gap-2">
              <Label htmlFor="generated-story">Wygenerowane Opowiadanie:</Label>
              <div className="relative">
                <Textarea
                  id="generated-story"
                  value={generatedStory}
                  readOnly
                  rows={15}
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

export default StoryGenerator;