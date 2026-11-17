// Keyboard and pointer input. Held keys give a thrust vector; one-shot presses (start
// or restart, pause, Nova, mute) are queued as bit flags and taken once by the loop, so
// a press between two frames is never lost and never counted twice. The pointer works
// too: hold the mouse button and the ship thrusts toward the cursor.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_NOVA = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const BRAKE = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const NOVA = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let brake = false;
  let actions = 0;
  let pointerHeld = false;
  let pointerX = 0;
  let pointerY = 0;
  // The renderer's scale and offset: client pixels in, field pixels out.
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (BRAKE.has(event.code)) brake = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      if (NOVA.has(event.code) && !event.repeat) actions |= ACTION_NOVA;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (BRAKE.has(event.code)) brake = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    brake = false;
    pointerHeld = false;
  });
  target.addEventListener('pointerdown', (event) => {
    pointerHeld = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  });
  window.addEventListener('pointerup', () => {
    pointerHeld = false;
  });

  return {
    /** Called by the renderer whenever the view is resized. */
    setTransform(nextScale, nextOffsetX, nextOffsetY) {
      scale = nextScale;
      offsetX = nextOffsetX;
      offsetY = nextOffsetY;
    },
    /** Thrust vector, -1..1 on each axis: keys win, else the held pointer steers. */
    thrust() {
      const kx = (right ? 1 : 0) - (left ? 1 : 0);
      const ky = (down ? 1 : 0) - (up ? 1 : 0);
      if (kx !== 0 || ky !== 0) {
        const len = Math.hypot(kx, ky);
        return { x: kx / len, y: ky / len };
      }
      if (pointerHeld) {
        const fx = (pointerX - offsetX) / scale;
        const fy = (pointerY - offsetY) / scale;
        return { x: fx, y: fy, pointer: true };
      }
      return { x: 0, y: 0 };
    },
    get braking() {
      return brake;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
