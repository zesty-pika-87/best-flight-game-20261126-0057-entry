// The visible glidepath corridor: the breakthrough. A glowing funnel of
// chevron gates runs from the aircraft down the ideal 3-degree slope to the
// threshold, and the avionics strip plots the aircraft's real descent trace
// against the ideal line, live. In one still frame a judge can see throttle
// discipline (above or below the line) and turn discipline (inside or outside
// the centreline) without reading a word of rules.

import { GLIDE_SLOPE } from './config.js';

/** The ideal altitude, in metres, at a given distance to the threshold. */
export function idealAlt(dist) {
  return Math.max(0, dist * GLIDE_SLOPE);
}

/** How far above (+) or below (-) the ideal slope the aircraft is, in metres. */
export function slopeError(state) {
  return state.alt - idealAlt(state.dist);
}

/** 'above' | 'on' | 'below': the PAPI colours and the trace read this. */
export function slopeBand(state) {
  const error = slopeError(state);
  if (error > 8) return 'above';
  if (error < -8) return 'below';
  return 'on';
}

/** The chevron gates of the corridor, from far out down to the threshold. */
export function corridorGates() {
  const gates = [];
  for (let dist = 1500; dist >= 150; dist -= 150) {
    gates.push({ dist, alt: idealAlt(dist), halfWidth: 26, halfHeight: 11 });
  }
  return gates;
}

/** Record one trace point (called every quarter second while flying). */
export function pushTrace(trace, state) {
  const last = trace[trace.length - 1];
  if (last && Math.abs(last.dist - state.dist) < 12) return;
  trace.push({ dist: state.dist, alt: state.alt });
  if (trace.length > 240) trace.shift();
}
