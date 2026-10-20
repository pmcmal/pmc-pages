"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHomeButton } from "@/components/SiteHomeButton";
import { SiteControls } from "@/components/SiteControls";
import { PageFooter } from "@/components/PageFooter";
import {
  DIRECTIONS,
  FUSE_LEVELS,
  edgeKey,
  isFuse,
  parseLevel,
  type DirectionName,
  type ParsedLevel,
} from "@/lib/fuse-levels";

type Phase = "intro" | "playing" | "levelDone" | "won" | "lost";

interface Flame {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** 0..1 - ile przebyto biezacego odcinka */
  progress: number;
}

const COLORS = {
  bg: "#120d0a",
  grid: "#1d1512",
  rope: "#c89b5a",
  ropeDark: "#8a6636",
  burned: "#2a211c",
  bomb: "#1a1a1a",
  bombRing: "#555",
  lit: "#ff8c2b",
  flame: "#ffd24a",
  flameHot: "#ff6a1f",
};

const dirByName = (name: DirectionName) => DIRECTIONS.find((d) => d.name === name)!;
const opposite: Record<DirectionName, DirectionName> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const FuseGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [litCount, setLitCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(FUSE_LEVELS[0].time);
  const [best, setBest] = useState(0);

  // Stan rozgrywki trzymany w ref, bo petla animacji czyta go co klatke -
  // trzymanie tego w state powodowaloby przerysowanie Reacta 60 razy na sekunde.
  const levelRef = useRef<ParsedLevel | null>(null);
  const flameRef = useRef<Flame | null>(null);
  const dirRef = useRef<DirectionName>("right");
  const queuedRef = useRef<DirectionName | null>(null);
  const burnedRef = useRef<Set<string>>(new Set());
  const litRef = useRef<Set<string>>(new Set());
  /** Sekundy postoju na starcie - czas na wybranie pierwszego kierunku. */
  const waitRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  const timeRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const level = FUSE_LEVELS[levelIndex];

  const firstDirectionFrom = useCallback((parsed: ParsedLevel, x: number, y: number): DirectionName => {
    for (const d of DIRECTIONS) {
      if (isFuse(parsed, x + d.dx, y + d.dy)) return d.name;
    }
    return "right";
  }, []);

  const startLevel = useCallback(
    (index: number) => {
      const parsed = parseLevel(FUSE_LEVELS[index]);
      levelRef.current = parsed;
      burnedRef.current = new Set();
      litRef.current = new Set();
      queuedRef.current = null;

      // Plomien stoi chwile na starcie. Na planszach, gdzie z pola startowego
      // wychodza dwa lonty, bez tego gra wybralaby kierunek za gracza.
      dirRef.current = firstDirectionFrom(parsed, parsed.start.x, parsed.start.y);
      waitRef.current = 1.2;
      flameRef.current = {
        fromX: parsed.start.x,
        fromY: parsed.start.y,
        toX: parsed.start.x,
        toY: parsed.start.y,
        progress: 0,
      };

      timeRef.current = FUSE_LEVELS[index].time;
      setTimeLeft(FUSE_LEVELS[index].time);
      setLitCount(0);
      setLevelIndex(index);
      setPhase("playing");
    },
    [firstDirectionFrom],
  );

  const steer = useCallback((name: DirectionName) => {
    // Zawrocenie w miejscu nie ma sensu - za plomieniem lont juz nie istnieje.
    if (name === opposite[dirRef.current]) return;
    queuedRef.current = name;
  }, []);

  // --- sterowanie klawiatura ---
  useEffect(() => {
    const keyMap: Record<string, DirectionName> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = keyMap[e.key];
      if (!dir) return;
      e.preventDefault();
      steer(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer]);

  // --- sterowanie dotykiem: przesuniecie palcem po planszy ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0;
    let sy = 0;

    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    };

    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [steer]);

  // --- petla gry ---
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();

    const available = (parsed: ParsedLevel, x: number, y: number, name: DirectionName) => {
      const d = dirByName(name);
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (!isFuse(parsed, nx, ny)) return false;
      return !burnedRef.current.has(edgeKey(x, y, nx, ny));
    };

    const step = (now: number) => {
      const parsed = levelRef.current;
      const flame = flameRef.current;
      if (!parsed || !flame) return;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      timeRef.current -= dt;
      if (timeRef.current <= 0) {
        setTimeLeft(0);
        setPhase("lost");
        return;
      }
      setTimeLeft(timeRef.current);

      // Postoj na starcie: ruszamy, gdy gracz wskaze kierunek albo minie czas.
      if (waitRef.current > 0) {
        waitRef.current -= dt;
        const wish = queuedRef.current;
        const wishOk = wish !== null && available(parsed, flame.fromX, flame.fromY, wish);

        if (!wishOk && waitRef.current > 0) {
          raf = requestAnimationFrame(step);
          return;
        }

        const options = DIRECTIONS.map((d) => d.name).filter((n) =>
          available(parsed, flame.fromX, flame.fromY, n),
        );
        const chosen = wishOk ? wish : options[0];
        if (!chosen) {
          setPhase("lost");
          return;
        }
        waitRef.current = 0;
        queuedRef.current = null;
        dirRef.current = chosen;
        const d0 = dirByName(chosen);
        flame.toX = flame.fromX + d0.dx;
        flame.toY = flame.fromY + d0.dy;
        flame.progress = 0;
      }

      flame.progress += dt * level.speed;

      while (flame.progress >= 1) {
        flame.progress -= 1;

        // odcinek za plomieniem sie wypala
        burnedRef.current.add(edgeKey(flame.fromX, flame.fromY, flame.toX, flame.toY));

        const cx = flame.toX;
        const cy = flame.toY;

        if (parsed.cells[cy][cx] === "bomb") {
          const key = `${cx},${cy}`;
          if (!litRef.current.has(key)) {
            litRef.current.add(key);
            setLitCount(litRef.current.size);
            if (litRef.current.size === parsed.bombs.length) {
              setPhase(levelIndex + 1 < FUSE_LEVELS.length ? "levelDone" : "won");
              setBest((b) => Math.max(b, levelIndex + 1));
              return;
            }
          }
        }

        // 1) zyczenie gracza, 2) prosto, 3) jedyne wyjscie, 4) cokolwiek
        const wish = queuedRef.current;
        let next: DirectionName | null = null;
        if (wish && available(parsed, cx, cy, wish)) {
          next = wish;
          queuedRef.current = null;
        } else if (available(parsed, cx, cy, dirRef.current)) {
          next = dirRef.current;
        } else {
          const options = DIRECTIONS.map((d) => d.name).filter((n) => available(parsed, cx, cy, n));
          next = options[0] ?? null;
        }

        if (!next) {
          setPhase("lost");
          return;
        }

        dirRef.current = next;
        const d = dirByName(next);
        flame.fromX = cx;
        flame.fromY = cy;
        flame.toX = cx + d.dx;
        flame.toY = cy + d.dy;
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, level.speed, levelIndex]);

  // --- rysowanie ---
  useEffect(() => {
    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      const parsed = levelRef.current;
      if (!canvas || !wrap) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = wrap.clientWidth;
      const cols = parsed?.width ?? 9;
      const rows = parsed?.height ?? 6;
      const cell = Math.floor(width / cols);
      const height = cell * rows;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      if (!parsed) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const cx = (x: number) => x * cell + cell / 2;
      const cy = (y: number) => y * cell + cell / 2;
      const rope = Math.max(3, Math.floor(cell * 0.26));

      // odcinki lontu
      for (let y = 0; y < parsed.height; y++) {
        for (let x = 0; x < parsed.width; x++) {
          if (parsed.cells[y][x] === "empty") continue;
          for (const d of DIRECTIONS) {
            const nx = x + d.dx;
            const ny = y + d.dy;
            if (!isFuse(parsed, nx, ny)) continue;
            if (nx < x || ny < y) continue; // kazdy odcinek rysujemy raz
            const burned = burnedRef.current.has(edgeKey(x, y, nx, ny));
            ctx.fillStyle = burned ? COLORS.burned : COLORS.rope;
            const x0 = Math.min(cx(x), cx(nx)) - rope / 2;
            const y0 = Math.min(cy(y), cy(ny)) - rope / 2;
            const w = Math.abs(cx(nx) - cx(x)) + rope;
            const h = Math.abs(cy(ny) - cy(y)) + rope;
            ctx.fillRect(Math.floor(x0), Math.floor(y0), Math.ceil(w), Math.ceil(h));
            if (!burned) {
              // ciemniejszy splot, zeby lont nie byl plaska krecha
              ctx.fillStyle = COLORS.ropeDark;
              const stepPx = Math.max(4, Math.floor(rope * 0.9));
              if (ny === y) {
                for (let px = Math.floor(x0); px < x0 + w; px += stepPx * 2) {
                  ctx.fillRect(px, Math.floor(y0 + rope * 0.35), stepPx, Math.max(1, Math.floor(rope * 0.3)));
                }
              } else {
                for (let py = Math.floor(y0); py < y0 + h; py += stepPx * 2) {
                  ctx.fillRect(Math.floor(x0 + rope * 0.35), py, Math.max(1, Math.floor(rope * 0.3)), stepPx);
                }
              }
            }
          }
        }
      }

      // ladunki
      for (const b of parsed.bombs) {
        const lit = litRef.current.has(`${b.x},${b.y}`);
        const r = Math.floor(cell * 0.3);
        ctx.fillStyle = lit ? COLORS.lit : COLORS.bomb;
        ctx.beginPath();
        ctx.arc(cx(b.x), cy(b.y), r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = lit ? COLORS.flame : COLORS.bombRing;
        ctx.lineWidth = Math.max(2, Math.floor(cell * 0.06));
        ctx.stroke();
      }

      // start
      ctx.strokeStyle = "#6ad36a";
      ctx.lineWidth = Math.max(2, Math.floor(cell * 0.06));
      ctx.strokeRect(
        parsed.start.x * cell + cell * 0.22,
        parsed.start.y * cell + cell * 0.22,
        cell * 0.56,
        cell * 0.56,
      );

      // plomien
      const flame = flameRef.current;
      if (flame && phaseRef.current === "playing") {
        const fx = cx(flame.fromX) + (cx(flame.toX) - cx(flame.fromX)) * flame.progress;
        const fy = cy(flame.fromY) + (cy(flame.toY) - cy(flame.fromY)) * flame.progress;
        const flick = 0.75 + Math.random() * 0.35;
        ctx.fillStyle = COLORS.flameHot;
        ctx.beginPath();
        ctx.arc(fx, fy, cell * 0.3 * flick, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.flame;
        ctx.beginPath();
        ctx.arc(fx, fy, cell * 0.16 * flick, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bombsTotal = levelRef.current?.bombs.length ?? 0;
  const timePercent = Math.max(0, Math.min(100, (timeLeft / level.time) * 100));

  return (
    <div className="min-h-screen bg-[#120d0a] text-amber-100 p-4 pt-16 sm:pt-4">
      <SiteHomeButton />
      <SiteControls />

      <div className="container mx-auto max-w-2xl">
        <header className="text-center mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.2em] uppercase text-amber-400">Lont</h1>
          <p className="text-sm text-amber-200/70 mt-1">
            Prowadź ogień przez wszystkie ładunki, zanim lont się wypali.
          </p>
        </header>

        <div className="flex items-center justify-between text-sm mb-2 font-mono">
          <span>
            {levelIndex + 1}/{FUSE_LEVELS.length} · {level.name}
          </span>
          <span>
            ŁADUNKI {litCount}/{bombsTotal}
          </span>
        </div>

        <div className="h-2 w-full bg-amber-950 rounded mb-3 overflow-hidden">
          <div
            className={`h-full transition-[width] duration-100 ${timePercent < 25 ? "bg-red-500" : "bg-amber-400"}`}
            style={{ width: `${timePercent}%` }}
          />
        </div>

        <div ref={wrapRef} className="relative w-full border-2 border-amber-900/60 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="block w-full touch-none" />

          {phase !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center px-6">
              {phase === "intro" && (
                <>
                  <p className="text-xl font-bold text-amber-300">Gotowy?</p>
                  <p className="text-sm text-amber-100/80">
                    Ogień idzie sam. Ty wybierasz kierunek na rozwidleniach — strzałkami, WSAD
                    albo przesuwając palcem po planszy. Na starcie masz chwilę, żeby wskazać
                    pierwszy kierunek.
                  </p>
                  <Button onClick={() => startLevel(0)}>Zaczynamy</Button>
                </>
              )}
              {phase === "levelDone" && (
                <>
                  <p className="text-xl font-bold text-amber-300">Wszystkie ładunki odpalone!</p>
                  <Button onClick={() => startLevel(levelIndex + 1)}>Następna plansza</Button>
                </>
              )}
              {phase === "won" && (
                <>
                  <p className="text-xl font-bold text-amber-300">Koniec — przeszedłeś wszystkie plansze.</p>
                  <Button onClick={() => startLevel(0)}>Jeszcze raz</Button>
                </>
              )}
              {phase === "lost" && (
                <>
                  <p className="text-xl font-bold text-red-400">
                    {timeLeft <= 0 ? "Lont się wypalił." : "Ogień utknął w ślepym zaułku."}
                  </p>
                  <p className="text-sm text-amber-100/70">Najdalej: plansza {Math.max(best, 1)}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => startLevel(levelIndex)}>Jeszcze raz</Button>
                    <Button variant="outline" onClick={() => startLevel(0)}>
                      Od początku
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Krzyzak dla telefonow - przesuwanie palcem dziala, ale nie kazdy na nie wpadnie */}
        <div className="mt-4 grid grid-cols-3 gap-2 w-44 mx-auto sm:hidden select-none">
          <span />
          <Button variant="outline" size="lg" onClick={() => steer("up")} aria-label="W górę">
            ▲
          </Button>
          <span />
          <Button variant="outline" size="lg" onClick={() => steer("left")} aria-label="W lewo">
            ◀
          </Button>
          <span />
          <Button variant="outline" size="lg" onClick={() => steer("right")} aria-label="W prawo">
            ▶
          </Button>
          <span />
          <Button variant="outline" size="lg" onClick={() => steer("down")} aria-label="W dół">
            ▼
          </Button>
          <span />
        </div>

        <p className="text-xs text-amber-200/50 text-center mt-4">
          Spalony lont nie zapali się drugi raz — ale skrzyżowanie możesz przeciąć dwa razy, raz w każdą stronę.
        </p>

        <PageFooter />
      </div>
    </div>
  );
};

export default FuseGame;
