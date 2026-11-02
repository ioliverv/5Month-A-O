import { showScene } from "./scenes.js";
import { initVoyage, resetVoyage } from "./voyage.js";
import { initRitual, resetRitual } from "./ritual.js";
import { initLetter } from "./letter.js";
import { startCounter } from "./counter.js";
import { createGlints } from "./seascape.js";
import { initSea } from "./sea-renderer.js";
import { initMotionGraphics } from "./motion.js";
import { initConstellation } from "./constellation.js";

function initBackgroundMusic() {
  const audio = document.getElementById("bg-music");
  const toggleBtn = document.getElementById("music-toggle");
  if (!audio) return;

  audio.volume = 0.55;
  let userPaused = false;

  const updateButtonUI = () => {
    if (!toggleBtn) return;
    const playing = !audio.paused && !audio.muted;
    toggleBtn.classList.toggle("is-muted", !playing);
    toggleBtn.setAttribute("aria-pressed", String(playing));
    toggleBtn.setAttribute("title", playing ? "Pausar música" : "Reproducir música");
  };

  const tryPlay = () => {
    if (userPaused) return;
    audio.play().then(updateButtonUI).catch(() => {
      updateButtonUI();
    });
  };

  // Intenta reproducir al cargar y, si el navegador pide gesto previo, arranca al primer clic o toque
  tryPlay();
  const unlockEvents = ["pointerdown", "click", "keydown", "touchstart"];
  const unlockOnGesture = (e) => {
    if (toggleBtn && toggleBtn.contains(e.target)) return;
    if (!userPaused && audio.paused) {
      audio.play().then(() => {
        updateButtonUI();
        unlockEvents.forEach((evt) => window.removeEventListener(evt, unlockOnGesture));
      }).catch(() => {});
    }
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, unlockOnGesture, { passive: true }));

  toggleBtn?.addEventListener("click", () => {
    if (audio.paused) {
      userPaused = false;
      audio.play().then(updateButtonUI).catch(() => {});
    } else {
      userPaused = true;
      audio.pause();
      updateButtonUI();
    }
  });

  audio.addEventListener("play", updateButtonUI);
  audio.addEventListener("pause", updateButtonUI);
}

document.getElementById("start").addEventListener("click", () => showScene("voyage"));
document.getElementById("open-letter").addEventListener("click", () => {
  resetRitual();
  showScene("ritual");
});
document.getElementById("finish-letter").addEventListener("click", () => showScene("finale"));
document.getElementById("replay").addEventListener("click", () => {
  resetVoyage();
  resetRitual();
  showScene("intro");
});

initBackgroundMusic();
initVoyage();
initRitual();
initLetter();
startCounter();
initSea();
createGlints();
initMotionGraphics();
initConstellation();
