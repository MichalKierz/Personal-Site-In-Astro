import {
  resolveInterBodyCollisions,
  resolveSelfCollisions,
} from "./physics-body-collisions.js";

import {
  resolveSwordAgainstEnemies,
  softenBody,
  swordTouchesBody,
} from "./physics-sword-collisions.js";

export function resolveBodyCollisions(state, deltaSeconds) {
  const bodies = getActiveBodies(state);

  bodies.forEach((body) => {
    resolveSelfCollisions(body, deltaSeconds, state.physics.selfPush);
  });

  for (let index = 0; index < bodies.length; index += 1) {
    for (let other = index + 1; other < bodies.length; other += 1) {
      resolveInterBodyCollisions(
        bodies[index],
        bodies[other],
        deltaSeconds,
        state.physics.bodyPush
      );
    }
  }
}

export function resolveSwordCollisions(state, deltaSeconds) {
  resolveSwordAgainstEnemies(state, deltaSeconds);
}

export function detectSwordHits(state, events) {
  if (state.status !== "playing" && state.status !== "dying") {
    return;
  }

  const player = state.player;

  if (!player || player.dead) {
    return;
  }

  state.enemies.forEach((enemy) => {
    if (enemy.dead) {
      return;
    }

    const playerHitPadding =
      state.physics.swordHitPadding + state.physics.swordThickness * 0.55;

    if (canStillAttack(player) && !enemy.dying && swordTouchesBody(player, enemy, playerHitPadding)) {
      enemy.dying = true;
      enemy.hitDelay = state.physics.enemyHitDelay;
      enemy.fadeSpeed = 2.05;
      enemy.alpha = 1;
    }

    if (canStillAttack(enemy) && !player.dying && swordTouchesBody(enemy, player, state.physics.swordHitPadding)) {
      events.onPlayerDefeated?.();
    }
  });
}

export function updateFadingBodies(state, deltaSeconds, events) {
  getBodies(state).forEach((body) => {
    if (!body.dying || body.dead) {
      return;
    }

    if (body.hitDelay > 0) {
      body.hitDelay = Math.max(0, body.hitDelay - deltaSeconds);

      if (body.hitDelay === 0) {
        softenBody(body);
      }

      return;
    }

    body.alpha = Math.max(0, body.alpha - body.fadeSpeed * deltaSeconds);

    if (body.alpha > 0) {
      return;
    }

    body.dead = true;

    if (body.type === "enemy" && !body.scored) {
      body.scored = true;
      events.onEnemyDefeated?.();
    }

    if (body.type === "player") {
      events.onResetRequested?.();
    }
  });
}

export function removeOldEnemies(state) {
  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.dead) {
      return false;
    }

    return enemy.points.pelvis.x > -340;
  });
}

function canStillAttack(body) {
  return !body.dead && (!body.dying || body.hitDelay > 0 || body.alpha > 0.5);
}

function getActiveBodies(state) {
  return getBodies(state).filter((body) => !body.dead && !body.dying);
}

function getBodies(state) {
  return [state.player, ...state.enemies].filter(Boolean);
}