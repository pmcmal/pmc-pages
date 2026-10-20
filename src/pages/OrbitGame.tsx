"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { SiteControls } from "@/components/SiteControls";
import { PageFooter } from "@/components/PageFooter";
import { MAX_RADIUS, MIN_RADIUS, OrbitSim, PLANET_RADIUS, type Outcome } from "@/lib/orbit-engine";

type Phase = "intro" | "playing" | "over";

const BEST_KEY = "pmc-orbit-best";

/** Gwiazdy tla - losowane raz, nie co klatke. */
const BACKDROP = Array.from({ length: 70 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: Math.random() < 0.85 ? 1 : 2,
  alpha: 0.25 + Math.random() * 0.5,
}));

const OrbitGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);

  const simRef = useRef<OrbitSim | null>(null);
  const thrustRef = useRef(false);
  const rafRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [result, setResult] = useState<{ score: number; time: number; outcome: Outcome } | null>(null);
  const [best, setBest] = useState(0);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) || 0));
    } catch {
      // prywatne okno - rekord nie bedzie pamietany
    }
  }, []);

  // --- rysowanie ---
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const sim = simRef.current;
    ctx.fillStyle = "#04060e";
    ctx.fillRect(0, 0, w, h);

    for (const star of BACKDROP) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#cfe3ff";
      ctx.fillRect(star.x * w, star.y * h, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    const cx = w / 2;
    const cy = h / 2;
    // cala scena skalowana tak, zeby maksymalna orbita zmiescila sie na ekranie
    const scale = Math.min(w, h) / 2 / (MAX_RADIUS + 20);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // granice: planeta i krawedz kosmosu
    ctx.strokeStyle = "rgba(120,160,255,0.18)";
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.arc(0, 0, MAX_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    const glow = ctx.createRadialGradient(0, 0, PLANET_RADIUS * 0.3, 0, 0, PLANET_RADIUS);
    glow.addColorStop(0, "#2b6cb0");
    glow.addColorStop(1, "#102a4c");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, PLANET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (sim) {
      for (const star of sim.stars) {
        if (star.taken) continue;
        const sx = Math.cos(star.theta) * star.r;
        const sy = Math.sin(star.theta) * star.r;
        ctx.fillStyle = "#ffd34a";
        ctx.beginPath();
        ctx.arc(sx, sy, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const rock of sim.rocks) {
        const rx = Math.cos(rock.theta) * rock.r;
        const ry = Math.sin(rock.theta) * rock.r;
        ctx.fillStyle = "#8a8f9b";
        ctx.beginPath();
        ctx.arc(rx, ry, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      const px = Math.cos(sim.theta) * sim.r;
      const py = Math.sin(sim.theta) * sim.r;

      const trail = trailRef.current;
      ctx.strokeStyle = "rgba(102,240,255,0.5)";
      ctx.lineWidth = 3 / scale;
      ctx.beginPath();
      trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();

      if (thrustRef.current && sim.outcome === "flying") {
        // plomien ciagu po wewnetrznej stronie - widac, ze pcha na zewnatrz
        ctx.fillStyle = "rgba(255,150,60,0.9)";
        ctx.beginPath();
        ctx.arc(px - Math.cos(sim.theta) * 14, py - Math.sin(sim.theta) * 14, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#9fe8ff";
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, []);

  // --- petla: HUD aktualizowany przez refy, zeby React nie przerysowywal sie co klatke ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const sim = simRef.current;
      if (sim && sim.outcome === "flying") {
        sim.step(dt, thrustRef.current);

        const trail = trailRef.current;
        trail.push({ x: Math.cos(sim.theta) * sim.r, y: Math.sin(sim.theta) * sim.r });
        if (trail.length > 70) trail.shift();

        if (scoreRef.current) scoreRef.current.textContent = String(sim.score);
        if (timeRef.current) timeRef.current.textContent = sim.elapsed.toFixed(1);
        if (altRef.current) altRef.current.textContent = String(Math.round(sim.r - PLANET_RADIUS));

        if (sim.outcome !== "flying") {
          const final = sim.score * 10 + Math.round(sim.elapsed);
          setResult({ score: final, time: sim.elapsed, outcome: sim.outcome });
          setBest((b) => {
            const next = Math.max(b, final);
            try {
              localStorage.setItem(BEST_KEY, String(next));
            } catch {
              // jw.
            }
            return next;
          });
          setPhase("over");
        }
      }

      draw(ctx, width, height);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [draw]);

  // --- sterowanie: jedno wejscie, identyczne wszedzie ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
    };

    // Tylko "w". Strzalki i spacja przewijaja strone, a Ctrl/Alt/Meta to
    // skroty systemu i przegladarki - dlatego zdarzenia z modyfikatorami
    // przepuszczamy dalej nietkniete.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "w" || isTyping(e.target)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      thrustRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "w") return;
      thrustRef.current = false;
    };
    const release = () => (thrustRef.current = false);

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      thrustRef.current = true;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: PointerEvent) => {
      thrustRef.current = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const startGame = () => {
    simRef.current = new OrbitSim();
    trailRef.current = [];
    thrustRef.current = false;
    setResult(null);
    setPhase("playing");
  };

  return (
    <div className="min-h-screen bg-[#04060e] text-sky-100 p-4 pt-16 sm:pt-4">
      <SiteHomeButton />
      <SiteControls />

      <div className="container mx-auto max-w-2xl">
        <header className="text-center mb-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.25em] uppercase text-sky-300">Orbita</h1>
          <p className="text-sm text-sky-200/60 mt-1">
            Przytrzymaj, żeby wznieść się wyżej. Puść, a grawitacja ściągnie Cię z powrotem.
          </p>
        </header>

        <div className="flex items-center justify-between gap-2 mb-2 text-sm font-mono">
          <span className="text-amber-300">
            GWIAZDY <span ref={scoreRef}>0</span>
          </span>
          <span>
            WYSOKOŚĆ <span ref={altRef}>110</span>
          </span>
          <span>
            CZAS <span ref={timeRef}>0.0</span> s
          </span>
        </div>

        <div
          ref={wrapRef}
          className="relative w-full aspect-square sm:aspect-[4/3] rounded-lg overflow-hidden border-2 border-sky-900/70"
        >
          <canvas ref={canvasRef} className="block w-full h-full touch-none select-none" />

          {phase !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-center px-6">
              {phase === "intro" ? (
                <>
                  <p className="text-xl font-bold text-sky-300">Gotowy?</p>
                  <p className="text-sm text-sky-100/80 max-w-xs">
                    Jedno sterowanie: <strong>przytrzymaj palec na planszy</strong> albo klawisz{" "}
                    <strong>W</strong>. Zbieraj żółte gwiazdy, omijaj szare skały, nie spadnij na planetę i nie
                    odleć w kosmos.
                  </p>
                  <Button onClick={startGame}>Start</Button>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-rose-400">
                    {result?.outcome === "lost" ? "Odleciałeś w kosmos" : "Rozbicie"}
                  </p>
                  <p className="font-mono text-sky-100">
                    {result?.time.toFixed(1)} s · <span className="text-amber-300">{result?.score} pkt</span>
                  </p>
                  {result && result.score >= best && result.score > 0 && (
                    <p className="text-sm text-amber-300">Nowy rekord!</p>
                  )}
                  <Button onClick={startGame}>Jeszcze raz</Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-sky-200/50">
          <span>Rekord: {best} pkt</span>
          <span>
            Bezpieczna wysokość: {MIN_RADIUS - PLANET_RADIUS}–{MAX_RADIUS - PLANET_RADIUS}
          </span>
        </div>

        <PageFooter />
      </div>
    </div>
  );
};

export default OrbitGame;
