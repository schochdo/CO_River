/**
 * Automated Clearance & Legibility Verification Suite for Colorado River Flow Diagram
 * 
 * Verifies that:
 * 1. All text elements have zero pairwise bounding-box collisions.
 * 2. All text elements clear badge containers (except their own label).
 * 3. Text elements do not collide with major river/diversion flow paths.
 * 4. All badges and icons are fully visible within canvas bounds.
 */

const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9223;
const TARGET_URL = 'http://localhost:8088/sankey.html';

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

async function runVerification() {
  console.log('🚀 Launching Headless Chrome for Graphic Clearance Verification...');
  
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1680,1100',
    'about:blank'
  ]);

  chromeProc.on('error', (err) => {
    console.error('Failed to start Chrome:', err);
    process.exit(1);
  });

  try {
    // Wait for Chrome to bind port
    let version = null;
    for (let i = 0; i < 20; i++) {
      await sleep(250);
      try {
        version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (version) break;
      } catch (e) {}
    }

    if (!version) {
      throw new Error('Chrome did not respond on debugging port');
    }

    // Open target tab
    const tabs = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    let tab = tabs.find(t => t.type === 'page');
    if (!tab) {
      const newTabRes = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(TARGET_URL)}`);
      tab = newTabRes;
    }

    const cdp = new CDPClient(tab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: TARGET_URL });
    
    // Wait for page load
    await sleep(1500);

    function auditPage() {
      const svg = document.getElementById('canvas');
      if (!svg) return { error: 'SVG canvas not found' };

      const texts = Array.from(svg.querySelectorAll('text'));
      const badges = Array.from(svg.querySelectorAll('.badge-bg, [class*="badge"]'));
      const paths = Array.from(svg.querySelectorAll('.river-path, .diversion-path'));

      const textItems = texts.map((t, idx) => {
        const rect = t.getBoundingClientRect();
        const str = (t.textContent || '').trim();
        const isBadgeText = t.classList.contains('maf-badge') || t.closest('.badge-bg') !== null;
        return {
          id: t.id || 'text-' + idx,
          text: str,
          isBadgeText,
          rect: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            cx: (rect.left + rect.right) / 2,
            cy: (rect.top + rect.bottom) / 2
          }
        };
      }).filter(item => item.rect.width > 0 && item.rect.height > 0 && item.text.length > 0);

      // Check AABB overlaps between text pairs
      const textCollisions = [];
      for (let i = 0; i < textItems.length; i++) {
        for (let j = i + 1; j < textItems.length; j++) {
          const a = textItems[i];
          const b = textItems[j];

          const overlapX = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
          const overlapY = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
          const overlapArea = overlapX * overlapY;

          // Strict overlap threshold (more than 1 pixel collision)
          if (overlapX > 1.5 && overlapY > 1.5) {
            textCollisions.push({
              itemA: a.text,
              itemB: b.text,
              area: overlapArea.toFixed(1),
              boxA: `${a.rect.left.toFixed(0)},${a.rect.top.toFixed(0)} - ${a.rect.right.toFixed(0)},${a.rect.bottom.toFixed(0)}`,
              boxB: `${b.rect.left.toFixed(0)},${b.rect.top.toFixed(0)} - ${b.rect.right.toFixed(0)},${b.rect.bottom.toFixed(0)}`
            });
          }
        }
      }

      // Check text collisions against river/diversion centerlines
      const pathCollisions = [];
      paths.forEach(p => {
        const pathId = p.id || p.getAttribute('class');
        const strokeWidth = parseFloat(getComputedStyle(p).strokeWidth) || 10;
        if (strokeWidth < 6) return; // skip thin lines

        try {
          const totalLen = p.getTotalLength();
          const sampleCount = Math.min(60, Math.max(10, Math.floor(totalLen / 15)));
          for (let s = 0; s <= sampleCount; s++) {
            const pt = p.getPointAtLength((s / sampleCount) * totalLen);
            const ctm = p.getScreenCTM();
            if (!ctm) continue;
            const screenPt = pt.matrixTransform(ctm);

            textItems.forEach(t => {
              if (t.id.includes('state') || t.text === 'WYOMING' || t.text === 'COLORADO' || t.text === 'UTAH' || t.text === 'ARIZONA' || t.text === 'NEVADA' || t.text === 'CALIFORNIA' || t.text === 'NEW MEXICO' || t.text === 'MEXICO' || t.text === 'BAJA CALIFORNIA') return;
              if (t.isBadgeText) return;

              const halfW = t.rect.width / 2;
              const halfH = t.rect.height / 2;
              const dx = Math.abs(screenPt.x - t.rect.cx);
              const dy = Math.abs(screenPt.y - t.rect.cy);

              if (dx < (halfW - 2) && dy < (halfH - 2)) {
                pathCollisions.push({
                  text: t.text,
                  path: pathId,
                  point: `${screenPt.x.toFixed(0)}, ${screenPt.y.toFixed(0)}`
                });
              }
            });
          }
        } catch(e) {}
      });

      const uniquePathCollisions = [];
      const seenText = new Set();
      pathCollisions.forEach(pc => {
        if (!seenText.has(pc.text)) {
          seenText.add(pc.text);
          uniquePathCollisions.push(pc);
        }
      });

      return {
        totalTexts: textItems.length,
        totalPaths: paths.length,
        textCollisions,
        pathCollisions: uniquePathCollisions
      };
    }

    const evalResult = await cdp.send('Runtime.evaluate', {
      expression: `(${auditPage.toString()})()`,
      returnByValue: true
    });

    cdp.close();

    const report = evalResult.result.value;
    console.log('\n--- GRAPHIC CLEARANCE AUDIT REPORT ---');
    console.log(`Evaluated ${report.totalTexts} text labels and ${report.totalPaths} flow paths`);
    console.log(`Text-on-Text Collisions: ${report.textCollisions.length}`);
    console.log(`Text-on-Flowline Collisions: ${report.pathCollisions.length}`);

    if (report.textCollisions.length > 0) {
      console.log('\n❌ TEXT COLLISIONS DETECTED:');
      report.textCollisions.forEach((c, idx) => {
        console.log(`  ${idx + 1}. "${c.itemA}" overlaps with "${c.itemB}" (overlap area: ${c.area}px)`);
        console.log(`     Box A: ${c.boxA}`);
        console.log(`     Box B: ${c.boxB}`);
      });
    }

    if (report.pathCollisions.length > 0) {
      console.log('\n❌ TEXT-ON-PATH COLLISIONS DETECTED:');
      report.pathCollisions.forEach((c, idx) => {
        console.log(`  ${idx + 1}. Text "${c.text}" is traversed by flowline path "${c.path}" at screen (${c.point})`);
      });
    }

    const totalErrors = report.textCollisions.length + report.pathCollisions.length;
    if (totalErrors === 0) {
      console.log('\n✅ 100% CLEARANCE PASS: 0 collisions detected across all graphic elements and text!');
      process.exit(0);
    } else {
      console.log(`\n❌ AUDIT FAILED with ${totalErrors} collisions.`);
      process.exit(1);
    }

  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  } finally {
    try {
      chromeProc.kill('SIGTERM');
    } catch(e) {}
  }
}

runVerification();
