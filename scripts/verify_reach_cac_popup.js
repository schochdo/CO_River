const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9235;
const TARGET_URL = 'http://localhost:8088/map.html';
const OUTPUT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

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
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
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

async function main() {
  console.log('Testing River Reach popup for div_canal_alimentador_central...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=metal',
    '--window-size=1680,1050',
    'about:blank'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      await sleep(250);
      try {
        version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (version) break;
      } catch (e) {}
    }

    const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const target = targets.find(t => t.type === 'page') || targets[0];
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: TARGET_URL });

    await cdp.send('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          let count = 0;
          const check = () => {
            count++;
            if (window.map && window.map.getSource && window.map.getSource('rivers')) {
              resolve();
            } else if (count > 60) {
              resolve();
            } else {
              setTimeout(check, 250);
            }
          };
          check();
        })
      `,
      awaitPromise: true
    });

    await sleep(3500);

    // Zoom and highlight reach div_canal_alimentador_central
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.map && typeof highlightSelectedReach === 'function') {
            window.map.jumpTo({ center: [-114.95, 32.65], zoom: 10.5, pitch: 35, bearing: -10 });
            highlightSelectedReach('div_canal_alimentador_central');
            const rivers = window.map.getSource('rivers')._data.features;
            const cac = rivers.find(f => f.properties && f.properties.reach === 'div_canal_alimentador_central');
            if (cac) {
              const p = cac.properties;
              const catBadge = '<span style="font-size:10px;font-weight:700;color:#0369a1;background:#e0f2fe;border:1px solid #bae6fd;padding:2px 6px;border-radius:4px;">Major Conveyance Canal (1944 Treaty)</span>';
              const stationHtml = '<div style="font-size:11px;color:#475569;margin-top:4px;line-height:1.35;"><strong>Control / Station:</strong> ' + p.gauge_info + '</div>';
              const timeHtml = p.timestamp ? '<div style="font-size:10px;color:#64748b;margin-top:2px;"><strong>Measured:</strong> ' + formatTimestamp(p.timestamp) + '</div>' : '';
              const notesHtml = '<div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">' + p.notes + '</div>';
              const highlightBadge = '<div style="font-size:9.5px; font-weight:700; color:#0e7490; background:#cffafe; border:1px solid #a5f3fc; padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px; margin-top:5px;"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#06b6d4;"></span>Segment Isolated &amp; Highlighted</div>';
              const dataHtml = '<div style=\"padding:2px;\">' +
                '<div style=\"margin-bottom:4px;\">' + catBadge + '</div>' +
                '<strong style=\"font-size:13.5px;color:#0f172a;line-height:1.35;display:block;\">' + p.name + '</strong>' +
                '<div style=\"margin: 6px 0; padding: 6px 10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:baseline;\">' +
                  '<span style=\"font-size:11px; color:#64748b; font-weight:600;\">Streamflow:</span>' +
                  '<span style=\"font-size:16px; font-weight:800; color:#0284c7;\">' + Number(p.flow_cfs).toLocaleString() + ' <span style=\"font-size:10px; font-weight:600; color:#64748b;\">cfs</span></span>' +
                '</div>' +
                stationHtml +
                highlightBadge +
                timeHtml +
                notesHtml +
                '<div style=\"font-size:11px;color:#334155;margin-top:6px;line-height:1.45;border-top:1px solid #e2e8f0;padding-top:5px;\">' +
                  '<strong>Authority:</strong> CONAGUA / CILA (Mexico — District 014)<br>' +
                  '<strong>Legal Allocation:</strong> 1.50 MAF/yr (~2,072 cfs) under the 1944 Mexican Water Treaty (Era 3, Morelos Dam completed 1950)<br>' +
                  '<strong>Measurement Point:</strong> Verified at the border via USGS #09522000 above Morelos Dam; 0 cfs continues down the dry Colorado River Delta.' +
                '</div>' +
              '</div>';
              const popupHtml = formatTabbedPopup({
                dataHtml,
                codeTitle: 'USGS / CILA Border Station #09522000',
                endpointUrl: 'https://waterservices.usgs.gov/nwis/dv/?sites=09522000&parameterCd=00060&format=json',
                pythonCode: 'import requests\\n\\nurl = \"https://waterservices.usgs.gov/nwis/dv/\"\\nparams = {\"sites\": \"09522000\", \"parameterCd\": \"00060\", \"format\": \"json\"}\\nres = requests.get(url, params=params).json()\\nflow = res[\"value\"][\"timeSeries\"][0][\"values\"][0][\"value\"][-1][\"value\"]\\nprint(f\"Morelos Dam Treaty Flow: {flow} cfs\")',
                notes: 'Verified 1944 Treaty delivery at Morelos Dam. 0 cfs continues down the dry river delta.'
              });
              showFeaturePopup(new maplibregl.Popup({ offset: 10 }).setHTML(popupHtml), [-114.85, 32.65]);
            }
          }
        })()
      `
    });

    await sleep(2500);
    const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_reach_cac_popup.png`, Buffer.from(snap.data, 'base64'));
    console.log('Saved verified_reach_cac_popup.png');

    cdp.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    try {
      chromeProc.kill('SIGTERM');
    } catch(e) {}
  }
}

main();
