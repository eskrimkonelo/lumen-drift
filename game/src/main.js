// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|end|nova (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. window.__lumen exposes the live state for testing and debugging.

import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_EMBER, EVENT_HIT, EVENT_LEVEL, EVENT_NOVA, EVENT_OVER, EVENT_PICKUP, EVENT_PRISM } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_NOVA, ACTION_PAUSE, createInput } from './input.js';
import { createSoundBank } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const sounds = createSoundBank();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const renderer = createRenderer(canvas, random);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const renderer = createRenderer(canvas, random, (scale, x, y) => input.setTransform(scale, x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // The live state, for scripted play-tests and debugging. Harmless in play.
  window.__lumen = {
    get screen() { return screen; },
    get score() { return world.state.score; },
    get lives() { return world.state.lives; },
    get level() { return world.state.level; },
    get nova() { return world.state.nova; },
    get state() { return world.state; },
  };

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sounds.unlock();
    sounds.start();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lanterns. Fill the quota to clear the level.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    sounds.over();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = sounds.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, true);
      return;
    }
    const ctrl = input.thrust();
    const events = world.step(STEP, {
      tx: ctrl.x, ty: ctrl.y, pointer: ctrl.pointer === true,
      brake: input.braking, nova: (actions & ACTION_NOVA) !== 0,
    }, false);
    if (events & EVENT_PICKUP) sounds.pickup(world.state.combo);
    if (events & EVENT_EMBER) sounds.ember();
    if (events & EVENT_PRISM) sounds.prism();
    if (events & EVENT_NOVA) sounds.nova();
    if (events & EVENT_LEVEL) {
      sounds.level();
      announce(`Level ${world.state.level}. Quota ${world.state.quota} motes.`);
    }
    if (events & EVENT_HIT) {
      sounds.hurt();
      announce(world.state.lives === 1 ? 'Hit. 1 lantern left.' : `Hit. ${world.state.lives} lanterns left.`);
    }
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One take per frame: handleActions and step share the same presses.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting comets fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Drift. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
