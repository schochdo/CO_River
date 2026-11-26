/**
 * Automated Verification Script for iPad / Tablet Safari Viewport
 * 
 * Verifies:
 * 1. iPad Landscape (1024x768) and Portrait (810x1080)
 * 2. Left sidebar navigation bottom pinned utilities are 100% visible (not cut off)
 * 3. Map Legend button and card are 100% visible (not cut off at bottom)
 * 4. Gyroscope / Trackball 3D dial is 100% visible (not cut off at bottom)
 * 5. Captures visual verification screenshots
 */

const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');
const fs = require('fs');

async function run() {
  console.log('=== STARTING IPAD SAFARI VIEWPORT VERIFICATION SUITE ===\n');

  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const DEBUG_PORT = 9286;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    'about:blank'
  ]);

  try {
    let list = null;
    for (let i = 0; i < 25; i++) {
      try {
        list = await new Promise((res, rej) => {
          http.get(`http://127.0.0.1:${DEBUG_PORT}/json/list`, r => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
          }).on('error', rej);
        });
        if (list && list[0]) break;
      } catch (_) {}
      await new Promise(r => setTimeout(r, 200));
    }

    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (m, p = {}) => new Promise((resolve, reject) => {
      const cur = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === cur) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });

    await send('Runtime.enable');
    await send('Page.enable');

    // Emulate iPad Landscape (1024 x 768)
    console.log('--- Test 1: Simulating iPad Landscape Viewport (1024x768) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1024,
      height: 768,
      deviceScaleFactor: 2,
      mobile: true,
      fitWindow: false
    });
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    });

    await send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await new Promise(r => setTimeout(r, 2500));

    // Check Sidebar Bottom Navigation Utilities Visibility
    const sidebarMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const aside = document.querySelector('.sidebar-academic');
        const asideRect = aside ? aside.getBoundingClientRect() : null;
        const btnFullscreen = document.getElementById('btn-fullscreen');
        const fsRect = btnFullscreen ? btnFullscreen.getBoundingClientRect() : null;
        const vh = window.innerHeight;
        return {
          vh,
          asideBottom: asideRect ? asideRect.bottom : null,
          fullscreenBottom: fsRect ? fsRect.bottom : null,
          fullscreenVisible: fsRect ? (fsRect.bottom <= vh && fsRect.top >= 0) : false
        };
      })()`,
      returnByValue: true
    });

    console.log('Sidebar Navigation Metrics at 1024x768:', JSON.stringify(sidebarMetrics.result.value, null, 2));
    assert(sidebarMetrics.result.value.fullscreenVisible, 'Sidebar fullscreen button must be visible within viewport');
    assert(sidebarMetrics.result.value.fullscreenBottom <= sidebarMetrics.result.value.vh, 'Sidebar bottom utilities must not exceed viewport height');
    console.log('✓ Test 1 Passed: Sidebar navigation bottom utilities completely on screen.');

    // Now switch to System Map tab
    console.log('\n--- Test 2: Checking Map Embed Elements at 1024x768 iPad Viewport ---');
    await send('Runtime.evaluate', { expression: `setTab('map')` });
    await new Promise(r => setTimeout(r, 3000));

    // Directly evaluate inside map_embed iframe
    const mapElementsMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('iframe-map');
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const legend = doc.querySelector('.map-legend');
        const trackball = doc.getElementById('trackball-nav-control');
        const tray = doc.querySelector('.map-gage-tray');
        const vh = doc.documentElement.clientHeight || window.innerHeight;

        const legRect = legend ? legend.getBoundingClientRect() : null;
        const tbRect = trackball ? trackball.getBoundingClientRect() : null;
        const trayRect = tray ? tray.getBoundingClientRect() : null;

        return {
          docHeight: vh,
          legend: {
            top: legRect ? legRect.top : null,
            bottom: legRect ? legRect.bottom : null,
            height: legRect ? legRect.height : null,
            isOnScreen: legRect ? (legRect.bottom <= vh && legRect.top >= 0) : false
          },
          trackball: {
            top: tbRect ? tbRect.top : null,
            bottom: tbRect ? tbRect.bottom : null,
            height: tbRect ? tbRect.height : null,
            isOnScreen: tbRect ? (tbRect.bottom <= vh && tbRect.top >= 0) : false
          },
          tray: {
            top: trayRect ? trayRect.top : null,
            bottom: trayRect ? trayRect.bottom : null,
            isOnScreen: trayRect ? (trayRect.bottom <= vh && trayRect.top >= 0) : false
          }
        };
      })()`,
      returnByValue: true
    });

    console.log('Map Elements Metrics at 1024x768:', JSON.stringify(mapElementsMetrics.result.value, null, 2));
    assert(mapElementsMetrics.result.value.legend.isOnScreen, 'Map Legend must be 100% on screen');
    assert(mapElementsMetrics.result.value.trackball.isOnScreen, 'Trackball Gyroscope must be 100% on screen');
    console.log('✓ Test 2 Passed: Map Legend and Trackball Gyroscope completely visible within viewport.');

    // Capture visual screenshot of iPad Landscape
    const landscapeScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const landscapePath = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_ipad_landscape.png';
    fs.writeFileSync(landscapePath, Buffer.from(landscapeScreenshot.data, 'base64'));
    console.log(`✓ Saved iPad Landscape screenshot: ${landscapePath}`);

    // Emulate iPad Portrait (810 x 1080)
    console.log('\n--- Test 3: Simulating iPad Portrait Viewport (810x1080) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 810,
      height: 1080,
      deviceScaleFactor: 2,
      mobile: true,
      fitWindow: false
    });
    await new Promise(r => setTimeout(r, 1500));

    const portraitMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const iframe = document.getElementById('iframe-map');
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const legend = doc.querySelector('.map-legend');
        const trackball = doc.getElementById('trackball-nav-control');
        const vh = doc.documentElement.clientHeight || window.innerHeight;

        const legRect = legend ? legend.getBoundingClientRect() : null;
        const tbRect = trackball ? trackball.getBoundingClientRect() : null;

        return {
          vh,
          legendBottom: legRect ? legRect.bottom : null,
          legendOnScreen: legRect ? (legRect.bottom <= vh && legRect.top >= 0) : false,
          trackballBottom: tbRect ? tbRect.bottom : null,
          trackballOnScreen: tbRect ? (tbRect.bottom <= vh && tbRect.top >= 0) : false
        };
      })()`,
      returnByValue: true
    });

    console.log('Map Elements Metrics at 810x1080 (Portrait):', JSON.stringify(portraitMetrics.result.value, null, 2));
    assert(portraitMetrics.result.value.legendOnScreen, 'Map Legend must be on screen in portrait');
    assert(portraitMetrics.result.value.trackballOnScreen, 'Trackball must be on screen in portrait');
    console.log('✓ Test 3 Passed: Legend and Trackball 100% on screen in iPad Portrait mode.');

    const portraitScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const portraitPath = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_ipad_portrait.png';
    fs.writeFileSync(portraitPath, Buffer.from(portraitScreenshot.data, 'base64'));
    console.log(`✓ Saved iPad Portrait screenshot: ${portraitPath}`);

    console.log('\n=== ALL IPAD SAFARI VIEWPORT ASSERTIONS PASSED WITH 100% SUCCESS ===');

  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
