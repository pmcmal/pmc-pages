"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import { AlignLeft, ArrowLeftRight, KeyRound, QrCode as QrCodeIcon } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { SiteControls } from "@/components/SiteControls";
import { PageFooter } from "@/components/PageFooter";
import {
  DEFAULT_PASSWORD_OPTIONS,
  TEMPERATURE_UNITS,
  UNIT_CATEGORIES,
  convertUnit,
  entropyLabel,
  formatNumber,
  generatePassword,
  passwordEntropy,
  textStats,
  type PasswordOptions,
} from "@/lib/tools";

type Tab = "qr" | "haslo" | "konwerter" | "tekst";

// Ikony zamiast emoji: emoji ma wlasny, staly kolor (klucz jest zolty), wiec
// na bursztynowym tle aktywnego przycisku sie zlewal. Ikony lucide dziedzicza
// kolor tekstu, wiec kontrast dziala w obu stanach i w obu motywach.
const TABS: { id: Tab; label: string; icon: ElementType }[] = [
  { id: "qr", label: "Kod QR", icon: QrCodeIcon },
  { id: "haslo", label: "Hasło", icon: KeyRound },
  { id: "konwerter", label: "Konwerter", icon: ArrowLeftRight },
  { id: "tekst", label: "Licznik tekstu", icon: AlignLeft },
];

const copy = (text: string, what: string) => {
  if (!text) return;
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${what} skopiowane do schowka`),
    () => toast.error("Nie udało się skopiować"),
  );
};

// ---------------------------------------------------------------- kod QR

const QrTool = () => {
  const [text, setText] = useState("https://pmcmalec.vercel.app");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!text.trim()) {
      setReady(false);
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    // Kod powstaje w przegladarce - nic nie wychodzi na zewnatrz, wiec mozna
    // tu wkleic cokolwiek, lacznie z haslem do wifi.
    QRCode.toCanvas(canvas, text, { width: 280, margin: 2, errorCorrectionLevel: "M" })
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [text]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const link = document.createElement("a");
    link.download = "kod-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="qr-text">Tekst, adres albo numer telefonu</Label>
        <Textarea
          id="qr-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="https://… albo dowolny tekst"
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          className="rounded-lg border bg-white max-w-full"
          style={{ imageRendering: "pixelated" }}
        />
        <Button onClick={download} disabled={!ready}>
          Pobierz PNG
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Kod powstaje w Twojej przeglądarce — wpisany tekst nigdzie nie jest wysyłany.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------- haslo

const PasswordTool = () => {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [password, setPassword] = useState("");

  const regenerate = (next = options) => setPassword(generatePassword(next));

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<PasswordOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    setPassword(generatePassword(next));
  };

  const bits = passwordEntropy(options);
  const label = entropyLabel(bits);
  const toneClass = {
    weak: "text-red-500",
    ok: "text-amber-500",
    good: "text-emerald-500",
    strong: "text-emerald-400",
  }[label.tone];

  const toggles: { key: keyof PasswordOptions; label: string }[] = [
    { key: "lower", label: "małe litery" },
    { key: "upper", label: "WIELKIE" },
    { key: "digits", label: "cyfry" },
    { key: "symbols", label: "znaki !@#" },
    { key: "avoidAmbiguous", label: "bez mylących O0Il1" },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border bg-muted/40 break-all font-mono text-lg min-h-[3.5rem] flex items-center">
        {password || <span className="text-muted-foreground text-sm">Zaznacz choć jeden rodzaj znaków</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => regenerate()}>Losuj nowe</Button>
        <Button variant="outline" onClick={() => copy(password, "Hasło")} disabled={!password}>
          Kopiuj
        </Button>
        <span className={`ml-auto self-center text-sm font-mono ${toneClass}`}>
          {bits} bitów · {label.text}
        </span>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pwd-len">Długość: {options.length}</Label>
        <input
          id="pwd-len"
          type="range"
          min={8}
          max={64}
          value={options.length}
          onChange={(e) => update({ length: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {toggles.map((t) => (
          <button
            key={t.key}
            onClick={() => update({ [t.key]: !options[t.key] } as Partial<PasswordOptions>)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              options[t.key]
                ? "bg-primary text-primary-foreground border-primary font-medium"
                : "border-input hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Losowane przez <code>crypto.getRandomValues</code> w Twojej przeglądarce. Hasło nigdzie nie jest
        wysyłane ani zapisywane.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------- konwerter

const ALL_CATEGORIES = [
  ...UNIT_CATEGORIES.map((c) => ({ id: c.id, label: c.label, units: c.units })),
  { id: "temperature", label: "Temperatura", units: TEMPERATURE_UNITS.map((u) => ({ ...u, factor: 1 })) },
];

const ConverterTool = () => {
  const [categoryId, setCategoryId] = useState("length");
  const category = ALL_CATEGORIES.find((c) => c.id === categoryId)!;
  const [from, setFrom] = useState(category.units[0].id);
  const [to, setTo] = useState(category.units[2]?.id ?? category.units[1].id);
  const [raw, setRaw] = useState("1");

  const switchCategory = (id: string) => {
    const next = ALL_CATEGORIES.find((c) => c.id === id)!;
    setCategoryId(id);
    setFrom(next.units[0].id);
    setTo(next.units[2]?.id ?? next.units[1].id);
  };

  const value = Number(raw.replace(",", "."));
  const result = convertUnit(categoryId, from, to, value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => switchCategory(c.id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              categoryId === c.id
                ? "bg-primary text-primary-foreground border-primary font-medium"
                : "border-input hover:bg-accent"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-end">
        <div className="grid gap-2">
          <Label htmlFor="conv-value">Z</Label>
          <Input
            id="conv-value"
            value={raw}
            inputMode="decimal"
            onChange={(e) => setRaw(e.target.value)}
          />
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {category.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          className="mb-[2.75rem] sm:mb-0 sm:self-center"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          aria-label="Zamień jednostki miejscami"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </Button>

        <div className="grid gap-2">
          <Label>Na</Label>
          <div className="h-10 flex items-center px-3 rounded-md border bg-muted/40 font-mono tabular-nums overflow-x-auto">
            {result === null ? "—" : formatNumber(result)}
          </div>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {category.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => copy(result === null ? "" : formatNumber(result), "Wynik")}
        disabled={result === null}
      >
        Kopiuj wynik
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------- licznik

const TextTool = () => {
  const [text, setText] = useState("");
  const stats = useMemo(() => textStats(text), [text]);

  const rows: { label: string; value: string }[] = [
    { label: "Znaki", value: String(stats.characters) },
    { label: "Znaki bez spacji", value: String(stats.charactersNoSpaces) },
    { label: "Słowa", value: String(stats.words) },
    { label: "Zdania", value: String(stats.sentences) },
    { label: "Akapity", value: String(stats.paragraphs) },
    { label: "Czas czytania", value: stats.readingMinutes ? `${stats.readingMinutes} min` : "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="txt">Wklej tekst</Label>
        <Textarea
          id="txt"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Tu wklej to, co chcesz policzyć…"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {rows.map((row) => (
          <div key={row.label} className="p-3 rounded-lg border bg-muted/40">
            <div className="text-xs text-muted-foreground">{row.label}</div>
            <div className="text-lg font-mono tabular-nums">{row.value}</div>
          </div>
        ))}
      </div>

      {stats.longestWord && (
        <p className="text-sm text-muted-foreground">
          Najdłuższe słowo: <span className="font-mono">{stats.longestWord}</span> (
          {[...stats.longestWord].length} znaków)
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- strona

const Tools = () => {
  const [tab, setTab] = useState<Tab>("qr");

  return (
    <div className="min-h-screen bg-background container mx-auto p-4 pt-16 sm:pt-4 max-w-3xl">
      <SiteHomeButton />
      <SiteControls />

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Drobne narzędzia</CardTitle>
          <CardDescription>
            Cztery rzeczy, których szuka się raz na jakiś czas. Wszystko liczy się w Twojej przeglądarce —
            nic nie wychodzi na serwer i działa bez internetu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "qr" && <QrTool />}
          {tab === "haslo" && <PasswordTool />}
          {tab === "konwerter" && <ConverterTool />}
          {tab === "tekst" && <TextTool />}
        </CardContent>
      </Card>

      <PageFooter />
    </div>
  );
};

export default Tools;
