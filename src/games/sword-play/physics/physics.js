import { spawnEnemy } from "../state.js";

import {
  applyPointerForce,
  applyPuppetForces,
  integrateBodies,
  resolveFloorAndWalls,
  solvePuppetConstraints,
  updateBodyTargets,
} from "./physics-puppets.js";

import {
  detectSwordHits,
  removeOldEnemies,
  resolveBodyCollisions,
  resolveSwordCollisions,
  updateFadingBodies,
} from "./physics-collisions.js";

export function updatePhysics(state, deltaSeconds, events = {}) {
  const safeDeltaSeconds = Math.min(0.04, Math.max(0, deltaSeconds));
  const substeps = Math.min(
    state.physics.maxSubsteps,
    Math.max(1, Math.ceil(safeDeltaSeconds / state.physics.minStep))
  );

  const step = safeDeltaSeconds / substeps;

  for (let index = 0; index < substeps; index += 1) {
    updateTimers(state, step, events);

    if (state.status === "idle") {
      return;
    }

    updateEnemySpawning(state, step);
    updateBodyTargets(state, step);
    applyPuppetForces(state, step);
    applyPointerForce(state, step);
    integrateBodies(state, step);

    for (let iteration = 0; iteration < state.physics.iterations; iteration += 1) {
      solvePuppetConstraints(state, step);
      resolveFloorAndWalls(state);
      resolveBodyCollisions(state, step);
      resolveSwordCollisions(state, step);
    }

    detectSwordHits(state, events);
    updateFadingBodies(state, step, events);
    removeOldEnemies(state);
  }
}

function updateTimers(state, deltaSeconds, events) {
  if (state.status !== "dying") {
    return;
  }

  state.resetTimer -= deltaSeconds;

  if (state.resetTimer <= 0) {
    events.onResetRequested?.();
  }
}

function updateEnemySpawning(state, deltaSeconds) {
  if (state.status !== "playing") {
    return;
  }

  state.spawnTimer -= deltaSeconds;

  if (state.spawnTimer > 0) {
    return;
  }

  const aliveEnemies = state.enemies.filter((enemy) => !enemy.dead).length;

  if (aliveEnemies < 2) {
    spawnEnemy(state);
  }

  const pressure = Math.min(0.22, state.score * 0.005);
  state.spawnTimer = randomBetween(5.2, 7.1) - pressure;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}