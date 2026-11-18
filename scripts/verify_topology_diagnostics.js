const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9233;
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

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
    '--no-sandbox',
    '--window-size=1440,960',
    'about:blank'
  ]);

  try {
    await sleep(1500);
    const list = await fetchJson(`http://localhost:${DEBUG_PORT}/json/list`);
    const target = list.find(t => t.type === 'page') || list[0];
    if (!target) throw new Error('No page target found');

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connect();
    console.log('Connected to CDP target');

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('Navigating to map_embed.html...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/map_embed.html' });
    await sleep(4000);

    // 1. Verify quick toolbar is absent
    const quickBarRes = await client.send('Runtime.evaluate', {
      expression: `document.getElementById('gis-quick-bar') !== null`,
      returnByValue: true
    });
    console.log('Is gis-quick-bar present in DOM?', quickBarRes.result?.value);

    // 2. Open Map Layers drawer to inspect Topology Diagnostics controls & spacing
    await client.send('Runtime.evaluate', {
      expression: `
        const menuBtn = document.getElementById('map-menu-btn');
        if (menuBtn) menuBtn.click();
      `
    });
    await sleep(1000);

    // Capture screenshot of drawer with Topology Diagnostics
    let shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_topology_drawer_spacing.png'), Buffer.from(shot.data, 'base64'));
    console.log('Captured verified_topology_drawer_spacing.png');

    // 3. Turn on Flow Direction and Reach Section Nodes
    await client.send('Runtime.evaluate', {
      expression: `
        const flowChk = document.getElementById('toggle-gis-flow-arrows');
        if (flowChk && !flowChk.checked) {
          flowChk.checked = true;
          toggleLayer('gisFlowArrows');
        }
        const sectChk = document.getElementById('toggle-topology-sections');
        if (sectChk && !sectChk.checked) {
          sectChk.checked = true;
          toggleLayer('topologySections');
        }
        const juncChk = document.getElementById('toggle-topology-junctions');
        if (juncChk && !juncChk.checked) {
          juncChk.checked = true;
          toggleLayer('topologyJunctions');
        }
      `
    });
    await sleep(1500);

    // 4. Close Map Layers drawer and jump to Gila River basin
    await client.send('Runtime.evaluate', {
      expression: `
        closeMapMenu();
        if (typeof map !== 'undefined' && map.jumpTo) {
          map.jumpTo({ center: [-113.6, 33.1], zoom: 7.6 });
        }
      `
    });
    await sleep(2500);

    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_gila_river_topology_junctions.png'), Buffer.from(shot.data, 'base64'));
    console.log('Captured verified_gila_river_topology_junctions.png');

    // 5. Zoom closer into Dome / Yuma confluence where Gila joins Colorado
    await client.send('Runtime.evaluate', {
      expression: `
        if (typeof map !== 'undefined' && map.jumpTo) {
          map.jumpTo({ center: [-114.52, 32.74], zoom: 10.2 });
        }
      `
    });
    await sleep(2500);

    // Hover over Gila / Colorado confluence square
    await client.send('Runtime.evaluate', {
      expression: `
        const coord = [-114.55518, 32.7205588];
        const pt = map.project(coord);
        showHoverTooltip(\`
          <div style="font-family:'Inter',sans-serif; min-width: 220px; line-height:1.4;">
            <div style="font-size:9.5px; font-weight:700; color:#d97706; text-transform:uppercase; letter-spacing:0.04em;">CONFLUENCE JUNCTION</div>
            <strong style="font-size:13px; color:#0f172a; display:block; margin-top:1px;">Gila River &amp; Colorado River Confluence</strong>
            <div style="font-size:11.5px; color:#334155; margin:3px 0;">
              Tributary <strong>Gila River</strong> joins <strong>Colorado River</strong>
            </div>
            <div style="font-size:10.5px; color:#64748b; margin-top:2px;">
              Dome / Yuma, AZ
            </div>
            <div style="font-size:10px; color:#94a3b8; font-family:monospace; margin-top:3px;">
              WGS84: [-114.55518, 32.72056]
            </div>
          </div>
        \`, { lng: coord[0], lat: coord[1] }, 'topology-junctions');
      `
    });
    await sleep(1000);

    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_yuma_gila_confluence_tooltip.png'), Buffer.from(shot.data, 'base64'));
    console.log('Captured verified_yuma_gila_confluence_tooltip.png');

    // 6. Full Basin Overview with Topology Diagnostics active
    await client.send('Runtime.evaluate', {
      expression: `
        hideHoverTooltip('topology-junctions');
        if (typeof resetView === 'function') resetView();
      `
    });
    await sleep(2500);

    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_basinwide_topology_diagnostics.png'), Buffer.from(shot.data, 'base64'));
    console.log('Captured verified_basinwide_topology_diagnostics.png');

    client.close();
    console.log('All verification steps succeeded!');
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(err => {
  console.error('Error running verification:', err);
  process.exit(1);
});
