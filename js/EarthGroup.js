/**
 * EarthGroup.js
 * -----------------------------------------------------------------------
 * Project 3.1 — Earth Projection.
 *
 * Owns the Earth hologram sub-object: EarthSphere (day map) + CloudSphere
 * (child of EarthSphere). Responsible only for:
 *   - Floating animation
 *   - Rotation (Earth + Clouds)
 *   - Breathing (subtle scale pulse)
 *   - Brightness pulse
 *   - Fade/scale "appear" animation (plays once)
 *   - Visibility
 *
 * Does NOT touch gestures, the renderer, or create any object at runtime.
 * All geometry/material/texture allocation happens once, here, in the
 * constructor — never inside update().
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';

export class EarthGroup extends THREE.Group {
  /**
   * @param {number} cubeSize - CONFIG.HOLOGRAM.CUBE_SIZE, used to derive Earth's radius.
   */
  constructor(cubeSize) {
    super();
    this.name = 'EarthGroup';

    this.earthRadius = cubeSize * CONFIG.HOLOGRAM.EARTH_RADIUS_RATIO;
    this.cloudRadius = this.earthRadius * CONFIG.HOLOGRAM.CLOUD_RADIUS_RATIO;

    this.init();

    // Position is always kept at (0,0,0) offset relative to the Cube's
    // center — the caller (main.js) copies the Cube's world position onto
    // this group every frame so Earth always sits exactly inside the Cube.
    this.position.set(0, 0, 0);
  }

  init() {
    const segments = CONFIG.HOLOGRAM.EARTH_SEGMENTS;

    // Texture loaded exactly once, here, via a single TextureLoader instance.
    const loader = new THREE.TextureLoader();
    this.dayTexture = loader.load(CONFIG.HOLOGRAM.EARTH_DAY_TEXTURE);
    this.cloudTexture = loader.load(CONFIG.HOLOGRAM.EARTH_CLOUDS_TEXTURE);

    // --- EarthSphere ---
    this.earthGeometry = new THREE.SphereGeometry(this.earthRadius, segments, segments);
    this.earthMaterial = new THREE.MeshPhongMaterial({
      map: this.dayTexture,
      transparent: true,
      opacity: 0,
    });
    this.earthMesh = new THREE.Mesh(this.earthGeometry, this.earthMaterial);
    this.add(this.earthMesh);

    // --- CloudSphere (child of EarthSphere) ---
    this.cloudGeometry = new THREE.SphereGeometry(this.cloudRadius, segments, segments);
    this.cloudMaterial = new THREE.MeshPhongMaterial({
      map: this.cloudTexture,
      transparent: true,
      opacity: 0, // ramps up to CLOUD_OPACITY during appear animation
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.cloudMesh = new THREE.Mesh(this.cloudGeometry, this.cloudMaterial);
    this.earthMesh.add(this.cloudMesh);

    // Internal animation clocks (seconds), advanced via deltaTime each frame.
    this._floatClock = 0;
    this._breatheClock = 0;
    this._brightnessClock = 0;

    // Tracks whether the one-shot appear animation has already completed,
    // so re-entering ACTIVE state doesn't restart it unnecessarily.
    this._appearComplete = false;

    this.visible = false;
  }

  /**
   * Per-frame update. Called from AnimationManager alongside the other
   * hologram sub-components.
   * @param {number} elapsedSec - unused directly (kept for API symmetry); reserved.
   * @param {number} deltaTime - seconds since last frame.
   * @param {number} appearProgress - 0..1, eased (ease-out-cubic), monotonic, plays once per activation.
   */
  updateAnimation(elapsedSec, deltaTime, appearProgress) {
    if (deltaTime <= 0) deltaTime = 0;

    this._floatClock += deltaTime;
    this._breatheClock += deltaTime;
    this._brightnessClock += deltaTime;

    // 1. Rotation — frame-rate independent via deltaTime.
    this.earthMesh.rotation.y += CONFIG.HOLOGRAM.EARTH_ROTATION_SPEED * deltaTime;
    this.cloudMesh.rotation.y += CONFIG.HOLOGRAM.CLOUD_ROTATION_SPEED * deltaTime;

    // 2. Floating — smooth vertical sinusoidal bob (naik/turun/naik).
    const floatFreq = CONFIG.HOLOGRAM.EARTH_FLOAT_FREQUENCY;
    const floatAmp = CONFIG.HOLOGRAM.EARTH_FLOAT_AMPLITUDE;
    this.earthMesh.position.y = Math.sin(this._floatClock * 2.0 * Math.PI * floatFreq) * floatAmp;

    // 3. Breathing — 1.000 -> 1.015 -> 1.000 over 5s, cosine easing (no "denyutan"/pulsing feel).
    const breatheDuration = CONFIG.HOLOGRAM.EARTH_BREATHE_DURATION_SEC;
    const breatheMin = CONFIG.HOLOGRAM.EARTH_BREATHE_MIN_SCALE;
    const breatheMax = CONFIG.HOLOGRAM.EARTH_BREATHE_MAX_SCALE;
    const breatheT = (Math.cos((this._breatheClock / breatheDuration) * 2.0 * Math.PI) + 1) / 2; // 0..1..0
    const breatheScale = breatheMin + (breatheMax - breatheMin) * (1 - breatheT);
    this.earthMesh.scale.setScalar(breatheScale);

    // 4. Brightness pulse — 100% -> 94% -> 100% over 4s, smooth (no flicker).
    const brightDuration = CONFIG.HOLOGRAM.EARTH_BRIGHTNESS_DURATION_SEC;
    const brightMin = CONFIG.HOLOGRAM.EARTH_BRIGHTNESS_MIN;
    const brightMax = CONFIG.HOLOGRAM.EARTH_BRIGHTNESS_MAX;
    const brightT = (Math.cos((this._brightnessClock / brightDuration) * 2.0 * Math.PI) + 1) / 2; // 0..1..0
    const brightness = brightMin + (brightMax - brightMin) * (1 - brightT);
    this.earthMaterial.color.setScalar(brightness);

    // 5. Appear animation — scale 0->1 and opacity 0->100% over 500ms, plays once.
    const clampedAppear = THREE.MathUtils.clamp(appearProgress, 0, 1);
    this.scale.setScalar(clampedAppear);
    this.earthMaterial.opacity = clampedAppear;
    this.cloudMaterial.opacity = CONFIG.HOLOGRAM.CLOUD_OPACITY * clampedAppear;

    if (clampedAppear >= 1) {
      this._appearComplete = true;
    }
  }

  /**
   * Resets the one-shot appear animation and internal clocks so the next
   * activation plays the appear animation again from scratch.
   */
  resetAppear() {
    this._appearComplete = false;
    this.scale.setScalar(0);
    this.earthMaterial.opacity = 0;
    this.cloudMaterial.opacity = 0;
  }

  dispose() {
    this.earthGeometry.dispose();
    this.cloudGeometry.dispose();
    this.earthMaterial.dispose();
    this.cloudMaterial.dispose();
    this.dayTexture.dispose();
    this.cloudTexture.dispose();
  }
}
