/**
 * CubeAnimator.js
 * -----------------------------------------------------------------------
 * Animates the hologram cube's properties:
 * - Constant rotation (0.2 rad/sec) on X and Y.
 * - Sinusoidal idle motion (3 mm float, 1 Hz) along the palm normal.
 * - Adaptive scaling based on depth distance.
 * - Opacity adjustment for high speed (motion blur simulation).
 * - Multi-frequency sine wave flicker noise (via FlickerController).
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';
import { FlickerController } from './FlickerController.js';

export class CubeAnimator {
  constructor(cube) {
    this.cube = cube;
    this.flickerController = new FlickerController();
  }

  /**
   * Animates the cube properties frame-by-frame.
   * @param {number} elapsedSec - Total elapsed time in seconds
   * @param {number} deltaTime - Frame duration in seconds
   * @param {number} transitionProgress - Fade-in progress (0.0 to 1.0)
   * @param {number} palmPixelWidth - Current palm width in pixels for scaling
   * @param {number} handVelocity - Current velocity of the hand in meters/sec
   * @param {boolean} bloomActive - Status of UnrealBloomPass
   * @param {number} dimMultiplier - 0..1, dims the cube once Earth has appeared (Project 3.1). Defaults to 1.0.
   */
  animate(elapsedSec, deltaTime, transitionProgress, palmPixelWidth, handVelocity, bloomActive, dimMultiplier = 1.0) {
    if (!this.cube) return;

    // 1. Slow continuous rotation
    const rotSpeed = CONFIG.HOLOGRAM.CUBE_ROTATION_SPEED * deltaTime;
    this.cube.cubeWireframe.rotation.x += rotSpeed;
    this.cube.cubeWireframe.rotation.y += rotSpeed;
    
    this.cube.cubeGlow.rotation.x += rotSpeed;
    this.cube.cubeGlow.rotation.y += rotSpeed;

    this.cube.glowGroup.rotation.x += rotSpeed;
    this.cube.glowGroup.rotation.y += rotSpeed;

    // 2. Idle float motion: sinusoidal translation (3 mm height float, 1 Hz) along local Z (Palm Normal)
    const floatFrequency = CONFIG.HOLOGRAM.IDLE_FLOAT_FREQUENCY;
    const floatAmplitude = CONFIG.HOLOGRAM.IDLE_FLOAT_AMPLITUDE;
    const idleOffset = Math.sin(elapsedSec * 2.0 * Math.PI * floatFrequency) * floatAmplitude;
    
    // Set position of the cube group inside the HologramGroup.
    // The base offset is 8 cm along the normal axis (local Z axis).
    this.cube.position.set(0, 0, CONFIG.HOLOGRAM.OFFSET_ABOVE_PALM + idleOffset);

    // 3. Adaptive Scale: Hand close -> scales up, Hand far -> scales down
    let adaptiveScale = 1.0;
    if (palmPixelWidth > 0) {
      const scaleRatio = palmPixelWidth / CONFIG.HOLOGRAM.REFERENCE_PALM_WIDTH_PX;
      adaptiveScale = THREE.MathUtils.clamp(
        scaleRatio,
        CONFIG.HOLOGRAM.SCALE_MIN,
        CONFIG.HOLOGRAM.SCALE_MAX
      );
    }
    
    // Scale the individual cube elements rather than the parent group, to respect transition scale
    const targetScale = adaptiveScale;
    this.cube.cubeWireframe.scale.set(targetScale, targetScale, targetScale);
    this.cube.cubeGlow.scale.set(targetScale, targetScale, targetScale);
    this.cube.glowGroup.scale.set(targetScale, targetScale, targetScale);

    // 4. Motion Blur Simulation: high speed -> opacity decreases
    const speedRatio = THREE.MathUtils.clamp(
      handVelocity / CONFIG.HOLOGRAM.VELOCITY_BLUR_THRESHOLD,
      0.0,
      1.0
    );
    const motionBlurFactor = 1.0 - speedRatio; // 1.0 = stationary (55%), 0.0 = moving fast (35%)

    // 5. Hologram Flicker: smooth multi-frequency wave noise
    const flickerNoise = this.flickerController.update(deltaTime);

    // 6. Push updates to the cube material
    this.cube.updateVisuals(elapsedSec, transitionProgress, flickerNoise, motionBlurFactor, bloomActive, dimMultiplier);
  }
}
