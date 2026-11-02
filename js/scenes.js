import { resizeSea } from "./sea-renderer.js";
import { animateSceneEnter } from "./motion.js";
import { transitionConstellationForScene } from "./constellation.js";
import { startVoyageBoats } from "./voyage.js";

// Una escena visible a la vez; `hidden` mantiene fuera del teclado las escenas inactivas.
const scenes = Object.fromEntries(
  ["intro", "voyage", "ritual", "letter", "finale"].map((id) => [id, document.getElementById(id)])
);

export function showScene(name) {
  if (!scenes[name]) throw new Error(`Escena desconocida: ${name}`);
  document.body.dataset.scene = name;
  for (const [id, scene] of Object.entries(scenes)) {
    scene.hidden = id !== name;
    scene.classList.toggle("is-active", id === name);
  }
  const popup = document.getElementById("voyage-popup");
  if (popup && name !== "voyage") {
    popup.hidden = true;
  }
  const backLink = document.getElementById("back-link");
  if (backLink) {
    backLink.hidden = name === "finale";
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  resizeSea();
  transitionConstellationForScene(name);
  if (name === "voyage") {
    startVoyageBoats();
  }
  animateSceneEnter(scenes[name]);

  // Tras el cambio, anuncia el encabezado a lectores de pantalla y orienta el teclado.
  const heading = scenes[name].querySelector("h1, h2");
  heading?.setAttribute("tabindex", "-1");
  heading?.focus({ preventScroll: true });
}
