// The instruments: big altitude, speed and heading numbers, a fuel gauge, a
// wind arrow and the live glidepath strip that plots the real descent trace
// against the ideal line. Everything is drawn at least twice normal size so
// it still reads when the cover is shrunk to 768 pixels wide.

import { FIELD, FONT, PALETTE } from './config.js';
import { idealAlt, slopeBand } from './glidepath.js';

const KT = 1.94384;

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8, 14, 26, ${alpha === undefined ? 0.72 : alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(244, 241, 230, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

/** The three big numbers, top left: ALT in feet, SPD in knots, HDG in degrees. */
export function drawPrimaryHud(ctx, state) {
  panel(ctx, 24, 20, 400, 118);
  text(ctx, 'ALT', 44, 52, 22, PALETTE.muted, 'left', 600);
  text(ctx, 'SPD', 184, 52, 22, PALETTE.muted, 'left', 600);
  text(ctx, 'HDG', 312, 52, 22, PALETTE.muted, 'left', 600);
  text(ctx, String(Math.round(state.alt * 3.28084)), 44, 112, 52, PALETTE.text);
  text(ctx, String(Math.round(state.speed * KT)), 184, 112, 52, PALETTE.text);
  text(ctx, String(Math.round(((state.heading % 360) + 360) % 360)).padStart(3, '0'), 312, 112, 52, PALETTE.text);
  text(ctx, 'ft', 132, 112, 20, PALETTE.muted, 'left', 600);
  text(ctx, 'kt', 272, 112, 20, PALETTE.muted, 'left', 600);
  text(ctx, '°', 388, 112, 20, PALETTE.muted, 'left', 600);
  const vs = state.vspeed * 196.85;
  const vsColor = vs < -800 ? PALETTE.danger : PALETTE.good;
  text(ctx, `VS ${vs >= 0 ? '+' : ''}${Math.round(vs)} fpm`, 44, 132, 20, vsColor, 'left', 600);
}

/** Fuel gauge, wind arrow and strip name, top right. */
export function drawFuelWind(ctx, state) {
  panel(ctx, FIELD.width - 324, 20, 300, 118);
  text(ctx, 'FUEL', FIELD.width - 304, 52, 22, PALETTE.muted, 'left', 600);
  const fuelColor = state.fuel < 20 ? PALETTE.danger : state.fuel < 45 ? PALETTE.warn : PALETTE.good;
  text(ctx, `${Math.round(state.fuel)}%`, FIELD.width - 304, 112, 52, fuelColor);
  ctx.fillStyle = 'rgba(244,241,230,0.25)';
  ctx.fillRect(FIELD.width - 200, 78, 156, 16);
  ctx.fillStyle = fuelColor;
  ctx.fillRect(FIELD.width - 200, 78, Math.max(0, 156 * state.fuel / 100), 16);
  const cross = state.wind.crossAt(state.time);
  const arrow = cross > 1 ? '→' : cross < -1 ? '←' : '·';
  text(ctx, `ANGIN ${arrow} ${Math.abs(Math.round(cross))} m/s`, FIELD.width - 200, 52, 20, PALETTE.text, 'left', 600);
  text(ctx, state.strip.name, FIELD.width - 304, 132, 20, PALETTE.text, 'left', 600);
  text(ctx, state.strip.mission, FIELD.width - 44, 132, 20, PALETTE.muted, 'right', 600);
}

/** Throttle bar along the bottom, with the stall band marked. */
export function drawThrottle(ctx, state) {
  const x = 24;
  const y = FIELD.height - 52;
  const w = 340;
  panel(ctx, x, y - 6, w + 130, 44, 0.6);
  text(ctx, 'THR', x + 12, y + 24, 22, PALETTE.muted, 'left', 600);
  ctx.fillStyle = 'rgba(244,241,230,0.25)';
  ctx.fillRect(x + 70, y + 8, w - 90, 14);
  ctx.fillStyle = state.stalled ? PALETTE.danger : PALETTE.good;
  ctx.fillRect(x + 70, y + 8, Math.max(0, (w - 90) * state.throttle), 14);
  text(ctx, `${Math.round(state.throttle * 100)}%`, x + w + 16, y + 24, 22, PALETTE.text, 'left', 600);
  if (state.stalled) text(ctx, 'STALL', x + w + 96, y + 24, 22, PALETTE.danger, 'left', 800);
}

/**
 * The GLIDEPATH avionics strip, right side: the ideal 3-degree line against
 * the aircraft's real descent trace, with a diamond for where it is now.
 * This is the instrument, not a diagram: bezel, ticks and a live trace.
 */
export function drawGlideStrip(ctx, state) {
  const x = FIELD.width - 244;
  const y = 168;
  const w = 220;
  const h = 300;
  panel(ctx, x, y, w, h);
  text(ctx, 'GLIDEPATH 3°', x + 16, y + 34, 22, PALETTE.text, 'left', 700);
  const plotX = x + 18;
  const plotY = y + 52;
  const plotW = w - 36;
  const plotH = h - 96;
  const maxDist = 1800;
  const maxAlt = 130;
  const px = (dist) => plotX + plotW - (dist / maxDist) * plotW;
  const py = (alt) => plotY + plotH - (alt / maxAlt) * plotH;
  ctx.strokeStyle = 'rgba(244,241,230,0.2)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(plotX + (plotW * i) / 4, plotY);
    ctx.lineTo(plotX + (plotW * i) / 4, plotY + plotH);
    ctx.stroke();
  }
  // Ideal line.
  ctx.strokeStyle = PALETTE.good;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  ctx.lineTo(px(maxDist), py(idealAlt(maxDist)));
  ctx.stroke();
  // Real trace.
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < state.trace.length; i += 1) {
    const p = state.trace[i];
    const tx = px(p.dist);
    const ty = py(p.alt);
    if (!started) {
      ctx.moveTo(tx, ty);
      started = true;
    } else ctx.lineTo(tx, ty);
  }
  ctx.stroke();
  // Current position diamond.
  const cx = px(Math.max(0, state.dist));
  const cy = py(state.alt);
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx + 9, cy);
  ctx.lineTo(cx, cy + 9);
  ctx.lineTo(cx - 9, cy);
  ctx.closePath();
  ctx.fill();
  const band = slopeBand(state);
  const bandText = band === 'on' ? 'ON SLOPE' : band === 'above' ? 'DI ATAS GARIS' : 'DI BAWAH GARIS';
  const bandColor = band === 'on' ? PALETTE.good : PALETTE.warn;
  text(ctx, bandText, x + w / 2, y + h - 14, 22, bandColor, 'center', 800);
}

/** Centre flash messages: flare calls, stall warnings, fuel warnings. */
export function drawFlash(ctx, state) {
  if (state.messageTime > 0 && state.message) {
    text(ctx, state.message, FIELD.width / 2, 210, 34, PALETTE.warn, 'center', 800);
  }
  if (state.flared && state.phase === 'fly') {
    text(ctx, 'FLARE — TARIK!', FIELD.width / 2, 258, 30, PALETTE.good, 'center', 800);
  }
  if (state.timer > 0 && state.phase === 'fly') {
    const t = Math.ceil(state.timer);
    text(ctx, `MEDEVAC ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, FIELD.width / 2, 170, 30, t < 20 ? PALETTE.danger : PALETTE.text, 'center', 800);
  }
}
