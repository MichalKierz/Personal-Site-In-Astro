const DEFAULT_ASPECT_RATIO = 16 / 9;
const DEFAULT_MAX_GAME_WIDTH = 980;

const orientationSizes = new Map();

export function initGameStageSize() {
  const stages = document.querySelectorAll("[data-game-stage]");

  if (stages.length === 0) {
    return;
  }

  function getOrientationKey() {
    return window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
  }

  function getStableViewportSize() {
    const orientationKey = getOrientationKey();
    const currentSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const savedSize = orientationSizes.get(orientationKey);

    if (!savedSize) {
      orientationSizes.set(orientationKey, currentSize);
      return currentSize;
    }

    const nextSize = {
      width: Math.min(savedSize.width, currentSize.width),
      height: Math.min(savedSize.height, currentSize.height),
    };

    orientationSizes.set(orientationKey, nextSize);

    return nextSize;
  }

  function getNumber(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function updateStage(stage) {
    const aspectRatio = getNumber(
      stage.dataset.gameAspectRatio,
      DEFAULT_ASPECT_RATIO
    );

    const maxGameWidth = getNumber(
      stage.dataset.gameMaxWidth,
      DEFAULT_MAX_GAME_WIDTH
    );

    const viewportSize = getStableViewportSize();
    const isLandscape = viewportSize.width >= viewportSize.height;

    const horizontalGap = isLandscape ? 6 : 16;
    const verticalGap = isLandscape ? 4 : 16;

    const availableWidth = Math.max(160, viewportSize.width - horizontalGap);
    const availableHeight = Math.max(160, viewportSize.height - verticalGap);

    const widthFromHeight = availableHeight * aspectRatio;

    const nextWidth = Math.floor(
      Math.min(maxGameWidth, availableWidth, widthFromHeight)
    );

    stage.style.setProperty("--game-stage-width", `${nextWidth}px`);
  }

  function updateAllStages() {
    stages.forEach(updateStage);
  }

  updateAllStages();
  requestAnimationFrame(updateAllStages);
  setTimeout(updateAllStages, 200);

  window.addEventListener("load", updateAllStages);
  window.addEventListener("resize", updateAllStages);

  window.addEventListener("orientationchange", () => {
    orientationSizes.clear();
    setTimeout(updateAllStages, 150);
    setTimeout(updateAllStages, 400);
  });
}