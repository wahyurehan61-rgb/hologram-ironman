/**
 * FlickerController.js
 * -----------------------------------------------------------------------
 * Simulates organic, analog-style projector flicker using a combination
 * of multi-frequency sine waves. Limits changes to ±3%.
 * -----------------------------------------------------------------------
 */

export class FlickerController {
  constructor() {
    this.time = 0;
  }

  /**
   * Returns a smooth, continuous noise offset in the range [-0.03, 0.03].
   * @param {number} deltaTime - Step time in seconds
   */
  update(deltaTime) {
    if (deltaTime <= 0) return 0;
    
    // Increment local accumulator
    this.time += deltaTime * 12.0;

    // Superimpose sine waves of prime-ratio frequencies to simulate Perlin noise
    const noise = Math.sin(this.time * 1.0) * 0.45 +
                  Math.sin(this.time * 2.19) * 0.35 +
                  Math.sin(this.time * 0.73) * 0.20;

    return noise * 0.03; // Clamp output strictly within ±3%
  }
}
