import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { PageFooter } from "@/components/PageFooter";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/utils/edge-function-error";

const EQ_BARS = [0, 1, 2, 3, 4, 5, 6, 7];

const LyricsFinder = () => {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!artist.trim() || !title.trim()) {
      setError("Podaj wykonawcę i tytuł utworu.");
      return;
    }
    setIsLoading(true);
    setError("");
    setLyrics(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-lyrics", {
        body: { artist: artist.trim(), title: title.trim() },
      });
      if (fnError) {
        throw new Error(await getEdgeFunctionErrorMessage(fnError, "Nie udało się pobrać tekstu."));
      }
      if (data?.error) throw new Error(data.error);
      setLyrics(data.lyrics);
      setNowPlaying(`${artist.trim().toUpperCase()} - ${title.trim().toUpperCase()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się pobrać tekstu.");
      setNowPlaying(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-600 via-gray-700 to-gray-900 flex flex-col items-center justify-center p-4">
      <SiteHomeButton />
      <div className="w-full max-w-2xl bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg shadow-2xl border-2 border-gray-500 overflow-hidden">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-950 px-3 py-1.5 flex items-center justify-between border-b-2 border-gray-500">
          <span className="font-winamp text-green-300 text-xl tracking-[0.2em]">♫ LYRICS FINDER ♫</span>
          <div className="flex gap-1.5">
            <span className="w-3 h-3 bg-gray-400 border border-gray-700 inline-block" />
            <span className="w-3 h-3 bg-gray-400 border border-gray-700 inline-block" />
            <span className="w-3 h-3 bg-gray-400 border border-gray-700 inline-block" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* LCD display */}
          <div className="bg-black rounded p-3 border-2 border-gray-600 overflow-hidden h-16 relative">
            <div className="absolute inset-0 flex items-center px-3 overflow-hidden">
              {isLoading ? (
                <span className="font-winamp text-green-400 text-2xl tracking-wider">ŁADOWANIE…</span>
              ) : nowPlaying ? (
                <div className="winamp-marquee font-winamp text-green-400 text-2xl tracking-wider">
                  {nowPlaying} •••• {nowPlaying} ••••
                </div>
              ) : (
                <span className="font-winamp text-green-700 text-2xl tracking-wider">
                  WPISZ WYKONAWCĘ I TYTUŁ…
                </span>
              )}
            </div>
            <div className="absolute right-2 bottom-1.5 flex gap-0.5 items-end h-9">
              {EQ_BARS.map((i) => (
                <div
                  key={i}
                  className="winamp-eq-bar w-1 bg-green-500"
                  style={{ animationDelay: `${i * 0.12}s`, height: "20%" }}
                />
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="font-winamp text-base text-gray-800">Wykonawca</Label>
              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="np. Queen"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-gray-900 text-green-400 border-gray-600 font-mono"
              />
            </div>
            <div>
              <Label className="font-winamp text-base text-gray-800">Tytuł utworu</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Bohemian Rhapsody"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-gray-900 text-green-400 border-gray-600 font-mono"
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full bg-gradient-to-b from-gray-200 to-gray-400 hover:from-gray-100 hover:to-gray-300 text-black border border-gray-600 font-winamp text-xl tracking-wide"
          >
            {isLoading ? "SZUKAM…" : "▶ SZUKAJ TEKSTU"}
          </Button>

          {error && <p className="text-red-700 text-sm font-winamp text-lg">⚠ {error}</p>}

          {lyrics && (
            <div className="bg-black rounded p-4 border-2 border-gray-600 max-h-96 overflow-y-auto">
              <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">{lyrics}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
};

export default LyricsFinder;
