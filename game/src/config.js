// Lumen Drift: every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. Gravity is gentle on purpose: the ship always out-thrusts it, so
// a planet bends your path instead of eating you.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const SHIP = {
  radius: 13,
  /** Acceleration from full thrust, px/s^2. */
  thrust: 980,
  maxSpeed: 540,
  /** Velocity lost to drag every second (space is a little sticky here, on purpose). */
  drag: 0.55,
  /** Extra damping while the brake is held. */
  brake: 4.2,
  invulnerable: 2.0,
};

export const LIVES = 3;

/** Planets drift slowly around anchor points; their gravity bends the ship, never yanks it. */
export const PLANET = {
  count: 3,
  radii: [58, 46, 38],
  /** Gravity reaches this far past a planet's edge. */
  reach: 175,
  /** Acceleration at the surface, px/s^2; it falls with the square of the distance. */
  surfacePull: 165,
  /** Hard cap on gravity acceleration, so a close pass stays fair. */
  maxPull: 230,
  /** How far a planet wanders from its anchor, in px. */
  driftRadius: 46,
  /** Seconds for one slow drift loop. */
  driftPeriod: 55,
};

export const MOTE = {
  radius: 9,
  points: 10,
  /** Seconds between single-mote spawns at level 1; it shrinks as levels rise. */
  interval: 0.95,
  intervalPerLevel: 0.94,
  minInterval: 0.5,
  /** Slow downward drift of a mote, px/s, before its wobble. */
  fall: 16,
  wobble: 14,
  /** Chance a spawned mote is a violet ember (Nova charge) instead of gold. */
  emberChance: 0.14,
  emberPoints: 5,
  /** Nova charge a single ember mote gives. */
  emberCharge: 25,
  /** Seconds between arc spawns: a ring of motes around one planet. */
  arcInterval: 11,
  arcCount: 6,
  /** Seconds between rare prism motes. */
  prismInterval: 38,
  prismPoints: 50,
  prismCharge: 50,
};

export const COMET = {
  radius: 15,
  interval: 2.3,
  intervalPerLevel: 0.9,
  minInterval: 0.95,
  speed: 175,
  speedPerLevel: 16,
  speedJitter: 60,
  /** A shard is the fast, small comet that shows up from level 3. */
  shardRadius: 8,
  shardInterval: 3.6,
  shardSpeed: 330,
  shardMinLevel: 3,
  /** Score for a comet the Nova clears. */
  novaPoints: 15,
};

/** Chained pickups raise the multiplier; it resets when the chain timer runs out or you are hit. */
export const COMBO = { window: 2.5, max: 5 };

/** Motes a level's quota needs; filling it clears the level. */
export const QUOTA = { base: 12, perLevel: 4 };
export const LEVEL_BONUS = 200;

/** The Nova: full meter, one key, clears every comet and pulls nearby motes in. */
export const NOVA = { max: 100, pullRadius: 430, pullTime: 1.2, flashTime: 0.45 };

export const LEVEL = { max: 12 };

/** How many of each thing can exist at once; the pools are allocated once, at boot. */
export const POOL = { motes: 48, comets: 24, particles: 260, texts: 16 };

export const PALETTE = {
  backdrop: '#070a1a',
  skyTop: '#0b1030',
  skyBottom: '#1a1040',
  nebulaA: '#3b2a6e',
  nebulaB: '#0f4a5c',
  nebulaC: '#5c2a4a',
  star: '#dfe6ff',
  planetA: '#7a5c3e',
  planetB: '#3e6b7a',
  planetC: '#6e3e5c',
  planetEdge: '#0b1030',
  ring: '#8b93b8',
  gold: '#ffd166',
  goldCore: '#fff3c4',
  ember: '#b388ff',
  emberCore: '#e6d6ff',
  prism: '#7ef0d4',
  comet: '#ff5d5d',
  cometCore: '#ffb3b3',
  ship: '#ffb347',
  shipCore: '#fff0c4',
  flame: '#ff8a3c',
  text: '#f2f4ff',
  muted: '#9aa3c7',
  panel: '#141a33',
  panelEdge: '#3a4470',
  danger: '#ff6b6b',
  nova: '#c9a6ff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';
