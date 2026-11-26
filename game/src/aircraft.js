// The flight model: lift, drag, throttle, stall and flare, in plain numbers.
// Throttle sets the speed the engine wants; pitch sets the climb or descent;
// bank turns the nose; below stall speed the wing stops lifting and the
// aircraft sinks. Touchdown is judged the way a landing is judged: where the
// wheels meet the runway, how hard, how straight, and how much runway is left.

import { FLIGHT, RUNWAY_HALF, SORTIE, TOUCHDOWN } from './config.js';
import { idealAlt, pushTrace } from './glidepath.js';
import { createWind, windDrift } from './wind.js';

export const PHASE_FLY = 'fly';
export const PHASE_LANDED = 'landed';
export const PHASE_CRASHED = 'crashed';

/** Fresh sortie state for a strip, ready to fly the approach. */
export function createFlight(strip) {
  return {
    strip,
    wind: createWind(strip),
    dist: SORTIE.startDist,
    alt: SORTIE.startAlt,
    lat: SORTIE.startLat,
    heading: SORTIE.startHeading,
    speed: SORTIE.startSpeed,
    pitch: -3,
    bank: 0,
    throttle: SORTIE.startThrottle,
    vspeed: -2,
    fuel: strip.fuel,
    gearDamage: 0,
    time: 0,
    timer: strip.timer,
    phase: PHASE_FLY,
    flared: false,
    verdict: null,
    verdictReason: '',
    touchdown: null,
    score: 0,
    smoke: [],
    trace: [{ dist: SORTIE.startDist, alt: SORTIE.startAlt }],
    traceTimer: 0,
    message: '',
    messageTime: 0,
    stalled: false,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setMessage(state, text) {
  state.message = text;
  state.messageTime = 2.2;
}

/** Score a finished landing from the touchdown numbers. */
function scoreLanding(state, touchdown) {
  let score = 1000;
  score -= Math.abs(touchdown.lat) * 12;
  score -= Math.abs(touchdown.heading) * 10;
  score -= Math.max(0, -touchdown.vspeed - 1) * 60;
  score -= (100 - state.fuel) * 1.5;
  score -= state.gearDamage * 150;
  if (state.strip.mission === 'Medevac' && state.timer > 0) score += 200;
  if (state.strip.night) score += 100;
  return Math.max(50, Math.round(score));
}

/** Decide what the wheels just did, and end the sortie either way. */
function touchDown(state) {
  const v = state.vspeed;
  const touchdown = {
    dist: state.dist,
    lat: state.lat,
    heading: state.heading,
    vspeed: v,
    speed: state.speed,
    fuel: state.fuel,
  };
  state.touchdown = touchdown;
  state.alt = 0;
  if (state.dist > TOUCHDOWN.shortMargin) {
    state.phase = PHASE_CRASHED;
    state.verdict = 'SHORT';
    state.verdictReason = 'Mendarat sebelum landasan — jatuh di laut.';
    return;
  }
  if (Math.abs(state.lat) > TOUCHDOWN.maxLat) {
    state.phase = PHASE_CRASHED;
    state.verdict = 'EXCURSION';
    state.verdictReason = 'Keluar dari sisi landasan.';
    return;
  }
  if (Math.abs(state.heading) > TOUCHDOWN.maxHeading) {
    state.phase = PHASE_CRASHED;
    state.verdict = 'CROSSED UP';
    state.verdictReason = 'Hidung tidak lurus saat menyentuh landasan.';
    return;
  }
  if (v < TOUCHDOWN.crash) {
    state.phase = PHASE_CRASHED;
    state.verdict = 'HARD IMPACT';
    state.verdictReason = 'Hantaman terlalu keras — roda patah.';
    return;
  }
  const roll = (state.speed * state.speed) / (2 * SORTIE.brakeDecel);
  const overrun = -state.dist + roll;
  if (overrun > state.strip.runwayLength) {
    state.phase = PHASE_CRASHED;
    state.verdict = 'OVERRUN';
    state.verdictReason = 'Landasan habis sebelum pesawat berhenti.';
    return;
  }
  state.phase = PHASE_LANDED;
  if (v > TOUCHDOWN.greased) state.verdict = 'GREASED!';
  else if (v > TOUCHDOWN.firm) state.verdict = 'FIRM';
  else {
    state.verdict = 'HARD';
    state.gearDamage += 1;
  }
  state.verdictReason = `Sentuhan ${Math.abs(v).toFixed(1)} m/s di ${state.strip.name}.`;
  state.score = scoreLanding(state, touchdown);
  for (let i = 0; i < 26; i += 1) {
    state.smoke.push({
      x: state.lat + (i % 2 === 0 ? -6 : 6) + (Math.sin(i * 7.3) * 4),
      y: 0.5,
      z: -state.dist - i * 0.8,
      r: 0.8 + (i % 5) * 0.3,
      life: 1,
    });
  }
}

/**
 * One fixed step. `control` is { throttle, pitch, bank } each in -1..1
 * (throttle -1..1 moves the lever down/up); brake is true after touchdown.
 * Returns nothing; the state carries the outcome.
 */
export function stepFlight(state, control, dt) {
  if (state.phase !== PHASE_FLY) return;
  state.time += dt;
  if (state.timer > 0) {
    state.timer -= dt;
    if (state.timer <= 0) {
      state.timer = 0;
      state.phase = PHASE_CRASHED;
      state.verdict = 'WAKTU HABIS';
      state.verdictReason = 'Medevac terlambat — pasien tidak tertolong.';
      return;
    }
  }

  // Throttle: the lever moves at a fixed rate; empty tanks mean idle only.
  state.throttle = clamp(state.throttle + control.throttle * 0.8 * dt, 0, 1);
  const effectiveThrottle = state.fuel <= 0 ? 0 : state.throttle;
  const targetSpeed = FLIGHT.minSpeed + effectiveThrottle * (FLIGHT.maxThrottleSpeed - FLIGHT.minSpeed);
  state.speed += (targetSpeed - state.speed) * 0.5 * dt;
  if (state.fuel <= 0) state.speed = Math.max(FLIGHT.minSpeed, state.speed - 2.5 * dt);

  // Bank turns the nose; pitch sets the climb. Both ease toward the command.
  const bankTarget = control.bank * FLIGHT.maxBank;
  state.bank += clamp(bankTarget - state.bank, -70 * dt, 70 * dt);
  state.heading += state.bank * FLIGHT.turnRate * dt;
  const pitchTarget = control.pitch * FLIGHT.maxPitch;
  state.pitch += clamp(pitchTarget - state.pitch, -14 * dt, 14 * dt);

  // Lift: below stall speed the wing quits and the sink grows fast.
  state.stalled = state.speed < FLIGHT.stallSpeed;
  const stallSink = state.stalled ? (FLIGHT.stallSpeed - state.speed) * 0.4 : 0;
  state.vspeed = state.speed * Math.sin((state.pitch * Math.PI) / 180) - stallSink;

  // Flare: close to the ground, a raised nose is what softens the touchdown.
  // The call comes late — below 8 m — because flaring high makes the
  // aircraft float past the runway instead of landing on it.
  state.flared = state.alt < 8 && state.dist < 200;

  state.alt += state.vspeed * dt;
  state.dist -= state.speed * Math.cos((state.pitch * Math.PI) / 180) * dt;
  const cross = state.wind.crossAt(state.time);
  state.lat += state.speed * Math.sin((state.heading * Math.PI) / 180) * dt + windDrift(cross) * dt;

  state.fuel = Math.max(0, state.fuel - (SORTIE.fuelDrainBase + effectiveThrottle * SORTIE.fuelDrainThrottle) * dt);
  if (state.fuel <= 0 && state.messageTime <= 0) setMessage(state, 'BAHAN BAKAR HABIS — MELUNCUR!');

  state.traceTimer += dt;
  if (state.traceTimer >= 0.25) {
    state.traceTimer = 0;
    pushTrace(state.trace, state);
  }
  if (state.messageTime > 0) state.messageTime -= dt;
  if (state.stalled && state.messageTime <= 0) setMessage(state, 'STALL! Tambah throttle!');
  if (state.alt <= 0) {
    state.alt = 0;
    touchDown(state);
    return;
  }
  if (state.dist < -900) {
    state.phase = PHASE_CRASHED;
    state.verdict = 'TERLEWAT';
    state.verdictReason = 'Terbang melewati strip tanpa mendarat.';
  }
  if (state.alt > 400) {
    state.alt = 400;
    state.vspeed = Math.min(state.vspeed, 0);
  }
}

/** How far the aircraft is from the ideal slope, for the HUD and the PAPI. */
export function slopeDeviation(state) {
  return state.alt - idealAlt(state.dist);
}
