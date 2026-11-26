// Keyboard and pointer input. Held keys give pitch and bank; W and S move the
// throttle lever; one-shot presses (start, pause, strip choice, restart) are
// queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const PITCH_UP = new Set(['ArrowUp', 'KeyI']);
const PITCH_DOWN = new Set(['ArrowDown', 'KeyK']);
const BANK_LEFT = new Set(['ArrowLeft', 'KeyA']);
const BANK_RIGHT = new Set(['ArrowRight', 'KeyD']);
const THROTTLE_UP = new Set(['KeyW']);
const THROTTLE_DOWN = new Set(['KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const STRIP_KEYS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);

export function createInput(target) {
  let pitchUp = false;
  let pitchDown = false;
  let bankLeft = false;
  let bankRight = false;
  let throttleUp = false;
  let throttleDown = false;
  let actions = 0;
  let stripChoice = -1;

  window.addEventListener('keydown', (event) => {
    if (PITCH_UP.has(event.code)) pitchUp = true;
    else if (PITCH_DOWN.has(event.code)) pitchDown = true;
    else if (BANK_LEFT.has(event.code)) bankLeft = true;
    else if (BANK_RIGHT.has(event.code)) bankRight = true;
    else if (THROTTLE_UP.has(event.code)) throttleUp = true;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (STRIP_KEYS.has(event.code)) {
      stripChoice = Number(event.code.slice(-1)) - 1;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (PITCH_UP.has(event.code)) pitchUp = false;
    else if (PITCH_DOWN.has(event.code)) pitchDown = false;
    else if (BANK_LEFT.has(event.code)) bankLeft = false;
    else if (BANK_RIGHT.has(event.code)) bankRight = false;
    else if (THROTTLE_UP.has(event.code)) throttleUp = false;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    pitchUp = false;
    pitchDown = false;
    bankLeft = false;
    bankRight = false;
    throttleUp = false;
    throttleDown = false;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1..1 for pitch, bank and throttle lever movement. */
    control() {
      return {
        pitch: (pitchUp ? 1 : 0) - (pitchDown ? 1 : 0),
        bank: (bankRight ? 1 : 0) - (bankLeft ? 1 : 0),
        throttle: (throttleUp ? 1 : 0) - (throttleDown ? 1 : 0),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The strip number key pressed since the last call, or -1. */
    takeStripChoice() {
      const choice = stripChoice;
      stripChoice = -1;
      return choice;
    },
  };
}
