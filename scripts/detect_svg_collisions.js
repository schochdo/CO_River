const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9316;

async function detectCollisions() {
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
    await send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
    await new Promise(r => setTimeout(r, 2000));
    await send('Runtime.evaluate', { expression: `switchPipelineSubtab('elevation')` });
    await new Promise(r => setTimeout(r, 1000));

    const profileAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const svg = document.getElementById('profile-svg');
        const svgRect = svg.getBoundingClientRect();
        
        // 1. Text elements vs their enclosing rects
        const rects = Array.from(svg.querySelectorAll('rect')).map(r => ({
          el: r,
          rect: r.getBoundingClientRect(),
          fill: r.getAttribute('fill'),
          stroke: r.getAttribute('stroke')
        }));

        const texts = Array.from(svg.querySelectorAll('text')).map(t => ({
          text: t.textContent.trim(),
          rect: t.getBoundingClientRect(),
          anchor: t.getAttribute('text-anchor') || 'start'
        }));

        // Check cards with text inside
        const groups = Array.from(svg.querySelectorAll('g')).map(g => {
          const gRect = g.querySelector('rect');
          const gText = g.querySelector('text');
          if (gRect && gText) {
            const rR = gRect.getBoundingClientRect();
            const tR = gText.getBoundingClientRect();
            const textOverflowsRect = (tR.left < rR.left - 2) || (tR.right > rR.right + 2) || (tR.top < rR.top - 2) || (tR.bottom > rR.bottom + 2);
            return {
              text: gText.textContent.trim(),
              textOverflowsRect,
              rWidth: Math.round(rR.width),
              tWidth: Math.round(tR.width),
              diff: Math.round(tR.width - rR.width)
            };
          }
          return null;
        }).filter(Boolean);

        // Check path intersection with text cards (e.g. river lines crossing cards)
        const paths = Array.from(svg.querySelectorAll('path, line')).map(p => ({
          el: p,
          stroke: p.getAttribute('stroke'),
          width: p.getAttribute('stroke-width'),
          rect: p.getBoundingClientRect()
        }));

        // Find which paths overlap with text cards
        const overlaps = [];
        groups.forEach(g => {
          paths.forEach(p => {
            if (p.stroke === '#0284c7' || p.stroke === 'var(--trib-color)') {
              const gEl = Array.from(svg.querySelectorAll('g')).find(el => el.querySelector('text')?.textContent.trim() === g.text);
              if (!gEl) return;
              const gR = gEl.getBoundingClientRect();
              const pR = p.rect;
              // Check bounding box intersection
              const intersects = !(gR.right < pR.left || gR.left > pR.right || gR.bottom < pR.top || gR.top > pR.bottom);
              if (intersects && p.stroke !== 'none' && parseFloat(p.width) > 2) {
                overlaps.push({
                  cardText: g.text,
                  pathStroke: p.stroke,
                  pathWidth: p.width
                });
              }
            }
          });
        });

        // Check Lake Granby specifics
        const granbyGroup = Array.from(svg.querySelectorAll('g')).find(g => g.textContent.includes('Lake Granby'));
        const granbyRect = granbyGroup?.querySelector('rect')?.getBoundingClientRect();
        const granbyText = granbyGroup?.querySelector('text')?.getBoundingClientRect();

        return {
          groupsWithOverflow: groups.filter(g => g.textOverflowsRect),
          pathCardCollisions: overlaps,
          granby: {
            rectWidth: granbyRect ? Math.round(granbyRect.width) : null,
            textWidth: granbyText ? Math.round(granbyText.width) : null,
            textOverflows: granbyRect && granbyText ? granbyText.right > granbyRect.right : null
          }
        };
      })()`,
      returnByValue: true
    });

    console.log('[Profile Collision Audit]:', JSON.stringify(profileAudit.result.value, null, 2));

    // 2. Audit pipeline.html - Schematic View
    await send('Runtime.evaluate', { expression: `switchPipelineSubtab('schematic')` });
    await new Promise(r => setTimeout(r, 1000));

    const schematicAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const svg = document.getElementById('canvas');
        
        // Badges and labels in schematic
        const badges = Array.from(svg.querySelectorAll('.maf-badge')).map(b => {
          const parent = b.parentElement;
          const bg = parent ? parent.querySelector('.badge-bg') : null;
          const bR = b.getBoundingClientRect();
          const bgR = bg ? bg.getBoundingClientRect() : null;
          return {
            text: b.textContent.trim(),
            bWidth: Math.round(bR.width),
            bgWidth: bgR ? Math.round(bgR.width) : null,
            overflows: bgR ? (bR.left < bgR.left - 2 || bR.right > bgR.right + 2) : false
          };
        });

        // Check text cards in schematic
        const cards = Array.from(svg.querySelectorAll('g')).map(g => {
          const rect = g.querySelector('rect');
          const texts = Array.from(g.querySelectorAll('text'));
          if (rect && texts.length > 0) {
            const rR = rect.getBoundingClientRect();
            const overflows = texts.some(t => {
              const tR = t.getBoundingClientRect();
              return tR.left < rR.left - 2 || tR.right > rR.right + 2;
            });
            return {
              title: texts[0]?.textContent.trim(),
              rWidth: Math.round(rR.width),
              overflows
            };
          }
          return null;
        }).filter(Boolean);

        return {
          badgeOverflows: badges.filter(b => b.overflows),
          cardOverflows: cards.filter(c => c.overflows)
        };
      })()`,
      returnByValue: true
    });

    console.log('[Schematic Collision Audit]:', JSON.stringify(schematicAudit.result.value, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill('SIGKILL');
    process.exit(0);
  }
}

detectCollisions();
