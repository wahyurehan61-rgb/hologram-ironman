/**
 * debug.js
 * -----------------------------------------------------------------------
 * Everything visual/diagnostic lives here: the Canvas2D overlay
 * (landmarks, skeleton, palm center, bounding box, on-canvas text) and
 * the DOM debug panel (camera info, FPS, per-hand status). Entirely
 * inert when CONFIG.DEBUG is false — main.js skips calling this module
 * at all in that case, and hand tracking keeps running underneath.
 * -----------------------------------------------------------------------
 */

import { CONFIG } from './config.js';
import {
  HAND_CONNECTIONS,
  LM,
  centroid,
  landmarkToCanvas,
  formatNumber,
} from './utils.js';

/** Canvas2D overlay: landmarks, skeleton, palm center, bbox, on-canvas labels. */
export class DebugCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * @param {object} params
   * @param {Array} params.hands - [{ landmarks, handedness, score }]
   * @param {number} params.videoW / videoH - native camera resolution
   * @param {string} params.gestureStatus - 'OPEN_PALM' | 'UNKNOWN'
   * @param {{fps:number, latencyMs:number, frameTimeMs:number}} params.perf
   */
  draw({ hands = [], videoW, videoH, gestureStatus = 'UNKNOWN', perf }) {
    this.clear();
    const { width: canvasW, height: canvasH } = this.canvas;

    hands.forEach((hand) => {
      const color =
        hand.handedness === 'Right'
          ? CONFIG.COLORS.RIGHT_HAND
          : CONFIG.COLORS.LEFT_HAND;

      const points = hand.landmarks.map((lm) =>
        landmarkToCanvas(lm, videoW, videoH, canvasW, canvasH)
      );

      this._drawSkeleton(points, color);
      this._drawLandmarks(points, color);
      this._drawHandednessLabel(points[LM.WRIST], hand.handedness, color);
      this._drawBoundingBox(points, color);
      this._drawPalmCenter(hand.landmarks, points);
    });

    this._drawGestureStatus(gestureStatus);
    if (perf) this._drawPerfCounters(perf);
  }

  _drawSkeleton(points, color) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = CONFIG.DRAW.SKELETON_WIDTH;
    ctx.beginPath();
    HAND_CONNECTIONS.forEach(([a, b]) => {
      ctx.moveTo(points[a].x, points[a].y);
      ctx.lineTo(points[b].x, points[b].y);
    });
    ctx.stroke();
  }

  _drawLandmarks(points, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONFIG.DRAW.LANDMARK_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _drawHandednessLabel(wristPoint, handedness, color) {
    const { ctx } = this;
    const label = handedness === 'Right' ? 'RIGHT HAND' : 'LEFT HAND';
    ctx.font = 'bold 13px monospace';
    const metrics = ctx.measureText(label);
    const paddingX = 6;
    const paddingY = 4;
    const boxW = metrics.width + paddingX * 2;
    const boxH = 18;
    const x = wristPoint.x - boxW / 2;
    const y = wristPoint.y + 14;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.fillStyle = color;
    ctx.fillText(label, x + paddingX, y + boxH - paddingY - 2);
  }

  _drawBoundingBox(points, color) {
    const { ctx } = this;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    ctx.globalAlpha = CONFIG.DRAW.BBOX_OPACITY;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.globalAlpha = 1;
  }

  /**
   * Palm center is computed in normalized landmark space (wrist + four
   * MCP knuckles), then converted through the same cover-aware mapping
   * used for every other point so it lines up with the drawn skeleton.
   */
  _drawPalmCenter(landmarks, canvasPoints) {
    const { ctx } = this;
    const palmIndices = [LM.WRIST, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.RING_MCP, LM.PINKY_MCP];
    const palmPoints = palmIndices.map((i) => canvasPoints[i]);
    const center = centroid(palmPoints);

    ctx.fillStyle = CONFIG.COLORS.PALM_CENTER;
    ctx.beginPath();
    ctx.arc(center.x, center.y, CONFIG.DRAW.PALM_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
    ctx.fillText('Palm Center', center.x + 12, center.y + 4);
  }

  _drawGestureStatus(status) {
    const { ctx, canvas } = this;
    const label = `GESTURE: ${status === 'OPEN_PALM' ? 'OPEN PALM' : 'UNKNOWN'}`;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = status === 'OPEN_PALM' ? CONFIG.COLORS.RIGHT_HAND : CONFIG.COLORS.TEXT_PRIMARY;
    const metrics = ctx.measureText(label);
    ctx.fillText(label, canvas.width - metrics.width - 16, 28);
  }

  _drawPerfCounters(perf) {
    const { ctx } = this;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
    ctx.fillText(`FPS: ${Math.round(perf.fps)}`, 16, 24);
    ctx.fillText(`Latency: ${formatNumber(perf.latencyMs, 1)} ms`, 16, 44);
    ctx.fillText(`Frame Time: ${formatNumber(perf.frameTimeMs, 1)} ms`, 16, 64);
  }
}

/**
 * DOM-based side panel (semi-transparent) + bottom-left palm coordinate
 * readout. Kept separate from DebugCanvas because it's cheaper to update
 * text nodes than to redraw text on canvas every frame, and it composes
 * more naturally with CSS.
 */
export class DebugPanel {
  constructor(panelEl, coordEl) {
    this.panelEl = panelEl;
    this.coordEl = coordEl;
  }

  setVisible(visible) {
    const display = visible ? 'block' : 'none';
    if (this.panelEl) this.panelEl.style.display = display;
    if (this.coordEl) this.coordEl.style.display = display;
  }

  /**
   * @param {object} params
   */
  update({
    resolution,
    fps,
    handCount,
    rightHandDetected,
    leftHandDetected,
    gestureStatus,
    primaryPalm,
    hologram = null,
  }) {
    if (this.panelEl) {
      let hologramRows = '';
      if (hologram) {
        hologramRows = `
          <div class="debug-row" style="color: #4de8ff; border-top: 1px solid rgba(77, 232, 255, 0.2); margin-top: 5px; padding-top: 5px; font-weight: bold;"><span>3D HOLOGRAM STATE</span></div>
          <div class="debug-row"><span>Mode</span><b style="color: ${hologram.mode === 'LOCK' ? '#ffaa00' : '#4dff6a'}">${hologram.mode}</b></div>
          <div class="debug-row"><span>World X/Y/Z</span><b>${formatNumber(hologram.worldPos?.x)}, ${formatNumber(hologram.worldPos?.y)}, ${formatNumber(hologram.worldPos?.z)}</b></div>
          <div class="debug-row"><span>Normal X/Y/Z</span><b>${formatNumber(hologram.normal?.x)}, ${formatNumber(hologram.normal?.y)}, ${formatNumber(hologram.normal?.z)}</b></div>
          <div class="debug-row"><span>Anchor X/Y/Z</span><b>${formatNumber(hologram.anchorPos?.x)}, ${formatNumber(hologram.anchorPos?.y)}, ${formatNumber(hologram.anchorPos?.z)}</b></div>
          <div class="debug-row"><span>Cube Pivot X/Y/Z</span><b>${formatNumber(hologram.cubePivot?.x)}, ${formatNumber(hologram.cubePivot?.y)}, ${formatNumber(hologram.cubePivot?.z)}</b></div>
          <div class="debug-row"><span>Cube Rot X/Y/Z</span><b>${formatNumber(hologram.cubeRot?.x)}, ${formatNumber(hologram.cubeRot?.y)}, ${formatNumber(hologram.cubeRot?.z)}</b></div>
          <div class="debug-row"><span>Cube Scale</span><b>${formatNumber(hologram.cubeScale, 2)}</b></div>
          <div class="debug-row"><span>Cube Opacity</span><b>${Math.round(hologram.cubeOpacity * 100)}%</b></div>
          <div class="debug-row"><span>Draw Calls</span><b>${hologram.drawCalls}</b></div>
          <div class="debug-row"><span>Triangles</span><b>${hologram.triangles}</b></div>
          <div class="debug-row" style="color: #74F9FF; border-top: 1px dashed rgba(77, 232, 255, 0.2); margin-top: 3px; padding-top: 3px; font-weight: bold;"><span>VISUAL POLISH</span></div>
          <div class="debug-row"><span>Bloom</span><b style="color: ${hologram.bloomActive ? '#4dff6a' : '#ff5252'}">${hologram.bloomActive ? 'ON' : 'OFF'}</b></div>
          <div class="debug-row"><span>Glow Strength</span><b>${formatNumber(hologram.glowStrength, 2)}</b></div>
          <div class="debug-row"><span>Glow Radius</span><b>${formatNumber(hologram.glowRadius, 2)}</b></div>
          <div class="debug-row"><span>Material Opacity</span><b>${formatNumber(hologram.materialOpacity, 2)}</b></div>
          <div class="debug-row"><span>Corner Brightness</span><b>${formatNumber(hologram.cornerBrightness, 2)}</b></div>
          <div class="debug-row"><span>Flicker Strength</span><b>${formatNumber(hologram.flickerStrength, 3)}</b></div>
          <div class="debug-row"><span>Quality Level</span><b>${hologram.qualityLevel}</b></div>
          <div class="debug-row"><span>Theme</span><b>${hologram.themeName}</b></div>
        `;
      }

      this.panelEl.innerHTML = `
        <div class="debug-row"><span>Camera</span><b>${resolution.width}×${resolution.height}</b></div>
        <div class="debug-row"><span>FPS</span><b>${Math.round(fps)}</b></div>
        <div class="debug-row"><span>Detected Hands</span><b>${handCount}</b></div>
        <div class="debug-row"><span>Right Hand</span><b>${rightHandDetected ? 'YES' : 'NO'}</b></div>
        <div class="debug-row"><span>Left Hand</span><b>${leftHandDetected ? 'YES' : 'NO'}</b></div>
        <div class="debug-row"><span>Gesture</span><b>${gestureStatus === 'OPEN_PALM' ? 'OPEN PALM' : 'UNKNOWN'}</b></div>
        <div class="debug-row" style="color: #ff8888;"><span>Palm Image coordinates</span></div>
        <div class="debug-row"><span>Palm X</span><b>${formatNumber(primaryPalm?.x)}</b></div>
        <div class="debug-row"><span>Palm Y</span><b>${formatNumber(primaryPalm?.y)}</b></div>
        <div class="debug-row"><span>Palm Z</span><b>${formatNumber(primaryPalm?.z)}</b></div>
        ${hologramRows}
      `;
    }

    if (this.coordEl) {
      const stateLabel = hologram ? hologram.statusLabel : 'WAITING';
      this.coordEl.innerHTML = `
        <div style="font-weight: bold; font-size: 14px; color: #4de8ff; border-bottom: 1px solid rgba(77, 232, 255, 0.2); margin-bottom: 6px; padding-bottom: 2px;">STATUS: ${stateLabel}</div>
        <div>X : ${formatNumber(hologram?.worldPos?.x ?? primaryPalm?.x)}</div>
        <div>Y : ${formatNumber(hologram?.worldPos?.y ?? primaryPalm?.y)}</div>
        <div>Z : ${formatNumber(hologram?.worldPos?.z ?? primaryPalm?.z)}</div>
      `;
    }
  }
}
