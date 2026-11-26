// A small seeded random number generator (mulberry32): the same seed gives the
// same ridges, islands, clouds and gusts, which is what makes the screenshot
// scenes repeatable from one run to the next.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random value in [min, max) from a seeded generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
}
