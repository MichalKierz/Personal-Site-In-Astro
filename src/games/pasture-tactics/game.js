import { ANIMAL_BY_KEY, ANIMALS } from "./data.js";
import { canUseAction, createState, getAnimalIncome, playAction } from "./state.js";
import { render, renderEvents } from "./renderer.js";

const DO_NOTHING_ACTION_ID = "do-nothing";

export function initPastureTactics() {
  const roots = document.querySelectorAll("[data-pasture-game]");

  roots.forEach((root) => {
    if (root.dataset.ready === "true") {
      return;
    }

    root.dataset.ready = "true";
    setup(root);
  });
}

function setup(root) {
  const canvas = root.querySelector("[data-canvas]");
  const context = canvas.getContext("2d");

  const nodes = {
    score: root.querySelector("[data-score]"),
    turn: root.querySelector("[data-turn]"),
    maxTurns: root.querySelector("[data-max-turns]"),
    best: root.querySelector("[data-best]"),
    animals: root.querySelector("[data-animals]"),
    actions: root.querySelector("[data-actions]"),
    events: root.querySelector("[data-events]"),
    message: root.querySelector("[data-message]"),
  };

  const state = createState(canvas);

  function handleAction(actionId) {
    playAction(state, actionId, performance.now());
  }

  root.addEventListener("pointerdown", (event) => {
    if (!state.finished) {
      return;
    }

    if (event.target.closest(".pasture-action")) {
      return;
    }

    playAction(state, "restart", performance.now());
  });

  function frame(time) {
    state.lastTime = time;

    updateHud(state, nodes, handleAction, time);
    render(context, state);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function updateHud(state, nodes, onActionSelected, now) {
  nodes.score.textContent = String(state.score);
  nodes.turn.textContent = String(Math.min(state.turn, state.maxTurns));
  nodes.maxTurns.textContent = String(state.maxTurns);
  nodes.best.textContent = String(state.best);
  nodes.message.textContent = state.message;

  renderAnimals(state, nodes.animals);
  renderActions(state, nodes.actions, onActionSelected, now);
  renderEvents(state, nodes.events);
}

function renderAnimals(state, node) {
  const signature = ANIMALS.map((animal) => {
    return `${animal.key}:${state.animals[animal.key]}:${getAnimalIncome(state, animal.key)}`;
  }).join("|");

  if (node.dataset.signature === signature) {
    return;
  }

  node.dataset.signature = signature;

  node.replaceChildren(
    ...ANIMALS.map((animal) => {
      const item = document.createElement("div");
      item.className = "pasture-animal";

      const icon = document.createElement("span");
      icon.className = "pasture-animal-icon";
      icon.textContent = animal.icon;

      const content = document.createElement("span");
      content.className = "pasture-animal-content";

      const label = document.createElement("span");
      label.className = "pasture-animal-label";
      label.textContent = animal.name;

      const value = document.createElement("strong");
      value.textContent = String(state.animals[animal.key]);

      const score = document.createElement("span");
      score.className = "pasture-animal-score";
      score.textContent = `+${getAnimalIncome(state, animal.key)} score/turn`;

      content.append(label, value, score);
      item.append(icon, content);

      return item;
    })
  );
}

function renderActions(state, node, onActionSelected, now) {
  const locked = !state.finished && now < state.interactionLockedUntil;
  const restartLocked = state.finished && now < state.canRestartAt;
  const actionIds = state.actions.map((action) => action.id).join("|");
  const signature = [
    state.actionsVersion,
    state.finished ? "finished" : "playing",
    locked ? "locked" : "open",
    restartLocked ? "restart-locked" : "restart-open",
    state.finishReason,
    actionIds,
  ].join(":");

  if (node.dataset.signature === signature) {
    return;
  }

  node.dataset.signature = signature;

  if (state.finished) {
    const button = document.createElement("button");

    button.className = "pasture-action pasture-action-restart";
    button.type = "button";
    button.disabled = restartLocked;

    const title = document.createElement("span");
    title.className = "pasture-action-title";
    title.textContent = "Restart";

    const detail = document.createElement("span");
    detail.className = "pasture-action-detail";

    if (restartLocked) {
      detail.textContent = "Wait a moment";
    } else if (state.finishReason === "All animals are gone.") {
      detail.textContent = "Game over • Tap to play again";
    } else {
      detail.textContent = "20 turns done • Tap to play again";
    }

    button.append(title, detail);

    button.addEventListener("click", () => {
      onActionSelected("restart");
    });

    node.replaceChildren(button);
    return;
  }

  const doNothing = createDoNothingButton(locked, onActionSelected);

  const buttons = state.actions.map((action) => {
    const usable = canUseAction(state, action);
    const button = document.createElement("button");

    button.className = "pasture-action";
    button.type = "button";
    button.disabled = locked || !usable;
    button.dataset.actionId = action.id;

    const title = document.createElement("span");
    title.className = "pasture-action-title";
    title.textContent = `${getActionIcon(action)} ${action.title}`;

    const detail = document.createElement("span");
    detail.className = "pasture-action-detail";
    detail.textContent = action.detail;

    button.append(title, detail);

    button.addEventListener("click", () => {
      onActionSelected(action.id);
    });

    return button;
  });

  node.replaceChildren(doNothing, ...buttons);
}

function createDoNothingButton(locked, onActionSelected) {
  const button = document.createElement("button");

  button.className = "pasture-action pasture-action-do-nothing";
  button.type = "button";
  button.disabled = locked;

  const title = document.createElement("span");
  title.className = "pasture-action-title";
  title.textContent = "Do Nothing";

  const detail = document.createElement("span");
  detail.className = "pasture-action-detail";
  detail.textContent = "Skip action";

  button.append(title, detail);

  button.addEventListener("click", () => {
    onActionSelected(DO_NOTHING_ACTION_ID);
  });

  return button;
}

function getActionIcon(action) {
  const animalKey =
    action.animal ||
    Object.keys(action.costs || {})[0] ||
    Object.keys(action.rewards || {})[0];

  return ANIMAL_BY_KEY[animalKey]?.icon || "";
}