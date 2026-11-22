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
    '--remote-debugging-port=9248',
    '--headless=new',
    '--no-sandbox',
    '--window-size=1400,900',
    'http://localhost:8088/index.html'
  ]);
  await sleep(1500);

  try {
    const targets = await fetchJson('http://localhost:9248/json/list');
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
    await send('Runtime.enable');
    await sleep(2000);

    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const links = Array.from(document.querySelectorAll('.sidebar-link')).map(el => ({
            id: el.id,
            text: el.innerText.trim().replace(/\\n/g, ' '),
            title: el.getAttribute('title')
          }));
          return links;
        })()
      `,
      returnByValue: true
    });

    console.log("Sidebar Links:", JSON.stringify(evalRes.result.value, null, 2));

    // Capture screenshot of sidebar
    const scr = await send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 270,
        height: 650,
        scale: 2
      }
    });

    if (scr && scr.data) {
      const outPath = '/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_sidebar_clean_labels.png';
      fs.writeFileSync(outPath, Buffer.from(scr.data, 'base64'));
      console.log('Saved screenshot to:', outPath);
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    chrome.kill('SIGKILL');
  }
})();
