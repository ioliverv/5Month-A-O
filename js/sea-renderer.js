// Mar semi-realista, fluido y sin líneas artificiales: WebGL nativo ultraligero
// sincronizado con GSAP, usando exactamente la paleta cálida de Día de Muertos.
import { gsap } from "gsap";

const canvas = document.getElementById("sea-canvas");
const water = canvas.parentElement;
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

let gl = null;
let program = null;
let uniforms = {};
let ctx2d = null;
let width = 0;
let height = 0;
let running = false;

const MAX_RIPPLES = 6;
const ripples = [];
const boatGlows = [
  { x: 0.25, y: 0.38, alpha: 0 },
  { x: 0.50, y: 0.56, alpha: 0 },
  { x: 0.75, y: 0.42, alpha: 0 }
];

const VERTEX_SRC = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

// Shader limpio y luminoso: sin trazos/líneas duras y sin ruido granulado.
// Superficie líquida continua con la paleta exacta del atardecer de la página.
const FRAGMENT_SRC = `
  precision mediump float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uRipples[6];
  uniform vec3 uBoats[3];

  // Onda suave multidireccional con cresta ligeramente redondeada
  float smoothWave(vec2 p, vec2 dir, float freq, float speed, float t) {
    float phase = dot(p, dir) * freq + t * speed;
    return sin(phase + 0.22 * cos(phase));
  }

  // Altura del agua: 5 ondas cruzadas suaves que crean volumen líquido continuo
  float waterHeight(vec2 p, float t) {
    // Curvatura suave de las corrientes para que nunca se vean rectas ni mecánicas
    vec2 warp = vec2(
      sin(p.y * 0.35 + t * 0.25) * 0.45,
      cos(p.x * 0.30 - t * 0.20) * 0.45
    );
    vec2 wp = p + warp;

    float h = 0.0;
    h += 0.42 * smoothWave(wp, vec2(0.22, 0.975), 1.05, 1.15, t);
    h += 0.32 * smoothWave(wp, vec2(-0.31, 0.950), 1.45, 1.35, t + 1.8);
    h += 0.20 * smoothWave(wp, vec2(0.46, 0.888), 2.15, 1.65, t - 2.4);
    h += 0.13 * smoothWave(wp, vec2(-0.52, 0.854), 3.10, 1.95, t + 3.7);
    h += 0.08 * smoothWave(wp, vec2(0.15, 0.988), 4.40, 2.30, t - 1.1);
    return h;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    // depth: 0.0 en el horizonte (arriba), 1.0 en la orilla cercana (abajo)
    float depth = clamp(1.0 - vUv.y, 0.0, 1.0);
    float t = uTime;

    // Coordenadas en perspectiva suave: olas densas en el horizonte y amplias en primer plano
    float perspZ = 18.0 / (pow(depth + 0.055, 0.82));
    float perspX = (vUv.x - 0.5) * aspect * perspZ * 0.42;
    vec2 worldPos = vec2(perspX, perspZ);

    // Atenuación con la distancia para que el horizonte se vea sereno y limpio
    float waveFade = smoothstep(0.0, 0.18, depth);

    // Cálculo de altura y pendiente 3D (normales suaves de la superficie líquida)
    float eps = 0.09;
    float hC = waterHeight(worldPos, t) * waveFade;
    float hX = waterHeight(worldPos + vec2(eps, 0.0), t) * waveFade;
    float hZ = waterHeight(worldPos + vec2(0.0, eps), t) * waveFade;

    vec2 slope = vec2(hX - hC, hZ - hC) / eps;

    // Ondas interactivas al soltar deseos o tocar el agua (deforman la superficie sin dibujar líneas)
    float rippleLight = 0.0;
    for (int i = 0; i < 6; i++) {
      vec3 rp = uRipples[i];
      if (rp.z > 0.001 && rp.z < 0.999) {
        vec2 diff = vec2((vUv.x - rp.x) * aspect, (depth - rp.y) * 1.9);
        float dist = length(diff);
        float radius = rp.z * 0.42;
        float ring = dist - radius;
        float env = exp(-dist * 5.0) * exp(-ring * ring * 260.0) * (1.0 - rp.z);
        float wave = sin(ring * 75.0 - rp.z * 16.0);
        vec2 dir = dist > 0.0001 ? diff / dist : vec2(0.0, 1.0);
        slope += dir * wave * env * 1.8;
        rippleLight += max(0.0, wave) * env;
      }
    }

    // Normal 3D de la superficie del agua
    vec3 N = normalize(vec3(-slope.x * 0.34, 1.0, -slope.y * 0.32));

    // Paleta cálida original de la página (coral-anaranjado -> carmesí -> ciruela nocturno)
    vec3 colHorizon = vec3(0.855, 0.380, 0.278); // #da6147
    vec3 colUpper   = vec3(0.710, 0.263, 0.294); // #b5434b
    vec3 colMid     = vec3(0.475, 0.188, 0.290); // #79304a
    vec3 colDeep    = vec3(0.145, 0.078, 0.220); // #251438

    vec3 baseWater = mix(colHorizon, colUpper, smoothstep(0.0, 0.24, depth));
    baseWater = mix(baseWater, colMid, smoothstep(0.20, 0.62, depth));
    baseWater = mix(baseWater, colDeep, smoothstep(0.55, 1.0, depth));

    // Sombreado líquido suave según la inclinación de cada ola (volumen real sin líneas)
    float sunX = 0.50;
    vec3 lightDir = normalize(vec3((sunX - vUv.x) * 1.2, 0.42, -0.85));
    float diffuse = clamp(dot(N, lightDir), 0.0, 1.0);

    // Iluminación subsuperficial cálida en las crestas y tono profundo en los valles
    vec3 crestWarmth = mix(vec3(0.92, 0.44, 0.36), vec3(1.0, 0.66, 0.38), exp(-pow((vUv.x - sunX) * 2.5, 2.0)));
    float waveVolume = clamp(hC * 0.5 + 0.5, 0.0, 1.0);
    vec3 waterColor = baseWater * mix(0.80, 1.12, waveVolume);
    waterColor = mix(waterColor, crestWarmth, pow(diffuse, 2.2) * (0.28 + 0.18 * (1.0 - depth)));

    // Resplandor atmosférico suave del cempasúchil sobre el agua
    vec2 sunDelta = vec2((vUv.x - sunX) * aspect, depth * 1.15);
    float sunAura = exp(-length(sunDelta) * 2.15);
    waterColor += vec3(1.0, 0.68, 0.32) * sunAura * 0.34;

    // Reflejo especular líquido del cempasúchil (distorsionado orgánicamente por las olas)
    float reflOffset = (vUv.x - sunX) + N.x * (0.14 + depth * 0.22);
    float pathWidth = 0.028 + depth * 0.19;
    float sunColumn = exp(-pow(reflOffset / pathWidth, 2.0));

    // Facetas suaves de agua que brillan cuando la pendiente mira hacia la flor
    float slopeFacing = clamp(0.58 + N.z * 1.35 + hC * 0.45, 0.0, 1.0);
    float shimmerWave = 0.5 + 0.5 * sin(worldPos.y * 2.4 - t * 2.6 + worldPos.x * 1.8 + hC * 3.2);
    float liquidSpec = sunColumn * pow(slopeFacing, 2.4) * (0.45 + 0.55 * shimmerWave);
    float brightGlint = sunColumn * pow(slopeFacing * shimmerWave, 6.5);

    waterColor += vec3(1.0, 0.76, 0.40) * liquidSpec * 0.58;
    waterColor += vec3(1.0, 0.93, 0.72) * brightGlint * 0.65;

    // Reflejo cálido de las 3 velas/deseos flotando sobre las olas
    for (int b = 0; b < 3; b++) {
      vec3 boat = uBoats[b];
      if (boat.z > 0.001) {
        vec2 bDiff = vec2((vUv.x - boat.x + N.x * 0.05) * aspect, (depth - boat.y) * 2.2);
        float bDist = length(bDiff);
        float bGlow = exp(-bDist * 9.5) * (0.75 + 0.25 * sin(worldPos.y * 3.5 - t * 3.5 + float(b)));
        waterColor += vec3(1.0, 0.80, 0.42) * bGlow * boat.z * 0.65;
      }
    }

    // Brillo dorado suave de las ondas interactivas
    waterColor += vec3(1.0, 0.86, 0.55) * rippleLight * 0.55;

    // Bruma cálida en el borde del horizonte para fundirse suavemente con el cielo
    float horizonMist = exp(-depth * 24.0);
    vec3 mistColor = mix(vec3(0.90, 0.42, 0.32), vec3(1.0, 0.78, 0.48), exp(-pow((vUv.x - sunX) * 2.4, 2.0)));
    waterColor = mix(waterColor, mistColor, horizonMist * 0.55);

    gl_FragColor = vec4(clamp(waterColor, 0.0, 1.0), 1.0);
  }
`;

function compileShader(glCtx, type, source) {
  const shader = glCtx.createShader(type);
  glCtx.shaderSource(shader, source);
  glCtx.compileShader(shader);
  if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
    glCtx.deleteShader(shader);
    return null;
  }
  return shader;
}

function setupWebGL() {
  try {
    gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return false;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return false;

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uniforms = {
      uTime: gl.getUniformLocation(program, "uTime"),
      uResolution: gl.getUniformLocation(program, "uResolution"),
      uRipples: Array.from({ length: MAX_RIPPLES }, (_, i) => gl.getUniformLocation(program, `uRipples[${i}]`)),
      uBoats: Array.from({ length: 3 }, (_, i) => gl.getUniformLocation(program, `uBoats[${i}]`))
    };

    return true;
  } catch {
    gl = null;
    return false;
  }
}

function paintWater(time) {
  if (width < 2 || height < 2) return;

  if (gl && program) {
    gl.useProgram(program);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);

    for (let i = 0; i < MAX_RIPPLES; i += 1) {
      const rp = ripples[i];
      if (rp) {
        gl.uniform3f(uniforms.uRipples[i], rp.x, rp.y, rp.progress);
      } else {
        gl.uniform3f(uniforms.uRipples[i], 0, 0, 0);
      }
    }

    for (let b = 0; b < 3; b += 1) {
      const boat = boatGlows[b];
      const swayX = Math.sin(time * 0.75 + b * 2) * 0.012;
      gl.uniform3f(uniforms.uBoats[b], boat.x + swayX, boat.y, boat.alpha);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  } else if (ctx2d) {
    // Respaldo 2D suave sin líneas si WebGL está desactivado
    const base = ctx2d.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, "#da6147");
    base.addColorStop(0.24, "#b5434b");
    base.addColorStop(0.62, "#79304a");
    base.addColorStop(1, "#251438");
    ctx2d.fillStyle = base;
    ctx2d.fillRect(0, 0, width, height);
  }
}

function onTick(time) {
  paintWater(time);
}

export function resizeSea() {
  const bounds = water.getBoundingClientRect();
  width = Math.max(1, bounds.width);
  height = Math.max(1, bounds.height);
  const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  if (gl) {
    gl.viewport(0, 0, canvas.width, canvas.height);
  } else if (ctx2d) {
    ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  paintWater(gsap.ticker.time);
}

function syncPlayback() {
  if (motion.matches || document.hidden) {
    if (running) {
      gsap.ticker.remove(onTick);
      running = false;
    }
    paintWater(1.5);
  } else if (!running) {
    running = true;
    gsap.ticker.add(onTick);
  }
}

export function spawnRipple(normX, normY, duration = 2.2) {
  if (motion.matches) return;
  const ripple = {
    x: Math.min(0.96, Math.max(0.04, normX)),
    y: Math.min(0.95, Math.max(0.05, normY)),
    progress: 0
  };
  ripples.unshift(ripple);
  if (ripples.length > MAX_RIPPLES) ripples.length = MAX_RIPPLES;

  gsap.to(ripple, {
    progress: 1,
    duration,
    ease: "power2.out",
    onComplete: () => {
      const idx = ripples.indexOf(ripple);
      if (idx !== -1) ripples.splice(idx, 1);
    }
  });
}

export function splashAt(index) {
  const points = [
    [0.25, 0.38],
    [0.50, 0.56],
    [0.75, 0.42]
  ];
  const point = points[index];
  if (!point) return;

  if (boatGlows[index]) {
    gsap.to(boatGlows[index], { alpha: 1, duration: 1.2, ease: "power2.out" });
  }

  spawnRipple(point[0], point[1], 2.4);
}

export function resetSeaLights() {
  for (const boat of boatGlows) {
    gsap.killTweensOf(boat);
    boat.alpha = 0;
  }
  ripples.length = 0;
}

export function initSea() {
  if (!setupWebGL()) {
    ctx2d = canvas.getContext("2d", { alpha: false });
  }
  if (!gl && !ctx2d) return;

  water.classList.add("has-canvas");
  if (window.ResizeObserver) new ResizeObserver(resizeSea).observe(water);
  else window.addEventListener("resize", resizeSea);

  window.addEventListener(
    "pointerdown",
    (e) => {
      const rect = water.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
        const ny = (e.clientY - rect.top) / Math.max(rect.height, 1);
        spawnRipple(nx, ny, 2.1);
      }
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", syncPlayback);
  motion.addEventListener?.("change", syncPlayback);
  resizeSea();
  syncPlayback();
}
