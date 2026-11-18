const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9238;
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 1; this.callbacks = new Map(); }
  async connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => res();
      this.ws.onerror = rej;
      this.ws.onmessage = (msg) => {
        const r = JSON.parse(msg.data);
        if (r.id && this.callbacks.has(r.id)) {
          const cb = this.callbacks.get(r.id);
          this.callbacks.delete(r.id);
          if (r.error) cb.reject(r.error); else cb.resolve(r.result);
        }
      };
    });
  }
  async send(m, p = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method: m, params: p }));
    });
  }
  close() { if (this.ws) this.ws.close(); }
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`, '--headless=new', '--no-sandbox', '--window-size=1440,1100', 'about:blank'
  ]);
  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        if (list && list[0] && list[0].webSocketDebuggerUrl) {
          wsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
      await sleep(200);
    }
    if (!wsUrl) throw new Error('Could not connect to Chrome CDP');

    const cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    console.log('Navigating to http://localhost:8088/index.html...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await sleep(2000);

    // Click on Reservoirs tab
    console.log('Switching to Reservoirs tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('button[data-view="reservoirs"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reservoirs') || b.textContent.includes('Storage'));
        if (btn) btn.click();
      `
    });
    await sleep(1500);

    // Evaluate font family on the Mead Spillway Crest badge
    const fontInfo = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const spans = Array.from(document.querySelectorAll('span, div, strong'));
          const spillwaySpan = spans.find(el => el.textContent.trim() === '1,221.4 ft');
          const results = {};
          if (spillwaySpan) {
            const style = window.getComputedStyle(spillwaySpan);
            results.spillway = {
              text: spillwaySpan.textContent.trim(),
              fontFamily: style.fontFamily,
              fontVariantNumeric: style.fontVariantNumeric,
              fontWeight: style.fontWeight,
              className: spillwaySpan.className
            };
          }
          const powellSpan = spans.find(el => el.textContent.trim() === '3,700.0 ft');
          if (powellSpan) {
            const style = window.getComputedStyle(powellSpan);
            results.powell = {
              text: powellSpan.textContent.trim(),
              fontFamily: style.fontFamily,
              fontVariantNumeric: style.fontVariantNumeric,
              fontWeight: style.fontWeight,
              className: powellSpan.className
            };
          }
          return results;
        })()
      `
    });
    console.log('Computed font inspection on Reservoir cards:', JSON.stringify(fontInfo.result.value, null, 2));

    // Scroll to Lake Mead threshold cards and capture screenshot
    await cdp.send('Runtime.evaluate', {
      expression: `
        const spillway = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim() === '1,221.4 ft');
        if (spillway) {
          spillway.closest('.grid').scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      `
    });
    await sleep(500);

    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_reservoirs_font_clean.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Saved verified_reservoirs_font_clean.png');

    // Switch back to Overview tab
    console.log('Switching to Overview tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('button[data-view="overview"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Briefing') || b.textContent.includes('Overview'));
        if (btn) btn.click();
      `
    });
    await sleep(1000);

    // Evaluate font family on Act 1 and Act 2 figures
    const overviewFonts = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const spans = Array.from(document.querySelectorAll('span, strong, div'));
          const act1 = spans.find(el => el.textContent.trim() === '17.5 MAF/yr');
          const act2 = spans.find(el => el.textContent.trim() === '~48,000 cfs');
          return {
            act1: act1 ? { text: act1.textContent.trim(), fontFamily: window.getComputedStyle(act1).fontFamily, className: act1.className } : null,
            act2: act2 ? { text: act2.textContent.trim(), fontFamily: window.getComputedStyle(act2).fontFamily, className: act2.className } : null
          };
        })()
      `
    });
    console.log('Computed font inspection on Overview Act metrics:', JSON.stringify(overviewFonts.result.value, null, 2));

    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_overview_font_clean.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Saved verified_overview_font_clean.png');

    // Check profile mockup
    console.log('Navigating to http://localhost:8088/profile_mockup.html...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/profile_mockup.html' });
    await sleep(1500);

    const mockupFonts = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const readoutElev = document.getElementById('readout-elev');
          return {
            readoutElev: readoutElev ? { text: readoutElev.textContent.trim(), fontFamily: window.getComputedStyle(readoutElev).fontFamily, className: readoutElev.className } : null
          };
        })()
      `
    });
    console.log('Computed font inspection on Profile Mockup:', JSON.stringify(mockupFonts.result.value, null, 2));

    const shot3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_profile_mockup_font_clean.png'), Buffer.from(shot3.data, 'base64'));
    console.log('Saved verified_profile_mockup_font_clean.png');

    cdp.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
