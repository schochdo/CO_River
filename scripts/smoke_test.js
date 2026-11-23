#!/usr/bin/env node
/**
 * Unified Desktop + Mobile Smoke Test (Headless Chrome CDP)
 * Verifies all primary web pages at 390x844 (mobile) and 1360x860 (desktop):
 *   1. Zero uncaught runtime exceptions
 *   2. Zero page-level horizontal overflow (scrollWidth <= clientWidth)
 *   3. Zero banned marketing/slop superlatives in user-facing HTML
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9249;
const WEB_DIR = path.join(process.cwd(), 'web');

const PAGES = [
  'index.html',
  'telemetry.html',
  'pipeline.html',
  'sankey.html',
  'ml_analysis.html',
  'law.html',
  'data_sources.html',
  'methodology.html',
  'map_embed.html'
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'desktop', width: 1360, height: 860, mobile: false }
];

const BANNED_SLOP = [
  /100%\s*uptime/i,
  /infinite\s*scaling/i,
  /zero-failure/i,
  /zero-break/i,
  /never\s*crashes/i,
  /sub-50ms/i,
  /bundle\s*size:\s*0\s*kb/i,
  /enterprise-grade/i
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fetchJson = url => new Promise((res, rej) => {
  http.get(url, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

function checkSlop() {
  const hits = [];
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(WEB_DIR, page), 'utf8');
    for (const rx of BANNED_SLOP) {
      if (rx.test(html)) hits.push(`${page}: matched ${rx}`);
    }
  }
  return hits;
}

async function main() {
  const failures = [];

  // 1. Static anti-slop prose check
  const slopHits = checkSlop();
  if (slopHits.length) {
    failures.push(...slopHits.map(h => `[SLOP] ${h}`));
  }

  // 2. Ephemeral local HTTP server for web/
  const srv = http.createServer((req, res) => {
    const cleanUrl = req.url.split('?')[0];
    const f = path.join(WEB_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    const ext = path.extname(f);
    const mime = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(f).pipe(res);
  }).listen(0);

  const port = srv.address().port;
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1360,860',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    let target;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
        target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (target) break;
      } catch {}
    }
    if (!target) throw new Error('Could not connect to headless Chrome CDP');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));

    let id = 1;
    let runtimeErrors = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        const txt = msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text || 'Unknown exception';
        runtimeErrors.push(txt.split('\n')[0]);
      }
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const myId = id++;
      const onMsg = ev => {
        const msg = JSON.parse(ev.data);
        if (msg.id === myId) {
          ws.removeEventListener('message', onMsg);
          if (msg.error) reject(msg.error); else resolve(msg.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.mobile ? 2 : 1,
        mobile: vp.mobile
      });

      for (const page of PAGES) {
        runtimeErrors = [];
        await send('Page.navigate', { url: `http://127.0.0.1:${port}/${page}` });
        await sleep(750);

        const res = await send('Runtime.evaluate', {
          returnByValue: true,
          expression: `({ vw: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth })`
        });
        const { vw, scrollW } = res.result.value;
        const overflow = scrollW - vw;
        if (overflow > 1) {
          failures.push(`[OVERFLOW] ${vp.name} ${page}: scrollW=${scrollW} > vw=${vw} (+${overflow}px)`);
        }
        if (runtimeErrors.length) {
          failures.push(`[RUNTIME] ${vp.name} ${page}: ${runtimeErrors.join(' | ')}`);
        }
      }
    }

    ws.close();
  } finally {
    chrome.kill();
    srv.close();
  }

  if (failures.length) {
    console.error('SMOKE TEST FAILED:\n' + failures.map(f => '  - ' + f).join('\n'));
    process.exit(1);
  } else {
    console.log(`SMOKE TEST PASSED: ${PAGES.length} pages x ${VIEWPORTS.length} viewports (0 overflow, 0 runtime errors, 0 slop hits)`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
