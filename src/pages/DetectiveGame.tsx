"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { SiteControls } from "@/components/SiteControls";
import { PageFooter } from "@/components/PageFooter";
import {
  EVIDENCE,
  PRESS,
  SUSPECTS,
  accuse,
  ask,
  availableQuestions,
  boardScore,
  canPress,
  createInvestigation,
  press,
  type EvidenceId,
  type Investigation,
  type SuspectId,
  type Verdict,
} from "@/lib/case-magazyn";
import { WALK_MAPS, distanceToExit, moveWalk, parseWalk, renderWalk, type WalkState } from "@/lib/raycaster";

type Scene = "intro" | "walk1" | "oglediny" | "przesluchania" | "walk2" | "tablica" | "werdykt";

const WALK_FOR: Partial<Record<Scene, keyof typeof WALK_MAPS>> = {
  walk1: "klatka",
  walk2: "zaklad",
};

// ---------------------------------------------------------------- korytarz

const WalkScene = ({ mapKey, onDone }: { mapKey: keyof typeof WALK_MAPS; onDone: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<WalkState | null>(null);
  const inputRef = useRef({ forward: 0, turn: 0 });
  const hintRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);

  const map = WALK_MAPS[mapKey];

  useEffect(() => {
    stateRef.current = parseWalk(map);
    doneRef.current = false;
    inputRef.current = { forward: 0, turn: 0 };
  }, [map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let width = 0;
    let height = 0;

    const resize = () => {
      // celowo niska rozdzielczosc wewnetrzna: wyglada jak gra z epoki
      // i nie obciaza telefonu
      width = Math.min(480, wrap.clientWidth);
      height = Math.round((width * 3) / 4);
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = "100%";
      canvas.style.aspectRatio = "4 / 3";
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const state = stateRef.current;
      if (state) {
        moveWalk(map, state, inputRef.current.forward, inputRef.current.turn, dt);
        renderWalk(ctx, map, state, width, height);
        if (hintRef.current) {
          const d = distanceToExit(map, state);
          hintRef.current.textContent = d < 2 ? "Jesteś na miejscu" : d < 5 ? "Blisko" : "Szukaj wyjścia";
        }
        if (state.finished && !doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [map, onDone]);

  // klawiatura: W/S chodzenie, A/D obrot. Bez strzalek i spacji.
  useEffect(() => {
    const held = new Set<string>();
    const apply = () => {
      inputRef.current = {
        forward: (held.has("w") ? 1 : 0) - (held.has("s") ? 1 : 0),
        turn: (held.has("d") ? 1 : 0) - (held.has("a") ? 1 : 0),
      };
    };
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!"wasd".includes(k) || k.length !== 1 || isTyping(e.target)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      held.add(k);
      apply();
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.key.toLowerCase());
      apply();
    };
    const blur = () => {
      held.clear();
      apply();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // dotyk: przeciaganie palcem - pion to marsz, poziom to obrot
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ox = 0;
    let oy = 0;
    let active = false;
    const MAX = 55;

    const down = (e: PointerEvent) => {
      active = true;
      ox = e.clientX;
      oy = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      inputRef.current = {
        forward: -Math.max(-1, Math.min(1, (e.clientY - oy) / MAX)),
        turn: Math.max(-1, Math.min(1, (e.clientX - ox) / MAX)),
      };
    };
    const up = (e: PointerEvent) => {
      active = false;
      inputRef.current = { forward: 0, turn: 0 };
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div ref={wrapRef} className="space-y-2">
      <p className="text-sm text-amber-200/70 italic">{map.caption}</p>
      <canvas ref={canvasRef} className="block w-full rounded border-2 border-stone-700 touch-none select-none" style={{ imageRendering: "pixelated" }} />
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span>Komputer: W/S — idź, A/D — obróć się. Telefon: przeciągnij palcem.</span>
        <span ref={hintRef} className="font-mono text-amber-300" />
      </div>
      <Button variant="outline" size="sm" onClick={onDone}>
        Pomiń przejście
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------- gra

const DetectiveGame = () => {
  const [scene, setScene] = useState<Scene>("intro");
  const [inv, setInv] = useState<Investigation>(createInvestigation);
  const [active, setActive] = useState<SuspectId>("wojcik");
  const [log, setLog] = useState<{ who: string; text: string }[]>([]);
  const [selected, setSelected] = useState<EvidenceId | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const bump = useCallback(() => setInv((prev) => ({ ...prev })), []);

  const suspect = SUSPECTS.find((s) => s.id === active)!;
  const held = [...inv.evidence];

  const handleAsk = (questionId: string) => {
    const q = ask(inv, active, questionId);
    if (!q) return;
    setLog((l) => [...l, { who: "Ty", text: q.text }, { who: suspect.name, text: q.answer }]);
    bump();
  };

  const handlePress = () => {
    const option = press(inv, active);
    if (!option) return;
    setLog((l) => [
      ...l,
      { who: "Ty", text: option.accusation },
      { who: suspect.name, text: option.reaction },
    ]);
    bump();
  };

  const handleAssign = (target: SuspectId | "none") => {
    if (!selected) return;
    inv.board[selected] = target;
    setSelected(null);
    bump();
  };

  const score = boardScore(inv);

  return (
    <div className="min-h-screen bg-[#17150f] text-amber-50 p-4 pt-16 sm:pt-4">
      <SiteHomeButton />
      <SiteControls />

      <div className="container mx-auto max-w-2xl">
        <header className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.2em] uppercase text-amber-400">
            Sprawa magazynu nr 3
          </h1>
          <p className="text-xs text-amber-200/50 mt-1 font-mono">
            MO · Spółdzielnia Pracy „Postęp" · lipiec 1987
          </p>
        </header>

        <div className="rounded-xl border-2 border-stone-700 bg-stone-900/60 p-4 space-y-4">
          {scene === "intro" && (
            <>
              <p className="leading-relaxed">
                Środa, szósta rano. Dyżurny budzi Cię telefonem: z magazynu numer trzy zniknęła nocą cała
                partia towaru z importu. Kawa, dżinsy, rajstopy — same rzeczy, za którymi ludzie stoją
                w kolejce od świtu.
              </p>
              <p className="leading-relaxed">
                Brama nietknięta. Kłódka oryginalna, bez śladów łomu.{" "}
                <span className="text-amber-300">To ktoś ze środka.</span>
              </p>
              <Button onClick={() => setScene("walk1")}>Jedź na miejsce</Button>
            </>
          )}

          {(scene === "walk1" || scene === "walk2") && (
            <WalkScene
              mapKey={WALK_FOR[scene]!}
              onDone={() => setScene(scene === "walk1" ? "oglediny" : "tablica")}
            />
          )}

          {scene === "oglediny" && (
            <>
              <h2 className="font-semibold text-amber-300">Oględziny</h2>
              <ul className="space-y-2">
                {held.map((id) => (
                  <li key={id} className="p-3 rounded border border-stone-700 bg-stone-800/50">
                    <div className="font-medium">{EVIDENCE[id].title}</div>
                    <div className="text-sm text-amber-100/70">{EVIDENCE[id].detail}</div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-amber-200/60">
                Czworo pracowników miało dostęp. Czas z nimi porozmawiać.
              </p>
              <Button onClick={() => setScene("przesluchania")}>Zacznij przesłuchania</Button>
            </>
          )}

          {scene === "przesluchania" && (
            <>
              <div className="flex flex-wrap gap-2">
                {SUSPECTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActive(s.id);
                      setLog([]);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active === s.id
                        ? "bg-amber-400 text-stone-900 border-amber-400 font-semibold"
                        : "border-stone-600 hover:bg-stone-800"
                    }`}
                  >
                    {s.portrait} {s.name.split(" ")[1]}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded border border-stone-700 bg-stone-800/50">
                <div className="font-medium">
                  {suspect.portrait} {suspect.name}
                </div>
                <div className="text-xs text-amber-200/50 mb-2">
                  {suspect.role}, lat {suspect.age}
                </div>
                <p className="text-sm italic text-amber-100/80">„{suspect.alibi}"</p>
              </div>

              {log.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded border border-stone-800 bg-black/30">
                  {log.map((line, i) => (
                    <p key={i} className="text-sm">
                      <span className={line.who === "Ty" ? "text-amber-300" : "text-sky-300"}>{line.who}:</span>{" "}
                      {line.text}
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {availableQuestions(inv, active).map((q) => (
                  <Button
                    key={q.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2 whitespace-normal"
                    onClick={() => handleAsk(q.id)}
                  >
                    {q.text}
                  </Button>
                ))}
                {canPress(inv, active) && (
                  <Button variant="destructive" className="w-full" onClick={handlePress}>
                    Przyciśnij: {PRESS[active]!.accusation}
                  </Button>
                )}
                {availableQuestions(inv, active).length === 0 && !canPress(inv, active) && (
                  <p className="text-sm text-amber-200/50">
                    Nie masz więcej pytań do tej osoby. Może ktoś inny coś doda.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-700">
                <span className="text-xs text-amber-200/50">Poszlaki w notesie: {held.length} / 8</span>
                <Button size="sm" onClick={() => setScene("walk2")}>
                  Wróć na komisariat
                </Button>
              </div>
            </>
          )}

          {scene === "tablica" && (
            <>
              <h2 className="font-semibold text-amber-300">Tablica śledztwa</h2>
              <p className="text-sm text-amber-100/70">
                Przypisz każdą poszlakę do osoby, którą <em>realnie</em> obciąża. Większość dowodów tylko
                zawęża krąg — takie oznacz jako „nie wskazuje nikogo".
              </p>

              <div className="space-y-2">
                {held.map((id) => {
                  const assigned = inv.board[id];
                  const label =
                    assigned === "none"
                      ? "nie wskazuje nikogo"
                      : assigned
                        ? SUSPECTS.find((s) => s.id === assigned)!.name
                        : "— nieprzypisana —";
                  return (
                    <button
                      key={id}
                      onClick={() => setSelected(selected === id ? null : id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selected === id
                          ? "border-amber-400 bg-amber-400/10"
                          : "border-stone-700 bg-stone-800/50 hover:border-stone-500"
                      }`}
                    >
                      <div className="font-medium">{EVIDENCE[id].title}</div>
                      <div className="text-xs text-amber-200/60">{EVIDENCE[id].detail}</div>
                      <div className="text-xs mt-1 font-mono text-sky-300">→ {label}</div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="p-3 rounded border border-amber-700 bg-amber-950/30 space-y-2">
                  <p className="text-sm">Kogo obciąża „{EVIDENCE[selected].title}"?</p>
                  <div className="flex flex-wrap gap-2">
                    {SUSPECTS.map((s) => (
                      <Button key={s.id} size="sm" variant="outline" onClick={() => handleAssign(s.id)}>
                        {s.name.split(" ")[1]}
                      </Button>
                    ))}
                    <Button size="sm" variant="secondary" onClick={() => handleAssign("none")}>
                      Nikogo
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-stone-700 space-y-2">
                <p className="text-xs text-amber-200/50">
                  Przypisane: {Object.keys(inv.board).length} / {held.length}
                </p>
                <p className="text-sm">Kogo oskarżasz?</p>
                <div className="flex flex-wrap gap-2">
                  {SUSPECTS.map((s) => (
                    <Button
                      key={s.id}
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setVerdict(accuse(inv, s.id));
                        setScene("werdykt");
                      }}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {scene === "werdykt" && (
            <>
              <h2 className="font-semibold text-amber-300">Werdykt</h2>
              {verdict === "perfect" && (
                <p className="leading-relaxed">
                  Krystyna Dudek przyznaje się po kwadransie. Wyrwana kartka, odcisk, świadek i dług w kasie
                  — nie było czego podważać. Prokurator kiwa głową: <strong>sprawa zamknięta</strong>.
                </p>
              )}
              {verdict === "convicted" && (
                <p className="leading-relaxed">
                  Dudek się łamie, ale adwokat podważa dwa dowody. Wyrok w zawieszeniu.{" "}
                  <strong>Sprawca ustalony</strong> — choć mogłeś zebrać więcej.
                </p>
              )}
              {verdict === "weak" && (
                <p className="leading-relaxed">
                  Trafiłeś w sprawcę, ale bez powiązanych dowodów. Dudek odwołuje zeznania, prokurator
                  umarza. <strong>Sprawa rozbita o brak materiału.</strong>
                </p>
              )}
              {verdict === "wrong" && (
                <p className="leading-relaxed">
                  Niewinny człowiek spędził noc w areszcie, a prawdziwy sprawca zdążył sprzedać towar.{" "}
                  <strong>Sprawa umorzona.</strong>
                </p>
              )}

              <p className="text-sm text-amber-200/60 font-mono">
                Poszlaki: {held.length}/8 · poprawnie powiązane: {score.correct}/{score.total}
              </p>

              <Button
                onClick={() => {
                  setInv(createInvestigation());
                  setLog([]);
                  setSelected(null);
                  setVerdict(null);
                  setActive("wojcik");
                  setScene("intro");
                }}
              >
                Od początku
              </Button>
            </>
          )}
        </div>

        <PageFooter />
      </div>
    </div>
  );
};

export default DetectiveGame;
