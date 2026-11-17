// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. The nebula is painted once to an offscreen canvas; the stars twinkle on the
// world's clock, so a screenshot scene always paints the same frame.

import { FIELD, FONT, LEVEL_BONUS, LIVES, PALETTE } from './config.js';
import { KIND_EMBER, KIND_PRISM } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const LIFE_SIZE = 18;
const LIFE_GAP = 9;
const QUOTA_BAR = { width: 220, height: 10 };
const NOVA_BAR = { width: 280, height: 12 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas, random, onResize) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const levelLabel = cachedLabel('LEVEL ');
  const finalLabel = cachedLabel('SCORE ');

  // The nebula: painted once, reused every frame.
  const nebula = document.createElement('canvas');
  nebula.width = FIELD.width;
  nebula.height = FIELD.height;
  const neb = nebula.getContext('2d');
  const sky = neb.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  neb.fillStyle = sky;
  neb.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const blob of [
    { x: 300, y: 170, r: 430, color: PALETTE.nebulaA, alpha: 0.32 },
    { x: 1010, y: 520, r: 470, color: PALETTE.nebulaB, alpha: 0.3 },
    { x: 920, y: 110, r: 300, color: PALETTE.nebulaC, alpha: 0.26 },
    { x: 180, y: 600, r: 340, color: PALETTE.nebulaB, alpha: 0.22 },
  ]) {
    const grad = neb.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
    grad.addColorStop(0, blob.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    neb.globalAlpha = blob.alpha;
    neb.fillStyle = grad;
    neb.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
  }
  neb.globalAlpha = 1;

  // The stars: fixed positions from the seeded generator, so every run matches.
  const stars = [];
  for (let index = 0; index < 150; index += 1) {
    stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      r: 0.6 + random() * 1.3,
      phase: random() * Math.PI * 2,
      speed: 0.6 + random() * 1.8,
    });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    if (onResize !== undefined) onResize(view.scale, view.x, view.y);
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, bold) {
    const key = `${size}:${bold === true ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold === true ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawSky(state) {
    context.drawImage(nebula, 0, 0);
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(state.elapsed * star.speed + star.phase));
      context.globalAlpha = twinkle;
      context.fillStyle = PALETTE.star;
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawPlanets(state) {
    for (const planet of state.planets) {
      // The gravity ring: a faint dashed circle showing how far the pull reaches.
      context.strokeStyle = PALETTE.ring;
      context.globalAlpha = 0.16;
      context.setLineDash([6, 10]);
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(planet.x, planet.y, planet.radius + 175, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.globalAlpha = 1;
      const grad = context.createRadialGradient(
        planet.x - planet.radius * 0.35, planet.y - planet.radius * 0.4, planet.radius * 0.1,
        planet.x, planet.y, planet.radius,
      );
      const base = planet.radius > 50 ? PALETTE.planetA : planet.radius > 42 ? PALETTE.planetB : PALETTE.planetC;
      grad.addColorStop(0, '#a98f6e');
      grad.addColorStop(0.45, base);
      grad.addColorStop(1, PALETTE.planetEdge);
      context.fillStyle = grad;
      context.beginPath();
      context.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(0,0,0,0.25)';
      for (const crater of planet.craters) {
        context.beginPath();
        context.arc(planet.x + crater.dx * planet.radius, planet.y + crater.dy * planet.radius, crater.r * planet.radius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawMotes(state) {
    for (const mote of state.motes) {
      if (!mote.active) continue;
      if (mote.kind === KIND_EMBER) {
        context.save();
        context.translate(mote.x, mote.y);
        context.rotate(state.elapsed * 1.5 + mote.phase);
        context.shadowColor = PALETTE.ember;
        context.shadowBlur = 14;
        context.fillStyle = PALETTE.ember;
        context.beginPath();
        context.moveTo(0, -mote.radius);
        context.lineTo(mote.radius * 0.75, 0);
        context.lineTo(0, mote.radius);
        context.lineTo(-mote.radius * 0.75, 0);
        context.closePath();
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = PALETTE.emberCore;
        context.beginPath();
        context.arc(0, 0, mote.radius * 0.32, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else if (mote.kind === KIND_PRISM) {
        context.save();
        context.translate(mote.x, mote.y);
        context.rotate(state.elapsed * 2.4);
        context.shadowColor = PALETTE.prism;
        context.shadowBlur = 18;
        context.fillStyle = PALETTE.prism;
        context.beginPath();
        context.moveTo(0, -mote.radius);
        context.lineTo(mote.radius, 0);
        context.lineTo(0, mote.radius);
        context.lineTo(-mote.radius, 0);
        context.closePath();
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(0, 0, mote.radius * 0.3, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else {
        context.save();
        context.shadowColor = PALETTE.gold;
        context.shadowBlur = 16;
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = PALETTE.goldCore;
        context.beginPath();
        context.arc(mote.x, mote.y, mote.radius * 0.55, 0, Math.PI * 2);
        context.fill();
        // Four-point sparkle.
        context.strokeStyle = PALETTE.goldCore;
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(mote.x - mote.radius - 5, mote.y);
        context.lineTo(mote.x + mote.radius + 5, mote.y);
        context.moveTo(mote.x, mote.y - mote.radius - 5);
        context.lineTo(mote.x, mote.y + mote.radius + 5);
        context.stroke();
        context.restore();
      }
    }
  }

  function drawComets(state) {
    for (const comet of state.comets) {
      if (!comet.active) continue;
      const speed = Math.hypot(comet.vx, comet.vy) || 1;
      const nx = comet.vx / speed;
      const ny = comet.vy / speed;
      for (let step = 3; step >= 1; step -= 1) {
        context.globalAlpha = 0.22 * (4 - step) / 3;
        context.fillStyle = PALETTE.comet;
        context.beginPath();
        context.arc(comet.x - nx * step * 14, comet.y - ny * step * 14, comet.radius * (0.75 - step * 0.12), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.save();
      context.shadowColor = PALETTE.comet;
      context.shadowBlur = 16;
      context.fillStyle = PALETTE.comet;
      context.beginPath();
      context.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = PALETTE.cometCore;
      context.beginPath();
      context.arc(comet.x - nx * 3, comet.y - ny * 3, comet.radius * 0.45, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawShip(state) {
    const ship = state.ship;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (ship.invulnerable > 0 && Math.floor(ship.invulnerable * 10) % 2 === 0) return;
    context.save();
    context.translate(ship.x, ship.y);
    context.rotate(ship.angle);
    if (ship.thrusting) {
      const flicker = 0.7 + 0.3 * Math.sin(state.elapsed * 31);
      context.fillStyle = PALETTE.flame;
      context.globalAlpha = 0.85;
      context.beginPath();
      context.moveTo(-12, -6);
      context.lineTo(-12 - 16 * flicker, 0);
      context.lineTo(-12, 6);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
    }
    context.shadowColor = PALETTE.ship;
    context.shadowBlur = 18;
    context.fillStyle = PALETTE.ship;
    context.beginPath();
    context.moveTo(18, 0);
    context.lineTo(-12, -11);
    context.lineTo(-7, 0);
    context.lineTo(-12, 11);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.shipCore;
    context.beginPath();
    context.arc(2, 0, 4.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (state.combo >= 2) {
      text(`x${state.combo} COMBO`, ship.x, ship.y - 30, 18, PALETTE.gold, 'center', true);
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawTexts(state) {
    context.textBaseline = 'alphabetic';
    for (const t of state.texts) {
      if (!t.active) continue;
      context.globalAlpha = Math.max(0, Math.min(1, t.life));
      text(t.text, t.x, t.y, t.size, t.color, 'center', true);
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left', true);
    text(bestLabel(best), 24, 50, 17, PALETTE.muted, 'left');
    text(levelLabel(state.level), FIELD.width / 2, 18, 26, PALETTE.text, 'center', true);
    // The quota bar under the level: how much of this level is harvested.
    const qx = FIELD.width / 2 - QUOTA_BAR.width / 2;
    const qy = 52;
    context.fillStyle = 'rgba(255,255,255,0.14)';
    context.fillRect(qx, qy, QUOTA_BAR.width, QUOTA_BAR.height);
    context.fillStyle = PALETTE.gold;
    context.fillRect(qx, qy, QUOTA_BAR.width * Math.min(1, state.quotaDone / state.quota), QUOTA_BAR.height);
    text(`${state.quotaDone} / ${state.quota} motes`, FIELD.width / 2, qy + 16, 15, PALETTE.muted, 'center');
    // Lives as little lanterns, top right.
    const firstLife = FIELD.width - 24 - LIVES * (LIFE_SIZE + LIFE_GAP) + LIFE_GAP;
    text('LANTERNS', firstLife - 12, 18, 17, PALETTE.muted, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      const lx = firstLife + life * (LIFE_SIZE + LIFE_GAP);
      if (life < state.lives) {
        context.save();
        context.shadowColor = PALETTE.ship;
        context.shadowBlur = 10;
        context.fillStyle = PALETTE.ship;
        context.beginPath();
        context.arc(lx + LIFE_SIZE / 2, 52 + LIFE_SIZE / 2, LIFE_SIZE / 2, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else {
        context.strokeStyle = PALETTE.muted;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(lx + LIFE_SIZE / 2, 52 + LIFE_SIZE / 2, LIFE_SIZE / 2, 0, Math.PI * 2);
        context.stroke();
      }
    }
    // The Nova meter, bottom centre.
    const nx = FIELD.width / 2 - NOVA_BAR.width / 2;
    const ny = FIELD.height - 34;
    context.fillStyle = 'rgba(255,255,255,0.14)';
    context.fillRect(nx, ny, NOVA_BAR.width, NOVA_BAR.height);
    context.fillStyle = PALETTE.nova;
    context.fillRect(nx, ny, NOVA_BAR.width * (state.nova / 100), NOVA_BAR.height);
    const ready = state.nova >= 100;
    const pulse = ready ? 0.65 + 0.35 * Math.sin(state.elapsed * 6) : 1;
    context.globalAlpha = pulse;
    text(ready ? 'NOVA READY — SPACE' : 'NOVA', FIELD.width / 2, ny - 24, 17, ready ? PALETTE.nova : PALETTE.muted, 'center', ready);
    context.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 74, 46, PALETTE.text, 'center', true);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.gold, 'center', true);
  }

  const TITLE_LINES = [
    'Harvest starlight. Dodge the comets. Mind the gravity.',
    'Move: WASD or arrows — or hold the mouse. Brake: Shift.',
    'Space: Nova when the meter is full.  P: pause.  M: mute.',
    'Fill each level\'s quota to clear it. Fly off an edge to wrap around.',
    '',
  ];
  const PAUSED_LINES = ['The sky will wait for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the sky, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Screen shake on a hit: a small offset that dies with the shake timer.
    const shake = state.shake > 0 ? state.shake * 7 : 0;
    const sx = shake * Math.sin(state.elapsed * 47);
    const sy = shake * Math.cos(state.elapsed * 39);
    context.setTransform(view.scale, 0, 0, view.scale, view.x + sx * view.scale, view.y + sy * view.scale);
    drawSky(state);
    drawPlanets(state);
    drawMotes(state);
    drawComets(state);
    drawParticles(state);
    drawShip(state);
    drawTexts(state);
    // The Nova's flash: a violet wash that fades as the ring expands.
    if (state.novaFlash > 0) {
      const f = state.novaFlash / 0.45;
      const grad = context.createRadialGradient(state.ship.x, state.ship.y, 0, state.ship.x, state.ship.y, 430);
      grad.addColorStop(0, `rgba(201,166,255,${0.5 * f})`);
      grad.addColorStop(1, 'rgba(201,166,255,0)');
      context.fillStyle = grad;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      context.strokeStyle = `rgba(230,214,255,${0.9 * f})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(state.ship.x, state.ship.y, 60 + (1 - f) * 380, 0, Math.PI * 2);
      context.stroke();
    }
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('LUMEN DRIFT', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = `Level ${state.level}  ·  ${state.motesCollected} motes gathered`;
      drawPanel('GAME OVER', OVER_LINES, 'Press Space or click to play again');
    } else if (state.levelBanner > 0) {
      const alpha = Math.min(1, state.levelBanner);
      context.globalAlpha = alpha;
      text(`LEVEL ${state.level}  ·  +${LEVEL_BONUS}`, FIELD.width / 2, 150, 40, PALETTE.gold, 'center', true);
      text('Quota filled — the sky clears', FIELD.width / 2, 190, 20, PALETTE.text, 'center');
      context.globalAlpha = 1;
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
