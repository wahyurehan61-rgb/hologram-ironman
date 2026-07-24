/**
 * ParticleAssembly.js
 * -----------------------------------------------------------------------
 * Generates and updates a system of 60-100 particles that spawn randomly
 * and gather to construct the cube edges using quadratic ease-out.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';

export class ParticleAssembly extends THREE.Group {
  constructor() {
    super();
    this.name = 'ParticleAssembly';

    this.count = CONFIG.HOLOGRAM.PARTICLE_COUNT;
    this.cubeSize = CONFIG.HOLOGRAM.CUBE_SIZE;

    this.startPositions = [];
    this.targetPositions = [];

    this.init();
  }

  init() {
    // 1. Generate target positions on the 12 edges of a cube of size `cubeSize`
    const half = this.cubeSize / 2;
    // Define the 8 vertices of the cube
    const vertices = [
      new THREE.Vector3(-half, -half, -half),
      new THREE.Vector3(half, -half, -half),
      new THREE.Vector3(half, half, -half),
      new THREE.Vector3(-half, half, -half),
      new THREE.Vector3(-half, -half, half),
      new THREE.Vector3(half, -half, half),
      new THREE.Vector3(half, half, half),
      new THREE.Vector3(-half, half, half),
    ];

    // Define the 12 edges by connecting vertex indices
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // back face
      [4, 5], [5, 6], [6, 7], [7, 4], // front face
      [0, 4], [1, 5], [2, 6], [3, 7], // cross connections
    ];

    // 2. Pre-generate start and target coordinates for each particle
    const spawnRadius = CONFIG.HOLOGRAM.PARTICLE_SPAWN_RADIUS;
    const positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      // Start position: Random point within a sphere
      const r = Math.random() * spawnRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      const start = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      this.startPositions.push(start);

      // Target position: Random point along one of the 12 edges
      const edgeIndex = Math.floor(Math.random() * edges.length);
      const [v0Idx, v1Idx] = edges[edgeIndex];
      const v0 = vertices[v0Idx];
      const v1 = vertices[v1Idx];
      
      // Interpolate along the edge
      const t = Math.random();
      const target = new THREE.Vector3().lerpVectors(v0, v1, t);
      this.targetPositions.push(target);

      // Initial buffer position
      positions[i * 3] = start.x;
      positions[i * 3 + 1] = start.y;
      positions[i * 3 + 2] = start.z;
    }

    // 3. Create Three.js Points mesh
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.material = new THREE.PointsMaterial({
      color: CONFIG.HOLOGRAM.PARTICLE_COLOR,
      size: CONFIG.HOLOGRAM.PARTICLE_SIZE,
      transparent: true,
      opacity: 0.0, // starts invisible
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.add(this.points);
  }

  /**
   * Updates particle positions based on progress.
   * @param {number} progress - Animation progress (0.0 = fully scattered, 1.0 = fully assembled)
   */
  update(progress) {
    const positionAttr = this.geometry.getAttribute('position');
    const positions = positionAttr.array;

    // Easing: Quadratic Ease-Out
    const tEase = progress * (2 - progress);

    for (let i = 0; i < this.count; i++) {
      const start = this.startPositions[i];
      const target = this.targetPositions[i];

      // Interpolate positions
      positions[i * 3] = start.x + (target.x - start.x) * tEase;
      positions[i * 3 + 1] = start.y + (target.y - start.y) * tEase;
      positions[i * 3 + 2] = start.z + (target.z - start.z) * tEase;
    }

    positionAttr.needsUpdate = true;

    // Modulate opacity: Fade out as particles merge/assemble into the cube structure.
    // If progress is near 1.0, fade particles out so the solid wireframe takes over.
    if (progress < 0.2) {
      // Fade in from scattered invisible
      this.material.opacity = (progress / 0.2);
    } else if (progress > 0.8) {
      // Fade out as they merge into the cube lines
      this.material.opacity = 1.0 - ((progress - 0.8) / 0.2);
    } else {
      this.material.opacity = 1.0;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
