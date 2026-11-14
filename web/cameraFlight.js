/**
 * 60 FPS Game-Engine Style 3D Keyboard Flight Camera Controller
 * for MapLibre GL JS / Mapbox GL JS (Vanilla JS Production Engine)
 *
 * Controls:
 * - W / S: Pitch tilt (look up toward 3D horizon / down toward nadir)
 * - A / D: Bearing rotation (yaw camera heading left / right)
 * - Arrow Keys: Relative ground flight along current camera bearing & lateral strafe
 * - Q / E or PageDown / PageUp: True vertical altitude elevator (no ground drift)
 * - + / - or Z / X: Line-of-sight zoom with terrain collision floor
 * - Shift: 2.0x speed multiplier (orientation) / 2.5x (flight & elevation)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.initKeyboardFlight = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NAVIGATION_KEY_SET = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'KeyQ', 'KeyE', 'PageUp', 'PageDown',
    'KeyZ', 'KeyX', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
  ]);

  var CAMERA_CONSTANTS = {
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
    METERS_PER_DEG_LAT: 111320
  };

  function normalizeBearing(bearing) {
    var mod = bearing % 360;
    return mod < 0 ? mod + 360 : mod;
  }

  function clampPitch(pitch, zoom) {
    var maxPitch = zoom !== undefined
      ? Math.max(0, Math.min(82, (zoom - 3.5) * 18))
      : CAMERA_CONSTANTS.MAX_PITCH_DEG;
    return Math.max(CAMERA_CONSTANTS.MIN_PITCH_DEG, Math.min(maxPitch, pitch));
  }

  function isInputElementFocused() {
    if (typeof document === 'undefined') return false;
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function computeGeographicDisplacement(center, bearingDeg, moveForward, moveStrafe, speedMps, dt) {
    var len = Math.hypot(moveForward, moveStrafe);
    if (len === 0) {
      return { deltaLat: 0, deltaLng: 0, nextLat: center.lat, nextLng: center.lng };
    }
    var normForward = moveForward / len;
    var normStrafe = moveStrafe / len;
    var bearingRad = (bearingDeg * Math.PI) / 180;
    var distMeters = speedMps * dt;
    var sinB = Math.sin(bearingRad);
    var cosB = Math.cos(bearingRad);
    var deltaEastMeters = (sinB * normForward + cosB * normStrafe) * distMeters;
    var deltaNorthMeters = (cosB * normForward - sinB * normStrafe) * distMeters;
    var latRad = (center.lat * Math.PI) / 180;
    var metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
    var metersPerDegLng = metersPerDegLat * Math.max(0.1, Math.cos(latRad));
    var deltaLat = deltaNorthMeters / metersPerDegLat;
    var deltaLng = deltaEastMeters / metersPerDegLng;
    var nextLat = Math.max(-85, Math.min(85, center.lat + deltaLat));
    var nextLng = center.lng + deltaLng;
    return { deltaLat: deltaLat, deltaLng: deltaLng, nextLat: nextLat, nextLng: nextLng };
  }

  function sampleTerrainObstacle(map, camLng, camLat, lookaheadLng, lookaheadLat) {
    var groundCam = map.queryTerrainElevation ? map.queryTerrainElevation([camLng, camLat]) : 0;
    var groundAheadCam = map.queryTerrainElevation ? map.queryTerrainElevation([lookaheadLng, lookaheadLat]) : 0;
    var maxGround = -Infinity;
    if (groundCam !== null && groundCam !== undefined && isFinite(groundCam)) {
      maxGround = Math.max(maxGround, groundCam);
    }
    if (groundAheadCam !== null && groundAheadCam !== undefined && isFinite(groundAheadCam)) {
      maxGround = Math.max(maxGround, groundAheadCam);
    }
    return maxGround;
  }

  function initKeyboardFlight(map, options) {
    if (!map) return function () {};
    options = options || {};

    // Disable default 2D stepping controls
    try {
      if (map.keyboard && map.keyboard.disable) {
        map.keyboard.disable();
      }
    } catch (_) {}

    var activeKeys = new Set();
    var animationFrameId = null;
    var lastTimestamp = null;
    var isElevationHeld = false;

    function stopFlight(_immediate) {
      activeKeys.clear();
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastTimestamp = null;
      if (options.onModeChange) options.onModeChange('idle');

      if (isElevationHeld && map) {
        isElevationHeld = false;
        try {
          var curCenter = map.getCenter();
          var curPitch = map.getPitch();
          var centerElev = map.queryTerrainElevation ? map.queryTerrainElevation(curCenter) : null;
          if (centerElev !== null && centerElev !== undefined && curPitch < 78) {
            if (map.setCenterClampedToGround) map.setCenterClampedToGround(true);
          } else {
            if (map.setCenterClampedToGround) map.setCenterClampedToGround(false);
          }
        } catch (_) {}
      }
    }

    function flightStep(timestamp) {
      if (!map) {
        stopFlight(true);
        return;
      }

      if (lastTimestamp === null) lastTimestamp = timestamp;
      var dt = Math.min((timestamp - lastTimestamp) / 1000, 0.08);
      lastTimestamp = timestamp;

      var hasNavKey = false;
      activeKeys.forEach(function (k) {
        if (NAVIGATION_KEY_SET.has(k)) hasNavKey = true;
      });

      if (!hasNavKey) {
        stopFlight(false);
        return;
      }

      var isShift = activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight');
      var pitchDelta = 0;
      var rotateBearing = 0;
      var zoomDelta = 0;
      var moveForward = 0;
      var moveStrafe = 0;
      var altitudeDelta = 0;

      // WASD: Pitch & Yaw Gaze Orientation
      if (activeKeys.has('KeyW')) pitchDelta += 1;
      if (activeKeys.has('KeyS')) pitchDelta -= 1;
      if (activeKeys.has('KeyA')) rotateBearing -= 1;
      if (activeKeys.has('KeyD')) rotateBearing += 1;

      // Q / E: Vertical Altitude Elevator
      if (activeKeys.has('KeyE') || activeKeys.has('PageUp')) altitudeDelta += 1;
      if (activeKeys.has('KeyQ') || activeKeys.has('PageDown')) altitudeDelta -= 1;

      // Arrow Keys: Ground Plane Vector Flight
      if (activeKeys.has('ArrowUp')) moveForward += 1;
      if (activeKeys.has('ArrowDown')) moveForward -= 1;
      if (activeKeys.has('ArrowRight')) moveStrafe += 1;
      if (activeKeys.has('ArrowLeft')) moveStrafe -= 1;

      // Zoom
      if (activeKeys.has('Equal') || activeKeys.has('NumpadAdd') || activeKeys.has('KeyZ')) zoomDelta += 1;
      if (activeKeys.has('Minus') || activeKeys.has('NumpadSubtract') || activeKeys.has('KeyX')) zoomDelta -= 1;

      // 1. Pitch
      if (pitchDelta !== 0) {
        var curPitch = map.getPitch();
        var curZoom = map.getZoom();
        var pitchSpeed = (isShift ? 2.0 : 1.0) * CAMERA_CONSTANTS.PITCH_SPEED_DEG_PER_SEC;
        var nextPitch = clampPitch(curPitch + pitchDelta * pitchSpeed * dt, curZoom);
        map.setPitch(nextPitch);
        if (options.onPitchChange) options.onPitchChange(Math.round(nextPitch));
      }

      // 2. Bearing
      if (rotateBearing !== 0) {
        var curBearing = map.getBearing();
        var bearingSpeed = (isShift ? 2.0 : 1.0) * CAMERA_CONSTANTS.BEARING_SPEED_DEG_PER_SEC;
        var nextBearing = normalizeBearing(curBearing + rotateBearing * bearingSpeed * dt);
        map.setBearing(nextBearing);
        if (options.onBearingChange) options.onBearingChange(Math.round(nextBearing));
      }

      // 3. Line-of-sight Zoom
      if (zoomDelta !== 0) {
        var curZ = map.getZoom();
        var zoomSpeed = (isShift ? 2.0 : 1.0) * CAMERA_CONSTANTS.ZOOM_SPEED_PER_SEC;
        var nextZ = Math.max(1.0, Math.min(20.5, curZ + zoomDelta * zoomSpeed * dt));

        if (zoomDelta > 0) {
          var tr = map._camera && map._camera.transform;
          var camLngLat = (tr && tr.getCameraLngLat && tr.getCameraLngLat()) || map.getCenter();
          var camAlt = tr && tr.getCameraAltitude && tr.getCameraAltitude();
          var groundUnderCam = map.queryTerrainElevation ? map.queryTerrainElevation(camLngLat) : null;
          if (camAlt && groundUnderCam && camAlt <= groundUnderCam + CAMERA_CONSTANTS.MIN_ZOOM_CLEARANCE_METERS) {
            nextZ = curZ;
          }
        }
        map.setZoom(nextZ);
      }

      var liveZoom = map.getZoom();
      var speedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);

      // 4. Vertical Altitude Elevator (Q / E)
      if (altitudeDelta !== 0) {
        if (!isElevationHeld) {
          try {
            if (map.setCenterClampedToGround) map.setCenterClampedToGround(false);
            isElevationHeld = true;
          } catch (_) {}
        }

        var tr2 = map._camera && map._camera.transform;
        var curCenter2 = map.getCenter();
        var curBearing2 = map.getBearing();
        var curPitch2 = map.getPitch();
        var curCamLngLat2 = (tr2 && tr2.getCameraLngLat && tr2.getCameraLngLat()) || curCenter2;
        var curCamAlt2 = tr2 && tr2.getCameraAltitude && tr2.getCameraAltitude();
        var groundUnderCam2 = map.queryTerrainElevation ? map.queryTerrainElevation(curCamLngLat2) || 0 : 0;
        var groundUnderCenter2 = map.queryTerrainElevation ? map.queryTerrainElevation(curCenter2) || 0 : 0;
        var vertSpeedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * 0.75 * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);
        var deltaAltMeters = altitudeDelta * vertSpeedMps * dt;

        if (curCamAlt2 !== null && curCamAlt2 !== undefined && isFinite(curCamAlt2) && curCamAlt2 > 0) {
          var targetCamAlt = curCamAlt2 + deltaAltMeters;
          var minAllowedCamAlt = groundUnderCam2 + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;

          if (!(deltaAltMeters < 0 && targetCamAlt < minAllowedCamAlt)) {
            var nextCamAlt = Math.max(minAllowedCamAlt, targetCamAlt);
            var pitchRad = (curPitch2 * Math.PI) / 180;
            var bearingRad = (curBearing2 * Math.PI) / 180;

            var prevHeightAboveGround = Math.max(10, curCamAlt2 - groundUnderCenter2);
            var nextHeightAboveGround = Math.max(10, nextCamAlt - groundUnderCenter2);

            var zoomAdjust = -Math.log2(nextHeightAboveGround / prevHeightAboveGround);
            var curZoomElev = map.getZoom();
            var nextZoomElev = Math.max(1.0, Math.min(20.5, curZoomElev + zoomAdjust));

            var deltaGroundDist = (nextHeightAboveGround - prevHeightAboveGround) * Math.tan(pitchRad);
            var deltaEast = deltaGroundDist * Math.sin(bearingRad);
            var deltaNorth = deltaGroundDist * Math.cos(bearingRad);

            var metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
            var latRad = (curCenter2.lat * Math.PI) / 180;
            var metersPerDegLng = metersPerDegLat * Math.cos(latRad);

            var nextCenterLat = Math.max(-85, Math.min(85, curCenter2.lat + deltaNorth / metersPerDegLat));
            var nextCenterLng = curCenter2.lng + deltaEast / metersPerDegLng;

            map.jumpTo({
              center: [nextCenterLng, nextCenterLat],
              zoom: nextZoomElev
            });
          }
        }
      }

      // 5. Horizontal Ground Flight (Arrow Keys)
      var hasHorizontalMove = moveForward !== 0 || moveStrafe !== 0;
      if (hasHorizontalMove) {
        if (!isElevationHeld) {
          try {
            if (map.setCenterClampedToGround) map.setCenterClampedToGround(false);
            isElevationHeld = true;
          } catch (_) {}
        }

        var curCenterH = map.getCenter();
        var curBearingH = map.getBearing();
        var disp = computeGeographicDisplacement(
          curCenterH,
          curBearingH,
          moveForward,
          moveStrafe,
          speedMps,
          dt
        );

        // Predictive obstacle climb
        var lookaheadMultiplier = dt > 0 ? CAMERA_CONSTANTS.LOOKAHEAD_SECONDS / dt : 1;
        var trH = map._camera && map._camera.transform;
        var camLngLatH = (trH && trH.getCameraLngLat && trH.getCameraLngLat()) || curCenterH;
        var camAltH = trH && trH.getCameraAltitude && trH.getCameraAltitude();

        var nextCamLat = Math.max(-85, Math.min(85, camLngLatH.lat + disp.deltaLat));
        var nextCamLng = camLngLatH.lng + disp.deltaLng;
        var lookCamLat = Math.max(-85, Math.min(85, nextCamLat + disp.deltaLat * lookaheadMultiplier));
        var lookCamLng = nextCamLng + disp.deltaLng * lookaheadMultiplier;

        var maxGroundCam = sampleTerrainObstacle(map, nextCamLng, nextCamLat, lookCamLng, lookCamLat);
        if (maxGroundCam > -Infinity && camAltH && isFinite(camAltH) && camAltH > 0) {
          var minAllowedCamAltH = maxGroundCam + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
          if (minAllowedCamAltH > camAltH) {
            var climbDiff = minAllowedCamAltH - camAltH;
            var zoomAdjustH = Math.log2(1 + climbDiff / camAltH);
            map.setZoom(Math.max(1.0, map.getZoom() - zoomAdjustH * (1 - Math.exp(-dt * 6.0))));
          }
        }

        map.jumpTo({ center: [disp.nextLng, disp.nextLat] });
      }

      // Live Telemetry
      try {
        var alt = (map._camera && map._camera.transform && map._camera.transform.getCameraAltitude && map._camera.transform.getCameraAltitude()) ||
          (map.getCenterElevation && map.getCenterElevation());
        if (alt && isFinite(alt) && options.onAltitudeChange) options.onAltitudeChange(alt);
      } catch (_) {}

      animationFrameId = requestAnimationFrame(flightStep);
    }

    function handleKeyDown(e) {
      if (isInputElementFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (NAVIGATION_KEY_SET.has(e.code)) {
        e.preventDefault();
        activeKeys.add(e.code);
        if (e.shiftKey) activeKeys.add('ShiftLeft');

        if (options.onModeChange) options.onModeChange('flight');

        if (animationFrameId === null) {
          lastTimestamp = performance.now();
          animationFrameId = requestAnimationFrame(flightStep);
        }
      }
    }

    function handleKeyUp(e) {
      activeKeys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        activeKeys.delete('ShiftLeft');
        activeKeys.delete('ShiftRight');
      }

      var hasNavKey = false;
      activeKeys.forEach(function (k) {
        if (NAVIGATION_KEY_SET.has(k)) hasNavKey = true;
      });

      if (!hasNavKey && animationFrameId !== null) {
        stopFlight(false);
      }
    }

    function stopFlightOnBlur() {
      stopFlight(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', stopFlightOnBlur);
    window.addEventListener('focus', stopFlightOnBlur);
    document.addEventListener('visibilitychange', stopFlightOnBlur);

    var canvasContainer = map.getCanvasContainer ? map.getCanvasContainer() : map.getContainer();
    function onCanvasMouseInteraction() {
      if (animationFrameId !== null || activeKeys.size > 0 || isElevationHeld) {
        stopFlight(true);
      }
    }

    if (canvasContainer) {
      canvasContainer.addEventListener('mousedown', onCanvasMouseInteraction, { capture: true });
      canvasContainer.addEventListener('pointerdown', onCanvasMouseInteraction, { capture: true });
      canvasContainer.addEventListener('wheel', onCanvasMouseInteraction, { capture: true });
    }

    return function cleanup() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', stopFlightOnBlur);
      window.removeEventListener('focus', stopFlightOnBlur);
      document.removeEventListener('visibilitychange', stopFlightOnBlur);

      if (canvasContainer) {
        canvasContainer.removeEventListener('mousedown', onCanvasMouseInteraction, { capture: true });
        canvasContainer.removeEventListener('pointerdown', onCanvasMouseInteraction, { capture: true });
        canvasContainer.removeEventListener('wheel', onCanvasMouseInteraction, { capture: true });
      }

      stopFlight(true);
    };
  }

  return initKeyboardFlight;
});
