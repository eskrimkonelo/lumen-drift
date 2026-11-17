// Pure movement maths, no state of its own: gravity from the planets, one integration
// step, and circle tests. The world owns the bodies; this file only moves them.

/**
 * Add every planet's pull to a body's velocity. Pull falls with the square of the
 * distance and is capped, so a close pass bends the path instead of slamming it.
 */
export function applyGravity(body, planets, dt, pull) {
  for (let index = 0; index < planets.length; index += 1) {
    const planet = planets[index];
    const dx = planet.x - body.x;
    const dy = planet.y - body.y;
    const distSq = dx * dx + dy * dy;
    const reach = planet.radius + pull.reach;
    if (distSq >= reach * reach || distSq < 1) continue;
    const dist = Math.sqrt(distSq);
    const accel = Math.min(pull.maxPull, (pull.surfacePull * planet.radius * planet.radius) / distSq);
    body.vx += (dx / dist) * accel * dt;
    body.vy += (dy / dist) * accel * dt;
  }
}

/** Move a body by its velocity, then bleed speed off with drag. */
export function integrate(body, dt, drag) {
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  const keep = Math.max(0, 1 - drag * dt);
  body.vx *= keep;
  body.vy *= keep;
}

/** Cap a body's speed; returns true when it was over the cap. */
export function clampSpeed(body, max) {
  const speedSq = body.vx * body.vx + body.vy * body.vy;
  if (speedSq <= max * max) return false;
  const speed = Math.sqrt(speedSq);
  body.vx = (body.vx / speed) * max;
  body.vy = (body.vy / speed) * max;
  return true;
}

/** True when two circles touch. */
export function circlesTouch(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const reach = a.radius + b.radius;
  return dx * dx + dy * dy < reach * reach;
}

/** Distance between two points. */
export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
