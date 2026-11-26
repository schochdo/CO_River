const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9229;
const TARGET_URL = 'http://localhost:8088/map.html?nocache=' + Date.now();

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--use-gl=angle',
    '--enable-webgl',
    '--window-size=1600,1050',
    'about:blank'
  ]);

  for (let i = 0; i < 20; i++) {
    await sleep(250);
    try {
      const v = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (v) break;
    } catch(e) {}
  }

  const tabs = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  let tab = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Page.enable');
  await send('Page.navigate', { url: TARGET_URL });
  await sleep(4000);

  // 1. Inspect Marble Canyon
  const marbleRes = await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      window.openReachPopupByReachId('marble_canyon');
      window.map.flyTo({ center: [-111.800, 36.450], zoom: 9.0, duration: 0 });
      await new Promise(res => setTimeout(res, 800));
      const popup = document.querySelector('.maplibregl-popup-content');
      return {
        reach: 'marble_canyon',
        text: popup ? popup.innerText : 'NO POPUP'
      };
    })()`,
    returnByValue: true
  });
  console.log('=== marble_canyon ===\n', marbleRes.result.value.text);
  await sleep(400);
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_marble_canyon_split.png', Buffer.from(ss.data, 'base64'));

  // 2. Inspect Grand Canyon Upper (Little Colorado to Phantom Ranch)
  const gcUpperRes = await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      window.openReachPopupByReachId('grand_canyon_upper');
      window.map.flyTo({ center: [-111.950, 36.120], zoom: 9.5, duration: 0 });
      await new Promise(res => setTimeout(res, 800));
      const popup = document.querySelector('.maplibregl-popup-content');
      return {
        reach: 'grand_canyon_upper',
        text: popup ? popup.innerText : 'NO POPUP'
      };
    })()`,
    returnByValue: true
  });
  console.log('=== grand_canyon_upper ===\n', gcUpperRes.result.value.text);
  await sleep(400);
  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_grand_canyon_upper_split.png', Buffer.from(ss.data, 'base64'));

  // 3. Zoom into the exact Little Colorado confluence to verify vertex snapping
  await send('Runtime.evaluate', {
    expression: `window.map.flyTo({ center: [-111.80046, 36.19363], zoom: 12.5, duration: 0 })`
  });
  await sleep(1000);
  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_lcr_confluence_zoom.png', Buffer.from(ss.data, 'base64'));

  ws.close();
  chromeProc.kill('SIGTERM');
})();
