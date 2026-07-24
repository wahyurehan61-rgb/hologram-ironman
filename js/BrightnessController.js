/**
 * BrightnessController.js
 * -----------------------------------------------------------------------
 * Master controller for all hologram opacity, glow, and highlighting levels.
 * Clamps opacities within the [0.48, 0.62] bounds and injects breathing pulses.
 * -----------------------------------------------------------------------
 */

import { CONFIG } from './config.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export class BrightnessController {
  constructor() {
    this.minOpacity = CONFIG.HOLOGRAM.CUBE_MIN_OPACITY;
    this.maxOpacity = CONFIG.HOLOGRAM.CUBE_MAX_OPACITY;
  }

  /**
   * Calculates the final opacity for the wireframe edges.
   * @param {number} baseOpacity - Base opacity (default 0.55)
   * @param {number} transitionProgress - Visibility transition progress (0.0 to 1.0)
   * @param {number} flickerNoise - Instantaneous noise factor (±0.03)
   * @param {number} motionBlurFactor - Speed scaling factor (0.35 to 1.0)
   * @param {number} elapsedSec - Total time in seconds (for slow breathing pulses)
   */
  calculateWireframeOpacity(baseOpacity, transitionProgress, flickerNoise, motionBlurFactor, elapsedSec) {
    // 1. Slow, high-tech brightness breathing pulse (±2%)
    const pulseFactor = Math.sin(elapsedSec * 2.0 * Math.PI * 0.5) * 0.02;

    // 2. Base opacity adjusted for movement speed (motion blur)
    // Speed decreases opacity towards 0.35
    const baseTarget = THREE.MathUtils.lerp(
      CONFIG.HOLOGRAM.MOTION_BLUR_OPACITY,
      baseOpacity,
      motionBlurFactor
    );

    // 3. Compute final opacity before clamping
    const rawOpacity = baseTarget + flickerNoise + pulseFactor;

    // 4. Clamp base opacity within bounds, then multiply by transition progress to allow fading to 0
    const clampedOpacity = THREE.MathUtils.clamp(rawOpacity, this.minOpacity, this.maxOpacity);
    return clampedOpacity * transitionProgress;
  }

  /**
   * Calculates the final opacity for the glowing elements (corner dots, soft outer line halos).
   * @param {number} baseGlowOpacity - Base glow opacity (default 0.85 for corners)
   * @param {number} transitionProgress - Visibility transition progress (0.0 to 1.0)
   * @param {number} flickerNoise - Instantaneous noise factor (±0.03)
   * @param {number} individualPhaseOffset - Specific vertex animation factor
   */
  calculateGlowOpacity(baseGlowOpacity, transitionProgress, flickerNoise, individualPhaseOffset) {
    const rawGlow = baseGlowOpacity + flickerNoise + individualPhaseOffset;
    return THREE.MathUtils.clamp(rawGlow, 0.0, 1.0) * transitionProgress;
  }
}
