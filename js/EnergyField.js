/**
 * EnergyField.js
 * -----------------------------------------------------------------------
 * Creates the circular energy indicator: a cyan, semi-transparent disk
 * with concentric rings that rotates and breathes in scale.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';

export class EnergyField extends THREE.Group {
  constructor() {
    super();
    this.name = 'EnergyField';

    this.radius = CONFIG.HOLOGRAM.CUBE_SIZE * 0.8; // slightly smaller than the cube
    this.baseOpacity = 0.20;

    this.init();
  }

  init() {
    // 1. Core semi-transparent cyan disk
    const diskGeo = new THREE.RingGeometry(0, this.radius, 32);
    const diskMat = new THREE.MeshBasicMaterial({
      color: CONFIG.HOLOGRAM.ENERGY_COLOR,
      transparent: true,
      opacity: this.baseOpacity,
      side: THREE.DoubleSide,
      depthWrite: false, // Prevents depth occlusion issues with other transparent objects
    });
    this.disk = new THREE.Mesh(diskGeo, diskMat);
    this.add(this.disk);

    // 2. Concentric outer ring for futuristic details
    const outerRingGeo = new THREE.RingGeometry(this.radius * 0.95, this.radius, 32);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: CONFIG.HOLOGRAM.ENERGY_COLOR,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.add(this.outerRing);

    // 3. Concentric inner ring
    const innerRingGeo = new THREE.RingGeometry(this.radius * 0.45, this.radius * 0.5, 32);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: CONFIG.HOLOGRAM.ENERGY_COLOR,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    this.add(this.innerRing);

    // Orient energy disk flat relative to the palm normal (lies on X-Y plane of PalmAnchor)
    this.rotation.x = Math.PI / 2; 
  }

  /**
   * Updates the rotation and scale breathing of the energy field.
   * @param {number} time - Total elapsed time in seconds
   * @param {number} opacityFactor - Animation transition multiplier (0 to 1)
   */
  update(time, opacityFactor) {
    // 1. Slow rotation
    this.rotation.z = time * 0.8;

    // 2. Scale breathing (pulse size slightly: ±5%)
    const breath = 1.0 + Math.sin(time * 6.0) * 0.05;
    
    // Multiply by transition factor to scale in/out smoothly
    const scaleVal = breath * opacityFactor;
    this.scale.set(scaleVal, scaleVal, scaleVal);

    // 3. Modulate opacity based on transition
    this.disk.material.opacity = this.baseOpacity * opacityFactor;
    this.outerRing.material.opacity = 0.4 * opacityFactor;
    this.innerRing.material.opacity = 0.35 * opacityFactor;
  }
}
