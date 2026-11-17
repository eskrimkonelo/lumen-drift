// The game's rules and state, with no drawing and no browser in it: the lantern-ship,
// the drifting planets, the motes, the comets, the Nova, the combo, the quota and the
// levels. step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (sound, announcements) without the world knowing about screens or
// sound. Nothing here allocates after createWorld returns.

import {
  FIELD, SHIP, PLANET, MOTE, COMET, COMBO, QUOTA, LEVEL_BONUS, NOVA, LEVEL, POOL,
} from './config.js';
import { applyGravity, integrate, clampSpeed, circlesTouch, distance } from './physics.js';

export const KIND_GOLD = 0;
export const KIND_EMBER = 1;
export const KIND_PRISM = 2;

export const EVENT_PICKUP = 1;
export const EVENT_EMBER = 2;
export const EVENT_PRISM = 4;
export const EVENT_HIT = 8;
export const EVENT_OVER = 16;
export const EVENT_LEVEL = 32;
export const EVENT_NOVA = 64;

/** Motes the current level's quota needs. */
export function quotaNeeded(level) {
  return QUOTA.base + QUOTA.perLevel * (level - 1);
}

export function createWorld(random) {
  const ship = {
    x: FIELD.width / 2, y: FIELD.height * 0.55, vx: 0, vy: 0,
    radius: SHIP.radius, invulnerable: 0, angle: -Math.PI / 2, thrusting: false,
  };
  const planets = [];
  for (let index = 0; index < PLANET.count; index += 1) {
    const craters = [];
    for (let c = 0; c < 5; c += 1) {
      craters.push({ dx: (random() - 0.5) * 1.1, dy: (random() - 0.5) * 1.1, r: 0.1 + random() * 0.16 });
    }
    planets.push({
      x: 0, y: 0, anchorX: 0, anchorY: 0, radius: PLANET.radii[index],
      phase: random() * Math.PI * 2, driftRadius: PLANET.driftRadius,
      driftPeriod: PLANET.driftPeriod * (0.8 + random() * 0.4), craters,
    });
  }
  const motes = [];
  for (let index = 0; index < POOL.motes; index += 1) {
    motes.push({ active: false, kind: KIND_GOLD, x: 0, y: 0, vx: 0, vy: 0, radius: MOTE.radius, wobble: 0, phase: 0 });
  }
  const comets = [];
  for (let index = 0; index < POOL.comets; index += 1) {
    comets.push({ active: false, shard: false, x: 0, y: 0, vx: 0, vy: 0, radius: COMET.radius, spin: 0 });
  }
  const particles = [];
  for (let index = 0; index < POOL.particles; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  }
  const texts = [];
  for (let index = 0; index < POOL.texts; index += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, text: '', color: '#ffffff', size: 20 });
  }

  const state = {
    ship, planets, motes, comets, particles, texts,
    score: 0, lives: 3, level: 1, quota: quotaNeeded(1), quotaDone: 0,
    combo: 1, comboTimer: 0, nova: 0, elapsed: 0,
    levelBanner: 0, novaFlash: 0, novaPull: 0, shake: 0,
    motesCollected: 0, cometsCleared: 0, thrustMag: 0,
    moteTimer: 0, cometTimer: 0, shardTimer: 0, arcTimer: 0, prismTimer: 0,
  };

  function freeMote() {
    for (let index = 0; index < motes.length; index += 1) if (!motes[index].active) return motes[index];
    return null;
  }

  function freeComet() {
    for (let index = 0; index < comets.length; index += 1) if (!comets[index].active) return comets[index];
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) if (!particles[index].active) return particles[index];
    return null;
  }

  function freeText() {
    for (let index = 0; index < texts.length; index += 1) if (!texts[index].active) return texts[index];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const p = freeParticle();
      if (p === null) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.4 + random() * 0.5;
      p.life = p.maxLife;
      p.size = 1.5 + random() * 2.5;
      p.color = color;
    }
  }

  function addText(x, y, text, color, size) {
    const t = freeText();
    if (t === null) return;
    t.active = true;
    t.x = x;
    t.y = y;
    t.life = 1;
    t.text = text;
    t.color = color;
    t.size = size ?? 20;
  }

  function placePlanets() {
    const anchors = [
      { x: FIELD.width * 0.26, y: FIELD.height * 0.3 },
      { x: FIELD.width * 0.74, y: FIELD.height * 0.26 },
      { x: FIELD.width * 0.5, y: FIELD.height * 0.78 },
    ];
    for (let index = 0; index < planets.length; index += 1) {
      const planet = planets[index];
      planet.anchorX = anchors[index].x + (random() - 0.5) * 120;
      planet.anchorY = anchors[index].y + (random() - 0.5) * 80;
      planet.x = planet.anchorX;
      planet.y = planet.anchorY;
    }
  }

  function reset() {
    ship.x = FIELD.width / 2;
    ship.y = FIELD.height * 0.55;
    ship.vx = 0;
    ship.vy = 0;
    ship.invulnerable = 0;
    ship.angle = -Math.PI / 2;
    ship.thrusting = false;
    for (const mote of motes) mote.active = false;
    for (const comet of comets) comet.active = false;
    for (const particle of particles) particle.active = false;
    for (const text of texts) text.active = false;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.quota = quotaNeeded(1);
    state.quotaDone = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.nova = 0;
    state.elapsed = 0;
    state.levelBanner = 0;
    state.novaFlash = 0;
    state.novaPull = 0;
    state.shake = 0;
    state.motesCollected = 0;
    state.cometsCleared = 0;
    state.thrustMag = 0;
    state.moteTimer = 0.4;
    state.cometTimer = 2.0;
    state.shardTimer = 3.0;
    state.arcTimer = 5.0;
    state.prismTimer = 20;
    placePlanets();
    // A few motes already falling when play starts, so the first seconds are busy.
    for (let index = 0; index < 6; index += 1) spawnMote(KIND_GOLD, 120 + random() * (FIELD.width - 240), 40 + random() * 200);
  }

  function spawnMote(kind, x, y) {
    const mote = freeMote();
    if (mote === null) return;
    mote.active = true;
    mote.kind = kind;
    mote.x = x;
    mote.y = y;
    mote.vx = (random() - 0.5) * 12;
    mote.vy = MOTE.fall * (0.7 + random() * 0.6);
    mote.radius = kind === KIND_PRISM ? MOTE.radius + 3 : MOTE.radius;
    mote.wobble = MOTE.wobble * (0.6 + random() * 0.8);
    mote.phase = random() * Math.PI * 2;
  }

  function spawnArc() {
    const planet = planets[Math.floor(random() * planets.length)];
    const count = MOTE.arcCount;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + random() * 0.3;
      const dist = planet.radius + 70 + random() * 40;
      spawnMote(KIND_GOLD, planet.x + Math.cos(angle) * dist, planet.y + Math.sin(angle) * dist);
    }
  }

  function spawnComet(shard) {
    const comet = freeComet();
    if (comet === null) return;
    const edge = Math.floor(random() * 4);
    const speed = shard
      ? COMET.shardSpeed * (0.9 + random() * 0.3)
      : COMET.speed + COMET.speedPerLevel * (state.level - 1) + random() * COMET.speedJitter;
    if (edge === 0) { comet.x = -30; comet.y = random() * FIELD.height; }
    else if (edge === 1) { comet.x = FIELD.width + 30; comet.y = random() * FIELD.height; }
    else if (edge === 2) { comet.x = random() * FIELD.width; comet.y = -30; }
    else { comet.x = random() * FIELD.width; comet.y = FIELD.height + 30; }
    const tx = FIELD.width * (0.25 + random() * 0.5);
    const ty = FIELD.height * (0.25 + random() * 0.5);
    const len = Math.hypot(tx - comet.x, ty - comet.y) || 1;
    comet.vx = ((tx - comet.x) / len) * speed;
    comet.vy = ((ty - comet.y) / len) * speed;
    comet.active = true;
    comet.shard = shard;
    comet.radius = shard ? COMET.shardRadius : COMET.radius * (0.85 + random() * 0.4);
    comet.spin = random() * Math.PI * 2;
  }

  function hitShip() {
    state.lives -= 1;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = 1;
    ship.invulnerable = SHIP.invulnerable;
    burst(ship.x, ship.y, '#ff6b6b', 22, 260);
    addText(ship.x, ship.y - 30, 'HIT!', '#ff6b6b', 26);
    if (state.lives === 0) return EVENT_OVER;
    return 0;
  }

  function collectMote(mote) {
    mote.active = false;
    state.motesCollected += 1;
    state.quotaDone += 1;
    let event = EVENT_PICKUP;
    let gained = 0;
    if (mote.kind === KIND_GOLD) {
      gained = MOTE.points * state.combo;
      burst(mote.x, mote.y, '#ffd166', 10, 140);
      addText(mote.x, mote.y - 12, `+${gained}`, '#ffd166', 20);
    } else if (mote.kind === KIND_EMBER) {
      gained = MOTE.emberPoints * state.combo;
      state.nova = Math.min(NOVA.max, state.nova + MOTE.emberCharge);
      event = EVENT_EMBER;
      burst(mote.x, mote.y, '#b388ff', 12, 160);
      addText(mote.x, mote.y - 12, `+${gained} NOVA`, '#c9a6ff', 20);
    } else {
      gained = MOTE.prismPoints * state.combo;
      state.nova = Math.min(NOVA.max, state.nova + MOTE.prismCharge);
      event = EVENT_PRISM;
      burst(mote.x, mote.y, '#7ef0d4', 18, 220);
      addText(mote.x, mote.y - 12, `+${gained} PRISM`, '#7ef0d4', 24);
    }
    state.score += gained;
    if (state.combo < COMBO.max) state.combo += 1;
    state.comboTimer = COMBO.window;
    if (state.combo >= 3) addText(ship.x, ship.y - 34, `COMBO x${state.combo}`, '#fff3c4', 18);
    return event;
  }

  function clearLevel() {
    state.score += LEVEL_BONUS;
    state.level = Math.min(LEVEL.max, state.level + 1);
    state.quota = quotaNeeded(state.level);
    state.quotaDone = 0;
    state.levelBanner = 2.4;
    for (const comet of comets) {
      if (comet.active) {
        burst(comet.x, comet.y, '#8b93b8', 6, 120);
        comet.active = false;
      }
    }
    spawnArc();
    return EVENT_LEVEL;
  }

  function fireNova() {
    state.nova = 0;
    state.novaFlash = NOVA.flashTime;
    state.novaPull = NOVA.pullTime;
    let cleared = 0;
    for (const comet of comets) {
      if (!comet.active) continue;
      burst(comet.x, comet.y, '#c9a6ff', 12, 200);
      comet.active = false;
      cleared += 1;
    }
    state.cometsCleared += cleared;
    state.score += cleared * COMET.novaPoints;
    burst(ship.x, ship.y, '#c9a6ff', 30, 320);
    addText(ship.x, ship.y - 40, cleared > 0 ? `NOVA! +${cleared * COMET.novaPoints}` : 'NOVA!', '#c9a6ff', 26);
    return EVENT_NOVA;
  }

  /**
   * One fixed step. `ctrl` is { tx, ty, pointer, brake, nova }: with `pointer` set,
   * (tx, ty) is a target point in field coordinates, otherwise a unit thrust vector.
   * With `harmless` set (the title screen's backdrop) things drift but nothing touches
   * the ship and nothing scores.
   */
  function step(dt, ctrl, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.levelBanner > 0) state.levelBanner = Math.max(0, state.levelBanner - dt);
    if (state.novaFlash > 0) state.novaFlash = Math.max(0, state.novaFlash - dt);
    if (state.novaPull > 0) state.novaPull = Math.max(0, state.novaPull - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
    if (ship.invulnerable > 0) ship.invulnerable = Math.max(0, ship.invulnerable - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }

    // Planets drift on slow loops around their anchors.
    for (const planet of planets) {
      const a = (state.elapsed * Math.PI * 2) / planet.driftPeriod + planet.phase;
      planet.x = planet.anchorX + Math.cos(a) * planet.driftRadius;
      planet.y = planet.anchorY + Math.sin(a * 0.8) * planet.driftRadius * 0.7;
    }

    // The ship: a gentle orbit in harmless mode, the player's thrust otherwise.
    let thrustX = 0;
    let thrustY = 0;
    let thrustMag = 0;
    if (harmless) {
      const cx = FIELD.width / 2;
      const cy = FIELD.height * 0.55;
      const a = state.elapsed * 0.35;
      const tx = cx + Math.cos(a) * 300;
      const ty = cy + Math.sin(a) * 170;
      const dx = tx - ship.x;
      const dy = ty - ship.y;
      const len = Math.hypot(dx, dy) || 1;
      thrustX = dx / len;
      thrustY = dy / len;
      thrustMag = Math.min(1, len / 200) * 0.7;
    } else if (ctrl !== null) {
      if (ctrl.pointer) {
        const dx = ctrl.tx - ship.x;
        const dy = ctrl.ty - ship.y;
        const len = Math.hypot(dx, dy);
        if (len > 8) {
          thrustX = dx / len;
          thrustY = dy / len;
          thrustMag = Math.min(1, len / 140);
        }
      } else {
        thrustX = ctrl.tx;
        thrustY = ctrl.ty;
        thrustMag = Math.hypot(thrustX, thrustY) > 0 ? 1 : 0;
      }
    }
    state.thrustMag = thrustMag;
    ship.thrusting = thrustMag > 0.05;
    if (ship.thrusting) ship.angle = Math.atan2(thrustY, thrustX);
    ship.vx += thrustX * SHIP.thrust * thrustMag * dt;
    ship.vy += thrustY * SHIP.thrust * thrustMag * dt;
    applyGravity(ship, planets, dt, PLANET);
    integrate(ship, dt, SHIP.drag + (ctrl !== null && ctrl.brake ? SHIP.brake : 0));
    clampSpeed(ship, SHIP.maxSpeed);
    // Fly off one edge, come back through the other.
    if (ship.x < -24) ship.x = FIELD.width + 24;
    else if (ship.x > FIELD.width + 24) ship.x = -24;
    if (ship.y < -24) ship.y = FIELD.height + 24;
    else if (ship.y > FIELD.height + 24) ship.y = -24;
    if (ship.thrusting && random() < 0.6) {
      const p = freeParticle();
      if (p !== null) {
        p.active = true;
        p.x = ship.x - Math.cos(ship.angle) * 16;
        p.y = ship.y - Math.sin(ship.angle) * 16;
        p.vx = -Math.cos(ship.angle) * 120 + (random() - 0.5) * 40;
        p.vy = -Math.sin(ship.angle) * 120 + (random() - 0.5) * 40;
        p.maxLife = 0.35;
        p.life = p.maxLife;
        p.size = 2 + random() * 2;
        p.color = '#ff8a3c';
      }
    }

    // Spawning.
    state.moteTimer -= dt;
    if (state.moteTimer <= 0) {
      const kind = random() < MOTE.emberChance ? KIND_EMBER : KIND_GOLD;
      spawnMote(kind, 40 + random() * (FIELD.width - 80), -20);
      const interval = Math.max(MOTE.minInterval, MOTE.interval * Math.pow(MOTE.intervalPerLevel, state.level - 1));
      state.moteTimer += interval;
    }
    state.arcTimer -= dt;
    if (state.arcTimer <= 0) {
      spawnArc();
      state.arcTimer += MOTE.arcInterval;
    }
    state.prismTimer -= dt;
    if (state.prismTimer <= 0) {
      spawnMote(KIND_PRISM, 40 + random() * (FIELD.width - 80), -20);
      state.prismTimer += MOTE.prismInterval;
    }
    if (!harmless) {
      state.cometTimer -= dt;
      if (state.cometTimer <= 0) {
        spawnComet(false);
        const interval = Math.max(COMET.minInterval, COMET.interval * Math.pow(COMET.intervalPerLevel, state.level - 1));
        state.cometTimer += interval;
      }
      if (state.level >= COMET.shardMinLevel) {
        state.shardTimer -= dt;
        if (state.shardTimer <= 0) {
          spawnComet(true);
          state.shardTimer += COMET.shardInterval;
        }
      }
    }

    // The Nova's pull: nearby motes drift toward the ship while it lasts.
    if (state.novaPull > 0) {
      for (const mote of motes) {
        if (!mote.active) continue;
        const d = distance(mote.x, mote.y, ship.x, ship.y);
        if (d < NOVA.pullRadius && d > 1) {
          const pull = 900 * (1 - d / NOVA.pullRadius) + 260;
          mote.vx += ((ship.x - mote.x) / d) * pull * dt;
          mote.vy += ((ship.y - mote.y) / d) * pull * dt;
        }
      }
    }

    // Motes drift down with a wobble, then fall away.
    for (const mote of motes) {
      if (!mote.active) continue;
      mote.x += (mote.vx + Math.sin(state.elapsed * 1.6 + mote.phase) * mote.wobble) * dt;
      mote.y += mote.vy * dt;
      if (mote.y > FIELD.height + 30) mote.active = false;
      else if (!harmless && circlesTouch(mote, ship)) events |= collectMote(mote);
    }

    // Comets fly straight across and spin.
    for (const comet of comets) {
      if (!comet.active) continue;
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      comet.spin += dt * 2;
      if (comet.x < -90 || comet.x > FIELD.width + 90 || comet.y < -90 || comet.y > FIELD.height + 90) {
        comet.active = false;
        continue;
      }
      if (!harmless && ship.invulnerable === 0 && circlesTouch(comet, ship)) {
        comet.active = false;
        burst(comet.x, comet.y, '#ff5d5d', 16, 240);
        events |= hitShip();
        if (events & EVENT_OVER) break;
      }
    }

    // Planets hurt too: bounce off their surface and lose a life, like a comet hit.
    if (!harmless && ship.invulnerable === 0) {
      for (const planet of planets) {
        const d = distance(ship.x, ship.y, planet.x, planet.y);
        if (d < planet.radius + ship.radius) {
          const nx = (ship.x - planet.x) / (d || 1);
          const ny = (ship.y - planet.y) / (d || 1);
          ship.x = planet.x + nx * (planet.radius + ship.radius + 2);
          ship.y = planet.y + ny * (planet.radius + ship.radius + 2);
          const into = ship.vx * nx + ship.vy * ny;
          if (into < 0) {
            ship.vx -= 1.6 * into * nx;
            ship.vy -= 1.6 * into * ny;
          }
          events |= hitShip();
          break;
        }
      }
    }

    // The Nova, on the player's say-so, when the meter is full.
    if (!harmless && ctrl !== null && ctrl.nova && state.nova >= NOVA.max) {
      events |= fireNova();
    }

    // A full quota clears the level.
    if (!harmless && state.quotaDone >= state.quota) {
      events |= clearLevel();
    }

    // Particles and floating texts age out.
    for (const particle of particles) {
      if (!particle.active) continue;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      if (particle.life <= 0) particle.active = false;
    }
    for (const text of texts) {
      if (!text.active) continue;
      text.y -= 34 * dt;
      text.life -= dt * 0.8;
      if (text.life <= 0) text.active = false;
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
