"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { SiteControls } from "@/components/SiteControls";
import { PageFooter } from "@/components/PageFooter";
import { TunnelGame as Engine, type TunnelState } from "@/lib/tunnel-engine";

type Mode = "auto" | "pc" | "touch";
type Phase = "intro" | "playing" | "crashed";

const BEST_KEY = "pmc-tunnel-best";

/**
 * Klawisze wybrane tak, zeby nic nie przechwycily: strzalki przewijaja strone,
 * spacja tez, a Ctrl/Alt/Win to skroty systemu i przegladarki. WSAD jest wolne
 * i standardowe w grach.
 */
const KEY_MAP: Record<string, { axis: "x" | "y"; value: number }> = {
  w: { axis: "y", value: 1 },
  s: { axis: "y", value: -1 },
  a: { axis: "x", value: -1 },
  d: { axis: "x", value: 1 },
};

const detectTouch = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);

const TunnelGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const heldRef = useRef<Set<string>>(new Set());

  const [mode, setMode] = useState<Mode>("auto");
  const [autoTouch, setAutoTouch] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [stats, setStats] = useState<TunnelState>({ running: false, distance: 0, orbs: 0, speed: 0 });
  const [best, setBest] = useState(0);
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null);

  const isTouch = mode === "auto" ? autoTouch : mode === "touch";

  useEffect(() => {
    setAutoTouch(detectTouch());
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) || 0));
    } catch {
      // prywatne okno albo zablokowane dane - rekord po prostu nie bedzie pamietany
    }
  }, []);

  const score = Math.round(stats.distance) + stats.orbs * 50;

  const handleCrash = useCallback(() => {
    setPhase("crashed");
    setStats((s) => {
      const final = Math.round(s.distance) + s.orbs * 50;
      setBest((b) => {
        const next = Math.max(b, final);
        try {
          localStorage.setItem(BEST_KEY, String(next));
        } catch {
          // jw.
        }
        return next;
      });
      return s;
    });
  }, []);

  // --- silnik ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const engine = new Engine(canvas, setStats, handleCrash);
    engineRef.current = engine;

    const resize = () => engine.resize(wrap.clientWidth, wrap.clientHeight);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleCrash]);

  // --- klawiatura ---
  useEffect(() => {
    if (isTouch) return;

    const held = heldRef.current;

    const apply = () => {
      const engine = engineRef.current;
      if (!engine) return;
      let x = 0;
      let y = 0;
      for (const key of held) {
        const entry = KEY_MAP[key];
        if (!entry) continue;
        if (entry.axis === "x") x += entry.value;
        else y += entry.value;
      }
      engine.input = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    };

    // Pisanie w polu tekstowym ma byc pisaniem, a nie sterowaniem.
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    };

    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!KEY_MAP[key] || isTyping(e.target)) return;
      // bez modyfikatorow - zeby nie zjadac Ctrl+S, Ctrl+W itp.
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      held.add(key);
      apply();
    };
    const onUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!KEY_MAP[key]) return;
      held.delete(key);
      apply();
    };
    const onBlur = () => {
      held.clear();
      apply();
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      held.clear();
    };
  }, [isTouch]);

  // --- dotyk: wirtualny drazek, chwytany w dowolnym miejscu planszy ---
  useEffect(() => {
    if (!isTouch) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let originX = 0;
    let originY = 0;
    let active = false;
    const MAX = 60; // px do pelnego wychylenia

    const setInput = (x: number, y: number) => {
      const engine = engineRef.current;
      if (engine) engine.input = { x, y };
      setStick({ x, y });
    };

    const onDown = (e: PointerEvent) => {
      active = true;
      originX = e.clientX;
      originY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      setInput(0, 0);
    };
    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const dx = Math.max(-MAX, Math.min(MAX, e.clientX - originX)) / MAX;
      const dy = Math.max(-MAX, Math.min(MAX, e.clientY - originY)) / MAX;
      setInput(dx, -dy); // ekran ma Y w dol, swiat w gore
    };
    const onUp = (e: PointerEvent) => {
      active = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      setInput(0, 0);
      setStick(null);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [isTouch]);

  // karta w tle - nie ma po co liczyc klatek
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phase === "playing") {
        engineRef.current?.stop();
        setPhase("crashed");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase]);

  const startGame = () => {
    heldRef.current.clear();
    engineRef.current?.start();
    setPhase("playing");
  };

  return (
    <div className="min-h-screen bg-[#05060f] text-sky-100 p-4 pt-16 sm:pt-4">
      <SiteHomeButton />
      <SiteControls />

      <div className="container mx-auto max-w-3xl">
        <header className="text-center mb-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.25em] uppercase text-sky-300">Tunel</h1>
          <p className="text-sm text-sky-200/60 mt-1">
            Leć przez bramki, zbieraj kryształy. Im dalej, tym szybciej.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-sm font-mono">
          <span>DYSTANS {Math.round(stats.distance)} m</span>
          <span className="text-amber-300">KRYSZTAŁY {stats.orbs}</span>
          <span>REKORD {best}</span>
        </div>

        <div
          ref={wrapRef}
          className="relative w-full aspect-[4/3] sm:aspect-video rounded-lg overflow-hidden border-2 border-sky-900/70"
        >
          <canvas ref={canvasRef} className="block w-full h-full touch-none select-none" />

          {isTouch && stick && phase === "playing" && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border border-sky-400/40">
              <div
                className="absolute w-8 h-8 rounded-full bg-sky-400/60 left-1/2 top-1/2"
                style={{ transform: `translate(calc(-50% + ${stick.x * 22}px), calc(-50% + ${-stick.y * 22}px))` }}
              />
            </div>
          )}

          {phase !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-center px-6">
              {phase === "intro" ? (
                <>
                  <p className="text-xl font-bold text-sky-300">Gotowy?</p>
                  <p className="text-sm text-sky-100/80 max-w-sm">
                    {isTouch
                      ? "Przytrzymaj palec gdziekolwiek na planszy i przesuwaj — statek leci za drążkiem."
                      : "Sterujesz klawiszami W, S, A, D. Strzałki i spacja są celowo nieużywane, żeby nie przewijały strony."}
                  </p>
                  <Button onClick={startGame}>Start</Button>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-rose-400">Rozbicie</p>
                  <p className="font-mono text-sky-100">
                    {Math.round(stats.distance)} m · {stats.orbs} kryształów ·{" "}
                    <span className="text-amber-300">{score} pkt</span>
                  </p>
                  {score >= best && score > 0 && <p className="text-sm text-amber-300">Nowy rekord!</p>}
                  <Button onClick={startGame}>Jeszcze raz</Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-sky-200/60">Sterowanie:</span>
            {(["auto", "pc", "touch"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  mode === m
                    ? "bg-sky-400 text-slate-900 border-sky-400 font-semibold"
                    : "border-sky-800 text-sky-200 hover:bg-sky-900/40"
                }`}
              >
                {m === "auto" ? `Auto (${autoTouch ? "dotyk" : "klawiatura"})` : m === "pc" ? "Klawiatura" : "Dotyk"}
              </button>
            ))}
          </div>
          <span className="text-xs text-sky-200/40 font-mono">
            {Math.round(stats.speed)} j/s
          </span>
        </div>

        <PageFooter />
      </div>
    </div>
  );
};

export default TunnelGame;
