/**
 * camera.js
 * -----------------------------------------------------------------------
 * Requests webcam permission, binds the stream to a <video> element,
 * and manages the 3D PerspectiveCamera for the hologram projection.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';

/**
 * Requests camera access (front camera on mobile, default camera on
 * desktop, via facingMode: 'user') at the configured ideal resolution,
 * and starts playback on the given <video> element.
 *
 * Returns the active MediaStream so the caller can read the negotiated
 * resolution or stop it later.
 */
export async function startCamera(videoEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser ini tidak mendukung akses kamera (getUserMedia).');
  }

  const constraints = {
    audio: false,
    video: {
      facingMode: CONFIG.CAMERA.FACING_MODE,
      width: { ideal: CONFIG.CAMERA.IDEAL_WIDTH },
      height: { ideal: CONFIG.CAMERA.IDEAL_HEIGHT },
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoEl.srcObject = stream;

  await new Promise((resolve, reject) => {
    videoEl.onloadedmetadata = () => resolve();
    videoEl.onerror = () => reject(new Error('Gagal memuat video kamera.'));
  });

  await videoEl.play();
  return stream;
}

export function stopCamera(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

/** Reads the negotiated resolution straight off the live video track. */
export function getStreamResolution(stream) {
  const track = stream?.getVideoTracks?.()[0];
  if (!track) return { width: 0, height: 0 };
  const settings = track.getSettings();
  return { width: settings.width || 0, height: settings.height || 0 };
}

/**
 * HologramCamera
 * -----------------------------------------------------------------------
 * Coordinates the 3D projection matrix. Positioned at Z=1.5 looking at
 * the origin (0, 0, 0) by default.
 */
export class HologramCamera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    this.camera.position.set(0, 0, 1.5);
    this.camera.lookAt(0, 0, 0);
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getCamera() {
    return this.camera;
  }
}

