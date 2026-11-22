const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(u) {
  return new Promise((r, j) => http.get(u, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }).on('error', j));
}

(async () => {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9247',
    '--headless=new',
    '--no-sandbox',
    '--window-size=1400,900',
    'http://localhost:8088/map_embed.html'
  ]);
  await sleep(1500);

  try {
    const targets = await fetchJson('http://localhost:9247/json/list');
    const pt = targets.find(t => t.type === 'page');
    const ws = new WebSocket(pt.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (m, p = {}) => new Promise(r => {
      const curId = id++;
      const handler = (msg) => {
        const d = JSON.parse(msg.data);
        if (d.id === curId) { ws.removeEventListener('message', handler); r(d.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(2500); // wait for map to load

    // Open Flow Replay Engine and collapse legend
    console.log("Opening Flow Replay & collapsing legend to match user state...");
    await send('Runtime.evaluate', {
      expression: `
        if (window.FlowReplayEngine) {
          window.FlowReplayEngine.open();
        } else {
          const btn = document.querySelector('[onclick*="FlowReplayEngine.open"]');
          if (btn) btn.click();
        }
        const legend = document.getElementById('map-legend') || document.querySelector('.map-legend');
        if (legend && !legend.classList.contains('collapsed') && window.toggleLegend) {
          window.toggleLegend();
        }
      `
    });
    await sleep(1000);

    // Evaluate layout and styles
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const bar = document.getElementById('flow-replay-bar');
          const strip = document.getElementById('replay-sentinel-strip');
          const legend = document.getElementById('map-legend') || document.querySelector('.map-legend');
          
          if (!bar) return { error: 'No flow-replay-bar found' };
          
          const barStyle = window.getComputedStyle(bar);
          const toRect = r => ({ x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right });
          const barRect = toRect(bar.getBoundingClientRect());
          
          const stripRect = strip ? toRect(strip.getBoundingClientRect()) : null;
          const stripScrollWidth = strip ? strip.scrollWidth : 0;
          const stripClientWidth = strip ? strip.clientWidth : 0;
          const stripOverflow = stripScrollWidth > stripClientWidth;
          
          const pills = Array.from(document.querySelectorAll('.period-pill, .sentinel-pill, .replay-ctrl-btn, .speed-pill, .replay-close-btn')).map(el => {
            return {
              class: el.className,
              text: el.innerText.trim(),
              borderRadius: window.getComputedStyle(el).borderRadius
            };
          });

          const legendRect = legend ? toRect(legend.getBoundingClientRect()) : null;
          
          let overlap = false;
          if (legendRect && barRect) {
            overlap = !(barRect.right < legendRect.left || 
                        barRect.left > legendRect.right || 
                        barRect.bottom < legendRect.top || 
                        barRect.top > legendRect.bottom);
          }

          return {
            bar: {
              borderRadius: barStyle.borderRadius,
              bottom: barStyle.bottom,
              rect: barRect
            },
            strip: {
              scrollWidth: stripScrollWidth,
              clientWidth: stripClientWidth,
              isOverflowing: stripOverflow,
              rect: stripRect
            },
            pillsCount: pills.length,
            pillsSample: pills.slice(0, 8),
            legendRect: legendRect,
            overlapWithLegend: overlap
          };
        })()
      `,
      returnByValue: true
    });

    console.log("Evaluation Result:", JSON.stringify(evalRes.result.value, null, 2));

    const val = evalRes.result.value;
    const barRect = val.bar.rect;
    console.log("Bar rect:", barRect);
    console.log("Legend rect:", val.legendRect);

    const clip = {
      x: Math.max(0, barRect.x - 20),
      y: Math.max(0, barRect.y - 15),
      width: Math.min(1400, barRect.width + 40),
      height: barRect.height + 30,
      scale: 1
    };

    const scr = await send('Page.captureScreenshot', {
      format: 'png',
      clip: clip
    });
    console.log("scr keys:", Object.keys(scr || {}));

    if (scr && scr.data) {
      const outPath = '/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_flow_replay_squared_clean.png';
      fs.writeFileSync(outPath, Buffer.from(scr.data, 'base64'));
      console.log('Saved screenshot to:', outPath);
    }

    // Capture entire bottom viewport showing both bar and legend
    const fullScr = await send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: 0,
        y: 520,
        width: 1400,
        height: 220,
        scale: 1
      }
    });
    if (fullScr && fullScr.data) {
      const fullOutPath = '/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_flow_replay_bottom_context.png';
      fs.writeFileSync(fullOutPath, Buffer.from(fullScr.data, 'base64'));
      console.log('Saved bottom context screenshot to:', fullOutPath);
    }

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    chrome.kill('SIGKILL');
  }
})();
