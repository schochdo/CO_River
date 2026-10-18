const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9227;
const TARGET_URL = 'http://localhost:8088/index.html';
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/bbab402d-c7b9-479d-b2e0-9fb8404a0e69';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);
        if (res.id && this.callbacks.has(res.id)) {
          const cb = this.callbacks.get(res.id);
          this.callbacks.delete(res.id);
          if (res.error) cb.reject(res.error);
          else cb.resolve(res.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('Spawning Chrome on port', DEBUG_PORT);
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=metal',
    '--no-sandbox',
    '--window-size=1600,1000',
    'about:blank'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      try {
        version = await fetchJson(`http://localhost:${DEBUG_PORT}/json/version`);
        if (version && version.webSocketDebuggerUrl) break;
      } catch (e) {
        await sleep(250);
      }
    }

    if (!version) throw new Error('Could not connect to Chrome debugging endpoint');

    const list = await fetchJson(`http://localhost:${DEBUG_PORT}/json/list`);
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;

    const cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('Navigating to ' + TARGET_URL);
    await cdp.send('Page.navigate', { url: TARGET_URL });

    console.log('Waiting 5s for dashboard & MapLibre to load...');
    await sleep(5000);

    // Zoom in to Farmington confluence
    console.log('Flying to Farmington confluence...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.map) {
          window.map.flyTo({ center: [-108.20, 36.72], zoom: 11.2, pitch: 0, duration: 0 });
        }
      `
    });
    await sleep(2500);

    // Capture Farmington confluence overview
    console.log('Capturing Farmington confluence overview...');
    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/farmington_confluence_overview.png`, Buffer.from(shot1.data, 'base64'));
    console.log('Captured farmington_confluence_overview.png');

    // Trigger popup on Upper San Juan reach
    console.log('Triggering popup on Upper San Juan reach (above Animas)...');
    const upperRes = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rSource = window.map.getSource('rivers');
          const data = rSource ? rSource._data : null;
          const sjUpper = data?.features?.find(f => f.properties.reach === 'sanjuan_upper');
          if (!sjUpper) return { error: 'sanjuan_upper not found' };
          
          const p = sjUpper.properties;
          const catBadge = '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#f0f9ff;padding:2px 6px;border-radius:4px;">Major Tributary</span>';
          const dataHtml = \`
            <div style="padding:2px;">
              <div style="margin-bottom:4px;">\${catBadge}</div>
              <strong style="font-size:13.5px;color:#0f172a;line-height:1.35;display:block;">\${p.name}</strong>
              <div style="margin: 6px 0; padding: 6px 10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:baseline;">
                <span style="font-size:11px; color:#64748b; font-weight:600;">Streamflow:</span>
                <span style="font-size:16px; font-weight:800; color:#0284c7;">\${Number(p.flow_cfs).toLocaleString()} <span style="font-size:10px; font-weight:600; color:#64748b;">cfs</span></span>
              </div>
              <div style="font-size:10px;font-weight:700;color:#0369a1;background:#f0f9ff;border:1px solid #bae6fd;padding:2px 6px;border-radius:4px;display:inline-block;margin-top:4px;">\${p.source_label}</div>
              <div style="font-size:11px;color:#475569;margin-top:4px;line-height:1.35;"><strong>Control / Station:</strong> \${p.gauge_info}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">\${p.notes}</div>
            </div>
          \`;
          
          const popupHtml = formatTabbedPopup({ dataHtml });
          const popup = new maplibregl.Popup({ offset: 10 }).setHTML(popupHtml);
          showFeaturePopup(popup, [-108.08, 36.69]);
          
          const popupCount = document.querySelectorAll('.maplibregl-popup').length;
          const hasTabBar = !!document.querySelector('.popup-tab-bar');
          const hasCodeBox = !!document.querySelector('.popup-code-box');
          return {
            reach: p.reach,
            flow_cfs: p.flow_cfs,
            popupCount,
            hasTabBar,
            hasCodeBox
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Upper San Juan Popup Eval Result:', upperRes.result?.value);
    await sleep(1500);

    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/farmington_upper_sanjuan_popup.png`, Buffer.from(shot2.data, 'base64'));
    console.log('Captured farmington_upper_sanjuan_popup.png');

    // Trigger popup on Lower San Juan reach
    console.log('Triggering popup on Lower San Juan reach (below Animas)...');
    const lowerRes = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rSource = window.map.getSource('rivers');
          const data = rSource ? rSource._data : null;
          const sjLower = data?.features?.find(f => f.properties.reach === 'sanjuan_river');
          if (!sjLower) return { error: 'sanjuan_river not found' };
          
          const p = sjLower.properties;
          const catBadge = '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#f0f9ff;padding:2px 6px;border-radius:4px;">Major Tributary</span>';
          const dataHtml = \`
            <div style="padding:2px;">
              <div style="margin-bottom:4px;">\${catBadge}</div>
              <strong style="font-size:13.5px;color:#0f172a;line-height:1.35;display:block;">\${p.name}</strong>
              <div style="margin: 6px 0; padding: 6px 10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:baseline;">
                <span style="font-size:11px; color:#64748b; font-weight:600;">Streamflow:</span>
                <span style="font-size:16px; font-weight:800; color:#0284c7;">\${Number(p.flow_cfs).toLocaleString()} <span style="font-size:10px; font-weight:600; color:#64748b;">cfs</span></span>
              </div>
              <div style="font-size:10px;font-weight:700;color:#0369a1;background:#f0f9ff;border:1px solid #bae6fd;padding:2px 6px;border-radius:4px;display:inline-block;margin-top:4px;">\${p.source_label}</div>
              <div style="font-size:11px;color:#475569;margin-top:4px;line-height:1.35;"><strong>Control / Station:</strong> \${p.gauge_info}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">\${p.notes}</div>
            </div>
          \`;
          
          const popupHtml = formatTabbedPopup({ dataHtml });
          const popup = new maplibregl.Popup({ offset: 10 }).setHTML(popupHtml);
          showFeaturePopup(popup, [-108.35, 36.73]);
          
          const popupCount = document.querySelectorAll('.maplibregl-popup').length;
          const hasTabBar = !!document.querySelector('.popup-tab-bar');
          const hasCodeBox = !!document.querySelector('.popup-code-box');
          return {
            reach: p.reach,
            flow_cfs: p.flow_cfs,
            popupCount,
            hasTabBar,
            hasCodeBox
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Lower San Juan Popup Eval Result:', lowerRes.result?.value);
    await sleep(1500);

    const shot3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/farmington_lower_sanjuan_popup.png`, Buffer.from(shot3.data, 'base64'));
    console.log('Captured farmington_lower_sanjuan_popup.png');

    cdp.close();
    console.log('All verification tasks finished!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    chrome.kill('SIGTERM');
  }
}

run();
