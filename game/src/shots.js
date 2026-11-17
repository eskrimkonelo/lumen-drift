// The screenshot scenes behind ?shot=start|play|end|nova. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (chase the nearest mote, keep clear of comets and planets, save the Nova
// for a crowded sky), so the frame is what a short game really looks like and the same
// seed always gives the same frame.

import { FIELD, SHIP, STEP, NOVA } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { distance } from './physics.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const NOVA_LIMIT_SECONDS = 120;
const END_LIMIT_SECONDS = 600;

/** The nearest active mote, or null when the sky is empty. */
function nearestMote(state) {
  let best = null;
  let bestDist = Infinity;
  for (const mote of state.motes) {
    if (!mote.active) continue;
    const d = distance(mote.x, mote.y, state.ship.x, state.ship.y);
    if (d < bestDist) {
      bestDist = d;
      best = mote;
    }
  }
  return best;
}

/**
 * The autopilot's thrust for one step. `careful` looks ahead for comets and planets
 * and brakes out of trouble; a careless pilot only chases motes, so it is caught out
 * as a hurried player is. Returns { tx, ty, pointer, brake, nova } like the input.
 */
function autopilot(state, careful) {
  const ship = state.ship;
  let tx = 0;
  let ty = 0;
  let brake = false;
  let nova = false;

  // Danger first: a comet close by and closing, or a planet dead ahead.
  if (careful) {
    for (const comet of state.comets) {
      if (!comet.active) continue;
      const d = distance(comet.x, comet.y, ship.x, ship.y);
      if (d < 170) {
        const away = Math.atan2(ship.y - comet.y, ship.x - comet.x);
        tx = Math.cos(away);
        ty = Math.sin(away);
        const speed = Math.hypot(ship.vx, ship.vy);
        if (speed > 380) brake = true;
        if (state.nova >= NOVA.max) nova = true;
        return { tx, ty, pointer: false, brake, nova };
      }
    }
    for (const planet of state.planets) {
      const d = distance(planet.x, planet.y, ship.x, ship.y);
      if (d < planet.radius + SHIP.radius + 70) {
        const away = Math.atan2(ship.y - planet.y, ship.x - planet.x);
        tx = Math.cos(away);
        ty = Math.sin(away);
        return { tx, ty, pointer: false, brake: false, nova: false };
      }
    }
    // A Nova is for a crowded sky: fire it when the meter is full and comets gather.
    if (state.nova >= NOVA.max) {
      let near = 0;
      for (const comet of state.comets) {
        if (comet.active && distance(comet.x, comet.y, ship.x, ship.y) < 320) near += 1;
      }
      if (near >= 2) nova = true;
    }
  }

  // Otherwise chase the nearest mote, easing off as the ship gets fast.
  const mote = nearestMote(state);
  if (mote !== null) {
    const dx = mote.x - ship.x;
    const dy = mote.y - ship.y;
    const len = Math.hypot(dx, dy) || 1;
    tx = dx / len;
    ty = dy / len;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 470) brake = true;
  }
  return { tx, ty, pointer: false, brake, nova };
}

/**
 * Set `world` to the named scene (start, play, end or nova; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'nova') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, null, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      if (world.step(STEP, autopilot(world.state, false), false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'nova') {
    // The Nova needs a crowded sky and a living ship: a careful pilot can still be
    // caught out before the meter fills, so retry from a fresh world when it dies
    // first. The frame is taken just after the flash starts, while it still blooms.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) world.reset();
      for (let index = 0; index < NOVA_LIMIT_SECONDS / STEP; index += 1) {
        const ctrl = autopilot(world.state, true);
        const events = world.step(STEP, ctrl, false);
        if (world.state.novaFlash > 0) {
          for (let extra = 0; extra < 0.15 / STEP; extra += 1) {
            world.step(STEP, autopilot(world.state, true), false);
          }
          return { screen: SCREEN_PLAY, best: world.state.score };
        }
        if (events & EVENT_OVER) break;
      }
      if (world.state.lives > 0) break;
    }
    return { screen: world.state.lives === 0 ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, true), false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
