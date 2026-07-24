/**
 * HologramCube.js
 * -----------------------------------------------------------------------
 * Visual representation of the hologram cube.
 * Houses Layer 1 (Wireframe), Layer 2 (Glow), Layer 3 (Corner Glow),
 * and Layer 4 (Fake Bloom Sprite fallback).
 * Uses the HologramMaterial cache and BrightnessController.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';
import { HologramMaterial } from './HologramMaterial.js';
import { BrightnessController } from './BrightnessController.js';

export class HologramCube extends THREE.Group {
  constructor(colorController) {
    super();
    this.name = 'HologramCube';

    this.colorController = colorController;
    this.size = CONFIG.HOLOGRAM.CUBE_SIZE;
    this.baseOpacity = CONFIG.HOLOGRAM.CUBE_BASE_OPACITY;
    this.glowOpacity = CONFIG.HOLOGRAM.CORNER_GLOW_OPACITY;

    this.brightnessController = new BrightnessController();

    this.init();
  }

  init() {
    const materialCache = HologramMaterial.getInstance();
    const colors = this.colorController.getTheme();

    // 1. Construct a custom BufferGeometry for the 12 edges with edge normals
    // This allows the ShaderMaterial to perform camera-facing highlights (+15% brightness)
    const half = this.size / 2;
    const positions = new Float32Array([
      // Back face edges
      -half, -half, -half,  half, -half, -half,
       half, -half, -half,  half,  half, -half,
       half,  half, -half, -half,  half, -half,
      -half,  half, -half, -half, -half, -half,
      // Front face edges
      -half, -half,  half,  half, -half,  half,
       half, -half,  half,  half,  half,  half,
       half,  half,  half, -half,  half,  half,
      -half,  half,  half, -half, -half,  half,
      // Connecting side edges
      -half, -half, -half, -half, -half,  half,
       half, -half, -half,  half, -half,  half,
       half,  half, -half,  half,  half,  half,
      -half,  half, -half, -half,  half,  half,
    ]);

    // Average normals of the two faces sharing each edge (normalized vectors)
    const nBottomBack  = [0.0, -0.707, -0.707];
    const nRightBack   = [0.707, 0.0, -0.707];
    const nTopBack     = [0.0, 0.707, -0.707];
    const nLeftBack    = [-0.707, 0.0, -0.707];

    const nBottomFront = [0.0, -0.707, 0.707];
    const nRightFront  = [0.707, 0.0, 0.707];
    const nTopFront    = [0.0, 0.707, 0.707];
    const nLeftFront   = [-0.707, 0.0, 0.707];

    const nBottomLeft  = [-0.707, -0.707, 0.0];
    const nBottomRight = [0.707, -0.707, 0.0];
    const nTopRight    = [0.707, 0.707, 0.0];
    const nTopLeft     = [-0.707, 0.707, 0.0];

    const normals = new Float32Array([
      ...nBottomBack,  ...nBottomBack,
      ...nRightBack,   ...nRightBack,
      ...nTopBack,     ...nTopBack,
      ...nLeftBack,    ...nLeftBack,

      ...nBottomFront, ...nBottomFront,
      ...nRightFront,  ...nRightFront,
      ...nTopFront,    ...nTopFront,
      ...nLeftFront,   ...nLeftFront,

      ...nBottomLeft,  ...nBottomLeft,
      ...nBottomRight, ...nBottomRight,
      ...nTopRight,    ...nTopRight,
      ...nTopLeft,     ...nTopLeft,
    ]);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('lineNormal', new THREE.BufferAttribute(normals, 3));

    // Layer 1: Crisp Shader-based Wireframe
    this.wireframeMaterial = materialCache.getWireframeMaterial(colors.primary, colors.highlight);
    this.cubeWireframe = new THREE.LineSegments(this.geometry, this.wireframeMaterial);
    this.add(this.cubeWireframe);

    // Layer 2: Soft Outer Line Glow Halo (slightly scaled up to prevent Z-fighting)
    this.glowMaterial = materialCache.getGlowMaterial(colors.secondary);
    this.cubeGlow = new THREE.LineSegments(this.geometry, this.glowMaterial);
    this.cubeGlow.scale.set(1.02, 1.02, 1.02);
    this.add(this.cubeGlow);

    // Layer 3: 8 Corner Glow Spheres (animating with random phases)
    this.glowGroup = new THREE.Group();
    this.add(this.glowGroup);

    const sphereGeo = new THREE.SphereGeometry(CONFIG.HOLOGRAM.CORNER_SPHERE_RADIUS, 12, 12);
    const corners = [
      [-half, -half, -half],
      [half, -half, -half],
      [half, half, -half],
      [-half, half, -half],
      [-half, -half, half],
      [half, -half, half],
      [half, half, half],
      [-half, half, half],
    ];

    corners.forEach(([x, y, z]) => {
      // Each corner gets its own material copy so opacities can animate independently
      const material = materialCache.getCornerMaterial(colors.highlight);
      const sphere = new THREE.Mesh(sphereGeo, material);
      sphere.position.set(x, y, z);
      // Assign random animation phase offset
      sphere.userData = { phase: Math.random() * Math.PI * 2 };
      this.glowGroup.add(sphere);
    });

    // Layer 4: Fake Bloom Sprite (transparent fallback radial glow)
    this.fakeBloomMaterial = materialCache.getFakeGlowSpriteMaterial(colors.glow);
    this.fakeBloomSprite = new THREE.Sprite(this.fakeBloomMaterial);
    this.fakeBloomSprite.scale.set(this.size * 2.5, this.size * 2.5, 1.0);
    this.add(this.fakeBloomSprite);
  }

  /**
   * Updates colors when the active theme is changed.
   */
  updateThemeColors() {
    const materialCache = HologramMaterial.getInstance();
    const colors = this.colorController.getTheme();

    // Clean cache first
    materialCache.clear();

    // Re-link updated materials
    this.wireframeMaterial = materialCache.getWireframeMaterial(colors.primary, colors.highlight);
    this.cubeWireframe.material = this.wireframeMaterial;

    this.glowMaterial = materialCache.getGlowMaterial(colors.secondary);
    this.cubeGlow.material = this.glowMaterial;

    // Refresh corner materials
    this.glowGroup.children.forEach((sphere) => {
      sphere.material = materialCache.getCornerMaterial(colors.highlight);
    });

    this.fakeBloomMaterial = materialCache.getFakeGlowSpriteMaterial(colors.glow);
    this.fakeBloomSprite.material = this.fakeBloomMaterial;
  }

  /**
   * Modulates opacities and scales based on transition, flickers, and performance quality levels.
   */
  updateVisuals(elapsedSec, transitionProgress, flickerNoise, motionBlurFactor, bloomActive, dimMultiplier = 1.0) {
    // 1. Scale Group based on spawn transition progress
    this.scale.set(transitionProgress, transitionProgress, transitionProgress);

    // 2. Opacity modulation using BrightnessController
    let finalWireOpacity = this.brightnessController.calculateWireframeOpacity(
      this.baseOpacity,
      transitionProgress,
      flickerNoise,
      motionBlurFactor,
      elapsedSec
    );

    // Earth Projection (Project 3.1): dim the cube down to ~40% once Earth has appeared.
    finalWireOpacity *= dimMultiplier;

    // Update uniform on ShaderMaterial
    if (this.wireframeMaterial.uniforms) {
      this.wireframeMaterial.uniforms.opacity.value = finalWireOpacity;
    }

    // Outer Glow opacity modulates relative to wireframe
    this.glowMaterial.opacity = finalWireOpacity * 0.45;

    // 3. Corner spheres animation: independent random phases
    this.glowGroup.children.forEach((sphere) => {
      const phase = elapsedSec * 3.0 + sphere.userData.phase;
      const breathing = Math.sin(phase) * 0.12; // vary corner brightness by ±12%

      sphere.material.opacity = this.brightnessController.calculateGlowOpacity(
        this.glowOpacity,
        transitionProgress,
        flickerNoise,
        breathing
      ) * dimMultiplier;
    });

    // 4. Toggle Fake Bloom Sprite fallback
    this.fakeBloomSprite.visible = !bloomActive;
    if (this.fakeBloomSprite.visible) {
      this.fakeBloomSprite.material.opacity = 0.18 * transitionProgress * dimMultiplier;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.glowGroup.children.forEach((sphere) => {
      sphere.geometry.dispose();
      sphere.material.dispose();
    });
    this.fakeBloomSprite.geometry.dispose();
  }
}
