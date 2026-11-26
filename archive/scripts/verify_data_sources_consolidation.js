const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8098;
const ARTIFACTS_DIR = '/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883';
const WEB_DIR = path.join(__dirname, '../web');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(WEB_DIR, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'text/plain',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9289',
    '--remote-debugging-address=127.0.0.1',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1450,1000'
  ]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(1500);

  async function getWebSocketDebuggerUrl() {
    return new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9289/json', res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const list = JSON.parse(body);
            resolve(list[0].webSocketDebuggerUrl);
          } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  }

  const wsUrl = await getWebSocketDebuggerUrl();
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = msg => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id === curId) {
        ws.removeEventListener('message', handler);
        if (parsed.error) reject(parsed.error);
        else resolve(parsed.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  try {
    await send('Page.enable');
    await send('DOM.enable');

    // 1. Verify Simplified Sankey Primary Data Sources
    console.log('Navigating to sankey.html...');
    await send('Page.navigate', { url: `http://localhost:${PORT}/sankey.html` });
    await sleep(2500);

    const sankeyDims = await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('budget-data-sources');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          height: rect.height,
          width: rect.width
        };
      })()`,
      returnByValue: true
    });
    console.log('Sankey Budget Data Sources Dimensions:', JSON.stringify(sankeyDims.result.value, null, 2));

    // Scroll to sources and capture
    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('budget-data-sources');
        if (el) el.scrollIntoView({ block: 'center' });
      })()`
    });
    await sleep(600);

    const shotSankey = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_sankey_simplified_sources.png'), Buffer.from(shotSankey.data, 'base64'));
    console.log('Captured verified_sankey_simplified_sources.png');

    // 2. Verify Standalone data_sources.html Page
    console.log('Navigating to data_sources.html...');
    await send('Page.navigate', { url: `http://localhost:${PORT}/data_sources.html` });
    await sleep(2000);

    const shotDataSources = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_data_sources_page.png'), Buffer.from(shotDataSources.data, 'base64'));
    console.log('Captured verified_data_sources_page.png');

    // 3. Verify Modal on index.html
    console.log('Navigating to index.html...');
    await send('Page.navigate', { url: `http://localhost:${PORT}/index.html` });
    await sleep(2500);

    console.log('Opening api-modal on index.html...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        if (typeof openApiModal === 'function') openApiModal();
      })()`
    });
    await sleep(800);

    const shotModal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_api_modal_consolidated.png'), Buffer.from(shotModal.data, 'base64'));
    console.log('Captured verified_api_modal_consolidated.png');

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    ws.close();
    chromeProc.kill();
    server.close();
    process.exit(0);
  }
});
