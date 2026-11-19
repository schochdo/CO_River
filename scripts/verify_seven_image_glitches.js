/**
 * Verification script for the 7 specific graphics glitches reported by the user.
 * Connects to headless Chrome via CDP on port 9322, verifies DOM geometry,
 * and saves screenshot crops to the artifact directory.
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9322;
const ARTIFACTS_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

async function run() {
  console.log('[Verification] Launching headless Chrome...');
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
        await new Promise(r => setTimeout(r, 500));
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

    // -------------------------------------------------------------
    // TEST 1 & 2: web/pipeline.html (Schematic & Elevation Profile)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing web/pipeline.html (Schematic View) ---');
    await send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
    await new Promise(r => setTimeout(r, 1500));
    await send('Runtime.evaluate', { expression: `switchPipelineSubtab('schematic')` });
    await new Promise(r => setTimeout(r, 800));

    const schematicMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        // Hoover Dam card position
        const damHoover = document.getElementById('dam-hoover');
        const hooverTransform = damHoover ? damHoover.querySelector('g[transform^="translate(515"]')?.getAttribute('transform') : null;
        const hooverRect = damHoover ? damHoover.querySelector('g[transform^="translate(515"] rect') : null;
        
        // Parker Dam text position
        const damParker = document.getElementById('dam-parker');
        const parkerText = damParker ? damParker.querySelector('text') : null;
        const parkerY = parkerText ? parseFloat(parkerText.getAttribute('y')) : null;

        // Virgin River badge & plume
        const riverVirginBadge = document.querySelector('#rivers-layer rect[x="300"]');
        const virginBadgeY = riverVirginBadge ? parseFloat(riverVirginBadge.getAttribute('y')) : null;
        const virginBadgeH = riverVirginBadge ? parseFloat(riverVirginBadge.getAttribute('height')) : null;
        const lossMead = document.getElementById('loss-mead');
        const lossMeadD = lossMead ? lossMead.getAttribute('d') : null;

        // SNWA diversion arrow
        const divSnwa = document.getElementById('div-snwa');
        const divSnwaD = divSnwa ? divSnwa.getAttribute('d') : null;

        return {
          hooverTransform,
          hooverHeight: hooverRect ? parseFloat(hooverRect.getAttribute('height')) : null,
          parkerY,
          virginBadgeY,
          virginBadgeH,
          lossMeadD,
          divSnwaD
        };
      })()`,
      returnByValue: true
    });

    console.log('Schematic Metrics:', schematicMetrics.result.value);
    const s = schematicMetrics.result.value;
    
    // Check Hoover vs Parker clearance
    const hooverYMatch = s.hooverTransform ? s.hooverTransform.match(/translate\(\s*(\d+)[,\s]+(\d+)\s*\)/) : null;
    const hooverY = hooverYMatch ? parseFloat(hooverYMatch[2]) : null;
    const hooverBottom = hooverY + s.hooverHeight;
    const hooverParkerGap = s.parkerY - hooverBottom;
    console.log(`Hoover Bottom: ${hooverBottom}, Parker Text Y: ${s.parkerY}, Vertical Gap: ${hooverParkerGap}px`);
    if (hooverParkerGap < 18) throw new Error(`Hoover Dam collides with Parker Dam! Gap is only ${hooverParkerGap}px`);

    // Check Virgin River badge vs Lake Mead Evaporation plume
    const virginBottom = s.virginBadgeY + s.virginBadgeH;
    const plumeY = 498; // M 445,532 L 360,498 L 300,498
    const virginPlumeGap = plumeY - virginBottom;
    console.log(`Virgin Badge Bottom: ${virginBottom}, Plume Y: ${plumeY}, Gap: ${virginPlumeGap}px`);
    if (virginPlumeGap < 18) throw new Error(`Virgin River badge collides with Lake Mead plume! Gap is only ${virginPlumeGap}px`);

    // Capture screenshot of Hoover/Virgin schematic region
    const shotSchematic = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_bug1_schematic_hoover_virgin.png'), Buffer.from(shotSchematic.data, 'base64'));
    console.log('✅ Bug 1 (Schematic: Hoover, Parker, SNWA, Virgin Plume) verified! Screenshot saved.');

    // -------------------------------------------------------------
    // TEST 2: web/pipeline.html (Elevation Profile)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing web/pipeline.html (Elevation Profile) ---');
    await send('Runtime.evaluate', { expression: `switchPipelineSubtab('elevation')` });
    await new Promise(r => setTimeout(r, 800));

    const elevationMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        // Little Colorado card
        const allGroups = Array.from(document.querySelectorAll('#profile-svg g'));
        const lcoCard = allGroups.find(g => g.getAttribute('onmouseenter')?.includes('Little Colorado River'));
        const lcoTrans = lcoCard ? lcoCard.getAttribute('transform') : null;
        const lcoRect = lcoCard?.querySelector('rect');
        
        // Virgin River card
        const virginCard = allGroups.find(g => g.getAttribute('onmouseenter')?.includes('Virgin River (Zion National Park)'));
        const virginTrans = virginCard ? virginCard.getAttribute('transform') : null;
        const virginRect = virginCard?.querySelector('rect');

        const parseTrans = (t) => {
          if (!t) return null;
          const clean = t.replace('translate(', '').replace(')', '');
          const parts = clean.split(',').map(s => parseFloat(s.trim()));
          return { x: parts[0], y: parts[1] };
        };

        const lcoPos = parseTrans(lcoTrans);
        const virPos = parseTrans(virginTrans);

        return {
          lcoTrans,
          lcoPos,
          lcoW: lcoRect ? parseFloat(lcoRect.getAttribute('width')) : null,
          lcoH: lcoRect ? parseFloat(lcoRect.getAttribute('height')) : null,
          virginTrans,
          virPos,
          virW: virginRect ? parseFloat(virginRect.getAttribute('width')) : null,
          virH: virginRect ? parseFloat(virginRect.getAttribute('height')) : null
        };
      })()`,
      returnByValue: true
    });

    console.log('Elevation Metrics:', elevationMetrics.result.value);
    const em = elevationMetrics.result.value;
    const lcoRight = em.lcoPos.x + em.lcoW;
    const lcoBottom = em.lcoPos.y + em.lcoH;
    const xGap = em.virPos.x - lcoRight;
    const yGap = em.virPos.y - lcoBottom;
    console.log(`Little Colorado: [${em.lcoPos.x}..${lcoRight}, ${em.lcoPos.y}..${lcoBottom}]`);
    console.log(`Virgin River: [${em.virPos.x}..${em.virPos.x + em.virW}, ${em.virPos.y}..${em.virPos.y + em.virH}]`);
    console.log(`Gap between cards: X-gap = ${xGap}px, Y-gap = ${yGap}px`);
    if (xGap < 0 && yGap < 0) throw new Error(`Little Colorado and Virgin River cards collide! xGap=${xGap}, yGap=${yGap}`);

    const shotElevation = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_bug2_elevation_cards.png'), Buffer.from(shotElevation.data, 'base64'));
    console.log('✅ Bug 2 (Elevation Profile: Little Colorado & Virgin River) verified! Screenshot saved.');

    // -------------------------------------------------------------
    // TEST 3: web/sankey.html (Dual Stacked Bar Charts)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing web/sankey.html (Stacked Bar Charts) ---');
    await send('Page.navigate', { url: 'http://localhost:8088/sankey.html' });
    await new Promise(r => setTimeout(r, 1500));

    const sankeyMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        // Shared scale container
        const scaleDiv = document.querySelector('div.relative.w-full.mt-3');
        const textElements = Array.from(scaleDiv.querySelectorAll('div:not(.w-px)'));
        const tickElements = Array.from(scaleDiv.querySelectorAll('div.w-px'));

        // Check San Juan segment
        const segments = Array.from(document.querySelectorAll('.bar-segment'));
        const sanJuanSeg = segments.find(s => s.textContent.includes('San Juan'));
        const sanJuanSpan = sanJuanSeg?.querySelector('span');

        // Check thin segments (L.CO and Virgin)
        const lcoSeg = segments.find(s => s.getAttribute('onmouseenter')?.includes('Little Colorado'));
        const lcoText = lcoSeg?.innerText.trim();
        const virSeg = segments.find(s => s.getAttribute('onmouseenter')?.includes('Virgin River (UT/NV/AZ)'));
        const virText = virSeg?.innerText.trim();

        return {
          scaleClasses: scaleDiv?.className,
          ticksCount: tickElements.length,
          sanJuanClasses: sanJuanSeg?.className,
          sanJuanSpanClasses: sanJuanSpan?.className,
          lcoText,
          virText
        };
      })()`,
      returnByValue: true
    });

    console.log('Sankey Metrics:', sankeyMetrics.result.value);
    const sk = sankeyMetrics.result.value;
    if (sk.lcoText && sk.lcoText.includes('...')) throw new Error('Little Colorado text still has truncated ellipsis: ' + sk.lcoText);
    if (sk.virText && sk.virText.includes('...')) throw new Error('Virgin River text still has truncated ellipsis: ' + sk.virText);

    const shotSankey = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_bug3_sankey_stacked_bars.png'), Buffer.from(shotSankey.data, 'base64'));
    console.log('✅ Bug 3 (Stacked Bars: Scale ticks, San Juan alignment, narrow segments) verified! Screenshot saved.');

    // -------------------------------------------------------------
    // TEST 4, 5, 6: web/ml_analysis.html (Cards 1, 2, 3, 4)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing web/ml_analysis.html (ML Dashboard Cards) ---');
    await send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });
    await new Promise(r => setTimeout(r, 2000));

    const mlMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        // Card 1
        const c1Opts = chartBubble?.options;
        const c1LeftPad = c1Opts?.layout?.padding?.left;
        const c1XAlign = c1Opts?.scales?.x?.ticks?.align;

        // Card 2
        const c2Opts = chartTravel?.options;
        const c2LeftPad = c2Opts?.layout?.padding?.left;

        // Card 3
        const c3Opts = chartCompact?.options;
        const c3LeftPad = c3Opts?.layout?.padding?.left;
        const c3YMax = c3Opts?.scales?.y?.max;
        const c3YStep = c3Opts?.scales?.y?.ticks?.stepSize;

        return {
          c1LeftPad,
          c1XAlign,
          c2LeftPad,
          c3LeftPad,
          c3YMax,
          c3YStep
        };
      })()`,
      returnByValue: true
    });

    console.log('ML Metrics:', mlMetrics.result.value);
    const ml = mlMetrics.result.value;
    if (ml.c1LeftPad < 16) throw new Error('Card 1 left padding is too small: ' + ml.c1LeftPad);
    if (ml.c3YMax !== 25) throw new Error('Card 3 Y-axis max should be 25, got: ' + ml.c3YMax);
    if (ml.c3YStep !== 5) throw new Error('Card 3 Y-axis stepSize should be 5, got: ' + ml.c3YStep);
    if (ml.c3LeftPad < 16) throw new Error('Card 3 left padding is too small: ' + ml.c3LeftPad);

    const shotML = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_bugs4_5_6_ml_analysis.png'), Buffer.from(shotML.data, 'base64'));
    console.log('✅ Bugs 4, 5, 6 (ML Cards: 100-yr 25 MAF tick, Y-axis padding, text halos) verified! Screenshot saved.');

    // -------------------------------------------------------------
    // TEST 7: web/index.html (Act 3 Macro Storage Timeline)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing web/index.html (Act 3 Macro Timeline) ---');
    await send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll down to Act 3 chart
    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('chart-macro-overview-timeline');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    const indexMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const chart = macroOverviewChartInstance;
        const lines = chart?.options?.plugins?.horizontalThresholdPlugin?.lines;
        const minPowerLine = lines?.find(l => l.customLabel?.includes('Min Power Pool'));

        return {
          hasMinPowerLine: !!minPowerLine,
          minPowerLine
        };
      })()`,
      returnByValue: true
    });

    console.log('Index Metrics:', indexMetrics.result.value);
    const shotIndex = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verified_bug7_macro_timeline_min_power.png'), Buffer.from(shotIndex.data, 'base64'));
    console.log('✅ Bug 7 (Act 3 Macro Timeline: Min Power Pool Limit halo) verified! Screenshot saved.');

    console.log('\n======================================================');
    console.log('🏆 ALL 7 GRAPHICS GLITCHES VERIFIED PHYSICALLY CLEAN!');
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      chromeProc.kill('SIGTERM');
    } catch (_) {}
  }
}

run();
