// Pregunta interactiva a la izquierda y barquitos con notas ("Te quiero", "Te adoro", "Me encantas") a la derecha.
import { gsap } from "gsap";
import { splashAt, resetSeaLights } from "./sea-renderer.js";
import { launchWishBoat, resetBoatAnimations } from "./motion.js";

const feedback = {
  spiderman: "¡Sí, sí, ese fue el último peluche que te di! 🕷️❤️ Las luces navegan en el mar y mi carta llegó a la orilla para ti.",
  bear: "Mmm… ¡el osito blanco fue el primero, pero no el último! Intenta de nuevo ❤️",
  penguin: "Mmm… el pingüino es muy tierno, ¡pero no fue el último! Intenta de nuevo ❤️",
  puppy: "Casi… el perrito es hermoso, ¡pero no fue el último que te di! ✨"
};

const buttons = [...document.querySelectorAll("[data-wish]")];
const boats = [...document.querySelectorAll(".sea-boat")];
const status = document.getElementById("voyage-status");
const popup = document.getElementById("voyage-popup");
const popupCard = popup?.querySelector(".voyage-popup-card");

export function startVoyageBoats() {
  boats.forEach((boat, index) => {
    boat.classList.add("is-sailing");
    launchWishBoat(boat, index, 0.45 + index * 1.5, () => splashAt(index));
  });
}

export function resetVoyage() {
  for (const button of buttons) {
    button.disabled = false;
    button.classList.remove("is-sent", "is-correct", "is-wrong");
  }
  boats.forEach((boat) => boat.classList.remove("is-sailing", "is-celebrating"));
  resetBoatAnimations(boats);
  resetSeaLights();
  if (status) {
    status.textContent = "";
    status.hidden = true;
  }
  if (popup) {
    popup.hidden = true;
  }
}

export function initVoyage() {
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const choice = button.dataset.wish;

      if (choice === "spiderman") {
        buttons.forEach((btn) => {
          btn.disabled = true;
          if (btn !== button) btn.classList.add("is-wrong");
        });
        button.classList.add("is-sent", "is-correct");
        boats.forEach((boat, idx) => {
          boat.classList.add("is-sailing", "is-celebrating");
          splashAt(idx);
        });
        if (status) {
          status.hidden = true;
        }
        if (popup) {
          popup.hidden = false;
          gsap.fromTo(
            popup,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: "power2.out" }
          );
          if (popupCard) {
            gsap.fromTo(
              popupCard,
              { opacity: 0, scale: 0.82, y: 18 },
              { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: "back.out(1.5)" }
            );
          }
        }
      } else {
        button.classList.add("is-wrong");
        splashAt(index);
        if (status) {
          status.hidden = false;
          status.textContent = feedback[choice] || "¡Intenta con otra opción! ❤️";
        }
        gsap.fromTo(
          button,
          { x: -6 },
          { x: 0, duration: 0.4, ease: "elastic.out(1.2, 0.25)" }
        );
      }
    });
  });
}
