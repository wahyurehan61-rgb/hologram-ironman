/**
 * coordinateMapper.js
 * -----------------------------------------------------------------------
 * Converts 2D MediaPipe landmarks into 3D world coordinates.
 * Screen Space -> NDC -> World Coordinates.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { landmarkToCanvas, distance3D } from './utils.js';
import { CONFIG } from './config.js';

export class CoordinateMapper {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
  }

  /**
   * Calculates the 3D depth distance of the palm from the camera.
   * Compares the Index MCP (5) and Pinky MCP (17) pixel distance.
   */
  calculatePalmDistance(landmarks, videoW, videoH) {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    const indexMcp = landmarkToCanvas(landmarks[5], videoW, videoH, canvasW, canvasH, true);
    const pinkyMcp = landmarkToCanvas(landmarks[17], videoW, videoH, canvasW, canvasH, true);

    const dx = indexMcp.x - pinkyMcp.x;
    const dy = indexMcp.y - pinkyMcp.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy) || 1.0;

    // Use BASE_DEPTH_FACTOR to map pixel distance to world units.
    // If hand is closer (pixelDistance is larger), distance is smaller.
    return CONFIG.HOLOGRAM.BASE_DEPTH_FACTOR / pixelDistance;
  }

  /**
   * Maps a landmark into 3D world space.
   * @param {object} landmark - MediaPipe landmark {x, y, z}
   * @param {number} palmDistance - Calculated palm distance
   * @param {number} videoW - Native video width
   * @param {number} videoH - Native video height
   */
  mapToWorld(landmark, palmDistance, videoW, videoH) {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    // Map raw normalized coordinate through crop factor to screen pixels
    const pCanvas = landmarkToCanvas(landmark, videoW, videoH, canvasW, canvasH, true);

    // Map screen pixels to NDC [-1, 1]
    const ndcX = (pCanvas.x / canvasW) * 2 - 1;
    const ndcY = -(pCanvas.y / canvasH) * 2 + 1;

    // MediaPipe's landmark.z represents the depth relative to the wrist.
    // Hand size is roughly 15 cm (0.15 m). Scale landmark.z by this factor.
    const handScale = 0.15;
    const zOffset = (landmark.z || 0) * handScale;
    const totalDistance = palmDistance + zOffset;

    // Unproject NDC vector back to world space
    const temp = new THREE.Vector3(ndcX, ndcY, 0.5);
    temp.unproject(this.camera);

    // Get ray direction from camera position to unprojected vector
    const dir = temp.sub(this.camera.position).normalize();

    // Map along ray by the calculated distance
    return this.camera.position.clone().add(dir.multiplyScalar(totalDistance));
  }
}
