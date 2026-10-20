// "Sprawa magazynu nr 3" - dane i logika sledztwa.
//
// Czysty modul: zero Reacta, zero DOM. Dzieki temu cala sprawa daje sie
// przejsc i sprawdzic testem, zanim ktokolwiek ja zobaczy.

export type SuspectId = "wojcik" | "baran" | "dudek" | "nowak";
export type EvidenceId =
  | "klodka"
  | "ksiega"
  | "opony"
  | "karta"
  | "swiadek"
  | "odcisk"
  | "kluczyki"
  | "dlug";

export interface Suspect {
  id: SuspectId;
  name: string;
  role: string;
  age: number;
  portrait: string;
  alibi: string;
}

export interface Evidence {
  id: EvidenceId;
  title: string;
  detail: string;
  /**
   * Na kogo poszlaka realnie wskazuje. `null` znaczy, ze tylko zaweza krag -
   * i to jest sedno tablicy: wiekszosc dowodow nikogo nie wskazuje.
   */
  pointsTo: SuspectId | null;
}

export interface Question {
  id: string;
  text: string;
  answer: string;
  /** Poszlaka, ktora wchodzi do notesu po tym pytaniu. */
  gives?: EvidenceId;
  /** Pytanie odblokowuje sie dopiero, gdy mamy te poszlake. */
  needs?: EvidenceId;
}

export interface PressOption {
  /** Poszlaka, ktora przeczy zeznaniu - bez niej nie ma czym przyciskac. */
  needs: EvidenceId;
  accusation: string;
  reaction: string;
  gives: EvidenceId;
}

export const SUSPECTS: Suspect[] = [
  {
    id: "wojcik",
    name: "Henryk Wójcik",
    role: "magazynier",
    age: 52,
    portrait: "🧔",
    alibi: "Zamknąłem magazyn o piętnastej i pojechałem na działkę.",
  },
  {
    id: "baran",
    name: "Zdzisław Baran",
    role: "kierowca",
    age: 41,
    portrait: "🧑‍✈️",
    alibi: "Kluczyki od Stara oddałem o szesnastej i poszedłem do domu.",
  },
  {
    id: "dudek",
    name: "Krystyna Dudek",
    role: "księgowa",
    age: 38,
    portrait: "👩‍💼",
    alibi: "Wyszłam o szesnastej razem z wszystkimi. Nie wracałam.",
  },
  {
    id: "nowak",
    name: "Stefan Nowak",
    role: "portier",
    age: 63,
    portrait: "👴",
    alibi: "Nikogo nie wpuszczałem. Całą noc na portierni, nic nie widziałem.",
  },
];

export const EVIDENCE: Record<EvidenceId, Evidence> = {
  klodka: {
    id: "klodka",
    title: "Kłódka bez śladów włamania",
    detail: "Otwarta oryginalnym kluczem. Sprawca miał dostęp do klucza — czyli pracuje w zakładzie.",
    pointsTo: null,
  },
  ksiega: {
    id: "ksiega",
    title: "Wyrwana strona z księgi",
    detail: "Z księgi magazynowej brakuje kartki z 14 lipca. Księgę prowadzi księgowa.",
    pointsTo: "dudek",
  },
  opony: {
    id: "opony",
    title: "Ślad opon przy rampie",
    detail: "Bieżnik zgodny z zakładowym Starem. Towar wywieziono samochodem, nie wyniesiono w rękach.",
    pointsTo: null,
  },
  karta: {
    id: "karta",
    title: "Karta drogowa Stara",
    detail: "Dwanaście kilometrów więcej, niż wynika z trasy. Ktoś jeździł nim po godzinach.",
    pointsTo: null,
  },
  swiadek: {
    id: "swiadek",
    title: "Zeznanie sąsiadki",
    detail: "Po dwudziestej drugiej widziała kobietę wchodzącą bramą od podwórza.",
    pointsTo: "dudek",
  },
  odcisk: {
    id: "odcisk",
    title: "Odcisk na wyrwanej stronie",
    detail: "Kartka leżała w koszu w księgowości. Odcisk kciuka należy do Krystyny Dudek.",
    pointsTo: "dudek",
  },
  kluczyki: {
    id: "kluczyki",
    title: "Kluczyki wiszą w portierni",
    detail: "Każdy pracownik mógł po nie sięgnąć. To, że jeździł Star, nie obciąża kierowcy.",
    pointsTo: null,
  },
  dlug: {
    id: "dlug",
    title: "Dług w kasie zapomogowej",
    detail: "Krystyna Dudek winna jest kasie czterdzieści tysięcy. Termin minął w czerwcu.",
    pointsTo: "dudek",
  },
};

/** Poszlaki z oględzin - gracz dostaje je na starcie, zanim zacznie przesłuchania. */
export const INITIAL_EVIDENCE: EvidenceId[] = ["klodka", "ksiega", "opony"];

export const CULPRIT: SuspectId = "dudek";

export const QUESTIONS: Record<SuspectId, Question[]> = {
  wojcik: [
    {
      id: "w1",
      text: "Kto jeszcze ma klucz do magazynu?",
      answer:
        "Ja i księgowa. Pani Krystyna musi mieć, bo robi inwentaryzację. Portier trzyma zapasowy, ale pod szkłem.",
    },
    {
      id: "w2",
      text: "Prowadzi pan księgę magazynową?",
      answer: "Ja tylko podpisuję. Wpisy robi księgowość — to nie moja działka.",
      needs: "ksiega",
    },
    {
      id: "w3",
      text: "Co z samochodem zakładowym?",
      answer: "Star? Stoi na podwórzu. Kluczyki wiszą w portierni na gwoździu, każdy może wziąć.",
      gives: "kluczyki",
    },
  ],
  baran: [
    {
      id: "b1",
      text: "Gdzie pan był tamtej nocy?",
      answer: "W domu, z żoną. Kluczyki oddałem o szesnastej, jak zawsze. Portier potwierdzi.",
    },
    {
      id: "b2",
      text: "Star przejechał dwanaście kilometrów za dużo.",
      answer:
        "To nie ja! Panie władzo, ten wóz stoi otwarty na podwórzu, a kluczyki wiszą w portierni. Każdy mógł.",
      needs: "karta",
      gives: "kluczyki",
    },
  ],
  dudek: [
    {
      id: "d1",
      text: "O której wyszła pani z pracy?",
      answer: "O szesnastej. Razem z panią Zosią z kadr. Potem prosto do domu, do dziecka.",
    },
    {
      id: "d2",
      text: "Kto odpowiada za księgę magazynową?",
      answer: "Ja prowadzę wpisy. Ale kartka musiała się sama wydrzeć, papier jest marny.",
      needs: "ksiega",
    },
    {
      id: "d3",
      text: "Ma pani zobowiązania w kasie zapomogowej?",
      answer: "To... to sprawa prywatna. Oddam. Zawsze oddaję.",
      needs: "swiadek",
      gives: "dlug",
    },
  ],
  nowak: [
    {
      id: "n1",
      text: "Widział pan kogoś po godzinach?",
      answer: "Nikogo. Brama zamknięta, ja na portierni. Mucha nie przeleciała.",
    },
    {
      id: "n2",
      text: "Sąsiadka widziała kobietę o dwudziestej drugiej.",
      answer: "No... może zdrzemnąłem się chwilę. Ale tylko chwilę! Furtka od podwórza bywa otwarta.",
      needs: "swiadek",
    },
    {
      id: "n3",
      text: "Kto pytał o kluczyki do Stara?",
      answer: "Pani księgowa. Dzień wcześniej. Mówiła, że trzeba przewieźć segregatory.",
      needs: "kluczyki",
      gives: "swiadek",
    },
  ],
};

export const PRESS: Partial<Record<SuspectId, PressOption>> = {
  dudek: {
    needs: "swiadek",
    accusation: "Sąsiadka widziała panią o dwudziestej drugiej. Wyszła pani o szesnastej?",
    reaction:
      "...Wróciłam. Po torebkę. Zostawiłam ją w księgowości, wróciłam na dziesięć minut i zaraz wyszłam. Tyle.",
    gives: "odcisk",
  },
  nowak: {
    needs: "swiadek",
    accusation: "Twierdzi pan, że nikt nie wchodził. Mamy świadka.",
    reaction: "Zdrzemnąłem się. Niech mnie pan nie wsadza, ja mam trzydzieści lat stażu...",
    gives: "karta",
  },
};

// ---------- logika sledztwa ----------

export interface Investigation {
  evidence: Set<EvidenceId>;
  asked: Set<string>;
  pressed: Set<SuspectId>;
  board: Partial<Record<EvidenceId, SuspectId | "none">>;
}

export function createInvestigation(): Investigation {
  return {
    evidence: new Set(INITIAL_EVIDENCE),
    asked: new Set(),
    pressed: new Set(),
    board: {},
  };
}

/** Pytania dostepne u danego podejrzanego przy obecnym stanie notesu. */
export function availableQuestions(inv: Investigation, suspect: SuspectId): Question[] {
  return QUESTIONS[suspect].filter((q) => !inv.asked.has(q.id) && (!q.needs || inv.evidence.has(q.needs)));
}

export function ask(inv: Investigation, suspect: SuspectId, questionId: string): Question | null {
  const question = QUESTIONS[suspect].find((q) => q.id === questionId);
  if (!question || inv.asked.has(questionId)) return null;
  if (question.needs && !inv.evidence.has(question.needs)) return null;
  inv.asked.add(questionId);
  if (question.gives) inv.evidence.add(question.gives);
  return question;
}

export function canPress(inv: Investigation, suspect: SuspectId): boolean {
  const option = PRESS[suspect];
  return !!option && !inv.pressed.has(suspect) && inv.evidence.has(option.needs);
}

export function press(inv: Investigation, suspect: SuspectId): PressOption | null {
  if (!canPress(inv, suspect)) return null;
  const option = PRESS[suspect]!;
  inv.pressed.add(suspect);
  inv.evidence.add(option.gives);
  return option;
}

export function assign(inv: Investigation, evidenceId: EvidenceId, target: SuspectId | "none") {
  inv.board[evidenceId] = target;
}

/** Ile poszlak w notesie jest przypisanych poprawnie. */
export function boardScore(inv: Investigation): { correct: number; total: number } {
  const held = [...inv.evidence];
  let correct = 0;
  for (const id of held) {
    const expected = EVIDENCE[id].pointsTo ?? "none";
    if (inv.board[id] === expected) correct++;
  }
  return { correct, total: held.length };
}

export type Verdict = "perfect" | "convicted" | "weak" | "wrong";

/**
 * Oskarzenie. Zeby skazac, trzeba miec w notesie poszlaki wskazujace na sprawce
 * I poprawnie je przypisac - samo wskazanie palcem nie wystarczy.
 */
export function accuse(inv: Investigation, suspect: SuspectId): Verdict {
  if (suspect !== CULPRIT) return "wrong";

  const pointing = (Object.keys(EVIDENCE) as EvidenceId[]).filter(
    (id) => EVIDENCE[id].pointsTo === CULPRIT && inv.evidence.has(id),
  );
  const linked = pointing.filter((id) => inv.board[id] === CULPRIT);

  if (linked.length === 4) return "perfect";
  if (linked.length >= 3) return "convicted";
  return "weak";
}
