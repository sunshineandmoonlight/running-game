import * as THREE from "three";
import { describe, expect, test } from "vitest";
import { addVisibilityMarker, hasRenderableMesh } from "./model.js";

describe("model helpers", () => {
  test("rejects empty groups", () => {
    expect(hasRenderableMesh(new THREE.Group())).toBe(false);
  });

  test("rejects invisible mesh-only models", () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.visible = false;
    group.add(mesh);

    expect(hasRenderableMesh(group)).toBe(false);
  });

  test("rejects models hidden by an invisible parent", () => {
    const group = new THREE.Group();
    group.visible = false;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));

    expect(hasRenderableMesh(group)).toBe(false);
  });

  test("rejects meshes with invisible materials", () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false })));

    expect(hasRenderableMesh(group)).toBe(false);
  });

  test("accepts visible meshes with geometry", () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));

    expect(hasRenderableMesh(group)).toBe(true);
  });

  test("adds a visible marker to collision-bearing model groups", () => {
    const group = new THREE.Group();
    addVisibilityMarker(group, new THREE.MeshBasicMaterial());

    expect(hasRenderableMesh(group)).toBe(true);
    expect(group.children.length).toBe(1);
    expect(group.children[0].userData.type).toBe("visibility-marker");
  });
});
