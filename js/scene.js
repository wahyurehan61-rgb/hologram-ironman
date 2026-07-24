/**
 * scene.js
 * -----------------------------------------------------------------------
 * Manages the THREE.Scene container. Responsible for holding all 3D
 * meshes, lighting, and helpers.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export class HologramScene {
  constructor() {
    this.scene = new THREE.Scene();
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  getScene() {
    return this.scene;
  }

  clear() {
    // Traverse and dispose of resources
    this.scene.traverse((object) => {
      if (!object.isMesh && !object.isLineSegments && !object.isPoints) return;
      
      object.geometry?.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose());
      } else {
        object.material?.dispose();
      }
    });

    // Remove all children
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }
}
