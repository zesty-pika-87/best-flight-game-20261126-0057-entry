// The world the aircraft flies over: a golden-hour archipelago. Distant ridge
// silhouettes, sand-fringed islands, sun glitter on the sea and drifting
// clouds — all placed once from the seeded generator, so the same seed always
// draws the same islands. The terrain is drawn in two layers: screen-space
// ridges on the horizon, and projected islands and glitter on the water.

import { range } from './random.js';

/** Build one archipelago for a strip: ridges, islands, clouds, glitter. */
export function createTerrain(random, night) {
  const ridges = [];
  let x = -80;
  while (x < 1400) {
    const w = range(random, 90, 260);
    ridges.push({ x, w, h: range(random, 40, 150), night });
    x += w * range(random, 0.55, 0.9);
  }
  const farRidges = [];
  x = -40;
  while (x < 1400) {
    const w = range(random, 140, 320);
    farRidges.push({ x, w, h: range(random, 60, 190) });
    x += w * range(random, 0.6, 0.95);
  }
  const islands = [];
  const spots = [
    [-260, 900, 150], [300, 1150, 190], [-420, 1500, 220], [520, 1750, 170],
    [-140, 2100, 240], [180, 2600, 200], [-560, 2900, 260], [420, 3300, 210],
  ];
  for (let i = 0; i < spots.length; i += 1) {
    const s = spots[i];
    islands.push({
      x: s[0] + range(random, -40, 40),
      z: s[1] + range(random, -60, 60),
      r: s[2] + range(random, -25, 25),
      palms: Math.floor(range(random, 3, 8)),
    });
  }
  const clouds = [];
  for (let i = 0; i < 14; i += 1) {
    clouds.push({
      x: range(random, -700, 700),
      y: range(random, 90, 210),
      z: range(random, 300, 3200),
      s: range(random, 40, 120),
      drift: range(random, 0.5, 2),
    });
  }
  const glitter = [];
  for (let i = 0; i < 90; i += 1) {
    glitter.push({
      x: range(random, -500, 500),
      z: range(random, 60, 2400),
      len: range(random, 6, 26),
    });
  }
  return { ridges, farRidges, islands, clouds, glitter, night };
}
