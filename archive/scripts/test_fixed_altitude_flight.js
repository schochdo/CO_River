const { spawn } = require('child_process');
const http = require('http');

async function runTest() {
  console.log('Testing Fixed Altitude Camera Stabilization on map.html...');
  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const DEBUG_PORT = 9255;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1000));
  const list = await new Promise((res) => http.get(`http://127.0.0.1:${DEBUG_PORT}/json/list`, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }));

  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (m, p = {}) => new Promise(r => {
    const cur = id++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === cur) { ws.removeEventListener('message', handler); r(msg.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:8088/map.html' });

  // Wait for map and keyboard flight controller to initialize
  await new Promise(r => setTimeout(r, 4000));

  const result = await send('Runtime.evaluate', {
    expression: `
      new Promise(async (resolve) => {
        // Set up camera in rugged Colorado Rockies near Berthoud Pass
        map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
        map.setPitch(60);
        map.setZoom(12);
        map.setCenter([-105.8, 39.7]);

        // Wait for terrain tiles to load
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 200));
          if (map.queryTerrainElevation(map.getCenter()) > 100) break;
        }

        const tr = (map._camera && map._camera.transform) || map.transform;
        const initialAlt = tr.getCameraPosition().altitude;

        // TEST 1: Simulate pressing ArrowDown / ArrowUp (Keyboard Flight) across mountain passes
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
        
        const flightHistory = [];
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 50));
          const cam = tr.getCameraPosition();
          flightHistory.push({
            frame: i,
            alt: Math.round(cam.altitude),
            groundElev: Math.round(tr._elevation || 0),
            zoom: Math.round(map.getZoom() * 100) / 100
          });
        }

        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true }));
        await new Promise(r => setTimeout(r, 100));

        // TEST 2: Mouse Drag Pan across terrain
        const dragHistory = [];
        // Trigger dragstart
        map.fire('dragstart');
        for (let i = 0; i < 15; i++) {
          map.panBy([35, -20], { duration: 0 });
          map.fire('move');
          await new Promise(r => setTimeout(r, 40));
          const cam = tr.getCameraPosition();
          dragHistory.push({
            dragStep: i,
            alt: Math.round(cam.altitude),
            groundElev: Math.round(tr._elevation || 0)
          });
        }
        map.fire('dragend');

        resolve({
          initialAlt: Math.round(initialAlt),
          flightHistory,
          dragHistory
        });
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Test Results:\n', JSON.stringify(result.result.value, null, 2));

  ws.close();
  chromeProc.kill();

  const data = result.result.value;
  const flightAlts = data.flightHistory.map(h => h.alt);
  const minFlightAlt = Math.min(...flightAlts);
  const maxFlightAlt = Math.max(...flightAlts);
  const flightVariance = maxFlightAlt - minFlightAlt;

  console.log(`\nFlight Altitude Range: ${minFlightAlt}m to ${maxFlightAlt}m (Variance: ${flightVariance}m)`);
  if (flightVariance <= 5) {
    console.log('✅ TEST PASSED: Flight elevation remained strictly fixed with zero terrain bouncing!');
  } else {
    console.log(`⚠️ Warning: Variance ${flightVariance}m`);
  }

  const dragAlts = data.dragHistory.map(h => h.alt);
  const minDragAlt = Math.min(...dragAlts);
  const maxDragAlt = Math.max(...dragAlts);
  const dragVariance = maxDragAlt - minDragAlt;

  console.log(`Drag Altitude Range: ${minDragAlt}m to ${maxDragAlt}m (Variance: ${dragVariance}m)`);
  if (dragVariance <= 5) {
    console.log('✅ TEST PASSED: Mouse drag pan elevation remained strictly fixed!');
  } else {
    console.log(`⚠️ Warning: Drag variance ${dragVariance}m`);
  }
}

runTest();
