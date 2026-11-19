const { spawn } = require('child_process');
const http = require('http');

const DEBUG_PORT = 9294;
const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(res => http.get(`http://127.0.0.1:${DEBUG_PORT}/json/list`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }));
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (m, p = {}) => new Promise(res => {
      const msgId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === msgId) { ws.removeEventListener('message', handler); res(msg.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });
    ws.addEventListener('message', e => {
      const d = JSON.parse(e.data);
      if (d.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', d.params.type, d.params.args.map(a => a.value || a.description).join(' '));
      }
      if (d.method === 'Runtime.exceptionThrown') {
        console.log('EXCEPTION:', d.params.exceptionDetails.text, d.params.exceptionDetails.exception?.description);
      }
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    await new Promise(r => setTimeout(r, 2500));

    const info = await send('Runtime.evaluate', {
      expression: `(() => {
        const m = window.map;
        if (!m) return "no map";
        const hasSrc = !!m.getSource("streamflow-gauges");
        const hasCircle = !!m.getLayer("streamflow-gauges-circle");
        const hasCasing = !!m.getLayer("streamflow-gauges-casing");
        const visCircle = hasCircle ? m.getLayoutProperty("streamflow-gauges-circle", "visibility") : null;
        const data = hasSrc ? m.getSource("streamflow-gauges")._data : null;
        const featCount = data && data.features ? data.features.length : 0;
        const rendered = hasCircle ? m.queryRenderedFeatures({ layers: ["streamflow-gauges-circle"] }).length : 0;
        const layers = m.getStyle().layers.map(l => l.id);
        const circleIndex = layers.indexOf("streamflow-gauges-circle");
        const top5Layers = layers.slice(-10);
        const toggleChecked = document.getElementById("toggle-streamflow-gauges")?.checked;
        return { hasSrc, hasCircle, hasCasing, visCircle, featCount, rendered, totalLayers: layers.length, circleIndex, top5Layers, toggleChecked };
      })()`,
      returnByValue: true
    });
    console.log('Map layer diagnostic:', info.result.value);

    // Also take screenshot to see what's actually rendered
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const fs = require('fs');
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/debug_gage_dots.png', Buffer.from(shot.data, 'base64'));
    console.log('Screenshot saved to debug_gage_dots.png');
  } catch (err) {
    console.error(err);
  } finally {
    try { chromeProc.kill('SIGKILL'); } catch (_) {}
  }
}, 1200);
