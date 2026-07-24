/**
 * HologramMaterial.js
 * -----------------------------------------------------------------------
 * Material Cache Singleton. Manages and reuses Three.js materials.
 * Implements custom ShaderMaterials for camera-facing line highlights
 * and procedurally creates soft radial glow sprites.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export class HologramMaterial {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Returns the singleton instance.
   */
  static getInstance() {
    if (!HologramMaterial.instance) {
      HologramMaterial.instance = new HologramMaterial();
    }
    return HologramMaterial.instance;
  }

  /**
   * Shading material for crisp cube edges.
   * Edge parts facing the camera are highlighted (+15% brightness).
   */
  getWireframeMaterial(primaryColor, highlightColor) {
    const key = `wireframe_${primaryColor}_${highlightColor}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(primaryColor) },
        highlightColor: { value: new THREE.Color(highlightColor) },
        opacity: { value: 0.55 },
      },
      vertexShader: `
        attribute vec3 lineNormal;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * lineNormal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 highlightColor;
        uniform float opacity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          // Dot product: high value (1.0) means edge normal faces camera
          float facing = abs(dot(normal, viewDir));
          vec3 finalColor = mix(color, highlightColor, facing * 0.15); // +15% highlight mix
          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.cache.set(key, mat);
    return mat;
  }

  /**
   * Glow material for the outer soft halo line segments.
   */
  getGlowMaterial(secondaryColor) {
    const key = `glow_${secondaryColor}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(secondaryColor),
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.cache.set(key, mat);
    return mat;
  }

  /**
   * Corner dot glow material.
   */
  getCornerMaterial(highlightColor) {
    const key = `corner_${highlightColor}`;
    if (this.cache.has(key)) return this.cache.get(key);

    // Each corner vertex gets its own material copy so opacities can animate independently
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(highlightColor),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return mat;
  }

  /**
   * Generates a canvas-procedural soft radial glow Sprite texture
   * to serve as a high-performance fake bloom fallback.
   */
  getFakeGlowSpriteMaterial(glowColorStr) {
    const key = `fake_glow_${glowColorStr}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.2, glowColorStr);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.cache.set(key, mat);
    return mat;
  }

  clear() {
    this.cache.forEach((mat) => {
      mat.map?.dispose();
      mat.dispose();
    });
    this.cache.clear();
  }
}

HologramMaterial.instance = null;
