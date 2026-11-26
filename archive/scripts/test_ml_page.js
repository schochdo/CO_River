const { spawn } = require('child_process');
const http = require('http');

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
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9310',
    '--headless=new',
    'about:blank'
  ]);
  await sleep(1500);
  const list = await fetchJson('http://localhost:9310/json/list');
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) => new Promise(r => {
    const id = Math.floor(Math.random()*10000);
    const handler = (event) => {
      const res = JSON.parse(event.data);
      if (res.id === id) { ws.removeEventListener('message', handler); r(res); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });
  await sleep(3000);

  const res = await send('Runtime.evaluate', {
    expression: `typeof Chart !== "undefined" ? "Chart loaded" : "Chart not loaded"`,
    returnByValue: true
  });
  console.log('Result:', res.result.result.value);
  chrome.kill('SIGKILL');
})();
