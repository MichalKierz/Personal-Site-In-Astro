(() => {
  const existingController = window.__siteBackgroundController;

  if (existingController) {
    existingController.mount();
    return;
  }

  const SETTINGS = {
    strandSpacing: 86,
    strandSpacingVariation: 12,

    gradientRadius: 240,
    gradientExponent: 1,
    brightnessGamma: 20,

    density: 50,
    densityVariationA: 10,
    densityVariationB: 0.1,

    interactionRadius: 54,
    interactionStrength: 8,
    interactionPasses: 3,
    anchorStrength: 0.12,

    vignetteStrength: 0.06,
    noiseStrength: 0.0012,

    renderScale: 1.5,
    maxPixelRatio: 2,
    resizeDelay: 120,
    widthResetThreshold: 48,
  };

  const stableSizes = new Map();

  let resizeTimer = null;
  let lastDrawKey = "";
  let mounted = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  function seedRandom(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function hashNoise(x, y) {
    let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    hash = (hash ^ (hash >>> 16)) >>> 0;

    return hash / 4294967295;
  }

  function createCanvas() {
    let canvas = document.getElementById("site-background");

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "site-background";
      canvas.setAttribute("aria-hidden", "true");
      document.body.prepend(canvas);
    }

    return canvas;
  }

  function getViewportSize() {
    return {
      width: Math.max(
        1,
        Math.round(window.innerWidth || document.documentElement.clientWidth || 1)
      ),
      height: Math.max(
        1,
        Math.round(window.innerHeight || document.documentElement.clientHeight || 1)
      ),
    };
  }

  function getOrientationKey(size) {
    return size.width >= size.height ? "landscape" : "portrait";
  }

  function getStableViewportSize() {
    const currentSize = getViewportSize();
    const orientationKey = getOrientationKey(currentSize);
    const savedSize = stableSizes.get(orientationKey);

    if (
      !savedSize ||
      Math.abs(savedSize.width - currentSize.width) >
        SETTINGS.widthResetThreshold
    ) {
      stableSizes.set(orientationKey, currentSize);
      return currentSize;
    }

    const nextSize = {
      width: currentSize.width,
      height: Math.max(savedSize.height, currentSize.height),
    };

    stableSizes.set(orientationKey, nextSize);

    return nextSize;
  }

  function gradientFromDistance(distance) {
    const t = clamp(1 - distance / SETTINGS.gradientRadius, 0, 1);
    return Math.pow(t, SETTINGS.gradientExponent);
  }

  function colorFromGradient(value) {
    const brightness = Math.pow(clamp(value, 0, 1), SETTINGS.brightnessGamma);

    return [brightness * 119, brightness * 255, brightness * 59];
  }

  function getStrandBaseY(index) {
    return (
      index * SETTINGS.strandSpacing +
      (seedRandom(index * 1.37) - 0.5) * SETTINGS.strandSpacingVariation
    );
  }

  function getNaturalStrandY(index, worldX) {
    const s = index + 10000;

    const ampA = 18 + seedRandom(s * 1.1) * 34;
    const freqA = 0.0016 + seedRandom(s * 1.3) * 0.0018;
    const phaseA = seedRandom(s * 1.7) * Math.PI * 2;

    const ampB = 6 + seedRandom(s * 2.1) * 16;
    const freqB = 0.0042 + seedRandom(s * 2.3) * 0.0034;
    const phaseB = seedRandom(s * 2.7) * Math.PI * 2;

    const ampC = 2 + seedRandom(s * 3.1) * 8;
    const freqC = 0.0085 + seedRandom(s * 3.3) * 0.0065;
    const phaseC = seedRandom(s * 3.7) * Math.PI * 2;

    const driftAmp = 3 + seedRandom(s * 4.1) * 8;
    const driftFreq = 0.0007 + seedRandom(s * 4.3) * 0.0012;
    const driftPhase = seedRandom(s * 4.7) * Math.PI * 2;

    return (
      getStrandBaseY(index) +
      ampA * Math.sin(worldX * freqA + phaseA) +
      ampB * Math.sin(worldX * freqB + phaseB) +
      ampC * Math.sin(worldX * freqC + phaseC) +
      driftAmp * Math.sin(worldX * driftFreq + driftPhase)
    );
  }

  function getVisibleStrandIndexes(viewportHeight) {
    const padding =
      SETTINGS.gradientRadius +
      SETTINGS.interactionRadius +
      SETTINGS.strandSpacing * 2;

    const firstIndex = Math.floor(-padding / SETTINGS.strandSpacing);
    const lastIndex = Math.ceil(
      (viewportHeight + padding) / SETTINGS.strandSpacing
    );

    const indexes = [];

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      indexes.push(index);
    }

    return indexes;
  }

  function buildStrandMap(renderWidth, viewportHeight) {
    const indexes = getVisibleStrandIndexes(viewportHeight);

    const strandMap = indexes.map((index) => ({
      index,
      values: new Float32Array(renderWidth),
    }));

    for (let x = 0; x < renderWidth; x += 1) {
      const worldX = x * SETTINGS.renderScale;
      const natural = indexes.map((index) => getNaturalStrandY(index, worldX));
      let adjusted = natural.slice();

      for (let pass = 0; pass < SETTINGS.interactionPasses; pass += 1) {
        const next = adjusted.slice();

        for (let i = 0; i < adjusted.length; i += 1) {
          let push = 0;

          for (let j = 0; j < adjusted.length; j += 1) {
            if (i === j) {
              continue;
            }

            const diff = adjusted[i] - adjusted[j];
            const absDiff = Math.abs(diff);

            if (absDiff < SETTINGS.interactionRadius) {
              const direction =
                absDiff < 0.000001 ? (i < j ? -1 : 1) : diff / absDiff;
              const force = 1 - absDiff / SETTINGS.interactionRadius;
              push += direction * force * force * SETTINGS.interactionStrength;
            }
          }

          next[i] = mix(adjusted[i] + push, natural[i], SETTINGS.anchorStrength);
        }

        adjusted = next;
      }

      for (let i = 0; i < strandMap.length; i += 1) {
        strandMap[i].values[x] = adjusted[i];
      }
    }

    return strandMap;
  }

  function setCanvasSize(canvas, viewportSize, pixelRatio) {
    const width = Math.floor(viewportSize.width * pixelRatio);
    const height = Math.floor(viewportSize.height * pixelRatio);

    if (canvas.width !== width) {
      canvas.width = width;
    }

    if (canvas.height !== height) {
      canvas.height = height;
    }

    canvas.style.width = `${viewportSize.width}px`;
    canvas.style.height = `${viewportSize.height}px`;
  }

  function drawBackground() {
    const canvas = createCanvas();
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      return;
    }

    const viewportSize = getStableViewportSize();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, SETTINGS.maxPixelRatio);
    const drawKey = `${viewportSize.width}x${viewportSize.height}@${pixelRatio}`;

    setCanvasSize(canvas, viewportSize, pixelRatio);

    if (drawKey === lastDrawKey) {
      return;
    }

    lastDrawKey = drawKey;

    const renderWidth = Math.max(
      1,
      Math.ceil(viewportSize.width / SETTINGS.renderScale)
    );

    const renderHeight = Math.max(
      1,
      Math.ceil(viewportSize.height / SETTINGS.renderScale)
    );

    const temporaryCanvas = document.createElement("canvas");
    temporaryCanvas.width = renderWidth;
    temporaryCanvas.height = renderHeight;

    const temporaryContext = temporaryCanvas.getContext("2d", { alpha: false });

    if (!temporaryContext) {
      return;
    }

    const image = temporaryContext.createImageData(renderWidth, renderHeight);
    const data = image.data;
    const strandMap = buildStrandMap(renderWidth, viewportSize.height);

    for (let y = 0; y < renderHeight; y += 1) {
      const worldY = y * SETTINGS.renderScale;

      for (let x = 0; x < renderWidth; x += 1) {
        const worldX = x * SETTINGS.renderScale;

        let nearestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < strandMap.length; i += 1) {
          const strandY = strandMap[i].values[x];
          const distance = Math.abs(worldY - strandY);

          if (distance < nearestDistance) {
            nearestDistance = distance;
          }
        }

        const nx = worldX / 980;
        const ny = worldY / 760;

        const localDensity =
          SETTINGS.density +
          SETTINGS.densityVariationA * Math.sin(nx * Math.PI * 2.5 + 0.8) +
          SETTINGS.densityVariationB *
            Math.sin(nx * Math.PI * 5.7 + ny * 1.2 + 1.9);

        const densityMod = 1 + (localDensity - SETTINGS.density) * 0.015;

        const viewportX = x / Math.max(1, renderWidth - 1);
        const viewportY = y / Math.max(1, renderHeight - 1);

        const dx = Math.abs(viewportX - 0.5) * 2;
        const dy = Math.abs(viewportY - 0.5) * 2;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        const vignette = clamp(
          1 - Math.pow(distanceFromCenter, 1.65) * SETTINGS.vignetteStrength,
          0.92,
          1
        );

        const noise = (hashNoise(x, y) - 0.5) * SETTINGS.noiseStrength;

        const gradientValue = clamp(
          gradientFromDistance(nearestDistance * densityMod) * vignette + noise,
          0,
          1
        );

        const color = colorFromGradient(gradientValue);
        const index = (y * renderWidth + x) * 4;

        data[index] = Math.round(color[0]);
        data[index + 1] = Math.round(color[1]);
        data[index + 2] = Math.round(color[2]);
        data[index + 3] = 255;
      }
    }

    temporaryContext.putImageData(image, 0, 0);

    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(temporaryCanvas, 0, 0, canvas.width, canvas.height);
  }

  function scheduleDraw(delay = SETTINGS.resizeDelay) {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      drawBackground();
    }, delay);
  }

  function resetAndScheduleDraw(delay = SETTINGS.resizeDelay) {
    lastDrawKey = "";
    scheduleDraw(delay);
  }

  function handleOrientationChange() {
    stableSizes.clear();
    lastDrawKey = "";
    scheduleDraw(180);
    scheduleDraw(420);
  }

  function mount() {
    if (mounted) {
      drawBackground();
      return;
    }

    mounted = true;

    window.addEventListener("resize", () => {
      resetAndScheduleDraw();
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        resetAndScheduleDraw();
      });
    }

    window.addEventListener("orientationchange", handleOrientationChange);

    document.addEventListener("astro:page-load", () => {
      drawBackground();
    });

    window.addEventListener("load", () => {
      resetAndScheduleDraw(0);
      resetAndScheduleDraw(250);
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => resetAndScheduleDraw(0));
    } else {
      resetAndScheduleDraw(0);
    }
  }

  window.__siteBackgroundController = {
    mount,
    draw: drawBackground,
  };

  mount();
})();