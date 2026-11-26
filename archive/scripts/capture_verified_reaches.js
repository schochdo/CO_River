const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9228;
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

  const reachesToTest = [
    { id: 'sanjuan_bluff_powell', file: 'verified_sanjuan_bluff_powell.png' },
    { id: 'sanjuan_shiprock_bluff', file: 'verified_sanjuan_shiprock_bluff.png' },
    { id: 'lower_basin_hoover_davis', file: 'verified_hoover_to_davis.png' },
    { id: 'lower_basin_davis_parker', file: 'verified_davis_to_parker.png' },
    { id: 'lower_basin_parker_paloverde', file: 'verified_parker_to_paloverde.png' },
    { id: 'lower_basin_paloverde_imperial', file: 'verified_paloverde_to_imperial.png' }
  ];

  for (const r of reachesToTest) {
    const res = await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        if (typeof window.openReachPopupByReachId !== 'function') return { error: 'openReachPopupByReachId not found' };
        window.openReachPopupByReachId('${r.id}');
        await new Promise(res => setTimeout(res, 800));
        const popup = document.querySelector('.maplibregl-popup-content');
        return {
          reach: '${r.id}',
          text: popup ? popup.innerText : 'NO POPUP'
        };
      })()`,
      returnByValue: true
    });

    console.log('=== ' + r.id + ' ===');
    console.log(res.result.value.text);
    console.log('--------------------------------------------------');

    await sleep(400);
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/' + r.file, Buffer.from(ss.data, 'base64'));
    console.log('Wrote ' + r.file + ' (' + ss.data.length + ' bytes base64)');
  }

  ws.close();
  chromeProc.kill('SIGTERM');
})();
