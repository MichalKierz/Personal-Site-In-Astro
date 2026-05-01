import { ACTION_POOL, MAX_TURNS } from "./data.js";
import {
  applyAction,
  applyEvent,
  canUseAction,
  collectIncome,
  completeEventLine,
  createEventLine,
  getAnimalIncome,
  getAnimalTotal,
  hasUsableAction,
  pickActions,
  takeEventForTurn,
} from "./mechanics.js";

const BEST_SCORE_KEY = "pasture-tactics-best-score";
const DO_NOTHING_ACTION_ID = "do-nothing";

export { canUseAction, getAnimalIncome, hasUsableAction };

export function createState(canvas) {
  const state = {
    width: canvas.width,
    height: canvas.height,
    score: 0,
    best: loadBestScore(),
    turn: 1,
    maxTurns: MAX_TURNS,
    animals: createStartingAnimals(),
    actions: [],
    events: [],
    currentEvent: {
      uid: "start",
      title: "Ready",
      detail: "No event yet",
      type: "start",
      turnNumber: 0,
    },
    message: "Choose an action to start.",
    finished: false,
    finishReason: "",
    lastTime: 0,
    eventShiftStartedAt: 0,
    eventShiftDuration: 520,
    inputBufferDuration: 120,
    restartBufferDuration: 650,
    interactionLockedUntil: 0,
    canRestartAt: 0,
    eventsVersion: 0,
    actionsVersion: 0,
  };

  state.events = createEventLine(state.turn, state.maxTurns);
  state.actions = pickActions();

  return state;
}

export function restart(state, now = performance.now()) {
  state.score = 0;
  state.turn = 1;
  state.animals = createStartingAnimals();
  state.events = createEventLine(state.turn, state.maxTurns);
  state.currentEvent = {
    uid: "start",
    title: "Ready",
    detail: "No event yet",
    type: "start",
    turnNumber: 0,
  };
  state.message = "Choose an action to start.";
  state.finished = false;
  state.finishReason = "";
  state.eventShiftStartedAt = 0;
  state.interactionLockedUntil = now + 180;
  state.canRestartAt = 0;
  state.actions = pickActions();
  state.eventsVersion += 1;
  state.actionsVersion += 1;
}

export function playAction(state, actionId, now = performance.now()) {
  if (state.finished) {
    if (now < state.canRestartAt) {
      return false;
    }

    restart(state, now);
    return true;
  }

  if (now < state.interactionLockedUntil) {
    return false;
  }

  const currentTurn = state.turn;
  const isDoNothing = actionId === DO_NOTHING_ACTION_ID;

  state.events = completeEventLine(state.events, currentTurn, state.maxTurns);

  const action = isDoNothing
    ? null
    : ACTION_POOL.find((entry) => entry.id === actionId);

  if (!isDoNothing && (!action || !canUseAction(state, action))) {
    return false;
  }

  if (action) {
    applyAction(state, action);
  }

  collectIncome(state);

  const event = takeEventForTurn(state.events, currentTurn, state.maxTurns);
  const eventText = applyEvent(state, event);

  state.currentEvent = event;
  state.message = eventText;

  if (event.type === "game-end" || currentTurn >= state.maxTurns) {
    finishGame(state, now, "20 turns completed.", "game-end", eventText);
  } else if (getAnimalTotal(state) <= 0) {
    finishGame(state, now, "All animals are gone.", "game-over", eventText);
  } else {
    state.turn = currentTurn + 1;
    state.events = completeEventLine(state.events, state.turn, state.maxTurns);
    state.actions = pickActions();
  }

  state.eventShiftStartedAt = now;
  state.interactionLockedUntil = now + state.eventShiftDuration + state.inputBufferDuration;
  state.eventsVersion += 1;
  state.actionsVersion += 1;

  return true;
}

function finishGame(state, now, reason, endType, lastEventText) {
  state.finished = true;
  state.finishReason = reason;
  state.turn = Math.min(state.turn, state.maxTurns);
  state.actions = [];
  state.events = [];
  state.canRestartAt = now + state.restartBufferDuration;

  const isNewBest = Number(state.score || 0) > Number(state.best || 0);

  if (isNewBest) {
    state.best = state.score;
    saveBestScore(state.best);
  }

  if (endType === "game-over") {
    state.currentEvent = {
      uid: `${endType}-${now}`,
      title: "Game Over",
      detail: "All animals are gone",
      type: "game-over",
      turnNumber: Math.min(state.turn, state.maxTurns),
    };
  }

  const finalText = isNewBest
    ? `Final score: ${state.score}. New best score.`
    : `Final score: ${state.score}.`;

  state.message = lastEventText
    ? `${lastEventText} ${finalText}`
    : finalText;
}

function createStartingAnimals() {
  return {
    chickens: 2,
    sheep: 1,
    pigs: 0,
    cows: 0,
  };
}

function loadBestScore() {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {}
}