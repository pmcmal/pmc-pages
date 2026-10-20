// Podstrony, ktore technicznie dzialaja i sa dostepne pod swoim docelowym adresem,
// ale jeszcze nie sa promowane na strone glowna (nie ma ich w src/pages/Index.tsx
// jako kafelka, sa wylaczone w robots.txt). Przetestuj pod linkiem, i jesli sa OK,
// daj znac - wtedy dodajemy je jako kafelek i usuwamy stad + z robots.txt.
export interface SandboxApp {
  key: string;
  title: string;
  description: string;
  path: string;
}

export const sandboxApps: SandboxApp[] = [
  {
    key: "tunel",
    title: "Tunel",
    description: "Gra 3D: lec przez bramki i zbieraj krysztaly. Sterowanie dotykiem albo WSAD.",
    path: "/tunel",
  },
];
