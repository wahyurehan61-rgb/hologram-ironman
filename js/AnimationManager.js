/**
 * AnimationManager.js
 * -----------------------------------------------------------------------
 * Coordinates the hologram lifecycle state machine:
 * - INACTIVE, TRANSITION_IN, ACTIVE, TRANSITION_OUT
 * - Implements a unified time timeline for both setup and teardown.
 * -----------------------------------------------------------------------
 */

import { CONFIG } from './config.js';

/**
 * Ease Out Cubic — used for the Earth appear animation.
 * @param {number} t - 0..1
 */
function easeOutCubic(t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

export class AnimationManager {
  constructor(objectManager) {
    this.objectManager = objectManager;

    this.state = 'INACTIVE'; // 'INACTIVE' | 'TRANSITION_IN' | 'ACTIVE' | 'TRANSITION_OUT'
    this.timer = 0; // cumulative transition time in ms

    // Earth Projection (Project 3.1): counts up only once the Cube has
    // fully spawned (cubeProgress >= 1), drives both the Earth appear
    // animation and the Cube's opacity dim-down. Resets whenever the Cube
    // is not fully spawned, so it replays on the next activation.
    this.earthTimer = 0; // ms
    this.tEarthAppear = CONFIG.HOLOGRAM.EARTH_APPEAR_MS;
    this.tCubeDim = CONFIG.HOLOGRAM.CUBE_DIM_MS;

    // Total durations
    this.tGesture = CONFIG.HOLOGRAM.GESTURE_TRANSITION_MS;
    this.tEnergy = CONFIG.HOLOGRAM.ENERGY_FIELD_MS;
    this.tParticles = CONFIG.HOLOGRAM.PARTICLE_ASSEMBLY_MS;
    this.tCube = CONFIG.HOLOGRAM.CUBE_SPAWN_MS;

    // Total timeline durations
    this.durationIn = this.tGesture + this.tEnergy + this.tParticles + this.tCube;
    this.durationOut = this.tEnergy + this.tParticles + this.tCube; // Gesture transition isn't needed for quick fade-outs
  }

  /**
   * Resets the animation manager state.
   */
  reset() {
    this.state = 'INACTIVE';
    this.timer = 0;
    this.earthTimer = 0;
    if (this.objectManager?.earthGroup) {
      this.objectManager.earthGroup.resetAppear();
    }
  }

  /**
   * Updates transition timelines and computes visual variables.
   * @param {string} gestureStatus - 'OPEN_PALM' | 'UNKNOWN'
   * @param {boolean} rightHandVisible - Is the right hand detected
   * @param {number} deltaTimeMs - Frame step time in ms
   */
  update(gestureStatus, rightHandVisible, deltaTimeMs) {
    const targetValid = rightHandVisible && gestureStatus === 'OPEN_PALM';

    // 1. State transitions
    switch (this.state) {
      case 'INACTIVE':
        if (targetValid) {
          this.state = 'TRANSITION_IN';
          this.timer = 0;
        }
        break;

      case 'TRANSITION_IN':
        if (!targetValid) {
          // Interrupt and start transitioning out from the corresponding point on the timeline
          this.state = 'TRANSITION_OUT';
          // Map elapsed time to equivalent spot on the transition-out timeline
          const progressRatio = this.timer / this.durationIn;
          this.timer = progressRatio * this.durationOut;
        } else {
          this.timer += deltaTimeMs;
          if (this.timer >= this.durationIn) {
            this.state = 'ACTIVE';
            this.timer = this.durationIn;
          }
        }
        break;

      case 'ACTIVE':
        if (!targetValid) {
          this.state = 'TRANSITION_OUT';
          this.timer = this.durationOut;
        }
        break;

      case 'TRANSITION_OUT':
        if (targetValid) {
          // Interrupt and transition back in
          this.state = 'TRANSITION_IN';
          const progressRatio = this.timer / this.durationOut;
          this.timer = progressRatio * this.durationIn;
        } else {
          this.timer -= deltaTimeMs;
          if (this.timer <= 0) {
            this.state = 'INACTIVE';
            this.timer = 0;
          }
        }
        break;
    }

    // 2. Calculate progress ratios (0.0 to 1.0) for individual components
    let energyProgress = 0;
    let particleProgress = 0;
    let cubeProgress = 0;

    if (this.state === 'TRANSITION_IN' || this.state === 'ACTIVE') {
      const t = this.timer;

      // Energy Field Phase (tGesture to tGesture + tEnergy)
      if (t > this.tGesture) {
        energyProgress = Math.min((t - this.tGesture) / this.tEnergy, 1.0);
      }

      // Particle Assembly Phase (tGesture + tEnergy to tGesture + tEnergy + tParticles)
      const startParticles = this.tGesture + this.tEnergy;
      if (t > startParticles) {
        particleProgress = Math.min((t - startParticles) / this.tParticles, 1.0);
      }

      // Cube Spawn Phase (tGesture + tEnergy + tParticles to durationIn)
      const startCube = startParticles + this.tParticles;
      if (t > startCube) {
        cubeProgress = Math.min((t - startCube) / this.tCube, 1.0);
      }

      if (this.state === 'ACTIVE') {
        energyProgress = 1.0;
        particleProgress = 1.0;
        cubeProgress = 1.0;
      }
    } else if (this.state === 'TRANSITION_OUT') {
      const t = this.timer; // counts down from durationOut to 0

      // Reverse order:
      // 1. Cube wireframe fades out first (durationOut down to durationOut - tCube)
      const startCubeOut = this.durationOut - this.tCube;
      if (t > startCubeOut) {
        cubeProgress = (t - startCubeOut) / this.tCube;
      } else {
        cubeProgress = 0;
      }

      // 2. Particles scatter/disassemble (startCubeOut down to tEnergy)
      const startParticlesOut = this.tEnergy;
      if (t > startParticlesOut && t <= startCubeOut) {
        particleProgress = (t - startParticlesOut) / this.tParticles;
      } else if (t > startCubeOut) {
        particleProgress = 1.0;
      } else {
        particleProgress = 0;
      }

      // 3. Energy field fades out last (tEnergy down to 0)
      if (t > 0) {
        energyProgress = Math.min(t / this.tEnergy, 1.0);
      } else {
        energyProgress = 0;
      }
    }

    // 2b. Earth Projection (Project 3.1): only advances once the Cube has
    // fully spawned; resets otherwise so it replays next activation.
    if (cubeProgress >= 1.0) {
      this.earthTimer = Math.min(this.earthTimer + deltaTimeMs, Math.max(this.tEarthAppear, this.tCubeDim));
    } else {
      this.earthTimer = 0;
      if (this.objectManager?.earthGroup) {
        this.objectManager.earthGroup.resetAppear();
      }
    }

    const earthAppearRaw = Math.min(this.earthTimer / this.tEarthAppear, 1.0);
    const earthProgress = easeOutCubic(earthAppearRaw); // scale/opacity of Earth, plays once

    const cubeDimRaw = Math.min(this.earthTimer / this.tCubeDim, 1.0);
    const cubeOpacityMultiplier = 1.0 - (1.0 - CONFIG.HOLOGRAM.CUBE_DIM_MIN_MULTIPLIER) * cubeDimRaw; // 1.0 -> 0.4

    // 3. Apply progress values to the 3D meshes in ObjectManager
    if (this.objectManager) {
      this.objectManager.energyField.update(performance.now() / 1000, energyProgress);
      this.objectManager.particleAssembly.update(particleProgress);
      // Note: CubeAnimator will animate the cube mesh during active/transition phases.
      // We pass cubeProgress to CubeAnimator, which updates the cube lines.

      if (this.objectManager.earthGroup) {
        this.objectManager.earthGroup.updateAnimation(performance.now() / 1000, deltaTimeMs / 1000, earthProgress);
      }
    }

    return {
      energyProgress,
      particleProgress,
      cubeProgress,
      earthProgress,
      cubeOpacityMultiplier,
    };
  }

  /**
   * Returns the current system status text.
   * WAITING, SCANNING, PROJECTING, TRACKING, LOCKED.
   */
  getStatusText(rightHandVisible, anchorMode) {
    if (!rightHandVisible) return 'WAITING';

    switch (this.state) {
      case 'INACTIVE':
        return 'SCANNING';
      case 'TRANSITION_IN':
        return 'PROJECTING';
      case 'ACTIVE':
        return anchorMode === 'LOCK' ? 'LOCKED' : 'TRACKING';
      case 'TRANSITION_OUT':
        return 'PROJECTING';
      default:
        return 'WAITING';
    }
  }
}
