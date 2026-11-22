const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(u) {
  return new Promise((r, j) => http.get(u, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }).on('error', j));
}

(async () => {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9246',
    '--headless=new',
    '--no-sandbox',
    '--window-size=1600,1200',
    'http://localhost:8088/map_embed.html'
  ]);
  await sleep(1500);

  try {
    const targets = await fetchJson('http://localhost:9246/json/list');
    const pt = targets.find(t => t.type === 'page');
    const ws = new WebSocket(pt.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (m, p = {}) => new Promise(r => {
      const curId = id++;
      const handler = (msg) => {
        const d = JSON.parse(msg.data);
        if (d.id === curId) { ws.removeEventListener('message', handler); r(d.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

    await send('Page.enable');
    await sleep(2000); // wait for map to load

    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const s = cachedMetrics?.streamflows?.find(x => x.id === 'USBR-HOOVER');
        if (!s) return { error: 'USBR-HOOVER not found' };
        const html = formatGaugePopup(s);
        const popup = new maplibregl.Popup({ offset: 10 })
          .setLngLat([s.lon, s.lat])
          .setHTML(html)
          .addTo(map);
        return {
          id: s.id,
          name: s.name,
          html: html
        };
      })()`,
      returnByValue: true
    });

    console.log('Result:', JSON.stringify(res, null, 2));

    await sleep(1000);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_hoover_popup.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved verified_hoover_popup.png');

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
})();
