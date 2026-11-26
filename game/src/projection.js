// The chase camera: turns a world point (x metres across the runway, y metres
// up, z metres past the threshold, negative before it) into a screen point on
// the 1280x720 playfield. The camera sits just behind and above the aircraft
// and looks along the aircraft's heading, so the runway ahead converges the
// way a real final approach does. Nothing here needs a 3D library.

import { FIELD } from './config.js';

/** Focal length in logical pixels; the horizon sits a little above centre. */
const FOCAL = 760;
const HORIZON_Y = 308;
const CENTRE_X = FIELD.width / 2;

export function createCamera(state) {
  const heading = (state.heading * Math.PI) / 180;
  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);
  // Camera trails the aircraft: mostly its lateral offset, a little above it,
  // and forty-five metres behind it, so the aircraft stays in frame and the
  // runway ahead opens up below the horizon.
  const camX = state.lat * 0.82;
  const camY = state.alt + 14;
  const camZ = -state.dist - 45;

  return {
    horizonY: HORIZON_Y,
    /** The camera's own z, so the runway can start ahead of it when the */
    /** aircraft has already passed the threshold. */
    z: camZ,
    /** Project a world point; returns null when it is behind the camera. */
    project(x, y, z) {
      const dx = x - camX;
      const dy = y - camY;
      const dz = z - camZ;
      // Rotate into camera space: forward is the heading, right is 90 degrees off it.
      const forward = dx * sinH + dz * cosH;
      if (forward < 6) return null;
      const right = dx * cosH - dz * sinH;
      const scale = FOCAL / forward;
      return {
        x: CENTRE_X + right * scale,
        y: HORIZON_Y - dy * scale,
        scale,
        depth: forward,
      };
    },
    /** How big one metre looks at a given depth, in logical pixels. */
    scaleAt(depth) {
      return FOCAL / Math.max(depth, 6);
    },
  };
}
