/**
 * ObjectManager.js
 * -----------------------------------------------------------------------
 * Manages the scene graph layout and component hierarchy.
 * Allocates and reuses Three.js objects (geometries/materials) to prevent
 * garbage collection overhead.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { PalmAnchor } from './PalmAnchor.js';
import { EnergyField } from './EnergyField.js';
import { ParticleAssembly } from './ParticleAssembly.js';
import { HologramCube } from './HologramCube.js';
import { EarthGroup } from './EarthGroup.js';
import { CONFIG } from './config.js';

export class ObjectManager {
  constructor(scene, colorController) {
    this.scene = scene;
    this.colorController = colorController;

    // 1. Create the persistent PalmAnchor
    this.palmAnchor = new PalmAnchor();
    this.scene.add(this.palmAnchor);

    // 2. Create the HologramGroup container
    this.hologramGroup = new THREE.Group();
    this.hologramGroup.name = 'HologramGroup';
    this.palmAnchor.add(this.hologramGroup);

    // References to components
    this.energyField = null;
    this.particleAssembly = null;
    this.hologramCube = null;
    this.earthGroup = null;

    this.init();
  }

  init() {
    // Allocate all components once at startup to optimize performance
    this.energyField = new EnergyField();
    this.hologramGroup.add(this.energyField);

    this.particleAssembly = new ParticleAssembly();
    this.hologramGroup.add(this.particleAssembly);

    this.hologramCube = new HologramCube(this.colorController);
    this.hologramGroup.add(this.hologramCube);

    // EarthGroup: sibling of HologramCube, sits at the Cube's center.
    this.earthGroup = new EarthGroup(CONFIG.HOLOGRAM.CUBE_SIZE);
    this.hologramGroup.add(this.earthGroup);
  }

  /**
   * Resets tracking states when a hand is lost.
   */
  reset() {
    this.palmAnchor.reset();
  }

  dispose() {
    this.energyField?.dispose();
    this.particleAssembly?.dispose();
    this.hologramCube?.dispose();
    this.earthGroup?.dispose();

    this.hologramGroup.remove(this.energyField);
    this.hologramGroup.remove(this.particleAssembly);
    this.hologramGroup.remove(this.hologramCube);
    this.hologramGroup.remove(this.earthGroup);

    this.palmAnchor.remove(this.hologramGroup);
    this.scene.remove(this.palmAnchor);
  }
}
