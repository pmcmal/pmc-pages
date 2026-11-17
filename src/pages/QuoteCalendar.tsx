"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { SiteControls } from "@/components/SiteControls";
import { PageFooter } from "@/components/PageFooter";
import {
  clearCachedMonth,
  fillMonth,
  loadMonth,
  type FilledDay,
} from "@/lib/quote-calendar";

const MIESIACE = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

const today = new Date();

const QuoteCalendar = () => {
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [days, setDays] = useState<FilledDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiFailed, setAiFailed] = useState(false);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  const load = useCallback(async (y: number, m: number) => {
    setIsLoading(true);
    setAiFailed(false);
    const { entries, aiFailed: failed } = await loadMonth(y, m);
    setDays(fillMonth(y, m, entries));
    setAiFailed(failed);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load(year, month);
    setSelectedDay(isCurrentMonth ? today.getDate() : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const goToMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setYear(newYear);
    setMonth(newMonth);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  const regenerate = async () => {
    // Czyscimy cache tego miesiaca i pytamy AI jeszcze raz - przydaje sie,
    // gdy pierwsza proba trafila na przeciazony darmowy model i duzo dni
    // wyszlo z zestawu zapasowego.
    setIsLoading(true);
    clearCachedMonth(year, month);
    await load(year, month);
  };

  const todaysEntry =
    isCurrentMonth && days.length > 0 ? days.find((d) => d.day === today.getDate()) : undefined;
  const shownEntry = selectedDay ? days.find((d) => d.day === selectedDay) : todaysEntry;

  const fallbackCount = days.filter((d) => d.isFallback).length;

  return (
    <div className="min-h-screen bg-background container mx-auto p-4 pt-16 sm:pt-4 max-w-3xl">
      <SiteHomeButton />
      <SiteControls />

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Kalendarz cytatów</CardTitle>
          <CardDescription>
            Cytaty z polskiej literatury dobrane przez AI, jeden na każdy dzień miesiąca. Wygenerowane raz
            na miesiąc i zapamiętane w przeglądarce — kolejne odwiedziny nie zużywają limitu AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={() => goToMonth(-1)} aria-label="Poprzedni miesiąc">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <div className="font-semibold text-lg capitalize">
                {MIESIACE[month - 1]} {year}
              </div>
              {!isCurrentMonth && (
                <button onClick={goToToday} className="text-xs text-primary hover:underline">
                  Wróć do dziś
                </button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={() => goToMonth(1)} aria-label="Następny miesiąc">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Dobieram cytaty na {MIESIACE[month - 1]}…
            </div>
          ) : (
            <>
              {shownEntry && (
                <div className="p-5 rounded-xl border bg-muted/40 space-y-2">
                  <p className="text-lg leading-relaxed italic">„{shownEntry.quote}”</p>
                  <p className="text-sm text-muted-foreground">
                    {shownEntry.author}, <span className="italic">{shownEntry.work}</span>
                    {selectedDay && (
                      <span className="ml-2 text-xs">
                        · {selectedDay} {MIESIACE[month - 1]}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-7 gap-1.5">
                {days.map((d) => (
                  <button
                    key={d.day}
                    onClick={() => setSelectedDay(d.day)}
                    aria-pressed={selectedDay === d.day}
                    className={`aspect-square rounded-md text-sm flex items-center justify-center border transition-colors ${
                      selectedDay === d.day
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : isCurrentMonth && d.day === today.getDate()
                          ? "border-primary text-primary font-medium"
                          : "border-input hover:bg-accent"
                    }`}
                    title={`${d.author} — ${d.work}`}
                  >
                    {d.day}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {aiFailed
                    ? "AI nie odpowiedziało — cały miesiąc z zestawu zapasowego."
                    : fallbackCount > 0
                      ? `${fallbackCount} ${fallbackCount === 1 ? "dzień" : "dni"} z zestawu zapasowego (AI nie pokryło wszystkich dni).`
                      : "Wszystkie dni dobrane przez AI."}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void regenerate()} className="shrink-0">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Losuj ponownie
                </Button>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Cytaty dobiera model AI z darmowego, publicznego katalogu modeli — zdarza mu się pomylić
                dokładne brzmienie albo przypisanie. Przed zacytowaniem gdziekolwiek poważnie, sprawdź
                źródło.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <PageFooter />
    </div>
  );
};

export default QuoteCalendar;
