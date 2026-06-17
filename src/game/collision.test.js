import { describe, expect, test } from "vitest";
import {
  canClearObstacle,
  hasPlatformUnderPlayer,
  intersectsAabb,
  makeBox,
  rangesOverlap,
  nearestLaneIndex,
  shouldCollideInTargetLane,
  shouldCheckCollisionData
} from "./collision.js";

describe("collision helpers", () => {
  test("detects overlapping ranges", () => {
    expect(rangesOverlap(0, 2, 0.9, 2)).toBe(true);
    expect(rangesOverlap(0, 2, 2.1, 2)).toBe(false);
  });

  test("detects intersecting 3D boxes", () => {
    const player = makeBox({ x: 0, y: 1, z: 4 }, { width: 1, height: 1, depth: 1 });
    const coin = makeBox({ x: 0.2, y: 1, z: 4.3 }, { width: 0.8, height: 0.8, depth: 0.8 });

    expect(intersectsAabb(player, coin)).toBe(true);
  });

  test("rejects separated 3D boxes", () => {
    const player = makeBox({ x: -3, y: 1, z: 4 }, { width: 1, height: 1, depth: 1 });
    const obstacle = makeBox({ x: 3, y: 1, z: 4 }, { width: 1.2, height: 1.2, depth: 1.2 });

    expect(intersectsAabb(player, obstacle)).toBe(false);
  });

  test("allows low obstacles to be cleared only when the player is high enough", () => {
    expect(canClearObstacle({ type: "low-obstacle" }, 1.8)).toBe(true);
    expect(canClearObstacle({ type: "low-obstacle" }, 0.8)).toBe(false);
    expect(canClearObstacle({ type: "high-obstacle" }, 2.2)).toBe(false);
  });

  test("treats light gates as decoration rather than jump obstacles", () => {
    expect(canClearObstacle({ type: "light-gate" }, 1.8)).toBe(false);
    expect(canClearObstacle({ type: "light-gate" }, 0.8)).toBe(false);
  });

  test("skips decorative and empty collision bounds", () => {
    expect(shouldCheckCollisionData({ type: "decoration", boxSize: { width: 2, height: 2, depth: 2 } })).toBe(false);
    expect(shouldCheckCollisionData({ type: "high-obstacle", boxSize: { width: 0, height: 2, depth: 2 } })).toBe(false);
    expect(shouldCheckCollisionData({ type: "high-obstacle", boxSize: { width: 1, height: 2, depth: 2 } })).toBe(true);
  });

  test("ignores lane obstacles outside the player's target lane", () => {
    expect(shouldCollideInTargetLane({ type: "high-obstacle", laneIndex: 0 }, 1)).toBe(false);
    expect(shouldCollideInTargetLane({ type: "high-obstacle", laneIndex: 1 }, 1)).toBe(true);
    expect(shouldCollideInTargetLane({ type: "jump-obstacle" }, 1)).toBe(true);
  });

  test("uses the player's visible x position to choose the active lane", () => {
    expect(nearestLaneIndex([-3, 0, 3], -2.4)).toBe(0);
    expect(nearestLaneIndex([-3, 0, 3], -0.4)).toBe(1);
    expect(nearestLaneIndex([-3, 0, 3], 2.2)).toBe(2);
  });

  test("detects whether a platform exists under the player lane and z position", () => {
    const platforms = [
      { laneIndex: 0, z: 3, depth: 4 },
      { laneIndex: 1, z: -4, depth: 4 }
    ];

    expect(hasPlatformUnderPlayer(platforms, 0, 4)).toBe(true);
    expect(hasPlatformUnderPlayer(platforms, 1, 4)).toBe(false);
    expect(hasPlatformUnderPlayer(platforms, 1, -3)).toBe(true);
  });
});
