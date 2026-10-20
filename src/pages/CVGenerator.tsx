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
  templateMode: TemplateKey;
}

type TemplateKey = "classic" | "dark" | "banner" | "elegant" | "minimal";

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
  templateMode: "classic",
};

type LayoutKind = "sidebar" | "banner" | "elegant" | "minimal";

interface CVTemplate {
  label: string;
  swatch: string;
  layout: LayoutKind;
  page: string;
  banner: string;
  bannerMuted: string;
  name: string;
  jobTitle: string;
  summary: string;
  sectionHeading: string;
  rule: string;
  itemTitle: string;
  itemPeriod: string;
  itemDesc: string;
  placeholder: string;
  iconAccent: string;
  contactText: string;
  skillTag: string;
  photoRing: string;
  photoPlaceholder: string;
  sidebar: string;
  sidebarHeading: string;
}

// Klasy musza byc zapisane w calosci, a nie sklejane - Tailwind skanuje zrodlo
// tekstowo i nazw budowanych w locie by nie wygenerowal.
const templates: Record<TemplateKey, CVTemplate> = {
  classic: {
    label: "Klasyczny",
    swatch: "bg-slate-300",
    layout: "sidebar",
    page: "bg-white text-slate-900 font-sans",
    banner: "",
    bannerMuted: "",
    name: "text-slate-900",
    jobTitle: "text-blue-600",
    summary: "text-slate-700",
    sectionHeading: "text-slate-400",
    rule: "border-slate-200",
    itemTitle: "text-slate-900",
    itemPeriod: "text-slate-500",
    itemDesc: "text-slate-600",
    placeholder: "text-gray-300",
    iconAccent: "text-blue-500",
    contactText: "text-slate-700",
    skillTag: "bg-white text-slate-700 border border-slate-200 shadow-sm",
    photoRing: "ring-white",
    photoPlaceholder: "bg-slate-200 text-slate-400",
    sidebar: "bg-slate-50 text-slate-700 border-slate-200",
    sidebarHeading: "text-slate-400",
  },
  dark: {
    label: "Ciemny",
    swatch: "bg-slate-900",
    layout: "sidebar",
    page: "bg-slate-900 text-slate-100 font-sans",
    banner: "",
    bannerMuted: "",
    name: "text-white",
    jobTitle: "text-blue-400",
    summary: "text-slate-300",
    sectionHeading: "text-slate-500",
    rule: "border-slate-700",
    itemTitle: "text-slate-100",
    itemPeriod: "text-slate-400",
    itemDesc: "text-slate-400",
    placeholder: "text-slate-600",
    iconAccent: "text-blue-400",
    contactText: "text-slate-300",
    skillTag: "bg-slate-800 text-slate-200 border border-slate-700",
    photoRing: "ring-slate-700",
    photoPlaceholder: "bg-slate-800 text-slate-500",
    sidebar: "bg-slate-950 text-slate-200 border-slate-800",
    sidebarHeading: "text-slate-500",
  },
  // Pelnej szerokosci kolorowy naglowek, pod nim jedna kolumna - inna sylwetka
  // strony niz pasek boczny, nie tylko inny kolor.
  banner: {
    label: "Nagłówek",
    swatch: "bg-teal-700",
    layout: "banner",
    page: "bg-white text-slate-900 font-sans",
    banner: "bg-teal-700 text-white",
    bannerMuted: "text-teal-100",
    name: "text-white",
    jobTitle: "text-teal-100",
    summary: "text-slate-700",
    sectionHeading: "text-teal-700",
    rule: "border-teal-200",
    itemTitle: "text-slate-900",
    itemPeriod: "text-slate-500",
    itemDesc: "text-slate-600",
    placeholder: "text-white/50",
    iconAccent: "text-teal-200",
    contactText: "text-teal-50",
    skillTag: "bg-teal-50 text-teal-800 border border-teal-200",
    photoRing: "ring-white/30",
    photoPlaceholder: "bg-teal-600 text-teal-200",
    sidebar: "",
    sidebarHeading: "",
  },
  // Szeryfowy, wysrodkowany, bez zdjecia i bez kolorow - uklad "papierowy".
  elegant: {
    label: "Elegancki",
    swatch: "bg-amber-800",
    layout: "elegant",
    page: "bg-[#fdfcf8] text-stone-800 font-serif",
    banner: "",
    bannerMuted: "",
    name: "text-stone-900",
    jobTitle: "text-amber-800",
    summary: "text-stone-700",
    sectionHeading: "text-amber-800",
    rule: "border-stone-300",
    itemTitle: "text-stone-900",
    itemPeriod: "text-stone-500",
    itemDesc: "text-stone-600",
    placeholder: "text-stone-300",
    iconAccent: "text-amber-700",
    contactText: "text-stone-600",
    skillTag: "text-stone-700 border-b border-stone-300",
    photoRing: "ring-stone-200",
    photoPlaceholder: "bg-stone-100 text-stone-400",
    sidebar: "",
    sidebarHeading: "",
  },
  // Zero kolorow i ozdobnikow, duzo swiatla - dla rekrutacji technicznej.
  minimal: {
    label: "Minimal",
    swatch: "bg-white border border-slate-300",
    layout: "minimal",
    page: "bg-white text-neutral-900 font-sans",
    banner: "",
    bannerMuted: "",
    name: "text-neutral-900",
    jobTitle: "text-neutral-500",
    summary: "text-neutral-700",
    sectionHeading: "text-neutral-400",
    rule: "border-neutral-200",
    itemTitle: "text-neutral-900",
    itemPeriod: "text-neutral-400",
    itemDesc: "text-neutral-600",
    placeholder: "text-neutral-300",
    iconAccent: "text-neutral-400",
    contactText: "text-neutral-600",
    skillTag: "text-neutral-600",
    photoRing: "ring-neutral-200",
    photoPlaceholder: "bg-neutral-100 text-neutral-400",
    sidebar: "",
    sidebarHeading: "",
  },
};

const templateOptions = (Object.keys(templates) as TemplateKey[]).map((key) => ({
  key,
  label: templates[key].label,
  swatch: templates[key].swatch,
}));

const contactEntries = (data: CVData) =>
  [
    { Icon: Mail, value: data.email },
    { Icon: Phone, value: data.phone },
    { Icon: MapPin, value: data.location },
    { Icon: LinkIcon, value: data.website },
  ].filter((entry) => entry.value);

const Photo = ({ data, tpl, size }: { data: CVData; tpl: CVTemplate; size: string }) =>
  data.photo ? (
    <img
      src={data.photo}
      alt="Zdjęcie profilowe"
      className={`${size} rounded-full object-cover ring-4 ${tpl.photoRing} shadow-lg`}
    />
  ) : (
    <div
      className={`${size} rounded-full ${tpl.photoPlaceholder} ring-4 ${tpl.photoRing} shadow-lg flex items-center justify-center`}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  );

const ExperienceBlock = ({ data, tpl, headingClass }: { data: CVData; tpl: CVTemplate; headingClass: string }) =>
  data.experience.length === 0 ? null : (
    <section className="mt-6">
      <h2 className={headingClass}>Doświadczenie zawodowe</h2>
      <div className="space-y-4">
        {data.experience.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between items-baseline flex-wrap gap-x-2">
              <span className={`font-semibold ${tpl.itemTitle}`}>
                {item.position || "Stanowisko"}
                {item.company ? ` — ${item.company}` : ""}
              </span>
              {item.period && <span className={`text-xs whitespace-nowrap ${tpl.itemPeriod}`}>{item.period}</span>}
            </div>
            {item.description && (
              <p className={`text-sm mt-1 whitespace-pre-line ${tpl.itemDesc}`}>{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );

const EducationBlock = ({ data, tpl, headingClass }: { data: CVData; tpl: CVTemplate; headingClass: string }) =>
  data.education.length === 0 ? null : (
    <section className="mt-6">
      <h2 className={headingClass}>Wykształcenie</h2>
      <div className="space-y-3">
        {data.education.map((item) => (
          <div key={item.id} className="flex justify-between items-baseline flex-wrap gap-x-2">
            <span className={`font-semibold ${tpl.itemTitle}`}>
              {item.school || "Szkoła"}
              {item.field ? ` — ${item.field}` : ""}
            </span>
            {item.period && <span className={`text-xs whitespace-nowrap ${tpl.itemPeriod}`}>{item.period}</span>}
          </div>
        ))}
      </div>
    </section>
  );

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
  // zapis z localStorage moze pochodzic sprzed przebudowy szablonow
  const tpl = templates[data.templateMode] ?? templates.classic;

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
          /* Margines 0, a nie 12mm, z dwoch powodow.
             Po pierwsze: naglowki i stopki przegladarki (data, adres, numer
             strony) rysuja sie wlasnie w marginesie strony - bez marginesu nie
             maja sie gdzie pojawic.
             Po drugie: podglad ma dokladnie 210mm szerokosci, czyli tyle co A4.
             Przy marginesie 12mm przegladarka musiala go scisnac do 186mm,
             zmniejszajac cale CV o jakies 11%. Teraz mapuje sie 1:1.
             Wewnetrzne odstepy daje sam szablon, a tla paskow i naglowkow
             dochodza do krawedzi kartki, jak w drukowanych szablonach. */
          @page { size: A4; margin: 0; }

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
              {templateOptions.map((option) => (
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
              className={`${tpl.page} shadow-xl mx-auto rounded-2xl overflow-hidden print:shadow-none print:mx-0 print:rounded-none`}
              style={{ width: "210mm", minHeight: "297mm", maxWidth: "100%" }}
            >
              {tpl.layout === "sidebar" && (
                <div className="grid grid-cols-[210px_1fr] print:grid-cols-[210px_1fr] min-h-full">
                  <aside className={`${tpl.sidebar} border-r p-6 print:p-7 flex flex-col items-center gap-6`}>
                    <Photo data={data} tpl={tpl} size="w-28 h-28" />
                    <div className="w-full space-y-3 text-sm">
                      {contactEntries(data).map(({ Icon, value }) => (
                        <div key={value} className="flex items-start gap-2 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${tpl.iconAccent}`} />
                          <span className={`min-w-0 break-all ${tpl.contactText}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                    {data.skills.length > 0 && (
                      <div className="w-full">
                        <h3 className={`uppercase text-xs tracking-widest mb-2 ${tpl.sidebarHeading}`}>Umiejętności</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {data.skills.map((skill) => (
                            <span key={skill} className={`${tpl.skillTag} text-xs px-2.5 py-1 rounded-full`}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </aside>
                  <main className="p-8 print:p-10">
                    <h1 className={`text-3xl font-bold ${tpl.name}`}>
                      {data.fullName || <span className={`italic ${tpl.placeholder}`}>Imię i nazwisko</span>}
                    </h1>
                    <p className={`text-lg font-medium mt-1 ${tpl.jobTitle}`}>
                      {data.jobTitle || <span className={`italic ${tpl.placeholder}`}>Stanowisko</span>}
                    </p>
                    {data.summary && <p className={`mt-4 text-sm leading-relaxed ${tpl.summary}`}>{data.summary}</p>}
                    <ExperienceBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-sm uppercase tracking-widest font-semibold border-b pb-1 mb-3 ${tpl.sectionHeading} ${tpl.rule}`}
                    />
                    <EducationBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-sm uppercase tracking-widest font-semibold border-b pb-1 mb-3 ${tpl.sectionHeading} ${tpl.rule}`}
                    />
                  </main>
                </div>
              )}

              {tpl.layout === "banner" && (
                <div className="min-h-full">
                  <header className={`${tpl.banner} px-10 py-8 flex items-center gap-6`}>
                    <Photo data={data} tpl={tpl} size="w-24 h-24 shrink-0" />
                    <div className="min-w-0">
                      <h1 className={`text-4xl font-bold tracking-tight ${tpl.name}`}>
                        {data.fullName || <span className={`italic ${tpl.placeholder}`}>Imię i nazwisko</span>}
                      </h1>
                      <p className={`text-lg mt-1 ${tpl.jobTitle}`}>
                        {data.jobTitle || <span className={`italic ${tpl.placeholder}`}>Stanowisko</span>}
                      </p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
                        {contactEntries(data).map(({ Icon, value }) => (
                          <span key={value} className={`flex items-center gap-1.5 ${tpl.contactText}`}>
                            <Icon className={`w-3.5 h-3.5 ${tpl.iconAccent}`} />
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </header>
                  <main className="px-10 py-8">
                    {data.summary && <p className={`text-sm leading-relaxed ${tpl.summary}`}>{data.summary}</p>}
                    <ExperienceBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-xs uppercase tracking-[0.2em] font-bold border-b-2 pb-1 mb-3 ${tpl.sectionHeading} ${tpl.rule}`}
                    />
                    <EducationBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-xs uppercase tracking-[0.2em] font-bold border-b-2 pb-1 mb-3 ${tpl.sectionHeading} ${tpl.rule}`}
                    />
                    {data.skills.length > 0 && (
                      <section className="mt-6">
                        <h2 className={`text-xs uppercase tracking-[0.2em] font-bold border-b-2 pb-1 mb-3 ${tpl.sectionHeading} ${tpl.rule}`}>
                          Umiejętności
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                          {data.skills.map((skill) => (
                            <span key={skill} className={`${tpl.skillTag} text-xs px-2.5 py-1 rounded`}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}
                  </main>
                </div>
              )}

              {tpl.layout === "elegant" && (
                <div className="min-h-full px-14 py-12">
                  <header className="text-center">
                    {data.photo && (
                      <div className="flex justify-center mb-5">
                        <Photo data={data} tpl={tpl} size="w-24 h-24" />
                      </div>
                    )}
                    <h1 className={`text-4xl tracking-[0.18em] uppercase ${tpl.name}`}>
                      {data.fullName || <span className={`italic ${tpl.placeholder}`}>Imię i nazwisko</span>}
                    </h1>
                    <div className={`border-t mt-5 mb-4 ${tpl.rule}`} />
                    <p className={`text-base italic ${tpl.jobTitle}`}>
                      {data.jobTitle || <span className={tpl.placeholder}>Stanowisko</span>}
                    </p>
                    <div className={`flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs ${tpl.contactText}`}>
                      {contactEntries(data).map(({ value }, n) => (
                        <span key={value}>
                          {n > 0 && <span className="mr-4">·</span>}
                          {value}
                        </span>
                      ))}
                    </div>
                  </header>
                  <main className="mt-8">
                    {data.summary && (
                      <p className={`text-sm leading-relaxed text-center italic ${tpl.summary}`}>{data.summary}</p>
                    )}
                    <ExperienceBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-center text-sm uppercase tracking-[0.25em] mb-4 ${tpl.sectionHeading}`}
                    />
                    <EducationBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-center text-sm uppercase tracking-[0.25em] mb-4 ${tpl.sectionHeading}`}
                    />
                    {data.skills.length > 0 && (
                      <section className="mt-6">
                        <h2 className={`text-center text-sm uppercase tracking-[0.25em] mb-4 ${tpl.sectionHeading}`}>
                          Umiejętności
                        </h2>
                        <p className={`text-center text-sm ${tpl.itemDesc}`}>{data.skills.join("  ·  ")}</p>
                      </section>
                    )}
                  </main>
                </div>
              )}

              {tpl.layout === "minimal" && (
                <div className="min-h-full px-14 py-14">
                  <header>
                    <h1 className={`text-3xl font-light tracking-tight ${tpl.name}`}>
                      {data.fullName || <span className={`italic ${tpl.placeholder}`}>Imię i nazwisko</span>}
                    </h1>
                    <p className={`text-[11px] uppercase tracking-[0.3em] mt-2 ${tpl.jobTitle}`}>
                      {data.jobTitle || <span className={tpl.placeholder}>Stanowisko</span>}
                    </p>
                    <p className={`text-xs mt-4 ${tpl.contactText}`}>
                      {contactEntries(data).map(({ value }) => value).join("  ·  ")}
                    </p>
                    <div className={`border-t mt-6 ${tpl.rule}`} />
                  </header>
                  <main>
                    {data.summary && <p className={`mt-6 text-sm leading-7 ${tpl.summary}`}>{data.summary}</p>}
                    <ExperienceBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-[11px] uppercase tracking-[0.25em] mb-4 ${tpl.sectionHeading}`}
                    />
                    <EducationBlock
                      data={data}
                      tpl={tpl}
                      headingClass={`text-[11px] uppercase tracking-[0.25em] mb-4 ${tpl.sectionHeading}`}
                    />
                    {data.skills.length > 0 && (
                      <section className="mt-6">
                        <h2 className={`text-[11px] uppercase tracking-[0.25em] mb-4 ${tpl.sectionHeading}`}>
                          Umiejętności
                        </h2>
                        <p className={`text-sm ${tpl.skillTag}`}>{data.skills.join(", ")}</p>
                      </section>
                    )}
                  </main>
                </div>
              )}
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
