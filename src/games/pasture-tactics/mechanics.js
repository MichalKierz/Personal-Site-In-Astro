import { ACTION_POOL, ANIMAL_BY_KEY, ANIMALS, EVENT_POOL, EVENT_SLOTS } from "./data.js";

const NEGATIVE_EVENT_CHANCE = 0.2;
const POSITIVE_EVENT_CHANCE = 0.1;

let nextEventUid = 0;

export function canUseAction(state, action) {
  if (!action) {
    return false;
  }

  if (action.type === "adopt") {
    return true;
  }

  if (action.type === "breed") {
    return getAnimalCount(state, action.animal) >= 2;
  }

  if (action.type === "trade") {
    return Object.entries(action.costs).every(([key, amount]) => {
      return getAnimalCount(state, key) >= amount;
    });
  }

  if (action.type === "cull") {
    return getAnimalCount(state, action.animal) > 0;
  }

  return false;
}

export function hasUsableAction(state) {
  return ACTION_POOL.some((action) => canUseAction(state, action));
}

export function getAnimalTotal(state) {
  return Object.values(state.animals).reduce((sum, count) => {
    return sum + Number(count || 0);
  }, 0);
}

export function getAnimalIncome(state, animalKey) {
  const animal = ANIMAL_BY_KEY[animalKey];

  if (!animal) {
    return 0;
  }

  return getAnimalCount(state, animalKey) * animal.value;
}

export function getTotalIncome(state) {
  return ANIMALS.reduce((sum, animal) => {
    return sum + getAnimalIncome(state, animal.key);
  }, 0);
}

export function applyAction(state, action) {
  if (action.type === "adopt") {
    state.animals[action.animal] = getAnimalCount(state, action.animal) + 1;
    return;
  }

  if (action.type === "breed") {
    const count = getAnimalCount(state, action.animal);
    const gained = Math.floor(count / 2);

    state.animals[action.animal] = count + gained;
    return;
  }

  if (action.type === "trade") {
    Object.entries(action.costs).forEach(([key, amount]) => {
      state.animals[key] = getAnimalCount(state, key) - amount;
    });

    Object.entries(action.rewards).forEach(([key, amount]) => {
      state.animals[key] = getAnimalCount(state, key) + amount;
    });

    return;
  }

  if (action.type === "cull") {
    const animal = ANIMAL_BY_KEY[action.animal];
    const count = getAnimalCount(state, action.animal);
    const cullScore = Number(animal?.cullScore ?? action.scorePerAnimal ?? 0);

    state.animals[action.animal] = 0;
    state.score = Number(state.score || 0) + count * cullScore;
  }
}

export function collectIncome(state) {
  const income = getTotalIncome(state);

  state.score = Number(state.score || 0) + income;

  return income;
}

export function applyEvent(state, event) {
  if (event.type === "none") {
    return "Nothing happens.";
  }

  if (event.type === "game-end") {
    return "Game ended.";
  }

  if (event.type === "blessing") {
    const gained = {
      chickens: Math.floor(getAnimalCount(state, "chickens") / 2),
      sheep: Math.floor(getAnimalCount(state, "sheep") / 2),
      pigs: Math.floor(getAnimalCount(state, "pigs") / 2),
      cows: Math.floor(getAnimalCount(state, "cows") / 2),
    };

    Object.entries(gained).forEach(([key, amount]) => {
      state.animals[key] = getAnimalCount(state, key) + amount;
    });

    const parts = Object.entries(gained)
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => `+${amount} ${formatAnimal(key, amount)}`);

    if (parts.length === 0) {
      return "All pairs try to reproduce, but nothing changes.";
    }

    return `All pairs reproduce: ${parts.join(", ")}.`;
  }

  if (event.type === "fox") {
    return applyFoxEvent(state, event);
  }

  if (event.losses) {
    return applyLossEvent(state, event);
  }

  return "Nothing happens.";
}

function applyFoxEvent(state, event) {
  const current = getAnimalCount(state, event.target);
  const rawLoss = current * event.fraction;
  const lost = event.rounding === "ceil" ? Math.ceil(rawLoss) : Math.floor(rawLoss);

  state.animals[event.target] = Math.max(0, current - lost);

  if (lost <= 0) {
    return "Fox finds no chickens.";
  }

  return `Fox eats ${lost} ${formatAnimal(event.target, lost)}.`;
}

function applyLossEvent(state, event) {
  const lost = {};

  Object.entries(event.losses).forEach(([key, amount]) => {
    const loss = Math.min(amount, getAnimalCount(state, key));

    state.animals[key] = getAnimalCount(state, key) - loss;
    lost[key] = loss;
  });

  const parts = Object.entries(lost)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => `${amount} ${formatAnimal(key, amount)}`);

  if (parts.length === 0) {
    if (event.type === "wolf") {
      return "Wolf finds nothing to eat.";
    }

    if (event.type === "bear") {
      return "Bear finds no cows.";
    }

    if (event.type === "flood") {
      return "Flood changes nothing.";
    }

    return `${event.title} changes nothing.`;
  }

  if (event.type === "flood") {
    return `Flood removes ${joinParts(parts)}.`;
  }

  return `${event.title} kills ${joinParts(parts)}.`;
}

export function pickActions() {
  return shuffle(ACTION_POOL).slice(0, 5);
}

export function createEventLine(currentTurn, maxTurns) {
  return completeEventLine([], currentTurn, maxTurns);
}

export function completeEventLine(events, currentTurn, maxTurns) {
  const existingEvents = new Map();
  const existingEndEvent = events.find((event) => {
    return event.type === "game-end" && event.turnNumber === maxTurns;
  });

  events.forEach((event) => {
    if (
      event.type !== "game-end" &&
      event.turnNumber >= currentTurn &&
      event.turnNumber < maxTurns
    ) {
      existingEvents.set(event.turnNumber, event);
    }
  });

  const completed = [];
  let turnNumber = currentTurn;

  while (completed.length < EVENT_SLOTS && turnNumber <= maxTurns) {
    if (turnNumber === maxTurns) {
      completed.push(existingEndEvent || createEndEvent(maxTurns));
    } else if (existingEvents.has(turnNumber)) {
      completed.push(existingEvents.get(turnNumber));
    } else {
      completed.push(randomEventForTurn(turnNumber));
    }

    turnNumber += 1;
  }

  return completed;
}

export function takeEventForTurn(events, turnNumber, maxTurns) {
  if (turnNumber >= maxTurns) {
    return takeEndEvent(events, maxTurns);
  }

  const index = events.findIndex((event) => {
    return event.type !== "game-end" && event.turnNumber === turnNumber;
  });

  if (index >= 0) {
    const [event] = events.splice(index, 1);
    return event;
  }

  return randomEventForTurn(turnNumber);
}

export function takeEndEvent(events, maxTurns) {
  const index = events.findIndex((event) => {
    return event.type === "game-end" && event.turnNumber === maxTurns;
  });

  if (index >= 0) {
    const [event] = events.splice(index, 1);
    return event;
  }

  return createEndEvent(maxTurns);
}

export function randomEventForTurn(turnNumber) {
  const neutralEvents = EVENT_POOL.filter((event) => event.type === "none");
  const positiveEvents = EVENT_POOL.filter((event) => event.type === "blessing");
  const negativeEvents = EVENT_POOL.filter((event) => {
    return event.type === "fox" || event.type === "wolf" || event.type === "bear" || event.type === "flood";
  });

  let pool = neutralEvents;
  const roll = Math.random();

  if (turnNumber <= 3) {
    if (roll < POSITIVE_EVENT_CHANCE && positiveEvents.length > 0) {
      pool = positiveEvents;
    }
  } else if (roll < POSITIVE_EVENT_CHANCE && positiveEvents.length > 0) {
    pool = positiveEvents;
  } else if (
    roll < POSITIVE_EVENT_CHANCE + NEGATIVE_EVENT_CHANCE &&
    negativeEvents.length > 0
  ) {
    pool = negativeEvents;
  }

  const event = clone(pool[Math.floor(Math.random() * pool.length)]);

  event.uid = `${event.id}-${turnNumber}-${nextEventUid}`;
  event.turnNumber = turnNumber;
  nextEventUid += 1;

  return event;
}

export function createEndEvent(maxTurns) {
  const event = {
    id: "game-end",
    title: "Game End",
    detail: `${maxTurns} turns completed`,
    type: "game-end",
    turnNumber: maxTurns,
  };

  event.uid = `${event.id}-${maxTurns}-${nextEventUid}`;
  nextEventUid += 1;

  return event;
}

function getAnimalCount(state, key) {
  return Number(state.animals[key] || 0);
}

function joinParts(parts) {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function shuffle(items) {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.item);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatAnimal(key, count) {
  const animal = ANIMAL_BY_KEY[key];

  if (!animal) {
    return key;
  }

  if (key === "sheep") {
    return "sheep";
  }

  return count === 1 ? animal.singular.toLowerCase() : animal.name.toLowerCase();
}