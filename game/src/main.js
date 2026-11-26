// Boot and the one loop: input is read every frame, the flight advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and debrief. A sortie ends the moment the wheels touch —
// greased, firm, hard or crashed — and the debrief reads the landing back.
//
// ?seed=N fixes the islands and the gusts. ?shot=start|play|flare|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot. ?strip=N picks a strip.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createTerrain } from './terrain.js';
import { createFlight, stepFlight, PHASE_CRASHED, PHASE_LANDED } from './aircraft.js';
import { stripByIndex } from './missions.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const stripParam = Number.parseInt(params.get('strip') ?? '0', 10);
const stripIndex = Number.isInteger(stripParam) ? stripParam : 0;

const canvas = document.getElementById('game');
const status = document.getElementById('status');

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

function makeSortie(index) {
  const strip = stripByIndex(index);
  const terrain = createTerrain(createRandom(seed + strip.seed), strip.night);
  const renderer = createRenderer(canvas, terrain);
  const flight = createFlight(strip);
  flight.selectedStrip = index;
  return { strip, terrain, renderer, flight };
}

function runShot(name) {
  const sortie = makeSortie(stripIndex);
  const scene = stageShot(name, sortie.flight, (f, c, dt) => stepFlight(f, c, dt));
  let painted = 0;
  function paint() {
    sortie.renderer.draw(sortie.flight, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const audio = createAudio();
  const input = createInput(canvas);
  let sortie = makeSortie(0);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let thumped = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each landing.
  function announce(message) {
    status.textContent = message;
  }

  function startSortie(index) {
    sortie = makeSortie(index);
    screen = SCREEN_PLAY;
    thumped = false;
    accumulator = 0;
    audio.unlock();
    announce(`Terbang ke ${sortie.strip.name}. ${sortie.strip.mission}.`);
  }

  function endSortie() {
    screen = SCREEN_OVER;
    if (sortie.flight.score > best) {
      best = sortie.flight.score;
      saveBest(best);
    }
    audio.silence();
    announce(`${sortie.flight.verdict}. Skor ${sortie.flight.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const choice = input.takeStripChoice();
    if (choice >= 0 && screen === SCREEN_TITLE) {
      sortie.flight.selectedStrip = choice;
      startSortie(choice);
      return;
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_PAUSED)) {
      startSortie(sortie.flight.selectedStrip || 0);
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) {
      startSortie(sortie.flight.selectedStrip || 0);
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_OVER) {
      startSortie(sortie.flight.selectedStrip || 0);
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Terbang lagi.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const control = input.control();
    const before = sortie.flight.phase;
    stepFlight(sortie.flight, control, STEP);
    if (sortie.flight.phase !== before && (sortie.flight.phase === PHASE_LANDED || sortie.flight.phase === PHASE_CRASHED)) {
      if (!thumped) {
        audio.thump(sortie.flight.phase === PHASE_CRASHED);
        thumped = true;
      }
      endSortie();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    audio.update(sortie.flight.throttle, sortie.flight.speed);
    sortie.renderer.draw(sortie.flight, screen, best);
  }

  // Leaving the tab pauses a running sortie rather than letting it fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  // The debug handle the playtest drives: state, strip choice and a restart.
  window.__game = {
    get flight() {
      return sortie.flight;
    },
    get screen() {
      return screen;
    },
    start(index) {
      startSortie(index);
    },
  };

  announce('Landasan Nusantara. Pilih strip 1 sampai 5, tekan Spasi untuk terbang.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
