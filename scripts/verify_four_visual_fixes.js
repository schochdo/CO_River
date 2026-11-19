const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const PORT = 9326;

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

  // TEST SUITE 1: Pipeline.html schematic fixes (Bugs 2, 3, 4)
  console.log('\n--- TEST SUITE 1: Verifying web/pipeline.html (Bugs 2, 3, 4) ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
  await sleep(2000);

  const evalRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const legend = document.getElementById('legend-box').getBoundingClientRect();
      const greenCard = document.getElementById('card-green-river').getBoundingClientRect();
      const headCard = document.getElementById('card-headwaters').getBoundingClientRect();
      const headText = document.querySelector('#card-headwaters text').getBoundingClientRect();
      const svg = document.getElementById('canvas').getBoundingClientRect();
      const hooverCard = document.querySelector('#dam-hoover g[transform^="translate(515"]').getBoundingClientRect();
      const parkerCard = document.getElementById('card-parker').getBoundingClientRect();
      const capBadge = document.querySelector('#diversions-layer g.cursor-help[transform^="translate(775"]').getBoundingClientRect();

      return {
        legendGreenClearance: greenCard.left - legend.right,
        headCardSvgRightMargin: svg.right - headCard.right,
        headTextInsideCard: headCard.right - headText.right,
        hooverParkerGap: parkerCard.top - hooverCard.bottom,
        parkerCapBadgeClearance: capBadge.left - parkerCard.right
      };
    })()`,
    returnByValue: true
  });

  console.log('Pipeline Geometry Checks:', evalRes.result.value);

  // Capture screenshot of Top-Left (Legend + Green River Card)
  const clipBug2 = {
    x: 0,
    y: 90,
    width: 650,
    height: 250,
    scale: 1
  };
  const snapBug2 = await cdp.send('Page.captureScreenshot', { clip: clipBug2, format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_bug2_green_river_legend.png'), Buffer.from(snapBug2.data, 'base64'));
  console.log('Saved verified_bug2_green_river_legend.png');

  // Capture screenshot of Top-Right (Headwaters Card)
  const clipBug3 = {
    x: 900,
    y: 90,
    width: 500,
    height: 250,
    scale: 1
  };
  const snapBug3 = await cdp.send('Page.captureScreenshot', { clip: clipBug3, format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_bug3_headwaters_card.png'), Buffer.from(snapBug3.data, 'base64'));
  console.log('Saved verified_bug3_headwaters_card.png');

  // Capture screenshot of Lower Basin (Hoover, Parker, CAP, Transit Loss)
  const clipBug4 = {
    x: 350,
    y: 500,
    width: 650,
    height: 300,
    scale: 1
  };
  const snapBug4 = await cdp.send('Page.captureScreenshot', { clip: clipBug4, format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_bug4_hoover_parker_cap.png'), Buffer.from(snapBug4.data, 'base64'));
  console.log('Saved verified_bug4_hoover_parker_cap.png');

  // TEST SUITE 2: ML Analysis Card 2 (Bug 1: San Juan arrival curves)
  console.log('\n--- TEST SUITE 2: Verifying web/ml_analysis.html (Bug 1: San Juan Arrival Curve) ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });
  await sleep(2000);

  // Capture Card 2 Travel Time
  const card2Box = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('chart-travel-time').parentElement;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    })()`,
    returnByValue: true
  });

  const snapBug1 = await cdp.send('Page.captureScreenshot', {
    clip: {
      x: Math.round(card2Box.result.value.x),
      y: Math.round(card2Box.result.value.y),
      width: Math.round(card2Box.result.value.width),
      height: Math.round(card2Box.result.value.height),
      scale: 1
    },
    format: 'png'
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_bug1_card2_arrival_badge.png'), Buffer.from(snapBug1.data, 'base64'));
  console.log('Saved verified_bug1_card2_arrival_badge.png');

  console.log('\n[Verification] ALL 4 CHECKS COMPLETE!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
