import {
  createTesseractMatchState,
  markChallengeMatched,
  nextChallenge,
  startChallenge,
} from "./state.js";

import { attachTesseractInput } from "./input.js";
import { getMatchInfo } from "./matching.js";
import { renderGame } from "./renderer.js";

export function initTesseractMatchGames() {
  const roots = document.querySelectorAll("[data-tesseract-game]");

  roots.forEach((root) => {
    if (root.dataset.ready === "true") {
      return;
    }

    root.dataset.ready = "true";
    setupTesseractMatchGame(root);
  });
}

function setupTesseractMatchGame(root) {
  const canvas = root.querySelector("[data-canvas]");
  const context = canvas.getContext("2d");

  const slider = root.querySelector("[data-fourth-slider]");
  const timeNode = root.querySelector("[data-time]");
  const bestNode = root.querySelector("[data-best]");
  const statusNode = root.querySelector("[data-status]");
  const matchMessageNode = root.querySelector("[data-match-message]");

  const state = createTesseractMatchState(canvas);

  function updateHud() {
    timeNode.textContent = formatTime(state.time);
    bestNode.textContent = state.best > 0 ? formatTime(state.best) : "--";
  }

  function updateStatus() {
    const now = performance.now();

    if (state.matched) {
      statusNode.textContent = "Tap the screen to restart.";
      matchMessageNode.hidden = now >= state.canRestartAt;
      return;
    }

    matchMessageNode.hidden = true;

    if (!state.running) {
      statusNode.textContent = "Rotate your tesseract to start.";
      return;
    }

    const match = getMatchInfo(state.current, state.target);

    if (match.ready) {
      statusNode.textContent = "Hold it";
      return;
    }

    if (match.close) {
      statusNode.textContent = "Very close";
      return;
    }

    statusNode.textContent = "Match the target";
  }

  function syncSlider() {
    slider.value = String(state.current.w);
  }

  function restartGame() {
    if (!state.matched || performance.now() < state.canRestartAt) {
      return;
    }

    nextChallenge(state);
    syncSlider();
    updateHud();
    updateStatus();
    renderGame(context, state);
  }

  function beginGame() {
    startChallenge(state);
  }

  function frame(time) {
    const deltaSeconds = Math.min(0.05, (time - state.lastTime) / 1000);
    state.lastTime = time;

    if (state.running && !state.matched) {
      state.time += deltaSeconds;

      const match = getMatchInfo(state.current, state.target);

      if (match.ready) {
        if (state.matchReadySince === 0) {
          state.matchReadySince = time;
        }

        if (time - state.matchReadySince >= state.matchHoldDuration) {
          markChallengeMatched(state);
        }
      } else {
        state.matchReadySince = 0;
      }
    }

    updateHud();
    updateStatus();
    renderGame(context, state);

    requestAnimationFrame(frame);
  }

  attachTesseractInput({
    canvas,
    slider,
    state,
    onStartRequested: beginGame,
    onRestartRequested: restartGame,
  });

  syncSlider();
  updateHud();
  updateStatus();
  renderGame(context, state);

  requestAnimationFrame((time) => {
    state.lastTime = time;
    requestAnimationFrame(frame);
  });
}

function formatTime(value) {
  return `${value.toFixed(1)}s`;
}