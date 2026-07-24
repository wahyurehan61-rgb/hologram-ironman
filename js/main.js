/**
 * main.js
 * -----------------------------------------------------------------------
 * Application entry point. Contains no tracking/gesture/drawing logic of
 * its own — only wiring: read a frame, run detection, stabilize the
 * gesture, hand the results to the debug layer, repeat. Kept intentionally
 * short so it never grows into the "thousand-line main.js" the brief
 * explicitly warned against.
 * -----------------------------------------------------------------------
 */

import { CONFIG } from './config.js';
import { startCamera, getStreamResolution, HologramCamera } from './camera.js';
import { HandTracking } from './handTracking.js';
import { GestureStabilizer } from './gesture.js';
import { DebugCanvas, DebugPanel } from './debug.js';
import { centroid, LM, RollingAverage, landmarkToCanvas } from './utils.js';

// Three.js Imports
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { HologramRenderer } from './renderer.js';
import { HologramScene } from './scene.js';
import { HologramLighting } from './lighting.js';
import { CoordinateMapper } from './coordinateMapper.js';
import { ObjectManager } from './ObjectManager.js';
import { CubeAnimator } from './CubeAnimator.js';
import { AnimationManager } from './AnimationManager.js';
import { ColorController } from './ColorController.js';
import { QualityManager } from './QualityManager.js';

// ---------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------
const videoEl = document.getElementById('webcam');
const canvasEl = document.getElementById('overlay-canvas');
const hologramCanvasEl = document.getElementById('hologram-canvas');
const panelEl = document.getElementById('debug-panel');
const coordEl = document.getElementById('palm-coord');
const statusEl = document.getElementById('status-message');

// ---------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------
const handTracking = new HandTracking();
const gestureStabilizer = new GestureStabilizer();
const debugCanvas = new DebugCanvas(canvasEl);
const debugPanel = new DebugPanel(panelEl, coordEl);

const fpsAverage = new RollingAverage(CONFIG.PERFORMANCE.FPS_SAMPLE_SIZE, 16.6);
const frameTimeAverage = new RollingAverage(CONFIG.PERFORMANCE.FPS_SAMPLE_SIZE, 16.6);

let streamResolution = { width: 0, height: 0 };
let lastFrameTime = performance.now();
let lastLatencyMs = 0;

// Three.js Hologram Pipeline Modules
let hologramRenderer;
let hologramScene;
let hologramCamera;
let hologramLighting;
let coordinateMapper;
let objectManager;
let cubeAnimator;
let animationManager;
let colorController;
let qualityManager;

// 3D Debug Helpers
let normalHelper = null;
let axesHelper = null;

// ---------------------------------------------------------------------
// Boot sequence
// ---------------------------------------------------------------------
async function boot() {
  try {
    setStatus('Meminta izin kamera…');
    const stream = await startCamera(videoEl);
    streamResolution = getStreamResolution(stream);

    setStatus('Membuat scene 3D…');
    initHologramSystem();

    setStatus('Memuat model hand tracking…');
    await handTracking.init();

    setStatus('');
    applyDebugVisibility();
    handleResize();
    requestAnimationFrame(tick);
  } catch (err) {
    console.error(err);
    setStatus('Gagal memulai: ' + (err && err.message ? err.message : String(err)));
  }
}

function initHologramSystem() {
  colorController = new ColorController(CONFIG.HOLOGRAM.THEME);
  qualityManager = new QualityManager(CONFIG.HOLOGRAM.BLOOM_ENABLED);

  hologramRenderer = new HologramRenderer(hologramCanvasEl);
  hologramScene = new HologramScene();
  hologramCamera = new HologramCamera();
  hologramLighting = new HologramLighting(hologramScene.getScene());
  coordinateMapper = new CoordinateMapper(hologramCamera.getCamera(), hologramRenderer.canvas);
  
  objectManager = new ObjectManager(hologramScene.getScene(), colorController);
  cubeAnimator = new CubeAnimator(objectManager.hologramCube);
  animationManager = new AnimationManager(objectManager);

  // Initialize visual debug helpers if debug is enabled
  if (CONFIG.DEBUG) {
    normalHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      0.08,
      0xff3333
    );
    hologramScene.add(normalHelper);

    axesHelper = new THREE.AxesHelper(0.04);
    objectManager.palmAnchor.add(axesHelper);
  }
}

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.display = text ? 'flex' : 'none';
}

function applyDebugVisibility() {
  debugPanel.setVisible(CONFIG.DEBUG);
  canvasEl.style.display = CONFIG.DEBUG ? 'block' : 'none';
  if (normalHelper) normalHelper.visible = CONFIG.DEBUG;
  if (axesHelper) axesHelper.visible = CONFIG.DEBUG;
}

// ---------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------
function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  debugCanvas.resize(w, h);
  hologramRenderer.resize(w, h);
  hologramCamera.resize(w, h);
}
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// ---------------------------------------------------------------------
// Frame loop (requestAnimationFrame only — never setInterval)
// ---------------------------------------------------------------------
function tick(now) {
  const frameTimeMs = now - lastFrameTime;
  lastFrameTime = now;
  frameTimeAverage.push(frameTimeMs);
  fpsAverage.push(frameTimeMs > 0 ? 1000 / frameTimeMs : 60);

  if (videoEl.readyState >= 2) {
    const detection = handTracking.detect(videoEl, now);
    if (detection) {
      lastLatencyMs = detection.latencyMs;
      processFrame(detection.hands, now, frameTimeMs);
    } else {
      // If no new hand frame, still update animations and render to keep animations smooth
      processFrame([], now, frameTimeMs);
    }
  } else {
    processFrame([], now, frameTimeMs);
  }

  requestAnimationFrame(tick);
}

function processFrame(hands, now, frameTimeMs) {
  const rightHand = hands.find((h) => h.handedness === 'Right') || null;
  const leftHand = hands.find((h) => h.handedness === 'Left') || null;

  // Milestone 2 uses right hand for the hologram cube
  const primaryHand = rightHand;
  const gestureStatus = gestureStabilizer.update(
    primaryHand ? primaryHand.landmarks : null,
    now
  );

  const videoW = videoEl.videoWidth || window.innerWidth;
  const videoH = videoEl.videoHeight || window.innerHeight;

  let palmWidthPx = 0;

  // 1. Update 3D Palm Tracking & Coordinate Mapper
  if (primaryHand) {
    // Calculate depth distance from camera using index & pinky MCP width
    const palmDistance = coordinateMapper.calculatePalmDistance(primaryHand.landmarks, videoW, videoH);

    // Map necessary joints to world space
    const palmCentroid = centroid(
      [LM.WRIST, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.RING_MCP, LM.PINKY_MCP].map(
        (i) => primaryHand.landmarks[i]
      )
    );
    const rawPalmCenterWorld = coordinateMapper.mapToWorld(palmCentroid, palmDistance, videoW, videoH);

    const posW = coordinateMapper.mapToWorld(primaryHand.landmarks[LM.WRIST], palmDistance, videoW, videoH);
    const posI = coordinateMapper.mapToWorld(primaryHand.landmarks[LM.INDEX_MCP], palmDistance, videoW, videoH);
    const posP = coordinateMapper.mapToWorld(primaryHand.landmarks[LM.PINKY_MCP], palmDistance, videoW, videoH);

    const deltaTime = frameTimeMs / 1000;
    objectManager.palmAnchor.updateTracking(rawPalmCenterWorld, posW, posI, posP, deltaTime);

    // Update debug helpers
    if (CONFIG.DEBUG && normalHelper) {
      normalHelper.position.copy(objectManager.palmAnchor.position);
      normalHelper.setDirection(objectManager.palmAnchor.normal);
      normalHelper.visible = true;
    }

    // Measure palm width in screen pixels for adaptive scale
    const canvasW = hologramRenderer.canvas.width;
    const canvasH = hologramRenderer.canvas.height;
    const indexMcpCanvas = landmarkToCanvas(primaryHand.landmarks[LM.INDEX_MCP], videoW, videoH, canvasW, canvasH, true);
    const pinkyMcpCanvas = landmarkToCanvas(primaryHand.landmarks[LM.PINKY_MCP], videoW, videoH, canvasW, canvasH, true);
    palmWidthPx = Math.sqrt(
      Math.pow(indexMcpCanvas.x - pinkyMcpCanvas.x, 2) +
      Math.pow(indexMcpCanvas.y - pinkyMcpCanvas.y, 2)
    );
  } else {
    objectManager.reset();
    if (normalHelper) normalHelper.visible = false;
  }

  // Adaptive Quality: Update Quality Manager based on rolling average FPS
  const bloomActive = qualityManager.update(fpsAverage.average);
  hologramRenderer.setBloomActive(bloomActive);

  // 2. Advance state machine transition phases
  const progress = animationManager.update(gestureStatus, !!primaryHand, frameTimeMs);

  // Set visibility toggles to save WebGL draw overhead
  objectManager.energyField.visible = progress.energyProgress > 0;
  objectManager.particleAssembly.visible = progress.particleProgress > 0;
  objectManager.hologramCube.visible = progress.cubeProgress > 0;
  objectManager.earthGroup.visible = progress.cubeProgress > 0;

  // 3. Drive 3D Cube animations
  if (progress.cubeProgress > 0) {
    const deltaTime = frameTimeMs / 1000;
    cubeAnimator.animate(
      now / 1000,
      deltaTime,
      progress.cubeProgress,
      palmWidthPx,
      objectManager.palmAnchor.velocity,
      bloomActive,
      progress.cubeOpacityMultiplier
    );

    // Earth Projection (Project 3.1): EarthGroup always sits exactly at the
    // Cube's center (offset 0,0,0), so we mirror the Cube's computed position.
    objectManager.earthGroup.position.copy(objectManager.hologramCube.position);
  }

  // 4. Render 3D Scene
  hologramRenderer.render(hologramScene.getScene(), hologramCamera.getCamera());

  // 5. Draw 2D overlays and update DOM Side Panels
  const rawPalmCenterImage = primaryHand
    ? centroid(
        [LM.WRIST, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.RING_MCP, LM.PINKY_MCP].map(
          (i) => primaryHand.landmarks[i]
        )
      )
    : null;

  if (CONFIG.DEBUG) {
    // 2D Skeleton Canvas overlay
    debugCanvas.draw({
      hands,
      videoW,
      videoH,
      gestureStatus,
      perf: {
        fps: fpsAverage.average,
        latencyMs: lastLatencyMs,
        frameTimeMs: frameTimeAverage.average,
      },
    });

    // Side panel readouts
    const renderInfo = hologramRenderer.getInfo();
    const drawCalls = renderInfo.render.calls;
    const triangles = renderInfo.render.triangles;

    debugPanel.update({
      resolution: streamResolution,
      fps: fpsAverage.average,
      handCount: hands.length,
      rightHandDetected: !!rightHand,
      leftHandDetected: !!leftHand,
      gestureStatus,
      primaryPalm: rawPalmCenterImage,
      hologram: {
        mode: objectManager.palmAnchor.mode,
        worldPos: rawPalmCenterImage ? objectManager.palmAnchor.position : null,
        normal: rawPalmCenterImage ? objectManager.palmAnchor.normal : null,
        anchorPos: rawPalmCenterImage ? objectManager.palmAnchor.position : null,
        cubePivot: rawPalmCenterImage ? objectManager.hologramCube.position : null,
        cubeRot: objectManager.hologramCube.cubeWireframe.rotation,
        cubeScale: objectManager.hologramCube.scale.x * objectManager.hologramCube.cubeWireframe.scale.x,
        cubeOpacity: objectManager.hologramCube.wireframeMaterial.uniforms?.opacity.value ?? 0,
        drawCalls,
        triangles,
        statusLabel: animationManager.getStatusText(!!primaryHand, objectManager.palmAnchor.mode),
        
        // Visual Polish state indicators
        bloomActive,
        glowStrength: CONFIG.HOLOGRAM.BLOOM_STRENGTH,
        glowRadius: CONFIG.HOLOGRAM.BLOOM_RADIUS,
        materialOpacity: objectManager.hologramCube.wireframeMaterial.uniforms?.opacity.value ?? 0,
        cornerBrightness: objectManager.hologramCube.glowOpacity,
        flickerStrength: cubeAnimator.flickerController.update(0),
        qualityLevel: qualityManager.getQualityLevel(),
        themeName: colorController.getThemeName(),
      },
    });
  }
}


// ---------------------------------------------------------------------
// Kick off
// ---------------------------------------------------------------------
boot();
