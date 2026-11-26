// Every tuning number and colour for LANDASAN NUSANTARA in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Glidepath the corridor is built on: three degrees, the real STOL standard. */
export const GLIDE_DEGREES = 3;
export const GLIDE_SLOPE = Math.tan((GLIDE_DEGREES * Math.PI) / 180);

/** Runway half-width in metres; the corridor gates are wider than this. */
export const RUNWAY_HALF = 11;

/** Speeds in metres per second. 38.6 m/s is 75 knots, the approach target. */
export const FLIGHT = {
  stallSpeed: 28,
  minSpeed: 12,
  maxThrottleSpeed: 60,
  approachSpeed: 38.6,
  maxBank: 28,
  maxPitch: 7,
  turnRate: 0.35,
};

/** Where the approach starts, and how the sortie is scored. */
export const SORTIE = {
  startDist: 1800,
  startAlt: 94,
  startLat: 45,
  startHeading: 10,
  startSpeed: 42,
  startThrottle: 0.55,
  fuelDrainBase: 0.18,
  fuelDrainThrottle: 0.75,
  brakeDecel: 3.2,
};

/** Touchdown quality bands, by vertical speed at the wheels (m/s, negative down). */
export const TOUCHDOWN = {
  greased: -1.6,
  firm: -3.2,
  hard: -4.5,
  crash: -6,
  maxLat: 13,
  maxHeading: 12,
  shortMargin: 15,
};

export const PALETTE = {
  backdrop: '#0e1420',
  skyTopDay: '#ff9a3d',
  skyMidDay: '#ffb877',
  skyLowDay: '#ffd9a0',
  skyTopNight: '#060a18',
  skyMidNight: '#0d1730',
  skyLowNight: '#1b2a4a',
  seaDay: '#1d6f8e',
  seaDeep: '#0d4258',
  seaNight: '#0a2036',
  ridgeDay: '#7a4a6e',
  ridgeFarDay: '#a86a7a',
  ridgeNight: '#0a1226',
  island: '#2e7d4f',
  islandSand: '#e8d29a',
  runway: '#3a3f46',
  runwayEdge: '#f2f2e8',
  grass: '#3f7d44',
  planeWhite: '#f4f1e6',
  planeRed: '#c62f2f',
  planeDark: '#23272e',
  corridor: '#37e0a0',
  corridorDim: 'rgba(55, 224, 160, 0.35)',
  panel: 'rgba(10, 16, 28, 0.82)',
  text: '#f4f1e6',
  muted: '#b9c2cc',
  warn: '#ffb020',
  danger: '#ff4d3d',
  good: '#37e0a0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'landasan-nusantara.best';
