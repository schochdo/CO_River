import { useEffect, useRef } from 'react';
import type { UseKeyboardFlightOptions } from './types';
import { NAVIGATION_KEY_SET, CAMERA_CONSTANTS } from './types';
import {
  normalizeBearing,
  clampPitch,
  isInputElementFocused,
  computeGeographicDisplacement,
  sampleTerrainObstacle,
} from './cameraUtils';

/**
 * 60 FPS Game-Engine Style 3D Keyboard Flight Camera Controller
 * for MapLibre GL JS / Mapbox GL JS.
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
    let isElevationHeld = false;

    const stopFlight = (_immediate = false) => {
      activeKeys.clear();
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastTimestamp = null;
      callbacksRef.current.onModeChange?.('idle');

      // Safely re-enable ground elevation clamping on flight exit
      if (isElevationHeld && map) {
        isElevationHeld = false;
        try {
          const curCenter = map.getCenter();
          const curPitch = map.getPitch();
          const centerElev = map.queryTerrainElevation ? map.queryTerrainElevation(curCenter) : null;
          if (centerElev !== null && centerElev !== undefined && curPitch < 78) {
            (map as any).setCenterClampedToGround?.(true);
          } else {
            (map as any).setCenterClampedToGround?.(false);
          }
        } catch (_) {}
      }
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

      // 1. Pitch (W / S)
      if (pitchDelta !== 0) {
        const curPitch = map.getPitch();
        const curZoom = map.getZoom();
        const pitchSpeed = (isShift ? 2.0 : 1.0) * CAMERA_CONSTANTS.PITCH_SPEED_DEG_PER_SEC;
        const nextPitch = clampPitch(curPitch + pitchDelta * pitchSpeed * dt, curZoom);
        map.setPitch(nextPitch);
        callbacksRef.current.onPitchChange?.(Math.round(nextPitch));
      }

      // 2. Bearing (A / D)
      if (rotateBearing !== 0) {
        const curBearing = map.getBearing();
        const bearingSpeed = (isShift ? 2.0 : 1.0) * CAMERA_CONSTANTS.BEARING_SPEED_DEG_PER_SEC;
        const nextBearing = normalizeBearing(curBearing + rotateBearing * bearingSpeed * dt);
        map.setBearing(nextBearing);
        callbacksRef.current.onBearingChange?.(Math.round(nextBearing));
      }

      // 3. Line-of-Sight Zoom (+ / - or Z / X) with Collision Clearance Floor
      if (zoomDelta !== 0) {
        const curZoom = map.getZoom();
        const zoomSpeed = (isShift ? 2.0 : 1.0) * CAMERA_CONSTANTS.ZOOM_SPEED_PER_SEC;
        let nextZoom = Math.max(1.0, Math.min(20.5, curZoom + zoomDelta * zoomSpeed * dt));

        if (zoomDelta > 0) {
          const tr = (map as any)._camera?.transform;
          const camLngLat = tr?.getCameraLngLat?.() || map.getCenter();
          const camAlt = tr?.getCameraAltitude?.();
          const groundUnderCam = map.queryTerrainElevation ? map.queryTerrainElevation(camLngLat) : null;
          if (camAlt && groundUnderCam && camAlt <= groundUnderCam + CAMERA_CONSTANTS.MIN_ZOOM_CLEARANCE_METERS) {
            nextZoom = curZoom;
          }
        }
        map.setZoom(nextZoom);
      }

      const liveZoom = map.getZoom();
      const speedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);

      // 4. Manual Vertical Helicopter Elevator (Q / E or PageDown / PageUp)
      // Moves camera straight UP / DOWN vertically without ground drift
      if (altitudeDelta !== 0) {
        if (!isElevationHeld) {
          try {
            (map as any).setCenterClampedToGround?.(false);
            isElevationHeld = true;
          } catch (_) {}
        }

        const tr = (map as any)._camera?.transform;
        const curCenter = map.getCenter();
        const curBearing = map.getBearing();
        const curPitch = map.getPitch();
        const curCamLngLat = tr?.getCameraLngLat?.() || curCenter;
        const curCamAlt = tr?.getCameraAltitude?.();
        const groundUnderCam = map.queryTerrainElevation ? map.queryTerrainElevation(curCamLngLat) ?? 0 : 0;
        const groundUnderCenter = map.queryTerrainElevation ? map.queryTerrainElevation(curCenter) ?? 0 : 0;
        const vertSpeedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * 0.75 * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);
        const deltaAltMeters = altitudeDelta * vertSpeedMps * dt;

        if (curCamAlt !== null && curCamAlt !== undefined && isFinite(curCamAlt) && curCamAlt > 0) {
          const targetCamAlt = curCamAlt + deltaAltMeters;
          const minAllowedCamAlt = groundUnderCam + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;

          if (!(deltaAltMeters < 0 && targetCamAlt < minAllowedCamAlt)) {
            const nextCamAlt = Math.max(minAllowedCamAlt, targetCamAlt);
            const pitchRad = (curPitch * Math.PI) / 180;
            const bearingRad = (curBearing * Math.PI) / 180;

            const prevHeightAboveGround = Math.max(10, curCamAlt - groundUnderCenter);
            const nextHeightAboveGround = Math.max(10, nextCamAlt - groundUnderCenter);

            const zoomAdjust = -Math.log2(nextHeightAboveGround / prevHeightAboveGround);
            const curZoom = map.getZoom();
            const nextZoom = Math.max(1.0, Math.min(20.5, curZoom + zoomAdjust));

            // Shift ground center point to counteract horizontal drift
            const deltaGroundDist = (nextHeightAboveGround - prevHeightAboveGround) * Math.tan(pitchRad);
            const deltaEast = deltaGroundDist * Math.sin(bearingRad);
            const deltaNorth = deltaGroundDist * Math.cos(bearingRad);

            const metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
            const latRad = (curCenter.lat * Math.PI) / 180;
            const metersPerDegLng = metersPerDegLat * Math.cos(latRad);

            const nextCenterLat = Math.max(-85, Math.min(85, curCenter.lat + deltaNorth / metersPerDegLat));
            const nextCenterLng = curCenter.lng + deltaEast / metersPerDegLng;

            map.jumpTo({
              center: [nextCenterLng, nextCenterLat],
              zoom: nextZoom,
            });
          }
        }
      }

      // 5. Horizontal Ground Flight (Arrow Keys)
      const hasHorizontalMove = moveForward !== 0 || moveStrafe !== 0;
      if (hasHorizontalMove) {
        if (!isElevationHeld) {
          try {
            (map as any).setCenterClampedToGround?.(false);
            isElevationHeld = true;
          } catch (_) {}
        }

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

        // Predictive obstacle climb lookahead
        const lookaheadMultiplier = dt > 0 ? CAMERA_CONSTANTS.LOOKAHEAD_SECONDS / dt : 1;
        const tr = (map as any)._camera?.transform;
        const camLngLat = tr?.getCameraLngLat?.() || curCenter;
        const camAlt = tr?.getCameraAltitude?.();

        const nextCamLat = Math.max(-85, Math.min(85, camLngLat.lat + deltaLat));
        const nextCamLng = camLngLat.lng + deltaLng;
        const lookCamLat = Math.max(-85, Math.min(85, nextCamLat + deltaLat * lookaheadMultiplier));
        const lookCamLng = nextCamLng + deltaLng * lookaheadMultiplier;

        const maxGroundCam = sampleTerrainObstacle(map, nextCamLng, nextCamLat, lookCamLng, lookCamLat);
        if (maxGroundCam > -Infinity && camAlt && isFinite(camAlt) && camAlt > 0) {
          const minAllowedCamAlt = maxGroundCam + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
          if (minAllowedCamAlt > camAlt) {
            const climbDiff = minAllowedCamAlt - camAlt;
            const zoomAdjust = Math.log2(1 + climbDiff / camAlt);
            map.setZoom(Math.max(1.0, map.getZoom() - zoomAdjust * (1 - Math.exp(-dt * 6.0))));
          }
        }

        map.jumpTo({ center: [nextLng, nextLat] });
      }

      // Live Telemetry Output
      try {
        const alt = (map as any)._camera?.transform?.getCameraAltitude?.() ?? (map as any).getCenterElevation?.();
        if (alt && isFinite(alt)) callbacksRef.current.onAltitudeChange?.(alt);
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

    const stopFlightOnBlur = () => stopFlight(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', stopFlightOnBlur);
    window.addEventListener('focus', stopFlightOnBlur);
    document.addEventListener('visibilitychange', stopFlightOnBlur);

    // Canvas interruption safety: cancel flight on mouse drag / wheel zoom
    const canvasContainer = map.getCanvasContainer();
    const onCanvasMouseInteraction = () => {
      if (animationFrameId !== null || activeKeys.size > 0 || isElevationHeld) {
        stopFlight(true);
      }
    };

    canvasContainer.addEventListener('mousedown', onCanvasMouseInteraction, { capture: true });
    canvasContainer.addEventListener('pointerdown', onCanvasMouseInteraction, { capture: true });
    canvasContainer.addEventListener('wheel', onCanvasMouseInteraction, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', stopFlightOnBlur);
      window.removeEventListener('focus', stopFlightOnBlur);
      document.removeEventListener('visibilitychange', stopFlightOnBlur);

      canvasContainer.removeEventListener('mousedown', onCanvasMouseInteraction, { capture: true } as any);
      canvasContainer.removeEventListener('pointerdown', onCanvasMouseInteraction, { capture: true } as any);
      canvasContainer.removeEventListener('wheel', onCanvasMouseInteraction, { capture: true } as any);

      stopFlight(true);
    };
  }, [map, isLoaded]);
}
