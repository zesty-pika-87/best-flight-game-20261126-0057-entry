// Crosswind and gusts: the invisible force the player has to fight on final.
// The wind pushes the aircraft sideways, so a straight approach needs a crab
// angle into the wind, and the gusts breathe so no two seconds feel alike.

/** Build the wind for a strip: a steady crosswind plus a slow gust that swells. */
export function createWind(strip) {
  const phase = strip.seed * 1.7;
  return {
    baseCross: strip.crosswind,
    gustAmp: strip.gust,
    phase,
    /** Crosswind in m/s at this moment (positive pushes right). */
    crossAt(time) {
      return this.baseCross + this.gustAmp * Math.sin(time * 0.6 + this.phase);
    },
    /** Headwind component in m/s (positive slows the approach). */
    headAt(time) {
      return strip.headwind + this.gustAmp * 0.4 * Math.sin(time * 0.43 + this.phase * 2);
    },
  };
}

/** The drift the wind adds to lateral position each second, in metres. */
export function windDrift(crosswind) {
  return crosswind * 0.35;
}
