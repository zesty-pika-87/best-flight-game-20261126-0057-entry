// The screenshot scenes behind ?shot=start|play|flare|end. Each one flies the
// real rules forward from a fresh sortie, steered by a simple autopilot —
// throttle holds the approach speed, bank holds the centreline, pitch holds
// the glidepath, and the nose comes up for the flare at the threshold — so
// the frame is what a short game really looks like, and the same seed always
// gives the same frame. The end scene flies badly on purpose: it holds the
// throttle low and never flares, so it ends the way a hurried player ends.

import { FLIGHT, STEP } from './config.js';
import { PHASE_CRASHED, PHASE_LANDED } from './aircraft.js';
import { idealAlt } from './glidepath.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 8;
const PLAY_DIST = 650;
const LIMIT_SECONDS = 120;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** The autopilot: speed by throttle, centreline by bank, slope by pitch. */
export function autopilot(state, careless) {
  const speedError = FLIGHT.approachSpeed - state.speed;
  const throttle = careless ? -1 : clamp(speedError * 0.12, -1, 1);
  // Aim the nose a little into the wind and back toward the centreline.
  const cross = state.wind.crossAt(state.time);
  const headingWant = clamp(-state.lat * 0.14 - cross * 0.6, -12, 12);
  const bank = careless ? 0 : clamp((headingWant - state.heading) * 0.25, -1, 1);
  // Hold the 3-degree slope; near the ground, raise the nose for the flare.
  let wantVspeed = -state.speed * Math.tan((3 * Math.PI) / 180);
  const slopeError = idealAlt(state.dist) - state.alt;
  wantVspeed += clamp(slopeError * 0.06, -1.6, 1.6);
  if (!careless && state.alt < 14 && state.dist < 240) wantVspeed = -0.45;
  if (careless) wantVspeed = -4.5;
  const pitchWant = Math.asin(clamp(wantVspeed / Math.max(20, state.speed), -1, 1)) * 180 / Math.PI;
  const pitch = clamp((pitchWant - state.pitch) * 0.5, -1, 1);
  return { throttle, pitch, bank };
}

/**
 * Fly `flight` forward with the autopilot until `stop` says to freeze, then
 * return the screen to draw over it. `careless` flies the bad approach.
 */
function flyTo(flight, step, stop, careless) {
  for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
    if (stop(flight)) break;
    if (flight.phase !== 'fly') break;
    step(flight, autopilot(flight, careless), STEP);
  }
  return flight;
}

/**
 * Set `flight` to the named scene (start, play, flare or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, flight, step) {
  if (name === 'play') {
    flyTo(flight, step, (f) => f.dist <= PLAY_DIST, false);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'flare') {
    // Fly all the way to the wheels, then freeze on the touchdown frame:
    // verdict banner up, tyre smoke behind the wheels.
    flyTo(flight, step, (f) => f.phase === PHASE_LANDED || f.phase === PHASE_CRASHED, false);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    flyTo(flight, step, (f) => f.phase === PHASE_LANDED || f.phase === PHASE_CRASHED, false);
    const over = flight.phase === PHASE_CRASHED || flight.phase === PHASE_LANDED;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: flight.score };
  }
  // Title: fly the approach for a few seconds so the panel sits over live sky.
  flyTo(flight, step, (f) => f.time >= START_SECONDS, false);
  return { screen: SCREEN_TITLE, best: 0 };
}
