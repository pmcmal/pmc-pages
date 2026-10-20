import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { SiteControls } from "@/components/SiteControls";
import { PageFooter } from "@/components/PageFooter";
import { showSuccess } from "@/utils/toast";
import {
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  Plus,
  Trash2,
  Printer,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  RotateCcw,
} from "lucide-react";

interface ExperienceItem {
  id: string;
  position: string;
  company: string;
  period: string;
  description: string;
}

interface EducationItem {
  id: string;
  school: string;
  field: string;
  period: string;
}

interface CVData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  photo: string | null;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  templateMode: ThemeKey;
}

type ThemeKey = "light" | "dark" | "navy" | "emerald" | "burgundy" | "graphite";

const STORAGE_KEY = "pmc-cv-generator-data";

const emptyData: CVData = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  summary: "",
  photo: null,
  experience: [],
  education: [],
  skills: [],
  templateMode: "light",
};

interface CVTheme {
  page: string;
  sidebar: string;
  photoRing: string;
  photoPlaceholder: string;
  iconAccent: string;
  contactText: string;
  skillTag: string;
  sidebarHeading: string;
  name: string;
  jobTitle: string;
  summary: string;
  sectionHeading: string;
  itemTitle: string;
  itemPeriod: string;
  itemDesc: string;
  placeholder: string;
}

// Klasy musza byc zapisane w calosci, a nie sklejane z kawalkow - inaczej
// Tailwind ich nie wygeneruje, bo skanuje zrodlo tekstowo.
const themes: Record<ThemeKey, CVTheme> = {
  light: {
    page: "bg-white text-slate-900",
    sidebar: "bg-slate-50 text-slate-700 border-slate-200",
    photoRing: "ring-white",
    photoPlaceholder: "bg-slate-200 text-slate-400",
    iconAccent: "text-blue-500",
    contactText: "text-slate-700",
    skillTag: "bg-white text-slate-700 border border-slate-200 shadow-sm",
    sidebarHeading: "text-slate-400",
    name: "text-slate-900",
    jobTitle: "text-blue-600",
    summary: "text-slate-700",
    sectionHeading: "text-slate-400 border-slate-200",
    itemTitle: "text-slate-900",
    itemPeriod: "text-slate-500",
    itemDesc: "text-slate-600",
    placeholder: "text-gray-300",
  },
  dark: {
    page: "bg-slate-900 text-slate-100",
    sidebar: "bg-slate-950 text-slate-200 border-slate-800",
    photoRing: "ring-slate-700",
    photoPlaceholder: "bg-slate-800 text-slate-500",
    iconAccent: "text-blue-400",
    contactText: "text-slate-300",
    skillTag: "bg-slate-800 text-slate-200 border border-slate-700",
    sidebarHeading: "text-slate-500",
    name: "text-white",
    jobTitle: "text-blue-400",
    summary: "text-slate-300",
    sectionHeading: "text-slate-500 border-slate-700",
    itemTitle: "text-slate-100",
    itemPeriod: "text-slate-400",
    itemDesc: "text-slate-400",
    placeholder: "text-slate-600",
  },
  // Ponizsze trzymaja biala strone i kolorowy tylko pasek boczny - uklad
  // najczestszy w szablonach CV i najbezpieczniejszy na wydruku.
  navy: {
    page: "bg-white text-slate-900",
    sidebar: "bg-blue-950 text-blue-100 border-blue-950",
    photoRing: "ring-blue-800",
    photoPlaceholder: "bg-blue-900 text-blue-400",
    iconAccent: "text-blue-300",
    contactText: "text-blue-100",
    skillTag: "bg-white/10 text-white border border-white/20",
    sidebarHeading: "text-blue-300",
    name: "text-slate-900",
    jobTitle: "text-blue-800",
    summary: "text-slate-700",
    sectionHeading: "text-slate-400 border-slate-200",
    itemTitle: "text-slate-900",
    itemPeriod: "text-slate-500",
    itemDesc: "text-slate-600",
    placeholder: "text-gray-300",
  },
  emerald: {
    page: "bg-white text-slate-900",
    sidebar: "bg-emerald-900 text-emerald-50 border-emerald-900",
    photoRing: "ring-emerald-700",
    photoPlaceholder: "bg-emerald-800 text-emerald-400",
    iconAccent: "text-emerald-300",
    contactText: "text-emerald-50",
    skillTag: "bg-white/10 text-white border border-white/20",
    sidebarHeading: "text-emerald-300",
    name: "text-slate-900",
    jobTitle: "text-emerald-800",
    summary: "text-slate-700",
    sectionHeading: "text-slate-400 border-slate-200",
    itemTitle: "text-slate-900",
    itemPeriod: "text-slate-500",
    itemDesc: "text-slate-600",
    placeholder: "text-gray-300",
  },
  burgundy: {
    page: "bg-white text-slate-900",
    sidebar: "bg-rose-950 text-rose-100 border-rose-950",
    photoRing: "ring-rose-800",
    photoPlaceholder: "bg-rose-900 text-rose-400",
    iconAccent: "text-rose-300",
    contactText: "text-rose-100",
    skillTag: "bg-white/10 text-white border border-white/20",
    sidebarHeading: "text-rose-300",
    name: "text-slate-900",
    jobTitle: "text-rose-800",
    summary: "text-slate-700",
    sectionHeading: "text-slate-400 border-slate-200",
    itemTitle: "text-slate-900",
    itemPeriod: "text-slate-500",
    itemDesc: "text-slate-600",
    placeholder: "text-gray-300",
  },
  graphite: {
    page: "bg-white text-slate-900",
    sidebar: "bg-zinc-800 text-zinc-100 border-zinc-800",
    photoRing: "ring-zinc-600",
    photoPlaceholder: "bg-zinc-700 text-zinc-400",
    iconAccent: "text-amber-300",
    contactText: "text-zinc-100",
    skillTag: "bg-white/10 text-white border border-white/20",
    sidebarHeading: "text-zinc-400",
    name: "text-slate-900",
    jobTitle: "text-zinc-700",
    summary: "text-slate-700",
    sectionHeading: "text-slate-400 border-slate-200",
    itemTitle: "text-slate-900",
    itemPeriod: "text-slate-500",
    itemDesc: "text-slate-600",
    placeholder: "text-gray-300",
  },
};

// swatch to kolor kropki w wyborze motywu - pokazuje kolor paska bocznego
const themeOptions: { key: ThemeKey; label: string; swatch: string }[] = [
  { key: "light", label: "Jasny", swatch: "bg-slate-200" },
  { key: "dark", label: "Ciemny", swatch: "bg-slate-900" },
  { key: "navy", label: "Granatowy", swatch: "bg-blue-950" },
  { key: "emerald", label: "Zielony", swatch: "bg-emerald-900" },
  { key: "burgundy", label: "Bordowy", swatch: "bg-rose-950" },
  { key: "graphite", label: "Grafitowy", swatch: "bg-zinc-800" },
];

const CVGenerator = () => {
  const [data, setData] = useState<CVData>(emptyData);
  const [skillInput, setSkillInput] = useState("");
  const idCounter = useRef(0);
  const nextId = () => `item-${++idCounter.current}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setData({ ...emptyData, ...JSON.parse(saved) });
      }
    } catch {
      // Ignoruj uszkodzone dane w localStorage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = <K extends keyof CVData>(key: K, value: CVData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  // zapis z localStorage moze pochodzic sprzed dolozenia motywow
  const theme = themes[data.templateMode] ?? themes.light;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("photo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const addExperience = () => {
    update("experience", [
      ...data.experience,
      { id: nextId(), position: "", company: "", period: "", description: "" },
    ]);
  };

  const updateExperience = (id: string, field: keyof ExperienceItem, value: string) => {
    update(
      "experience",
      data.experience.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeExperience = (id: string) => {
    update("experience", data.experience.filter((item) => item.id !== id));
  };

  const addEducation = () => {
    update("education", [...data.education, { id: nextId(), school: "", field: "", period: "" }]);
  };

  const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
    update(
      "education",
      data.education.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeEducation = (id: string) => {
    update("education", data.education.filter((item) => item.id !== id));
  };

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value || data.skills.includes(value)) {
      setSkillInput("");
      return;
    }
    update("skills", [...data.skills, value]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    update("skills", data.skills.filter((s) => s !== skill));
  };

  const handleReset = () => {
    if (confirm("Na pewno wyczyścić wszystkie dane CV? Tej operacji nie można cofnąć.")) {
      setData(emptyData);
      showSuccess("Wyczyszczono dane CV.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }

          /* Przegladarki domyslnie pomijaja tla i kolory przy drukowaniu, zeby
             oszczedzac tusz. Przez to ciemny motyw wygladal czarno na ekranie,
             a z "Drukuj / PDF" wychodzil bialy. To wymusza wydruk zgodny
             z podgladem. */
          #cv-preview, #cv-preview * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <SiteHomeButton />
      <SiteControls />

      <div className="max-w-7xl mx-auto print:max-w-none">
        <div className="text-center mb-6 print:hidden">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-gray-100">
            <Sparkles className="text-blue-500" />
            Generator CV
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Wypełnij formularz, a podgląd obok zaktualizuje się na bieżąco. Dane zapisują się automatycznie w
            przeglądarce.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 print:block">
          {/* Formularz */}
          <div className="space-y-4 print:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" /> Dane osobowe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  {data.photo ? (
                    <img
                      src={data.photo}
                      alt="Zdjęcie profilowe"
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                      <User />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="photo" className="cursor-pointer text-sm text-blue-600 hover:underline">
                      {data.photo ? "Zmień zdjęcie" : "Dodaj zdjęcie (opcjonalnie)"}
                    </Label>
                    <Input id="photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    {data.photo && (
                      <button
                        onClick={() => update("photo", null)}
                        className="block text-xs text-red-500 hover:underline mt-1"
                      >
                        Usuń zdjęcie
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Imię i nazwisko</Label>
                    <Input
                      value={data.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="Jan Kowalski"
                    />
                  </div>
                  <div>
                    <Label>Stanowisko</Label>
                    <Input
                      value={data.jobTitle}
                      onChange={(e) => update("jobTitle", e.target.value)}
                      placeholder="Programista Frontend"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={data.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="jan@example.com"
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={data.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+48 600 000 000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Lokalizacja</Label>
                    <Input
                      value={data.location}
                      onChange={(e) => update("location", e.target.value)}
                      placeholder="Warszawa"
                    />
                  </div>
                  <div>
                    <Label>Strona / LinkedIn / GitHub</Label>
                    <Input
                      value={data.website}
                      onChange={(e) => update("website", e.target.value)}
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                </div>

                <div>
                  <Label>O mnie</Label>
                  <Textarea
                    value={data.summary}
                    onChange={(e) => update("summary", e.target.value)}
                    placeholder="Krótkie podsumowanie zawodowe (2-3 zdania)."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" /> Doświadczenie zawodowe
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addExperience}>
                  <Plus className="w-4 h-4 mr-1" /> Dodaj
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.experience.length === 0 && (
                  <p className="text-sm text-muted-foreground">Brak wpisów. Kliknij "Dodaj".</p>
                )}
                {data.experience.map((item) => (
                  <div key={item.id} className="border rounded-md p-3 space-y-2 relative">
                    <button
                      onClick={() => removeExperience(item.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      aria-label="Usuń wpis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 pr-6">
                      <Input
                        value={item.position}
                        onChange={(e) => updateExperience(item.id, "position", e.target.value)}
                        placeholder="Stanowisko"
                      />
                      <Input
                        value={item.company}
                        onChange={(e) => updateExperience(item.id, "company", e.target.value)}
                        placeholder="Firma"
                      />
                    </div>
                    <Input
                      value={item.period}
                      onChange={(e) => updateExperience(item.id, "period", e.target.value)}
                      placeholder="Okres, np. 2022 - obecnie"
                    />
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateExperience(item.id, "description", e.target.value)}
                      placeholder="Krótki opis obowiązków i osiągnięć"
                      className="min-h-[60px]"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" /> Wykształcenie
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addEducation}>
                  <Plus className="w-4 h-4 mr-1" /> Dodaj
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.education.length === 0 && (
                  <p className="text-sm text-muted-foreground">Brak wpisów. Kliknij "Dodaj".</p>
                )}
                {data.education.map((item) => (
                  <div key={item.id} className="border rounded-md p-3 space-y-2 relative">
                    <button
                      onClick={() => removeEducation(item.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      aria-label="Usuń wpis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 pr-6">
                      <Input
                        value={item.school}
                        onChange={(e) => updateEducation(item.id, "school", e.target.value)}
                        placeholder="Szkoła / uczelnia"
                      />
                      <Input
                        value={item.field}
                        onChange={(e) => updateEducation(item.id, "field", e.target.value)}
                        placeholder="Kierunek"
                      />
                    </div>
                    <Input
                      value={item.period}
                      onChange={(e) => updateEducation(item.id, "period", e.target.value)}
                      placeholder="Okres, np. 2018 - 2022"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Umiejętności</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="np. React (Enter, żeby dodać)"
                  />
                  <Button variant="outline" onClick={addSkill}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm px-3 py-1 rounded-full"
                    >
                      {skill}
                      <button onClick={() => removeSkill(skill)} aria-label={`Usuń ${skill}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={() => window.print()} className="flex-1">
                <Printer className="w-4 h-4 mr-2" /> Drukuj / Zapisz jako PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" /> Wyczyść
              </Button>
            </div>
          </div>

          {/* Podglad / Wydruk */}
          <div className="print:w-full">
            <div className="flex flex-wrap justify-center gap-2 mb-3 print:hidden">
              {themeOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => update("templateMode", option.key)}
                  aria-pressed={data.templateMode === option.key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    data.templateMode === option.key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ring-1 ring-black/10 ${option.swatch}`} />
                  {option.label}
                </button>
              ))}
            </div>

            <div
              id="cv-preview"
              className={`${theme.page} shadow-xl mx-auto rounded-2xl overflow-hidden print:shadow-none print:mx-0 print:rounded-none`}
              style={{ width: "210mm", minHeight: "297mm", maxWidth: "100%" }}
            >
              <div className="grid grid-cols-[210px_1fr] print:grid-cols-[210px_1fr] min-h-full">
                {/* Sidebar */}
                <aside className={`${theme.sidebar} border-r p-6 flex flex-col items-center gap-6`}>
                  {data.photo ? (
                    <img
                      src={data.photo}
                      alt="Zdjęcie profilowe"
                      className={`w-28 h-28 rounded-full object-cover ring-4 ${theme.photoRing} shadow-lg`}
                    />
                  ) : (
                    <div className={`w-28 h-28 rounded-full ${theme.photoPlaceholder} ring-4 ${theme.photoRing} shadow-lg flex items-center justify-center`}>
                      <User className="w-12 h-12" />
                    </div>
                  )}

                  <div className="w-full space-y-3 text-sm">
                    {data.email && (
                      <div className="flex items-start gap-2 min-w-0">
                        <Mail className={`w-4 h-4 shrink-0 mt-0.5 ${theme.iconAccent}`} />
                        <span className={`min-w-0 break-all ${theme.contactText}`}>{data.email}</span>
                      </div>
                    )}
                    {data.phone && (
                      <div className="flex items-start gap-2 min-w-0">
                        <Phone className={`w-4 h-4 shrink-0 mt-0.5 ${theme.iconAccent}`} />
                        <span className={`min-w-0 break-words ${theme.contactText}`}>{data.phone}</span>
                      </div>
                    )}
                    {data.location && (
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${theme.iconAccent}`} />
                        <span className={`min-w-0 break-words ${theme.contactText}`}>{data.location}</span>
                      </div>
                    )}
                    {data.website && (
                      <div className="flex items-start gap-2 min-w-0">
                        <LinkIcon className={`w-4 h-4 shrink-0 mt-0.5 ${theme.iconAccent}`} />
                        <span className={`min-w-0 break-all ${theme.contactText}`}>{data.website}</span>
                      </div>
                    )}
                  </div>

                  {data.skills.length > 0 && (
                    <div className="w-full">
                      <h3 className={`uppercase text-xs tracking-widest mb-2 ${theme.sidebarHeading}`}>
                        Umiejętności
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {data.skills.map((skill) => (
                          <span key={skill} className={`${theme.skillTag} text-xs px-2.5 py-1 rounded-full`}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>

                {/* Main content */}
                <main className="p-8">
                  <h1 className={`text-3xl font-bold ${theme.name}`}>
                    {data.fullName || <span className={`italic ${theme.placeholder}`}>Imię i nazwisko</span>}
                  </h1>
                  <p className={`text-lg font-medium mt-1 ${theme.jobTitle}`}>
                    {data.jobTitle || <span className={`italic ${theme.placeholder}`}>Stanowisko</span>}
                  </p>

                  {data.summary && (
                    <p className={`mt-4 text-sm leading-relaxed ${theme.summary}`}>{data.summary}</p>
                  )}

                  {data.experience.length > 0 && (
                    <section className="mt-6">
                      <h2 className={`text-sm uppercase tracking-widest font-semibold border-b pb-1 mb-3 ${theme.sectionHeading}`}>
                        Doświadczenie zawodowe
                      </h2>
                      <div className="space-y-4">
                        {data.experience.map((item) => (
                          <div key={item.id}>
                            <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                              <span className={`font-semibold ${theme.itemTitle}`}>
                                {item.position || "Stanowisko"}
                                {item.company ? ` — ${item.company}` : ""}
                              </span>
                              {item.period && (
                                <span className={`text-xs whitespace-nowrap ${theme.itemPeriod}`}>{item.period}</span>
                              )}
                            </div>
                            {item.description && (
                              <p className={`text-sm mt-1 whitespace-pre-line ${theme.itemDesc}`}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {data.education.length > 0 && (
                    <section className="mt-6">
                      <h2 className={`text-sm uppercase tracking-widest font-semibold border-b pb-1 mb-3 ${theme.sectionHeading}`}>
                        Wykształcenie
                      </h2>
                      <div className="space-y-3">
                        {data.education.map((item) => (
                          <div key={item.id} className="flex justify-between items-baseline flex-wrap gap-x-2">
                            <span className={`font-semibold ${theme.itemTitle}`}>
                              {item.school || "Szkoła"}
                              {item.field ? ` — ${item.field}` : ""}
                            </span>
                            {item.period && (
                              <span className={`text-xs whitespace-nowrap ${theme.itemPeriod}`}>{item.period}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </main>
              </div>
            </div>
          </div>
        </div>

        <div className="print:hidden">
          <PageFooter />
        </div>
      </div>
    </div>
  );
};

export default CVGenerator;
