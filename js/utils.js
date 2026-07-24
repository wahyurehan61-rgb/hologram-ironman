/**
 * utils.js
 * -----------------------------------------------------------------------
 * Small, dependency-free helpers shared across modules. Nothing here
 * knows about MediaPipe internals or the DOM beyond plain numbers.
 * -----------------------------------------------------------------------
 */

// Standard MediaPipe Hand Landmarker connectivity graph (pairs of
// landmark indices), used to draw the skeleton.
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

// Landmark indices used repeatedly across gesture/palm calculations.
export const LM = {
  WRIST: 0,
  THUMB_MCP: 2,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Centroid of an arbitrary list of {x,y,z} points. */
export function centroid(points) {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + (p.z || 0) }),
    { x: 0, y: 0, z: 0 }
  );
  const n = points.length || 1;
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}

/**
 * The <video> is mirrored via CSS (transform: scaleX(-1)) for a natural
 * selfie view, but raw landmark data comes back in the unmirrored video
 * frame's coordinate space. This is the single place that compensates,
 * so every drawing/measurement routine downstream can just trust the
 * value it receives instead of re-deriving the mirror each time.
 */
export function mirrorX(normalizedX) {
  return 1 - normalizedX;
}

/**
 * The <video> is displayed with object-fit: cover, which crops either the
 * horizontal or vertical extent of the raw camera frame to fill the
 * viewport. Landmarks come back in the *uncropped* frame's normalized
 * space, so before treating them as canvas-pixel coordinates they must be
 * re-mapped through the same crop the browser applied visually. This is
 * the one place that conversion happens — every drawing routine in
 * debug.js calls this instead of re-deriving it.
 */
export function landmarkToCanvas(landmark, videoW, videoH, canvasW, canvasH, mirror = true) {
  const nx = mirror ? mirrorX(landmark.x) : landmark.x;
  const ny = landmark.y;

  const videoAspect = videoW / videoH;
  const canvasAspect = canvasW / canvasH;

  let sx = nx;
  let sy = ny;

  if (videoAspect > canvasAspect) {
    // Video relatively wider than canvas -> horizontal cropping.
    const visibleWidthFraction = canvasAspect / videoAspect;
    const marginX = (1 - visibleWidthFraction) / 2;
    sx = (nx - marginX) / visibleWidthFraction;
  } else if (videoAspect < canvasAspect) {
    // Video relatively taller than canvas -> vertical cropping.
    const visibleHeightFraction = videoAspect / canvasAspect;
    const marginY = (1 - visibleHeightFraction) / 2;
    sy = (ny - marginY) / visibleHeightFraction;
  }

  return { x: sx * canvasW, y: sy * canvasH };
}

export function formatNumber(value, decimals = 3) {
  return Number.isFinite(value) ? value.toFixed(decimals) : '—';
}

/**
 * Rolling average over a fixed-size ring buffer, reused every sample
 * instead of allocating a new array each frame.
 */
export class RollingAverage {
  constructor(sampleSize = 30, initialValue = 0) {
    this._samples = new Array(sampleSize).fill(initialValue);
    this._index = 0;
    this._size = sampleSize;
  }

  push(value) {
    this._samples[this._index] = value;
    this._index = (this._index + 1) % this._size;
  }

  get average() {
    let sum = 0;
    for (let i = 0; i < this._size; i++) sum += this._samples[i];
    return sum / this._size;
  }
}
