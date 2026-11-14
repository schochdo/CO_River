import { CAMERA_CONSTANTS, MapInstance } from './types';

/**
 * Normalizes any degree bearing into standard [0, 360) clockwise orientation.
 */
export function normalizeBearing(bearing: number): number {
  const mod = bearing % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Dynamically clamps pitch angle based on current camera zoom.
 * Low zooms (orbital/continental) are constrained near nadir to prevent pitching
 * into black space, while higher zooms allow steep cinematic horizon tilt up to 82°.
 */
export function clampPitch(pitch: number, zoom?: number): number {
  const maxPitch = zoom !== undefined
    ? Math.max(0, Math.min(82, (zoom - 3.5) * 18))
    : CAMERA_CONSTANTS.MAX_PITCH_DEG;
  return Math.max(CAMERA_CONSTANTS.MIN_PITCH_DEG, Math.min(maxPitch, pitch));
}

/**
 * Detects whether the user is typing into a form input or content editable element,
 * in which case keyboard flight events should be ignored.
 */
export function isInputElementFocused(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (el as HTMLElement).isContentEditable
  );
}

/**
 * Computes forward and lateral strafe displacement over the globe, factoring in
 * camera heading and latitude-dependent longitudinal convergence.
 */
export function computeGeographicDisplacement(
  center: { lng: number; lat: number },
  bearingDeg: number,
  moveForward: number,
  moveStrafe: number,
  speedMps: number,
  dt: number
): { deltaLat: number; deltaLng: number; nextLat: number; nextLng: number } {
  const len = Math.hypot(moveForward, moveStrafe);
  if (len === 0) {
    return { deltaLat: 0, deltaLng: 0, nextLat: center.lat, nextLng: center.lng };
  }
  const normForward = moveForward / len;
  const normStrafe = moveStrafe / len;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const distMeters = speedMps * dt;
  const sinB = Math.sin(bearingRad);
  const cosB = Math.cos(bearingRad);
  const deltaEastMeters = (sinB * normForward + cosB * normStrafe) * distMeters;
  const deltaNorthMeters = (cosB * normForward - sinB * normStrafe) * distMeters;
  const latRad = (center.lat * Math.PI) / 180;
  const metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
  const metersPerDegLng = metersPerDegLat * Math.max(0.1, Math.cos(latRad));
  const deltaLat = deltaNorthMeters / metersPerDegLat;
  const deltaLng = deltaEastMeters / metersPerDegLng;
  const nextLat = Math.max(-85, Math.min(85, center.lat + deltaLat));
  const nextLng = center.lng + deltaLng;
  return { deltaLat, deltaLng, nextLat, nextLng };
}

/**
 * Queries terrain elevation directly under the camera and ahead along the flight path,
 * returning the maximum ground height for lookahead obstacle avoidance.
 */
export function sampleTerrainObstacle(
  map: MapInstance,
  camLng: number,
  camLat: number,
  lookaheadLng: number,
  lookaheadLat: number
): number {
  const groundCam = map.queryTerrainElevation ? map.queryTerrainElevation([camLng, camLat]) : 0;
  const groundAheadCam = map.queryTerrainElevation ? map.queryTerrainElevation([lookaheadLng, lookaheadLat]) : 0;
  let maxGround = -Infinity;
  if (groundCam !== null && groundCam !== undefined && isFinite(groundCam)) {
    maxGround = Math.max(maxGround, groundCam);
  }
  if (groundAheadCam !== null && groundAheadCam !== undefined && isFinite(groundAheadCam)) {
    maxGround = Math.max(maxGround, groundAheadCam);
  }
  return maxGround;
}
