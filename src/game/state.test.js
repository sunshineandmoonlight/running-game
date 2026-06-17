import { describe, expect, test } from "vitest";
import { COIN_SCORE, GROUND_Y, LANES, START_SPEED } from "./constants.js";
import {
  collectCoin,
  createGameState,
  endGame,
  jump,
  moveLane,
  startGame,
  togglePause,
  updateJump,
  updateProgress
} from "./state.js";

describe("game state", () => {
  test("starts from the center lane with reset score and speed", () => {
    const state = startGame(createGameState(120));

    expect(state.status).toBe("running");
    expect(state.laneIndex).toBe(1);
    expect(LANES[state.laneIndex]).toBe(0);
    expect(state.score).toBe(0);
    expect(state.coins).toBe(0);
    expect(state.speed).toBe(START_SPEED);
    expect(state.bestScore).toBe(120);
  });

  test("clamps lane movement to the available three lanes", () => {
    const state = startGame(createGameState());

    moveLane(state, -1);
    moveLane(state, -1);
    moveLane(state, -1);
    expect(state.laneIndex).toBe(0);

    moveLane(state, 1);
    moveLane(state, 1);
    moveLane(state, 1);
    expect(state.laneIndex).toBe(2);
  });

  test("updates score and speed only while running", () => {
    const state = startGame(createGameState());

    updateProgress(state, 2);
    expect(state.score).toBeGreaterThan(20);
    expect(state.speed).toBeGreaterThan(START_SPEED);

    togglePause(state);
    const pausedScore = state.score;
    updateProgress(state, 10);
    expect(state.score).toBe(pausedScore);
  });

  test("keeps increasing speed over time without a fixed course ending", () => {
    const state = startGame(createGameState());

    updateProgress(state, 200);

    expect(state.speed).toBeGreaterThan(START_SPEED + 20);
  });

  test("adds coin count and coin score", () => {
    const state = startGame(createGameState());

    collectCoin(state);
    collectCoin(state);

    expect(state.coins).toBe(2);
    expect(state.score).toBe(COIN_SCORE * 2);
  });

  test("ends the game and records integer high score", () => {
    const state = startGame(createGameState(80));
    state.score = 123.8;

    endGame(state);

    expect(state.status).toBe("ended");
    expect(state.bestScore).toBe(123);
  });

  test("jumps only when running and grounded", () => {
    const state = startGame(createGameState());

    expect(jump(state)).toBe(true);
    const firstVelocity = state.verticalVelocity;
    expect(state.isGrounded).toBe(false);
    expect(state.playerY).toBe(GROUND_Y);

    expect(jump(state)).toBe(false);
    expect(state.verticalVelocity).toBe(firstVelocity);
  });

  test("applies gravity and lands back on the ground", () => {
    const state = startGame(createGameState());

    jump(state);
    updateJump(state, 0.2);
    expect(state.playerY).toBeGreaterThan(GROUND_Y);
    expect(state.isGrounded).toBe(false);

    updateJump(state, 2);
    expect(state.playerY).toBe(GROUND_Y);
    expect(state.verticalVelocity).toBe(0);
    expect(state.isGrounded).toBe(true);
  });
});
