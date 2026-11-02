import { LETTER_PARAGRAPHS, LETTER_CLOSING } from "./content.js";
import { animateLetterPage } from "./motion.js";

const body = document.getElementById("letter-body");
const previous = document.getElementById("previous-page");
const next = document.getElementById("next-page");
const finish = document.getElementById("finish-letter");
const progress = document.getElementById("letter-progress");
let pages = [];
let current = 0;
let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

function showPage(direction = 1, shouldAnimate = true) {
  const paragraph = document.createElement("p");
  paragraph.textContent = pages[current]; // Texto plano, nunca HTML inyectado.
  body.replaceChildren(paragraph);
  if (current === pages.length - 1) paragraph.classList.add("signature-page");
  if (shouldAnimate) {
    animateLetterPage(paragraph, direction);
  }
  previous.hidden = current === 0;
  next.hidden = current === pages.length - 1;
  finish.hidden = current !== pages.length - 1;
  progress.textContent = `${current + 1} / ${pages.length}`;
}

// Divide y equilibra el texto entre las páginas según el espacio real disponible,
// evitando páginas con una sola palabra o una oración suelta (salvo el cierre final).
export function renderLetter({ animate = true, resetPage = true } = {}) {
  if (document.getElementById("letter").hidden) return;
  pages = [];
  const measure = document.createElement("p");
  body.replaceChildren(measure);
  const maxAllowedHeight = Math.max(60, body.clientHeight - 6);
  const fits = (text) => {
    measure.textContent = text;
    return measure.offsetHeight <= maxAllowedHeight;
  };

  const words = LETTER_PARAGRAPHS.join(" ").trim().split(/\s+/);

  const findMaxEnd = (startIdx) => {
    let low = startIdx + 1;
    let high = words.length;
    let best = low;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (fits(words.slice(startIdx, mid).join(" "))) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  };

  // 1. Calculamos cuántas páginas mínimas requiere el texto completo
  let minPages = 0;
  let cursor = 0;
  while (cursor < words.length) {
    cursor = findMaxEnd(cursor);
    minPages += 1;
  }

  // 2. Repartimos las palabras de forma equilibrada entre las páginas buscando cortes naturales de oración
  const buildBalancedPages = (targetPageCount) => {
    const result = [];
    let start = 0;
    for (let p = 0; p < targetPageCount && start < words.length; p += 1) {
      const remainingPages = targetPageCount - p;
      if (remainingPages === 1) {
        const lastChunk = words.slice(start).join(" ");
        if (!fits(lastChunk)) return null;
        result.push(lastChunk);
        start = words.length;
        break;
      }

      const maxEnd = findMaxEnd(start);
      const idealEnd = start + Math.round((words.length - start) / remainingPages);
      const targetEnd = Math.min(idealEnd, maxEnd);

      const minSearch = Math.max(start + 12, targetEnd - 14);
      const maxSearch = Math.min(maxEnd, targetEnd + 12);

      let chosenEnd = targetEnd;
      let bestDist = Infinity;

      // Prioridad 1: fin de oración (., !, ?, ❤️)
      for (let i = minSearch; i <= maxSearch; i += 1) {
        const w = words[i - 1];
        if (/[.!?❤️]$/u.test(w)) {
          const dist = Math.abs(i - targetEnd);
          if (dist < bestDist) {
            bestDist = dist;
            chosenEnd = i;
          }
        }
      }

      // Prioridad 2: pausa de coma o dos puntos (,, ;, :)
      if (bestDist === Infinity) {
        for (let i = minSearch; i <= maxSearch; i += 1) {
          const w = words[i - 1];
          if (/[,;:]$/u.test(w)) {
            const dist = Math.abs(i - targetEnd);
            if (dist < bestDist) {
              bestDist = dist;
              chosenEnd = i;
            }
          }
        }
      }

      result.push(words.slice(start, chosenEnd).join(" "));
      start = chosenEnd;
    }
    return start >= words.length ? result : null;
  };

  let balanced = buildBalancedPages(minPages) || buildBalancedPages(minPages + 1);
  if (!balanced) {
    balanced = [];
    let idx = 0;
    while (idx < words.length) {
      const nextIdx = findMaxEnd(idx);
      balanced.push(words.slice(idx, nextIdx).join(" "));
      idx = nextIdx;
    }
  }

  pages = [...balanced, LETTER_CLOSING];
  current = resetPage ? 0 : Math.min(current, Math.max(0, pages.length - 1));
  showPage(1, animate);
}

export function initLetter() {
  previous.addEventListener("click", () => { current -= 1; showPage(-1, true); });
  next.addEventListener("click", () => { current += 1; showPage(1, true); });
  let resizeFrame;
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === lastWidth && Math.abs(h - lastHeight) < 36) return;
    lastWidth = w;
    lastHeight = h;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => renderLetter({ animate: false, resetPage: false }));
  });
}
