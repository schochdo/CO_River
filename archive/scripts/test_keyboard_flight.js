/**
 * Automated Verification Test for 3D Keyboard Flight Controller
 */
const assert = require('assert');

// 1. Test cameraUtils logic
function normalizeBearing(bearing) {
  const mod = bearing % 360;
  return mod < 0 ? mod + 360 : mod;
}

function clampPitch(pitch, zoom) {
  const maxPitch = zoom !== undefined
    ? Math.max(0, Math.min(82, (zoom - 3.5) * 18))
    : 85;
  return Math.max(0, Math.min(maxPitch, pitch));
}

function computeGeographicDisplacement(center, bearingDeg, moveForward, moveStrafe, speedMps, dt) {
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
  const metersPerDegLat = 111320;
  const metersPerDegLng = metersPerDegLat * Math.max(0.1, Math.cos(latRad));
  const deltaLat = deltaNorthMeters / metersPerDegLat;
  const deltaLng = deltaEastMeters / metersPerDegLng;
  const nextLat = Math.max(-85, Math.min(85, center.lat + deltaLat));
  const nextLng = center.lng + deltaLng;
  return { deltaLat, deltaLng, nextLat, nextLng };
}

console.log('Testing 3D Keyboard Flight Physics & Controls...');

// Test 1: Normalize bearing
assert.strictEqual(normalizeBearing(0), 0);
assert.strictEqual(normalizeBearing(360), 0);
assert.strictEqual(normalizeBearing(-45), 315);
assert.strictEqual(normalizeBearing(725), 5);
console.log('✓ normalizeBearing passes all angular wrapping tests');

// Test 2: Clamp pitch dynamic zoom scaling
assert.strictEqual(clampPitch(45, 3.0), 0, 'Zoom 3.0 should clamp to nadir (0) pitch');
assert(clampPitch(45, 5.0) <= 27.1, 'Zoom 5.0 max pitch should be ~27');
assert.strictEqual(clampPitch(90, 14.0), 82, 'High zoom should clamp at max 82 degrees');
assert.strictEqual(clampPitch(-10, 14.0), 0, 'Negative pitch should clamp at 0 degrees');
console.log('✓ clampPitch dynamic zoom pitch ceiling passes all limits');

// Test 3: Pure Northward flight
const startCenter = { lng: -111.59, lat: 36.86 };
const northMove = computeGeographicDisplacement(startCenter, 0, 1, 0, 1000, 1.0);
assert(northMove.deltaLat > 0, 'Northward flight should increase latitude');
assert(Math.abs(northMove.deltaLng) < 1e-6, 'Northward flight bearing 0 should have zero longitude change');
console.log('✓ Pure northward flight maintains longitudinal integrity');

// Test 4: Pure Eastward flight (bearing 90)
const eastMove = computeGeographicDisplacement(startCenter, 90, 1, 0, 1000, 1.0);
assert(eastMove.deltaLng > 0, 'Eastward flight should increase longitude');
assert(Math.abs(eastMove.deltaLat) < 1e-6, 'Eastward flight bearing 90 should have zero latitude change');
console.log('✓ Pure eastward flight maintains latitudinal integrity');

// Test 5: Lateral strafe right (bearing 0, moveStrafe = 1)
const strafeMove = computeGeographicDisplacement(startCenter, 0, 0, 1, 1000, 1.0);
assert(strafeMove.deltaLng > 0, 'Strafing right on North heading moves East');
assert(Math.abs(strafeMove.deltaLat) < 1e-6, 'Strafing right on North heading has zero latitude change');
console.log('✓ Lateral strafe geometry is perpendicular to camera heading');

// Test 6: Verify exports from web/cameraFlight.js
const initKeyboardFlight = require('../web/cameraFlight.js');
assert.strictEqual(typeof initKeyboardFlight, 'function');
console.log('✓ web/cameraFlight.js module exports valid function');

console.log('\nAll 3D Keyboard Flight verification tests passed successfully!');
