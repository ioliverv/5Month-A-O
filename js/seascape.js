import { animatePetals } from "./motion.js";

// Estrellas vespertinas en la parte alta del cielo y pétalos de cempasúchil flotando.
export function createGlints() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const petalsHost = document.getElementById("sky-petals");
  if (!petalsHost) return;

  const skyFragment = document.createDocumentFragment();

  for (let i = 0; i < 18; i += 1) {
    const star = document.createElement("i");
    star.className = "sky-star";
    star.style.setProperty("--x", `${(i * 53 + 7) % 96 + 2}%`);
    star.style.setProperty("--y", `${(i * 19 + 4) % 44 + 4}%`);
    star.style.setProperty("--s", `${1.5 + (i % 3) * 0.9}px`);
    star.style.setProperty("--d", `${2.4 + (i % 5) * 0.65}s`);
    star.style.setProperty("--delay", `${-i * 0.45}s`);
    skyFragment.appendChild(star);
  }

  const createdPetals = [];
  if (!reducedMotion) {
    for (let index = 0; index < 12; index += 1) {
      const petal = document.createElement("i");
      petal.className = "falling-petal";
      skyFragment.appendChild(petal);
      createdPetals.push(petal);
    }
  }

  petalsHost.appendChild(skyFragment);
  animatePetals(createdPetals);
}
