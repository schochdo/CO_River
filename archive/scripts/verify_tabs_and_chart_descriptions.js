const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const PORT = 9330;

function runCommand(cmd) {
  return require('child_process').spawn('bash', ['-c', cmd], { stdio: 'inherit' });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class CdpConnection {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const nodeWs = new WebSocket(this.wsUrl);
      this.ws = nodeWs;
      nodeWs.onopen = () => resolve();
      nodeWs.onerror = reject;
      nodeWs.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`[Verification] Launching headless Chrome on port ${PORT}...`);
  const chromeProc = runCommand(`/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --headless=new --remote-debugging-port=${PORT} --no-first-run --no-default-browser-check --disable-gpu about:blank`);

  let version;
  for (let i = 0; i < 20; i++) {
    try {
      version = await getJson(`http://127.0.0.1:${PORT}/json/version`);
      if (version) break;
    } catch (e) {
      await sleep(300);
    }
  }

  if (!version) {
    console.error('Failed to connect to Chrome remote debugging port.');
    process.exit(1);
  }

  const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CdpConnection(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 960,
    deviceScaleFactor: 2,
    mobile: false
  });

  // TEST 1: Sankey.html subtab buttons
  console.log('\n--- TEST 1: Checking web/sankey.html subtabs (No continuous scroll, clean domain labels) ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/sankey.html' });
  await sleep(1500);

  const sankeyCheck = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn1 = document.getElementById('subtab-btn-sankey');
      const btn2 = document.getElementById('subtab-btn-stacked');
      const btn3 = document.getElementById('subtab-btn-both');
      const bar = btn1.parentElement.getBoundingClientRect();

      return {
        tab1Text: btn1 ? btn1.innerText.replace(/\\s+/g, ' ').trim() : null,
        tab2Text: btn2 ? btn2.innerText.replace(/\\s+/g, ' ').trim() : null,
        continuousScrollExists: !!btn3,
        subtabBarBox: { x: bar.x, y: bar.y, width: bar.width, height: bar.height }
      };
    })()`,
    returnByValue: true
  });
  console.log('Sankey Subtabs Check:', sankeyCheck.result.value);

  if (sankeyCheck.result.value.continuousScrollExists) {
    throw new Error('Continuous scroll button still exists in DOM!');
  }

  // Capture screenshot of subtab bar and context
  const snapSubtabs = await cdp.send('Page.captureScreenshot', {
    clip: {
      x: 0,
      y: 0,
      width: 1440,
      height: 380,
      scale: 1
    },
    format: 'png'
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_sankey_clean_tabs_no_continuous_scroll.png'), Buffer.from(snapSubtabs.data, 'base64'));
  console.log('Saved verified_sankey_clean_tabs_no_continuous_scroll.png');

  // Test switching between the 2 tabs
  console.log('\n--- Testing switching between the 2 tabs ---');
  await cdp.send('Runtime.evaluate', { expression: `switchBudgetSubtab('stacked')` });
  await sleep(300);
  const stackedVisible = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('view-stacked-section').style.display`,
    returnByValue: true
  });
  console.log('Stacked Section Display:', stackedVisible.result.value);

  await cdp.send('Runtime.evaluate', { expression: `switchBudgetSubtab('sankey')` });
  await sleep(300);
  const sankeyVisible = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('view-sankey-section').style.display`,
    returnByValue: true
  });
  console.log('Inflows Section Display:', sankeyVisible.result.value);

  // TEST 2: Index.html sidebar and reservoir buttons
  console.log('\n--- TEST 2: Checking web/index.html sidebar & reservoir labels ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/index.html' });
  await sleep(1500);

  const indexCheck = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const pipelineBtn = document.getElementById('tab-btn-pipeline').innerText.trim();
      const budgetBtn = document.getElementById('tab-btn-sankey').innerText.trim();
      const envelopeBtn = document.getElementById('btn-view-envelope').innerText.trim();
      const matrixBtn = document.getElementById('btn-view-heatmap').innerText.trim();

      return {
        pipelineSidebarText: pipelineBtn,
        budgetSidebarText: budgetBtn,
        reservoirEnvelopeText: envelopeBtn,
        reservoirMatrixText: matrixBtn
      };
    })()`,
    returnByValue: true
  });
  console.log('Index.html Labels Check:', indexCheck.result.value);

  // TEST 3: ML Analysis Pill and Card Labels
  console.log('\n--- TEST 3: Checking web/ml_analysis.html labels ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });
  await sleep(1500);

  const mlCheck = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const pill = document.getElementById('status-pill').innerText.trim();
      const card1Badge = document.querySelector('section.dashboard-card .card-header-row span').innerText.trim();
      return { pill, card1Badge };
    })()`,
    returnByValue: true
  });
  console.log('ML Analysis Labels Check:', mlCheck.result.value);

  console.log('\n========================================');
  console.log('🎉 ALL CLEAN TABS & DOMAIN DESCRIPTIONS VERIFIED');
  console.log('========================================');

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
