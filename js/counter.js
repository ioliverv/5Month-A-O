import { START_DATE } from "./content.js";

const fields = Object.fromEntries(
  ["days", "hours", "minutes", "seconds"].map((id) => [id, document.getElementById(id)])
);

export function startCounter() {
  const update = () => {
    const seconds = Math.floor(Math.max(0, Date.now() - START_DATE.getTime()) / 1000);
    fields.days.textContent = String(Math.floor(seconds / 86400));
    fields.hours.textContent = String(Math.floor(seconds / 3600) % 24).padStart(2, "0");
    fields.minutes.textContent = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
    fields.seconds.textContent = String(seconds % 60).padStart(2, "0");
  };
  update();
  return window.setInterval(update, 1000);
}
