const DEFAULT_ASPECT_RATIO = 16 / 9;
const DEFAULT_MAX_GAME_WIDTH = 980;
const MOBILE_WIDTH_RESET_THRESHOLD = 48;

const orientationSizes = new Map();

let mounted = false;
let resizeTimer = null;

export function initGameStageSize() {
  updateAllStages();
  requestAnimationFrame(updateAllStages);
  setTimeout(updateAllStages, 200);

  if (mounted) {
    return;
  }

  mounted = true;

  window.addEventListener("load", () => {
    updateAllStages();
    requestAnimationFrame(updateAllStages);
  });

  window.addEventListener("resize", () => {
    scheduleUpdate();
  });

  window.addEventListener("orientationchange", () => {
    orientationSizes.clear();
    setTimeout(updateAllStages, 150);
    setTimeout(updateAllStages, 400);
  });

  document.addEventListener("astro:page-load", () => {
    updateAllStages();
    requestAnimationFrame(updateAllStages);
    setTimeout(updateAllStages, 200);
  });
}

function scheduleUpdate() {
  window.clearTimeout(resizeTimer);

  resizeTimer = window.setTimeout(() => {
    updateAllStages();
  }, 80);
}

function getCurrentViewportSize() {
  return {
    width: Math.round(window.innerWidth),
    height: Math.round(window.innerHeight),
  };
}

function getOrientationKey(size = getCurrentViewportSize()) {
  return size.width >= size.height ? "landscape" : "portrait";
}

function isMobileViewport() {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window
  );
}

function getStableViewportSize() {
  const currentSize = getCurrentViewportSize();

  if (!isMobileViewport()) {
    return currentSize;
  }

  const orientationKey = getOrientationKey(currentSize);
  const savedSize = orientationSizes.get(orientationKey);

  if (
    !savedSize ||
    Math.abs(savedSize.width - currentSize.width) > MOBILE_WIDTH_RESET_THRESHOLD
  ) {
    orientationSizes.set(orientationKey, currentSize);
    return currentSize;
  }

  const nextSize = {
    width: currentSize.width,
    height: Math.max(savedSize.height, currentSize.height),
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
  const isMobile = isMobileViewport();

  const horizontalGap = isLandscape ? 6 : 0;
  const verticalGap = isLandscape ? 4 : 16;

  const availableWidth = Math.max(160, viewportSize.width - horizontalGap);
  const availableHeight = Math.max(160, viewportSize.height - verticalGap);

  let nextWidth;

  if (isMobile && !isLandscape) {
    nextWidth = availableWidth;
  } else {
    const widthFromHeight = availableHeight * aspectRatio;

    nextWidth = Math.min(maxGameWidth, availableWidth, widthFromHeight);
  }

  stage.style.setProperty("--game-stage-width", `${Math.floor(nextWidth)}px`);
}

function updateAllStages() {
  const stages = document.querySelectorAll("[data-game-stage]");

  stages.forEach(updateStage);
}