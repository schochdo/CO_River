/**
 * 60 FPS Game-Engine Style 3D Flight & Pan Camera Controller
 * for MapLibre GL JS / Mapbox GL JS (Vanilla JS Production Engine)
 *
 * Stabilization Features:
 * - Fixed Altitude Panning: Camera altitude (MSL) remains rock-solid when panning
 *   across mountain ridges, valleys, and canyons, eliminating vertical bouncing.
 * - Automatic Terrain Clearance: Camera elevation only climbs if necessary to clear
 *   physical terrain obstacles ahead, with user-configured safety clearance floor.
 * - Independent Degrees of Freedom:
 *   - WASD: Pitch tilt & bearing yaw rotation without altitude changes
 *   - Arrow Keys: Ground vector flight with locked camera elevation
 *   - Q / E or PageDown / PageUp: True vertical helicopter altitude elevator (no ground drift)
 *   - + / - or Z / X: Line-of-sight zoom with terrain collision safety floor
 *   - Mouse Drag Pan: Seamlessly stabilized when tilted in 3D terrain mode
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

  function getNavigationCode(e) {
    if (NAVIGATION_KEY_SET.has(e.code)) return e.code;
    var k = e.key;
    if (k === 'w' || k === 'W') return 'KeyW';
    if (k === 's' || k === 'S') return 'KeyS';
    if (k === 'a' || k === 'A') return 'KeyA';
    if (k === 'd' || k === 'D') return 'KeyD';
    if (k === 'q' || k === 'Q') return 'KeyQ';
    if (k === 'e' || k === 'E') return 'KeyE';
    if (k === 'z' || k === 'Z') return 'KeyZ';
    if (k === 'x' || k === 'X') return 'KeyX';
    if (k === '+' || k === '=') return 'Equal';
    if (k === '-' || k === '_') return 'Minus';
    if (k === 'ArrowUp') return 'ArrowUp';
    if (k === 'ArrowDown') return 'ArrowDown';
    if (k === 'ArrowLeft') return 'ArrowLeft';
    if (k === 'ArrowRight') return 'ArrowRight';
    if (k === 'PageUp') return 'PageUp';
    if (k === 'PageDown') return 'PageDown';
    return null;
  }

  var CAMERA_CONSTANTS = {
    MIN_CAMERA_CLEARANCE_METERS: 40.0,
    MIN_ZOOM_CLEARANCE_METERS: 25.0,
    LOOKAHEAD_SECONDS: 0.8,
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

  /**
   * Universal camera state extractor compatible with MapLibre GL JS v2–v4 & Mapbox GL JS.
   * Extracts physical world altitude in meters above sea level and ground camera coordinates.
   */
  function getCameraInfo(map) {
    if (!map) return null;
    var tr = (map._camera && map._camera.transform) || map.transform;
    if (!tr) return null;

    var camLngLat = null;
    var altitude = null;

    if (tr.getCameraPosition) {
      try {
        var pos = tr.getCameraPosition();
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

    var pitch = map.getPitch();
    var bearing = map.getBearing();
    var zoom = map.getZoom();
    var center = map.getCenter();
    var groundElevation = 0;

    if (tr._elevation !== undefined && tr._elevation !== null && isFinite(tr._elevation)) {
      groundElevation = tr._elevation;
    } else if (map.queryTerrainElevation) {
      groundElevation = map.queryTerrainElevation(center) || 0;
    }

    if (altitude === null || altitude === undefined || !isFinite(altitude)) {
      var pitchRad = (pitch * Math.PI) / 180;
      var distPx = tr.cameraToCenterDistance ||
        (tr.height ? tr.height / (2 * Math.tan((tr._fov || 0.64) / 2)) : 600);
      var ppm = tr._pixelPerMeter ||
        (Math.pow(2, zoom) * 256 / (2 * Math.PI * 6378137 * Math.cos((center.lat * Math.PI) / 180)));
      altitude = groundElevation + (Math.cos(pitchRad) * distPx) / ppm;
    }

    if (!camLngLat) {
      var pitchRad2 = (pitch * Math.PI) / 180;
      var bearingRad2 = (bearing * Math.PI) / 180;
      var deltaZ = Math.max(10, altitude - groundElevation);
      var horizDistMeters = deltaZ * Math.tan(pitchRad2);
      var metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
      var metersPerDegLng = metersPerDegLat * Math.max(0.1, Math.cos((center.lat * Math.PI) / 180));
      camLngLat = {
        lng: center.lng - (horizDistMeters * Math.sin(bearingRad2)) / metersPerDegLng,
        lat: center.lat - (horizDistMeters * Math.cos(bearingRad2)) / metersPerDegLat
      };
    }

    return {
      tr: tr,
      camLngLat: camLngLat,
      altitude: altitude,
      groundElevation: groundElevation,
      pitch: pitch,
      bearing: bearing,
      zoom: zoom,
      center: center
    };
  }

  /**
   * Mathematically stabilizes camera altitude against terrain fluctuations.
   * Adjusts zoom dynamically to maintain target altitude above sea level:
   * deltaZ_cur = altitude - groundElev; deltaZ_target = targetAltitude - groundElev
   * zoomOffset = log2(deltaZ_cur / deltaZ_target)
   */
  function adjustZoomForTargetAltitude(map, targetAltitude) {
    if (!map || targetAltitude === null || targetAltitude === undefined || !isFinite(targetAltitude)) return;
    var info = getCameraInfo(map);
    if (!info) return;

    var curAlt = info.altitude;
    var curGround = info.groundElevation;
    var minClearance = CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
    var deltaZ_cur = Math.max(minClearance, curAlt - curGround);
    var deltaZ_target = Math.max(minClearance, targetAltitude - curGround);

    if (Math.abs(deltaZ_cur - deltaZ_target) > 0.4) {
      var rawOffset = Math.log2(deltaZ_cur / deltaZ_target);
      var clampedOffset = Math.max(-0.6, Math.min(0.6, rawOffset));
      var nextZoom = Math.max(1.0, Math.min(22.0, map.getZoom() + clampedOffset));
      map.setZoom(nextZoom);
    }
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
    var heldFlightAltitude = null;
    var mouseDragTargetAltitude = null;
    var isAdjustingZoom = false;

    function stopFlight(_immediate) {
      activeKeys.clear();
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastTimestamp = null;
      heldFlightAltitude = null;
      if (options.onModeChange) options.onModeChange('idle');
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

      var info = getCameraInfo(map);
      if (!info) {
        animationFrameId = requestAnimationFrame(flightStep);
        return;
      }

      // Initialize held altitude on flight start
      if (heldFlightAltitude === null) {
        heldFlightAltitude = info.altitude;
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

      // 1. Pitch Tilt (W / S) - Maintain fixed camera altitude while tilting gaze
      if (pitchDelta !== 0) {
        var curPitch = map.getPitch();
        var curZoom = map.getZoom();
        var pitchSpeed = (isShift ? 2.5 : 1.0) * CAMERA_CONSTANTS.PITCH_SPEED_DEG_PER_SEC;
        var nextPitch = clampPitch(curPitch + pitchDelta * pitchSpeed * dt, curZoom);
        map.setPitch(nextPitch);
        if (options.onPitchChange) options.onPitchChange(Math.round(nextPitch));
        adjustZoomForTargetAltitude(map, heldFlightAltitude);
      }

      // 2. Bearing Yaw (A / D)
      if (rotateBearing !== 0) {
        var curBearing = map.getBearing();
        var bearingSpeed = (isShift ? 2.5 : 1.0) * CAMERA_CONSTANTS.BEARING_SPEED_DEG_PER_SEC;
        var nextBearing = normalizeBearing(curBearing + rotateBearing * bearingSpeed * dt);
        map.setBearing(nextBearing);
        if (options.onBearingChange) options.onBearingChange(Math.round(nextBearing));
      }

      // 3. Line-of-sight Zoom (+ / - or Z / X)
      if (zoomDelta !== 0) {
        var curZ = map.getZoom();
        var zoomSpeed = (isShift ? 2.5 : 1.0) * CAMERA_CONSTANTS.ZOOM_SPEED_PER_SEC;
        var nextZ = Math.max(1.0, Math.min(20.5, curZ + zoomDelta * zoomSpeed * dt));

        if (zoomDelta > 0) {
          var camLngLatZ = info.camLngLat;
          var camAltZ = info.altitude;
          var groundUnderCamZ = map.queryTerrainElevation ? map.queryTerrainElevation(camLngLatZ) : null;
          if (camAltZ && groundUnderCamZ && camAltZ <= groundUnderCamZ + CAMERA_CONSTANTS.MIN_ZOOM_CLEARANCE_METERS) {
            nextZ = curZ;
          }
        }
        map.setZoom(nextZ);
        // After explicit zoom, update held altitude to new position
        var updatedInfo = getCameraInfo(map);
        if (updatedInfo) heldFlightAltitude = updatedInfo.altitude;
      }

      var liveZoom = map.getZoom();
      var speedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);

      // 4. Vertical Altitude Elevator (Q / E or PageDown / PageUp)
      // True vertical elevator: changes altitude without ground drift
      if (altitudeDelta !== 0) {
        var curCenter2 = map.getCenter();
        var curBearing2 = map.getBearing();
        var curPitch2 = map.getPitch();
        var curCamLngLat2 = info.camLngLat;
        var groundUnderCam2 = map.queryTerrainElevation ? (map.queryTerrainElevation(curCamLngLat2) || 0) : 0;
        var groundUnderCenter2 = info.groundElevation;
        var vertSpeedMps = CAMERA_CONSTANTS.BASE_SPEED_MPS * 0.75 * Math.pow(2, 14 - liveZoom) * (isShift ? 2.5 : 1.0);
        var deltaAltMeters = altitudeDelta * vertSpeedMps * dt;

        var targetCamAlt = heldFlightAltitude + deltaAltMeters;
        var minAllowedCamAlt = groundUnderCam2 + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;

        if (!(deltaAltMeters < 0 && targetCamAlt < minAllowedCamAlt)) {
          var nextCamAlt = Math.max(minAllowedCamAlt, targetCamAlt);
          var pitchRad = (curPitch2 * Math.PI) / 180;
          var bearingRad = (curBearing2 * Math.PI) / 180;

          var prevHeightAboveGround = Math.max(10, heldFlightAltitude - groundUnderCenter2);
          var nextHeightAboveGround = Math.max(10, nextCamAlt - groundUnderCenter2);

          var zoomAdjust = -Math.log2(nextHeightAboveGround / prevHeightAboveGround);
          var nextZoomElev = Math.max(1.0, Math.min(20.5, map.getZoom() + zoomAdjust));

          // Counteract horizontal drift to keep gaze locked
          var deltaGroundDist = (nextHeightAboveGround - prevHeightAboveGround) * Math.tan(pitchRad);
          var deltaEast = deltaGroundDist * Math.sin(bearingRad);
          var deltaNorth = deltaGroundDist * Math.cos(bearingRad);

          var metersPerDegLat = CAMERA_CONSTANTS.METERS_PER_DEG_LAT;
          var latRad = (curCenter2.lat * Math.PI) / 180;
          var metersPerDegLng = metersPerDegLat * Math.max(0.1, Math.cos(latRad));

          var nextCenterLat = Math.max(-85, Math.min(85, curCenter2.lat + deltaNorth / metersPerDegLat));
          var nextCenterLng = curCenter2.lng + deltaEast / metersPerDegLng;

          heldFlightAltitude = nextCamAlt;
          map.jumpTo({
            center: [nextCenterLng, nextCenterLat],
            zoom: nextZoomElev
          });
        }
      }

      // 5. Horizontal Ground Flight (Arrow Keys) - Rock-solid Fixed Altitude Panning
      var hasHorizontalMove = moveForward !== 0 || moveStrafe !== 0;
      if (hasHorizontalMove) {
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

        // Predictive obstacle climb: ONLY climb when necessary to clear terrain
        var lookaheadMultiplier = dt > 0 ? CAMERA_CONSTANTS.LOOKAHEAD_SECONDS / dt : 1;
        var camLngLatH = info.camLngLat;
        var nextCamLat = Math.max(-85, Math.min(85, camLngLatH.lat + disp.deltaLat));
        var nextCamLng = camLngLatH.lng + disp.deltaLng;
        var lookCamLat = Math.max(-85, Math.min(85, nextCamLat + disp.deltaLat * lookaheadMultiplier));
        var lookCamLng = nextCamLng + disp.deltaLng * lookaheadMultiplier;

        var maxGroundCam = sampleTerrainObstacle(map, nextCamLng, nextCamLat, lookCamLng, lookCamLat);
        var groundCenter = map.queryTerrainElevation ? (map.queryTerrainElevation([disp.nextLng, disp.nextLat]) || 0) : 0;
        var highestObstacle = Math.max(maxGroundCam, groundCenter, info.groundElevation);

        var minAllowedAltH = highestObstacle + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
        if (minAllowedAltH > heldFlightAltitude) {
          // Smooth climb to clear terrain
          heldFlightAltitude = minAllowedAltH;
        }

        // Move horizontal center
        map.jumpTo({ center: [disp.nextLng, disp.nextLat] });

        // Maintain fixed target altitude without vertical bouncing
        adjustZoomForTargetAltitude(map, heldFlightAltitude);
      }

      // Live Telemetry notification
      try {
        var currentCam = getCameraInfo(map);
        if (currentCam && isFinite(currentCam.altitude) && options.onAltitudeChange) {
          options.onAltitudeChange(currentCam.altitude);
        }
      } catch (_) {}

      animationFrameId = requestAnimationFrame(flightStep);
    }

    function handleKeyDown(e) {
      if (isInputElementFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      var navCode = getNavigationCode(e);
      if (navCode) {
        e.preventDefault();
        activeKeys.add(navCode);
        if (e.shiftKey) activeKeys.add('ShiftLeft');

        if (options.onModeChange) options.onModeChange('flight');

        if (animationFrameId === null) {
          lastTimestamp = performance.now();
          var initialInfo = getCameraInfo(map);
          if (initialInfo) heldFlightAltitude = initialInfo.altitude;
          animationFrameId = requestAnimationFrame(flightStep);
        }
      }
    }

    function handleKeyUp(e) {
      var navCode = getNavigationCode(e);
      if (navCode) activeKeys.delete(navCode);
      activeKeys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || !e.shiftKey) {
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

    // Mouse Drag Panning Altitude Stabilizer
    // Keeps camera elevation fixed while mouse-dragging across 3D terrain
    function onMapMoveDuringDrag() {
      if (isAdjustingZoom) return;
      if (!map.isDragging || !map.isDragging()) return;
      if (!map.getTerrain || !map.getTerrain() || map.getPitch() < 5) return;

      var info = getCameraInfo(map);
      if (!info) return;

      if (mouseDragTargetAltitude === null) {
        mouseDragTargetAltitude = info.altitude;
        return;
      }

      isAdjustingZoom = true;
      try {
        // Automatic terrain clearance during mouse pan
        var groundCam = map.queryTerrainElevation ? (map.queryTerrainElevation(info.camLngLat) || 0) : 0;
        var groundCenter = map.queryTerrainElevation ? (map.queryTerrainElevation(info.center) || 0) : 0;
        var maxGround = Math.max(groundCam, groundCenter, info.groundElevation);
        var minAllowed = maxGround + CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
        if (minAllowed > mouseDragTargetAltitude) {
          mouseDragTargetAltitude = minAllowed;
        }

        var minClearance = CAMERA_CONSTANTS.MIN_CAMERA_CLEARANCE_METERS;
        var deltaZ_cur = Math.max(minClearance, info.altitude - info.groundElevation);
        var deltaZ_target = Math.max(minClearance, mouseDragTargetAltitude - info.groundElevation);

        if (Math.abs(deltaZ_cur - deltaZ_target) > 0.4) {
          var rawOffset = Math.log2(deltaZ_cur / deltaZ_target);
          var clampedOffset = Math.max(-0.6, Math.min(0.6, rawOffset));
          map.setZoom(Math.max(1.0, Math.min(22.0, map.getZoom() + clampedOffset)));
        }
      } finally {
        isAdjustingZoom = false;
      }
    }

    function onDragStart() {
      if (map.getTerrain && map.getTerrain() && map.getPitch() >= 5) {
        var info = getCameraInfo(map);
        if (info) mouseDragTargetAltitude = info.altitude;
      }
    }

    function onDragEnd() {
      mouseDragTargetAltitude = null;
    }

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

    var canvasContainer = map.getCanvasContainer ? map.getCanvasContainer() : map.getContainer();
    
    // Trackpad: Shift+scroll to tilt handler
    function handleCanvasWheel(e) {
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        var pitchDelta = -e.deltaY * 0.08;
        var curPitch = map.getPitch();
        var curZoom = map.getZoom();
        var nextPitch = clampPitch(curPitch + pitchDelta, curZoom);
        map.setPitch(nextPitch);
        if (options.onPitchChange) options.onPitchChange(Math.round(nextPitch));
        var info = getCameraInfo(map);
        if (info) {
          if (heldFlightAltitude === null) heldFlightAltitude = info.altitude;
          adjustZoomForTargetAltitude(map, heldFlightAltitude);
        }
        return;
      }
      if (animationFrameId !== null || activeKeys.size > 0) {
        stopFlight(true);
      }
    }

    function onCanvasPointerInteraction() {
      if (animationFrameId !== null || activeKeys.size > 0) {
        stopFlight(true);
      }
    }

    if (canvasContainer) {
      canvasContainer.addEventListener('mousedown', onCanvasPointerInteraction, { capture: true });
      canvasContainer.addEventListener('pointerdown', onCanvasPointerInteraction, { capture: true });
      canvasContainer.addEventListener('touchstart', onCanvasPointerInteraction, { capture: true, passive: true });
      canvasContainer.addEventListener('wheel', handleCanvasWheel, { capture: true, passive: false });
    }

    return function cleanup() {
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
  }

  return initKeyboardFlight;
});
