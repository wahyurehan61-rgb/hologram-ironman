/**
 * handTracking.js
 * -----------------------------------------------------------------------
 * Wraps MediaPipe Tasks Vision's HandLandmarker. Sole responsibility:
 * load the model/runtime and turn video frames into raw landmark data.
 * Does NOT interpret gestures and does NOT draw anything — that split is
 * what keeps gesture.js and debug.js independently testable.
 * -----------------------------------------------------------------------
 */

import {
  HandLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
import { CONFIG } from './config.js';

export class HandTracking {
  constructor() {
    this._landmarker = null;
    this._lastVideoTime = -1;
    this.ready = false;
  }

  /** Loads the wasm runtime and the hand landmarker model from CDN. */
  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      CONFIG.MEDIAPIPE.WASM_BASE_PATH
    );

    this._landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: CONFIG.MEDIAPIPE.MODEL_ASSET_PATH,
        delegate: 'GPU',
      },
      runningMode: CONFIG.MEDIAPIPE.RUNNING_MODE,
      numHands: CONFIG.MEDIAPIPE.NUM_HANDS,
      minHandDetectionConfidence: CONFIG.MEDIAPIPE.MIN_HAND_DETECTION_CONFIDENCE,
      minHandPresenceConfidence: CONFIG.MEDIAPIPE.MIN_HAND_PRESENCE_CONFIDENCE,
      minTrackingConfidence: CONFIG.MEDIAPIPE.MIN_TRACKING_CONFIDENCE,
    });

    this.ready = true;
  }

  /**
   * Runs detection on the current video frame. Guards against
   * re-processing an unchanged frame (VIDEO mode requires strictly
   * increasing timestamps) and reports its own compute latency.
   *
   * Returns { hands: [{ landmarks, handedness, score }], latencyMs } or
   * null when not ready / frame already processed.
   */
  detect(videoEl, nowMs) {
    if (!this.ready || !this._landmarker) return null;
    if (videoEl.currentTime === this._lastVideoTime) return null;
    this._lastVideoTime = videoEl.currentTime;

    const t0 = performance.now();
    const result = this._landmarker.detectForVideo(videoEl, nowMs);
    const latencyMs = performance.now() - t0;

    const hands = (result.landmarks || []).map((landmarks, i) => {
      const handednessInfo = result.handedness?.[i]?.[0];
      return {
        landmarks,
        // MediaPipe's handedness is computed against the raw (unmirrored)
        // frame, but the video is displayed mirrored for a natural selfie
        // view, so the left/right label must be flipped once, here, in
        // the only place that needs to know about mirroring.
        handedness:
          handednessInfo?.categoryName === 'Left' ? 'Right' : 'Left',
        score: handednessInfo?.score ?? 0,
      };
    });

    return { hands, latencyMs };
  }

  dispose() {
    this._landmarker?.close();
    this._landmarker = null;
    this.ready = false;
  }
}
