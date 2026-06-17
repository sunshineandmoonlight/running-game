import { JUMP_CLEARANCE_Y } from "./constants.js";

export function rangesOverlap(aCenter, aSize, bCenter, bSize) {
  return Math.abs(aCenter - bCenter) * 2 < aSize + bSize;
}

export function intersectsAabb(a, b) {
  return (
    rangesOverlap(a.x, a.width, b.x, b.width) &&
    rangesOverlap(a.y, a.height, b.y, b.height) &&
    rangesOverlap(a.z, a.depth, b.z, b.depth)
  );
}

export function makeBox(position, size) {
  return {
    x: position.x,
    y: position.y,
    z: position.z,
    width: size.width,
    height: size.height,
    depth: size.depth
  };
}

export function canClearObstacle(obstacle, playerY) {
  return (
    (obstacle.type === "low-obstacle" || obstacle.type === "jump-obstacle") &&
    playerY >= JUMP_CLEARANCE_Y
  );
}

export function shouldCheckCollisionData(objectData) {
  return objectData.type !== "decoration" && objectData.boxSize?.width > 0;
}

export function shouldCollideInTargetLane(objectData, targetLaneIndex) {
  return objectData.laneIndex === undefined || objectData.laneIndex === targetLaneIndex;
}

export function nearestLaneIndex(lanes, x) {
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  lanes.forEach((laneX, index) => {
    const distance = Math.abs(laneX - x);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

export function hasPlatformUnderPlayer(platforms, laneIndex, playerZ) {
  return platforms.some((platform) => {
    if (platform.laneIndex !== laneIndex) {
      return false;
    }
    const halfDepth = platform.depth / 2;
    return playerZ >= platform.z - halfDepth && playerZ <= platform.z + halfDepth;
  });
}
