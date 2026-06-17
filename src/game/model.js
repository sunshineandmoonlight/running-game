import * as THREE from "three";

export function hasRenderableMesh(root) {
  let found = false;
  root?.traverse?.((child) => {
    if (!child.isMesh || !child.geometry || child.visible === false) {
      return;
    }
    let current = child.parent;
    while (current) {
      if (current.visible === false) {
        return;
      }
      current = current.parent;
    }
    const materialVisible = Array.isArray(child.material)
      ? child.material.some((material) => material?.visible !== false)
      : child.material?.visible !== false;
    if (materialVisible) {
      found = true;
    }
  });
  return found;
}

export function addVisibilityMarker(root, material) {
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.9), material);
  marker.position.set(0, 0.85, 0);
  marker.userData.type = "visibility-marker";
  marker.castShadow = true;
  marker.receiveShadow = true;
  root.add(marker);
  return marker;
}
