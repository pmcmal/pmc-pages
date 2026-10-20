import * as THREE from "three";

// Silnik gry "Tunel" - cala logika 3D siedzi tutaj, zeby komponent Reacta
// zajmowal sie tylko interfejsem. Nic tu nie dotyka DOM poza canvasem, ktory
// dostaje z zewnatrz.

export interface TunnelState {
  running: boolean;
  distance: number;
  orbs: number;
  speed: number;
}

/** Promien tunelu. Gracz lata wewnatrz, blisko sciany jest ciasno. */
const TUNNEL_RADIUS = 6;
const PLAYER_RADIUS = 0.45;
/** Odleglosc miedzy pierscieniami rysujacymi tunel. */
const RING_SPACING = 6;
const RING_COUNT = 48;
/** Jak daleko do przodu generujemy przeszkody. */
const GATE_SPACING = 26;
const GATE_COUNT = 10;
const ORB_COUNT = 24;

const START_SPEED = 26;
const MAX_SPEED = 72;
/** Jednostki na sekunde, o ile rosnie predkosc. */
const ACCEL = 0.9;

const BLADE_HALF_WIDTH = 0.55;

interface Gate {
  z: number;
  angles: number[];
  group: THREE.Group;
}

interface Orb {
  mesh: THREE.Mesh;
  taken: boolean;
}

/** Odleglosc punktu od odcinka srodek-krawedz pod katem `angle`. */
function distanceToBlade(px: number, py: number, angle: number): number {
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  // rzut punktu na kierunek ostrza, przyciety do dlugosci ostrza
  const t = Math.max(0, Math.min(TUNNEL_RADIUS, px * ax + py * ay));
  const cxp = ax * t;
  const cyp = ay * t;
  return Math.hypot(px - cxp, py - cyp);
}

export class TunnelGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private rings: THREE.LineLoop[] = [];
  private gates: Gate[] = [];
  private orbs: Orb[] = [];
  private ship: THREE.Group;
  private trail: THREE.Points;

  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private pz = 0;
  private speed = START_SPEED;
  private distance = 0;
  private orbCount = 0;
  private running = false;
  private raf = 0;
  private lastTime = 0;
  private hudTimer = 0;

  /** Wejscie w zakresie -1..1, ustawiane przez klawiature albo dotyk. */
  public input = { x: 0, y: 0 };

  constructor(
    canvas: HTMLCanvasElement,
    private onState: (state: TunnelState) => void,
    private onCrash: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setClearColor(0x05060f);

    this.camera = new THREE.PerspectiveCamera(78, 1, 0.1, 400);

    this.scene.fog = new THREE.Fog(0x05060f, 40, 230);
    this.scene.add(new THREE.AmbientLight(0x8899ff, 1.1));
    const key = new THREE.PointLight(0x55ccff, 180, 120);
    key.position.set(0, 0, 10);
    this.scene.add(key);

    this.buildTunnel();
    this.buildGates();
    this.buildOrbs();

    this.ship = this.buildShip();
    this.scene.add(this.ship);

    this.trail = this.buildTrail();
    this.scene.add(this.trail);
  }

  // ---------- budowa sceny ----------

  private buildTunnel() {
    const points: THREE.Vector3[] = [];
    const segments = 36;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * TUNNEL_RADIUS, Math.sin(a) * TUNNEL_RADIUS, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    for (let i = 0; i < RING_COUNT; i++) {
      const material = new THREE.LineBasicMaterial({
        color: i % 4 === 0 ? 0x4ad8ff : 0x1b3a66,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.LineLoop(geometry, material);
      ring.position.z = -i * RING_SPACING;
      this.rings.push(ring);
      this.scene.add(ring);
    }
  }

  private buildGates() {
    const bladeGeometry = new THREE.BoxGeometry(TUNNEL_RADIUS, BLADE_HALF_WIDTH * 2, 0.7);
    bladeGeometry.translate(TUNNEL_RADIUS / 2, 0, 0); // od srodka na zewnatrz

    for (let i = 0; i < GATE_COUNT; i++) {
      const group = new THREE.Group();
      const gate: Gate = { z: -120 - i * GATE_SPACING, angles: [], group };
      for (let b = 0; b < 3; b++) {
        const material = new THREE.MeshStandardMaterial({
          color: 0xff3366,
          emissive: 0x8a0f2c,
          emissiveIntensity: 0.9,
          roughness: 0.4,
        });
        group.add(new THREE.Mesh(bladeGeometry, material));
      }
      this.scene.add(group);
      this.gates.push(gate);
      this.randomizeGate(gate, gate.z);
    }
  }

  private buildOrbs() {
    const geometry = new THREE.IcosahedronGeometry(0.42, 0);
    for (let i = 0; i < ORB_COUNT; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffd34a,
        emissive: 0xffaa00,
        emissiveIntensity: 1.4,
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      const orb: Orb = { mesh, taken: false };
      this.orbs.push(orb);
      this.placeOrb(orb, -40 - i * 14);
    }
  }

  private buildShip(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2a7fa8, emissiveIntensity: 1.1 }),
    );
    body.rotation.x = -Math.PI / 2;
    group.add(body);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x66f0ff }),
    );
    glow.position.z = 0.8;
    group.add(glow);
    return group;
  }

  private buildTrail(): THREE.Points {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0x66f0ff, size: 0.16, transparent: true, opacity: 0.7 }),
    );
  }

  // ---------- rozmieszczanie ----------

  private randomizeGate(gate: Gate, z: number) {
    gate.z = z;
    const base = Math.random() * Math.PI * 2;
    gate.angles = [base, base + (Math.PI * 2) / 3, base + (Math.PI * 4) / 3];
    gate.group.position.z = z;
    gate.group.children.forEach((blade, i) => {
      blade.rotation.z = gate.angles[i];
    });
  }

  private placeOrb(orb: Orb, z: number) {
    // nie na samym srodku i nie przy scianie - tam gdzie trzeba sie troche wychylic
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.4 + Math.random() * (TUNNEL_RADIUS - 2.6);
    orb.mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
    orb.mesh.visible = true;
    orb.taken = false;
  }

  // ---------- cykl zycia ----------

  resize(width: number, height: number) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  start() {
    // Nie w srodku tunelu: tam zbiegaja sie wszystkie trzy ostrza, wiec gracz,
    // ktory nie zdazy ruszyc, rozbija sie na pierwszej bramce w 100% przypadkow.
    this.px = 0;
    this.py = 2.6;
    this.vx = 0;
    this.vy = 0;
    this.pz = 0;
    this.speed = START_SPEED;
    this.distance = 0;
    this.orbCount = 0;
    this.input = { x: 0, y: 0 };

    this.rings.forEach((ring, i) => (ring.position.z = -i * RING_SPACING));
    this.gates.forEach((gate, i) => this.randomizeGate(gate, -120 - i * GATE_SPACING));

    // Pierwsza bramka ustawiona tak, zeby pozycja startowa wypadala w luce -
    // ostrza na 30/150/270 stopni zostawiaja graczowi 2.25 jednostki zapasu.
    const first = this.gates[0];
    const base = Math.PI / 6;
    first.angles = [base, base + (Math.PI * 2) / 3, base + (Math.PI * 4) / 3];
    first.group.children.forEach((blade, i) => (blade.rotation.z = first.angles[i]));
    this.orbs.forEach((orb, i) => this.placeOrb(orb, -40 - i * 14));

    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.renderer.dispose();
  }

  // ---------- petla ----------

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.045, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.renderer.render(this.scene, this.camera);

    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.speed = Math.min(MAX_SPEED, this.speed + ACCEL * dt);
    this.pz -= this.speed * dt;
    this.distance += this.speed * dt;

    // Sterowanie: wejscie nadaje przyspieszenie, tarcie wygasza ruch. Dzieki
    // temu statek ma bezwladnosc zamiast skakac piksel w piksel za palcem.
    const accel = 52;
    const friction = 0.86;
    this.vx = (this.vx + this.input.x * accel * dt) * friction;
    this.vy = (this.vy + this.input.y * accel * dt) * friction;
    this.px += this.vx * dt * 12;
    this.py += this.vy * dt * 12;

    // odbicie od sciany tunelu
    const limit = TUNNEL_RADIUS - PLAYER_RADIUS - 0.15;
    const dist = Math.hypot(this.px, this.py);
    if (dist > limit) {
      const k = limit / dist;
      this.px *= k;
      this.py *= k;
      this.vx *= -0.25;
      this.vy *= -0.25;
    }

    this.recycleRings();
    this.updateGates();
    this.updateOrbs(dt);
    this.updateShip(dt);

    // HUD odswiezany 10 razy na sekunde, a nie co klatke. Wczesniej kazda
    // klatka wywolywala setState Reacta, wiec cala strona przerysowywala sie
    // 60 razy na sekunde - to bylo glowne obciazenie, nie samo 3D.
    this.hudTimer += dt;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.onState({
        running: this.running,
        distance: this.distance,
        orbs: this.orbCount,
        speed: this.speed,
      });
    }
  }

  private recycleRings() {
    const behind = this.pz + 12;
    for (const ring of this.rings) {
      if (ring.position.z > behind) ring.position.z -= RING_COUNT * RING_SPACING;
    }
  }

  private updateGates() {
    for (const gate of this.gates) {
      if (gate.z > this.pz + 12) {
        this.randomizeGate(gate, gate.z - GATE_COUNT * GATE_SPACING);
        continue;
      }
      // kolizja tylko w cienkim plastrze wokol plaszczyzny bramki
      if (Math.abs(gate.z - this.pz) < 0.9) {
        for (const angle of gate.angles) {
          if (distanceToBlade(this.px, this.py, angle) < BLADE_HALF_WIDTH + PLAYER_RADIUS) {
            this.running = false;
            cancelAnimationFrame(this.raf);
            this.onCrash();
            return;
          }
        }
      }
    }
  }

  private updateOrbs(dt: number) {
    for (const orb of this.orbs) {
      orb.mesh.rotation.x += dt * 2.2;
      orb.mesh.rotation.y += dt * 1.6;

      if (orb.mesh.position.z > this.pz + 12) {
        this.placeOrb(orb, orb.mesh.position.z - ORB_COUNT * 14);
        continue;
      }
      if (orb.taken) continue;
      if (
        Math.abs(orb.mesh.position.z - this.pz) < 1.2 &&
        Math.hypot(orb.mesh.position.x - this.px, orb.mesh.position.y - this.py) < 1.1
      ) {
        orb.taken = true;
        orb.mesh.visible = false;
        this.orbCount += 1;
      }
    }
  }

  private updateShip(dt: number) {
    this.ship.position.set(this.px, this.py, this.pz - 1.5);
    // przechyl w strone lotu - sam ruch czytelniej pokazuje kierunek
    this.ship.rotation.z = THREE.MathUtils.lerp(this.ship.rotation.z, -this.vx * 0.5, 0.15);
    this.ship.rotation.x = THREE.MathUtils.lerp(this.ship.rotation.x, this.vy * 0.3, 0.15);

    this.camera.position.set(this.px * 0.55, this.py * 0.55, this.pz + 7);
    this.camera.lookAt(this.px, this.py, this.pz - 18);

    const positions = this.trail.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;
    arr.copyWithin(3, 0, arr.length - 3);
    arr[0] = this.px;
    arr[1] = this.py;
    arr[2] = this.pz - 1.2;
    positions.needsUpdate = true;
    void dt;
  }
}
