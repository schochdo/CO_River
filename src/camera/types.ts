/**
 * Types & Constants for 3D Keyboard Flight Camera Controller
 * Compatible with MapLibre GL JS and Mapbox GL JS.
 */

// Consuming applications can import Map from 'maplibre-gl' or 'mapbox-gl'.
// Defining the structural interface here guarantees zero missing type dependency errors.
export interface MapInstance {
  keyboard: {
    disable: () => void;
    enable?: () => void;
  };
  getPitch: () => number;
  setPitch: (pitch: number) => any;
  getBearing: () => number;
  setBearing: (bearing: number) => any;
  getZoom: () => number;
  setZoom: (zoom: number) => any;
  getCenter: () => { lng: number; lat: number };
  jumpTo: (options: {
    center?: [number, number] | { lng: number; lat: number };
    zoom?: number;
    pitch?: number;
    bearing?: number;
  }) => any;
  getCanvasContainer: () => HTMLElement;
  queryTerrainElevation?: (lngLat: [number, number] | { lng: number; lat: number }) => number | null | undefined;
  getTerrain?: () => any;
  setTerrain?: (terrain: any) => any;
  setCenterClampedToGround?: (clamped: boolean) => any;
  [key: string]: any;
}

export type CameraMode = 'idle' | 'flight' | 'flyto';

export const NAVIGATION_KEY_SET = new Set<string>([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'KeyQ', 'KeyE', 'PageUp', 'PageDown',
  'KeyZ', 'KeyX', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export const CAMERA_CONSTANTS = {
  MIN_CAMERA_CLEARANCE_METERS: 25.0,
  MIN_ZOOM_CLEARANCE_METERS: 15.0,
  LOOKAHEAD_SECONDS: 0.6,
  MIN_PITCH_DEG: 0,
  MAX_PITCH_DEG: 85,
  BASE_SPEED_MPS: 720, // Cruising speed at zoom 14
  PITCH_SPEED_DEG_PER_SEC: 36,
  BEARING_SPEED_DEG_PER_SEC: 42,
  ZOOM_SPEED_PER_SEC: 1.5,
  ALTITUDE_SPEED_PER_SEC: 1.2,
  METERS_PER_DEG_LAT: 111320,
} as const;

export interface UseKeyboardFlightOptions {
  map: MapInstance | null;
  isLoaded: boolean;
  onAltitudeChange?: (altitudeMeters: number) => void;
  onBearingChange?: (bearing: number) => void;
  onPitchChange?: (pitch: number) => void;
  onModeChange?: (mode: CameraMode) => void;
}
