const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9315;

async function audit() {
  console.log('[Audit] Launching Chrome on port', DEBUG_PORT);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1400,900',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    'about:blank'
  ]);

  try {
    let list;
    for (let i = 0; i < 10; i++) {
      try {
        await new Promise(r => setTimeout(r, 600));
        list = await new Promise((res, rej) => {
          http.get(`http://127.0.0.1:${DEBUG_PORT}/json/list`, r => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
          }).on('error', rej);
        });
        if (list && list[0]) break;
      } catch (_) {}
    }
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (m, p = {}) => new Promise(res => {
      const msgId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === msgId) { ws.removeEventListener('message', handler); res(msg.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    // 1. Audit pipeline.html - Profile View
    console.log('[Audit] Loading pipeline.html (Profile View)...');
    await send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
    await new Promise(r => setTimeout(r, 2000));
    // Switch to profile tab
    await send('Runtime.evaluate', { expression: `switchPipelineSubtab('elevation')` });
    await new Promise(r => setTimeout(r, 1000));
    const shotProfile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/audit_pipeline_profile.png`, Buffer.from(shotProfile.data, 'base64'));

    // Check SVG overflows in Profile View
    const profileOverflows = await send('Runtime.evaluate', {
      expression: `(() => {
        const svg = document.getElementById('profile-svg');
        if (!svg) return { error: 'No profile svg' };
        const svgRect = svg.getBoundingClientRect();
        const texts = Array.from(svg.querySelectorAll('text')).map(t => {
          const r = t.getBoundingClientRect();
          return {
            text: t.textContent.trim(),
            x: Math.round(r.x - svgRect.x),
            y: Math.round(r.y - svgRect.y),
            width: Math.round(r.width),
            right: Math.round((r.x - svgRect.x) + r.width),
            overflowsRight: (r.x - svgRect.x) + r.width > svgRect.width + 2,
            overflowsLeft: (r.x - svgRect.x) < -2
          };
        });
        return {
          svgWidth: Math.round(svgRect.width),
          svgHeight: Math.round(svgRect.height),
          overflows: texts.filter(t => t.overflowsRight || t.overflowsLeft)
        };
      })()`,
      returnByValue: true
    });
    console.log('[Audit] Profile SVG Overflows:', JSON.stringify(profileOverflows.result.value, null, 2));

    // 2. Audit pipeline.html - Schematic View
    console.log('[Audit] Loading pipeline.html (Schematic View)...');
    await send('Runtime.evaluate', { expression: `switchPipelineSubtab('schematic')` });
    await new Promise(r => setTimeout(r, 1000));
    const shotSchematic = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/audit_pipeline_schematic.png`, Buffer.from(shotSchematic.data, 'base64'));

    const schematicOverflows = await send('Runtime.evaluate', {
      expression: `(() => {
        const svg = document.getElementById('canvas');
        if (!svg) return { error: 'No schematic canvas svg' };
        const svgRect = svg.getBoundingClientRect();
        const texts = Array.from(svg.querySelectorAll('text')).map(t => {
          const r = t.getBoundingClientRect();
          return {
            text: t.textContent.trim(),
            x: Math.round(r.x - svgRect.x),
            y: Math.round(r.y - svgRect.y),
            width: Math.round(r.width),
            right: Math.round((r.x - svgRect.x) + r.width),
            overflowsRight: (r.x - svgRect.x) + r.width > svgRect.width + 5,
            overflowsLeft: (r.x - svgRect.x) < -5
          };
        });
        return {
          svgWidth: Math.round(svgRect.width),
          svgHeight: Math.round(svgRect.height),
          overflows: texts.filter(t => t.overflowsRight || t.overflowsLeft)
        };
      })()`,
      returnByValue: true
    });
    console.log('[Audit] Schematic SVG Overflows:', JSON.stringify(schematicOverflows.result.value, null, 2));

    // 3. Audit sankey.html (Both views)
    console.log('[Audit] Loading sankey.html...');
    await send('Page.navigate', { url: 'http://localhost:8088/sankey.html' });
    await new Promise(r => setTimeout(r, 2000));
    const shotSankey = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/audit_sankey.png`, Buffer.from(shotSankey.data, 'base64'));

    // Switch to stacked view
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-view-stacked')?.click()` });
    await new Promise(r => setTimeout(r, 800));
    const shotStacked = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/audit_sankey_stacked.png`, Buffer.from(shotStacked.data, 'base64'));

    console.log('[Audit] Finished initial audits. Reviewing captured artifacts...');

  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

audit();
