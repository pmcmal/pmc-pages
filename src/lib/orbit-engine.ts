// Fizyka gry "Orbita". Czysty moduł - zero DOM i zero canvasa, zeby dalo sie
// go przetestowac bez przegladarki.
//
// Gracz kraza wokol planety. Jedyne wejscie to "ciag": przytrzymanie odpycha
// statek na zewnatrz, puszczenie pozwala grawitacji sciagnac go z powrotem.
// Ciag dziala wylacznie promieniowo, wiec moment pedu sie nie zmienia - stad
// zachowanie przypomina prawdziwa orbite, a nie zwykle latanie.

export const PLANET_RADIUS = 70;
export const MIN_RADIUS = PLANET_RADIUS + 8;
export const MAX_RADIUS = 430;
export const START_RADIUS = 180;

/** Stala grawitacji dobrana tak, zeby okrazenie trwalo kilka sekund. */
const G = 3_732_480;
/**
 * Parametry sterowania. Wystawione, zeby dalo sie je przestroic pomiarem
 * w tescie, a nie na oko.
 */
export const TUNING = {
  /** Przyspieszenie od ciagu (px/s^2). */
  thrust: 200,
  /** Tlumienie promieniowe - bez niego orbita sie rozhustuje. */
  damping: 0.6,
};

export type Outcome = "flying" | "crashed" | "lost";

export interface Star {
  r: number;
  theta: number;
  taken: boolean;
}

export interface Rock {
  r: number;
  theta: number;
  omega: number;
}

export interface OrbitSnapshot {
  r: number;
  theta: number;
  vr: number;
  stars: Star[];
  rocks: Rock[];
  score: number;
  elapsed: number;
  outcome: Outcome;
}

const circularMomentum = (r: number) => Math.sqrt(G * r);

export class OrbitSim {
  r = START_RADIUS;
  theta = 0;
  vr = 0;
  /** Moment pedu. Ciag promieniowy go nie zmienia. */
  L = circularMomentum(START_RADIUS);

  stars: Star[] = [];
  rocks: Rock[] = [];
  score = 0;
  elapsed = 0;
  outcome: Outcome = "flying";

  private random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
    this.reset();
  }

  reset() {
    this.r = START_RADIUS;
    this.theta = 0;
    this.vr = 0;
    this.L = circularMomentum(START_RADIUS);
    this.score = 0;
    this.elapsed = 0;
    this.outcome = "flying";
    this.stars = [];
    this.rocks = [];
    for (let i = 0; i < 7; i++) this.spawnStar();
    for (let i = 0; i < 3; i++) this.spawnRock();
  }

  private spawnStar() {
    this.stars.push({
      r: 110 + this.random() * 260,
      theta: this.random() * Math.PI * 2,
      taken: false,
    });
  }

  private spawnRock() {
    // Skala nie moze sie pojawic na graczu ani tuz przed nim - bez tego
    // potrafila zabic w pierwszej klatce, zanim gracz cokolwiek zobaczyl.
    const SAFE_DISTANCE = 150;
    let r = 0;
    let theta = 0;
    for (let attempt = 0; attempt < 24; attempt++) {
      r = 130 + this.random() * 230;
      theta = this.random() * Math.PI * 2;
      if (this.distanceTo(r, theta) >= SAFE_DISTANCE) break;
    }
    this.rocks.push({
      r,
      theta,
      // skaly kraza po wlasnych orbitach, w obie strony
      omega: (circularMomentum(r) / (r * r)) * (this.random() < 0.5 ? -1 : 1),
    });
  }

  /** Trudnosc rosnie z czasem - co 20 sekund dochodzi skala. */
  private get targetRocks() {
    return 3 + Math.floor(this.elapsed / 20);
  }

  step(dt: number, thrusting: boolean) {
    if (this.outcome !== "flying") return;

    this.elapsed += dt;

    const gravity = G / (this.r * this.r);
    const centrifugal = (this.L * this.L) / (this.r * this.r * this.r);
    this.vr += (centrifugal - gravity) * dt;
    if (thrusting) this.vr += TUNING.thrust * dt;
    this.vr -= this.vr * TUNING.damping * dt;

    this.r += this.vr * dt;
    this.theta += (this.L / (this.r * this.r)) * dt;

    for (const rock of this.rocks) rock.theta += rock.omega * dt;

    if (this.r <= MIN_RADIUS) {
      this.outcome = "crashed";
      return;
    }
    if (this.r >= MAX_RADIUS) {
      this.outcome = "lost";
      return;
    }

    this.collectStars();
    this.checkRocks();

    while (this.rocks.length < this.targetRocks) this.spawnRock();
  }

  private collectStars() {
    for (const star of this.stars) {
      if (star.taken) continue;
      if (this.distanceTo(star.r, star.theta) < 26) {
        star.taken = true;
        this.score += 1;
      }
    }
    // zebrane gwiazdy wracaja gdzie indziej, zeby zawsze bylo po co leciec
    for (const star of this.stars) {
      if (!star.taken) continue;
      star.r = 110 + this.random() * 260;
      star.theta = this.random() * Math.PI * 2;
      star.taken = false;
    }
  }

  private checkRocks() {
    for (const rock of this.rocks) {
      if (this.distanceTo(rock.r, rock.theta) < 24) {
        this.outcome = "crashed";
        return;
      }
    }
  }

  /** Odleglosc gracza od punktu podanego biegunowo. */
  distanceTo(r: number, theta: number): number {
    const dx = Math.cos(this.theta) * this.r - Math.cos(theta) * r;
    const dy = Math.sin(this.theta) * this.r - Math.sin(theta) * r;
    return Math.hypot(dx, dy);
  }

  snapshot(): OrbitSnapshot {
    return {
      r: this.r,
      theta: this.theta,
      vr: this.vr,
      stars: this.stars,
      rocks: this.rocks,
      score: this.score,
      elapsed: this.elapsed,
      outcome: this.outcome,
    };
  }
}
