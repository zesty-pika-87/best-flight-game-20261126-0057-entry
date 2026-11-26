// Drawing only: the flight state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred. Sky, ridges,
// sea, islands, clouds, the runway, the glowing glidepath corridor and the
// bush plane are all drawn from the numbers — no images, no network.

import { FIELD, FONT, PALETTE } from './config.js';
import { createCamera } from './projection.js';
import { corridorGates, idealAlt } from './glidepath.js';
import { drawFuelWind, drawFlash, drawGlideStrip, drawPrimaryHud, drawThrottle } from './hud.js';
import { CONTROLS, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, debriefLines } from './screens.js';
import { STRIPS } from './missions.js';

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER };

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8, 14, 26, ${alpha === undefined ? 0.85 : alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(244, 241, 230, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export function createRenderer(canvas, terrain) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function drawSky(state) {
    const night = state.strip.night;
    const grad = ctx.createLinearGradient(0, 0, 0, 340);
    if (night) {
      grad.addColorStop(0, PALETTE.skyTopNight);
      grad.addColorStop(0.6, PALETTE.skyMidNight);
      grad.addColorStop(1, PALETTE.skyLowNight);
    } else {
      grad.addColorStop(0, PALETTE.skyTopDay);
      grad.addColorStop(0.6, PALETTE.skyMidDay);
      grad.addColorStop(1, PALETTE.skyLowDay);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, 340);
    if (night) {
      ctx.fillStyle = '#e8ecf4';
      ctx.beginPath();
      ctx.arc(990, 120, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8d2e4';
      ctx.beginPath();
      ctx.arc(978, 112, 8, 0, Math.PI * 2);
      ctx.arc(1002, 130, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(244,241,230,0.9)';
      for (let i = 0; i < 40; i += 1) {
        const sx = (i * 173) % 1280;
        const sy = (i * 97) % 260;
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(990, 150, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 243, 196, 0.35)';
      ctx.beginPath();
      ctx.arc(990, 150, 72, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRidges() {
    for (let i = 0; i < terrain.farRidges.length; i += 1) {
      const r = terrain.farRidges[i];
      ctx.fillStyle = terrain.night ? PALETTE.ridgeNight : PALETTE.ridgeFarDay;
      ctx.beginPath();
      ctx.moveTo(r.x, 312);
      ctx.lineTo(r.x + r.w / 2, 312 - r.h * 0.6);
      ctx.lineTo(r.x + r.w, 312);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < terrain.ridges.length; i += 1) {
      const r = terrain.ridges[i];
      ctx.fillStyle = terrain.night ? '#0d1730' : PALETTE.ridgeDay;
      ctx.beginPath();
      ctx.moveTo(r.x, 314);
      ctx.lineTo(r.x + r.w * 0.3, 314 - r.h);
      ctx.lineTo(r.x + r.w * 0.55, 314 - r.h * 0.55);
      ctx.lineTo(r.x + r.w * 0.8, 314 - r.h * 0.8);
      ctx.lineTo(r.x + r.w, 314);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSea(state, camera) {
    const grad = ctx.createLinearGradient(0, 310, 0, FIELD.height);
    if (state.strip.night) {
      grad.addColorStop(0, PALETTE.seaNight);
      grad.addColorStop(1, '#050a14');
    } else {
      grad.addColorStop(0, PALETTE.seaDay);
      grad.addColorStop(1, PALETTE.seaDeep);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 310, FIELD.width, FIELD.height - 310);
    // Sun glitter: short bright streaks on the water, placed by projection.
    for (let i = 0; i < terrain.glitter.length; i += 1) {
      const g = terrain.glitter[i];
      const p = camera.project(g.x, 0.4, g.z);
      if (!p || p.y < 312 || p.y > FIELD.height) continue;
      const twinkle = 0.25 + 0.35 * Math.abs(Math.sin(state.time * 1.3 + i));
      ctx.fillStyle = state.strip.night ? `rgba(180, 200, 235, ${twinkle * 0.5})` : `rgba(255, 230, 160, ${twinkle})`;
      ctx.fillRect(p.x - (g.len * p.scale) / 2, p.y, g.len * p.scale, 2);
    }
    // Islands: sand ring, green heart, palm dots.
    for (let i = 0; i < terrain.islands.length; i += 1) {
      const isle = terrain.islands[i];
      const p = camera.project(isle.x, 0, isle.z);
      if (!p || p.y < 312) continue;
      const r = isle.r * p.scale;
      if (r < 4) continue;
      ctx.fillStyle = PALETTE.islandSand;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.island;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - r * 0.01, r * 0.93, r * 0.27, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d5c33';
      for (let k = 0; k < isle.palms; k += 1) {
        const px = p.x + ((k - isle.palms / 2) * r * 0.22);
        ctx.beginPath();
        ctx.arc(px, p.y - r * 0.1, Math.max(2, r * 0.03), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawClouds(state, camera) {
    for (let i = 0; i < terrain.clouds.length; i += 1) {
      const c = terrain.clouds[i];
      const x = c.x + state.time * c.drift;
      const p = camera.project(x, c.y, c.z);
      if (!p) continue;
      const s = c.s * p.scale;
      if (s < 3) continue;
      ctx.fillStyle = state.strip.night ? 'rgba(120, 140, 180, 0.5)' : 'rgba(255, 248, 235, 0.85)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x - s * 0.5, p.y + s * 0.06, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + s * 0.5, p.y + s * 0.06, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRunway(state, camera) {
    const L = state.strip.runwayLength;
    const HALF = 14;
    // The near edge starts ahead of the camera: once the aircraft is past
    // the threshold the strip still fills the frame ahead of it.
    const nearZ = Math.max(0, camera.z + 8);
    const corners = [
      camera.project(-HALF, 0, nearZ),
      camera.project(HALF, 0, nearZ),
      camera.project(HALF, 0, L),
      camera.project(-HALF, 0, L),
    ];
    if (corners.some((c) => c === null)) return;
    // Grass clearing first, so the strip reads as a place, not a grey line.
    const grass = [
      camera.project(-48, 0, nearZ),
      camera.project(48, 0, nearZ),
      camera.project(48, 0, L),
      camera.project(-48, 0, L),
    ];
    if (grass.every((c) => c !== null)) {
      ctx.fillStyle = state.strip.night ? '#1d3320' : '#4a7d3f';
      ctx.beginPath();
      ctx.moveTo(grass[0].x, grass[0].y);
      ctx.lineTo(grass[1].x, grass[1].y);
      ctx.lineTo(grass[2].x, grass[2].y);
      ctx.lineTo(grass[3].x, grass[3].y);
      ctx.closePath();
      ctx.fill();
    }
    // Asphalt trapezoid.
    ctx.fillStyle = state.strip.night ? '#2e3238' : '#565b63';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fill();
    // Edge lines.
    ctx.strokeStyle = PALETTE.runwayEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.moveTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.stroke();
    // Centreline dashes.
    ctx.fillStyle = PALETTE.runwayEdge;
    for (let d = 40; d < L - 20; d += 80) {
      const a = camera.project(0, 0.1, d);
      const b = camera.project(0, 0.1, d + 36);
      if (!a || !b) continue;
      const w = Math.max(1.5, 1.2 * a.scale);
      ctx.fillRect(a.x - w / 2, Math.min(a.y, b.y), w, Math.abs(a.y - b.y) + 2);
    }
    // Threshold bars.
    for (let k = -4; k <= 4; k += 1) {
      if (k === 0) continue;
      const a = camera.project(k * 2.2 - 1, 0.1, 12);
      const b = camera.project(k * 2.2 + 1, 0.1, 12);
      if (!a || !b) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(a.x, Math.min(a.y, b.y), Math.abs(b.x - a.x), 4);
    }
    // Runway number near the threshold, sized to the distance like paint.
    const num = camera.project(0, 0.1, 55);
    if (num && num.scale > 0.12) {
      const size = Math.max(12, Math.min(56, 26 * num.scale));
      text(ctx, state.strip.runwayNumber, num.x, num.y + size * 0.55, size, '#ffffff', 'center', 800);
    }
    // Approach lights: a row of bright dots leading the eye from the dark
    // water straight into the threshold, the way a real ALS does.
    ctx.fillStyle = '#ffffff';
    for (let d = -240; d <= 0; d += 40) {
      const p = camera.project(0, 0.6, d);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, 2.6 * p.scale), 0, Math.PI * 2);
      ctx.fill();
    }
    // PAPI lights: white when above the slope, red when below, 2+2 on slope.
    const band = state.alt - idealAlt(state.dist);
    const papiColors = band > 8
      ? ['#ffffff', '#ffffff', '#ffffff', '#ffffff']
      : band < -8
        ? ['#ff2d1e', '#ff2d1e', '#ff2d1e', '#ff2d1e']
        : ['#ffffff', '#ffffff', '#ff2d1e', '#ff2d1e'];
    for (let k = 0; k < 4; k += 1) {
      const p = camera.project(-17 - k * 3.4, 0.8, 46);
      if (!p) continue;
      const s = Math.max(3, 2.2 * p.scale);
      ctx.fillStyle = papiColors[k];
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    // Windsock on the right of the threshold, leaning with the wind.
    const sock = camera.project(19, 0, 55);
    const sockTop = camera.project(19, 9, 55);
    if (sock && sockTop) {
      ctx.strokeStyle = '#d8d8d8';
      ctx.lineWidth = Math.max(2, 1.4 * sock.scale);
      ctx.beginPath();
      ctx.moveTo(sock.x, sock.y);
      ctx.lineTo(sockTop.x, sockTop.y);
      ctx.stroke();
      const lean = state.wind.crossAt(state.time) > 0 ? 1 : -1;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(sockTop.x, sockTop.y);
      ctx.lineTo(sockTop.x + lean * 16 * sock.scale, sockTop.y + 3);
      ctx.lineTo(sockTop.x, sockTop.y + 6);
      ctx.closePath();
      ctx.fill();
    }
    // Pulsing aim diamond over the touchdown zone, further down the runway
    // than the number so the two never crowd each other.
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
    const aim = camera.project(0, 1.5, 180);
    if (aim) {
      const s = Math.max(6, Math.min(30, 14 * aim.scale * pulse));
      ctx.strokeStyle = '#ffd23d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(aim.x, aim.y - s);
      ctx.lineTo(aim.x + s, aim.y);
      ctx.lineTo(aim.x, aim.y + s);
      ctx.lineTo(aim.x - s, aim.y);
      ctx.closePath();
      ctx.stroke();
    }
    // Night: runway edge lights.
    if (state.strip.night) {
      ctx.fillStyle = '#ffd23d';
      for (let d = 0; d <= L; d += 60) {
        for (const side of [-11, 11]) {
          const p = camera.project(side, 0.4, d);
          if (!p) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(2, 1.6 * p.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawCorridor(state, camera) {
    const gates = corridorGates();
    // Far gates first so near ones paint over them. Gates at or behind the
    // aircraft are skipped: one metre from the lens they would fill the sky.
    for (let i = 0; i < gates.length; i += 1) {
      const g = gates[i];
      if (g.dist > state.dist - 80) continue;
      const z = -g.dist;
      const tl = camera.project(-g.halfWidth, g.alt + g.halfHeight, z);
      const tr = camera.project(g.halfWidth, g.alt + g.halfHeight, z);
      const br = camera.project(g.halfWidth, g.alt - g.halfHeight, z);
      const bl = camera.project(-g.halfWidth, g.alt - g.halfHeight, z);
      if (!tl || !tr || !br || !bl) continue;
      const depth = Math.max(0.12, 1 - g.dist / 1800);
      ctx.fillStyle = `rgba(55, 224, 160, ${0.04 * depth + 0.01})`;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(55, 224, 160, ${0.25 + 0.55 * depth})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.stroke();
      // Chevron pointing down the slope.
      const mid = camera.project(0, g.alt - g.halfHeight * 0.4, z);
      if (mid) {
        ctx.strokeStyle = `rgba(255, 210, 61, ${0.35 + 0.5 * depth})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y + (bl.y - tl.y) * 0.5);
        ctx.lineTo(mid.x, mid.y);
        ctx.lineTo(tr.x, tr.y + (br.y - tr.y) * 0.5);
        ctx.stroke();
      }
    }
    // Dotted centreline beam down the ideal slope, ahead of the aircraft only.
    ctx.fillStyle = 'rgba(255, 210, 61, 0.85)';
    for (let d = 100; d <= 1500 && d < state.dist - 120; d += 100) {
      const p = camera.project(0, idealAlt(d), -d);
      if (!p) continue;
      const r = Math.max(1.5, Math.min(5, 2.4 * p.scale));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crosswind streaks: slanted rain of wind, only when the wind is strong.
    const cross = state.wind.crossAt(state.time);
    if (Math.abs(cross) > 4) {
      ctx.strokeStyle = 'rgba(244, 241, 230, 0.35)';
      ctx.lineWidth = 2;
      const dir = cross > 0 ? 1 : -1;
      for (let i = 0; i < 26; i += 1) {
        const sx = ((i * 197 + state.time * 90 * dir) % 1280 + 1280) % 1280;
        const sy = 330 + ((i * 89) % 260);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + dir * 26, sy + 12);
        ctx.stroke();
      }
    }
  }

  /** The Cendrawasih STOL bush plane, seen from behind and above, banked. */
  function drawPlane(state) {
    const cx = FIELD.width / 2;
    const cy = 500 - state.pitch * 4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(0.8, 0.8);
    ctx.rotate((-state.bank * Math.PI) / 180);
    // High wing, wide and straight, red tips.
    ctx.fillStyle = PALETTE.planeWhite;
    ctx.beginPath();
    ctx.moveTo(-150, -52);
    ctx.lineTo(150, -52);
    ctx.lineTo(138, -28);
    ctx.lineTo(-138, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeRed;
    ctx.fillRect(-150, -52, 26, 24);
    ctx.fillRect(124, -52, 26, 24);
    // Fuselage tapering away toward the nose.
    ctx.fillStyle = PALETTE.planeWhite;
    ctx.beginPath();
    ctx.moveTo(-34, 96);
    ctx.lineTo(-20, -78);
    ctx.lineTo(20, -78);
    ctx.lineTo(34, 96);
    ctx.closePath();
    ctx.fill();
    // Red cheatline down each side of the fuselage.
    ctx.fillStyle = PALETTE.planeRed;
    ctx.beginPath();
    ctx.moveTo(-34, 96);
    ctx.lineTo(-20, -78);
    ctx.lineTo(-13, -78);
    ctx.lineTo(-24, 96);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(34, 96);
    ctx.lineTo(20, -78);
    ctx.lineTo(13, -78);
    ctx.lineTo(24, 96);
    ctx.closePath();
    ctx.fill();
    // Tail fin and horizontal stabiliser.
    ctx.fillStyle = PALETTE.planeRed;
    ctx.beginPath();
    ctx.moveTo(-14, 96);
    ctx.lineTo(0, 52);
    ctx.lineTo(14, 96);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeWhite;
    ctx.fillRect(-72, 74, 144, 14);
    // Propeller disc at the nose, faint and spinning.
    ctx.fillStyle = 'rgba(35, 39, 46, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, -80, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wheels, ready for the runway.
    ctx.fillStyle = '#14161a';
    ctx.beginPath();
    ctx.arc(-26, 104, 11, 0, Math.PI * 2);
    ctx.arc(26, 104, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888d96';
    ctx.beginPath();
    ctx.arc(-26, 104, 4, 0, Math.PI * 2);
    ctx.arc(26, 104, 4, 0, Math.PI * 2);
    ctx.fill();
    // Registration and nav lights.
    text(ctx, 'PK-NSA', 0, 40, 15, PALETTE.planeDark, 'center', 800);
    ctx.fillStyle = '#ff2d1e';
    ctx.beginPath();
    ctx.arc(-150, -40, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#37e0a0';
    ctx.beginPath();
    ctx.arc(150, -40, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSmoke(state, camera) {
    for (let i = 0; i < state.smoke.length; i += 1) {
      const s = state.smoke[i];
      const p = camera.project(s.x, s.y, s.z);
      if (!p) continue;
      const r = Math.min(42, s.r * p.scale * (2 - s.life));
      ctx.fillStyle = `rgba(220, 220, 215, ${0.4 * s.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y - r * 0.3, Math.max(2, r), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTitle(state, best) {
    panel(ctx, 120, 44, 1040, 632, 0.96);
    text(ctx, 'LANDASAN NUSANTARA', FIELD.width / 2, 122, 58, PALETTE.text, 'center', 800);
    text(ctx, 'STOL Island Landings  ·  Cendrawasih STOL  ·  ikuti koridor hijau ke landasan', FIELD.width / 2, 158, 22, PALETTE.muted, 'center', 600);
    text(ctx, 'PILIH STRIP — tekan 1 sampai 5, lalu Spasi untuk terbang', 160, 196, 22, PALETTE.good, 'left', 700);
    for (let i = 0; i < STRIPS.length; i += 1) {
      const s = STRIPS[i];
      const y = 214 + i * 62;
      const selected = state.selectedStrip === i;
      if (selected) {
        ctx.fillStyle = 'rgba(55, 224, 160, 0.18)';
        ctx.fillRect(140, y - 4, 1000, 54);
        ctx.strokeStyle = PALETTE.corridor;
        ctx.lineWidth = 2;
        ctx.strokeRect(140, y - 4, 1000, 54);
      }
      text(ctx, `${i + 1}`, 168, y + 32, 30, selected ? PALETTE.good : PALETTE.muted, 'left', 800);
      text(ctx, s.name, 210, y + 32, 28, PALETTE.text, 'left', 700);
      text(ctx, `${s.island} · ${s.mission}`, 480, y + 32, 20, PALETTE.muted, 'left', 600);
      text(ctx, `${s.runwayLength} m · angin ${s.crosswind} m/s`, 1120, y + 32, 20, PALETTE.text, 'right', 600);
    }
    text(ctx, CONTROLS[0] + '   ·   ' + CONTROLS[1], FIELD.width / 2, 556, 21, PALETTE.muted, 'center', 600);
    text(ctx, CONTROLS[2] + '   ·   ' + CONTROLS[3], FIELD.width / 2, 586, 21, PALETTE.muted, 'center', 600);
    text(ctx, 'Terbang di koridor, flare di threshold, dan dengarkan verdict pendaratanmu.', FIELD.width / 2, 622, 21, PALETTE.text, 'center', 600);
    text(ctx, 'SPASI — TERBANG', FIELD.width / 2, 656, 24, PALETTE.good, 'center', 800);
    if (best > 0) text(ctx, `Skor terbaik: ${best}`, FIELD.width / 2, 688, 18, PALETTE.muted, 'center', 600);
  }

  function drawOver(state, best) {
    const crashed = state.phase === 'crashed';
    const verdict = state.verdict || (crashed ? 'CRASH' : 'LANDED');
    const color = crashed ? PALETTE.danger : verdict === 'GREASED!' ? PALETTE.good : verdict === 'HARD' ? PALETTE.warn : PALETTE.text;
    panel(ctx, 190, 96, 900, 528, 0.9);
    text(ctx, crashed ? 'SORTIE GAGAL' : 'DEBRIEF PENDARATAN', FIELD.width / 2, 152, 26, PALETTE.muted, 'center', 700);
    text(ctx, verdict, FIELD.width / 2, 226, 64, color, 'center', 800);
    text(ctx, state.verdictReason, FIELD.width / 2, 262, 22, PALETTE.text, 'center', 600);
    if (!crashed) text(ctx, `SKOR  ${state.score}`, FIELD.width / 2, 330, 52, PALETTE.text, 'center', 800);
    const lines = debriefLines(state);
    for (let i = 0; i < lines.length; i += 1) {
      text(ctx, lines[i], FIELD.width / 2, 372 + i * 30, 20, PALETTE.muted, 'center', 600);
    }
    text(ctx, `Skor terbaik: ${best}`, FIELD.width / 2, 372 + lines.length * 30 + 8, 20, PALETTE.muted, 'center', 600);
    text(ctx, 'R — terbang lagi    ·    1–5 — ganti strip', FIELD.width / 2, 586, 22, PALETTE.good, 'center', 800);
  }

  /** Paint one frame: the world, the aircraft, then the HUD or a panel. */
  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const camera = createCamera(state);
    drawSky(state);
    drawClouds(state, camera);
    drawRidges();
    drawSea(state, camera);
    drawCorridor(state, camera);
    drawRunway(state, camera);
    drawSmoke(state, camera);
    drawPlane(state);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    // The debrief stands alone: no HUD behind the panel, so no number is ever
    // half-hidden by a panel edge.
    if (screen === SCREEN_OVER) {
      drawOver(state, best);
      return;
    }
    drawPrimaryHud(ctx, state);
    drawFuelWind(ctx, state);
    drawGlideStrip(ctx, state);
    drawThrottle(ctx, state);
    drawFlash(ctx, state);
    // The touchdown frame: the verdict banner over the live scene, with the
    // smoke still curling behind the wheels.
    if ((state.phase === 'landed' || state.phase === 'crashed') && screen === SCREEN_PLAY) {
      const crashed = state.phase === 'crashed';
      const color = crashed ? PALETTE.danger : state.verdict === 'GREASED!' ? PALETTE.good : PALETTE.text;
      text(ctx, state.verdict || '', FIELD.width / 2, 250, 72, color, 'center', 800);
      text(ctx, state.verdictReason, FIELD.width / 2, 296, 24, PALETTE.text, 'center', 600);
      if (!crashed) text(ctx, `SKOR  ${state.score}`, FIELD.width / 2, 348, 40, PALETTE.text, 'center', 800);
    }
    if (screen === SCREEN_PAUSED) {
      panel(ctx, 440, 280, 400, 160, 0.9);
      text(ctx, 'Jeda', FIELD.width / 2, 348, 44, PALETTE.text, 'center', 800);
      text(ctx, 'Tekan P untuk lanjut terbang', FIELD.width / 2, 392, 20, PALETTE.muted, 'center', 600);
    } else if (screen === SCREEN_OVER) {
      drawOver(state, best);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
