/**
 * config.js
 * -----------------------------------------------------------------------
 * Single source of truth for every tunable value in the project. No
 * other module should contain a hardcoded number/color — import CONFIG.
 * -----------------------------------------------------------------------
 */

export const CONFIG = {
  // Master debug switch. When false, all drawing/debug UI disappears but
  // hand tracking itself keeps running underneath.
  DEBUG: true,

  CAMERA: {
    FACING_MODE: 'user', // front camera on mobile, default cam on desktop
    IDEAL_WIDTH: 1280,
    IDEAL_HEIGHT: 720,
  },

  MEDIAPIPE: {
    WASM_BASE_PATH:
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    MODEL_ASSET_PATH:
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    RUNNING_MODE: 'VIDEO',
    NUM_HANDS: 2,
    MIN_HAND_DETECTION_CONFIDENCE: 0.7,
    MIN_TRACKING_CONFIDENCE: 0.7,
    MIN_HAND_PRESENCE_CONFIDENCE: 0.7,
  },

  GESTURE: {
    // How much farther a fingertip must sit from the wrist than its own
    // MCP knuckle to count as "extended" (non-thumb fingers).
    FINGER_EXTENSION_RATIO: 1.15,
    // Thumb uses a spread-from-palm ratio instead (see gesture.js).
    THUMB_SPREAD_RATIO: 0.65,
    // Consecutive frames a gesture must hold before it's accepted.
    BUFFER_SIZE: 5,
    // After a gesture is confirmed, ignore state flips for this long so
    // the on-screen status doesn't flicker.
    COOLDOWN_MS: 300,
  },

  DRAW: {
    LANDMARK_RADIUS: 5,
    SKELETON_WIDTH: 2,
    BBOX_OPACITY: 0.4,
    PALM_RADIUS: 8,
  },

  COLORS: {
    // Per-hand identity colors (see debug.js) — lets you visually confirm
    // MediaPipe keeps left/right identity stable when hands cross.
    RIGHT_HAND: '#4dff6a', // green
    LEFT_HAND: '#4d9dff', // blue
    SKELETON_DEFAULT: '#4de8ff', // cyan, used as fallback only
    PALM_CENTER: '#ff4d4d', // red
    BOUNDING_BOX: '#4dff6a',
    TEXT_PRIMARY: '#ffffff',
    TEXT_ACCENT: '#4de8ff',
    PANEL_BG: 'rgba(0, 0, 0, 0.55)',
  },

  PERFORMANCE: {
    FPS_SAMPLE_SIZE: 30,
  },

  HOLOGRAM: {
    // Colors & Theme System
    THEME: 'cyan',

    // Bloom Settings
    BLOOM_ENABLED: true,
    BLOOM_STRENGTH: 0.4, // low strength
    BLOOM_RADIUS: 0.25, // small radius
    BLOOM_THRESHOLD: 0.75, // high threshold

    // Geometry
    CUBE_SIZE: 0.10, // 10 cm in world coordinates (1 unit = 1 meter)
    CORNER_SPHERE_RADIUS: 0.003, // 3 mm
    CUBE_LINE_WIDTH: 2,
    CUBE_BASE_OPACITY: 0.55,
    CUBE_MIN_OPACITY: 0.48,
    CUBE_MAX_OPACITY: 0.62,
    CORNER_GLOW_OPACITY: 0.85,

    // Placements
    OFFSET_ABOVE_PALM: 0.08, // 8 cm (0.08 meters) along the palm normal
    BASE_DEPTH_FACTOR: 150.0, // Calibrates palm pixel width to depth distance

    // Motion & Timings
    CUBE_ROTATION_SPEED: 0.2, // radians per second on X and Y axes
    IDLE_FLOAT_AMPLITUDE: 0.003, // 3 mm
    IDLE_FLOAT_FREQUENCY: 1.0, // 1 Hz (1 cycle per second)
    FLICKER_NOISE_STRENGTH: 0.02, // variation in opacity

    // Tracking & Smoothing
    LERP_FOLLOW: 0.18,
    LERP_LOCK: 0.02,
    LOCK_VELOCITY_THRESHOLD: 0.04, // max movement velocity to trigger lock (meters/sec)
    LOCK_DELAY_MS: 300, // time in ms velocity must remain low to lock

    // Adaptive Scale & Motion Blur
    SCALE_MIN: 0.8,
    SCALE_MAX: 1.3,
    REFERENCE_PALM_WIDTH_PX: 150.0, // reference pixel width for scale 1.0
    MOTION_BLUR_OPACITY: 0.35,
    VELOCITY_BLUR_THRESHOLD: 0.4, // velocity at which motion blur triggers (meters/sec)

    // Stage Timings
    GESTURE_TRANSITION_MS: 200, // Validating... -> Projecting... -> Online
    ENERGY_FIELD_MS: 250, // Energy disk active duration
    PARTICLE_ASSEMBLY_MS: 400, // Particles assembling duration
    CUBE_SPAWN_MS: 400, // Cube scaling and fading duration

    // Particle Assembly Details
    PARTICLE_COUNT: 80,
    PARTICLE_SIZE: 0.003, // 3 mm particles
    PARTICLE_SPAWN_RADIUS: 0.20, // 20 cm dispersion radius

    // --- Earth Projection (Project 3.1) ---
    EARTH_RADIUS_RATIO: 0.35, // EarthSphere radius = 35% of CUBE_SIZE
    EARTH_SEGMENTS: 64,
    CLOUD_RADIUS_RATIO: 1.01, // CloudSphere radius = 101% of EarthSphere
    CLOUD_OPACITY: 0.45,

    EARTH_DAY_TEXTURE: './earth/2k_earth_daymap.jpg',
    EARTH_CLOUDS_TEXTURE: './earth/2k_earth_clouds.jpg',

    EARTH_ROTATION_SPEED: 0.08, // radians per second (Y axis)
    CLOUD_ROTATION_SPEED: 0.11, // radians per second (Y axis)

    EARTH_FLOAT_AMPLITUDE: 0.003, // ~3 "pixel"-scale world units, mirrors cube's idle float convention
    EARTH_FLOAT_FREQUENCY: 1.0, // Hz

    EARTH_BREATHE_MIN_SCALE: 1.0,
    EARTH_BREATHE_MAX_SCALE: 1.015,
    EARTH_BREATHE_DURATION_SEC: 5.0,

    EARTH_BRIGHTNESS_MIN: 0.94,
    EARTH_BRIGHTNESS_MAX: 1.0,
    EARTH_BRIGHTNESS_DURATION_SEC: 4.0,

    EARTH_APPEAR_MS: 500, // scale 0->1, opacity 0->100%, ease-out-cubic, plays once
    CUBE_DIM_MS: 700, // cube opacity 100% -> 40% once Earth appears
    CUBE_DIM_MIN_MULTIPLIER: 0.4, // cube settles at ~40% of its normal opacity
  }
};
