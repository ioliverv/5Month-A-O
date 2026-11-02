// Motion Graphics ligeros y fluidos con GSAP: mantiene la estética cálida e ilustrada
// de la página con consumo mínimo de recursos.
import { gsap } from "gsap";

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const boatTimelines = new Map();

export function initMotionGraphics() {
  if (motionQuery.matches) return;

  const rays = document.querySelector(".flower-rays");

  // Respiración cálida y giro lento de los rayos crepusculares de la flor
  if (rays) {
    gsap.to(rays, {
      scale: 1.08,
      opacity: 0.86,
      duration: 6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });
    gsap.to(rays, {
      rotation: 360,
      duration: 95,
      ease: "none",
      repeat: -1
    });
  }
}

export function animatePetals(petals) {
  if (motionQuery.matches || !petals.length) return;

  petals.forEach((petal, index) => {
    const startX = ((index * 41 + 8) % 95);
    const duration = 9.5 + (index % 5) * 1.2;

    gsap.set(petal, {
      left: `${startX}%`,
      top: "-10%",
      scale: 0.8 + (index % 3) * 0.15,
      opacity: 0.78
    });

    gsap.to(petal, {
      y: "64vh",
      x: 75 + (index % 3) * 20,
      rotation: 360 + (index % 2) * 180,
      duration,
      ease: "none",
      repeat: -1,
      delay: -index * 1.5
    });
  });
}

export function animateSceneEnter(sceneEl) {
  if (!sceneEl || motionQuery.matches) return;

  if (sceneEl.id === "letter") {
    const paper = sceneEl.querySelector(".letter-paper");
    const cradle = sceneEl.querySelector(".letter-envelope-cradle");
    const cradleFlap = sceneEl.querySelector(".cradle-flap");
    const folds = sceneEl.querySelectorAll(".letter-fold");
    const ornament = sceneEl.querySelector(".letter-ornament");
    const heading = sceneEl.querySelector("h2");

    if (cradle) {
      gsap.fromTo(
        cradle,
        { opacity: 0, y: -14, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: "power3.out", overwrite: "auto" }
      );
    }

    if (cradleFlap) {
      gsap.fromTo(
        cradleFlap,
        { opacity: 0, y: 10, scaleY: 0.6, transformOrigin: "50% 100%" },
        { opacity: 0.92, y: 0, scaleY: 1, duration: 0.62, delay: 0.05, ease: "power3.out", overwrite: "auto" }
      );
    }

    if (paper) {
      gsap.fromTo(
        paper,
        { opacity: 0, y: 34, scaleX: 0.88, scaleY: 0.74, rotateX: -14, transformPerspective: 1100 },
        {
          opacity: 1,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotateX: 0,
          duration: 0.68,
          ease: "power3.out",
          overwrite: "auto",
          clearProps: "transform"
        }
      );
    }

    if (folds.length) {
      gsap.fromTo(
        folds,
        { opacity: 0.72, scaleX: 0.9 },
        { opacity: 0.24, scaleX: 1, duration: 0.75, delay: 0.08, ease: "power2.out", overwrite: "auto" }
      );
    }

    if (ornament) {
      gsap.fromTo(
        ornament,
        { opacity: 0, scale: 0.9, y: 8 },
        { opacity: 1, scale: 1, y: 0, duration: 0.54, delay: 0.12, ease: "power2.out", overwrite: "auto" }
      );
    }

    if (heading) {
      gsap.fromTo(
        heading,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.52, delay: 0.16, ease: "power2.out", overwrite: "auto" }
      );
    }
    return;
  }

  const heading = sceneEl.querySelector("h1, h2");
  const card = sceneEl.querySelector(".voyage-copy, .royal-envelope, .letter-paper, .final-card");

  if (card) {
    gsap.fromTo(
      card,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", overwrite: "auto" }
    );
  }

  if (heading) {
    gsap.fromTo(
      heading,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.6, delay: 0.05, ease: "power2.out", overwrite: "auto" }
    );
  }
}

export function launchWishBoat(boatEl, index, delaySeconds = 0, onAppear = null) {
  if (!boatEl) return;

  if (motionQuery.matches) {
    gsap.set(boatEl, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 });
    onAppear?.();
    return;
  }

  boatTimelines.get(boatEl)?.kill();
  gsap.set(boatEl, { opacity: 0, y: 65, scale: 0.2, rotation: -18 });

  const isCompact = window.innerWidth <= 599 || window.innerHeight <= 520;
  const targetScale = isCompact ? 0.86 : 1;
  const driftScale = isCompact ? 0.55 : 1;
  const driftX = ([24, -22, -28][index] || 20) * driftScale;
  const tl = gsap.timeline({ delay: delaySeconds });
  boatTimelines.set(boatEl, tl);

  tl.to(boatEl, {
    opacity: 1,
    y: 0,
    scale: targetScale,
    rotation: 0,
    duration: 1.35,
    ease: "back.out(1.2)",
    onStart: () => onAppear?.()
  });

  tl.to(boatEl, {
    x: driftX,
    y: -11,
    rotation: 4,
    duration: 4.2 + index * 0.5,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
  });
}

export function resetBoatAnimations(boats) {
  boats.forEach((boat) => {
    boatTimelines.get(boat)?.kill();
    boatTimelines.delete(boat);
    gsap.set(boat, { clearProps: "all" });
  });
}

export function animateLetterPage(paragraphEl, direction = 1) {
  if (!paragraphEl || motionQuery.matches) return;
  gsap.fromTo(
    paragraphEl,
    { opacity: 0, x: direction * 16, y: 8 },
    { opacity: 1, x: 0, y: 0, duration: 0.42, ease: "power2.out", clearProps: "transform" }
  );
}
