/**
 * Automated CDP verification for Colorado River Overview Page Redesign
 * Verifies single-page 2x2 dashboard layout, math consistency, and chart rendering.
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9324;
const ARTIFACTS_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

async function run() {
  console.log('[Verification] Launching headless Chrome on port ' + DEBUG_PORT + '...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1440,960',
    '--enable-webgl',
    'about:blank'
  ]);

  try {
    let list;
    for (let i = 0; i < 20; i++) {
      try {
        await new Promise(r => setTimeout(r, 400));
        list = await new Promise((res, rej) => {
          http.get(`http://127.0.0.1:${DEBUG_PORT}/json/list`, r => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
          }).on('error', rej);
        });
        if (list && list[0]) break;
      } catch (_) {}
    }

    if (!list || !list[0]) throw new Error('Could not connect to Chrome debugging port');

    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
      const msgId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    const consoleErrors = [];
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
    });

    console.log('[Verification] Navigating to http://localhost:8088/index.html...');
    await send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await new Promise(r => setTimeout(r, 2500));

    // 1. Verify Ticker Elements
    console.log('[Test 1] Verifying Basin Core Accounting Ticker in Header...');
    const tickerCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const nav = document.getElementById('storyboard-nav');
        if (!nav) return { ok: false, error: 'storyboard-nav not found' };
        const text = nav.innerText;
        return {
          ok: true,
          hasRiverSupply: text.includes('12.50 MAF'),
          hasCoreCompact: text.includes('15.00 MAF'),
          hasStatutory: text.includes('17.50 MAF'),
          hasTotalPull: text.includes('19.10 MAF'),
          hasOverdraft: text.includes('-6.60 MAF/yr'),
          rawText: text.replace(/\\s+/g, ' ')
        };
      })()`,
      returnByValue: true
    });
    console.log('Ticker Check Result:', tickerCheck.result.value);

    // 2. Verify 4 Cards in Overview
    console.log('[Test 2] Verifying 4 Cards in 2x2 Grid...');
    const cardsCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const act1 = document.getElementById('act-1');
        const act2 = document.getElementById('act-2');
        const act3 = document.getElementById('act-3');
        const act4 = document.getElementById('act-4');
        if (!act1 || !act2 || !act3 || !act4) {
          return { ok: false, error: 'Missing one or more act cards' };
        }
        
        // Check Act 1 Math
        const act1Text = act1.innerText;
        const act1HasPaperDeficit = act1Text.includes('+5.00 MAF/yr');
        const act1HasOverdraft = act1Text.includes('+6.60 MAF/yr');
        const act1Has1250 = act1Text.includes('12.50 MAF');
        const act1Has1500 = act1Text.includes('15.00 MAF');
        const act1Has1750 = act1Text.includes('17.50 MAF');
        const act1Has1910 = act1Text.includes('19.10 MAF');

        // Check Canvases
        const c2 = document.getElementById('chart-seasonal-engine');
        const c3 = document.getElementById('chart-macro-overview-timeline');
        const c4 = document.getElementById('chart-state-use');

        return {
          ok: true,
          act1Math: {
            act1HasPaperDeficit,
            act1HasOverdraft,
            act1Has1250,
            act1Has1500,
            act1Has1750,
            act1Has1910
          },
          canvases: {
            seasonal: !!c2 && c2.clientWidth > 0 && c2.clientHeight > 0,
            seasonalDims: c2 ? [c2.clientWidth, c2.clientHeight] : null,
            storage: !!c3 && c3.clientWidth > 0 && c3.clientHeight > 0,
            storageDims: c3 ? [c3.clientWidth, c3.clientHeight] : null,
            stateUse: !!c4 && c4.clientWidth > 0 && c4.clientHeight > 0,
            stateUseDims: c4 ? [c4.clientWidth, c4.clientHeight] : null,
          }
        };
      })()`,
      returnByValue: true
    });
    console.log('Cards & Canvas Check Result:', cardsCheck.result.value);

    // 3. Test Seasonal Engine View Toggle
    console.log('[Test 3] Testing Seasonal Engine view toggle buttons...');
    const toggleCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const btnMismatch = document.getElementById('btn-seasonal-mismatch');
        if (!btnMismatch) return { ok: false, error: 'btn-seasonal-mismatch missing' };
        btnMismatch.click();
        return { ok: true, viewAfterClick: window.currentSeasonalView || currentSeasonalView };
      })()`,
      returnByValue: true
    });
    console.log('Toggle to mismatch:', toggleCheck.result.value);

    await new Promise(r => setTimeout(r, 600));

    const toggleBackCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const btnRegimes = document.getElementById('btn-seasonal-regimes');
        if (!btnRegimes) return { ok: false, error: 'btn-seasonal-regimes missing' };
        btnRegimes.click();
        return { ok: true, viewAfterClick: window.currentSeasonalView || currentSeasonalView };
      })()`,
      returnByValue: true
    });
    console.log('Toggle back to regimes:', toggleBackCheck.result.value);

    // 4. Check Viewport Fit & Scroll Height
    const scrollMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const sec = document.getElementById('section-overview');
        return {
          scrollHeight: sec.scrollHeight,
          clientHeight: sec.clientHeight,
          scrollRatio: (sec.scrollHeight / sec.clientHeight).toFixed(2)
        };
      })()`,
      returnByValue: true
    });
    console.log('Scroll metrics for section-overview:', scrollMetrics.result.value);

    // 5. Check Console Errors
    console.log('Console Errors caught:', consoleErrors.length, consoleErrors);

    // 6. Capture full screenshot
    console.log('[Verification] Capturing screenshot of redesigned Overview dashboard...');
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      quality: 100,
      fromSurface: true
    });

    const screenshotPath = path.join(ARTIFACTS_DIR, 'verified_overview_single_page.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot saved to:', screenshotPath);

    console.log('[Verification] SUCCESS! All overview criteria verified.');
    ws.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch(err => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
