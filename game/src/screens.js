// The screens between sorties: title, paused and the debrief. The title lists
// the five named strips so the choice is visible before the first flight; the
// debrief reads back the landing the way a flight instructor would.

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export const CONTROLS = [
  'W / S — throttle naik / turun',
  '↑ / ↓ — pitch (hidung naik / turun)',
  '← / → — bank & belok',
  '1–5 — pilih strip, Spasi — terbang, P — jeda, R — ulangi',
];

/** Lines for the debrief panel after a sortie ends. */
export function debriefLines(state) {
  const t = state.touchdown;
  const lines = [];
  lines.push(`Strip: ${state.strip.name} — ${state.strip.island}`);
  lines.push(`Misi: ${state.strip.mission}`);
  if (t) {
    lines.push(`Sentuhan: ${Math.abs(t.vspeed).toFixed(1)} m/s turun · ${Math.abs(t.lat).toFixed(0)} m dari tengah · ${Math.abs(t.heading).toFixed(0)}° dari arah landasan`);
    lines.push(`Kecepatan sentuh: ${Math.round(t.speed * 1.94384)} kt · Bahan bakar sisa: ${Math.round(state.fuel)}%`);
  }
  lines.push(`Kerusakan roda: ${state.gearDamage} dari 3`);
  if (state.strip.mission === 'Medevac') {
    lines.push(state.timer > 0 ? 'Medevac: tepat waktu.' : 'Medevac: waktu habis.');
  }
  return lines;
}
