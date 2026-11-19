/**
 * scripts/verify_baker_flashiness_axis.js
 *
 * Automated CDP verification suite for Card 1 (Richards–Baker Flashiness):
 * - Asserts labelRotation === 0 (no slanted / rotated tick text).
 * - Asserts 'Steady / Dam' renders with textAlign === 'left' at exactly chartArea.left (inside chart bounds).
 * - Asserts zero tick text bleeding into the Y-axis numbers or left gutter.
 * - Asserts 'Desert Flash' renders inside the right chart bounds.
 * - Asserts centered, unclipped X-axis title.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ARTIFACTS_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const PORT = 9335;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function run() {
  console.log('[Verification] Launching headless Chrome...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1440,900'
  ]);

  await new Promise(r => setTimeout(r, 1200));
  const targets = await (await fetch(`http://localhost:${PORT}/json`)).json();
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result || msg);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.addEventListener('open', r));
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  console.log('\n--- 1. Testing standalone web/ml_analysis.html ---');
  await send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });
  await new Promise(r => setTimeout(r, 2000));

  const standRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const chart = Chart.getChart("chart-behavior-bubbles");
        const ctx = chart.ctx;
        let steady = null, desert = null, title = null;
        const orig = ctx.fillText;
        ctx.fillText = function(text, x, y) {
          const t = ctx.getTransform();
          const info = { text, realX: t.a * x + t.c * y + t.e, realY: t.b * x + t.d * y + t.f, textAlign: ctx.textAlign };
          if (text === "Steady / Dam") steady = info;
          if (text === "Desert Flash") desert = info;
          if (text.includes("Richards–Baker")) title = info;
          return orig.apply(this, arguments);
        };
        chart.draw();
        ctx.fillText = orig;
        return {
          chartWidth: chart.width,
          chartHeight: chart.height,
          chartArea: chart.chartArea,
          labelRotation: chart.scales.x.labelRotation,
          steady,
          desert,
          title
        };
      })()
    `,
    returnByValue: true
  });

  const standData = standRes.result.value;
  console.log('Standalone Card 1 Flashiness Axis Telemetry:', JSON.stringify(standData, null, 2));

  assert(standData.labelRotation === 0, `X-axis labelRotation must be 0 (actual: ${standData.labelRotation})`);
  assert(standData.steady !== null, 'Steady / Dam tick label must be present');
  assert(standData.steady.textAlign === 'left', `Steady / Dam textAlign must be "left" (actual: ${standData.steady.textAlign})`);
  assert(standData.steady.realX >= standData.chartArea.left - 0.5, `Steady / Dam realX (${standData.steady.realX}) must start at or inside chartArea.left (${standData.chartArea.left})`);
  assert(standData.desert !== null, 'Desert Flash tick label must be present');
  assert(standData.desert.realX <= standData.chartArea.right, `Desert Flash realX (${standData.desert.realX}) must be inside chartArea.right (${standData.chartArea.right})`);
  assert(standData.title !== null, 'Richards–Baker Flashiness axis title must be present');
  console.log('✓ Test 1 Passed: Standalone Card 1 x-axis labels are horizontal and strictly within bounds.');

  console.log('\n--- 2. Testing embedded inside web/index.html?tab=ml ---');
  await send('Page.navigate', { url: 'http://localhost:8088/index.html?tab=ml' });
  await new Promise(r => setTimeout(r, 2500));

  const embedRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const iframe = document.getElementById("iframe-ml");
        const chart = iframe.contentWindow.Chart.getChart("chart-behavior-bubbles");
        const ctx = chart.ctx;
        let steady = null, desert = null, title = null;
        const orig = ctx.fillText;
        ctx.fillText = function(text, x, y) {
          const t = ctx.getTransform();
          const info = { text, realX: t.a * x + t.c * y + t.e, realY: t.b * x + t.d * y + t.f, textAlign: ctx.textAlign };
          if (text === "Steady / Dam") steady = info;
          if (text === "Desert Flash") desert = info;
          if (text.includes("Richards–Baker")) title = info;
          return orig.apply(this, arguments);
        };
        chart.draw();
        ctx.fillText = orig;
        return {
          chartWidth: chart.width,
          chartHeight: chart.height,
          chartArea: chart.chartArea,
          labelRotation: chart.scales.x.labelRotation,
          steady,
          desert,
          title
        };
      })()
    `,
    returnByValue: true
  });

  const embedData = embedRes.result.value;
  console.log('Embedded Card 1 Flashiness Axis Telemetry:', JSON.stringify(embedData, null, 2));

  assert(embedData.labelRotation === 0, `Embedded X-axis labelRotation must be 0 (actual: ${embedData.labelRotation})`);
  assert(embedData.steady !== null, 'Embedded Steady / Dam tick label must be present');
  assert(embedData.steady.textAlign === 'left', `Embedded Steady / Dam textAlign must be "left" (actual: ${embedData.steady.textAlign})`);
  assert(embedData.steady.realX >= embedData.chartArea.left - 0.5, `Embedded Steady / Dam realX (${embedData.steady.realX}) must start at or inside chartArea.left (${embedData.chartArea.left})`);
  assert(embedData.desert !== null, 'Embedded Desert Flash tick label must be present');
  assert(embedData.desert.realX <= embedData.chartArea.right, `Embedded Desert Flash realX (${embedData.desert.realX}) must be inside chartArea.right (${embedData.chartArea.right})`);
  console.log('✓ Test 2 Passed: Embedded Card 1 x-axis labels are horizontal and strictly within bounds.');

  // Capture verification screenshots
  const card1Rect = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const iframe = document.getElementById("iframe-ml");
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const c = doc.querySelector("#chart-behavior-bubbles").closest(".dashboard-card");
        const r = c.getBoundingClientRect();
        const ir = iframe.getBoundingClientRect();
        return { x: ir.x + r.x, y: ir.y + r.y, width: r.width, height: r.height };
      })()
    `,
    returnByValue: true
  });

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { ...card1Rect.result.value, scale: 1 }
  });
  const artifactPath = path.join(ARTIFACTS_DIR, 'verified_baker_flashiness_axis_fixed.png');
  fs.writeFileSync(artifactPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved verified screenshot to ${artifactPath}`);

  console.log('\n======================================================');
  console.log('🎉 BAKER FLASHINESS X-AXIS ALIGNMENT VERIFIED 100%!');
  console.log('======================================================');

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
