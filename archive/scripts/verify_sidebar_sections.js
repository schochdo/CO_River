const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function test() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9298',
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  
  const list = await new Promise(res => {
    http.get('http://127.0.0.1:9298/json/list', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
  });
  
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  
  let id = 1;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const cur = id++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === cur) {
        ws.removeEventListener('message', handler);
        if (msg.error) rej(msg.error);
        else res(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:8088/index.html' });
  await new Promise(r => setTimeout(r, 1500));

  const check = await send('Runtime.evaluate', {
    expression: `(() => {
      const kb = document.querySelector('a[href*="knowledge.html"]');
      const fsBtn = document.getElementById('btn-fullscreen');
      const parent = fsBtn ? fsBtn.parentElement : null;
      return {
        hasKnowledgeLink: !!kb,
        hasFullscreenBtn: !!fsBtn,
        fullscreenSectionClasses: parent ? parent.className : '',
        isSeparateSection: parent && parent.className.includes('border-t') && parent.previousElementSibling !== null
      };
    })()`,
    returnByValue: true
  });
  console.log('Sidebar sections check:', check.result.value);

  // Capture screenshot of sidebar
  const clip = { x: 0, y: 0, width: 260, height: 800, scale: 2 };
  const shot = await send('Page.captureScreenshot', { format: 'png', clip });
  const shotPath = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_sidebar_separate_fullscreen.png';
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot to: ${shotPath}`);

  chrome.kill();
  if (check.result.value.hasKnowledgeLink) throw new Error('knowledge.html link still present');
  if (!check.result.value.isSeparateSection) throw new Error('Fullscreen is not in its own separate section');
  console.log('✅ ALL VERIFICATIONS PASSED: knowledge.html dropped, fullscreen in separate section!');
}

test().catch(e => { console.error(e); process.exit(1); });
