// Sobre grande de Día de Muertos con sello de calavera que se deshace en fragmentos y polvo de cempasúchil al abrirla.
import { gsap } from "gsap";
import { spawnRipple } from "./sea-renderer.js";
import { showScene } from "./scenes.js";
import { renderLetter } from "./letter.js";

const sealBtn = document.getElementById("break-wax-seal");
const envelope = document.getElementById("royal-envelope");
const flap = document.getElementById("envelope-flap");
const pocket = envelope?.querySelector(".envelope-pocket");
const back = envelope?.querySelector(".envelope-back");
const sheet = document.getElementById("envelope-letter-sheet");
const dustHost = document.getElementById("skull-dust-host");
const skullPieces = [...document.querySelectorAll(".skull-piece")];

let sealBroken = false;

export function resetRitual() {
  sealBroken = false;

  if (envelope) {
    envelope.classList.remove("is-open", "is-unsealing");
  }
  if (flap) gsap.set(flap, { clearProps: "all" });
  if (pocket) gsap.set(pocket, { clearProps: "all" });
  if (back) gsap.set(back, { clearProps: "all" });
  if (sheet) gsap.set(sheet, { clearProps: "all" });
  if (sealBtn) {
    sealBtn.disabled = false;
    gsap.set(sealBtn, { clearProps: "all" });
  }
  skullPieces.forEach((piece) => {
    gsap.killTweensOf(piece);
    gsap.set(piece, { clearProps: "all" });
  });
  if (dustHost) {
    dustHost.replaceChildren();
  }
}

function spawnSkullCrumbleDust() {
  if (!dustHost) return;
  dustHost.replaceChildren();

  const colors = ["#ffd480", "#ffae2b", "#ff7898", "#fff4dc", "#e85d26", "#9e1c34"];
  const count = 28;

  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement("i");
    dot.className = "skull-dust";
    const size = 4 + (i % 5) * 2.2;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.background = colors[i % colors.length];
    dustHost.appendChild(dot);

    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.2;
    const dist = 36 + (i % 6) * 18;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist + 18; // Caída ligera como polvo/pétalos

    gsap.fromTo(
      dot,
      { x: 0, y: 0, scale: 1.1, opacity: 1, rotation: 0 },
      {
        x: tx,
        y: ty,
        scale: 0,
        opacity: 0,
        rotation: (i % 2 === 0 ? 1 : -1) * 160,
        duration: 0.65 + (i % 4) * 0.12,
        ease: "power2.out"
      }
    );
  }
}

function handleBreakSeal() {
  if (sealBroken) return;
  sealBroken = true;
  if (sealBtn) sealBtn.disabled = true;
  if (envelope) envelope.classList.add("is-unsealing");

  spawnRipple(0.5, 0.52, 2.8);
  spawnSkullCrumbleDust();

  const tl = gsap.timeline({
    onComplete: () => {
      showScene("letter");
      renderLetter();
    }
  });

  // 1. Pulso ligero antes de que el sello de calavera se deshaga
  if (sealBtn) {
    tl.to(sealBtn, {
      scale: 1.07,
      duration: 0.1,
      ease: "power2.out"
    }, 0);
  }

  // 2. La calavera y el sello se deshacen pieza por pieza en fragmentos y polvo
  skullPieces.forEach((piece, index) => {
    const dx = Number(piece.dataset.dx || 0);
    const dy = Number(piece.dataset.dy || 25);
    const rot = Number(piece.dataset.rot || 25);

    tl.to(
      piece,
      {
        x: dx,
        y: dy,
        rotation: rot,
        scale: 0.15,
        opacity: 0,
        transformOrigin: "50% 50%",
        duration: 0.48,
        ease: "power2.out"
      },
      0.06 + index * 0.024
    );
  });

  if (sealBtn) {
    tl.to(
      sealBtn,
      {
        opacity: 0,
        duration: 0.18,
        ease: "power1.out"
      },
      0.42
    );
  }

  // 3. Se abre la solapa del sobre en 3D con movimiento continuo mientras los fragmentos caen
  tl.add(() => {
    envelope?.classList.add("is-open");
  }, 0.28);

  if (flap) {
    tl.to(
      flap,
      {
        rotateX: 180,
        duration: 0.48,
        ease: "power2.inOut"
      },
      0.28
    );
    tl.add(() => {
      flap.style.zIndex = "1";
    }, 0.52);
  }

  // 4. La hoja interior emerge continuamente hacia arriba y se expande hacia el lector
  if (sheet) {
    tl.to(
      sheet,
      {
        y: "-64%",
        scaleX: 1.08,
        scaleY: 1.12,
        duration: 0.62,
        ease: "power3.out"
      },
      0.48
    );
  }

  // 5. El sobre desciende suavemente dando paso al despliegue de la carta completa
  const envParts = [back, pocket, flap].filter(Boolean);
  if (envParts.length) {
    tl.to(
      envParts,
      {
        y: 26,
        scale: 0.96,
        opacity: 0.35,
        duration: 0.42,
        ease: "power2.inOut"
      },
      0.68
    );
  }
}

export function initRitual() {
  sealBtn?.addEventListener("click", handleBreakSeal);
}
