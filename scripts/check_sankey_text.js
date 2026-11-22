const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => res(JSON.parse(data)));
    }).on('error', rej);
  });
}

class CDP {
  constructor(url) { this.url = url; this.ws = null; this.id = 1; this.cbs = new Map(); }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = res;
      this.ws.onerror = rej;
      this.ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id && this.cbs.has(d.id)) {
          const cb = this.cbs.get(d.id);
          this.cbs.delete(d.id);
          if (d.error) cb.rej(d.error); else cb.res(d.result);
        }
      };
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.cbs.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { if (this.ws) this.ws.close(); }
}

(async () => {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9244',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1440,900'
  ]);
  await sleep(1500);
  try {
    const targets = await fetchJson('http://localhost:9244/json');
    const page = targets.find(t => t.type === 'page');
    const cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/sankey.html' });
    await sleep(2500);

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/check_sankey_current.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved check_sankey_current.png');

    const info = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const texts = Array.from(document.querySelectorAll("svg text"));
        return texts.filter(t => t.textContent.includes("BASIN") || t.textContent.includes("Losses")).map(t => {
          const b = t.getBoundingClientRect();
          return { text: t.textContent.trim(), rect: { x: b.x, y: b.y, w: b.width, h: b.height } };
        });
      })()`,
      returnByValue: true
    });
    console.log('Text positions:', JSON.stringify(info.result.value, null, 2));

    cdp.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chrome.kill();
  }
})();
