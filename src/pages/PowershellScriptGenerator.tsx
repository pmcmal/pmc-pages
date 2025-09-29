"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PowershellScriptGenerator = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerateScript = () => {
    if (!prompt.trim()) {
      toast.error("Proszę opisać, jaki skrypt PowerShell potrzebujesz.");
      return;
    }

    setIsLoading(true);
    setGeneratedScript(""); // Clear previous script

    // Simulate API call or script generation logic
    setTimeout(() => {
      const mockScript = `
# Skrypt PowerShell wygenerowany na podstawie Twojego zapytania: "${prompt}"

# Pamiętaj, że to jest tylko przykład.
# Zawsze dokładnie przeglądaj i testuj wygenerowane skrypty przed użyciem w środowisku produkcyjnym.

# Przykładowa logika (dostosuj do swoich potrzeb):
# if ($prompt -like "*lista procesów*") {
#     Get-Process | Select-Object Name, Id, CPU, WorkingSet
# } elseif ($prompt -like "*plik*") {
#     New-Item -Path "C:\\temp\\my_generated_file.txt" -ItemType File -Value "To jest zawartość wygenerowanego pliku."
# } else {
#     Write-Host "Nie rozumiem Twojego zapytania. Proszę spróbować ponownie z bardziej szczegółowym opisem."
# }

Write-Host "Wygenerowano skrypt dla: '${prompt}'"
# Tutaj znajdzie się rzeczywista logika skryptu PowerShell
# ...
# ...
`;
      setGeneratedScript(mockScript);
      setIsLoading(false);
      toast.success("Skrypt PowerShell został wygenerowany!");
    }, 1500);
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
          <CardTitle className="text-2xl font-bold">Generator Skryptów PowerShell</CardTitle>
          <CardDescription>Opisz, jaki skrypt PowerShell potrzebujesz, a my postaramy się go wygenerować.</CardDescription>
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
    </div>
  );
};

export default PowershellScriptGenerator;