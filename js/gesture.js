/**
 * gesture.js
 * -----------------------------------------------------------------------
 * Gesture interpretation, kept fully separate from tracking (handTracking.js)
 * and drawing (debug.js). Two layers:
 *
 *   1. isOpenPalm(landmarks)  — a pure, single-frame test using all 21
 *      landmarks (thumb + four fingers, not just fingertip positions).
 *   2. GestureStabilizer      — wraps that raw test with a frame buffer
 *      (gesture must hold for N consecutive frames) and a cooldown
 *      (ignore flips for a short window after a confirmed change), so
 *      the on-screen "Gesture" status never flickers.
 * -----------------------------------------------------------------------
 */

import { CONFIG } from './config.js';
import { distance3D, LM } from './utils.js';

/**
 * A non-thumb finger counts as "extended" when its tip sits meaningfully
 * farther from the wrist than its own MCP knuckle — i.e. straightened
 * outward rather than curled into the palm.
 */
function isFingerExtended(landmarks, mcpIdx, tipIdx, ratio) {
  const wrist = landmarks[LM.WRIST];
  const mcp = landmarks[mcpIdx];
  const tip = landmarks[tipIdx];

  const mcpDist = distance3D(wrist, mcp);
  const tipDist = distance3D(wrist, tip);
  return tipDist > mcpDist * ratio;
}

/**
 * The thumb doesn't curl toward the wrist like other fingers, so it's
 * checked separately: an open thumb sits far from the pinky's MCP
 * knuckle (splayed away from the palm); a closed/fisted thumb sits close
 * to it.
 */
function isThumbExtended(landmarks, ratio) {
  const pinkyMcp = landmarks[LM.PINKY_MCP];
  const indexMcp = landmarks[LM.INDEX_MCP];
  const thumbTip = landmarks[LM.THUMB_TIP];
  const thumbMcp = landmarks[LM.THUMB_MCP];

  const palmWidth = distance3D(pinkyMcp, indexMcp) || 0.0001;
  const thumbSpread = distance3D(thumbTip, pinkyMcp);
  const thumbBaseSpread = distance3D(thumbMcp, pinkyMcp);

  return thumbSpread > thumbBaseSpread && thumbSpread / palmWidth > ratio;
}

/**
 * Single-frame open-palm test across all five fingers using the full set
 * of 21 landmarks — not just fingertip positions.
 */
export function isOpenPalm(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;

  const ratio = CONFIG.GESTURE.FINGER_EXTENSION_RATIO;
  const thumbRatio = CONFIG.GESTURE.THUMB_SPREAD_RATIO;

  const thumb = isThumbExtended(landmarks, thumbRatio);
  const index = isFingerExtended(landmarks, LM.INDEX_MCP, LM.INDEX_TIP, ratio);
  const middle = isFingerExtended(landmarks, LM.MIDDLE_MCP, LM.MIDDLE_TIP, ratio);
  const ring = isFingerExtended(landmarks, LM.RING_MCP, LM.RING_TIP, ratio);
  const pinky = isFingerExtended(landmarks, LM.PINKY_MCP, LM.PINKY_TIP, ratio);

  return thumb && index && middle && ring && pinky;
}

/**
 * Frame-buffered, cooldown-debounced gesture status.
 *
 * Usage: call update(landmarks, nowMs) once per frame; read .status
 * ('OPEN_PALM' | 'UNKNOWN') for the confirmed, stable value.
 */
export class GestureStabilizer {
  constructor() {
    this._buffer = new Array(CONFIG.GESTURE.BUFFER_SIZE).fill(false);
    this._bufferIndex = 0;
    this.status = 'UNKNOWN';
    this._lastChangeMs = -Infinity;
  }

  reset() {
    this._buffer.fill(false);
    this._bufferIndex = 0;
    this.status = 'UNKNOWN';
  }

  /**
   * @param {Array|null} landmarks - 21 landmarks, or null if no hand
   * @param {number} nowMs - performance.now()-style timestamp
   */
  update(landmarks, nowMs) {
    const raw = landmarks ? isOpenPalm(landmarks) : false;

    this._buffer[this._bufferIndex] = raw;
    this._bufferIndex = (this._bufferIndex + 1) % this._buffer.length;

    const allOpen = this._buffer.every(Boolean);
    const candidateStatus = allOpen ? 'OPEN_PALM' : 'UNKNOWN';

    const withinCooldown =
      nowMs - this._lastChangeMs < CONFIG.GESTURE.COOLDOWN_MS;

    if (candidateStatus !== this.status && !withinCooldown) {
      this.status = candidateStatus;
      this._lastChangeMs = nowMs;
    }

    return this.status;
  }
}
