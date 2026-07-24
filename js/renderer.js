/**
 * renderer.js
 * -----------------------------------------------------------------------
 * Responsible for initializing and managing the THREE.WebGLRenderer.
 * Integrates EffectComposer and UnrealBloomPass for high-fidelity glowing lines,
 * supporting alpha-channel transparency and dynamic quality toggles.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CONFIG } from './config.js';

export class HologramRenderer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;

    // Post-processing setup with support for transparent alpha layers (RGBAFormat)
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat, // CRITICAL: preserves webcam transparency
        type: THREE.HalfFloatType, // Enable HDR range for UnrealBloomPass
      }
    );

    this.composer = new EffectComposer(this.renderer, renderTarget);
    
    // Will be initialized when scene and camera are loaded
    this.renderPass = null;
    this.bloomPass = null;
    this.composerInitialized = false;

    this.bloomActive = CONFIG.HOLOGRAM.BLOOM_ENABLED;
  }

  /**
   * Initializes render passes when scene and camera become available.
   */
  initPasses(scene, camera) {
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      CONFIG.HOLOGRAM.BLOOM_STRENGTH,
      CONFIG.HOLOGRAM.BLOOM_RADIUS,
      CONFIG.HOLOGRAM.BLOOM_THRESHOLD
    );
    this.composer.addPass(this.bloomPass);
    this.composerInitialized = true;
  }

  /**
   * Resizes the WebGL buffers and composer render targets.
   */
  resize(width, height) {
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.composer.setSize(width, height);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  /**
   * Sets whether Bloom is enabled or disabled.
   * @param {boolean} active - True to run bloom composer, false for direct draw pass-through
   */
  setBloomActive(active) {
    this.bloomActive = active;
    if (this.bloomPass) {
      this.bloomPass.enabled = active;
    }
  }

  /**
   * Renders the scene. Runs composer if bloom is active, otherwise bypasses composer
   * for direct transparent draw (optimizes GPU fill-rate).
   */
  render(scene, camera) {
    if (!this.composerInitialized) {
      this.initPasses(scene, camera);
    }

    if (this.bloomActive) {
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  getDomElement() {
    return this.renderer.domElement;
  }

  getInfo() {
    return this.renderer.info;
  }

  dispose() {
    this.composer.dispose();
    this.renderer.dispose();
  }
}
