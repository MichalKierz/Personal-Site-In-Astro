(() => {
  const SETTINGS = {
    ridgeCount: 10,

    density: 50,
    densityVariationA: 10,
    densityVariationB: 0.1,

    gradientScale: 0.5,
    gradientExponent: 1,
    brightnessGamma: 20,

    interactionRadius: 0.1,
    interactionStrength: 0.018,
    interactionPasses: 3,
    anchorStrength: 0.12,

    vignetteStrength: 0.06,
    ditherStrength: 0.0025,
  };

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

  function gradientFromDistance(distance) {
    const t = clamp(1 - distance / SETTINGS.gradientScale, 0, 1);
    return Math.pow(t, SETTINGS.gradientExponent);
  }

  function colorFromGradient(value) {
    const brightness = Math.pow(clamp(value, 0, 1), SETTINGS.brightnessGamma);

    return [
      brightness * 119,
      brightness * 255,
      brightness * 59,
    ];
  }

  function createRidges() {
    const ridges = [];

    for (let i = 0; i < SETTINGS.ridgeCount; i += 1) {
      const s = i + 1;
      const baseY = (i + 0.5) / SETTINGS.ridgeCount;

      ridges.push({
        baseY,

        ampA: 0.022 + seedRandom(s * 1.1) * 0.04,
        freqA: 1.4 + seedRandom(s * 1.3) * 1.8,
        phaseA: seedRandom(s * 1.7) * Math.PI * 2,

        ampB: 0.008 + seedRandom(s * 2.1) * 0.02,
        freqB: 3.8 + seedRandom(s * 2.3) * 3.2,
        phaseB: seedRandom(s * 2.7) * Math.PI * 2,

        ampC: 0.003 + seedRandom(s * 3.1) * 0.01,
        freqC: 7.5 + seedRandom(s * 3.3) * 6.5,
        phaseC: seedRandom(s * 3.7) * Math.PI * 2,

        driftAmp: 0.004 + seedRandom(s * 4.1) * 0.008,
        driftFreq: 0.6 + seedRandom(s * 4.3) * 1.2,
        driftPhase: seedRandom(s * 4.7) * Math.PI * 2,
      });
    }

    return ridges;
  }

  function buildRidgeMap(renderWidth) {
    const ridges = createRidges();
    const ridgeMap = Array.from(
      { length: ridges.length },
      () => new Float32Array(renderWidth)
    );

    for (let x = 0; x < renderWidth; x += 1) {
      const nx = x / Math.max(1, renderWidth - 1);
      const natural = new Array(ridges.length);

      for (let i = 0; i < ridges.length; i += 1) {
        const ridge = ridges[i];

        const bend =
          ridge.ampA * Math.sin(nx * Math.PI * ridge.freqA + ridge.phaseA) +
          ridge.ampB * Math.sin(nx * Math.PI * ridge.freqB + ridge.phaseB) +
          ridge.ampC * Math.sin(nx * Math.PI * ridge.freqC + ridge.phaseC) +
          ridge.driftAmp * Math.sin(nx * Math.PI * ridge.driftFreq + ridge.driftPhase);

        natural[i] = ridge.baseY + bend;
      }

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

      for (let i = 0; i < adjusted.length; i += 1) {
        ridgeMap[i][x] = clamp(adjusted[i], -0.3, 1.3);
      }
    }

    return ridgeMap;
  }

  function drawBackground() {
    const canvas = createCanvas();
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(viewportWidth * pixelRatio);
    canvas.height = Math.floor(viewportHeight * pixelRatio);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;

    const renderWidth = Math.max(760, Math.floor(viewportWidth / 1.5));
    const renderHeight = Math.max(460, Math.floor(viewportHeight / 1.5));

    const temporaryCanvas = document.createElement("canvas");
    temporaryCanvas.width = renderWidth;
    temporaryCanvas.height = renderHeight;

    const temporaryContext = temporaryCanvas.getContext("2d", { alpha: false });

    if (!temporaryContext) {
      return;
    }

    const image = temporaryContext.createImageData(renderWidth, renderHeight);
    const data = image.data;

    const ridgeMap = buildRidgeMap(renderWidth);

    for (let y = 0; y < renderHeight; y += 1) {
      for (let x = 0; x < renderWidth; x += 1) {
        const nx = x / renderWidth;
        const ny = y / renderHeight;

        let nearestDistance = 1;

        for (let i = 0; i < ridgeMap.length; i += 1) {
          const ridgeY = ridgeMap[i][x];
          const distance = Math.abs(ny - ridgeY);

          if (distance < nearestDistance) {
            nearestDistance = distance;
          }
        }

        const localDensity =
          SETTINGS.density +
          SETTINGS.densityVariationA * Math.sin(nx * Math.PI * 2.5 + 0.8) +
          SETTINGS.densityVariationB * Math.sin(nx * Math.PI * 5.7 + ny * 1.2 + 1.9);

        const densityMod = 1 + (localDensity - SETTINGS.density) * 0.015;

        const dx = Math.abs(nx - 0.5) * 2;
        const dy = Math.abs(ny - 0.5) * 2;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        const vignette = clamp(
          1 - Math.pow(distanceFromCenter, 1.65) * SETTINGS.vignetteStrength,
          0.92,
          1
        );

        const dither =
          SETTINGS.ditherStrength *
          Math.sin((nx * 131.7 + ny * 293.1) * Math.PI * 2) *
          Math.sin((nx * 271.3 - ny * 187.9) * Math.PI * 2);

        const gradientValue = clamp(
          gradientFromDistance(nearestDistance * densityMod) * vignette + dither,
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

  let resizeTimer;

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(drawBackground, 120);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", drawBackground);
  } else {
    drawBackground();
  }
})();