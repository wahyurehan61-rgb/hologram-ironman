/**
 * PalmAnchor.js
 * -----------------------------------------------------------------------
 * An empty parent object (THREE.Group) that tracks the palm center.
 * It calculates the palm normal using the Wrist, Index MCP, and Pinky MCP,
 * aligns its orientation with the palm normal, and implements LERP
 * smoothing and the LOCK/FOLLOW state machine.
 * -----------------------------------------------------------------------
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CONFIG } from './config.js';

export class PalmAnchor extends THREE.Group {
  constructor() {
    super();
    this.name = 'PalmAnchor';

    this.mode = 'FOLLOW'; // 'FOLLOW' or 'LOCK'
    this.velocity = 0; // meters per second
    this.lowVelocityTime = 0; // ms accumulated with low velocity

    this.lastTargetPosition = new THREE.Vector3();
    this.normal = new THREE.Vector3(0, 0, 1); // Normal vector pointing outward from palm

    // To prevent sudden jumps when a hand first appears
    this.initialized = false;
  }

  /**
   * Resets the anchor tracking state when the hand is lost.
   */
  reset() {
    this.mode = 'FOLLOW';
    this.velocity = 0;
    this.lowVelocityTime = 0;
    this.initialized = false;
  }

  /**
   * Updates the anchor position, normal, orientation, and mode.
   * @param {THREE.Vector3} rawPalmCenter - Target center coordinate
   * @param {THREE.Vector3} posW - Wrist position
   * @param {THREE.Vector3} posI - Index MCP position
   * @param {THREE.Vector3} posP - Pinky MCP position
   * @param {number} deltaTime - Time since last frame in seconds
   */
  updateTracking(rawPalmCenter, posW, posI, posP, deltaTime) {
    if (deltaTime <= 0) return;

    // 1. Calculate Palm Normal vector
    // Vector A: from Wrist to Index MCP
    const vecI = new THREE.Vector3().subVectors(posI, posW);
    // Vector B: from Wrist to Pinky MCP
    const vecP = new THREE.Vector3().subVectors(posP, posW);

    // Cross product: points out of the palm for right hand in selfie mode
    this.normal.crossVectors(vecP, vecI).normalize();

    // Calculate orientation basis vectors
    const zAxis = this.normal.clone();
    
    // Up axis: from Wrist to average of Index and Pinky MCP
    const centerMCP = new THREE.Vector3().addVectors(posI, posP).multiplyScalar(0.5);
    const yAxis = new THREE.Vector3().subVectors(centerMCP, posW).normalize();
    
    // Right axis
    const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
    // Re-orthogonalize yAxis to ensure perfect perpendicularity
    yAxis.crossVectors(zAxis, xAxis).normalize();

    // Create basis matrix and target rotation
    const basisMatrix = new THREE.Matrix4();
    basisMatrix.makeBasis(xAxis, yAxis, zAxis);
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(basisMatrix);

    // 2. State Machine: FOLLOW vs LOCK mode
    if (!this.initialized) {
      this.position.copy(rawPalmCenter);
      this.quaternion.copy(targetQuaternion);
      this.lastTargetPosition.copy(rawPalmCenter);
      this.initialized = true;
      return;
    }

    // Calculate raw hand velocity (m/s)
    this.velocity = rawPalmCenter.distanceTo(this.lastTargetPosition) / deltaTime;
    this.lastTargetPosition.copy(rawPalmCenter);

    // Hysteresis threshold to lock and unlock
    const isStationary = this.velocity < CONFIG.HOLOGRAM.LOCK_VELOCITY_THRESHOLD;

    if (isStationary) {
      this.lowVelocityTime += deltaTime * 1000;
      if (this.lowVelocityTime >= CONFIG.HOLOGRAM.LOCK_DELAY_MS && this.mode === 'FOLLOW') {
        this.mode = 'LOCK';
      }
    } else {
      this.lowVelocityTime = 0;
      // Exit lock immediately on significant movement
      const exitThreshold = CONFIG.HOLOGRAM.LOCK_VELOCITY_THRESHOLD * 1.5;
      if (this.velocity > exitThreshold && this.mode === 'LOCK') {
        this.mode = 'FOLLOW';
      }
    }

    // 3. Smooth translation and rotation
    const lerpFactor = this.mode === 'LOCK' 
      ? CONFIG.HOLOGRAM.LERP_LOCK 
      : CONFIG.HOLOGRAM.LERP_FOLLOW;

    this.position.lerp(rawPalmCenter, lerpFactor);
    this.quaternion.slerp(targetQuaternion, lerpFactor);
  }
}
