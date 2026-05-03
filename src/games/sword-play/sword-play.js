import {
  addScore,
  createSwordPlayState,
  killPlayer,
  resetRound,
  startRound,
} from "./state.js";

import { attachSwordPlayInput } from "./input.js";
import { updatePhysics } from "./physics/physics.js";
import { renderGame } from "./renderer.js";

export function initSwordPlayGames() {
  const roots = document.querySelectorAll("[data-sword-play]");

  roots.forEach((root) => {
    if (root.dataset.ready === "true") {
      return;
    }

    root.dataset.ready = "true";
    setupSwordPlayGame(root);
  });
}

function setupSwordPlayGame(root) {
  const canvas = root.querySelector("[data-canvas]");
  const context = canvas.getContext("2d");
  const scoreNode = root.querySelector("[data-score]");
  const bestNode = root.querySelector("[data-best]");
  const messageNode = root.querySelector("[data-message]");
  const state = createSwordPlayState(canvas);

  function updateHud() {
    scoreNode.textContent = String(state.score);
    bestNode.textContent = String(state.best);
  }

  function setMessage(text) {
    messageNode.textContent = text;
    messageNode.hidden = !text;
  }

  function returnToStartState() {
    resetRound(state);
    updateHud();
    setMessage("Grab a body part to start.");
    renderGame(context, state);
  }

  function startGame() {
    if (state.status !== "idle") {
      return;
    }

    startRound(state);
    updateHud();
    setMessage("");
    requestAnimationFrame(frame);
  }

  function handleEnemyDefeated() {
    addScore(state);
    updateHud();
  }

  function handlePlayerDefeated() {
    if (killPlayer(state)) {
      updateHud();
      setMessage("");
    }
  }

  function handleResetRequested() {
    returnToStartState();
  }

  function frame(time) {
    if (state.status === "idle") {
      return;
    }

    const elapsed = time - state.lastTime;
    state.lastTime = time;
    const deltaSeconds = Math.min(0.04, Math.max(0, elapsed / 1000));

    updatePhysics(state, deltaSeconds, {
      onEnemyDefeated: handleEnemyDefeated,
      onPlayerDefeated: handlePlayerDefeated,
      onResetRequested: handleResetRequested,
    });

    renderGame(context, state);

    if (state.status !== "idle") {
      requestAnimationFrame(frame);
    }
  }

  attachSwordPlayInput({
    canvas,
    state,
    onStartRequested: startGame,
    onInputChanged: () => {
      if (state.status === "idle") {
        renderGame(context, state);
      }
    },
  });

  returnToStartState();
}