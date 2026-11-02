// Flujo cinematográfico de la escena en el cielo (optimizado: cero asignaciones por fotograma):
// 1) 0s - 3s: Solo el fondo del atardecer y el mar en movimiento.
// 2) 3s - 5.8s: Aparecen poco a poco todas las partículas y papeles en el cielo.
// 3) 5.8s - 9.0s: Las partículas viajan y forman las grandes calaveras ("A" y "O") y el corazón.
// 4) 9.0s+: Aparece suavemente "ANAHÍ Y OLIVER" con tipografía elegante flotando arriba del corazón.
import { gsap } from "gsap";

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let running = false;

const elements = [];
const bgParticles = [];
const fallingPapers = [];

// Estado maestro de la secuencia animada
const sequence = {
  particlesReveal: 0, // 0 -> 1: aparición progresiva de todas las partículas tras los 3s
  assemble: 0,        // 0 -> 1: unión de las partículas para formar calaveras y corazón
  linesAlpha: 0       // 0 -> 1: encendido de las líneas iluminadas al formarse
};

function cubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return [
    uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
    uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1]
  ];
}

function initBackgroundParticles() {
  bgParticles.length = 0;
  const palette = [
    { core: "#fffdf0", glow: "rgba(255, 224, 132, 0.55)" },
    { core: "#ffe6f7", glow: "rgba(214, 92, 188, 0.55)" },
    { core: "#fff0dc", glow: "rgba(255, 152, 72, 0.55)" },
    { core: "#f5d6ff", glow: "rgba(168, 78, 212, 0.52)" }
  ];

  for (let i = 0; i < 95; i += 1) {
    const s1 = Math.sin(i * 127.1 + 19.3) * 43758.5453;
    const s2 = Math.sin(i * 269.5 + 71.7) * 43758.5453;
    const rx = s1 - Math.floor(s1);
    const ry = s2 - Math.floor(s2);
    const col = palette[i % palette.length];

    bgParticles.push({
      x: rx,
      y: ry * 0.78,
      size: 1.3 + (i % 4) * 0.65,
      speedX: (i % 2 === 0 ? 1 : -1) * (0.002 + (i % 5) * 0.0008),
      ampY: 4 + (i % 6) * 2.5,
      phase: i * 0.77,
      appearThreshold: (i / 95) * 0.78,
      coreColor: col.core,
      glowColor: col.glow
    });
  }

  fallingPapers.length = 0;
  const paperPalette = [
    "#ff9422",
    "#9e3686",
    "#ffb636",
    "#7b266a",
    "#f26422",
    "#bc4ca0"
  ];

  for (let i = 0; i < 42; i += 1) {
    const s1 = Math.sin(i * 91.7 + 43.1) * 43758.5453;
    const s2 = Math.sin(i * 173.3 + 11.9) * 43758.5453;
    const rx = s1 - Math.floor(s1);
    const ry = s2 - Math.floor(s2);

    fallingPapers.push({
      baseX: rx,
      baseY: ry,
      w: 7 + (i % 4) * 2.4,
      h: 5 + (i % 3) * 2.0,
      fallSpeed: 0.022 + (i % 5) * 0.006,
      driftSpeed: 0.012 + (i % 4) * 0.004,
      swayAmp: 16 + (i % 5) * 6,
      swayFreq: 0.8 + (i % 4) * 0.25,
      rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.7 + (i % 3) * 0.3),
      flipSpeed: 1.4 + (i % 5) * 0.35,
      phase: i * 1.13,
      appearThreshold: 0.15 + (i / 42) * 0.75,
      shape: i % 3,
      fill: paperPalette[i % paperPalette.length]
    });
  }
}

function createCalaveraBlueprint(letter = "A") {
  const norm = ([x, y]) => [(x - 120) / 110, (y - 134) / 110];
  const groups = [];

  const sampleCurve = (p0, p1, p2, p3, steps) => {
    const pts = [];
    for (let i = 0; i < steps; i += 1) {
      pts.push(norm(cubicBezier(p0, p1, p2, p3, i / steps)));
    }
    return pts;
  };

  // 1. Contorno exterior del cráneo y mandíbula
  const outline = [
    ...sampleCurve([120, 18], [63, 18], [29, 57], [29, 112], 14),
    ...sampleCurve([29, 112], [29, 150], [46, 179], [72, 194], 9),
    norm([74, 206]),
    norm([76, 216]),
    ...sampleCurve([77, 224], [80, 244], [95, 254], [120, 254], 7),
    ...sampleCurve([120, 254], [145, 254], [160, 244], [163, 224], 7),
    norm([164, 216]),
    norm([166, 206]),
    ...sampleCurve([168, 194], [194, 179], [211, 150], [211, 112], 9),
    ...sampleCurve([211, 112], [211, 57], [177, 18], [120, 18], 14)
  ];
  groups.push({
    points: outline,
    closed: true,
    coreColor: "#fffdf2",
    glowColor: "rgba(255, 226, 148, 0.55)",
    lineColor: "rgba(255, 244, 205, 0.72)",
    size: 2.5
  });

  // 2. Arco de filigrana en la frente
  const arch = sampleCurve([44, 86], [75, 37], [165, 37], [196, 86], 15);
  arch.push(norm([196, 86]));
  groups.push({
    points: arch,
    closed: false,
    coreColor: "#fff4c8",
    glowColor: "rgba(255, 182, 72, 0.55)",
    lineColor: "rgba(255, 210, 118, 0.68)",
    size: 2.1
  });

  // 3. Tres flores de cempasúchil en la coronilla
  [
    [58, 53, 17, 10],
    [120, 29, 19, 12],
    [182, 53, 17, 10]
  ].forEach(([cx, cy, r, count]) => {
    const ring = [];
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      ring.push(norm([cx + Math.cos(a) * r, cy + Math.sin(a) * r]));
    }
    groups.push({
      points: ring,
      closed: true,
      coreColor: "#fff6cc",
      glowColor: "rgba(255, 190, 55, 0.60)",
      lineColor: "rgba(255, 218, 102, 0.68)",
      size: 2.2
    });
    groups.push({
      points: [norm([cx, cy])],
      closed: false,
      coreColor: "#ffffff",
      glowColor: "rgba(255, 232, 125, 0.80)",
      lineColor: "transparent",
      size: 3.4
    });
  });

  // 4. Inicial "A" (Anahí) o "O" (Oliver) en la frente
  if (letter === "A") {
    const letterALegs = [
      norm([103, 93]),
      norm([108, 82]),
      norm([112, 71]),
      norm([116, 61]),
      norm([120, 52]),
      norm([124, 61]),
      norm([128, 71]),
      norm([132, 82]),
      norm([137, 93])
    ];
    const letterABar = [norm([109, 79]), norm([120, 79]), norm([131, 79])];
    groups.push({
      points: letterALegs,
      closed: false,
      coreColor: "#ffffff",
      glowColor: "rgba(255, 138, 168, 0.82)",
      lineColor: "rgba(255, 212, 224, 0.92)",
      size: 2.4
    });
    groups.push({
      points: letterABar,
      closed: false,
      coreColor: "#ffffff",
      glowColor: "rgba(255, 138, 168, 0.82)",
      lineColor: "rgba(255, 212, 224, 0.92)",
      size: 2.3
    });
  } else {
    const letterORing = [];
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      letterORing.push(norm([120 + Math.cos(a) * 15, 73 + Math.sin(a) * 19]));
    }
    groups.push({
      points: letterORing,
      closed: true,
      coreColor: "#ffffff",
      glowColor: "rgba(255, 138, 168, 0.82)",
      lineColor: "rgba(255, 212, 224, 0.92)",
      size: 2.4
    });
  }

  // 5. Ojos de cempasúchil con doble anillo y pupila en forma de corazón
  [78, 162].forEach((ex) => {
    const ey = 126;
    const outerEye = [];
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      outerEye.push(norm([ex + Math.cos(a) * 34, ey + Math.sin(a) * 34]));
    }
    groups.push({
      points: outerEye,
      closed: true,
      coreColor: "#fff4c4",
      glowColor: "rgba(255, 172, 62, 0.62)",
      lineColor: "rgba(255, 210, 110, 0.74)",
      size: 2.4
    });

    const innerRing = [];
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      innerRing.push(norm([ex + Math.cos(a) * 19, ey + Math.sin(a) * 19]));
    }
    groups.push({
      points: innerRing,
      closed: true,
      coreColor: "#fff8d6",
      glowColor: "rgba(255, 208, 92, 0.52)",
      lineColor: "rgba(255, 228, 142, 0.62)",
      size: 1.9
    });

    const heartEye = [];
    for (let i = 0; i < 12; i += 1) {
      const t = (i / 12) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3) * 0.72;
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.72;
      heartEye.push(norm([ex + hx, ey + hy]));
    }
    groups.push({
      points: heartEye,
      closed: true,
      coreColor: "#ffffff",
      glowColor: "rgba(255, 236, 148, 0.75)",
      lineColor: "rgba(255, 248, 200, 0.82)",
      size: 2.1
    });
  });

  // 6. Nariz tradicional
  const nose = [
    norm([120, 139]),
    norm([113, 152]),
    norm([106, 164]),
    norm([120, 173]),
    norm([134, 164]),
    norm([127, 152])
  ];
  groups.push({
    points: nose,
    closed: true,
    coreColor: "#fff0e8",
    glowColor: "rgba(255, 152, 132, 0.55)",
    lineColor: "rgba(255, 198, 180, 0.68)",
    size: 2.0
  });

  // 7. Sonrisa y líneas de dientes
  const smileTop = sampleCurve([77, 191], [100, 209], [140, 209], [163, 191], 11);
  smileTop.push(norm([163, 191]));
  groups.push({
    points: smileTop,
    closed: false,
    coreColor: "#fffaf0",
    glowColor: "rgba(255, 224, 162, 0.58)",
    lineColor: "rgba(255, 242, 204, 0.72)",
    size: 2.1
  });

  const smileBottom = sampleCurve([92, 206], [105, 224], [135, 224], [148, 206], 9);
  smileBottom.push(norm([148, 206]));
  groups.push({
    points: smileBottom,
    closed: false,
    coreColor: "#fff2dc",
    glowColor: "rgba(255, 196, 148, 0.52)",
    lineColor: "rgba(255, 224, 188, 0.64)",
    size: 1.9
  });

  const cheekDots = [
    norm([43, 125]),
    norm([53, 164]),
    norm([197, 125]),
    norm([187, 164]),
    norm([120, 204]),
    norm([120, 226])
  ];
  groups.push({
    points: cheekDots,
    closed: false,
    coreColor: "#fff0f4",
    glowColor: "rgba(255, 132, 162, 0.70)",
    lineColor: "transparent",
    size: 2.5
  });

  return groups;
}

function createHeartBlueprint() {
  const outerHeart = [];
  const innerHeart = [];
  for (let i = 0; i < 32; i += 1) {
    const t = (i / 32) * Math.PI * 2;
    const hx = (16 * Math.pow(Math.sin(t), 3)) / 16.5;
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16.5;
    outerHeart.push([hx, hy]);
    if (i % 2 === 0) innerHeart.push([hx * 0.55, hy * 0.55]);
  }
  return [
    {
      points: outerHeart,
      closed: true,
      coreColor: "#fff2f5",
      glowColor: "rgba(255, 128, 152, 0.72)",
      lineColor: "rgba(255, 196, 208, 0.82)",
      size: 2.6
    },
    {
      points: innerHeart,
      closed: true,
      coreColor: "#fffbe6",
      glowColor: "rgba(255, 224, 128, 0.68)",
      lineColor: "rgba(255, 242, 186, 0.76)",
      size: 2.1
    }
  ];
}

// Flor de Cempasúchil sagrada para la escena de los deseos ("voyage")
function createCempasuchilBlueprint() {
  const outerPetals = [];
  const midPetals = [];
  const innerRing = [];
  const totalOuter = 64;
  for (let i = 0; i < totalOuter; i += 1) {
    const a = (i / totalOuter) * Math.PI * 2;
    const r = 0.72 + 0.22 * Math.abs(Math.cos(6 * a));
    outerPetals.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const totalMid = 48;
  for (let i = 0; i < totalMid; i += 1) {
    const a = (i / totalMid) * Math.PI * 2 + Math.PI / 12;
    const r = 0.44 + 0.16 * Math.abs(Math.cos(6 * a));
    midPetals.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = 0; i < 20; i += 1) {
    const a = (i / 20) * Math.PI * 2;
    innerRing.push([Math.cos(a) * 0.22, Math.sin(a) * 0.22]);
  }
  return [
    {
      points: outerPetals,
      closed: true,
      coreColor: "#fff7e2",
      glowColor: "rgba(255, 188, 72, 0.74)",
      lineColor: "rgba(255, 224, 132, 0.85)",
      size: 2.5
    },
    {
      points: midPetals,
      closed: true,
      coreColor: "#ffe49e",
      glowColor: "rgba(255, 142, 68, 0.68)",
      lineColor: "rgba(255, 198, 118, 0.78)",
      size: 2.2
    },
    {
      points: innerRing,
      closed: true,
      coreColor: "#fffdf0",
      glowColor: "rgba(255, 128, 152, 0.72)",
      lineColor: "rgba(255, 212, 182, 0.82)",
      size: 2.3
    }
  ];
}

// Estrella de los deseos de 8 puntas para el centro de "voyage"
function createStarBlueprint() {
  const starOuter = [];
  const innerDiamond = [];
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 0.96 : 0.42;
    starOuter.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    innerDiamond.push([Math.cos(a) * 0.28, Math.sin(a) * 0.28]);
  }
  return [
    {
      points: starOuter,
      closed: true,
      coreColor: "#fffbe8",
      glowColor: "rgba(255, 214, 102, 0.78)",
      lineColor: "rgba(255, 238, 168, 0.86)",
      size: 2.6
    },
    {
      points: innerDiamond,
      closed: true,
      coreColor: "#fff0f5",
      glowColor: "rgba(255, 132, 158, 0.72)",
      lineColor: "rgba(255, 204, 216, 0.8)",
      size: 2.1
    }
  ];
}

// Mariposa monarca / alma de luz para la escena de la carta ("letter")
function createButterflyBlueprint() {
  const wings = [];
  const innerFiligree = [];
  const total = 64;
  for (let i = 0; i < total; i += 1) {
    const t = (i / total) * Math.PI * 2;
    const r = (Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2 * t - Math.PI) / 24), 5)) * 0.25;
    wings.push([Math.cos(t) * r, -Math.sin(t) * r * 0.92]);
    if (i % 2 === 0) {
      innerFiligree.push([Math.cos(t) * r * 0.56, -Math.sin(t) * r * 0.52]);
    }
  }
  return [
    {
      points: wings,
      closed: true,
      coreColor: "#fff8e8",
      glowColor: "rgba(255, 176, 76, 0.74)",
      lineColor: "rgba(255, 222, 142, 0.84)",
      size: 2.4
    },
    {
      points: innerFiligree,
      closed: true,
      coreColor: "#fff0f5",
      glowColor: "rgba(255, 128, 158, 0.68)",
      lineColor: "rgba(255, 198, 212, 0.76)",
      size: 2.0
    }
  ];
}

// Infinito de luz para acompañar la carta y el cierre
function createInfinityBlueprint() {
  const loop = [];
  for (let i = 0; i < 40; i += 1) {
    const t = (i / 40) * Math.PI * 2;
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x = (1.12 * Math.cos(t)) / denom;
    const y = (0.95 * Math.sin(t) * Math.cos(t)) / denom;
    loop.push([x, y]);
  }
  return [
    {
      points: loop,
      closed: true,
      coreColor: "#fff8eb",
      glowColor: "rgba(255, 204, 112, 0.76)",
      lineColor: "rgba(255, 234, 168, 0.86)",
      size: 2.5
    }
  ];
}

function createInstance(blueprint, offsetXFactor, offsetYFactor, scaleFactor, tiltDeg) {
  const inst = {
    offsetXFactor,
    offsetYFactor,
    scaleFactor,
    baseTilt: (tiltDeg * Math.PI) / 180,
    groups: []
  };

  let seed = 0;
  blueprint.forEach((g) => {
    const particles = g.points.map(([tx, ty]) => {
      seed += 1;
      const angle = seed * 2.39996;
      const dist = 0.85 + ((seed * 41) % 100) / 55;
      return {
        tx,
        ty,
        sx: tx + Math.cos(angle) * dist,
        sy: ty + Math.sin(angle) * dist - 0.12,
        screenX: 0,
        screenY: 0,
        screenAlpha: 0,
        phase: seed * 0.38,
        appearThreshold: ((seed * 19) % 100) / 135,
        size: g.size,
        coreColor: g.coreColor,
        glowColor: g.glowColor
      };
    });
    inst.groups.push({
      closed: g.closed,
      lineColor: g.lineColor,
      glowColor: g.glowColor,
      particles
    });
  });

  return inst;
}

function startMasterTimeline() {
  const skyPetals = document.getElementById("sky-petals");
  const preloader = document.getElementById("preloader");

  if (motionQuery.matches) {
    preloader?.classList.add("is-hidden");
    sequence.particlesReveal = 1;
    sequence.assemble = 1;
    sequence.linesAlpha = 1;
    return;
  }

  if (skyPetals) {
    gsap.set(skyPetals, { opacity: 0 });
  }

  const heroTitle = document.getElementById("hero-title");
  const introMeta = document.getElementById("intro-meta");
  const startBtn = document.getElementById("start");
  const backLink = document.getElementById("back-link");
  const musicToggle = document.getElementById("music-toggle");
  if (heroTitle) {
    gsap.set(heroTitle, { opacity: 0, y: -10 });
  }
  if (introMeta) {
    gsap.set(introMeta, { opacity: 0, y: -6 });
  }
  if (startBtn) {
    gsap.set(startBtn, { opacity: 0, y: 10, pointerEvents: "none" });
  }
  if (backLink) {
    gsap.set(backLink, { opacity: 0, y: -8 });
  }
  if (musicToggle) {
    gsap.set(musicToggle, { opacity: 0, y: -8 });
  }

  const seascape = document.querySelector(".seascape");
  if (seascape) {
    gsap.set(seascape, { scale: 1.035 });
  }

  const launchSceneFlow = () => {
    const tl = gsap.timeline();
    tl.set(sequence, { particlesReveal: 0, assemble: 0, linesAlpha: 0 });

    // 1. Transición cinematográfica y suave desde la calavera de carga hacia el mar (0s - 2.4s)
    if (preloader) {
      const inner = preloader.querySelector(".preloader-inner");
      if (inner) {
        tl.to(inner, {
          opacity: 0,
          y: -14,
          scale: 1.06,
          duration: 1.25,
          ease: "sine.inOut"
        }, 0);
      }
      tl.to(preloader, {
        opacity: 0,
        duration: 2.2,
        ease: "sine.inOut",
        onComplete: () => {
          preloader.classList.add("is-hidden");
          preloader.remove();
        }
      }, 0.3);
    }

    if (seascape) {
      tl.to(seascape, {
        scale: 1,
        duration: 2.8,
        ease: "sine.out"
      }, 0.2);
    }

    // 2. Después de abrirse el telón, quedan 3 segundos completos de solo el mar y atardecer (hasta 4.8s)
    if (skyPetals) {
      tl.to(skyPetals, { opacity: 1, duration: 2.6, ease: "sine.inOut" }, 4.8);
    }

    // 3. Salen poco a poco todas las partículas (4.8s - 7.6s)
    tl.to(sequence, {
      particlesReveal: 1,
      duration: 2.8,
      ease: "sine.inOut"
    }, 4.8)
    // 4. Se forman las calaveras ("A" y "O") y el corazón (7.6s - 10.8s)
    .to(sequence, {
      assemble: 1,
      duration: 3.2,
      ease: "power3.inOut"
    }, 7.6)
    .to(sequence, {
      linesAlpha: 1,
      duration: 1.8,
      ease: "power2.out"
    }, 9.0);

    // 5. Aparece la placa permanente de "ANAHÍ Y OLIVER" y los datos de inicio (10.8s)
    if (heroTitle) {
      tl.to(heroTitle, {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: "power2.out"
      }, 10.8);
    }
    if (introMeta) {
      tl.to(introMeta, {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: "power2.out"
      }, 11.0);
    }

    // 6. Aparecen el botón debajo del corazón y el botón superior izquierdo de cartas (11.3s)
    if (startBtn) {
      tl.to(startBtn, {
        opacity: 1,
        y: 0,
        pointerEvents: "auto",
        duration: 1.3,
        ease: "power2.out"
      }, 11.3);
    }
    if (backLink) {
      tl.to(backLink, {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: "power2.out"
      }, 11.3);
    }
    if (musicToggle) {
      tl.to(musicToggle, {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: "power2.out"
      }, 11.3);
    }
  };

  // Esperamos a que las fuentes y el primer fotograma estén listos (con fallback de 800ms si las fuentes tardan)
  const minWait = new Promise((resolve) => setTimeout(resolve, 1300));
  const fontsReady = Promise.race([
    document.fonts?.ready || Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 800))
  ]);
  Promise.all([minWait, fontsReady]).then(launchSceneFlow);
}

const scenePresets = {};
let morphTimeline = null;

function applyScenePreset(sceneName) {
  const preset = scenePresets[sceneName] || scenePresets.intro;
  if (!preset) return;
  elements.length = 0;
  for (let i = 0; i < preset.length; i += 1) {
    elements.push(preset[i]);
  }
}

export function transitionConstellationForScene(sceneName) {
  if (!scenePresets.intro) return;
  if (motionQuery.matches) {
    applyScenePreset(sceneName);
    sequence.particlesReveal = 1;
    sequence.assemble = 1;
    sequence.linesAlpha = 1;
    render(3.2);
    return;
  }

  morphTimeline?.kill();
  sequence.particlesReveal = 1;

  // 1. Se desarman las figuras actuales en partículas flotantes y luego se vuelven a formar con las figuras de la nueva escena
  morphTimeline = gsap.timeline();
  morphTimeline
    .to(sequence, {
      linesAlpha: 0,
      duration: 0.35,
      ease: "power2.in"
    }, 0)
    .to(sequence, {
      assemble: 0,
      duration: 0.85,
      ease: "power2.inOut",
      onComplete: () => {
        applyScenePreset(sceneName);
      }
    }, 0)
    .to(sequence, {
      assemble: 1,
      duration: 1.55,
      ease: "power3.out"
    }, 0.88)
    .to(sequence, {
      linesAlpha: 1,
      duration: 1.0,
      ease: "power2.out"
    }, 1.45);
}

function buildSceneConstellations() {
  initBackgroundParticles();

  const skullAnahi = createCalaveraBlueprint("A");
  const skullOliver = createCalaveraBlueprint("O");
  const heartBp = createHeartBlueprint();
  const cempasuchilBp = createCempasuchilBlueprint();
  const starBp = createStarBlueprint();
  const butterflyBp = createButterflyBlueprint();
  const infinityBp = createInfinityBlueprint();

  // Escena 1 (intro): Calavera "A" + Corazón + Calavera "O"
  scenePresets.intro = [
    createInstance(skullAnahi, -1.28, 0.04, 1.0, 6),
    createInstance(heartBp, 0.0, 0.05, 0.45, 0),
    createInstance(skullOliver, 1.28, 0.04, 1.0, -6)
  ];

  // Escena 2 (voyage - Tres deseos al mar): Dos grandes Flores de Cempasúchil + Estrella de los Deseos
  scenePresets.voyage = [
    createInstance(cempasuchilBp, -1.32, 0.02, 0.96, 8),
    createInstance(starBp, 0.0, 0.02, 0.52, 0),
    createInstance(cempasuchilBp, 1.32, 0.02, 0.96, -8)
  ];

  // Escena 2.5 (ritual - Pétalos de deseo y Sobre sellado): Cempasúchiles de luz + Corazón central
  scenePresets.ritual = [
    createInstance(cempasuchilBp, -1.34, 0.0, 0.92, 10),
    createInstance(heartBp, 0.0, 0.02, 0.44, 0),
    createInstance(cempasuchilBp, 1.34, 0.0, 0.92, -10)
  ];

  // Escena 3 (letter - La Carta): Dos Mariposas Monarca de Luz + Símbolo de Infinito
  scenePresets.letter = [
    createInstance(butterflyBp, -1.34, 0.0, 0.95, 12),
    createInstance(infinityBp, 0.0, -0.02, 0.54, 0),
    createInstance(butterflyBp, 1.34, 0.0, 0.95, -12)
  ];

  // Escena 4 (finale - Cierre): Calaveras "A" y "O" + Infinito Eterno Central
  scenePresets.finale = [
    createInstance(skullAnahi, -1.28, 0.04, 1.0, 6),
    createInstance(infinityBp, 0.0, 0.05, 0.56, 0),
    createInstance(skullOliver, 1.28, 0.04, 1.0, -6)
  ];

  applyScenePreset("intro");
  startMasterTimeline();
}

function render(time) {
  if (!ctx || width < 2 || height < 2) return;
  ctx.clearRect(0, 0, width, height);

  if (sequence.particlesReveal <= 0.001) return;

  const isPortrait = height > width;
  const isMobile = width <= 599;
  const isTablet = width >= 600 && width <= 1180;
  const isShortLandscape = width > height && height <= 540;
  const anchorX = width * 0.50;
  const anchorY = height * (isShortLandscape ? 0.47 : isPortrait ? 0.44 : 0.44);
  const widthFactor = isPortrait ? 0.184 : isTablet ? 0.134 : 0.112;
  const heightFactor = isShortLandscape ? 0.19 : isPortrait ? 0.195 : 0.215;
  const rawRadius = Math.min(width * widthFactor, height * heightFactor);
  const minRadius = isShortLandscape ? 44 : isMobile ? 56 : 78;
  const baseRadius = Math.min(Math.max(rawRadius, minRadius), 152);
  const spreadFactor = isPortrait ? 1.13 : 1.16;
  const scaleBoost = Math.max(0.66, baseRadius / 105);

  const reveal = sequence.particlesReveal;
  const form = sequence.assemble;
  const lineFade = sequence.linesAlpha;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Partículas luminosas de fondo
  for (let i = 0; i < bgParticles.length; i += 1) {
    const bp = bgParticles[i];
    const pAlpha = Math.max(0, Math.min(1, (reveal - bp.appearThreshold) / 0.22));
    if (pAlpha <= 0.01) continue;

    const px = (((bp.x + time * bp.speedX) % 1 + 1) % 1) * width;
    const py = bp.y * height + Math.sin(time * 1.15 + bp.phase) * bp.ampY;
    const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 2.2 + bp.phase));
    const r = bp.size * scaleBoost * (0.85 + 0.25 * twinkle);

    ctx.globalAlpha = 0.48 * twinkle * pAlpha;
    ctx.fillStyle = bp.glowColor;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.75 * twinkle * pAlpha;
    ctx.fillStyle = bp.coreColor;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Papeles morados y naranjas cayendo suavemente (sin shadowBlur costoso por pieza)
  for (let i = 0; i < fallingPapers.length; i += 1) {
    const fp = fallingPapers[i];
    const pAlpha = Math.max(0, Math.min(1, (reveal - fp.appearThreshold) / 0.25));
    if (pAlpha <= 0.01) continue;

    const progressY = (fp.baseY + time * fp.fallSpeed) % 1.08 - 0.04;
    const progressX = (fp.baseX + time * fp.driftSpeed) % 1.08 - 0.04;
    const px = progressX * width + Math.sin(time * fp.swayFreq + fp.phase) * fp.swayAmp;
    const py = progressY * height;
    const rot = time * fp.rotSpeed + fp.phase;
    const flip = 0.35 + 0.65 * Math.abs(Math.cos(time * fp.flipSpeed + fp.phase));
    const w = fp.w * scaleBoost;
    const h = fp.h * scaleBoost;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(1, flip);
    ctx.globalAlpha = 0.82 * pAlpha;
    ctx.fillStyle = fp.fill;

    ctx.beginPath();
    if (fp.shape === 0) {
      ctx.moveTo(-w * 0.5, -h * 0.5);
      ctx.lineTo(w * 0.5, -h * 0.5);
      ctx.lineTo(w * 0.5, h * 0.5);
      ctx.lineTo(0, h * 0.22);
      ctx.lineTo(-w * 0.5, h * 0.5);
      ctx.closePath();
    } else if (fp.shape === 1) {
      ctx.moveTo(0, -h * 0.65);
      ctx.lineTo(w * 0.6, 0);
      ctx.lineTo(0, h * 0.65);
      ctx.lineTo(-w * 0.6, 0);
      ctx.closePath();
    } else {
      ctx.ellipse(0, 0, w * 0.55, h * 0.45, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  // 3. Grandes Calaveritas ("A" y "O"), Corazón Central y Título elegante "ANAHÍ Y OLIVER"
  for (let e = 0; e < elements.length; e += 1) {
    const inst = elements[e];
    const isHeart = e === 1;
    const heartPulse = isHeart ? (isMobile ? 0.85 : 1) * (1 + Math.sin(time * 2.6) * 0.045 * form) : 1;
    const radius = baseRadius * inst.scaleFactor * heartPulse;
    const cx = anchorX + inst.offsetXFactor * baseRadius * spreadFactor;
    const floatPhase = isHeart ? 1.2 : 0;
    const cy = anchorY + inst.offsetYFactor * baseRadius + Math.sin(time * 0.85 + floatPhase) * 4;
    const mirrorDir = e === 0 ? 1 : e === 2 ? -1 : 0;
    const tilt = inst.baseTilt + mirrorDir * Math.sin(time * 0.55) * 0.022;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    if (form > 0.05) {
      const aura = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius * 1.55);
      aura.addColorStop(0, `rgba(255, 224, 142, ${(0.26 * form).toFixed(3)})`);
      aura.addColorStop(0.5, `rgba(248, 124, 92, ${(0.12 * form).toFixed(3)})`);
      aura.addColorStop(1, "rgba(248, 124, 92, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.55, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let g = 0; g < inst.groups.length; g += 1) {
      const group = inst.groups[g];
      const pts = group.particles;
      const len = pts.length;

      for (let i = 0; i < len; i += 1) {
        const p = pts[i];
        p.screenAlpha = Math.max(0, Math.min(1, (reveal - p.appearThreshold) / 0.25));

        const lx = p.sx + (p.tx - p.sx) * form;
        const ly = p.sy + (p.ty - p.sy) * form;
        const rx = (lx * cosT - ly * sinT) * radius;
        const ry = (lx * sinT + ly * cosT) * radius;
        const breatheX = Math.sin(time * 1.3 + p.phase) * (0.7 + (1 - form) * 6.5);
        const breatheY = Math.cos(time * 1.1 + p.phase) * (0.7 + (1 - form) * 6.5);

        p.screenX = cx + rx + breatheX;
        p.screenY = cy + ry + breatheY;
      }

      if (lineFade > 0.01 && len > 1 && group.lineColor !== "transparent") {
        ctx.beginPath();
        ctx.moveTo(pts[0].screenX, pts[0].screenY);
        for (let i = 1; i < len; i += 1) {
          ctx.lineTo(pts[i].screenX, pts[i].screenY);
        }
        if (group.closed) ctx.closePath();

        ctx.globalAlpha = lineFade * 0.55;
        ctx.strokeStyle = group.glowColor;
        ctx.lineWidth = 4.6 * scaleBoost;
        ctx.stroke();

        ctx.globalAlpha = lineFade * 0.92;
        ctx.strokeStyle = group.lineColor;
        ctx.lineWidth = 1.55 * scaleBoost;
        ctx.stroke();
      }

      for (let i = 0; i < len; i += 1) {
        const p = pts[i];
        if (p.screenAlpha <= 0.01) continue;

        const twinkle = 0.65 + 0.35 * Math.sin(time * 2.8 - p.phase);
        const dotR = p.size * scaleBoost * (0.9 + 0.22 * twinkle);

        ctx.globalAlpha = 0.65 * twinkle * p.screenAlpha;
        ctx.fillStyle = p.glowColor;
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, dotR * 2.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = (0.82 + 0.18 * twinkle) * p.screenAlpha;
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function onTick(time) {
  render(time);
}

function resize() {
  if (!ctx || !canvas) return;
  const parent = canvas.parentElement;
  width = Math.max(1, parent ? parent.clientWidth : window.innerWidth);
  height = Math.max(1, parent ? parent.clientHeight : window.innerHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render(gsap.ticker.time);
}

function syncPlayback() {
  if (motionQuery.matches || document.hidden) {
    if (running) {
      gsap.ticker.remove(onTick);
      running = false;
    }
    render(3.2);
  } else if (!running) {
    running = true;
    gsap.ticker.add(onTick);
  }
}

export function initConstellation() {
  const seascape = document.querySelector(".seascape");
  if (!seascape) return;

  canvas = document.createElement("canvas");
  canvas.className = "constellation-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:3;";
  seascape.appendChild(canvas);

  ctx = canvas.getContext("2d");
  if (!ctx) return;

  buildSceneConstellations();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", syncPlayback);
  motionQuery.addEventListener?.("change", syncPlayback);

  resize();
  syncPlayback();
}
/*  */