import {
  createPaddleBallState,
  endRound,
  resetRound,
  startRound,
} from "./state.js";

import { attachPaddleInput } from "./input.js";
import { updatePhysics } from "./physics.js";
import { renderGame } from "./renderer.js";

export function initPaddleBallGames() {
  const roots = document.querySelectorAll("[data-paddle-game]");

  roots.forEach((root) => {
    if (root.dataset.ready === "true") {
      return;
    }

    root.dataset.ready = "true";
    setupPaddleBallGame(root);
  });
}

function setupPaddleBallGame(root) {
  const canvas = root.querySelector("[data-canvas]");
  const context = canvas.getContext("2d");

  const scoreNode = root.querySelector("[data-score]");
  const bestNode = root.querySelector("[data-best]");
  const messageNode = root.querySelector("[data-message]");

  const state = createPaddleBallState(canvas);

  function updateHud() {
    scoreNode.textContent = String(state.score);
    bestNode.textContent = String(state.best);
  }

  function updateMessagePosition() {
    const x = (state.ball.x + state.paddle.x) / 2;
    const y = (state.ball.y + state.paddle.y) / 2;

    messageNode.style.setProperty(
      "--message-left",
      `${(x / state.width) * 100}%`
    );

    messageNode.style.setProperty(
      "--message-top",
      `${(y / state.height) * 100}%`
    );
  }

  function setMessage(text) {
    updateMessagePosition();
    messageNode.textContent = text;
    messageNode.hidden = !text;
  }

  function handleHit() {
    state.score += 1;
    updateHud();
  }

  function returnToStartState() {
    resetRound(state);
    updateHud();
    setMessage("Grab the paddle to start.");
    renderGame(context, state);
  }

  function handleGameOver() {
    endRound(state);
    returnToStartState();
  }

  function startGame() {
    if (state.running) {
      return;
    }

    startRound(state);

    updateHud();
    setMessage("");

    requestAnimationFrame(frame);
  }

  function frame(time) {
    if (!state.running) {
      return;
    }

    const elapsed = time - state.lastTime;
    state.lastTime = time;

    const deltaSeconds = Math.min(0.033, elapsed / 1000);

    updatePhysics(state, deltaSeconds, {
      onHit: handleHit,
      onGameOver: handleGameOver,
    });

    renderGame(context, state);

    if (state.running) {
      requestAnimationFrame(frame);
    }
  }

  attachPaddleInput({
    canvas,
    state,
    onStartRequested: startGame,
    onInputChanged: () => {
      if (!state.running) {
        updateMessagePosition();
        renderGame(context, state);
      }
    },
  });

  returnToStartState();
}