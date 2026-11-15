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
 * Universal camera state extractor compatible with MapLibre GL JS v2–v4 & Mapbox GL JS.
 * Extracts physical world altitude in meters above sea level and ground camera coordinates.
 */
export function getCameraInfo(map: MapInstance): {
  tr: any;
  camLngLat: { lng: number; lat: number };
  altitude: number;
  groundElevation: number;
  pitch: number;
  bearing: number;
  zoom: number;
  center: { lng: number; lat: number };
} | null {
  if (!map) return null;
  const tr = (map as any)._camera?.transform || (map as any).transform;
  if (!tr) return null;

  let camLngLat: { lng: number; lat: number } | null = null;
  let altitude: number | null = null;

  if (tr.getCameraPosition) {
    try {
      const pos = tr.getCameraPosition();
      if (pos) {
        camLngLat = pos.lngLat;
        altitude = pos.altitude;
      }
    } catch (_) {}
  } else if (tr.getCameraLngLat && tr.getCameraAltitude) {
    try {
      camLngLat = tr.getCameraLngLat();
      altitude = tr.getCameraAltitude();
    } catch (_) {}
  }

  const pitch = map.getPitch();
  const bearing = map.getBearing();
  const zoom = map.getZoom();
  const center = map.getCenter();
  let groundElevation = 0;

  if (tr._elevation !== undefined && tr._elevation !== null && isFinite(tr._elevation)) {
    groundElevation = tr._elevation;
  } else if (map.queryTerrainElevation) {
    groundElevation = map.queryTerrainElevation(center) || 0;
  }

  if (altitude === null || altitude === undefined || !isFinite(altitude)) {
    const pitchRad = (pitch * Math.PI) / 180;
    const distPx = tr.cameraToCenterDistance ||
      (tr.height ? tr.height / (2 * Math.tan((tr._fov || 0.64) / 2)) : 600);
    const ppm = tr._pixelPerMeter ||
      (Math.pow(2, zoom) * 256 / (2 * Math.PI * 6378137 * Math.cos((center.lat * Math.PI) / 180)));
    altitude = groundElevation + (Math.cos(pitchRad) * distPx) / ppm;
  }

  if (!camLngLat) {
    const pitchRad2 = (pitch * Math.PI) / 180;
    const bearingRad2 = (bearing * Math.PI) / 180;
    const deltaZ = Math.max(10, altitude - groundElevation);
    const horizDistMeters = deltaZ * Math.tan(pitchRad2);
    const metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
    const metersPerDegLng = metersPerDegLat * Math.max(0.1, Math.cos((center.lat * Math.PI) / 180));
    camLngLat = {
      lng: center.lng - (horizDistMeters * Math.sin(bearingRad2)) / metersPerDegLng,
      lat: center.lat - (horizDistMeters * Math.cos(bearingRad2)) / metersPerDegLat,
    };
  }

  return {
    tr,
    camLngLat,
    altitude,
    groundElevation,
    pitch,
    bearing,
    zoom,
    center,
  };
}

/**
 * Mathematically stabilizes camera altitude against terrain fluctuations.
 * Adjusts zoom dynamically to maintain target altitude above sea level:
 * deltaZ_cur = altitude - groundElev; deltaZ_target = targetAltitude - groundElev
 * zoomOffset = log2(deltaZ_cur / deltaZ_target)
 */
export function adjustZoomForTargetAltitude(map: MapInstance, targetAltitude: number): void {
  if (!map || targetAltitude === null || targetAltitude === undefined || !isFinite(targetAltitude)) return;
  const info = getCameraInfo(map);
  if (!info) return;

  const curAlt = info.altitude;
  const curGround = info.groundElevation;
  const deltaZ_cur = Math.max(10, curAlt - curGround);
  const deltaZ_target = Math.max(10, targetAltitude - curGround);

  if (Math.abs(deltaZ_cur - deltaZ_target) > 0.4) {
    const zoomOffset = Math.log2(deltaZ_cur / deltaZ_target);
    const nextZoom = Math.max(1.0, Math.min(22.0, map.getZoom() + zoomOffset));
    map.setZoom(nextZoom);
  }
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
