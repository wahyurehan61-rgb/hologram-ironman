/**
 * QualityManager.js
 * -----------------------------------------------------------------------
 * Measures rolling average FPS to decide rendering quality level:
 * - If FPS > 55: Enable UnrealBloomPass post-processing.
 * - If FPS < 45: Disable Bloom and fall back to transparent Fake Glow sprite.
 * Uses a rolling window to prevent rapid toggling (hysteresis).
 * -----------------------------------------------------------------------
 */

export class QualityManager {
  constructor(defaultBloomState = true) {
    this.bloomActive = defaultBloomState;
    this.fpsWindow = [];
    this.windowSize = 90; // ~1.5 seconds at 60fps
  }

  /**
   * Updates quality state based on current frame-rate.
   * Returns true if Bloom is active, false if we should use Fake Glow.
   * @param {number} currentFps - Instantaneous FPS
   */
  update(currentFps) {
    if (Number.isFinite(currentFps) && currentFps > 0) {
      this.fpsWindow.push(currentFps);
      if (this.fpsWindow.length > this.windowSize) {
        this.fpsWindow.shift();
      }
    }

    // Do not toggle until we have gathered enough samples
    if (this.fpsWindow.length < this.windowSize) {
      return this.bloomActive;
    }

    // Compute average FPS
    let sum = 0;
    for (let i = 0; i < this.fpsWindow.length; i++) {
      sum += this.fpsWindow[i];
    }
    const avgFps = sum / this.fpsWindow.length;

    // Hysteresis transitions
    if (this.bloomActive && avgFps < 45.0) {
      this.bloomActive = false;
      console.warn(`[QualityManager] Performance drop detected (Average FPS: ${avgFps.toFixed(1)}). Disabling Bloom.`);
    } else if (!this.bloomActive && avgFps > 55.0) {
      this.bloomActive = true;
      console.info(`[QualityManager] Performance recovered (Average FPS: ${avgFps.toFixed(1)}). Re-enabling Bloom.`);
    }

    return this.bloomActive;
  }

  isBloomActive() {
    return this.bloomActive;
  }

  getQualityLevel() {
    return this.bloomActive ? 'HIGH (Bloom)' : 'LOW (Fake Glow)';
  }
}
