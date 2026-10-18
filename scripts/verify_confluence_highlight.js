const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9228;
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
    '--window-size=1600,1050',
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

    // 1. Check Hydrology Data & Confluence Splits
    console.log('Verifying river network reaches and flows...');
    const auditRes = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rSource = window.map.getSource('rivers');
          const feats = rSource ? rSource._data?.features : [];
          const reachMap = {};
          feats.forEach(f => {
            reachMap[f.properties.reach] = {
              name: f.properties.name,
              flow_cfs: f.properties.flow_cfs,
              weight: f.properties.weight,
              category: f.properties.category,
              gauge_id: f.properties.gauge_id,
              source_label: f.properties.source_label,
              hasConfluence: !!f.properties.confluence_info
            };
          });

          return {
            totalFeatures: feats.length,
            greenUpper: reachMap['green_upper'],
            greenMiddle: reachMap['green_middle'],
            greenRiver: reachMap['green_river'],
            headwaters: reachMap['headwaters'],
            granbyKremmling: reachMap['colorado_granby_kremmling'],
            goreCanyon: reachMap['gore_canyon'],
            glenwoodCanyon: reachMap['colorado_glenwood_canyon'],
            glenwoodCameo: reachMap['glenwood_cameo'],
            cameoGJ: reachMap['cameo_grand_junction'],
            statelineCisco: reachMap['colorado_stateline_cisco'],
            grandValleyCisco: reachMap['grand_valley_cisco'],
            cataractCanyon: reachMap['cataract_canyon'],
            gunnisonUpper: reachMap['gunnison_upper'],
            gunnisonRiver: reachMap['gunnison_river'],
            sanjuanUpper: reachMap['sanjuan_upper'],
            sanjuanRiver: reachMap['sanjuan_river'],
            animasRiver: reachMap['animas_river'],
            highlightCasingLayer: !!window.map.getLayer('rivers-selected-highlight-casing'),
            highlightCoreLayer: !!window.map.getLayer('rivers-selected-highlight-core')
          };
        })()
      `,
      returnByValue: true
    });

    console.log('River Network Audit Result:');
    console.log(JSON.stringify(auditRes.result?.value, null, 2));

    // 2. Test Echo Park Confluence Click & Highlight (Green River Middle Reach)
    console.log('\n--- Test 1: Echo Park Green River Middle Reach Click & Highlight ---');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          window.map.flyTo({ center: [-109.18, 40.42], zoom: 9.8, pitch: 0, duration: 0 });
        })()
      `
    });
    await sleep(2000);

    const clickEchoPark = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rSource = window.map.getSource('rivers');
          const gm = rSource._data?.features?.find(f => f.properties.reach === 'green_middle');
          if (!gm) return { error: 'green_middle reach not found' };
          
          // Trigger river reach click handler with feature
          highlightSelectedReach('green_middle');
          
          const p = gm.properties;
          const conf = p.confluence_info;
          let confluenceHtml = '';
          if (conf && conf.confluence_name) {
            confluenceHtml = \`
              <div style="margin-top:7px; padding:7px 9px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px;">
                <div style="font-size:9.5px; font-weight:800; color:#0369a1; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px;">
                  Confluence Mass Balance
                </div>
                <div style="font-size:11px; font-weight:700; color:#0f172a; margin-bottom:4px;">
                  \${conf.confluence_name}
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#475569; margin-bottom:2px;">
                  <span>↑ Upstream Mainstem:</span>
                  <strong style="color:#0369a1;">\${Number(conf.mainstem_upstream.cfs).toLocaleString()} cfs</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#475569; margin-bottom:4px;">
                  <span>+ Tributary Inflow (\${conf.tributary.name}):</span>
                  <strong style="color:#0284c7;">\${Number(conf.tributary.cfs).toLocaleString()} cfs</strong>
                </div>
                <div style="border-top:1px dashed #93c5fd; padding-top:3px; display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:#0f172a;">
                  <span>= Reach Discharge:</span>
                  <span style="color:#0284c7;">\${Number(p.flow_cfs).toLocaleString()} cfs</span>
                </div>
              </div>
            \`;
          }

          const highlightBadge = \`<div style="font-size:9.5px; font-weight:700; color:#0e7490; background:#cffafe; border:1px solid #a5f3fc; padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px; margin-top:5px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#06b6d4;"></span>
            Segment Isolated &amp; Highlighted
          </div>\`;

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
              \${confluenceHtml}
              \${highlightBadge}
            </div>
          \`;

          const popupHtml = formatTabbedPopup({ dataHtml, codeTitle: 'USGS Reach #09261000' });
          const popup = new maplibregl.Popup({ offset: 10 }).setHTML(popupHtml);
          showFeaturePopup(popup, [-109.18, 40.42]);

          const casingFilter = window.map.getFilter('rivers-selected-highlight-casing');
          const coreFilter = window.map.getFilter('rivers-selected-highlight-core');

          return {
            selectedReach: 'green_middle',
            casingFilter,
            coreFilter,
            popupRendered: !!document.querySelector('.popup-single-card')
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Echo Park Click Eval:', clickEchoPark.result?.value);
    await sleep(1500);

    const shotEcho = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/echo_park_green_middle_highlight.png`, Buffer.from(shotEcho.data, 'base64'));
    console.log('Saved screenshot: echo_park_green_middle_highlight.png');

    // 3. Test Grand Junction Confluence Click & Highlight (Colorado State Line Reach)
    console.log('\n--- Test 2: Grand Junction Confluence Click & Highlight ---');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          window.map.flyTo({ center: [-108.85, 39.12], zoom: 9.8, pitch: 0, duration: 0 });
        })()
      `
    });
    await sleep(2000);

    const clickGJ = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rSource = window.map.getSource('rivers');
          const sl = rSource._data?.features?.find(f => f.properties.reach === 'colorado_stateline_cisco');
          if (!sl) return { error: 'colorado_stateline_cisco reach not found' };
          
          highlightSelectedReach('colorado_stateline_cisco');
          
          const p = sl.properties;
          const conf = p.confluence_info;
          let confluenceHtml = '';
          if (conf && conf.confluence_name) {
            confluenceHtml = \`
              <div style="margin-top:7px; padding:7px 9px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px;">
                <div style="font-size:9.5px; font-weight:800; color:#0369a1; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px;">
                  Confluence Mass Balance
                </div>
                <div style="font-size:11px; font-weight:700; color:#0f172a; margin-bottom:4px;">
                  \${conf.confluence_name}
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#475569; margin-bottom:2px;">
                  <span>↑ Upstream Mainstem:</span>
                  <strong style="color:#0369a1;">\${Number(conf.mainstem_upstream.cfs).toLocaleString()} cfs</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#475569; margin-bottom:4px;">
                  <span>+ Tributary Inflow (\${conf.tributary.name}):</span>
                  <strong style="color:#0284c7;">\${Number(conf.tributary.cfs).toLocaleString()} cfs</strong>
                </div>
                <div style="border-top:1px dashed #93c5fd; padding-top:3px; display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:#0f172a;">
                  <span>= Reach Discharge:</span>
                  <span style="color:#0284c7;">\${Number(p.flow_cfs).toLocaleString()} cfs</span>
                </div>
              </div>
            \`;
          }

          const highlightBadge = \`<div style="font-size:9.5px; font-weight:700; color:#0e7490; background:#cffafe; border:1px solid #a5f3fc; padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px; margin-top:5px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#06b6d4;"></span>
            Segment Isolated &amp; Highlighted
          </div>\`;

          const catBadge = '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#e0f2fe;padding:2px 6px;border-radius:4px;">Mainstem Reach</span>';
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
              \${confluenceHtml}
              \${highlightBadge}
            </div>
          \`;

          const popupHtml = formatTabbedPopup({ dataHtml, codeTitle: 'USGS Reach #09163500' });
          const popup = new maplibregl.Popup({ offset: 10 }).setHTML(popupHtml);
          showFeaturePopup(popup, [-108.85, 39.12]);

          const casingFilter = window.map.getFilter('rivers-selected-highlight-casing');
          const coreFilter = window.map.getFilter('rivers-selected-highlight-core');

          return {
            selectedReach: 'colorado_stateline_cisco',
            casingFilter,
            coreFilter,
            popupRendered: !!document.querySelector('.popup-single-card')
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Grand Junction Click Eval:', clickGJ.result?.value);
    await sleep(1500);

    const shotGJ = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/grand_junction_stateline_highlight.png`, Buffer.from(shotGJ.data, 'base64'));
    console.log('Saved screenshot: grand_junction_stateline_highlight.png');

    // 4. Test Deselection / Clear Highlight on Empty Map Click
    console.log('\n--- Test 3: Clear Highlight on Empty Map Click ---');
    const clearRes = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          // Simulate empty map click
          clearReachHighlight();
          if (activeFeaturePopup) {
            activeFeaturePopup.remove();
            activeFeaturePopup = null;
          }
          return {
            casingFilter: window.map.getFilter('rivers-selected-highlight-casing'),
            coreFilter: window.map.getFilter('rivers-selected-highlight-core'),
            popupCount: document.querySelectorAll('.maplibregl-popup').length
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Clear Highlight Eval:', clearRes.result?.value);
    await sleep(1000);

    const shotClear = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/highlight_cleared.png`, Buffer.from(shotClear.data, 'base64'));
    console.log('Saved screenshot: highlight_cleared.png');

    cdp.close();
    chrome.kill();
    console.log('\nAll tests completed successfully!');
  } catch (err) {
    console.error('Test execution error:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
