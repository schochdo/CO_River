import { useEffect, useRef } from 'react';
import type { UseKeyboardFlightOptions } from './types';
import { NAVIGATION_KEY_SET, CAMERA_CONSTANTS } from './types';
import {
  normalizeBearing,
  clampPitch,
  isInputElementFocused,
  computeGeographicDisplacement,
  sampleTerrainObstacle,
  getCameraInfo,
  adjustZoomForTargetAltitude,
} from './cameraUtils';

/**
 * 60 FPS Game-Engine Style 3D Keyboard Flight & Pan Camera Controller
 * for MapLibre GL JS / Mapbox GL JS.
 *
 * Stabilization:
 * - Fixed Altitude Panning: Camera world elevation remains locked when panning
 *   across ridges, canyons, and peaks, eliminating vertical bouncing.
 * - Automatic Terrain Clearance: Camera elevation only climbs if necessary to clear
 *   physical obstacles ahead, respecting minimum safety clearance floors.
 */
export function useKeyboardFlight({
  map,
  isLoaded,
  onAltitudeChange,
  onBearingChange,
  onPitchChange,
  onModeChange,
}: UseKeyboardFlightOptions): void {
  const callbacksRef = useRef({ onAltitudeChange, onBearingChange, onPitchChange, onModeChange });

  useEffect(() => {
    callbacksRef.current = { onAltitudeChange, onBearingChange, onPitchChange, onModeChange };
  });

  useEffect(() => {
    if (!isLoaded || !map) return;

    // Disable default 2D jerky stepped keyboard controls
    try {
      map.keyboard.disable();
    } catch (_) {}

    const activeKeys = new Set<string>();
    let animationFrameId: number | null = null;
    let lastTimestamp: number | null = null;
    let heldFlightAltitude: number | null = null;
    let mouseDragTargetAltitude: number | null = null;
    let isAdjustingZoom = false;

    const stopFlight = (_immediate = false) => {
      activeKeys.clear();
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastTimestamp = null;
      heldFlightAltitude = null;
      callbacksRef.current.onModeChange?.('idle');
    };

    const flightStep = (timestamp: number) => {
      if (!map) {
        stopFlight(true);
        return;
      }

      if (lastTimestamp === null) lastTimestamp = timestamp;
      // Clamp dt to 0.08s (12 FPS floor) to prevent physics explosion if a frame lags
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.08);
      lastTimestamp = timestamp;

      const hasNavKey = Array.from(activeKeys).some((k) => NAVIGATION_KEY_SET.has(k));
      if (!hasNavKey) {
        stopFlight(false);
        return;
      }

      const info = getCameraInfo(map);
      if (!info) {
        animationFrameId = requestAnimationFrame(flightStep);
        return;
      }

      if (heldFlightAltitude === null) {
        heldFlightAltitude = info.altitude;
      }

      const isShift = activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight');
      let pitchDelta = 0;
      let rotateBearing = 0;
      let zoomDelta = 0;
      let moveForward = 0;
      let moveStrafe = 0;
      let altitudeDelta = 0;

      // WASD: Pitch & Yaw Gaze Orientation
      if (activeKeys.has('KeyW')) pitchDelta += 1;
      if (activeKeys.has('KeyS')) pitchDelta -= 1;
      if (activeKeys.has('KeyA')) rotateBearing -= 1;
      if (activeKeys.has('KeyD')) rotateBearing += 1;

      // Q / E & PageUp / PageDown: Vertical Altitude Elevator
      if (activeKeys.has('KeyE') || activeKeys.has('PageUp')) altitudeDelta += 1;
      if (activeKeys.has('KeyQ') || activeKeys.has('PageDown')) altitudeDelta -= 1;

      // Arrow Keys: Ground Plane Vector Flight
      if (activeKeys.has('ArrowUp')) moveForward += 1;
      if (activeKeys.has('ArrowDown')) moveForward -= 1;
      if (activeKeys.has('ArrowRight')) moveStrafe += 1;
      if (activeKeys.has('ArrowLeft')) moveStrafe -= 1;

      // Zoom (+ / - or Z / X)
      if (activeKeys.has('Equal') || activeKeys.has('NumpadAdd') || activeKeys.has('KeyZ')) zoomDelta += 1;
      if (activeKeys.has('Minus') || activeKeys.has('NumpadSubtract') || activeKeys.has('KeyX')) zoomDelta -= 1;

      // 1. Pitch (W / S) - Maintain fixed camera altitude while tilting gaze
      if (pitchDelta !== 0) {
        const curPitch = map.getPitch();
        const curZoom = map.getZoom();
        const pitchSpeed = (isShift ? 2.5 : 1.0) * CAMERA_CONSTANTS.PITCH_SPEED_DEG_PER_SEC;
        const nextPitch = clampPitch(curPitch + pitchDelta * pitchSpeed * dt, curZoom);
        map.setPitch(nextPitch);
        callbacksRef.current.onPitchChange?.(Math.round(nextPitch));
        adjustZoomForTargetAltitude(map, heldFlightAltitude);
      }

      // 2. Bearing (A / D)
      if (rotateBearing !== 0) {
        const curBearing = map.getBearing();
        const bearingSpeed = (isShift ? 2.5 : 1.0) * CAMERA_CONSTANTS.BEARING_SPEED_DEG_PER_SEC;
        const nextBearing = normalizeBearing(curBearing + rotateBearing * bearingSpeed * dt);
        map.setBearing(nextBearing);
        callbacksRef.current.onBearingChange?.(Math.round(nextBearing));
      }

      // 3. Line-of-Sight Zoom (+ / - or Z / X) with Collision Clearance Floor
      if (zoomDelta !== 0) {
        const curZoom = map.getZoom();
        const zoomSpeed = (isShift ? 2.5 : 1.0) * CAMERA_CONSTANTS.ZOOM_SPEED_PER_SEC;
        let nextZoom = Math.max(1.0, Math.min(20.5, curZoom + zoomDelta * zoomSpeed * dt));

        if (zoomDelta > 0) {
          const camLngLat = info.camLngLat;
          const camAlt = info.altitude;
          const groundUnderCam = map.queryTerrainElevation ? map.queryTerrainElevation(camLngLat) : null;
          if (camAlt && groundUnderCam && camAlt <= groundUnderCam + CAMERA_CONSTANTS.MIN_ZOOM_CLEARANCE_METERS) {
            nextZoom = curZoom;
          }
        }
        map.setZoom(nextZoom);
        const updated = getCameraInfo(map);
        if (updated) heldFlightAltitude = updated.altitude;
      }

      const liveZoom = map.getZoom();
      const speedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);

      // 4. Manual Vertical Helicopter Elevator (Q / E or PageDown / PageUp)
      // Moves camera straight UP / DOWN vertically without ground drift
      if (altitudeDelta !== 0) {
        const curCenter = map.getCenter();
        const curBearing = map.getBearing();
        const curPitch = map.getPitch();
        const curCamLngLat = info.camLngLat;
        const groundUnderCam = map.queryTerrainElevation ? (map.queryTerrainElevation(curCamLngLat) ?? 0) : 0;
        const groundUnderCenter = info.groundElevation;
        const vertSpeedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * 0.75 * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);
        const deltaAltMeters = altitudeDelta * vertSpeedMps * dt;

        const targetCamAlt = heldFlightAltitude + deltaAltMeters;
        const minAllowedCamAlt = groundUnderCam + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;

        if (!(deltaAltMeters < 0 && targetCamAlt < minAllowedCamAlt)) {
          const nextCamAlt = Math.max(minAllowedCamAlt, targetCamAlt);
          const pitchRad = (curPitch * Math.PI) / 180;
          const bearingRad = (curBearing * Math.PI) / 180;

          const prevHeightAboveGround = Math.max(10, heldFlightAltitude - groundUnderCenter);
          const nextHeightAboveGround = Math.max(10, nextCamAlt - groundUnderCenter);

          const zoomAdjust = -Math.log2(nextHeightAboveGround / prevHeightAboveGround);
          const nextZoom = Math.max(1.0, Math.min(20.5, map.getZoom() + zoomAdjust));

          // Shift ground center point to counteract horizontal drift
          const deltaGroundDist = (nextHeightAboveGround - prevHeightAboveGround) * Math.tan(pitchRad);
          const deltaEast = deltaGroundDist * Math.sin(bearingRad);
          const deltaNorth = deltaGroundDist * Math.cos(bearingRad);

          const metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
          const latRad = (curCenter.lat * Math.PI) / 180;
          const metersPerDegLng = metersPerDegLat * Math.max(0.1, Math.cos(latRad));

          const nextCenterLat = Math.max(-85, Math.min(85, curCenter.lat + deltaNorth / metersPerDegLat));
          const nextCenterLng = curCenter.lng + deltaEast / metersPerDegLng;

          heldFlightAltitude = nextCamAlt;
          map.jumpTo({
            center: [nextCenterLng, nextCenterLat],
            zoom: nextZoom,
          });
        }
      }

      // 5. Horizontal Ground Flight (Arrow Keys) - Fixed Altitude Panning
      const hasHorizontalMove = moveForward !== 0 || moveStrafe !== 0;
      if (hasHorizontalMove) {
        const curCenter = map.getCenter();
        const curBearing = map.getBearing();

        const { deltaLat, deltaLng, nextLat, nextLng } = computeGeographicDisplacement(
          curCenter,
          curBearing,
          moveForward,
          moveStrafe,
          speedMps,
          dt
        );

        // Predictive obstacle climb: ONLY climb when necessary to clear terrain
        const lookaheadMultiplier = dt > 0 ? CAMERA_CONSTANTS.LOOKAHEAD_SECONDS / dt : 1;
        const camLngLat = info.camLngLat;
        const nextCamLat = Math.max(-85, Math.min(85, camLngLat.lat + deltaLat));
        const nextCamLng = camLngLat.lng + deltaLng;
        const lookCamLat = Math.max(-85, Math.min(85, nextCamLat + deltaLat * lookaheadMultiplier));
        const lookCamLng = nextCamLng + deltaLng * lookaheadMultiplier;

        const maxGroundCam = sampleTerrainObstacle(map, nextCamLng, nextCamLat, lookCamLng, lookCamLat);
        if (maxGroundCam > -Infinity) {
          const minAllowedCamAlt = maxGroundCam + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
          if (minAllowedCamAlt > heldFlightAltitude) {
            heldFlightAltitude = minAllowedCamAlt;
          }
        }

        map.jumpTo({ center: [nextLng, nextLat] });
        adjustZoomForTargetAltitude(map, heldFlightAltitude);
      }

      // Live Telemetry Callback
      try {
        const currentCam = getCameraInfo(map);
        if (currentCam && isFinite(currentCam.altitude)) {
          callbacksRef.current.onAltitudeChange?.(currentCam.altitude);
        }
      } catch (_) {}

      animationFrameId = requestAnimationFrame(flightStep);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElementFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (NAVIGATION_KEY_SET.has(e.code)) {
        e.preventDefault();
        activeKeys.add(e.code);
        if (e.shiftKey) activeKeys.add('ShiftLeft');

        callbacksRef.current.onModeChange?.('flight');

        if (animationFrameId === null) {
          lastTimestamp = performance.now();
          const initialInfo = getCameraInfo(map);
          if (initialInfo) heldFlightAltitude = initialInfo.altitude;
          animationFrameId = requestAnimationFrame(flightStep);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        activeKeys.delete('ShiftLeft');
        activeKeys.delete('ShiftRight');
      }

      const hasNavKey = Array.from(activeKeys).some((k) => NAVIGATION_KEY_SET.has(k));
      if (!hasNavKey && animationFrameId !== null) {
        stopFlight(false);
      }
    };

    const stopFlightOnBlur = () => {
      stopFlight(true);
    };

    // Mouse Drag Panning Altitude Stabilizer
    const onMapMoveDuringDrag = () => {
      if (isAdjustingZoom) return;
      if (!map.isDragging || !map.isDragging()) return;
      if (!map.getTerrain || !map.getTerrain() || map.getPitch() < 5) return;

      const info = getCameraInfo(map);
      if (!info) return;

      if (mouseDragTargetAltitude === null) {
        mouseDragTargetAltitude = info.altitude;
        return;
      }

      isAdjustingZoom = true;
      try {
        const groundCam = map.queryTerrainElevation ? (map.queryTerrainElevation(info.camLngLat) ?? 0) : 0;
        const minAllowed = groundCam + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
        if (minAllowed > mouseDragTargetAltitude) {
          mouseDragTargetAltitude = minAllowed;
        }

        const deltaZ_cur = Math.max(10, info.altitude - info.groundElevation);
        const deltaZ_target = Math.max(10, mouseDragTargetAltitude - info.groundElevation);

        if (Math.abs(deltaZ_cur - deltaZ_target) > 0.4) {
          const zoomOffset = Math.log2(deltaZ_cur / deltaZ_target);
          map.setZoom(Math.max(1.0, Math.min(22.0, map.getZoom() + zoomOffset)));
        }
      } finally {
        isAdjustingZoom = false;
      }
    };

    const onDragStart = () => {
      if (map.getTerrain && map.getTerrain() && map.getPitch() >= 5) {
        const info = getCameraInfo(map);
        if (info) mouseDragTargetAltitude = info.altitude;
      }
    };

    const onDragEnd = () => {
      mouseDragTargetAltitude = null;
    };

    // Explicitly verify touch, trackpad, and mouse gesture handlers are enabled
    try {
      if (map.touchZoomRotate && !map.touchZoomRotate.isEnabled()) map.touchZoomRotate.enable();
      if (map.touchPitch && !map.touchPitch.isEnabled()) map.touchPitch.enable();
      if (map.dragRotate && !map.dragRotate.isEnabled()) map.dragRotate.enable();
      if (map.scrollZoom && !map.scrollZoom.isEnabled()) map.scrollZoom.enable();
      if (map.dragPan && !map.dragPan.isEnabled()) map.dragPan.enable();
    } catch (_) {}

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', stopFlightOnBlur);
    window.addEventListener('focus', stopFlightOnBlur);
    document.addEventListener('visibilitychange', stopFlightOnBlur);

    map.on('dragstart', onDragStart);
    map.on('move', onMapMoveDuringDrag);
    map.on('dragend', onDragEnd);
    map.on('moveend', onDragEnd);

    const canvasContainer = map.getCanvasContainer ? map.getCanvasContainer() : map.getContainer();

    // Trackpad: Shift+scroll to tilt handler
    const handleCanvasWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const pitchDelta = -e.deltaY * 0.08;
        const curPitch = map.getPitch();
        const curZoom = map.getZoom();
        const nextPitch = clampPitch(curPitch + pitchDelta, curZoom);
        map.setPitch(nextPitch);
        callbacksRef.current.onPitchChange?.(Math.round(nextPitch));
        const info = getCameraInfo(map);
        if (info) {
          if (heldFlightAltitude === null) heldFlightAltitude = info.altitude;
          adjustZoomForTargetAltitude(map, heldFlightAltitude);
        }
        return;
      }
      if (animationFrameId !== null || activeKeys.size > 0) {
        stopFlight(true);
      }
    };

    const onCanvasPointerInteraction = () => {
      if (animationFrameId !== null || activeKeys.size > 0) {
        stopFlight(true);
      }
    };

    if (canvasContainer) {
      canvasContainer.addEventListener('mousedown', onCanvasPointerInteraction, { capture: true });
      canvasContainer.addEventListener('pointerdown', onCanvasPointerInteraction, { capture: true });
      canvasContainer.addEventListener('touchstart', onCanvasPointerInteraction, { capture: true, passive: true });
      canvasContainer.addEventListener('wheel', handleCanvasWheel, { capture: true, passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', stopFlightOnBlur);
      window.removeEventListener('focus', stopFlightOnBlur);
      document.removeEventListener('visibilitychange', stopFlightOnBlur);

      map.off('dragstart', onDragStart);
      map.off('move', onMapMoveDuringDrag);
      map.off('dragend', onDragEnd);
      map.off('moveend', onDragEnd);

      if (canvasContainer) {
        canvasContainer.removeEventListener('mousedown', onCanvasPointerInteraction, { capture: true });
        canvasContainer.removeEventListener('pointerdown', onCanvasPointerInteraction, { capture: true });
        canvasContainer.removeEventListener('touchstart', onCanvasPointerInteraction, { capture: true });
        canvasContainer.removeEventListener('wheel', handleCanvasWheel, { capture: true });
      }

      stopFlight(true);
    };
  }, [isLoaded, map]);
}
