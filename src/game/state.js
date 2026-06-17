import {
  COIN_SCORE,
  GRAVITY,
  GROUND_Y,
  JUMP_VELOCITY,
  LANES,
  SCORE_PER_SECOND,
  SPEED_GAIN_PER_SECOND,
  START_SPEED
} from "./constants.js";

export function createGameState(bestScore = 0) {
  return {
    status: "ready",
    laneIndex: 1,
    targetLaneIndex: 1,
    score: 0,
    coins: 0,
    bestScore,
    speed: START_SPEED,
    elapsed: 0,
    playerY: GROUND_Y,
    verticalVelocity: 0,
    isGrounded: true
  };
}

export function startGame(state) {
  state.status = "running";
  state.laneIndex = 1;
  state.targetLaneIndex = 1;
  state.score = 0;
  state.coins = 0;
  state.speed = START_SPEED;
  state.elapsed = 0;
  state.playerY = GROUND_Y;
  state.verticalVelocity = 0;
  state.isGrounded = true;
  return state;
}

export function moveLane(state, direction) {
  const next = Math.max(0, Math.min(LANES.length - 1, state.targetLaneIndex + direction));
  state.targetLaneIndex = next;
  state.laneIndex = next;
  return state;
}

export function updateProgress(state, deltaSeconds) {
  if (state.status !== "running") {
    return state;
  }

  state.elapsed += deltaSeconds;
  state.speed = START_SPEED + state.elapsed * SPEED_GAIN_PER_SECOND;
  state.score += deltaSeconds * SCORE_PER_SECOND;
  return state;
}

export function jump(state) {
  if (state.status !== "running" || !state.isGrounded) {
    return false;
  }

  state.verticalVelocity = JUMP_VELOCITY;
  state.isGrounded = false;
  return true;
}

export function updateJump(state, deltaSeconds) {
  if (state.isGrounded) {
    return state;
  }

  state.verticalVelocity += GRAVITY * deltaSeconds;
  state.playerY += state.verticalVelocity * deltaSeconds;

  if (state.playerY <= GROUND_Y) {
    state.playerY = GROUND_Y;
    state.verticalVelocity = 0;
    state.isGrounded = true;
  }

  return state;
}

export function collectCoin(state) {
  state.coins += 1;
  state.score += COIN_SCORE;
  return state;
}

export function endGame(state) {
  state.status = "ended";
  state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
  return state;
}

export function togglePause(state) {
  if (state.status === "running") {
    state.status = "paused";
  } else if (state.status === "paused") {
    state.status = "running";
  }
  return state;
}
