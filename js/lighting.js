/**
 * lighting.js
 * -----------------------------------------------------------------------
 * Sets up lights in the Three.js scene to illuminate the holographic
 * elements with high-tech cyan/blue glows.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';

export class HologramLighting {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];

    this.init();
  }

  init() {
    // Ambient light: Soft cyan fill
    const ambientLight = new THREE.AmbientLight(CONFIG.HOLOGRAM.COLOR, 0.6);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Directional light: Brighter white/cyan key light from top-front
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
    dirLight.position.set(0, 1, 2);
    this.scene.add(dirLight);
    this.lights.push(dirLight);
  }

  dispose() {
    this.lights.forEach((light) => {
      this.scene.remove(light);
    });
    this.lights = [];
  }
}
